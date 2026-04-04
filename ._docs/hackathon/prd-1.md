# Aiuteur — Virtual Production Studio
### Feature PRD · Working Document

---

## What This Is

A 3D virtual production environment embedded inside Aiuteur that lets the user physically block out their film before committing to expensive image and video generation. The user enters a navigable 3D world built from their location assets, moves a camera around, places mannequin stand-ins for characters and props, and saves composition snapshots. Those snapshots flow back into Stage 10 as spatial reference frames — sitting alongside the existing frame prompt and Stage 8 asset definitions to dramatically improve generation accuracy.

**The core loop:**
> Generate world once → walk around → place mannequins → take screenshots → pick the best angle per shot → generate frames with spatial context locked in.

---

## Where It Lives in the Pipeline

The Virtual Studio inserts between **Stage 8** and **Stage 10**.

```
Stage 8   →  Asset visual states defined (character appearance, wardrobe, conditions)
              ↓
          🎬  VIRTUAL STUDIO  (blocking + screenshot capture)
              ↓  screenshots tagged to shots → stored in Supabase Storage
Stage 9   →  Prompt Segmentation (frame prompts now have spatial refs attached)
              ↓
Stage 10  →  Frame Generation (screenshot used as composition reference input)
```

The Studio is **non-blocking** — users can skip it entirely and proceed to Stage 10 as before. When used, it adds a reference layer; it doesn't replace any existing stage logic.

A new `/studio` route unlocks after Stage 8 completes for a given scene (or globally after Stage 5, since asset extraction has already run).

---

## The Film Studio Model (Not Scene-by-Scene)

Worlds are generated **per unique location**, not per scene. This is intentional.

A location that appears in scenes 3, 7, and 11 gets **one world generated once**. The user visits that world across all three scenes and captures angles relevant to each. Re-generating a world every time a scene references it would be expensive and unnecessary.

### Studio Lobby

The entry point is a **studio lot overview** — a card-based view of every unique location extracted from the project (sourced from `scenes.dependencies` populated at Stage 5).

```
🎬 Your Film Studio

  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
  │  Kitchen        │  │  Alleyway       │  │  Rooftop        │
  │  Scenes: 3, 7   │  │  Scene: 5       │  │  Scenes: 9, 11  │
  │  📷 12 angles   │  │  📷 0 angles    │  │  📷 4 angles    │
  │  [Enter Studio] │  │  [Enter Studio] │  │  [Enter Studio] │
  └─────────────────┘  └─────────────────┘  └─────────────────┘
```

Each card shows:
- Location name
- Which scenes reference it
- How many saved angles exist
- World generation status (not generated / generating / ready)

**World generation triggers on first "Enter Studio" click** — not pre-emptively. This avoids burning API calls on locations the user never ends up blocking.

---

## Input Images for World Generation

Marble API generates the 3D world from seed images. The user provides these in Stage 8's location asset panel — they're the same reference images already attached to the location asset, potentially supplemented with 1–2 additional angles added specifically for world gen.

**Ideal input set (3–5 images):**

| # | Shot Type | Purpose | Required? |
|---|---|---|---|
| 1 | Establishing wide / aerial | Overall spatial layout and scale | ✅ Yes |
| 2 | Eye-level hero angle | Primary dramatic camera position | ✅ Yes |
| 3 | Opposite wall / reverse | Spatial depth in both directions | ✅ Yes |
| 4 | Detail / texture close-up | Grounds material quality | Optional |
| 5 | Light source direction | Window, lamp, skylight — sets lighting model | Optional |

Three images (establishing + two directionals) is the minimum viable input. More than five has diminishing returns.

Stage 8's location asset UI gets a lightweight addition: a **"World Gen Images"** subsection where the user can tag which of their existing reference images to use, and optionally drag in 1–2 more. This should feel like a minor addition to an existing UI, not a new flow.

---

## Inside the Studio — Core UX

### Camera & Navigation
- Free first-person navigation (WASD or click-drag)
- `@react-three/drei` `<PointerLockControls>` or `<OrbitControls>` depending on feel
- Standard scroll-to-zoom
- A **"Reset to start position"** button always visible

### The Viewfinder
A persistent overlay rendered as a 2D rectangle on top of the 3D canvas — representing the camera frame. Its aspect ratio is pulled directly from the project's selected output format (e.g., 16:9, 2.39:1 cinemascope, 9:16 vertical).

Everything inside the box = what gets captured. Everything outside = staging area only.

The viewfinder box should be visually distinct — maybe a slightly dimmed vignette outside it, clean inside.

### Screenshot Capture
- A **"Capture"** button (or keyboard shortcut, e.g., `Space`) takes a screenshot of the viewfinder area only
- Captures go into the **Angle Library** for that location (persisted to Supabase Storage)
- Each capture is tagged with:
  - Location ID
  - Timestamp
  - Optional user label (e.g., "over-shoulder reverse", "wide establishing")
  - Which scene/shot the user had selected at time of capture (see Scene Selector below)

### Scene Selector
A persistent sidebar or dropdown while inside a studio that shows:
- All scenes that use this location
- Within each scene, all shots from Stage 7's shot list
- The user selects a target shot before capturing → capture gets tagged to that shot automatically
- Can also capture "unassigned" angles for later sorting

### Angle Library (Per Location)
A thumbnail strip or grid showing all saved captures for the current location. Visible while inside the studio. User can:
- Label a capture
- Delete a capture
- See which shot(s) it's been assigned to

---

## Mannequins & Asset Placeholders

