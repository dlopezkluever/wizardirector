# Phase 4: ECS Fargate Backend Deployment

> **Prerequisites:** Phases 0-3 complete. Docker Desktop installed and running.
> **Time:** 4-6 hours
> **Risk:** Medium — requires Docker and ECS configuration, but rollback is fast.
> **Rollback:** Point frontend `VITE_API_BASE_URL` back to previous backend URL (~15 min)

In this phase we:
1. Dockerize the Express.js backend
2. Create an ECR (private Docker registry) and push the image
3. Store secrets in AWS Secrets Manager
4. Create an ECS Fargate cluster, task definition, and service
5. Put an Application Load Balancer (ALB) in front
6. Update the frontend to point to the ALB URL

---

## Why ECS Fargate?

Your backend has two long-running processes:
1. **Express.js API server** — handles HTTP requests
2. **VideoJobExecutor** — polls the database every 10 seconds, submits jobs to Veo3, monitors progress

Both need to run continuously. ECS Fargate:
- Manages container lifecycle (auto-restarts on crash)
- Scales horizontally (add more API containers under load)
- Integrates with ALB for load balancing
- Has built-in IAM roles (no hardcoded AWS credentials in the container)

---

## Step 1: Create the Dockerfile

Create `backend/Dockerfile`:

```dockerfile
# Use Node 20 Alpine (small, secure base image)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (for Docker layer caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy source files
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# ─────────────────────────────────────────
# Production image (only what we need)
FROM node:20-alpine AS production

WORKDIR /app

# Copy only the compiled output and node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Run as non-root user (security best practice)
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3001

CMD ["node", "dist/server.js"]
```

Create `backend/.dockerignore`:
```
node_modules
dist
.env
*.env
.env.*
*.log
coverage
.git
.gitignore
README.md
```

### Test the Docker build locally:

```bash
cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend"

# Build the image
docker build -t aiuteur-backend:local .

# Run it locally to verify it starts (it will fail to connect to DB/AWS but should start)
docker run --rm -p 3001:3001 \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://..." \
  -e AWS_REGION=us-east-1 \
  -e COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX \
  aiuteur-backend:local

# Should see: "Express server listening on port 3001"
# Ctrl+C to stop
```

---

## Step 2: Create ECR Repository

ECR (Elastic Container Registry) is AWS's private Docker image registry — like Docker Hub but inside your AWS account.

```bash
# Create the ECR repository
aws ecr create-repository \
  --repository-name aiuteur-backend \
  --region us-east-1

# Note the repository URI from the output:
# 123456789012.dkr.ecr.us-east-1.amazonaws.com/aiuteur-backend
```

---

## Step 3: Push the Docker Image to ECR

```bash
# Get your AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=us-east-1
ECR_URI="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/aiuteur-backend"

# Authenticate Docker to ECR
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

# Build and tag the image
cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend"
docker build -t aiuteur-backend:latest .
docker tag aiuteur-backend:latest "$ECR_URI:latest"

# Push to ECR
docker push "$ECR_URI:latest"

echo "Image pushed to: $ECR_URI:latest"
```

---

## Step 4: Store Secrets in AWS Secrets Manager

Instead of hardcoding env vars in task definitions, store them in Secrets Manager. ECS Fargate injects them at runtime.

```bash
# Store the database URL
aws secretsmanager create-secret \
  --name "aiuteur/database-url" \
  --secret-string "postgresql://aiuteur_admin:YOUR_PASSWORD@aiuteur-postgres.xxxx.us-east-1.rds.amazonaws.com:5432/aiuteur"

# Store Google credentials (for Veo3) as a JSON string
# First, read your veo3-api.json file content:
GOOGLE_CREDS=$(cat "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\veo3-api.json" | tr -d '\n')
aws secretsmanager create-secret \
  --name "aiuteur/google-credentials" \
  --secret-string "$GOOGLE_CREDS"

# Store LLM API keys
aws secretsmanager create-secret \
  --name "aiuteur/google-ai-api-key" \
  --secret-string "AIzaSy..."

aws secretsmanager create-secret \
  --name "aiuteur/langsmith-api-key" \
  --secret-string "lsv2_pt_..."
```

> **Note:** For Phase 4, we'll reference these secrets by ARN in the ECS task definition. ECS injects them as environment variables at container startup — the app code doesn't change.

---

## Step 5: Create IAM Roles for ECS

