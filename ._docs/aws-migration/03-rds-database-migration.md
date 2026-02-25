# Phase 2: RDS Database Migration

> **Prerequisites:** Phase 0 complete (AWS account, CLI). Phase 1 (S3) recommended but not required.
> **Time:** 4-6 hours (+ data migration time depending on DB size)
> **Risk:** Medium — this is the most impactful code change. Test thoroughly before cutting over.
> **Rollback:** Switch `DATABASE_URL` back to Supabase connection string, redeploy backend (~30 min)

In this phase we:
1. Create a VPC and RDS PostgreSQL instance
2. Export the Supabase schema and data
3. Import to RDS
4. Replace the Supabase JS client with a raw `pg` connection pool in the backend
5. Verify all routes work correctly against RDS

Auth still uses Supabase after this phase.

---

## Understanding What's Changing

### Current Architecture (Supabase)
```
Backend → @supabase/supabase-js client → Supabase PostgreSQL
         (uses service role key, RLS bypassed,
          manual auth checks in routes)
```

### After Migration (RDS)
```
Backend → pg.Pool → Amazon RDS PostgreSQL
         (uses DATABASE_URL connection string,
          same manual auth checks — nothing changes there)
```

### Key Insight: RLS Was Already Bypassed

The backend uses the Supabase **service role key** (not the anon key). This bypasses all RLS policies. Our routes already contain explicit ownership checks like:
```typescript
WHERE user_id = $1
```

This means removing RLS has zero impact on security — our manual checks ARE the access control. The migration is a client swap, not a logic change.

---

## Step 1: Create Networking (VPC + Security Groups)

### Option A: Use the Default VPC (Recommended for Beginners)

AWS automatically creates a default VPC in each region with public subnets. This is the simplest path.

