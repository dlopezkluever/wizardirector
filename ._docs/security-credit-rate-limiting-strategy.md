# Security, Credit & Rate Limiting Strategy

## **1\. Core Principle for Stage 12**

Stage 12 is the **first point in the pipeline where marginal cost is non-trivial**. Therefore:

* No external video API call is ever made without:

  1. A **credit lock**

  2. A **render budget**

  3. A **hard execution ceiling**

If any of those fail, the render does not start.

---

## **2\. Gatekeeper Service (Pre-Render Authorization)**

### **2.1 Gatekeeper Responsibility**

The Gatekeeper sits **between the orchestration engine and external render providers (Veo3, Sora2, Nano Banana, ComfyUI)**.

It answers one question only:

“Is this render allowed to start, and under what constraints?”

### **2.2 Gatekeeper Inputs**

When Stage 12 is requested, the orchestration engine must submit:

`{`  
  `"user_id": "uuid",`  
  `"project_id": "uuid",`  
  `"stage": 12,`  
  `"provider": "veo3",`  
  `"estimated_cost": {`  
    `"credits": 42,`  
    `"usd_estimate": 3.80`  
  `},`  
  `"render_plan": {`  
    `"shot_count": 18,`  
    `"max_variations_per_shot": 2,`  
    `"max_retries": 1,`  
    `"mode": "quality"`  
  `}`  
`}`

This estimate is computed earlier in the pipeline using your existing **speed vs cost** abstraction.

---

### **2.3 Credit Check and Locking Logic**

**Step 1: Check balance**

* Query `user_credits.available`

* If `available < estimated_cost.credits`, return **402 Render Blocked**

**Step 2: Create a Credit Lock**

* Deduct credits *temporarily* into a `locked_credits` bucket

* Lock TTL: **30 minutes** (configurable)

`credits_available -= estimated`  
`credits_locked += estimated`

**Step 3: Issue Render Authorization Token**

* Short-lived JWT or signed token

* Contains:

  * `render_id`

  * `max_cost`

  * `max_calls`

  * `expiry`

This token is **required** to call any provider adapter.

---

### **2.4 Why Lock Instead of Immediate Burn**

* Prevents double-spend when async callbacks arrive late

* Allows partial refunds if render aborts early

* Protects against agent crashes mid-render

This mirrors cloud-billing “reservation then settle” models.

---

## **3\. Credit Settlement (Post-Render)**

When Stage 12 completes (success or failure):

### **Success**

* Actual cost is reconciled

* Difference is refunded if estimate was high

`credits_locked -= estimated`  
`credits_spent += actual`  
`credits_available += (estimated - actual)`

### **Failure / Abort**

* If no external frames were rendered, **full refund**

* If partial output exists, burn proportional credits

This logic is triggered by your **Asynchronous Notification Service** (already defined in your Stage 12 API contract).

---

## **4\. Secure API Key Management (Veo3, Sora2, etc.)**

### **4.1 Non-Negotiable Rules**

* **Never stored in code**

* **Never exposed to the browser**

* **Never logged**

### **4.2 Storage Strategy (Aligned With Your Stack)**

Based on your stack assumptions:

**Primary**

* Cloud Secret Manager (AWS Secrets Manager / GCP Secret Manager / Fly.io secrets)

**Access Pattern**

* Only the **Provider Adapter layer** can access secrets

* Secrets injected at runtime via environment variables

* Rotated without redeploy

Example (conceptual):

`VEO3_API_KEY=***runtime-injected***`

### **4.3 Adapter-Level Isolation**

Each provider has:

* Its own adapter

* Its own API key

* Its own rate limit counters

This prevents a bug in one provider path from leaking cost elsewhere.

---

## **5\. Rate Limiting and Infinite Loop Protection (Agentic Safety)**

This is critical for your **agentic shot-generation system**.

### **5.1 Three Hard Ceilings (All Mandatory)**

#### **A. Per-Render Call Ceiling**

Defined at Gatekeeper authorization:

`"limits": {`  
  `"max_provider_calls": 25`  
`}`

Once exceeded:

* Adapter refuses further calls

* Render aborts gracefully

#### **B. Per-Shot Retry Ceiling**

At the shot level:

* `max_variations_per_shot`

* `max_retries`

Once exceeded:

* Shot is marked “accepted best effort”

* Agent cannot re-enter that shot loop

#### **C. Global Render Time Ceiling**

* Wall-clock timeout per render

* Example: **12 minutes**

* Enforced by orchestrator watchdog

---

### **5.2 Loop Detection Heuristic**

In addition to hard limits, add a **semantic loop breaker**:

* Hash `(prompt + model + params)`

* If identical request occurs more than `N` times:

  * Abort render

  * Flag as agent loop

This protects against subtle logic bugs where retries are not technically “retries”.

---

## **6\. Provider Rate Limiting (Cost Protection)**

Even if providers allow high throughput, you should not.

### **Recommended Defaults**

| Scope | Limit |
| ----- | ----- |
| Per user | 1 active Stage 12 render |
| Per project | 2 renders / hour |
| Per provider | 60 calls / minute |
| System-wide | Configurable kill switch |

All enforced **before** provider adapter invocation.

---

## **7\. Kill Switches and Emergency Controls**

You should have **three kill switches**:

1. **Global Stage 12 Disable**

   * Instantly blocks all new renders

2. **Provider-Specific Disable**

   * Example: Veo3 outage or cost spike

3. **User-Level Freeze**

   * Suspicious activity

   * Abuse

   * Payment issues

These are config-based, not code changes.

---

## **8\. Observability and Audit Trail**

Every Stage 12 render must emit:

* Credit estimate

* Credit locked

* Credit spent

* Provider calls count

* Abort reason (if any)

Stored immutably for:

* Cost analysis

* User disputes

* Debugging agent behavior

