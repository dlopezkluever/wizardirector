# Phase 6: Decommission Supabase

> **Prerequisites:** All phases 0-5 complete and verified. All traffic running on AWS.
> **Time:** 1 hour
> **Risk:** Low if all previous phases are verified. High if you skip the pre-flight checklist.

This is the final phase. We verify zero Supabase dependency, take a final backup, and cancel the subscription.

**Do NOT rush this phase.** Complete the entire verification checklist before cancelling Supabase.

---

## Pre-Decommission Verification Checklist

Work through every item. Do not proceed to cancellation until all boxes are checked.

### Traffic Verification

- [ ] **No Supabase imports in frontend code:**
  ```bash
  grep -r "supabase" "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src" --include="*.ts" --include="*.tsx" -l
  # Should return: zero results
  ```

- [ ] **No Supabase imports in backend code:**
  ```bash
  grep -r "@supabase/supabase-js" "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src" --include="*.ts" -l
  # Should return: zero results
  ```

- [ ] **No Supabase env vars active in ECS:**
  ```bash
  # Check the current ECS task definition for Supabase vars
  aws ecs describe-task-definition --task-definition aiuteur-backend \
    --query "taskDefinition.containerDefinitions[0].environment" \
    --output table
  # Should show no SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY entries
  ```

- [ ] **Backend health check passes against ECS:**
  ```bash
  curl http://YOUR_ALB_DNS/api/health
  # { "status": "ok" }
  ```

### Functional Verification

Test each workflow end-to-end:

- [ ] Sign up with a new test email → verify Cognito sends confirmation code
- [ ] Confirm email code → sign in → dashboard loads
- [ ] Create a new project → Stage 1 saves correctly to RDS
- [ ] Progress to Stage 2, Stage 3 → content saves and loads
- [ ] Upload/generate an image → verify URL is `s3.amazonaws.com` (not `supabase.co`)
- [ ] Load a project with existing assets → images display from S3
- [ ] Check CloudWatch logs for any Supabase-related errors: none expected

### Database Verification

- [ ] **RDS contains all expected data:**
  ```bash
  psql "postgresql://aiuteur_admin:PASSWORD@aiuteur-postgres.xxxx.us-east-1.rds.amazonaws.com:5432/aiuteur" \
    -c "SELECT 'projects', COUNT(*) FROM projects UNION ALL
        SELECT 'scenes', COUNT(*) FROM scenes UNION ALL
        SELECT 'shots', COUNT(*) FROM shots UNION ALL
        SELECT 'frames', COUNT(*) FROM frames;"
  ```
  Compare these counts against your Supabase database counts from migration day.

- [ ] **No Supabase storage URLs remain in DB:**
  ```bash
  psql "postgresql://..." -c "
    SELECT COUNT(*) FROM global_assets WHERE image_key_url LIKE '%supabase.co%';
  "
  # Should return: 0
  ```

### Storage Verification

- [ ] **All file types accessible from S3:**
  ```bash
  aws s3 ls s3://aiuteur-videos/ --recursive | head -10
  aws s3 ls s3://aiuteur-images/ --recursive | head -10
  aws s3 ls s3://aiuteur-asset-images/ --recursive | head -10
  ```
  Each should show files.

- [ ] **Supabase Storage buckets are now empty (all files migrated):**
  Verify in Supabase Dashboard → Storage → each bucket is empty or only contains the files you intentionally kept there.

---

## Step 1: Take a Final Backup

Before cancelling, take one last backup of everything — just in case.

### 1a. Final Database Backup from Supabase

```bash
pg_dump \
  "postgresql://postgres:YOUR_SUPABASE_DB_PASSWORD@db.gdnurgghtmauclfkkvif.supabase.co:5432/postgres" \
  --no-owner \
  --no-acl \
  --schema=public \
  -f "supabase_final_backup_$(date +%Y%m%d).sql"

echo "Final Supabase backup saved"
```

Store this file in a safe location (external drive, cloud storage separate from AWS).

### 1b. Final RDS Backup

```bash
# Create a manual RDS snapshot before cancelling (lasts indefinitely until deleted)
aws rds create-db-snapshot \
  --db-instance-identifier aiuteur-postgres \
  --db-snapshot-identifier "aiuteur-pre-supabase-cancel-$(date +%Y%m%d)"

echo "RDS snapshot created"
```

