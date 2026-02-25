# Phase 5: Frontend Deployment

> **Prerequisites:** Phase 4 complete (ECS backend running). Phases 1-3 complete.
> **Time:** 1-2 hours
> **Risk:** Low — the frontend is a static build; rollback is instant.
> **Rollback:** Point DNS back to previous hosting (Vercel, Netlify, etc.) — ~15 minutes

In this phase we deploy the React/Vite frontend to AWS. Two options are provided:

- **Option A: S3 + CloudFront** — more control, slightly more setup, best for production
- **Option B: AWS Amplify Hosting** — simplest option, auto-deploys from GitHub

Both serve the same built files — choose based on your preference.

---

## Pre-Deployment: Final Environment Variable Audit

Before building for production, ensure all frontend env vars are set correctly:

**`.env.production`** (create this file at the project root):
```env
# Backend API (your ECS ALB URL from Phase 4)
VITE_API_BASE_URL=http://aiuteur-alb-1234567890.us-east-1.elb.amazonaws.com

# Cognito (from Phase 3)
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# Any other frontend env vars currently in .env
```

Build the production bundle:
```bash
cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector"
npm run build
```

Verify the `dist/` folder is created and contains `index.html` and `assets/`.

---

## Option A: S3 + CloudFront (Recommended for Production)

### Why S3 + CloudFront?
- Files cached at 300+ edge locations worldwide
- Extremely cheap (CloudFront free tier: 1TB/month transfer, 10M requests)
- Fast global load times
- HTTPS via ACM certificate (free)

### A1. Create a Frontend S3 Bucket

```bash
# Bucket name must be globally unique — use your domain or a unique suffix
aws s3api create-bucket \
  --bucket aiuteur-frontend \
  --region us-east-1

# Do NOT enable public access on this bucket — CloudFront handles access
# (More secure: CloudFront fetches from S3, users can't access S3 directly)
```

### A2. Upload the Built Files

```bash
cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector"

# Sync the dist/ folder to S3
aws s3 sync dist/ s3://aiuteur-frontend/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable"

# The index.html should NOT be cached aggressively (so new deploys are picked up)
aws s3 cp dist/index.html s3://aiuteur-frontend/index.html \
  --cache-control "public, max-age=0, must-revalidate" \
  --content-type "text/html"

echo "Frontend uploaded to S3"
```

### A3. Create a CloudFront Distribution

#### Get the S3 Bucket ARN
```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
S3_BUCKET=aiuteur-frontend
```

#### Create CloudFront Origin Access Control (OAC)

OAC allows CloudFront to access the private S3 bucket:

```bash
OAC_ID=$(aws cloudfront create-origin-access-control \
  --origin-access-control-config '{
    "Name": "aiuteur-frontend-oac",
    "Description": "OAC for Aiuteur frontend",
    "SigningProtocol": "sigv4",
    "SigningBehavior": "always",
    "OriginAccessControlOriginType": "s3"
  }' \
  --query "OriginAccessControl.Id" \
  --output text)

echo "OAC ID: $OAC_ID"
```

#### Create the Distribution

Save as `cloudfront-config.json`:
```json
{
  "CallerReference": "aiuteur-frontend-2024",
  "Comment": "Aiuteur frontend CDN",
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3Origin",
        "DomainName": "aiuteur-frontend.s3.us-east-1.amazonaws.com",
        "OriginAccessControlId": "OAC_ID_PLACEHOLDER",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "ViewerProtocolPolicy": "redirect-to-https",
    "TargetOriginId": "S3Origin",
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "FunctionAssociations": {
      "Quantity": 0
    }
  },
  "CustomErrorResponses": {
    "Quantity": 1,
    "Items": [
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 0
      }
    ]
  },
  "PriceClass": "PriceClass_100",
  "Enabled": true,
  "HttpVersion": "http2and3"
}
```

> The `CustomErrorResponses` section is critical for React SPAs — it routes 404s back to `index.html` so client-side routing (React Router) works correctly.

Replace the placeholder and create the distribution:
```bash
sed -i "s/OAC_ID_PLACEHOLDER/$OAC_ID/" cloudfront-config.json

DISTRIBUTION_ID=$(aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json \
  --query "Distribution.Id" \
  --output text)

CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution \
  --id $DISTRIBUTION_ID \
  --query "Distribution.DomainName" \
  --output text)

echo "CloudFront Distribution ID: $DISTRIBUTION_ID"
echo "CloudFront Domain: $CLOUDFRONT_DOMAIN"
# Looks like: d1234abcd567ef.cloudfront.net
```

#### Update S3 Bucket Policy to Allow CloudFront

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

aws s3api put-bucket-policy --bucket aiuteur-frontend --policy "{
  \"Version\": \"2012-10-17\",
  \"Statement\": [
    {
      \"Sid\": \"AllowCloudFrontOAC\",
      \"Effect\": \"Allow\",
      \"Principal\": {
        \"Service\": \"cloudfront.amazonaws.com\"
      },
      \"Action\": \"s3:GetObject\",
      \"Resource\": \"arn:aws:s3:::aiuteur-frontend/*\",
      \"Condition\": {
        \"StringEquals\": {
          \"AWS:SourceArn\": \"arn:aws:cloudfront::${ACCOUNT_ID}:distribution/${DISTRIBUTION_ID}\"
        }
      }
    }
  ]
}"
```

### A4. Wait for CloudFront to Deploy

CloudFront takes 5-15 minutes to propagate globally:
```bash
aws cloudfront wait distribution-deployed --id $DISTRIBUTION_ID
echo "CloudFront is live at: https://$CLOUDFRONT_DOMAIN"
```

### A5. Test the Deployment

```bash
# Test the CloudFront URL
curl -I "https://$CLOUDFRONT_DOMAIN"
# Should return HTTP 200