Characters and props are represented as simple 3D primitives — not detailed models. The point is positional blocking, not visual fidelity.

### Primitive Types (pulled from `scenes.dependencies`)

| Asset Type | Primitive | Notes |
|---|---|---|
| Human character | Capsule body + sphere head | Resizable to reflect height |
| Quadruped (dog, horse) | Low box + smaller box head | Rough animal shape |
| Prop / object | Scaled box | Size reflects real-world scale |
| Vehicle | Elongated box | |

Mannequin color is arbitrary but should be **per-character consistent** across the project (e.g., character A is always blue, character B always orange) so the user can track who's who during blocking.

### Interaction Model
- **Click** asset panel entry → places mannequin at scene center
- **Drag** to move position in 3D space
- **`@react-three/drei` `<TransformControls>`** provides translate / rotate / scale gizmos — no custom implementation needed
- **Right-click** or trash icon → remove from scene
- **Asset Panel** (sidebar) lists all characters and props for the currently selected scene, with toggle to show/hide each

### MVP Scope Clarification
- Phase 1 (Day 1): Location world only, no mannequins — get blocking and captures working first
- Phase 2 (Day 2): Add mannequin placement on top

---

## How Screenshots Feed Back Into Stage 10

This is the key integration point. Stage 10 currently uses:
1. Frame prompt (text, verbosity-heavy, spatial description)
2. Stage 8 asset visual states (character appearance, conditions, wardrobe)

The Virtual Studio adds a third input:
**3. Reference screenshot** — a 2D composition image showing spatial layout, camera angle, and subject positioning.

### Stage 10 UI Change
Each shot (start frame / end frame) in Stage 10 gets a **"Reference Frame"** picker:

```
Shot 3A — Start Frame
  ├── Frame Prompt: [existing editor]
  ├── Assets: [John (muddy coat), Kitchen — inherited from Stage 8]
  └── 📷 Reference Frame: [Pick from Studio angles]
                           ┌──────┐ ┌──────┐ ┌──────┐
                           │Wide  │ │OTS   │ │Low   │
                           │ ✓    │ │      │ │      │
                           └──────┘ └──────┘ └──────┘
                           [None selected] or [Browse all angles]
```

The reference frame is **optional** — if none selected, Stage 10 behaves exactly as before. If selected, it gets passed as an image input alongside the frame prompt during generation.

### Asset Replacement at Generation Time
Mannequins in the captured screenshots are generic placeholders. At Stage 10 generation:
- The reference screenshot provides **composition and spatial layout**
- The Stage 8 asset definitions provide **visual appearance**
- The generation model is instructed to match the spatial arrangement of the screenshot while rendering characters with their proper Stage 8 appearance

This means the user **never needs a photorealistic world** — a rough spatial reference + detailed asset descriptions = strong generation results.

---

## Tech Stack

This feature lives entirely in the existing Aiuteur stack. No new infrastructure required.

| Concern | Solution |
|---|---|
| 3D rendering | `@react-three/fiber` (React wrapper for Three.js) |
| Camera controls, helpers | `@react-three/drei` |
| Mannequin transform gizmos | `@react-three/drei` `<TransformControls>` |
| World generation | World Labs Marble API (seeded with location reference images) |
| Screenshot capture | `canvas.toDataURL()` on the Three.js renderer canvas |
| Storage | Supabase Storage (same bucket pattern as existing asset images) |
| Route | `/studio` — new route inside existing React/Vite app |
| Data | New `studio_captures` table in Supabase Postgres (see below) |

### New DB Table: `studio_captures`

```sql
studio_captures
  id              uuid primary key
  project_id      uuid references projects
  location_id     uuid references project_assets (type = 'location')
  scene_id        uuid references scenes (nullable — unassigned captures)
  shot_id         uuid references shots (nullable)
  storage_path    text  -- Supabase Storage path
  label           text  -- user-defined label
  captured_at     timestamptz
  camera_position jsonb -- { x, y, z, rotation } for reproducibility
  created_at      timestamptz default now()
```

### Stage 10 Schema Addition
`shots` table gets a new nullable column:
```sql
reference_capture_id  uuid references studio_captures
```

---

## What NOT to Build (Scope Guardrails)

- No physics simulation — mannequins don't fall or collide, they just sit where placed
- No real-time lighting changes — world lighting comes from Marble API output as-is
- No character animation — static T-pose placeholders only
- No collaborative/multiplayer session
- No export to external formats (FBX, GLB, etc.)
- No per-frame world re-generation — one world per location, full stop
- No automatic mannequin placement suggestions — fully manual

---

## Priority Build Order

### Day 1
1. `/studio` route and studio lobby (location cards, world gen status)
2. Marble API integration — trigger world gen from location reference images
3. Three.js canvas with free camera navigation
4. Viewfinder overlay at correct aspect ratio
5. Screenshot capture → Supabase Storage → angle library UI

### Day 2
6. Scene selector sidebar (tag captures to shots)
7. Mannequin system — asset panel + primitive placement + TransformControls
8. Stage 10 reference frame picker UI
9. Wire `reference_capture_id` into frame generation call

---

## Open Questions (Decide Before Building)

1. **Does Marble API stream the world progressively or return a complete scene?** — affects loading UX
2. **Does the reference screenshot get passed to the image model as `image_url` or base64?** — affects Nano Banana prompt structure in Stage 10
3. **Should unassigned captures be assignable from Stage 10, or only from inside the studio?** — UX flow question
4. **Should the camera position be saved per capture so the user can "return to that shot"?** — nice-to-have, low effort (just serialize `camera.position` + `camera.rotation` at capture time)