### 1c. Export Cognito User List

```bash
# Export all users from Cognito as a backup
aws cognito-idp list-users \
  --user-pool-id us-east-1_XXXXXXXXX \
  --output json > "cognito_users_backup_$(date +%Y%m%d).json"

echo "Cognito user backup saved"
```

---

## Step 2: Remove Supabase from Codebase

### 2a. Remove npm packages

```bash
# Frontend
cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector"
npm uninstall @supabase/supabase-js

# Backend
cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend"
npm uninstall @supabase/supabase-js
```

### 2b. Delete Supabase Config Files

```bash
# These files should be empty or removed
rm "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\lib\supabase.ts"
rm "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\config\supabase.ts"
```

### 2c. Remove Supabase Env Vars

From `backend/.env`, remove:
```
# Remove these:
# SUPABASE_URL=...
# SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...
```

From `.env` (frontend root), remove:
```
# Remove these:
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
```

From ECS task definition, if any Supabase vars were included, remove them and re-register:
```bash
# Update ecs-task-definition.json to remove Supabase env vars
# Then re-register and force new deployment
aws ecs register-task-definition --cli-input-json file://backend/ecs-task-definition.json
aws ecs update-service \
  --cluster aiuteur-cluster \
  --service aiuteur-backend-service \
  --force-new-deployment
```

### 2d. Update Backend Migration Scripts

Any migration scripts referencing Supabase CLI or Supabase connection strings should be updated to use RDS connection strings instead. This is for future schema changes — use psql directly against RDS.

---

## Step 3: Run Final Lint and Tests

```bash
cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector"
npm run lint
npm test
```

```bash
cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend"
npm run lint
npm test
```

All tests must pass before proceeding.

---

## Step 4: Cancel Supabase Subscription

> **Wait 2 weeks** after completing Phases 1-3 before cancelling. This gives you time to:
> - Catch any edge cases your testing missed
> - Verify no users are being blocked by auth issues
> - Confirm no background jobs are writing to Supabase

When you're confident:

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project: `gdnurgghtmauclfkkvif`
3. **Settings** → **General** → scroll to bottom
4. **Pause project** (not delete — just pause billing while keeping data accessible)
5. Verify you're no longer being charged in Billing settings

> **Pausing vs. Deleting:**
> - **Pause** — project is frozen, no charges, data preserved. Can be resumed within 90 days. Choose this first.
> - **Delete** — permanent, unrecoverable. Only do this once you've verified AWS is running perfectly for 30+ days.

To delete (after extended verification period):
1. Supabase Dashboard → Settings → General → **Delete Project**
2. Type the project name to confirm

---

## Step 5: Cost Comparison — Before vs. After

| Service | Before (Supabase) | After (AWS) |
|---------|-------------------|-------------|
| Database | Included in Pro ($25/mo) | RDS db.t3.micro ~$13/mo |
| Storage | 100GB included, $0.021/GB after | S3 ~$0.023/GB (no bundled limit) |
| Bandwidth | 250GB included, $0.09/GB after | CloudFront $0.085/GB, S3 egress $0.09/GB |
| Auth | Included | Cognito free (0-50K MAU) |
| Backend compute | Not applicable | ECS Fargate ~$17/mo |
| Load Balancer | Not applicable | ALB ~$16/mo |
| **Base total** | **$25/mo** | **~$50/mo** |
| **At scale (1TB bandwidth)** | **$25 + $67.50 = ~$92/mo** | **$50 + $85 = ~$135/mo** |
| **At scale (10TB bandwidth)** | **$25 + $742.50 = ~$767/mo** | **$50 + $850 (CF) = ~$900/mo** |

> **Key insight:** At small scale, AWS costs slightly more due to fixed infrastructure costs (ALB, ECS). The migration pays off when:
> 1. You have more users (ALB costs amortize across more revenue)
> 2. You're doing heavy video generation (S3 + CloudFront bandwidth is more predictable)
> 3. You need database scaling (RDS can scale instances; Supabase jumps to $599/mo Enterprise)
> 4. You want control over compute (ECS scales precisely; Supabase compute is opaque)

