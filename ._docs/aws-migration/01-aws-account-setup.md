# Phase 0: AWS Account Setup

> **Prerequisites:** None — this is the starting point.
> **Time:** 1-2 hours
> **Risk:** Zero — no changes to the running app

This phase sets up your AWS account with proper security, billing protection, and CLI tooling. The app continues running on Supabase entirely. Do not proceed to Phase 1 until all steps here are verified.

---

## Step 1: Create an AWS Account

1. Go to [https://aws.amazon.com](https://aws.amazon.com) and click **Create an AWS Account**
2. Enter your email address and choose an account name (e.g., `aiuteur-prod`)
3. Choose **Personal** or **Professional** account type
4. Enter billing information (credit card required — you won't be charged during free tier usage)
5. Complete identity verification (phone number)
6. Choose the **Basic Support** plan (free)

> **Important:** The email/password you just used is the **root account**. It has unlimited power over everything in AWS. We will create a safer IAM user for daily use in Step 3. Never use the root account for regular work.

---

## Step 2: Enable MFA on the Root Account

Multi-Factor Authentication (MFA) adds a second layer of security. If your root account password is stolen, MFA prevents unauthorized access.

1. Sign in to [AWS Console](https://console.aws.amazon.com) with your root email/password
2. Click your account name (top-right corner) → **Security credentials**
3. Under **Multi-factor authentication (MFA)** → click **Assign MFA device**
4. Choose **Authenticator app** → click **Next**
5. Scan the QR code with Google Authenticator or Authy
6. Enter two consecutive 6-digit codes from your authenticator app
7. Click **Add MFA**

You should now see your MFA device listed. Root account is secured.

---

## Step 3: Create an IAM Admin User

You should never use the root account for day-to-day work. Create an IAM user with admin permissions instead.

### 3a. Open IAM
1. Search for "IAM" in the AWS Console search bar → click **IAM**
2. In the left sidebar → click **Users** → **Create user**

### 3b. Create the User
1. **Username:** `aiuteur-admin`
2. Check **Provide user access to the AWS Management Console**
3. Choose **I want to create an IAM user**
4. Set a strong password
5. Uncheck "User must create a new password at next sign-in" (you're the only user)
6. Click **Next**

### 3c. Attach Permissions
1. Select **Attach policies directly**
2. Search for and check `AdministratorAccess`
3. Click **Next** → **Create user**

### 3d. Save the Credentials
1. After creation, click **Download .csv** — this contains your console login URL, username, and password
2. Store this in a password manager (1Password, Bitwarden, etc.)
3. Note the **Console sign-in URL** — it looks like: `https://123456789012.signin.aws.amazon.com/console`

### 3e. Enable MFA on the IAM User
1. Go to IAM → Users → click `aiuteur-admin` → **Security credentials** tab
2. Under **Multi-factor authentication (MFA)** → **Assign MFA device**
3. Follow the same process as Step 2

> **From now on:** Sign in using the IAM user URL, not the root email. Sign out of root immediately.

---

## Step 4: Set Up Billing Alerts

AWS bills can surprise you. Set a hard alert at $50/month so you get an email before a misconfiguration runs up a large bill.

### 4a. Enable Billing Alerts
1. Sign in as `aiuteur-admin`
2. Click your account name (top-right) → **Billing and Cost Management**
3. In the left sidebar → **Billing preferences**
4. Enable **Receive Free Tier usage alerts** and **Receive CloudWatch billing alerts**
5. Add your email address
6. Click **Update**

### 4b. Create a CloudWatch Billing Alarm
1. Go to the AWS Console → search **CloudWatch** → open it
2. In the left sidebar → **Alarms** → **All alarms** → **Create alarm**
3. Click **Select metric** → **Billing** → **Total Estimated Charge** → **USD** → **Select metric**
4. Set:
   - **Threshold type:** Static
   - **Whenever EstimatedCharges is...** `Greater than` → **$50**
5. Click **Next** → **Create new topic** → name it `billing-alerts` → enter your email
6. Click **Create topic** → **Next** → **Next** → **Create alarm**
7. **Check your email** and confirm the SNS subscription

> You'll now get an email if your AWS bill exceeds $50 in any month.

---

## Step 5: Choose Your AWS Region

All resources (RDS, ECS, S3, etc.) should live in the same region to minimize latency and avoid cross-region data transfer fees.

**Recommended: `us-east-1` (US East — N. Virginia)**
- Reasons: Lowest prices for most services, newest features release here first, most documentation examples use it

To set your default region:
1. In the AWS Console, click the region dropdown (top-right, next to your account name)
2. Select **US East (N. Virginia)** → `us-east-1`

Note this region name — you'll need it in many commands: `us-east-1`

---

## Step 6: Install Required Tools

You need these tools on your development machine.

### 6a. AWS CLI (Command Line Interface)

The AWS CLI lets you interact with AWS from your terminal instead of clicking through the console.

**Install on Windows:**
```
winget install Amazon.AWSCLI
```
Or download from: https://aws.amazon.com/cli/

**Verify:**
```bash
aws --version
# Should output: aws-cli/2.x.x ...
```

### 6b. Configure AWS CLI Credentials

1. Go to AWS Console → IAM → Users → `aiuteur-admin` → **Security credentials** tab
2. Under **Access keys** → **Create access key**
3. Choose **Command Line Interface (CLI)**
4. Check the confirmation checkbox → **Next** → **Create access key**
5. **Download the .csv** — you will NOT be able to see the secret key again after closing this page

Now configure the CLI:
```bash
aws configure
```

Enter when prompted:
```
AWS Access Key ID [None]: AKIA...your-key-here...
AWS Secret Access Key [None]: your-secret-key-here
Default region name [None]: us-east-1
Default output format [None]: json
```

**Test it works:**
```bash
aws sts get-caller-identity
```

Expected output:
```json
{
    "UserId": "AIDAIOSFODNN7EXAMPLE",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/aiuteur-admin"
}
```

### 6c. Docker Desktop

Docker is required for Phase 4 (containerizing the Express.js backend for ECS).

**Download:** https://www.docker.com/products/docker-desktop/
- Windows: Install Docker Desktop for Windows
- Requires WSL2 on Windows

**Verify:**
```bash
docker --version
# Docker version 24.x.x, build ...

docker run hello-world
# Should print "Hello from Docker!"
```

### 6d. Node.js 18+ (if not already installed)

The AWS SDK v3 requires Node.js 18+.

```bash
node --version
# Should output v18.x.x or higher
```

If lower, download from: https://nodejs.org/en/download

### 6e. PostgreSQL Client Tools (for Phase 2)

You'll need `psql` and `pg_dump` for database migration.

**Windows:** Download PostgreSQL from https://www.postgresql.org/download/windows/
- During install, you only need "Command Line Tools" — uncheck server/pgAdmin if you don't want them
- Or install via: `winget install PostgreSQL.PostgreSQL`

**Verify:**
```bash
psql --version
pg_dump --version
```

---

## Step 7: Create IAM Policies for Migration Work

We'll create specific, scoped IAM permissions for the migration. This follows AWS security best practice: **least privilege** — only grant the exact permissions needed.

### 7a. Create the Migration Policy

1. Go to IAM → Policies → **Create policy**
2. Click **JSON** tab and paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3FullAccess",
      "Effect": "Allow",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::aiuteur-*", "arn:aws:s3:::aiuteur-*/*"]
    },
    {
      "Sid": "RDSFullAccess",
      "Effect": "Allow",
      "Action": "rds:*",
      "Resource": "*"
    },
    {
      "Sid": "CognitoFullAccess",
      "Effect": "Allow",
      "Action": "cognito-idp:*",
      "Resource": "*"
    },
    {
      "Sid": "ECSFullAccess",
      "Effect": "Allow",
      "Action": ["ecs:*", "ecr:*", "iam:PassRole"],
      "Resource": "*"
    },
    {
      "Sid": "SecretsManagerAccess",
      "Effect": "Allow",
      "Action": "secretsmanager:*",
      "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:aiuteur/*"
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": ["logs:*", "cloudwatch:*"],
      "Resource": "*"
    },
    {
      "Sid": "ALBAccess",
      "Effect": "Allow",
      "Action": ["elasticloadbalancing:*", "ec2:*"],
      "Resource": "*"
    }
  ]
}
```

3. Click **Next** → name it `aiuteur-migration-policy` → **Create policy**
4. Go to IAM → Users → `aiuteur-admin` → **Add permissions** → **Attach policies directly**
5. Search for `aiuteur-migration-policy` → attach it

> Your `aiuteur-admin` user now has `AdministratorAccess` (broad) AND the specific migration policy. For a tighter security posture later, you could remove `AdministratorAccess` and keep only the scoped policy.

---

## Step 8: Verify Your Setup

Run these commands to confirm everything is working:

```bash
# Confirm AWS CLI is authenticated
aws sts get-caller-identity

# Confirm you're in the right region
aws configure get region
# Should output: us-east-1

# Check you can list S3 buckets (empty list is fine)
aws s3 ls

# Check Docker is running
docker ps

# Check Node version
node --version

# Check psql is available
psql --version
```

All commands should run without errors.

---

## Phase 0 Checklist

Before proceeding to Phase 1, confirm:

- [ ] AWS account created
- [ ] MFA enabled on root account
- [ ] IAM admin user `aiuteur-admin` created with `AdministratorAccess`
- [ ] MFA enabled on `aiuteur-admin`
- [ ] Billing alert set at $50/month
- [ ] Default region set to `us-east-1`
- [ ] AWS CLI installed and configured (`aws sts get-caller-identity` works)
- [ ] Docker Desktop installed and running (`docker ps` works)
- [ ] Node.js 18+ installed
- [ ] `psql` and `pg_dump` available

---

## Next Step

Proceed to **Phase 1:** [02-s3-storage-migration.md](./02-s3-storage-migration.md)
