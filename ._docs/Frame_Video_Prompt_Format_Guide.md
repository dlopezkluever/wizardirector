================================================================================
# 🎬 **META PROMPT VEO 3.1 GUIDE — FRAME-TO-VIDEO EDITION**
## *Professional Guide to Creating Split Frame + Video Prompts for Google Veo 3.1 / Flow*

**Version 4.0 — Frame-to-Video Architecture**
**Date Updated: February 2026**
**Compatibility: Designed for Veo 3.1 / Flow Frame-to-Video Pipeline**

================================================================================

## 📋 **VERSION HISTORY & MIGRATION NOTES**

### What's New in v4.0 — Frame-to-Video Split Architecture
- **Two-Prompt System**: All prompts are now split into a **Frame Prompt** (image gen) and a **Video Prompt** (video gen) with strict verbosity rules
- **Frame Prompts Own the Visuals**: All appearance, environment, lighting, composition, spatial relationships, and asset descriptions live exclusively in the frame prompt
- **Video Prompts Own the Motion**: Action, dialogue, camera movement, SFX, performance, and timing live exclusively in the video prompt
- **Verbosity Alignment**: Visual verbosity is explicitly discouraged in video prompts — the starting/ending frames already encode the visual truth
- **Updated for Veo 3.1**: Reflects current model capabilities including native audio generation
- **Flow Integration**: Workflow patterns for Google Flow filmmaking workspace

### Migration from v3.0
- **BREAKING**: The monolithic single-prompt format is replaced by a Frame Prompt + Video Prompt pair per shot
- **BREAKING**: Video prompts should NOT restate character appearance, environment details, lighting setup, or color palette — these are handled by the anchor frames
- **UPDATE**: Frame prompts absorb all visual description previously spread across the 5-part formula
- **UPDATE**: Video prompts are now lean action/audio directives

### Core Principle

> **Frame prompts define what the world LOOKS LIKE.**
> **Video prompts define what HAPPENS in that world.**
>
> If a detail is visible in a still image → it belongs in the frame prompt.
> If a detail only becomes apparent when you press play → it belongs in the video prompt.

================================================================================

## 📋 **TABLE OF CONTENTS**

