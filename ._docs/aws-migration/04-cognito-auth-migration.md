# Phase 3: Cognito Auth Migration

> **Prerequisites:** Phases 0, 1, and 2 complete (AWS account, S3, RDS).
> **Time:** 6-8 hours
> **Risk:** High — this touches every authenticated request. Test thoroughly.
> **Rollback:** Revert `auth-store.ts` and `middleware/auth.ts`, redeploy (~1-2 hours)

This is the hardest phase. We're replacing Supabase Auth with Amazon Cognito across:
- Frontend: sign up, sign in, sign out, session management (`src/lib/stores/auth-store.ts`)
- Frontend services: how the JWT token is retrieved for API calls
- Backend middleware: how JWTs are verified (`backend/src/middleware/auth.ts`)
- Existing users: export from Supabase, import to Cognito

After this phase, Supabase is no longer used at all. The subscription can be cancelled.

---

## Understanding the Auth Flow Change

### Current Flow (Supabase Auth)
```
1. User calls supabase.auth.signInWithPassword({ email, password })
2. Supabase returns a JWT access token (signed with Supabase's private key)
3. Frontend stores token in localStorage via Zustand persist
4. API calls include: Authorization: Bearer {supabase_jwt}
5. Backend calls supabase.auth.getUser(token) → Supabase validates and returns user
6. user.id (UUID) attached to request
```

### New Flow (Cognito)
```
1. User calls Auth.signIn({ username: email, password })
2. Cognito returns an ID token + Access token (both are JWTs signed with Cognito's keys)
3. Frontend stores tokens in localStorage (Amplify handles this automatically)
4. API calls include: Authorization: Bearer {cognito_id_token}
5. Backend fetches Cognito's public JWKS, verifies JWT signature locally (no network call needed)
6. token.sub (UUID-format Cognito user ID) attached to request
```

**Key difference:** Backend no longer calls Supabase to verify tokens — it verifies the JWT signature directly using Cognito's public keys (JWKS). This is faster and removes the Supabase dependency from the backend entirely.

---

## Step 1: Create a Cognito User Pool

### 1a. Via AWS Console (Recommended for Beginners)

1. Go to AWS Console → search **Cognito** → **Amazon Cognito**
2. Click **Create user pool**

**Step 1 — Authentication providers:**
- Sign-in options: check **Email**
- Click **Next**

**Step 2 — Security requirements:**
- Password policy: **Cognito defaults** (8 chars minimum, uppercase, lowercase, number, special char)
- MFA: **No MFA** (for simplicity — add later if needed)
- Click **Next**

**Step 3 — Sign-up experience:**
- Self-registration: **Enable** (let users sign up)
- Required attributes: add **email** (already there), no others needed
- Click **Next**

**Step 4 — Message delivery:**
- Email provider: **Send email with Cognito** (free for up to 50 emails/day)
- Click **Next**

**Step 5 — Integrate your app:**
- User pool name: `aiuteur-users`
- Hosted UI: **Don't use hosted UI** (we have our own login page)
- App type: **Public client** (SPA — no client secret)
- App client name: `aiuteur-web`
- Client secret: **Don't generate** (SPAs can't keep secrets)
- Click **Next**

**Step 6 — Review and create:**
- Review settings → **Create user pool**

### 1b. Note Your IDs

After creation, note these values from the Cognito console:
```
User Pool ID:  us-east-1_XXXXXXXXX
App Client ID: xxxxxxxxxxxxxxxxxxxxxxxxxx
```

These are NOT secrets — they're safe to include in frontend code.

---

## Step 2: Install Amplify Auth in the Frontend

AWS Amplify provides a React-compatible auth library that handles token storage, refresh, and session management.

```bash
cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector"
npm install aws-amplify
```

> **Why Amplify?** It handles token refresh automatically (same as Supabase's `autoRefreshToken: true`), stores tokens in localStorage (same as Supabase's `persistSession: true`), and provides React hooks and listeners for auth state changes.

---

## Step 3: Create the Cognito Client Config

Create `src/lib/cognito.ts`:

```typescript
import { Amplify } from 'aws-amplify';

const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const userPoolClientId = import.meta.env.VITE_COGNITO_APP_CLIENT_ID;

if (!userPoolId || !userPoolClientId) {
  throw new Error('VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_APP_CLIENT_ID are required');
}

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
      loginWith: {
        email: true,
      },
    },
  },
});

export { userPoolId, userPoolClientId };
```

Import this in `src/main.tsx` before anything else:
```typescript
import './lib/cognito'; // Initialize Amplify/Cognito config
```

---

## Step 4: Update Frontend Environment Variables

