##  *Must Do Pre-Polish*:

 The entire codebase uses getPublicUrl() exclusively - zero uses of createSignedUrl(). Every bucket (asset-images, style capsules, and now videos) works the same way: upload → store the public URL in the database → frontend renders it directly via <img src> or <video src>.     

  Would making them private break things? Yes, immediately. Every stored image_key_url, image_url, public_url in the database is a direct public URL. The frontend loads these in image/video tags. The Veo3 provider also fetches start/end frame images from these URLs to
  base64-encode them for the API call. All of that would 403.

  To go private, you'd need to:
  1. Switch all getPublicUrl() calls to createSignedUrl() with a time-limited expiry
  2. Store storage paths in the DB instead of full URLs
  3. Add a backend endpoint like GET /api/storage/signed-url?path=... that generates signed URLs on demand (behind your authenticateUser middleware)
  4. Update all frontend image/video rendering to request signed URLs through your authenticated API first

  That's a meaningful refactor across ~15+ call sites. It's doable but not trivial.

  Is it a real risk right now? The URLs are unguessable (UUIDs in paths), but anyone who has a URL can access the file without auth. For a production app with user content, signed URLs are the right move eventually. For development/testing, public buckets are fine.

  Want me to make this refactor now, or is this something to tackle later? If later, I'll just make sure the new videos bucket follows the same pattern as existing buckets so it's consistent.



## **Future Improvement**

We need to allow voice cloning insertion OR the ability for the USER to use thier voice recording FOR each video generation; like have the characters mouths be matching to the entering in audio/voice recording of dialouge. 

Especially if User goes off script (thinks of somethign funnier in recording) the video should try to match it.

"That is one Bulging Banana!" Character "mouths/lip-it" it perfectly timed to the audio, WITH the same underlying emotion "Excited" / "Neutral" / "Bored" / "Happy" / "Over-joyed" / "Terrified" .. etc. etc. 

---

## **New Mode Called - Super Spec'd Out.

Where you have Character descriptions already
You have a detailed plot summary, treatment, 

Maybe the move will be like a form of sort, where you can add a file and add a label for it *Character DescriptionS*; *Treatment*; *Script*; *Beat-Sheet*; *Shot Description*/ *Visual Style Description*/

## *Integrate Sora & other video*; revolves around adding settings in the pipleine that tailor the UI & the context/prompting with the system to be tailor for how SORA generates video



(allow for audio recording submission of ideas)

---
*   **Artifact Vault revised:** The utility of the "artifact bolt" should be reconsidered if style capsules are functioning effectively.



"Like the master mode; lets see ai cook.. well then why not just use manus or something? *NOT OUT SCOPE*

"Then we should maybe consider having a mode to really fly through, espeically if you on your own t  We need to get an option for a much more structured input; these are for the expert users, what they enter will then be chaneeled through the pipeline and allow for the skiping of the step by step; like so good