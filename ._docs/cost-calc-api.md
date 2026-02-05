As of early 2026, the landscape for high-end AI video generation has shifted from credits toward a **pay-per-second** model for API usage, while consumer-facing "credits" are largely reserved for monthly subscriptions.

## **1. Google Gemini Veo 3 / 3.1**

On Vertex AI and the Gemini API (Google AI Studio), pricing is standardized by the second of generated content. Veo 3 and the newer Veo 3.1 are priced identically.

| Model Variant | API Price (Per Second) | 10-Second Clip Cost |
| --- | --- | --- |
| **Veo 3.1 Fast** | $0.15 | $1.50 |
| **Veo 3.1 (Standard)** | $0.40 | $4.00 |
| **Veo 3 (Standard)** | $0.40 | $4.00 |

* **Vertex AI Benefit:** For enterprise users, Vertex AI allows for **Batch Video Generation**, which typically offers a **50% discount** compared to real-time API calls.
* **Audio:** These prices generally include the native audio generation (sound effects and dialogue) synchronized with the video.

---

## **2. OpenAI Sora (Sora 2)**

OpenAI officially moved Sora out of preview in late 2025. It uses a tiered system based on resolution and "Pro" vs. "Standard" quality.

| Model Variant | Resolution | Price (Per Second) | 10-Second Clip Cost |
| --- | --- | --- | --- |
| **Sora 2 (Standard)** | 720p | $0.10 | $1.00 |
| **Sora 2 Pro** | 720p | $0.30 | $3.00 |
| **Sora 2 Pro** | 1080p+ | $0.50 | $5.00 |

* **The "Credit" Alternative:** If you are looking for a credit-based system rather than pure pay-as-you-go, OpenAI’s **ChatGPT Pro subscription ($200/month)** includes **10,000 monthly credits**.
* **480p:** 4 credits/sec
* **720p:** 16 credits/sec
* **1080p:** 40 credits/sec



---

### **Quick Comparison: 1-Minute of 1080p Video**

* **Gemini Veo 3.1:** $24.00
* **OpenAI Sora 2 Pro:** $30.00

> [!TIP]
> **Pro Move:** If you're doing heavy prototyping, Google's **Veo 3.1 Fast** is currently the best value for high-quality production tests, coming in at nearly 1/3 the cost of Sora 2 Pro.

Would you like me to help you calculate a monthly budget based on your expected video volume?


In 2026, the "Flash" tier is the primary way Google achieves ultra-low pricing. For image generation, "Flash" pricing is handled in two distinct ways: using the **multimodal Gemini Flash** models (which generate images as part of a chat) or using the **Imagen 4 Fast** dedicated model.

### **1. Gemini Flash (Multimodal Output)**

The latest **Gemini 3 Flash** and **Gemini 2.5 Flash** models generate images by calculating the output as "tokens." This is significantly cheaper for high-volume apps because you aren't paying a "per-image" premium; you are paying for the data generated.

| Model Variant | Output Price (per 1M tokens) | Estimated Cost Per Image |
| --- | --- | --- |
| **Gemini 3 Flash** | $3.00 | **~$0.0039** |
| **Gemini 2.5 Flash** | $0.60 | **~$0.0008** |
| **Gemini 2.5 Flash-Lite** | $0.40 | **~$0.0005** |

* **How the math works:** A standard  image is typically calculated as roughly **1,290 tokens**.
* **The Bottom Line:** Using **Gemini 2.5 Flash-Lite**, you can generate **2,000 images for $1.00**.

---

### **2. Imagen 4 Fast (Dedicated API)**

If you are using the specific `imagen` endpoint on Vertex AI rather than the Gemini chat API, you pay a flat rate per image. While slightly more expensive than the "Lite" token method, it offers more consistent aesthetic quality and specific editing tools (like outpainting).

* **Imagen 4 Fast:** **$0.02 per image**
* **Imagen 4 Standard:** **$0.04 per image**