Add to `.env` (and `.env.example`):
```env
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Step 5: Rewrite `src/lib/stores/auth-store.ts`

This is a full rewrite. The Amplify Auth API closely mirrors Supabase Auth, so the structure stays the same — only the underlying calls change.

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  fetchAuthSession,
  Hub,
  type AuthUser,
} from 'aws-amplify/auth';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  // Actions
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  getSession: () => Promise<string | null>; // Returns JWT token
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,

      signUp: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          await signUp({
            username: email,
            password,
            options: { userAttributes: { email } },
          });
          // Note: User needs to confirm email before sign-in
          set({ isLoading: false });
        } catch (err: unknown) {
          const error = err instanceof Error ? err.message : 'Sign up failed';
          set({ isLoading: false, error });
          throw err;
        }
      },

      signIn: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          await signIn({ username: email, password });
          const user = await getCurrentUser();
          set({ user, isLoading: false });
        } catch (err: unknown) {
          const error = err instanceof Error ? err.message : 'Sign in failed';
          set({ isLoading: false, error });
          throw err;
        }
      },

      signOut: async () => {
        set({ isLoading: true });
        try {
          await signOut();
          set({ user: null, isLoading: false });
        } catch (err: unknown) {
          const error = err instanceof Error ? err.message : 'Sign out failed';
          set({ isLoading: false, error });
          throw err;
        }
      },

      getSession: async () => {
        try {
          const session = await fetchAuthSession();
          return session.tokens?.idToken?.toString() ?? null;
        } catch {
          return null;
        }
      },

      initialize: async () => {
        set({ isLoading: true });
        try {
          const user = await getCurrentUser();
          set({ user, isLoading: false });
        } catch {
          // Not signed in — that's fine
          set({ user: null, isLoading: false });
        }

        // Listen for auth state changes (replaces supabase.auth.onAuthStateChange)
        Hub.listen('auth', ({ payload }) => {
          switch (payload.event) {
            case 'signedIn':
              getCurrentUser().then((user) => set({ user }));
              break;
            case 'signedOut':
              set({ user: null });
              break;
            case 'tokenRefresh':
              // Token refreshed automatically — no action needed
              break;
          }
        });
      },
    }),
    {
      name: 'aiuteur-auth',
      partialize: (state) => ({ user: state.user }), // Only persist user, not loading/error
    }
  )
);
```

---

## Step 6: Update `getAuthHeaders()` in All Frontend Services

Every service in `src/lib/services/` has a `getAuthHeaders()` function that currently calls `supabase.auth.getSession()`. Update each to use `fetchAuthSession` from Amplify instead.

**Pattern — change in every service file:**

```typescript
// Before (in every service file):
import { supabase } from '../supabase';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${session.access_token}` };
}