---

## Cleanup: Optional Cost Optimization After Migration

### Reduce ALB Cost
If traffic is very low during development, consider:
- Using a single ECS task on a small instance (already at minimum)
- Switching to AWS App Runner (auto-scales to zero when idle) in the future

### S3 Intelligent-Tiering for Videos
Old generated videos are rarely accessed. Enable S3 Intelligent-Tiering to automatically move them to cheaper storage classes:

```bash
aws s3api put-bucket-intelligent-tiering-configuration \
  --bucket aiuteur-videos \
  --id "AITiering" \
  --intelligent-tiering-configuration '{
    "Id": "AITiering",
    "Status": "Enabled",
    "Tierings": [
      { "Days": 90, "AccessTier": "ARCHIVE_ACCESS" },
      { "Days": 180, "AccessTier": "DEEP_ARCHIVE_ACCESS" }
    ]
  }'
```

This moves 90-day-old videos to near-archive tier (~$0.004/GB vs $0.023/GB).

### RDS Auto-Stop for Development

During development, you can stop the RDS instance to save costs (you pay for storage, not compute, while stopped). AWS automatically restarts it after 7 days.

```bash
# Stop RDS (saves ~$13/mo during dev pauses)
aws rds stop-db-instance --db-instance-identifier aiuteur-postgres

# Start it again when needed
aws rds start-db-instance --db-instance-identifier aiuteur-postgres
```

> **Note:** Do NOT stop RDS in production — VideoJobExecutor polls it every 10 seconds.

---

## Phase 6 Final Checklist

- [ ] All pre-decommission verification passed
- [ ] Final Supabase DB backup taken and stored safely
- [ ] Final RDS snapshot created
- [ ] Cognito user list exported
- [ ] `@supabase/supabase-js` uninstalled from both frontend and backend
- [ ] `src/lib/supabase.ts` deleted
- [ ] `backend/src/config/supabase.ts` deleted
- [ ] Supabase env vars removed from all `.env` files
- [ ] ECS task definition updated (no Supabase secrets)
- [ ] Lint passes
- [ ] Tests pass
- [ ] Supabase project paused (not deleted yet)
- [ ] AWS billing dashboard reviewed — charges are as expected
- [ ] 2+ weeks of stable AWS operation confirmed
- [ ] Supabase project deleted (optional, after extended verification)

---

## Congratulations

If you've reached this checklist with all boxes ticked, Aiuteur is fully migrated to AWS. The full stack now runs on:

```
Frontend:  S3 + CloudFront (or AWS Amplify)
Backend:   ECS Fargate (Express.js)
Database:  Amazon RDS PostgreSQL
Storage:   Amazon S3 (3 buckets)
Auth:      Amazon Cognito
Secrets:   AWS Secrets Manager
Logging:   Amazon CloudWatch
```

---

## Post-Migration: Ongoing Maintenance

### Updating the Backend
```bash
# Rebuild and push new Docker image
cd backend
docker build -t aiuteur-backend:latest .
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
docker tag aiuteur-backend:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/aiuteur-backend:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/aiuteur-backend:latest

# Deploy
aws ecs update-service --cluster aiuteur-cluster --service aiuteur-backend-service --force-new-deployment
```

### Updating the Frontend
```bash
npm run build
aws s3 sync dist/ s3://aiuteur-frontend/ --delete
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

### Database Migrations (New Schema Changes)
```bash
# Run migrations directly against RDS
psql "postgresql://aiuteur_admin:PASSWORD@aiuteur-postgres.xxxx.us-east-1.rds.amazonaws.com:5432/aiuteur" \
  -f backend/migrations/032_next_migration.sql
```

### Monitoring
- Check CloudWatch Logs: AWS Console → CloudWatch → Log Groups → `/ecs/aiuteur-backend`
- Check RDS metrics: AWS Console → RDS → `aiuteur-postgres` → Monitoring tab
- Check ALB metrics: AWS Console → EC2 → Load Balancers → `aiuteur-alb` → Monitoring tab
- Set up CloudWatch Alarms for: CPU > 80%, DB connections > 80, 5xx error rate > 1%
