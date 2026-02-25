# Aiuteur AWS Migration — Master Overview Guide

> **Who this is for:** A developer who is comfortable with JavaScript/TypeScript and has used AWS before but is not an infrastructure expert. Every AWS term is explained on first use.
>
> **What this covers:** The full picture of what we're migrating, why, how much it costs, how long it takes, and how to safely roll back at any point.

---

## Table of Contents

1. [Why Migrate from Supabase to AWS?](#why-migrate)
2. [What We're Migrating](#what-were-migrating)
3. [AWS Architecture Overview](#aws-architecture-overview)
4. [AWS Concepts Glossary](#aws-concepts-glossary)
5. [Cost Analysis](#cost-analysis)
6. [The 6 Migration Phases](#the-6-migration-phases)
7. [Rollback Strategy](#rollback-strategy)
8. [Pre-Migration Checklist](#pre-migration-checklist)
9. [Key Decisions & Rationale](#key-decisions--rationale)

---

## Why Migrate?

### Supabase Limitations at Scale

Supabase is excellent for getting started quickly, but as Aiuteur scales, three problems emerge:

**1. Cost Unpredictability**
- Supabase Pro: $25/month base
- Storage bandwidth: $0.09/GB after 250GB
- Database egress: charges apply
- Veo3 generates large video files — storage bandwidth costs compound quickly
- No granular control over compute resources

**2. Scalability Ceiling**
- Supabase PostgreSQL runs on shared infrastructure (Pro) or a single dedicated instance
- Cannot tune connection pooling, query optimization, or instance sizing without jumping to expensive tiers ($599+/month Enterprise)
- Storage IOPS and throughput are capped by plan tier, not actual need
- No ability to add read replicas cheaply

**3. Vendor Lock-In & Control**
- Auth users are locked inside Supabase — exporting/migrating them is painful
- Row-Level Security (RLS) policies are Supabase-specific PostgreSQL extensions tied to `auth.uid()`
- Cannot run custom PostgreSQL extensions or configurations
- Storage buckets use Supabase's CDN, not your own

### Why AWS?

| Need | Supabase | AWS |
|------|----------|-----|
| Database scaling | Fixed tier pricing | Pay for exact instance size needed |
| Storage costs | Bundled + egress fees | ~$0.023/GB + $0.0004/request |
| Auth at scale | Free up to 50K (then $5/month per 1K) | Cognito: free up to 50K MAU, then $0.0055/MAU |
| Compute | Not applicable (managed API) | Tune CPU/RAM exactly to load |
| Data residency | Supabase chooses region | You choose region + compliance zone |
| Vendor dependency | High | Low — all AWS services are portable |

**Bottom line:** At small scale (<10K users, <100GB storage), costs are comparable. At medium/large scale, AWS is significantly cheaper and more controllable.

---

## What We're Migrating

Aiuteur uses exactly 3 Supabase features. Everything else is already in our own Express.js backend.

### 1. Supabase Auth → Amazon Cognito
**What it does now:**
- User sign up / sign in / sign out
- JWT token generation (access tokens passed to backend)
- Backend verifies tokens with `supabase.auth.getUser(token)`
- Session persistence in browser (localStorage)

**Files involved:**
- `src/lib/supabase.ts` — Supabase client init
- `src/lib/stores/auth-store.ts` — all auth actions
- `backend/src/middleware/auth.ts` — JWT verification
- All `src/lib/services/*.ts` files — `getAuthHeaders()` pattern

### 2. Supabase PostgreSQL → Amazon RDS PostgreSQL
**What it does now:**
- 15+ tables storing all project, scene, shot, frame, asset, and job data
- 31 migration files define the schema
- RLS (Row Level Security) policies on `projects`, `branches`, `stage_states`, `scenes` tables
- Backend uses Supabase JS client (`supabase.from('table').select(...)`) to query

**Key insight:** Our backend already does manual ownership checks (`WHERE user_id = $1`). The RLS policies are a safety net, not the primary access control. This makes the DB migration cleaner — we just replace the client, not the logic.

**Files involved:**
- `backend/src/config/supabase.ts` — backend Supabase client
- All files in `backend/src/routes/` and `backend/src/services/` that call `supabase.from()`

### 3. Supabase Storage → Amazon S3
**What it does now:**
- `asset-images` bucket: stores generated character/prop/location images
- `images` bucket: stores frame images (Stage 10)
- `videos` bucket: stores completed Veo3-generated video files (Stage 12)

**Files involved:**
- `backend/src/services/assetImageLocalizer.ts` — upload/getPublicUrl for asset images
- `backend/src/services/video-generation/Veo3Provider.ts` — video upload after generation
- `backend/src/services/ImageGenerationService.ts` — image upload after generation

### What We Are NOT Migrating
- Supabase Realtime → Not used (we poll instead)
- Supabase Edge Functions → Not used
- Supabase Dashboard → We will use AWS Console

---

## AWS Architecture Overview

After migration, the full Aiuteur stack looks like this:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                             │
│                   React 18 + TypeScript SPA                        │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│              AMAZON CLOUDFRONT (CDN)                               │
│         Serves built frontend files globally                       │
│         Origin: S3 static website bucket                          │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ API requests to /api/*
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│         APPLICATION LOAD BALANCER (ALB)                            │
│         Routes HTTP/HTTPS traffic to backend containers            │
│         Handles SSL termination (ACM certificate)                  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│              ECS FARGATE CLUSTER                                   │
│  ┌─────────────────────────┐  ┌─────────────────────────────────┐  │
│  │   API Container          │  │  Worker Container               │  │
│  │   Express.js :3001       │  │  VideoJobExecutor               │  │
│  │   Handles HTTP requests  │  │  Polls DB every 10s             │  │
│  │   13 route handlers      │  │  Submits/polls Veo3 jobs        │  │
│  └────────────┬────────────┘  └──────────────┬──────────────────┘  │
└───────────────┼───────────────────────────────┼────────────────────┘
                │                               │
       ┌────────┴───────────────────────────────┘
       │
       ├──────────────────────────────────────────────────────────────
       │  ┌────────────────────────────────────────────────────────┐
       │  │  AMAZON RDS PostgreSQL                                 │
       ├─►│  db.t3.micro (start) → db.t3.small (scale)            │
       │  │  Port 5432, private subnet                             │
       │  │  15+ tables, 31 migrations worth of schema            │
       │  └────────────────────────────────────────────────────────┘
       │
       │  ┌────────────────────────────────────────────────────────┐
       │  │  AMAZON S3                                             │
       ├─►│  aiuteur-videos/      ← Veo3 MP4 output               │
       │  │  aiuteur-images/      ← Frame images (Stage 10)       │
       │  │  aiuteur-asset-images/ ← Character/prop/location imgs │
       │  └────────────────────────────────────────────────────────┘
       │
       │  ┌────────────────────────────────────────────────────────┐
       │  │  AMAZON COGNITO                                        │
       ├─►│  User Pool: aiuteur-users                              │
       │  │  Handles: signUp, signIn, JWT tokens                   │
       │  │  Backend verifies tokens via JWKS endpoint             │
       │  └────────────────────────────────────────────────────────┘
       │
       │  ┌────────────────────────────────────────────────────────┐
       └─►│  AWS SECRETS MANAGER                                   │
          │  DATABASE_URL, GOOGLE_CREDENTIALS, API keys           │
          └────────────────────────────────────────────────────────┘
```

---

## AWS Concepts Glossary

New to AWS? Here's every term used in this guide, explained simply.

| Term | What it is | Analogy |
|------|-----------|---------|
| **IAM** (Identity and Access Management) | AWS's permission system. Controls who/what can access which AWS services. | Like user roles in your app — admin, editor, viewer. But for AWS services. |
| **IAM User** | A human account inside AWS with its own credentials | Like a Supabase team member account |
| **IAM Role** | A permission set that AWS services (like ECS) assume automatically | Like a service account — the ECS container gets permissions without hardcoding keys |
| **ARN** (Amazon Resource Name) | A unique ID for any AWS resource | Like a UUID but globally unique across all of AWS. Format: `arn:aws:s3:::my-bucket` |
| **Region** | A geographic data center location (e.g., `us-east-1` = N. Virginia) | Like Supabase region selection |
| **VPC** (Virtual Private Cloud) | Your private network inside AWS. Resources inside can talk to each other securely. | Like a private office network |
| **Subnet** | A segment of a VPC. Public subnets can reach the internet; private subnets cannot. | Public subnet = internet-facing; private subnet = backend only |
| **Security Group** | A firewall rule attached to a resource. Controls inbound/outbound traffic. | Like a whitelist: "only allow port 5432 from ECS" |
| **RDS** (Relational Database Service) | AWS's managed PostgreSQL/MySQL/etc. service | Like Supabase's database but you control the instance size |
| **S3** (Simple Storage Service) | Object storage. Stores files (images, videos, backups) cheaply. | Like Supabase Storage but cheaper and more powerful |
| **S3 Bucket** | A container inside S3 for your files | Like a Supabase Storage bucket |
| **CloudFront** | AWS's CDN. Caches and serves your content globally from edge locations. | Like having your app served from 300+ locations worldwide |
| **ECS** (Elastic Container Service) | AWS's service for running Docker containers | Like running `docker run` but managed, with auto-restart and scaling |
| **Fargate** | The "serverless" compute engine for ECS — you don't manage servers | Like Heroku dynos but inside AWS |
| **ECR** (Elastic Container Registry) | Private Docker image registry inside AWS | Like Docker Hub but private and faster from ECS |
| **Task Definition** | Blueprint for an ECS container: what image, how much CPU/RAM, what env vars | Like a `docker-compose.yml` service definition |
| **ECS Service** | Ensures N copies of a Task Definition are always running | Like PM2 but for containers |
| **ALB** (Application Load Balancer) | Distributes HTTPS traffic across your ECS containers | Like nginx reverse proxy but managed by AWS |
| **ACM** (AWS Certificate Manager) | Free SSL/TLS certificates for your domain | Like Let's Encrypt but AWS handles renewal |
| **Cognito** | AWS's managed authentication service | Like Supabase Auth — handles signUp, signIn, JWT tokens |
| **Cognito User Pool** | The database of your users inside Cognito | Like Supabase's `auth.users` table |
| **JWKS** (JSON Web Key Set) | Public keys that let you verify JWTs without calling Cognito | Cognito exposes a URL with these; your backend fetches them to verify tokens |
| **Secrets Manager** | Secure storage for API keys, passwords, credentials | Like a `.env` file that lives securely inside AWS and rotates automatically |
| **CloudWatch** | AWS's logging and monitoring service | Like viewing server logs, but everything is stored and searchable |
| **Parameter Store** | Simpler than Secrets Manager for non-sensitive config values | Like `.env` for non-secret config |

---

## Cost Analysis

### Current Supabase Costs (Pro Plan)

| Service | Free Tier | Pro Plan Included | Overage Rate |
|---------|-----------|-------------------|--------------|
| Base fee | — | $25/month | — |
| Database | 500MB | 8GB | $0.125/GB |
| Storage | 1GB | 100GB | $0.021/GB |
| Bandwidth | 2GB | 250GB | $0.09/GB |
| Auth | 50K MAU | 50K MAU | $0.00325/MAU |
| Edge functions | — | 2M invocations | $2/1M |

**Pain point:** Each Veo3 video is ~50-200MB. With 1,000 video generations, that's ~50-200GB of storage + egress bandwidth — potentially $4.50-$18/month just in bandwidth overages on top of the base.

### AWS Estimated Costs

#### Small Scale (Development / Early Production, <100 users, <50GB)

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| RDS PostgreSQL | db.t3.micro, 20GB gp2, single-AZ | ~$13.00 |
| ECS Fargate (API) | 0.5 vCPU / 1GB RAM, 24/7 | ~$11.50 |
| ECS Fargate (Worker) | 0.25 vCPU / 0.5GB RAM, 24/7 | ~$5.75 |
| ALB | Fixed + 1 LCU | ~$16.50 |
| S3 Storage | 50GB | ~$1.15 |
| S3 Requests | 100K PUT + 1M GET | ~$0.80 |
| CloudFront | First 1TB free tier | ~$0.00 |
| Cognito | <50K MAU | ~$0.00 |
| CloudWatch Logs | 5GB ingestion | ~$2.50 |
| Secrets Manager | 5 secrets | ~$2.00 |
| **Total** | | **~$53/month** |

#### Medium Scale (Production, ~1,000 users, ~500GB storage)

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| RDS PostgreSQL | db.t3.small, 100GB gp2, Multi-AZ | ~$60.00 |
| ECS Fargate (API) | 1 vCPU / 2GB RAM, 24/7, 2 replicas | ~$46.00 |
| ECS Fargate (Worker) | 0.5 vCPU / 1GB RAM, 24/7 | ~$11.50 |
| ALB | Fixed + ~5 LCU | ~$18.50 |
| S3 Storage | 500GB | ~$11.50 |
| S3 Requests | 1M PUT + 10M GET | ~$4.40 |
| CloudFront | 2TB/month | ~$170.00 |
| Cognito | <50K MAU | ~$0.00 |
| CloudWatch | 20GB logs | ~$10.00 |
| Secrets Manager | 10 secrets | ~$4.00 |
| **Total** | | **~$336/month** |

Supabase equivalent at this scale: $25 base + ~$200+ in bandwidth/storage overages = **~$225-300/month**. AWS becomes cost-competitive at this scale with much more control.

#### Large Scale (>10K users, >2TB storage)
At this scale, AWS is significantly cheaper. Consider:
- RDS read replicas: ~$13-50/month per replica
- CloudFront data transfer in bulk: $0.020/GB (vs $0.09/GB Supabase bandwidth)
- S3 Intelligent-Tiering: automatically moves cold data to cheaper storage classes

---

## The 6 Migration Phases

Each phase is self-contained. You can stop after any phase and still have a working app.

### Phase 0: AWS Account Setup
**Docs:** [01-aws-account-setup.md](./01-aws-account-setup.md)
**Time:** 1-2 hours
**Risk:** None — no changes to the running app

Set up your AWS account, IAM users, billing alerts, and install the CLI tools. The app continues running on Supabase entirely.

**Outcome:** You have AWS credentials, CLI configured, and billing protection in place.

---

### Phase 1: Storage Migration (Supabase Storage → S3)
**Docs:** [02-s3-storage-migration.md](./02-s3-storage-migration.md)
**Time:** 3-4 hours (+ time to migrate existing files)
**Risk:** Low — storage is the most isolated component

Create S3 buckets, update 3 backend service files to use the AWS SDK instead of Supabase Storage, and migrate existing files. Auth and database stay on Supabase.

**Outcome:** All new uploads go to S3. Existing files are migrated. Supabase Storage is idle.

---

### Phase 2: Database Migration (Supabase PostgreSQL → RDS)
**Docs:** [03-rds-database-migration.md](./03-rds-database-migration.md)
**Time:** 4-6 hours
**Risk:** Medium — most impactful change; requires careful data migration

Create an RDS instance, export your Supabase schema and data, import to RDS, and replace the Supabase JS client with a raw `pg` connection pool in the backend. Auth stays on Supabase.

**Outcome:** All database reads/writes go to RDS. Supabase database is idle.

---

### Phase 3: Auth Migration (Supabase Auth → Amazon Cognito)
**Docs:** [04-cognito-auth-migration.md](./04-cognito-auth-migration.md)
**Time:** 6-8 hours
**Risk:** High — touches every authenticated request; requires user migration

Create a Cognito User Pool, rewrite the frontend auth store, rewrite the backend JWT middleware, and migrate existing users. This is the hardest phase.

**Outcome:** Users log in via Cognito. Supabase Auth is idle. Supabase subscription can now be cancelled.

---

### Phase 4: Backend Hosting Migration (Local/VPS → ECS Fargate)
**Docs:** [05-ecs-backend-deployment.md](./05-ecs-backend-deployment.md)
**Time:** 4-6 hours
**Risk:** Medium — requires Docker knowledge and ECS configuration

Dockerize the Express.js backend, push to ECR, create an ECS cluster with a Fargate service, and put an ALB in front of it.

**Outcome:** Backend runs in AWS, auto-restarts on failure, scales horizontally.

---

### Phase 5: Frontend Hosting (Optional)
**Docs:** [06-frontend-deployment.md](./06-frontend-deployment.md)
**Time:** 1-2 hours
**Risk:** Low

Deploy the built React app to S3 + CloudFront or AWS Amplify.

**Outcome:** Frontend served from AWS CDN globally.

---

### Phase 6: Decommission Supabase
**Docs:** [07-decommission-supabase.md](./07-decommission-supabase.md)
**Time:** 1 hour
**Risk:** Low (only after verifying all phases complete)

Verify zero Supabase traffic, back up data one final time, and cancel the Supabase subscription.

**Outcome:** Zero Supabase dependency. Full AWS stack.

---

## Rollback Strategy

Each phase is designed to be reversible. Here's how to roll back at any point:

### Phase 1 (Storage) Rollback
**How:** Change `S3_ENABLED=false` env var (or revert the 3 service files), redeploy backend.
**Data safety:** Supabase Storage still has all original files. New files uploaded to S3 are NOT automatically copied back (script provided in Phase 1 docs).
**Time to rollback:** ~30 minutes

### Phase 2 (Database) Rollback
**How:** Switch `DATABASE_URL` back to Supabase connection string, redeploy backend.
**Data safety:** Any data written to RDS after cutover is NOT automatically synced back to Supabase. Keep a backup timestamp and restore if needed.
**Time to rollback:** ~30 minutes
**Critical:** Keep Supabase database read-only (not deleted) for at least 2 weeks after cutover.

### Phase 3 (Auth) Rollback
**How:** Revert auth-store.ts and middleware/auth.ts, redeploy frontend + backend.
**Data safety:** Users created in Cognito after cutover may not exist in Supabase — they would need to re-register.
**Time to rollback:** ~1-2 hours
**Critical:** This is the hardest rollback. Test Phase 3 thoroughly before going live.

### Phase 4 (ECS) Rollback
**How:** Point DNS/frontend back to the previous backend URL (local, VPS, etc.).
**Time to rollback:** ~15 minutes (DNS TTL change)

### Phase 5 (Frontend) Rollback
**How:** Point DNS back to previous hosting (Vercel, Netlify, etc.).
**Time to rollback:** ~15 minutes

---

## Pre-Migration Checklist

Complete these before starting Phase 0:

- [ ] **Backup Supabase database**: Go to Supabase Dashboard → Settings → Database → Download backup
- [ ] **Document all environment variables**: Export your current `.env` files to a secure location
- [ ] **Note your Supabase project URL and keys**: You'll need them to connect `pg_dump` to your Supabase DB
- [ ] **Verify Node.js version**: Ensure `node --version` shows 18+ (needed for AWS SDK v3)
- [ ] **Install Docker Desktop**: Required for Phase 4 (ECS containerization)
- [ ] **Confirm AWS account**: If you don't have one, create at [aws.amazon.com](https://aws.amazon.com) (credit card required)
- [ ] **Choose a domain name or subdomain** for the backend ALB (e.g., `api.yourdomain.com`)
- [ ] **Inform team members** of the migration schedule and expected maintenance windows
- [ ] **Run existing tests**: `npm test` and `cd backend && npm test` — ensure green before starting

---

## Key Decisions & Rationale

### Why RDS over Aurora Serverless?

Aiuteur's `VideoJobExecutor` polls the database every 10 seconds looking for pending video jobs. Aurora Serverless v2 can auto-pause after 5 minutes of inactivity — when it wakes up, there's a 5-30 second cold start delay. This would cause video jobs to stall.

RDS is always-on, predictable, and at `db.t3.micro` only costs ~$13/month. If costs become a concern during development, you can **stop the RDS instance** when not working (unlike Aurora, you can manually stop RDS for up to 7 days).

### Why ECS Fargate over Lambda?

The `VideoJobExecutor` runs an infinite loop, polling every 10 seconds. AWS Lambda has a hard 15-minute maximum execution time. ECS Fargate containers run indefinitely.

Additionally, Fargate makes it easy to run the API server and the video job worker as separate containers within the same cluster, sharing the same VPC/security groups.

### Why Cognito over custom JWT?

Implementing JWT auth from scratch (user storage, password hashing, token signing, refresh token rotation, password reset emails) is significant engineering work. Cognito handles all of this for free up to 50,000 monthly active users. The tradeoff is some Cognito-specific SDK usage — but this is much less lock-in than Supabase (Cognito tokens are standard JWTs verifiable with any JWKS-compatible library).

### Why Phased over Big Bang?

Aiuteur is an active project. A big bang cutover requires:
1. Every phase tested in parallel environments simultaneously
2. A single, high-stress cutover window
3. High risk of data loss if any phase has an issue

The phased approach means:
- The app keeps working after each phase
- You can verify and gain confidence before proceeding
- Rollback at any step is fast and safe
- Each phase can be done in a few hours on a weekend

---

## Next Steps

Start with **Phase 0**: [01-aws-account-setup.md](./01-aws-account-setup.md)

Then proceed in order:
1. [02-s3-storage-migration.md](./02-s3-storage-migration.md) — Storage
2. [03-rds-database-migration.md](./03-rds-database-migration.md) — Database
3. [04-cognito-auth-migration.md](./04-cognito-auth-migration.md) — Auth
4. [05-ecs-backend-deployment.md](./05-ecs-backend-deployment.md) — Backend hosting
5. [06-frontend-deployment.md](./06-frontend-deployment.md) — Frontend hosting
6. [07-decommission-supabase.md](./07-decommission-supabase.md) — Clean up
