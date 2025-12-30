# API Integration & Async Contract

# For **Stage 12: Asynchronous Notification Service** in the Phase B Production Engine. 

Assumption: the project overview defines Stage 12 as the convergence point where long running external video or audio renders finalize and notify our system.

I will keep this vendor neutral but show how Nano Banana, Veo3, Sora2, ComfyUI, and ElevenLabs plug into the same contract.

## **1\. Purpose of Stage 12**

Stage 12 exists to solve three problems:

1. External renders are slow, expensive, and unreliable.

2. We need a single normalized signal when a render is done.

3. We must support cheap local development without calling paid APIs.

Stage 12 is an **Asynchronous Notification Service** that receives completion callbacks, validates them, updates internal state, and triggers downstream pipeline stages.

---

## **2\. High Level Flow**

1. Stage 7 to 11 submits a render job to an external provider.

2. Provider returns a `provider_job_id`.

3. We register that job in our system with status `RENDERING`.

4. Provider later calls our webhook when the render finishes or fails.

5. Stage 12 processes the webhook, normalizes the response, and emits an internal `RENDER_COMPLETED` or `RENDER_FAILED` event.

---

## **3\. Unified Webhook Endpoint**

All providers call the same endpoint.

`POST /api/webhooks/render-complete`

### **Required Headers**

`Content-Type: application/json`  
`X-Provider-Name: nano-banana | veo3 | sora2 | comfyui | elevenlabs`  
`X-Signature: <provider-specific HMAC or token>`  
`X-Request-ID: <uuid>`

Signature validation is adapter based per provider.

---

## **4\. Canonical Webhook Payload**

Every provider adapter must transform incoming payloads into this internal structure before processing.

`{`  
  `"provider": "sora2",`  
  `"provider_job_id": "job_9f23a",`  
  `"internal_job_id": "render_3c81e",`  
  `"status": "SUCCEEDED",`  
  `"asset_type": "video",`  
  `"output": {`  
    `"primary_url": "https://cdn.provider.com/renders/video.mp4",`  
    `"thumbnail_url": "https://cdn.provider.com/renders/thumb.jpg",`  
    `"duration_seconds": 14.2,`  
    `"resolution": "1920x1080",`  
    `"codec": "h264"`  
  `},`  
  `"cost": {`  
    `"credits_used": 42,`  
    `"usd_estimate": 1.26`  
  `},`  
  `"timestamps": {`  
    `"submitted_at": "2025-01-10T18:21:44Z",`  
    `"completed_at": "2025-01-10T18:24:09Z"`  
  `},`  
  `"error": null,`  
  `"raw_provider_payload": {}`  
`}`

### **Status Enum**

`SUCCEEDED`  
`FAILED`  
`CANCELLED`  
`TIMEOUT`

---

## **5\. Provider Specific Notes**

### **Nano Banana**

* Usually image to video or stylized clips

* Often returns multiple variants

* Adapter selects primary output based on project rules

### **Veo3**

* Long render times

* Must tolerate webhook delays up to 30 minutes

* Often returns progressive URLs

### **Sora2**

* Most structured payload

* High reliability

* Supports partial progress callbacks but we only ingest terminal events

### **ComfyUI**

* Self hosted

* Webhook sent by our own worker

* Signature validation optional in internal environments

### **ElevenLabs**

* Audio only

* `asset_type` is `audio`

* `output.primary_url` points to wav or mp3

---

## **6\. Timeout Handling Strategy**

Timeouts are handled in two layers.

### **Layer 1: Provider SLA Timeout**

When a job is submitted we store:

`expected_completion_deadline = submitted_at + provider_timeout_window`

Example:

* Sora2: 20 minutes

* Veo3: 45 minutes

* ComfyUI: configurable

* ElevenLabs: 2 minutes

A background sweeper runs every 2 minutes.

If `now > expected_completion_deadline` and no webhook received:

`{`  
  `"status": "TIMEOUT",`  
  `"error": {`  
    `"code": "PROVIDER_TIMEOUT",`  
    `"message": "Render did not complete within expected window"`  
  `}`  
`}`

This emits a `RENDER_FAILED` internal event.

### **Layer 2: Webhook Delivery Timeout**

If the provider retries webhooks:

* We respond `200 OK` immediately after validation.

* Downstream failures do not cause webhook rejection.

* Idempotency enforced via `provider_job_id`.

---

## **7\. Webhook Response Contract**

We always respond quickly.

### **Success**

`{`  
  `"acknowledged": true,`  
  `"internal_job_id": "render_3c81e"`  
`}`

### **Invalid Signature**

`HTTP 401`

`{`  
  `"acknowledged": false,`  
  `"error": "INVALID_SIGNATURE"`  
`}`

### **Unknown Job ID**

`HTTP 404`

`{`  
  `"acknowledged": false,`  
  `"error": "UNKNOWN_JOB"`  
`}`

---

## **8\. Idempotency Rules**

* `provider_job_id` is globally unique per provider.

* If a webhook arrives twice:

  * First one updates state.

  * Second one is acknowledged but ignored.

---

## **9\. Mock Response Formats for Development**

To save costs, Stage 12 supports a **Mock Provider Mode**.

Enabled via:

`RENDER_PROVIDER_MODE=mock`

### **Mock Completion Payload**

`{`  
  `"provider": "mock",`  
  `"provider_job_id": "mock_job_123",`  
  `"internal_job_id": "render_mock_001",`  
  `"status": "SUCCEEDED",`  
  `"asset_type": "video",`  
  `"output": {`  
    `"primary_url": "https://mock.local/video.mp4",`  
    `"thumbnail_url": "https://mock.local/thumb.jpg",`  
    `"duration_seconds": 10,`  
    `"resolution": "1280x720",`  
    `"codec": "h264"`  
  `},`  
  `"cost": {`  
    `"credits_used": 0,`  
    `"usd_estimate": 0`  
  `},`  
  `"timestamps": {`  
    `"submitted_at": "2025-01-10T18:21:44Z",`  
    `"completed_at": "2025-01-10T18:21:46Z"`  
  `},`  
  `"error": null,`  
  `"raw_provider_payload": {}`  
`}`

### **Mock Failure Payload**

`{`  
  `"provider": "mock",`  
  `"provider_job_id": "mock_job_124",`  
  `"internal_job_id": "render_mock_002",`  
  `"status": "FAILED",`  
  `"asset_type": "video",`  
  `"output": null,`  
  `"error": {`  
    `"code": "MOCK_FAILURE",`  
    `"message": "Simulated render failure"`  
  `}`  
`}`

### **Mock Timeout Simulation**

* No webhook is sent.

* Sweeper triggers `TIMEOUT` after 5 seconds.

---

## **10\. Internal Events Emitted by Stage 12**

These are what the rest of the Phase B engine consumes.

### **Render Completed**

`EVENT: RENDER_COMPLETED`  
`payload: canonical webhook payload`

### **Render Failed**

`EVENT: RENDER_FAILED`  
`payload: canonical webhook payload`

---

## **11\. Why This Design Fits Phase B**

* Vendor agnostic

* Async first

* Cheap to develop

* Deterministic internal state

* Easy to add new providers later

