AWS Migration Guide Plan — Aiuteur
Context
Aiuteur currently runs entirely on Supabase (Auth, PostgreSQL, Storage). The migration is driven by cost control at scale, scalability ceiling concerns, and full infrastructure ownership. The goal is a phased migration to AWS using Amazon Cognito (auth), RDS PostgreSQL (database), S3 (storage), and ECS Fargate (backend). This plan describes the structure and content of a comprehensive, beginner-friendly migration guide to be written as multiple markdown documents in ._docs/aws-migration/.

Supabase Footprint (what we're migrating)
Supabase Feature	Usage in Aiuteur	AWS Replacement
Auth	signUp, signIn, signOut, JWT verify in middleware, session persistence	Amazon Cognito User Pools
PostgreSQL	15+ tables, 31 migrations, RLS on core tables, complex joins	Amazon RDS PostgreSQL
Storage	videos, images, asset-images buckets — upload/download/public URL	Amazon S3
Realtime	Not used (polling instead)	N/A
Edge Functions	Not used	N/A
Backend auth flow to replace:

Frontend: supabase.auth.getSession() → access_token → Authorization: Bearer header
Backend middleware: supabase.auth.getUser(token) → user ID attached to request
Recommended AWS Architecture

Frontend (React/Vite)
  └─► S3 + CloudFront  (static hosting)
        │
        ▼
  ALB (Application Load Balancer)
        │
        ▼
  ECS Fargate (Express.js API + VideoJobExecutor worker)
        │
        ├─► Amazon RDS PostgreSQL  (pg Pool, private subnet)
        ├─► Amazon S3              (videos, images, asset-images buckets)
        ├─► Amazon Cognito         (JWT verification)
        └─► Secrets Manager        (API keys, DB creds, Google credentials)
Why these choices:

RDS over Aurora Serverless: VideoJobExecutor polls DB every 10s — Aurora's auto-pause would cause latency spikes; RDS db.t3.micro (~$13/mo) is always-on
ECS Fargate over Lambda: Video polling loops run indefinitely; Lambda's 15-min timeout is incompatible
Cognito over custom JWT: Free up to 50K MAU, handles token refresh, integrates with ALB natively
Phased approach: Migrate Storage → DB → Auth → Backend hosting to allow rollback at each stage
Cost Estimates
Service	Spec	Est. Monthly Cost
RDS PostgreSQL	db.t3.micro, single-AZ, 20GB	~$13
ECS Fargate	0.5 vCPU / 1GB RAM, 24/7	~$15
ALB	Fixed + LCU charges	~$16
S3 Storage	50GB (grows with videos)	~$1.15
S3 Requests	PUT/GET at small scale	~$0.50
Cognito	Free up to 50K MAU	$0
CloudWatch Logs	~5GB/mo	~$2.50
CloudFront	First 1TB free tier	~$0 initially
Total (small scale)		~$48–50/month
Supabase Pro = $25/mo base + usage overages. AWS becomes cost-advantaged at scale (DB connections, storage bandwidth, compute).

Documents to Create
All files go in ._docs/aws-migration/:

00-overview.md — Master Reference Guide
Full architecture overview written for a beginner. Contents:

Why migrate (cost comparison table, scalability limits of Supabase)
Full AWS architecture diagram (ASCII)
All 6 phases explained at a high level with time estimates
AWS account structure (IAM, regions, free tier guidance)
Cost breakdown table (all services, small/medium/large scale projections)
Rollback strategy per phase
Key AWS concepts glossary (VPC, Security Groups, IAM Roles, ARN, ECR, ECS Task Definition)
Pre-migration checklist
01-aws-account-setup.md — Phase 0
Create AWS account, enable MFA on root
Create IAM admin user (never use root for daily operations)
Install AWS CLI + configure credentials
Set up billing alerts ($50 threshold)
Understand free tier limits
Choose region (recommend us-east-1 for cost + service availability)
Install required tools: AWS CLI, Docker, jq
02-s3-storage-migration.md — Phase 1
AWS side:

Create 3 S3 buckets: aiuteur-videos, aiuteur-images, aiuteur-asset-images
Bucket policies: public-read for images/asset-images; pre-signed URLs for videos
CORS configuration for browser uploads
Enable versioning (optional but recommended)
Code changes:

Install @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner
Update backend/src/services/assetImageLocalizer.ts — replace supabase.storage.from().upload() and .getPublicUrl() with S3 PutObjectCommand + public URL pattern
Update backend/src/services/video-generation/Veo3Provider.ts — replace Supabase storage upload with S3
Update backend/src/services/ImageGenerationService.ts — same pattern
Create backend/src/config/s3.ts — S3 client singleton using env vars
Add env vars: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_VIDEOS_BUCKET, S3_IMAGES_BUCKET, S3_ASSET_IMAGES_BUCKET
Data migration:

Script to copy existing Supabase Storage files to S3 using supabase storage CLI + AWS CLI
Update existing DB records' image_url, video_url, storage_path columns to point to S3 URLs
Verification checklist
03-rds-database-migration.md — Phase 2
AWS side:

Create VPC with public + private subnets (or use default VPC for simplicity)
Create RDS security group (allow port 5432 from ECS only)
Launch RDS PostgreSQL 16 db.t3.micro
Note on connection string format
Schema migration:

Export Supabase schema: pg_dump --schema-only command (exact command provided)
Strip Supabase-specific extensions (pg_cron, vault, etc.)
Import 31 migrations in order to RDS
Export + import data: pg_dump --data-only → pg_restore
Handle auth.uid() RLS references (no longer needed — manual checks already in backend routes)
Code changes:

Install pg and @types/pg
Create backend/src/config/database.ts — pg.Pool singleton replacing supabase client
Global find-replace pattern: supabase.from('table').select(...) → pool.query('SELECT ...')
Update all affected files (listed with line refs):
backend/src/routes/projects.ts (lines 21-68)
backend/src/routes/styleCapsules.ts (lines 30-47, 67-72)
backend/src/services/userCreditsService.ts (lines 30-49)
backend/src/services/assetInheritanceService.ts (lines 53-54, 94-95)
backend/src/config/database.ts
All other service files using supabase.from()
Remove Supabase client from backend entirely (or keep as legacy fallback)
Add env var: DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/aiuteur
Run existing backend tests to verify
04-cognito-auth-migration.md — Phase 3
AWS side:

Create Cognito User Pool (name: aiuteur-users)
Password policy
Email verification
App client (no secret for SPA)
Domain for hosted UI (optional)
Note User Pool ID and App Client ID
Frontend code changes:

Install amazon-cognito-identity-js (or @aws-amplify/auth for higher-level API)
Rewrite src/lib/stores/auth-store.ts:
signUp() → CognitoUser.signUp() / Auth.signUp()
signInWithPassword() → Auth.signIn()
signOut() → Auth.signOut()
getSession() → Auth.currentSession() → idToken.getJwtToken()
onAuthStateChange() → Hub.listen('auth', ...)
Update src/lib/supabase.ts — remove or stub out
Update all getAuthHeaders() calls in src/lib/services/ to use Cognito token
Backend code changes:

Install jose for JWT verification
Rewrite backend/src/middleware/auth.ts:
Fetch Cognito JWKS: https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json
Verify JWT using jose.createRemoteJWKSet + jose.jwtVerify
Extract sub as user ID (replaces Supabase user ID)
Remove supabase.auth.getUser(token) call
User migration:

Script to export Supabase Auth users → CSV
Cognito admin API: adminCreateUser bulk import
Handle password reset flow (Cognito sends temp passwords)
Map Supabase UUIDs → Cognito sub (may need a transition mapping table)
05-ecs-backend-deployment.md — Phase 4
Docker:

Create backend/Dockerfile (Node 20 alpine, copy package*.json, npm ci --only=production, EXPOSE 3001, CMD)
Create .dockerignore
Build + test locally: docker build + docker run
ECR:

Create ECR repository: aiuteur-backend
Authenticate Docker to ECR
Tag + push image
Secrets Manager:

Store all env vars as secrets: DATABASE_URL, GOOGLE_APPLICATION_CREDENTIALS (JSON content), AWS_REGION, SUPABASE_* (until fully decommissioned), LLM API keys
ECS:

Create ECS cluster (Fargate)
Create Task Definition (API container + optional VideoJobExecutor sidecar or separate task)
Create ECS Service with desired count = 1 (scale up later)
Application Load Balancer setup: listener on 443, target group on 3001
ACM certificate for HTTPS (optional at first, use HTTP for testing)
Frontend config:

Update VITE_API_BASE_URL to ALB DNS name
Rebuild + redeploy frontend
06-frontend-deployment.md — Phase 5
Build: npm run build
Option A: S3 + CloudFront
Create S3 bucket with static website hosting
CloudFront distribution pointing to S3
SPA redirect rule (all paths → index.html)
Option B: AWS Amplify Hosting
Connect GitHub repo
Auto-build on push
Simpler for beginners
07-decommission-supabase.md — Phase 6
Pre-decommission verification checklist (all traffic on AWS, zero Supabase calls)
Final data backup from Supabase
Cancel Supabase subscription
Archive project (pause vs delete)
Remove Supabase env vars from codebase
Cost comparison: before vs after
Critical Files to Modify (for the guide to document)
File	Change
src/lib/supabase.ts	Remove/replace with Cognito client
src/lib/stores/auth-store.ts	Full rewrite for Cognito
src/lib/services/*.ts	Update getAuthHeaders() to use Cognito token
backend/src/config/supabase.ts	Remove
backend/src/config/database.ts	Add pg Pool
backend/src/middleware/auth.ts	Rewrite for Cognito JWT
backend/src/services/assetImageLocalizer.ts	Replace storage calls with S3
backend/src/services/video-generation/Veo3Provider.ts	Replace storage upload with S3
backend/src/services/ImageGenerationService.ts	Replace storage upload with S3
All backend routes/services using supabase.from()	Replace with pool.query()
Files to Create

._docs/aws-migration/
  00-overview.md
  01-aws-account-setup.md
  02-s3-storage-migration.md
  03-rds-database-migration.md
  04-cognito-auth-migration.md
  05-ecs-backend-deployment.md
  06-frontend-deployment.md
  07-decommission-supabase.md
backend/Dockerfile          (new)
backend/.dockerignore        (new)
backend/src/config/s3.ts    (new)
Verification (per phase)
Phase 1 (S3): Upload a new image/video through the app; verify it lands in S3 bucket; verify existing Supabase URLs still load (CDN/redirect)
Phase 2 (RDS): Run cd backend && npm test; verify all existing routes return correct data; check no supabase.from() calls remain in backend
Phase 3 (Cognito): Log in, log out, refresh page; verify token passes to backend; run frontend tests with npm test
Phase 4 (ECS): Hit ALB endpoint from browser; verify VideoJobExecutor polling works; check CloudWatch logs for errors
Phase 5 (Frontend): Full app flow end-to-end on CloudFront URL
Phase 6: Zero active Supabase connections; subscription cancelled; cost dashboard shows only AWS charges