ECS containers need two IAM roles:
1. **Task Execution Role** — allows ECS to pull images from ECR and read secrets from Secrets Manager
2. **Task Role** — allows the running container to access AWS services (S3, Cognito, etc.)

### 5a. Create the Task Execution Role

```bash
# Create the role
aws iam create-role \
  --role-name aiuteur-ecs-task-execution-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": { "Service": "ecs-tasks.amazonaws.com" },
        "Action": "sts:AssumeRole"
      }
    ]
  }'

# Attach the standard ECS execution policy
aws iam attach-role-policy \
  --role-name aiuteur-ecs-task-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Allow reading secrets from Secrets Manager
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws iam put-role-policy \
  --role-name aiuteur-ecs-task-execution-role \
  --policy-name secrets-access \
  --policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [
      {
        \"Effect\": \"Allow\",
        \"Action\": [\"secretsmanager:GetSecretValue\", \"ssm:GetParameters\"],
        \"Resource\": \"arn:aws:secretsmanager:us-east-1:${ACCOUNT_ID}:secret:aiuteur/*\"
      }
    ]
  }"
```

### 5b. Create the Task Role (for S3 access from within containers)

```bash
# Create the task role
aws iam create-role \
  --role-name aiuteur-ecs-task-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": { "Service": "ecs-tasks.amazonaws.com" },
        "Action": "sts:AssumeRole"
      }
    ]
  }'

# Attach S3 permissions (replaces the IAM user credentials we used in Phase 1)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws iam put-role-policy \
  --role-name aiuteur-ecs-task-role \
  --policy-name s3-access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:HeadObject"],
        "Resource": [
          "arn:aws:s3:::aiuteur-videos/*",
          "arn:aws:s3:::aiuteur-images/*",
          "arn:aws:s3:::aiuteur-asset-images/*"
        ]
      },
      {
        "Effect": "Allow",
        "Action": "s3:ListBucket",
        "Resource": [
          "arn:aws:s3:::aiuteur-videos",
          "arn:aws:s3:::aiuteur-images",
          "arn:aws:s3:::aiuteur-asset-images"
        ]
      }
    ]
  }'
```

> **Important:** Once ECS is running with the Task Role, you can remove the `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` from the backend config. The AWS SDK automatically uses the ECS task role when those env vars are absent. Update `backend/src/config/s3.ts` to not require explicit credentials when running in ECS:

```typescript
// Updated s3.ts — credentials optional (ECS task role handles it)
import { S3Client } from '@aws-sdk/client-s3';

export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  // No credentials needed in ECS — task role handles it automatically
  // For local dev, falls back to ~/.aws/credentials or env vars
});
```

---

## Step 6: Create an Application Load Balancer (ALB)

The ALB distributes traffic to your ECS containers and handles HTTPS termination.

### 6a. Create the ALB Security Group

```bash
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text)

ALB_SG_ID=$(aws ec2 create-security-group \
  --group-name aiuteur-alb-sg \
  --description "Security group for Aiuteur ALB" \
  --vpc-id $VPC_ID \
  --query "GroupId" \
  --output text)

# Allow HTTP and HTTPS from anywhere
aws ec2 authorize-security-group-ingress --group-id $ALB_SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $ALB_SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0

echo "ALB Security Group: $ALB_SG_ID"
```

### 6b. Create an ECS Security Group (Allow Traffic from ALB)

```bash
ECS_SG_ID=$(aws ec2 create-security-group \
  --group-name aiuteur-ecs-sg \
  --description "Security group for Aiuteur ECS tasks" \
  --vpc-id $VPC_ID \
  --query "GroupId" \
  --output text)

# Allow port 3001 only from the ALB security group
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG_ID \
  --protocol tcp \
  --port 3001 \
  --source-group $ALB_SG_ID

echo "ECS Security Group: $ECS_SG_ID"
```

### 6c. Update the RDS Security Group to Allow ECS

```bash
# Get the RDS security group ID we created in Phase 2
RDS_SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=aiuteur-rds-sg" \
  --query "SecurityGroups[0].GroupId" \
  --output text)

# Allow PostgreSQL (5432) from ECS security group
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG_ID \
  --protocol tcp \
  --port 5432 \
  --source-group $ECS_SG_ID

echo "RDS now allows connections from ECS"
```

### 6d. Create the Load Balancer