---

### **3. Which one should you use?**

* **Use Gemini 2.5 Flash-Lite** if you need the **absolute lowest price** and are generating images for utility, UI mocks, or internal thumbnails where "good enough" is the target.
* **Use Imagen 4 Fast** if you need **speed + high aesthetic quality**. It is optimized to be faster than the multimodal models while maintaining a "designer" look.

### **Summary Comparison**

| Task | Model | Cost per 1,000 Images |
| --- | --- | --- |
| **Budget Utility** | Gemini 2.5 Flash-Lite | $0.52 |
| **Performance/Speed** | Gemini 3 Flash | $3.90 |
| **High-Quality Fast** | Imagen 4 Fast | $20.00 |
| **Premium Creative** | Imagen 4 Ultra | $60.00 |

> [!NOTE]
> These rates apply to the **Paid Tier**. Google AI Studio still offers a **Free Tier** for Flash models that allows for limited image generation at no cost, though your data may be used to improve their products in that tier.

In the world of the Gemini API (Google AI Studio/Vertex AI), "Flash" refers to the model family designed for speed and low cost. While **Gemini 1.5 Flash** was the pioneer, it has been largely superseded by the **Gemini 2.5** and **Gemini 3** series in early 2026.

If you are looking for something "faster" or "cheaper" than the standard Flash models for image generation, you are likely thinking of the **"Lite"** or **"Fast"** variants.

### **1. The "Cheaper" Models: Flash-Lite and Fast**

There is no model officially called "Flash-1.5 Fast," but there are two models that fit your description:

* **Gemini 2.5 Flash-Lite:** This is currently the **cheapest** way to generate images via API. It uses a token-based billing system where an image costs roughly **$0.0005** (half a millicent). It is designed for high-volume, "utility" grade images (icons, simple UI, basic illustrations).
* **Imagen 4 Fast:** This is a **dedicated image model** (different from the Gemini chat models). It is faster than the multimodal Gemini models and has a flat rate of **$0.02 per image**. While more expensive than Flash-Lite, the artistic quality is significantly higher.

---

### **2. Gemini API Pricing Comparison (2026)**

When you generate an image through a multimodal model (like Gemini 3 Flash), it "bills" you based on the number of tokens the image occupies.

| Model Tier | Type | Effective Cost Per Image | Best Use Case |
| --- | --- | --- | --- |
| **Gemini 2.5 Flash-Lite** | Multimodal | **~$0.0005** | High-volume utility / internal tools. |
| **Gemini 3 Flash** | Multimodal | **~$0.0039** | Standard apps, social media bots. |
| **Imagen 4 Fast** | Dedicated | **$0.0200** | Production speed + high aesthetic quality. |
| **Imagen 4 Standard** | Dedicated | **$0.0400** | Professional creative assets. |

---

### **3. The "Free Tier" vs. "Paid Tier"**

The statement about your data being used to improve products is a standard part of the **Google AI Studio Free Tier** agreement. Here is the breakdown:

* **Free Tier (AI Studio):**
* **Cost:** $0.
* **Privacy:** Google **may** use your inputs and outputs to train/improve models. (Do not use this for sensitive or proprietary data).
* **Limits:** Usually capped (e.g., 250 requests per day for Flash models).


* **Paid Tier (Pay-as-you-go / Vertex AI):**
* **Cost:** Per-token or per-image (as shown in the table above).
* **Privacy:** Google **does not** use your data to train their models. This is the "Enterprise-ready" tier.
* **Limits:** Much higher, scalable rate limits.



### **The "Fast" confusion**

If you see **"Veo 3.1 Fast"** mentioned, that is for **video** generation, not images. For images, if you want the "fastest" model that still looks like a professional photograph, **Imagen 4 Fast** is the one to use.

Would you like me to show you the specific API parameter to switch between the "Lite" and "Standard" versions in your code?