# Open in browser
echo "Open in browser: https://$CLOUDFRONT_DOMAIN"
```

### A6. Re-deploy Script (For Future Frontend Updates)

```bash
#!/bin/bash
# frontend-deploy.sh — run after npm run build

DISTRIBUTION_ID="YOUR_DISTRIBUTION_ID"

# Upload new files
aws s3 sync dist/ s3://aiuteur-frontend/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable"

# Re-upload index.html with no-cache
aws s3 cp dist/index.html s3://aiuteur-frontend/index.html \
  --cache-control "public, max-age=0, must-revalidate" \
  --content-type "text/html"

# Invalidate CloudFront cache (so users get new index.html immediately)
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"

echo "Frontend deployed. CloudFront cache invalidated."
```

> **Cache invalidation** costs $0.005 per path after the first 1,000 free invalidations per month. Invalidating `/*` counts as 1 path.

---

## Option B: AWS Amplify Hosting (Simpler)

Amplify Hosting connects to your GitHub repo and auto-deploys on every push to `main`.

### B1. Go to AWS Amplify Console

1. Search **AWS Amplify** in the console → click **Amplify Hosting**
2. Click **Deploy an app** → **GitHub**
3. Authorize AWS Amplify to access your GitHub account
4. Select the `wizardirector` repository
5. Select the branch: `main`

### B2. Configure Build Settings

Amplify will auto-detect Vite. Review the build configuration:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

### B3. Add Environment Variables

In the Amplify Console → App Settings → Environment variables, add:
```
VITE_API_BASE_URL = http://your-alb-dns
VITE_COGNITO_USER_POOL_ID = us-east-1_XXXXXXXXX
VITE_COGNITO_APP_CLIENT_ID = xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### B4. Configure SPA Redirects (Critical for React Router)

In Amplify Console → Rewrites and Redirects → Add rule:
```
Source:  </^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>
Target:  /index.html
Type:    200 (Rewrite)
```

This ensures React Router handles all routes (not 404 on page refresh).

### B5. Deploy

Click **Save and Deploy**. Amplify will build and deploy. Note the generated URL:
```
https://main.d1234abcd.amplifyapp.com
```

---

## Step 2: Update CORS on the Backend

Now that the frontend has a permanent URL (CloudFront or Amplify), update the backend CORS config to only allow your frontend origin:

In `backend/src/server.ts` (or wherever CORS is configured), update:

```typescript
// Before (likely allows all origins during development):
app.use(cors());

// After (restrict to frontend domain):
app.use(cors({
  origin: [
    'https://d1234abcd567ef.cloudfront.net',  // CloudFront URL
    'http://localhost:5173',  // Local development
  ],
  credentials: true,
}));
```

Rebuild and redeploy the backend after this change.

---

## Optional: Connect a Custom Domain

If you have a domain (e.g., `aiuteur.app`):

### For CloudFront:
1. Go to ACM (AWS Certificate Manager) → **Request certificate**
2. Add your domain: `aiuteur.app` and `www.aiuteur.app`
3. Validate via DNS (add CNAME records to your DNS provider)
4. Go to CloudFront → your distribution → **General** → **Edit**
5. Add `aiuteur.app` to **Alternate domain names (CNAMEs)**
6. Select your ACM certificate
7. In your DNS provider, add a CNAME: `aiuteur.app → d1234abcd567ef.cloudfront.net`

### For Amplify:
1. In Amplify Console → Domain management → Add domain
2. Follow the wizard to validate ownership and connect

---

## Phase 5 Checklist

**If using S3 + CloudFront:**
- [ ] `aiuteur-frontend` S3 bucket created (private)
- [ ] `npm run build` succeeded, `dist/` folder populated
- [ ] Files synced to S3 with correct cache headers
- [ ] CloudFront Origin Access Control (OAC) created
- [ ] CloudFront distribution created with 404→index.html rule
- [ ] S3 bucket policy updated to allow CloudFront OAC
- [ ] CloudFront distribution status: Deployed
- [ ] `https://YOUR_CLOUDFRONT_DOMAIN` loads the app
- [ ] Navigating to a deep URL (e.g., `/project/123`) works (no 404)

**If using Amplify:**
- [ ] Amplify app connected to GitHub repo
- [ ] Build settings configured
- [ ] Environment variables added
- [ ] SPA redirect rule added
- [ ] Amplify deployment succeeded
- [ ] App loads at Amplify URL

**Both:**
- [ ] Backend CORS updated to allow frontend URL
- [ ] Full app flow verified (login, project creation, pipeline navigation)
- [ ] Custom domain configured (optional)

---

## Next Step

Proceed to **Phase 6:** [07-decommission-supabase.md](./07-decommission-supabase.md)