```bash
SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=defaultForAz,Values=true" \
  --query "Subnets[].SubnetId" \
  --output text | tr '\t' ' ')

ALB_ARN=$(aws elbv2 create-load-balancer \
  --name aiuteur-alb \
  --subnets $SUBNET_IDS \
  --security-groups $ALB_SG_ID \
  --type application \
  --query "LoadBalancers[0].LoadBalancerArn" \
  --output text)

echo "ALB ARN: $ALB_ARN"

# Get the DNS name (this is your backend URL after ECS deployment)
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --query "LoadBalancers[0].DNSName" \
  --output text)

echo "ALB DNS: $ALB_DNS"
# Looks like: aiuteur-alb-1234567890.us-east-1.elb.amazonaws.com
```

### 6e. Create Target Group and Listener

```bash
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text)

# Create target group (where ALB sends traffic)
TG_ARN=$(aws elbv2 create-target-group \
  --name aiuteur-backend-tg \
  --protocol HTTP \
  --port 3001 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path /api/health \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --query "TargetGroups[0].TargetGroupArn" \
  --output text)

echo "Target Group ARN: $TG_ARN"

# Create listener (HTTP on port 80 → forwards to target group)
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN
```

---

## Step 7: Create the ECS Cluster and Task Definition

### 7a. Create ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name aiuteur-cluster \
  --capacity-providers FARGATE \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1