// After (same pattern, different import):
import { fetchAuthSession } from 'aws-amplify/auth';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (!token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${token}` };
}
```

**Files to update:**
- `src/lib/services/projectService.ts`
- `src/lib/services/sceneService.ts`
- `src/lib/services/imageService.ts`
- `src/lib/services/styleCapsuleService.ts`
- `src/lib/services/checkoutService.ts`
- Any other service files with `getAuthHeaders()`

After updating all services, you can safely delete or empty `src/lib/supabase.ts`.

---

## Step 7: Update Email Confirmation Flow

Supabase sends a confirmation email on sign-up automatically. Cognito does too, but the user enters a **6-digit code** (not clicks a link). Your sign-up UI needs to handle this:

After `signUp()` succeeds, show a "Enter your confirmation code" input and call:

```typescript
import { confirmSignUp } from 'aws-amplify/auth';

await confirmSignUp({
  username: email,
  confirmationCode: codeFromUser, // The 6-digit code from their email
});
```

Then the user can sign in.

---

## Step 8: Update the Backend Auth Middleware

Replace `backend/src/middleware/auth.ts` entirely. The new version verifies Cognito JWTs locally using the public JWKS endpoint — no Supabase call needed.

Install `jose` (JWT verification library):
```bash
cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend"
npm install jose
```

New `backend/src/middleware/auth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

if (!USER_POOL_ID) {
  throw new Error('COGNITO_USER_POOL_ID environment variable is required');
}

// Cognito publishes its public keys at this well-known URL
// jose will fetch and cache these keys automatically
const JWKS_URL = `https://cognito-idp.${AWS_REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`;
const JWKS = createRemoteJWKSet(new URL(JWKS_URL));

export async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://cognito-idp.${AWS_REGION}.amazonaws.com/${USER_POOL_ID}`,
    });

    // 'sub' is the Cognito user ID (UUID format, like Supabase user IDs)
    // 'email' is available if the ID token is used (we use ID token, not access token)
    req.user = {
      id: payload.sub as string,
      email: payload.email as string,
    };

    next();
  } catch (err) {
    console.error('Auth error:', err instanceof Error ? err.message : err);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

Add to `backend/.env`:
```env
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
```

---

## Step 9: Handle User ID Mapping (Critical)

After Cognito migration, users' IDs change from Supabase UUIDs to Cognito `sub` values (which are also UUIDs, but different ones).

All existing data in the database has `user_id` columns pointing to Supabase UUIDs. After migrating users to Cognito, their Cognito `sub` will be different.

**Strategy A: Accept new IDs, migrate data (recommended if few users)**

1. Export Supabase auth users with their IDs
2. Import to Cognito (they get new `sub` values)
3. Build a mapping table: `supabase_user_id → cognito_sub`
4. Run SQL UPDATE to repoint all `user_id` columns to the new Cognito `sub`

**Strategy B: Use email as the stable identifier during transition**

If you have a small number of users (e.g., just yourself during dev), simply:
1. Note your Supabase user UUID
2. Sign up in Cognito with the same email
3. Note your new Cognito `sub` UUID
4. Run SQL to update all your data to the new UUID

```sql
-- Example: Update all records from old Supabase user ID to new Cognito sub
-- Run this in your RDS database (psql or any PostgreSQL client)
UPDATE projects SET user_id = 'new-cognito-sub-uuid' WHERE user_id = 'old-supabase-uuid';
UPDATE global_assets SET user_id = 'new-cognito-sub-uuid' WHERE user_id = 'old-supabase-uuid';
UPDATE style_capsules SET user_id = 'new-cognito-sub-uuid' WHERE user_id = 'old-supabase-uuid';
UPDATE user_credits SET user_id = 'new-cognito-sub-uuid' WHERE user_id = 'old-supabase-uuid';
-- ... repeat for all user_id columns
```

---

## Step 10: Bulk Import Existing Users to Cognito (Multiple Users)

If you have many users, use Cognito's admin API to import them:

```bash
# Export users from Supabase (run in Supabase SQL Editor, download result)
# SELECT id, email, created_at FROM auth.users ORDER BY created_at;
```

Then for each user, use the AWS CLI to create them in Cognito:
```bash
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username "user@example.com" \
  --user-attributes Name=email,Value="user@example.com" Name=email_verified,Value=true \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS

# This creates the user with a temporary password — they'll be prompted to change it on first login
```

> **Important:** `SUPPRESS` prevents Cognito from sending a welcome email. Remove it if you want users to receive an invitation.

For bulk imports, write a script that loops over your user list and calls `admin-create-user` for each.

---

## Step 11: Lint and Test

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

## Step 12: End-to-End Auth Verification

1. Start the backend with `COGNITO_USER_POOL_ID` set
2. Start the frontend with `VITE_COGNITO_USER_POOL_ID` and `VITE_COGNITO_APP_CLIENT_ID` set
3. Test the full auth flow:
   - [ ] Sign up with new email → verify Cognito sends confirmation code
   - [ ] Enter confirmation code → account confirmed
   - [ ] Sign in → user appears in dashboard
   - [ ] Navigate to a project → loads data from RDS
   - [ ] Refresh page → session persists (Amplify stored tokens)
   - [ ] Sign out → user is signed out, localStorage cleared
   - [ ] Sign in again → works
4. Verify in Cognito console: User Pool → Users → user appears as CONFIRMED

---

## Phase 3 Rollback

If issues arise:
1. In `src/lib/stores/auth-store.ts` — revert to Supabase auth calls
2. In `src/lib/services/*.ts` — revert `getAuthHeaders()` to use `supabase.auth.getSession()`
3. In `backend/src/middleware/auth.ts` — revert to `supabase.auth.getUser(token)`
4. Redeploy frontend + backend

Users created only in Cognito during the migration period will not exist in Supabase and would need to re-register after rollback.

---

## Phase 3 Checklist

- [ ] Cognito User Pool `aiuteur-users` created
- [ ] User Pool ID and App Client ID noted
- [ ] `aws-amplify` installed in frontend
- [ ] `src/lib/cognito.ts` created with Amplify config
- [ ] `VITE_COGNITO_USER_POOL_ID` and `VITE_COGNITO_APP_CLIENT_ID` added to `.env`
- [ ] `src/lib/stores/auth-store.ts` rewritten for Cognito
- [ ] `getAuthHeaders()` updated in all frontend service files
- [ ] Email confirmation flow implemented in UI
- [ ] `jose` installed in backend
- [ ] `backend/src/middleware/auth.ts` rewritten for Cognito JWKS verification
- [ ] `COGNITO_USER_POOL_ID` added to `backend/.env`
- [ ] Existing users migrated (or user_id columns updated for dev)
- [ ] `src/lib/supabase.ts` removed/emptied
- [ ] `backend/src/config/supabase.ts` deleted
- [ ] `grep -r "supabase" src --include="*.ts" -l` returns zero results
- [ ] `grep -r "supabase" backend/src --include="*.ts" -l` returns zero results
- [ ] Lint passes (both)
- [ ] Tests pass (both)
- [ ] Full sign up → confirm → sign in → project load flow verified
- [ ] Session persists after page refresh

---

## Next Step

Proceed to **Phase 4:** [05-ecs-backend-deployment.md](./05-ecs-backend-deployment.md)

> At this point, Supabase is no longer used. You can optionally pause the Supabase project (not delete — just pause to stop billing) from the Supabase Dashboard → Settings → General → Pause project. Resume it if you need to roll back.