### 🚀 **FUNDAMENTALS**
- [The Frame-to-Video Split](#the-frame-to-video-split)
- [Why Split Prompts Matter](#why-split-prompts-matter)
- [Veo 3.1 Technical Specifications](#veo-31-technical-specifications)

### 🖼️ **FRAME PROMPTS (Image Generation)**
- [Frame Prompt Formula](#frame-prompt-formula)
- [Character Development Framework](#character-development-framework)
- [Environment & Spatial Composition](#environment--spatial-composition)
- [Camera Position & Framing](#camera-position--framing)
- [Lighting, Color & Style](#lighting-color--style)

### 🎬 **VIDEO PROMPTS (Video Generation)**
- [Video Prompt Formula](#video-prompt-formula)
- [Action & Performance](#action--performance)
- [Dialogue & Voice](#dialogue--voice)
- [Camera Movement](#camera-movement)
- [Sound Design (SFX & Ambient)](#sound-design-sfx--ambient)

### 🛠️ **PUTTING IT TOGETHER**
- [Complete Shot Examples](#complete-shot-examples)
- [Multi-Shot Sequences](#multi-shot-sequences)
- [Verbosity Alignment Rules](#verbosity-alignment-rules)
- [Quality Assurance Protocols](#quality-assurance-protocols)

### 🚀 **ADVANCED TECHNIQUES**
- [Timestamp Prompting (Within Video Prompts)](#timestamp-prompting-within-video-prompts)
- [Reference Images & Ingredients to Video](#reference-images--ingredients-to-video)
- [Clip Extension Workflows](#clip-extension-workflows)
- [Troubleshooting & Optimization](#troubleshooting--optimization)

### 📖 **REFERENCE**
- [Domain-Specific Specialization](#domain-specific-specialization)
- [Best Practices Summary](#best-practices-summary)
- [Resources and References](#resources-and-references)

================================================================================

## 🔀 **THE FRAME-TO-VIDEO SPLIT**

In a frame-to-video pipeline, every shot is produced in two stages:

```
STAGE 1: FRAME GENERATION (Image Model)
   Frame Prompt → Starting Frame Image (+ optional Ending Frame Image)

STAGE 2: VIDEO GENERATION (Veo 3.1)
   Starting Frame + Video Prompt → Final Video Clip
   (or: Starting Frame + Ending Frame + Video Prompt → Final Video Clip)
```

This means your prompts must be **purpose-built for their stage**. A frame prompt talks to an image generator. A video prompt talks to a video generator that already has the image as its visual anchor.

### **What Goes Where**

| Element | Frame Prompt | Video Prompt |
|---------|:---:|:---:|
| Character appearance (face, hair, build, clothing) | ✅ | ❌ |
| Environment / set design | ✅ | ❌ |
| Props and objects in scene | ✅ | ❌ |
| Spatial relationships (who/what is where) | ✅ | ❌ |
| Camera position & framing (shot type, angle, lens) | ✅ | ❌ |
| Lighting setup & quality | ✅ | ❌ |
| Color palette & visual tone | ✅ | ❌ |
| Film style / aesthetic | ✅ | ❌ |
| Depth of field / bokeh | ✅ | ❌ |
| Weather / atmospheric visuals | ✅ | ❌ |
| **Action / movement** | ❌ | ✅ |
| **Dialogue & voice performance** | ❌ | ✅ |
| **Camera MOVEMENT (pan, tilt, dolly, etc.)** | ❌ | ✅ |
| **Sound effects** | ❌ | ✅ |
| **Ambient audio** | ❌ | ✅ |
| **Character behavior / emotional performance** | ❌ | ✅ |
| **Timing / pacing of events** | ❌ | ✅ |
| **Interactions between subjects** | ❌ | ✅ |

> ⚠️ **Verbosity Warning**: If your video prompt is describing what someone looks like, what the room looks like, or what the lighting is — you're putting visual weight in the wrong prompt. The frame already shows all of that. The video prompt just needs to say what *happens*.

================================================================================

## ⚡ **WHY SPLIT PROMPTS MATTER**

### **Single Prompt vs Split Prompt**

| Single Prompt (Old) | Split Frame + Video (New) |
|---------------------|--------------------------|
| ❌ Visual + action + audio crammed together | ✅ Visual truth locked in frame; motion described cleanly |
| ❌ Model must infer appearance AND action | ✅ Appearance is given; model focuses on motion |
| ❌ Verbose prompts dilute action clarity | ✅ Lean video prompts = better action adherence |
| ❌ Character drift across shots | ✅ Frame anchors lock visual identity |
| ❌ Inconsistent lighting/composition | ✅ Frame-level control over every visual element |

### **Key Advantages**

1. **Visual Precision**: Frame prompts give you pixel-level control over appearance before any motion begins
2. **Action Clarity**: Video prompts aren't bloated with description — the model focuses on what matters: motion and audio
3. **Consistency**: Starting frames act as visual anchors, drastically reducing drift between shots
4. **Iteration Speed**: Tweak visuals (frame prompt) independently from performance (video prompt)
5. **Audio Fidelity**: With visual noise removed, video prompts give clearer audio/dialogue direction

================================================================================

## 🎮 **VEO 3.1 TECHNICAL SPECIFICATIONS**

### **Core Generation Features (Verified January 2026)**

| Parameter | Options | Notes |
|-----------|---------|-------|
| **Duration** | 4, 6, or 8 seconds | Use 4-6s for complex action; 8s for atmospheric shots |
| **Resolution** | 720p or 1080p | 720p for iterations; 1080p for final output |
| **Aspect Ratio** | 16:9 or 9:16 | 16:9 for desktop/YouTube; 9:16 for Shorts/Reels/TikTok |
| **Frame Rate** | 24fps | Standard cinematic output |
| **Audio** | Native generation | Dialogue, SFX, ambient sound generated with video |
| **Reference Images** | Up to 3 | For character/object/style consistency |

### **Frame-to-Video Controls**

- **Image-to-Video**: Supply a starting frame image + video prompt → animated clip with audio
- **First and Last Frame**: Supply both start and end frame images + video prompt → controlled transition
- **Ingredients to Video**: Up to 3 reference images for consistency across shots
- **Clip Extension**: Extend previously generated clips to build longer sequences
- **Add/Remove Object**: Introduce or remove objects from generated video (uses Veo 2, no audio)

### **Known Limitations**

> **IMPORTANT**: Be aware of these constraints:
> - Complex multi-action scenes may fragment; use one major action per shot
> - Character identity can drift without consistent reference images or frame anchors
> - Exact lip-sync is not guaranteed; plan for VO alignment in post
> - Native audio may need replacement for brand work or precise dialogue
> - Hand and finger details may require attention in complex scenes

================================================================================

# 🖼️ FRAME PROMPTS — IMAGE GENERATION

================================================================================

## 🎯 **FRAME PROMPT FORMULA**

Frame prompts are used **exclusively for image generation** of starting and ending frames. They must be **visually verbose, asset-heavy, and spatially explicit**. They describe everything you'd see in a freeze frame.

### **Frame Prompt Structure**

```
[Camera Position & Framing] + [Subject Appearance] + [Spatial Placement & Pose] + [Environment & Props] + [Lighting, Color & Style]
```

Every element is a visual element. There is **no action, no dialogue, no sound, no movement** in a frame prompt.

### **Component Breakdown**

#### 1. **Camera Position & Framing** (where the camera IS, not where it's going)
- Shot type: extreme wide, wide, medium, medium close-up, close-up, extreme close-up
- Camera angle: eye-level, low-angle, high-angle, bird's-eye, Dutch angle, worm's-eye
- Lens characteristics: shallow depth of field, wide-angle distortion, fisheye, anamorphic
- Focal plane: what is sharp vs. soft

> 🚫 Do NOT include camera *movement* here (no "panning," "tracking," "dollying"). That's a video prompt element.

#### 2. **Subject Appearance**
Full physical description — as if you are briefing a casting director and costume designer:
- Age, gender presentation, ethnicity
- Hair: color, length, style, texture
- Face: distinctive features, expression frozen in this moment
- Build: height, body type
- Clothing: specific garments, colors, materials, fit, condition
- Accessories: jewelry, glasses, bags, weapons, tools
- Posture and body position (static — what the pose IS, not what they're doing)

#### 3. **Spatial Placement & Pose**
Where everything is in the frame:
- Subject's position (center frame, frame left, far background, etc.)
- Relationship to other subjects/objects
- Body orientation relative to camera (facing camera, profile, three-quarter, back to camera)
- Hand positions, head tilt, weight distribution
- Eye-line direction

#### 4. **Environment & Props**
Everything visible in the setting:
- Location type (interior/exterior, specific place)
- Architecture, furniture, surfaces, textures
- Props and objects (with positions noted)
- Weather and atmospheric visuals (fog, rain, dust motes, etc.)
- Time of day (as it affects visible light, not as a narrative beat)
- Background detail and depth layers (foreground, midground, background)

#### 5. **Lighting, Color & Style**
The complete visual aesthetic:
- Key light direction and quality (hard/soft, warm/cool)
- Fill light, rim light, practical lights in scene
- Color palette and dominant hues
- Contrast level (high contrast noir, low contrast pastel, etc.)
- Film stock / visual style (shot on 35mm, IMAX, vintage Polaroid, etc.)
- Overall mood conveyed through visuals alone
- Any specific post-processing look (desaturated, cross-processed, etc.)

---

### **Frame Prompt Example**

```
STARTING FRAME PROMPT:

Medium close-up, eye-level, shallow depth of field. A weary male detective 
in his late 50s, Caucasian, with deep-set grey eyes, a salt-and-pepper 
five-o'clock shadow, heavy bags under his eyes, and thinning grey hair 
combed back. He wears a rumpled beige trench coat over a loosened burgundy 
tie and wrinkled white dress shirt, top button undone. He sits behind a 
cluttered oak desk, leaning back slightly in a worn leather office chair, 
arms resting on the armrests, staring directly into camera with a flat, 
unreadable expression. 

On the desk: a half-empty glass of whiskey, a manila case folder, a rotary 
phone, scattered papers, an overflowing glass ashtray. Behind him, a rain-
streaked window shows the blurred neon glow of a city at night — pinks and 
blues reflected in the wet glass. The office is small, wood-paneled, with a 
single brass desk lamp casting warm amber light from frame right, leaving 
the left side of his face in soft shadow. Noir aesthetic, desaturated color 
palette with warm amber and cool blue accents, shot on 35mm film with 
subtle grain.
```

> Notice: no movement, no dialogue, no sound. This is a photograph — a frozen moment.

================================================================================

## 🎭 **CHARACTER DEVELOPMENT FRAMEWORK**

### **Character Consistency Template (For Frame Prompts)**

Use this identical block of text in every frame prompt where this character appears:

```
[NAME/ROLE], a [AGE] [ETHNICITY] [GENDER] with [HAIR: color, style, length, 
texture], [EYE_COLOR] eyes, [FACIAL_FEATURES: shape, distinguishing marks], 
[BUILD: height, body type], wearing [CLOTHING: specific garments, colors, 
materials, fit], [ACCESSORIES], [SKIN DETAILS: scars, tattoos, freckles, 
complexion]
```

### **Physical Attribute Checklist**

✅ **Essential for Frame Prompts:**
- Age and general appearance
- Gender presentation
- Hair: color, style, length, texture
- Eyes: color, shape, expression (for this frame)
- Facial features: distinctive characteristics, facial hair
- Build: height, weight, body type
- Skin: complexion, scars, tattoos, freckles
- Clothing: style, color, fit, material, condition
- Accessories: jewelry, glasses, bags, props held
- Posture (static position in this frame)
- Emotional expression frozen on face

### **Character Consistency Rules**

1. **Identical Descriptions**: Copy-paste the same character block into every frame prompt
2. **Reference Images**: Use 1-3 consistent reference images per character
3. **Wardrobe Lock**: Keep clothing and accessories identical across shots (unless a story-motivated change)
4. **Pose Similarity in References**: Keep poses similar in reference images to reduce drift
5. **Aspect Ratio Lock**: Do not switch between 16:9 and 9:16 mid-project

================================================================================

## 🏗️ **ENVIRONMENT & SPATIAL COMPOSITION**

### **Environment Description Checklist (For Frame Prompts)**

Every environment in a frame prompt should specify:

- **Location type**: interior/exterior, named or generic place
- **Architecture & structure**: walls, floors, ceilings, doors, windows, materials
- **Furniture & surfaces**: tables, chairs, counters, shelves — with materials and condition
- **Props & objects**: everything visible, with rough positions (foreground, desk, background shelf, etc.)
- **Depth layers**: what's in the foreground, midground, background
- **Atmospheric visuals**: dust motes in light, steam, rain on windows, fog, haze
- **Time of day**: as it manifests visually (golden hour glow, blue hour, midday sun, etc.)
- **Weather**: visible only (grey overcast sky, snow on windowsill, etc.)

### **Spatial Placement Language**

Use precise spatial language in frame prompts:

| Term | Meaning |
|------|---------|
| Frame left / frame right | Horizontal position |
| Foreground / midground / background | Depth position |
| Center frame | Dead center of composition |
| Facing camera / profile / three-quarter / back to camera | Subject orientation |
| Above / below frame line | Vertical position |
| Overlapping | One element partially occluding another |

================================================================================

## 📐 **CAMERA POSITION & FRAMING (Static)**

These are for frame prompts — they describe where the camera IS, not where it's going.

### **Shot Types**

| Shot Type | Framing | Use Case |
|-----------|---------|----------|
| Extreme Wide (EWS) | Full environment, subject small | Establishing location, scale |
| Wide Shot (WS) | Full body + environment | Context and spatial relationships |
| Medium Shot (MS) | Waist up | Dialogue scenes, character interaction |
| Medium Close-Up (MCU) | Chest up | Emotional connection with context |
| Close-Up (CU) | Head and shoulders | Emotion, intimacy |
| Extreme Close-Up (ECU) | Eyes / single detail | Intense emotion, important detail |

### **Camera Angles**

| Angle | Effect | Frame Prompt Example |
|-------|--------|---------------------|
| Eye-level | Neutral, relatable | "eye-level medium shot of..." |
| Low-angle | Powerful, imposing | "low-angle close-up looking up at..." |
| High-angle | Vulnerable, diminished | "high-angle wide shot looking down on..." |
| Bird's-eye | Overhead, map-like | "bird's-eye view of..." |
| Dutch angle | Unease, tension | "dutch angle medium shot of..." |
| Worm's-eye | Extreme power, towering | "worm's-eye view of..." |

### **Lens & Optical Effects (Static)**

- **Shallow depth of field**: Subject sharp, background/foreground soft bokeh
- **Deep focus**: Everything sharp front to back
- **Wide-angle lens**: Expanded field of view, slight barrel distortion at edges
- **Telephoto compression**: Flattened depth, subject isolated from background
- **Anamorphic**: Oval bokeh, horizontal lens flares, widescreen feel
- **Fisheye**: Extreme barrel distortion

> 🚫 **Rack focus** is a video prompt element (it involves *changing* focus over time).

================================================================================

## 🎨 **LIGHTING, COLOR & STYLE**

### **Lighting Description Framework (For Frame Prompts)**

Describe the complete lighting state:

- **Key light**: Direction (from left, overhead, behind), quality (hard/soft), color temperature (warm/cool)
- **Fill light**: How much shadow is lifted, from which direction
- **Rim/back light**: Edge separation from background
- **Practical lights**: Visible light sources (lamps, screens, candles, neon signs, windows)
- **Ambient/environmental**: Overall base illumination level

### **Color & Style Keywords**

| Category | Examples |
|----------|---------|
| **Color palette** | Warm amber and cool blue accents; muted earth tones; high-saturation neon |
| **Contrast** | High contrast chiaroscuro; low contrast flat lighting; crushed blacks |
| **Film stock** | Shot on 35mm film with subtle grain; clean digital; vintage Super 8 |
| **Aesthetic** | Noir, pastel, cyberpunk, naturalistic, dreamlike, gritty documentary |
| **Post-processing** | Desaturated, cross-processed, teal and orange grade, bleach bypass |

================================================================================

# 🎬 VIDEO PROMPTS — VIDEO GENERATION

================================================================================

## 🎯 **VIDEO PROMPT FORMULA**

Video prompts are used **exclusively for video generation** from anchor frames. They must be **lean, action-focused, and audio-specific**. They describe only what *happens* — because what everything *looks like* is already encoded in the starting (and optional ending) frame.

### **Video Prompt Structure**

```
[Camera Movement] + [Action / Performance] + [Dialogue] + [Sound Design]
```

That's it. No character descriptions. No environment descriptions. No lighting setup. No color palette. The frame handles all of that.

### **Component Breakdown**

#### 1. **Camera Movement** (how the camera MOVES, not where it is)
- Pan (horizontal rotation), tilt (vertical rotation)
- Dolly in/out (physical forward/backward movement)
- Truck left/right (horizontal travel)
- Crane up/down (vertical sweep)
- Arc (circular path around subject)
- Handheld (organic, shaky movement)
- Steadicam (smooth following movement)
- Static (no movement — camera holds)
- Rack focus (shift focus between planes)
- Zoom (in/out — optical, not physical movement)

#### 2. **Action / Performance**
What the subject DOES during the clip:
- Physical movement (walks, turns, reaches, collapses, etc.)
- Facial performance (expression changes, reactions)
- Gestures and body language shifts
- Interactions with other subjects or objects
- Emotional arc within the shot (e.g., "shifts from confidence to doubt")
- Pacing and intensity of movement

#### 3. **Dialogue**
What is spoken, and how:
- Exact words in quotation marks
- Speaker identification (if multiple characters)
- Voice quality: accent, tone, pitch, emotion, pace
- Delivery style (whispered, shouted, deadpan, trembling, etc.)
- Pauses and timing cues

#### 4. **Sound Design**
Everything you hear that isn't dialogue:
- **SFX**: Specific sounds tied to actions (door slam, gunshot, glass breaking, footsteps on gravel)
- **Ambient audio**: Environmental soundscape (rain, traffic, wind, crickets, crowd murmur)
- **Musical cues**: If relevant (swelling orchestral score, faint radio music, etc.)
- **Silence**: Explicitly note if a beat should be quiet

---

### **Video Prompt Example**

```
VIDEO PROMPT:

Static camera, no movement. The detective slowly leans forward, placing 
both hands flat on the desk. He exhales through his nose, then looks up 
and says in a low, gravelly voice with a New York accent: "Of all the 
offices in this town, you had to walk into mine." He holds eye contact 
for a beat, then glances down at the case file. 

SFX: The creak of leather as he leans forward, the soft clink of ice 
settling in the whiskey glass, muffled city rain against the window.
```

> Notice: no description of what the detective looks like, no description of the room, no mention of lighting or color. All of that is already in the starting frame. The video prompt only describes what HAPPENS.

================================================================================

## 🏃 **ACTION & PERFORMANCE**

### **Writing Action for Video Prompts**

Frame your action descriptions as **verbs and behaviors**, not appearances:

```
✅ GOOD (Action):
"She turns slowly toward the sound, her expression shifting from calm to alarm."
"He picks up the glass, swirls it once, and takes a long sip."
"The crowd parts as the figure pushes through."

❌ BAD (Visual description — belongs in frame prompt):
"A beautiful woman with long red hair in a blue dress turns toward the sound."
"A man in a dark suit sitting at a mahogany desk picks up a crystal glass."
```

### **One Major Action Per Shot**

Complex multi-action scenes fragment. Structure your video prompts around one primary action:

| ✅ One Action | ❌ Too Many Actions |
|---|---|
| "She opens the door and steps into the room, pausing at the threshold." | "She opens the door, steps in, picks up a book, sits down, starts reading, then looks up startled." |
| "He pulls the letter from the envelope and begins reading, his expression falling." | "He opens the mailbox, takes out the letter, opens it, reads it, crumples it, and throws it away." |

### **Performance Direction Keywords**

Use these to direct emotional/physical performance:

| Category | Keywords |
|----------|---------|
| **Pace** | slowly, briskly, hesitantly, urgently, deliberately, languidly |
| **Intensity** | gently, forcefully, barely, explosively, subtly |
| **Emotion shift** | shifts from X to Y, gradually becomes, suddenly realizes |
| **Body language** | tenses, relaxes, straightens up, slumps, fidgets, freezes |
| **Eye behavior** | locks eyes, glances away, scans the room, stares blankly, eyes widen |

================================================================================

## 🗣️ **DIALOGUE & VOICE**

### **Dialogue Format for Video Prompts**

```
✅ RECOMMENDED FORMATS:
"The detective says in a low, gravelly voice: 'Your story has holes.'"
"A woman whispers urgently with a slight French accent: 'We have to leave now.'"
"He shouts across the room: 'Get down!'"

✅ NARRATION:
"A narrator speaks in a polished British accent with a warm, authoritative tone: 
'The city had a way of forgetting its own.'"
```

### **Voice Direction Elements**

Specify these in video prompts to control vocal performance:

- **Accent**: British, Southern American, New York, Australian, French-accented English, etc.
- **Tone**: warm, cold, sarcastic, earnest, menacing, playful
- **Pitch**: deep, high, gravelly, breathy, clear
- **Pace**: rapid-fire, measured, halting, slow and deliberate
- **Emotion**: fearful, confident, amused, defeated, furious, tender
- **Delivery**: whispered, shouted, muttered, deadpan, sing-song, trembling

### **Lip-Sync Note**
Exact lip-sync is not guaranteed in Veo 3.1. For projects requiring precise lip movement, plan for voiceover alignment and possible retiming in your NLE.

================================================================================

## 🎥 **CAMERA MOVEMENT**

### **Camera Movement Reference (For Video Prompts Only)**

| Movement | Description | Video Prompt Example |
|----------|-------------|---------------------|
| Static | No movement — camera holds | "Static camera, no movement." |
| Pan | Horizontal rotation on axis | "Slow pan left revealing the crowd." |
| Tilt | Vertical rotation on axis | "Tilt down from her face to the letter in her hands." |
| Dolly in | Physical move toward subject | "Dolly in slowly toward his face as he speaks." |
| Dolly out | Physical move away from subject | "Dolly out to reveal the scale of the empty room." |
| Truck | Horizontal lateral travel | "Truck right, following her as she walks the corridor." |
| Crane up | Vertical upward sweep | "Crane up to reveal the cityscape beyond the rooftop." |
| Crane down | Vertical downward sweep | "Crane down from the chandelier to the ballroom floor." |
| Handheld | Organic, immediate, shaky | "Handheld camera, following close behind during the chase." |
| Steadicam | Smooth gliding follow | "Steadicam follows him through the crowded market." |
| Arc | Circular path around subject | "Slow arc shot circling around the couple as they embrace." |
| Rack focus | Shift focus between planes | "Rack focus from the gun in the foreground to his face in the background." |
| Push-in | Gradual forward movement for tension | "Slow push-in on her face as the realization hits." |
| Pull-out | Gradual backward reveal | "Pull out to reveal the full aftermath of the scene." |

### **Combining Movement with Action**

Camera movement and subject action should be described together in the video prompt so timing is clear:

```
"Dolly in slowly as she leans forward across the table and whispers: 
'I know what you did.' SFX: the scrape of her chair on the floor."
```

================================================================================

## 🔊 **SOUND DESIGN (SFX & AMBIENT)**

### **Sound Effects (SFX)**

Describe specific, distinct sounds tied to actions or moments:

```
"SFX: the sharp crack of a gunshot echoing off the walls"
"SFX: a phone buzzes on the desk, then stops"
"SFX: heavy boots on gravel, getting closer"
"SFX: a match strikes, then the soft hiss of a flame"
```

### **Ambient Audio**

Define the background soundscape:

```
"Ambient: the steady patter of rain and distant thunder"
"Ambient: quiet hum of a starship bridge, soft electronic beeps"
"Ambient: city traffic far below, a distant siren"
"Ambient: dead silence, only the ticking of a clock"
```

### **Musical Cues**

```
"A faint, melancholic piano melody plays in the background."
"A swelling orchestral score begins as the vista is revealed."
"Tinny radio music — 1950s jazz — plays from somewhere off-screen."
```

### **Audio Best Practices**

1. **Keep**: Use native audio when ambient/environmental sound fits the scene
2. **Refine**: Crossfade audio between clips in your NLE to avoid jumps
3. **Replace**: For brand work, precise dialogue, or music-driven pieces, plan to replace native audio
4. **Silence**: Explicitly call for silence when a quiet beat matters — don't leave it to chance

================================================================================

# 🛠️ PUTTING IT TOGETHER

================================================================================

## 📝 **COMPLETE SHOT EXAMPLES**

### **Example 1: Noir Detective**

**STARTING FRAME PROMPT:**
```
Medium close-up, eye-level, shallow depth of field with soft background bokeh. 
A weary male detective in his late 50s, Caucasian, with deep-set grey eyes, 
salt-and-pepper five-o'clock shadow, heavy bags under his eyes, and thinning 
grey hair combed back. He wears a rumpled beige trench coat over a loosened 
burgundy tie and wrinkled white dress shirt, top button undone. He sits behind 
a cluttered oak desk, leaning back in a worn leather chair, arms on armrests, 
staring directly into camera with a flat, unreadable expression.

On the desk: a half-empty glass of whiskey, a manila case folder, a rotary 
phone, scattered papers, an overflowing ashtray. Behind him, a rain-streaked 
window shows blurred city neon — pinks and blues — reflected in wet glass. 
Small wood-paneled office, single brass desk lamp casting warm amber light 
from frame right, left side of his face in soft shadow. Noir aesthetic, 
desaturated palette with warm amber and cool blue accents, 35mm film grain.
```

**VIDEO PROMPT:**
```
Static camera. He slowly leans forward, places both hands flat on the desk, 
and exhales through his nose. He looks up and says in a low, gravelly New 
York accent: "Of all the offices in this town, you had to walk into mine." 
Holds eye contact for a beat, then glances down at the case file.

SFX: Creak of leather, soft clink of ice in the glass, muffled rain on glass.
```

---

### **Example 2: Sci-Fi Corridor**

**STARTING FRAME PROMPT:**
```
Wide shot, low angle, deep focus. A lone female astronaut in her early 30s, 
East Asian, with a tight black bun and sharp cheekbones, wearing a white 
EVA suit with orange mission patches on the shoulders and a cracked visor 
pushed up on her forehead. She stands at the far end of a long, hexagonal 
corridor stretching toward camera, body facing camera, weight on her left 
leg, right hand resting on the wall.

The corridor is industrial — exposed conduits, riveted steel panels, 
intermittent strip lighting along the floor casting cold blue-white light 
upward. Several overhead lights are flickering or dead, creating pools of 
shadow. Condensation on the walls. A faint haze of vapor near the ceiling. 
At the near-camera end, a heavy bulkhead door is half-open, frame left. 
Clean digital aesthetic, cool blue-grey palette, high contrast.
```

**VIDEO PROMPT:**
```
Slow dolly in toward the astronaut. She pushes off the wall and begins 
walking toward camera with cautious, deliberate steps. She tilts her head, 
listening. After three steps she stops and whispers: "Hello? Is anyone 
on comms?" Her hand moves to her ear. She waits. No response.

SFX: Her boots echo on metal flooring, distant mechanical groaning of the 
hull, a faint electrical crackle from the broken lights. 
Ambient: Low hum of the ship's life-support systems.
```

---

### **Example 3: Emotional Close-Up**

**STARTING FRAME PROMPT:**
```
Extreme close-up, eye-level, very shallow depth of field — only the eyes 
and bridge of the nose are in sharp focus. A young woman in her mid-20s, 
Black, with dark brown eyes, long eyelashes, and a scatter of freckles 
across her nose and cheeks. Her lower lids are slightly reddened as if 
she has been crying. Her skin has a soft sheen from tears. Natural light 
from frame left — overcast daylight from a nearby window — provides soft, 
even illumination. Muted, naturalistic color palette. Handheld slight 
framing imperfection.
```

**VIDEO PROMPT:**
```
Static camera with very subtle handheld drift. Her eyes are fixed on 
something off-screen left. She blinks slowly, then her lip trembles. 
A single tear rolls down her right cheek. She swallows hard and whispers: 
"I'm okay." She doesn't look away.

SFX: A quiet, shaky inhale. Ambient: near-silence, the faintest sound 
of rain outside.
```

================================================================================

## 🔗 **MULTI-SHOT SEQUENCES**

### **Building a Sequence with Frame-to-Video**

For multi-shot sequences, each shot gets its own frame prompt + video prompt pair. Use the ending composition of one shot to inform the starting frame of the next.

```
SHOT 1:
├── Starting Frame Prompt (wide establishing shot of office)
├── Video Prompt (slow push-in, ambient sounds)
└── Result: Clip 1

SHOT 2:
├── Starting Frame Prompt (medium shot of detective at desk — matches end of Shot 1)
├── Video Prompt (he speaks his line)
└── Result: Clip 2

SHOT 3:
├── Starting Frame Prompt (close-up of the woman in the doorway)
├── Video Prompt (she steps forward and responds)
└── Result: Clip 3
```

### **Using First and Last Frame for Transitions**

When you need controlled transitions between specific compositions:

**Step 1**: Create starting frame (frame prompt → image gen)
**Step 2**: Create ending frame (frame prompt → image gen)
**Step 3**: Video prompt describes only the movement/action/audio between them

```
STARTING FRAME PROMPT:
"Medium shot of a female pop star singing into a vintage microphone. Dark 
stage, single dramatic spotlight from the front. Photorealistic, cinematic."

ENDING FRAME PROMPT:
"POV shot from behind the singer on stage, looking out at a large cheering 
crowd. Bright stage lights, lens flare. Energetic atmosphere."

VIDEO PROMPT:
"Smooth 180-degree arc shot circling from front to behind. She sings: 
'When you look me in the eyes, I can see a million stars.' The crowd roars. 
SFX: Thunderous applause, bass reverb from the speakers."
```

### **Sequence Consistency Tips**

- Copy-paste character description blocks identically across all frame prompts
- Lock aspect ratio for the entire project
- Use the same lighting/color keywords across frame prompts for tonal consistency
- Use reference images (up to 3) across shots for identity lock
- Use shorter durations (4-6s) for action-heavy shots

================================================================================

## ⚖️ **VERBOSITY ALIGNMENT RULES**

### **The Cardinal Rule**

> **Frame prompts: be as descriptive as possible.**
> **Video prompts: be as lean as possible.**

### **Verbosity Checklist**

| Check | Rule |
|-------|------|
| ✅ | Frame prompt describes character appearance in full detail |
| ✅ | Frame prompt describes environment, props, and spatial layout |
| ✅ | Frame prompt specifies lighting setup, color palette, and visual style |
| ✅ | Frame prompt specifies camera position, angle, and lens |
| ✅ | Video prompt describes only action/movement |
| ✅ | Video prompt includes full dialogue with voice direction |
| ✅ | Video prompt specifies camera *movement* (or states "static") |
| ✅ | Video prompt includes SFX and ambient audio |
| ❌ | Video prompt re-describes character appearance |
| ❌ | Video prompt re-describes the environment |
| ❌ | Video prompt mentions lighting or color palette |
| ❌ | Video prompt mentions film stock or visual aesthetic |
| ❌ | Frame prompt includes action verbs or movement |
| ❌ | Frame prompt includes dialogue or sound |

### **When to Break the Rule**

There are rare cases where a video prompt may need a brief visual reference for action clarity:

```
✅ Acceptable (visual note serves the action):
"She picks up the red folder from the desk" — specifying "red" helps 
identify WHICH object, since the frame may show multiple folders.

❌ Unnecessary (re-describing what's visible):
"The woman with long red hair in the blue dress picks up a folder from 
the mahogany desk in the dimly lit office."
```

The test: **Does removing this visual detail make the action ambiguous?** If not, remove it.

================================================================================

## 🔧 **QUALITY ASSURANCE PROTOCOLS**

### **Frame Prompt Checklist**

- ✅ Subject appearance is fully described (face, hair, build, clothing, accessories)
- ✅ Camera position and framing specified (shot type, angle, lens)
- ✅ Spatial layout is explicit (who/what is where in the frame)
- ✅ Environment is detailed (location, props, surfaces, depth layers)
- ✅ Lighting is specified (key, fill, practicals, direction, quality)
- ✅ Color palette and visual style are defined
- ✅ No action verbs, no dialogue, no sound
- ✅ Character descriptions are copy-pasted identically across shots
- ✅ Aspect ratio matches delivery platform

### **Video Prompt Checklist**

- ✅ Primary action is clear and singular (one major action per shot)
- ✅ Camera movement is specified (or "static" is stated)
- ✅ Dialogue is in quotes with speaker ID, accent, tone, and delivery
- ✅ SFX are specified for key sounds
- ✅ Ambient audio is defined
- ✅ Duration is appropriate for action complexity (4-6s complex; 8s atmospheric)
- ✅ No character appearance descriptions
- ✅ No environment descriptions
- ✅ No lighting or color palette mentions
- ❌ Visual descriptions present (unless required for action clarity)

### **Effective Negative Prompts**

**Format**: Describe what you don't want to see (avoid instructive language)

```
❌ AVOID: "no walls" or "don't show walls"
✅ USE: "wall, frame" (meaning you don't want these elements)
```

**Common Quality Control Negatives:**
```
subtitles, captions, watermark, text overlays, words on screen, logo, 
blurry footage, low resolution, artifacts, distorted hands, compression 
noise, camera shake
```

### **Post-Generation QC**

- **Frame Match**: Does the video's first frame match the provided starting frame?
- **Action**: Is the primary action readable and complete within the duration?
- **Camera**: Does the camera movement match the video prompt?
- **Audio**: Does dialogue sound correct? Are SFX present and timed?
- **Drift**: Has the character's appearance drifted from the frame anchor?

================================================================================

# 🚀 ADVANCED TECHNIQUES

================================================================================

## ⏱️ **TIMESTAMP PROMPTING (Within Video Prompts)**

### **Multi-Beat Sequencing**

Timestamp prompting happens **inside the video prompt** to orchestrate timed events within a single clip. The starting frame still provides the visual anchor.

```
STARTING FRAME PROMPT:
"Medium shot from behind a young female explorer with a leather satchel 
and messy brown hair in a ponytail, standing at the edge of dense jungle 
vegetation. She faces away from camera toward a wall of thick green vines. 
Bright, dappled tropical sunlight filtering through canopy. Naturalistic 
color palette, subtle film grain."

VIDEO PROMPT:
[00:00-00:02] She pushes aside a large vine to reveal a hidden path. 
SFX: Rustling leaves, a branch snapping.

[00:02-00:04] Cut to reverse shot — her freckled face fills with awe 
as she gazes forward. SFX: Distant exotic bird calls.

[00:04-00:06] Tracking shot following her as she steps into a clearing 
and runs her hand over intricate carvings on a crumbling stone wall. 
She whispers: "This is real."

[00:06-00:08] Crane up and out to a wide high-angle, revealing the lone 
explorer standing small in the center of a vast, forgotten temple complex 
half-swallowed by jungle. A gentle orchestral score swells.
```

### **Timestamp Best Practices**

- Use 2-second segments for distinct beats
- Specify camera changes at each timestamp
- Include audio cues per segment
- Keep total duration within 8 seconds
- The starting frame anchors the visual — timestamps only describe action, sound, and camera movement

================================================================================

## 🖼️ **REFERENCE IMAGES & INGREDIENTS TO VIDEO**

### **Reference Image System**

Use up to 3 reference images per generation to maintain consistency:

- **Character Reference**: Lock appearance across shots
- **Object Reference**: Maintain product/prop consistency
- **Style Reference**: Ensure aesthetic continuity

### **Ingredients to Video Workflow**

1. **Generate References**: Create reference images using image gen (Gemini 2.5 Flash Image or similar)
2. **Generate Starting Frame**: Use your frame prompt + references to create the anchor image
3. **Generate Video**: Use the anchor image + lean video prompt

### **How References Interact with Frame-to-Video**

References and starting frames work together:
- **References** provide loose identity/style guidance across multiple shots
- **Starting frames** provide the exact pixel-level visual truth for each specific shot
- **Video prompts** only describe motion and sound — they don't interact with references at all

### **Consistency Tips**

- Keep subject's clothing and pose similar in reference images
- Reuse the same 1-3 references across all related clips in a project
- Lock aspect ratio across your project
- Use shorter durations (4-6s) for action-heavy beats

================================================================================

## 🔄 **CLIP EXTENSION WORKFLOWS**

### **Building Longer Sequences**

Extend previously generated Veo clips to build longer sequences:

1. **Generate Base Clip**: Starting frame + video prompt → best short clip (4-8s)
2. **Review and Select**: Choose the strongest generation
3. **Extend**: Use extension feature to continue the action
4. **Iterate**: Refine extensions as needed

### **Extension Best Practices**

- Start with shorter durations (4-6s) for complex action
- Extend only your best clips
- Maintain consistent prompt language
- Use first/last frame control for smooth handoffs between clips
- Plan to stitch multiple clips in your NLE for final edit

================================================================================

## ⚠️ **TROUBLESHOOTING & OPTIMIZATION**

### **Common Issues and Solutions**

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Soft/smeared motion | Too many concurrent actions in video prompt | Simplify to one action; shorten to 4-6s |
| Character identity drift | Inconsistent frame prompts across shots | Copy-paste identical character blocks; use references |
| Lighting shifts between clips | Different lighting descriptions in frame prompts | Standardize 2-3 lighting descriptors across all frame prompts |
| Camera mismatch | Vague camera terms in video prompt | Specify exact movement: "slow dolly in" not just "cinematic" |
| Distracting native audio | Ambient/level mismatch | Disable and replace in NLE |
| Visual details ignored | Too much visual description in video prompt | Strip visual details; let the starting frame handle appearance |
| Action incomplete | Duration too short for action complexity | Shorten the action or extend duration to 8s |
| Repeated artifacts | Over-constrained prompts | Reduce adjectives in frame prompt; change seed |

### **Practical Prompting Rules**

1. **One major action per shot** — Complex multi-action scenes fragment
2. **Frame prompts: verbose. Video prompts: lean.** — This is the core principle
3. **Use reference images when consistency matters** — Up to 3 per generation
4. **Lock aspect ratio for the project** — Don't flip mid-project
5. **Keep language plain** — Replace poetic metaphors with visual specifics
6. **Use seed for reproducibility** — Change seed when stuck
7. **Move one variable at a time** — Adjust camera OR lighting OR action, not all three

================================================================================

## 🎯 **DOMAIN-SPECIFIC SPECIALIZATION**

### **Corporate Communications**

```
Frame Prompt Focus:
- Executive presence: professional attire, confident posture, well-groomed
- Brand-compliant environments: modern office, branded colors, clean design
- Authority lighting: well-lit, balanced, professional

Video Prompt Focus:
- Clear, authoritative delivery of dialogue
- Measured, confident body language in motion
- Minimal, professional camera movement
```

### **Educational Content**

```
Frame Prompt Focus:
- Clear, uncluttered compositions
- Well-lit subjects and visual aids
- Inviting, approachable environments

Video Prompt Focus:
- Clear speech with appropriate pacing
- Gestures that support explanation
- Attention-grabbing action hooks
```

### **Marketing & Social Media**

```
Frame Prompt Focus:
- Hook-worthy opening composition (first frame must grab)
- Product prominence and appeal
- Platform-specific framing (16:9 vs 9:16)

Video Prompt Focus:
- Action within first 2 seconds
- Emotional engagement through performance
- Call-to-action delivery
```

### **Scenario Playbooks**

**30-Second Brand Montage (16:9)**
- 5-6 shots, each with its own frame prompt + video prompt pair
- Settings: 1080p, 24fps, 16:9
- Use reference images for products and talent
- Replace audio with licensed track and VO in post

**Vertical Social Teaser (9:16)**
- 3-4 shots at 4-6s each
- Strong subject isolation in frame prompts
- Punchy, quick actions in video prompts
- Keep text-safe zones for captions

**Short Narrative with Continuity**
- 4 shots: establishing, action, reaction, resolve
- Identical character blocks across all frame prompts
- First/last frame control between clips
- Reference images for character and setting lock

================================================================================

## 🌟 **BEST PRACTICES SUMMARY**

### **Frame Prompt Checklist**

- [ ] Camera position, angle, and lens fully specified
- [ ] Subject appearance described in full (face, hair, build, clothing, accessories)
- [ ] Spatial placement explicit (where everything is in the frame)
- [ ] Environment detailed (location, props, surfaces, depth)
- [ ] Lighting described (key, fill, practicals, direction, quality)
- [ ] Color palette and visual style defined
- [ ] Film stock / aesthetic specified
- [ ] Character description block is identical across all shots
- [ ] No action, dialogue, or sound present
- [ ] Reference images prepared if needed

### **Video Prompt Checklist**

- [ ] Camera movement specified (or "static" stated)
- [ ] One primary action clearly described
- [ ] Dialogue in quotes with voice direction (accent, tone, pace, emotion)
- [ ] SFX specified for key sounds
- [ ] Ambient audio defined
- [ ] Duration appropriate for complexity
- [ ] No visual descriptions (appearance, environment, lighting, color)
- [ ] Negative prompts prepared (descriptive, not instructive)

### **Success Optimization Tips**

1. **Master the split**: Get comfortable writing pure-visual frame prompts and pure-action video prompts
2. **Iterate quickly**: Use 720p for iterations, 1080p for finals
3. **Lock variables**: Keep aspect ratio, references, character blocks, and style consistent
4. **One change at a time**: Adjust one variable between iterations
5. **Plan for post**: Native audio is a starting point; plan replacements
6. **Use references**: Character consistency requires consistent reference images + frame anchors
7. **Mind duration**: Complex action needs shorter clips (4-6s)
8. **Test the split**: If your video prompt works as a silent-movie stage direction, it's probably right

================================================================================

## 📚 **RESOURCES AND REFERENCES**

### **Official Documentation**
- [Google Veo 3.1 Model Reference](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/veo-video-generation)
- [Vertex AI Video Generation Prompt Guide](https://cloud.google.com/vertex-ai/generative-ai/docs/video/video-gen-prompt-guide)
- [Ultimate Prompting Guide for Veo 3.1 (Google Cloud Blog)](https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-veo-3-1)
- [Gemini API Video Documentation](https://ai.google.dev/gemini-api/docs/video)
- [Google Flow Labs](https://flowlabs.google/)
- [DeepMind Veo Overview](https://deepmind.google/models/veo/)

### **Feature-Specific Documentation**
- [Reference Images Guide](https://cloud.google.com/vertex-ai/generative-ai/docs/video/use-reference-images-to-guide-video-generation)
- [First/Last Frame Generation](https://cloud.google.com/vertex-ai/generative-ai/docs/video/generate-videos-from-first-and-last-frames)
- [Responsible AI Guidelines](https://cloud.google.com/vertex-ai/generative-ai/docs/video/responsible-ai-and-usage-guidelines)

### **Professional Tools**
- **Topaz Lab's Video Upscaler**: 4K/60fps enhancement
- **Luma's Reframe Video**: Vertical format conversion
- **DaVinci Resolve**: Professional editing and color grading

================================================================================

*Last updated: February 2026*
*Version 4.0 — Frame-to-Video Architecture*
*Compatibility: Veo 3.1 / Flow as of January 2026*

**A comprehensive resource for professional Veo 3.1 / Flow video generation through the frame-to-video split prompt architecture.**

================================================================================