```

### 7b. Create CloudWatch Log Group

```bash
aws logs create-log-group --log-group-name /ecs/aiuteur-backend
```

### 7c. Create Task Definition

This JSON tells ECS what container to run, how much CPU/RAM, what environment variables, and where to send logs.

Save as `backend/ecs-task-definition.json`:

```json
{
  "family": "aiuteur-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/aiuteur-ecs-task-execution-role",
  "taskRoleArn": "arn:aws:iam::ACCOUNT_ID:role/aiuteur-ecs-task-role",
  "containerDefinitions": [
    {
      "name": "aiuteur-backend",
      "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/aiuteur-backend:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "PORT", "value": "3001" },
        { "name": "AWS_REGION", "value": "us-east-1" },
        { "name": "COGNITO_USER_POOL_ID", "value": "us-east-1_XXXXXXXXX" },
        { "name": "S3_VIDEOS_BUCKET", "value": "aiuteur-videos" },
        { "name": "S3_IMAGES_BUCKET", "value": "aiuteur-images" },
        { "name": "S3_ASSET_IMAGES_BUCKET", "value": "aiuteur-asset-images" },
        { "name": "GEMINI_MODEL", "value": "gemini-2.5-flash-lite" },
        { "name": "LANGSMITH_PROJECT", "value": "Aiutuer" },
        { "name": "LANGSMITH_TRACING", "value": "true" },
        { "name": "VIDEO_PROVIDER", "value": "veo3" },
        { "name": "GOOGLE_CLOUD_PROJECT", "value": "aiuteur" },
        { "name": "GOOGLE_CLOUD_LOCATION", "value": "us-central1" }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:aiuteur/database-url"
        },
        {
          "name": "GOOGLE_AI_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:aiuteur/google-ai-api-key"
        },
        {
          "name": "LANGSMITH_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:aiuteur/langsmith-api-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/aiuteur-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "essential": true,
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3001/api/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

Replace `ACCOUNT_ID` with your actual AWS account ID throughout:
```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
sed -i "s/ACCOUNT_ID/$ACCOUNT_ID/g" backend/ecs-task-definition.json
```

Register the task definition:
```bash
aws ecs register-task-definition \
  --cli-input-json file://backend/ecs-task-definition.json
```

---

## Step 8: Create the ECS Service

```bash
SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=defaultForAz,Values=true" \
  --query "Subnets[].SubnetId" \
  --output text | tr '\t' ',')

TG_ARN=$(aws elbv2 describe-target-groups \
  --names aiuteur-backend-tg \
  --query "TargetGroups[0].TargetGroupArn" \
  --output text)

ECS_SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=aiuteur-ecs-sg" \
  --query "SecurityGroups[0].GroupId" \
  --output text)

aws ecs create-service \
  --cluster aiuteur-cluster \
  --service-name aiuteur-backend-service \
  --task-definition aiuteur-backend \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$TG_ARN,containerName=aiuteur-backend,containerPort=3001" \
  --health-check-grace-period-seconds 60
```

---

## Step 9: Verify the Deployment

```bash
# Watch the service stabilize (takes 2-3 minutes)
aws ecs wait services-stable \
  --cluster aiuteur-cluster \
  --services aiuteur-backend-service

# Check service status
aws ecs describe-services \
  --cluster aiuteur-cluster \
  --services aiuteur-backend-service \
  --query "services[0].{Status:status,Running:runningCount,Desired:desiredCount}"

# Get ALB DNS name and test health endpoint
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names aiuteur-alb \
  --query "LoadBalancers[0].DNSName" \
  --output text)

curl "http://$ALB_DNS/api/health"
# Should return: {"status": "ok", ...}
```

If the health check fails, check logs:
```bash
# List log streams for the ECS task
aws logs describe-log-streams \
  --log-group-name /ecs/aiuteur-backend \
  --order-by LastEventTime \
  --descending \
  --max-items 5

# Read the most recent log stream
LOG_STREAM=$(aws logs describe-log-streams \
  --log-group-name /ecs/aiuteur-backend \
  --order-by LastEventTime \
  --descending \
  --max-items 1 \
  --query "logStreams[0].logStreamName" \
  --output text)

aws logs get-log-events \
  --log-group-name /ecs/aiuteur-backend \
  --log-stream-name "$LOG_STREAM" \
  --limit 50
```

---

## Step 10: Update Frontend to Use the ALB URL

```bash
# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names aiuteur-alb \
  --query "LoadBalancers[0].DNSName" \
  --output text)
echo "Backend URL: http://$ALB_DNS"
```

Update `.env` in the frontend root:
```env
VITE_API_BASE_URL=http://aiuteur-alb-1234567890.us-east-1.elb.amazonaws.com
```

Rebuild the frontend:
```bash
cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector"
npm run build
```

---

## Step 11: Set Up a Deployment Script (For Future Updates)

When you update the backend code, re-deploy with:

```bash
#!/bin/bash
# backend/deploy.sh — run this to deploy new backend code to ECS

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=us-east-1
ECR_URI="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/aiuteur-backend"

# Build and push new image
cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend"
docker build -t aiuteur-backend:latest .
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"
docker tag aiuteur-backend:latest "$ECR_URI:latest"
docker push "$ECR_URI:latest"

# Force ECS to pull the new image and replace containers
aws ecs update-service \
  --cluster aiuteur-cluster \
  --service aiuteur-backend-service \
  --force-new-deployment

echo "Deployment triggered. Monitor with:"
echo "aws ecs wait services-stable --cluster aiuteur-cluster --services aiuteur-backend-service"
```

---

## Optional: Add HTTPS with ACM Certificate

If you have a domain name (e.g., `api.yourdomain.com`):

```bash
# Request a certificate
aws acm request-certificate \
  --domain-name api.yourdomain.com \
  --validation-method DNS

# Follow the DNS validation instructions in the AWS Console
# Then add an HTTPS listener to the ALB:
CERT_ARN="arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/..."
TG_ARN="..."  # Your target group ARN

aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN
```

---

## Phase 4 Checklist

- [ ] `backend/Dockerfile` created and tested locally
- [ ] `backend/.dockerignore` created
- [ ] ECR repository `aiuteur-backend` created
- [ ] Docker image built and pushed to ECR
- [ ] Secrets stored in Secrets Manager (`aiuteur/database-url`, `aiuteur/google-ai-api-key`, etc.)
- [ ] IAM roles created: `aiuteur-ecs-task-execution-role`, `aiuteur-ecs-task-role`
- [ ] ALB security group and ECS security group created
- [ ] RDS security group updated to allow ECS connections
- [ ] ALB created and DNS name noted
- [ ] Target group and listener created
- [ ] ECS cluster `aiuteur-cluster` created
- [ ] CloudWatch log group `/ecs/aiuteur-backend` created
- [ ] Task definition registered
- [ ] ECS service running (`desiredCount: 1`, `runningCount: 1`)
- [ ] `curl http://ALB_DNS/api/health` returns `{"status": "ok"}`
- [ ] Frontend `.env` updated with `VITE_API_BASE_URL=http://ALB_DNS`
- [ ] Frontend rebuilt and tested against ECS backend
- [ ] Full app flow verified end-to-end

---

## Next Step

Proceed to **Phase 5:** [06-frontend-deployment.md](./06-frontend-deployment.md)