1. Go to AWS Console → **VPC** → confirm the default VPC exists (you'll see one with `Default: Yes`)
2. Note the **VPC ID** (format: `vpc-xxxxxxxxxxxxxxxxx`)
3. Note the **Subnet IDs** — you need at least 2 (in different Availability Zones) for RDS

To list subnets in your default VPC:
```bash
aws ec2 describe-subnets \
  --filters "Name=defaultForAz,Values=true" \
  --query "Subnets[].{SubnetId:SubnetId,AZ:AvailabilityZone}" \
  --output table
```

### Create a Security Group for RDS

A Security Group is a firewall. We need one that:
- Allows port 5432 (PostgreSQL) from our backend (and from our development machine for migration)
- Blocks everything else

```bash
# Get your default VPC ID
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text)
echo "VPC ID: $VPC_ID"

# Create security group
SG_ID=$(aws ec2 create-security-group \
  --group-name aiuteur-rds-sg \
  --description "Security group for Aiuteur RDS PostgreSQL" \
  --vpc-id $VPC_ID \
  --query "GroupId" \
  --output text)
echo "Security Group ID: $SG_ID"

# Allow PostgreSQL from ANYWHERE (for initial migration/dev — tighten after Phase 4)
# WARNING: This is intentionally permissive for development. Tighten after ECS setup in Phase 4.
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 5432 \
  --cidr 0.0.0.0/0

echo "Security group configured. SG ID: $SG_ID"
```

> **Security note:** `0.0.0.0/0` allows any IP to attempt a PostgreSQL connection. The database still requires a valid username/password — but for better security, replace `0.0.0.0/0` with your specific IP after migration. In Phase 4, we'll update this to only allow the ECS security group.

---

## Step 2: Create the RDS Instance

### 2a. Create a DB Subnet Group

RDS requires a subnet group spanning at least 2 Availability Zones:

```bash
# Get subnet IDs for your default VPC
SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=defaultForAz,Values=true" \
  --query "Subnets[].SubnetId" \
  --output text | tr '\t' ',')
echo "Subnet IDs: $SUBNET_IDS"

# Create subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name aiuteur-db-subnet-group \
  --db-subnet-group-description "Aiuteur RDS subnet group" \
  --subnet-ids $(echo $SUBNET_IDS | tr ',' ' ')
```

### 2b. Create the RDS Instance

```bash
aws rds create-db-instance \
  --db-instance-identifier aiuteur-postgres \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16.3 \
  --master-username aiuteur_admin \
  --master-user-password "CHANGE_THIS_TO_A_STRONG_PASSWORD_32_CHARS" \
  --db-name aiuteur \
  --allocated-storage 20 \
  --storage-type gp2 \
  --no-multi-az \
  --publicly-accessible \
  --db-subnet-group-name aiuteur-db-subnet-group \
  --vpc-security-group-ids $SG_ID \
  --backup-retention-period 7 \
  --no-deletion-protection \
  --tags Key=Project,Value=aiuteur
```

> **Password requirements:** At least 8 characters, no `@`, `/`, `"`, or space. Store this in your password manager immediately.

> **`--publicly-accessible`:** Set to true for development (so you can connect from your laptop). In production (Phase 4), the ECS service will connect over the VPC private network.

### 2c. Wait for the Instance to Become Available

```bash
echo "Waiting for RDS to become available (this takes 5-10 minutes)..."
aws rds wait db-instance-available --db-instance-identifier aiuteur-postgres
echo "RDS is ready!"

# Get the connection endpoint
aws rds describe-db-instances \
  --db-instance-identifier aiuteur-postgres \
  --query "DBInstances[0].Endpoint.Address" \
  --output text
```

Note the endpoint — it looks like: `aiuteur-postgres.xxxxxxxxxxxx.us-east-1.rds.amazonaws.com`

---

## Step 3: Export the Supabase Database

### 3a. Get Your Supabase Connection String

1. Go to Supabase Dashboard → your project → **Settings** → **Database**
2. Under **Connection string** → choose **URI** tab
3. Copy the connection string (format: `postgresql://postgres:[password]@db.xxxx.supabase.co:5432/postgres`)

Or use the direct connection (not pooler):
```
Host: db.gdnurgghtmauclfkkvif.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: [your database password]
```

### 3b. Export Schema Only (Structure)

```bash
# Export schema without data, without Supabase-specific extensions
pg_dump \
  "postgresql://postgres:[YOUR_DB_PASSWORD]@db.gdnurgghtmauclfkkvif.supabase.co:5432/postgres" \
  --schema-only \
  --no-owner \
  --no-acl \
  --exclude-schema=extensions \
  --exclude-schema=graphql \
  --exclude-schema=graphql_public \
  --exclude-schema=net \
  --exclude-schema=pgbouncer \
  --exclude-schema=realtime \
  --exclude-schema=storage \
  --exclude-schema=supabase_functions \
  --exclude-schema=vault \
  -f supabase_schema.sql

echo "Schema exported to supabase_schema.sql"
wc -l supabase_schema.sql
```

### 3c. Export Data Only

```bash
# Export data from public schema tables only
pg_dump \
  "postgresql://postgres:[YOUR_DB_PASSWORD]@db.gdnurgghtmauclfkkvif.supabase.co:5432/postgres" \
  --data-only \
  --no-owner \
  --no-acl \
  --schema=public \
  -f supabase_data.sql

echo "Data exported to supabase_data.sql"
wc -l supabase_data.sql
```

> **Keep these files safe** — they contain all your project data.

---

## Step 4: Import to RDS

### 4a. Clean the Schema SQL

The exported schema may contain Supabase-specific references that won't work on plain RDS. Open `supabase_schema.sql` and:

1. Remove or comment out any lines referencing `auth.uid()` in DEFAULT clauses (RLS functions that won't exist on RDS)
2. Remove `CREATE EXTENSION` statements for Supabase-only extensions

Run this to check what needs cleanup:
```bash
grep -n "auth\." supabase_schema.sql | head -30
grep -n "CREATE EXTENSION" supabase_schema.sql
```

For RLS policy references (`auth.uid()`): Since we're not using RLS on RDS (our backend does manual checks), simply remove all `CREATE POLICY` and `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` statements:

```bash
# Create a cleaned version without RLS
grep -v "CREATE POLICY\|ALTER TABLE.*ENABLE ROW LEVEL\|ALTER TABLE.*FORCE ROW LEVEL" supabase_schema.sql > supabase_schema_clean.sql
```

### 4b. Run Our Own Migrations on RDS (Preferred Approach)

Instead of importing Supabase's schema dump (which may have cruft), **run our own migration files** against RDS. This is cleaner and uses the exact same schema we've maintained:

```bash
RDS_URL="postgresql://aiuteur_admin:YOUR_PASSWORD@aiuteur-postgres.xxxx.us-east-1.rds.amazonaws.com:5432/aiuteur"

# Run all migrations in order
for migration in "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\migrations"/*.sql; do
  echo "Running: $migration"
  psql "$RDS_URL" -f "$migration"
  echo "  Done"
done
```

> **Important:** Our migration files contain `auth.uid()` references in RLS policies. These will fail on plain RDS. Two options:
> 1. **Skip RLS entirely** (recommended): Remove all `CREATE POLICY` and `ENABLE ROW LEVEL SECURITY` lines from migration files before running (or run migrations with a wrapper that ignores these errors)
> 2. **Install pgaudit extension**: Not available on RDS free tier

The recommended approach: run a wrapper that strips RLS from each migration file before executing:

```bash
RDS_URL="postgresql://aiuteur_admin:YOUR_PASSWORD@aiuteur-postgres.xxxx.us-east-1.rds.amazonaws.com:5432/aiuteur"
MIGRATIONS_DIR="C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\migrations"

for migration in "$MIGRATIONS_DIR"/*.sql; do
  echo "Running: $(basename $migration)"
  # Strip RLS policy lines, run remainder
  grep -v "CREATE POLICY\|ALTER TABLE.*ENABLE ROW LEVEL\|ALTER TABLE.*FORCE ROW LEVEL\|auth\.uid()\|auth\.role()" "$migration" | psql "$RDS_URL"
  echo "  Done"
done
```

### 4c. Import the Data

```bash
RDS_URL="postgresql://aiuteur_admin:YOUR_PASSWORD@aiuteur-postgres.xxxx.us-east-1.rds.amazonaws.com:5432/aiuteur"
psql "$RDS_URL" -f supabase_data.sql
```

### 4d. Verify the Import

```bash
psql "$RDS_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
psql "$RDS_URL" -c "SELECT COUNT(*) FROM projects;"
psql "$RDS_URL" -c "SELECT COUNT(*) FROM scenes;"
```

The table counts should match your Supabase database.

---

## Step 5: Install `pg` in the Backend

```bash
cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend"
npm install pg
npm install --save-dev @types/pg
```

---

## Step 6: Create the Database Client Config

Update `backend/src/config/database.ts` to use a `pg.Pool` instead of the Supabase client:

```typescript
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }  // RDS uses self-signed certs in some configs
    : false,
  max: 10,            // Maximum connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.query('SELECT 1').then(() => {
  console.log('✓ PostgreSQL connected (RDS)');
}).catch((err) => {
  console.error('✗ PostgreSQL connection failed:', err.message);
  process.exit(1);
});
```

---

## Step 7: Update Backend Environment Variables

Add to `backend/.env`:

```env
# Database (RDS PostgreSQL — replaces Supabase database connection)
DATABASE_URL=postgresql://aiuteur_admin:YOUR_PASSWORD@aiuteur-postgres.xxxxxxxxxxxx.us-east-1.rds.amazonaws.com:5432/aiuteur
```

---

## Step 8: Update All Backend Services and Routes

This is the bulk of the work. Every `supabase.from('table')...` call becomes a `pool.query(...)` call.

### Pattern Reference

**Supabase → pg.Pool translation guide:**

```typescript
// SELECT with filter
// Before:
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('user_id', userId);

// After:
const { rows: data } = await pool.query(
  'SELECT * FROM projects WHERE user_id = $1',
  [userId]
);

// ─────────────────────────────────────────────

// SELECT single row
// Before:
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('id', projectId)
  .single();

// After:
const { rows } = await pool.query(
  'SELECT * FROM projects WHERE id = $1',
  [projectId]
);
const data = rows[0] || null;

// ─────────────────────────────────────────────

// INSERT returning
// Before:
const { data, error } = await supabase
  .from('scenes')
  .insert({ branch_id, scene_number, ... })
  .select()
  .single();

// After:
const { rows } = await pool.query(
  'INSERT INTO scenes (branch_id, scene_number, ...) VALUES ($1, $2, ...) RETURNING *',
  [branch_id, scene_number, ...]
);
const data = rows[0];

// ─────────────────────────────────────────────

// UPDATE
// Before:
const { error } = await supabase
  .from('stage_states')
  .update({ status: 'locked', content: jsonData })
  .eq('id', stageId);

// After:
await pool.query(
  'UPDATE stage_states SET status = $1, content = $2, updated_at = NOW() WHERE id = $3',
  ['locked', jsonData, stageId]
);

// ─────────────────────────────────────────────

// DELETE
// Before:
const { error } = await supabase
  .from('shots')
  .delete()
  .eq('id', shotId);

// After:
await pool.query('DELETE FROM shots WHERE id = $1', [shotId]);

// ─────────────────────────────────────────────

// Complex SELECT with JOIN (already used in projects.ts)
// Before:
const { data } = await supabase
  .from('projects')
  .select(`
    *,
    branches!inner(id, name),
    stage_states(stage_number, status, version)
  `)
  .eq('user_id', userId);

// After:
const { rows: data } = await pool.query(`
  SELECT
    p.*,
    json_agg(DISTINCT jsonb_build_object('id', b.id, 'name', b.name)) AS branches,
    json_agg(DISTINCT jsonb_build_object(
      'stage_number', ss.stage_number,
      'status', ss.status,
      'version', ss.version
    )) AS stage_states
  FROM projects p
  LEFT JOIN branches b ON b.project_id = p.id
  LEFT JOIN stage_states ss ON ss.branch_id = b.id
  WHERE p.user_id = $1
  GROUP BY p.id
`, [userId]);
```

### Files to Update

Work through these files systematically. Import `pool` from `'../config/database.js'` (or adjust relative path) and remove `supabase` imports:

**Routes (high priority — these serve API responses):**
- `backend/src/routes/projects.ts` — main project list/detail query
- `backend/src/routes/stageStates.ts` — pipeline stage queries
- `backend/src/routes/assets.ts` — global asset CRUD
- `backend/src/routes/projectAssets.ts` — project asset queries
- `backend/src/routes/sceneAssets.ts` — scene asset instances
- `backend/src/routes/images.ts` — image job creation/polling
- `backend/src/routes/frames.ts` — frame data queries
- `backend/src/routes/checkout.ts` — cost breakdown + credit balance
- `backend/src/routes/styleCapsules.ts` — style capsule CRUD
- `backend/src/routes/llm.ts` — prompt template CRUD
- `backend/src/routes/sceneStageLocks.ts` — scene locking

**Services (support routes):**
- `backend/src/services/userCreditsService.ts` — credit balance CRUD
- `backend/src/services/assetInheritanceService.ts` — inheritance queries
- `backend/src/services/frameGenerationService.ts` — frame job management
- `backend/src/services/styleCapsuleService.ts` — style capsule queries
- `backend/src/services/shotExtractionService.ts` — shot queries
- `backend/src/services/videoGenerationService.ts` — video job queries
- All other services in `backend/src/services/`

**Remove from backend:**
- `backend/src/config/supabase.ts` — delete after all references are removed

> **Tip:** Search for all remaining Supabase usages after updating:
> ```bash
> grep -r "supabase\." backend/src --include="*.ts" -l
> ```
> This should return zero results when done (except for auth middleware, which Phase 3 will handle).

---

## Step 9: Update the Single Frontend Supabase DB Query

There is one direct Supabase database query in the frontend ([src/lib/services/imageService.ts](../../src/lib/services/imageService.ts) around line 147):

```typescript
// Before:
const { data, error } = await supabase
  .from('projects')
  .select('active_branch_id')
  .eq('id', projectId)
  .single();
```

This should be converted to an API call to the backend instead of a direct DB query:

```typescript
// After: use the existing backend API
const response = await fetch(`/api/projects/${projectId}`, {
  headers: await getAuthHeaders()
});
const project = await response.json();
const activeBranchId = project.active_branch_id;
```

---

## Step 10: Lint and Test

```bash
cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend"
npm run lint
npm test
```

```bash
cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector"
npm run lint
npm test
```

---

## Step 11: Verify Against RDS

1. Set `DATABASE_URL` to point to RDS
2. Start the backend: `npm run dev`
3. Test each major workflow in the app:
   - Create a new project
   - Progress through pipeline stages
   - Verify stage states are saved/loaded
   - Check scenes, shots, frames load correctly
   - Verify style capsules load
4. Check CloudWatch Logs (or terminal) for any SQL errors

---

## Phase 2 Rollback

If issues arise:
1. In `backend/.env`, change `DATABASE_URL` back to your Supabase connection string
2. Restart the backend
3. The app is back to Supabase

> **Data written to RDS during the cutover period** will NOT be in Supabase. Keep the Supabase database read-only (don't delete it) for at least 2 weeks after switching to RDS.

---

## Phase 2 Checklist

- [ ] VPC and security group created
- [ ] RDS instance `aiuteur-postgres` created (db.t3.micro)
- [ ] RDS instance status: **Available**
- [ ] Supabase schema exported and cleaned
- [ ] All 31 migrations run on RDS (without RLS statements)
- [ ] Data imported from Supabase to RDS
- [ ] Row counts match between Supabase and RDS
- [ ] `pg` and `@types/pg` installed
- [ ] `backend/src/config/database.ts` updated with `pg.Pool`
- [ ] `DATABASE_URL` added to `backend/.env`
- [ ] All `supabase.from()` calls in routes replaced with `pool.query()`
- [ ] All `supabase.from()` calls in services replaced with `pool.query()`
- [ ] Frontend direct Supabase query in `imageService.ts` replaced with API call
- [ ] `grep -r "supabase\." backend/src --include="*.ts" -l` returns no non-auth files
- [ ] Lint passes (both frontend and backend)
- [ ] Tests pass
- [ ] App works end-to-end against RDS

---

## Next Step

Proceed to **Phase 3:** [04-cognito-auth-migration.md](./04-cognito-auth-migration.md)
