# CineBlock — Virtual Production Studio
### Hackathon Build Spec · Standalone Demo

---

## What We're Building

A standalone web app where a filmmaker inputs their location images, shot list, and scene assets — then enters a Marble API-generated 3D world to physically block each shot and capture reference frames. The output is a structured screenshot library grouped by shot, exportable as ZIP + JSON.

Self-contained demo. No backend. No auth. No Aiuteur integration during the hackathon.

---

## App Structure — 3 Views

```
[ 1. SETUP ] → [ 2. STUDIO ] → [ 3. RESULTS ]
```

Linear flow. Back-navigation allowed at any point. All state lives in React memory for the session.

---

## View 1: Setup

Three sections. Completed top-to-bottom. "Generate World & Enter Studio" CTA fires at the bottom.

---

### Section A — Location Images

- Multi-image uploader (drag & drop or file picker)
- **Minimum 3 images required** to unlock the CTA
- Helper text labels the recommended angles:
  - Establishing wide / aerial
  - Eye-level hero angle
  - Opposite wall / reverse
- Images preview as thumbnails with individual remove buttons
- These images are passed directly to Marble API as world generation seed

---

### Section B — Scene Assets

A flat list of all characters and props present anywhere in the scene. No per-shot assignment here — that happens in the shot list.

Each asset row:
| Field | Input | Notes |
|---|---|---|
| Name | Text | e.g. "Marcus", "Kitchen knife" |
| Type | Select | `Character` \| `Prop` |
| Description | Text (1 line) | e.g. "tall man, 30s, grey hoodie" |

- "Add Asset" button appends a new row
- Trash icon removes a row
- This asset list is the master pool that shots draw from

---

### Section C — Shot List

Each shot is a structured card. Required fields are marked. Metadata fields are optional and displayed in a collapsible "Details" section — they exist for the user to reference while blocking in the Studio, not for the app to process.

**Required fields:**
| Field | Input | Notes |
|---|---|---|
| Shot name / ID | Text | e.g. "Shot 1", "1A" |
| Action / description | Textarea | What physically happens in the shot |
| Camera type | Select | Wide, Medium, Close-Up, OTS, POV, Two-Shot, Insert |
| Assets in shot | Checkbox list | Drawn from Section B asset pool |

**Optional metadata (collapsible "Details" section):**
| Field | Input | Notes |
|---|---|---|
| Duration | Number (seconds) | Default 8s, valid 1–30 |
| Camera height | Select | Eye Level, High Angle, Low Angle, Overhead, Ground Level |
| Camera movement | Text | e.g. "slow dolly in", "static", "pan right" |

**Asset checkbox behavior:**
- The checkbox list for each shot is auto-populated from the Section B asset pool
- User ticks which assets are visible/active in this shot
- Unchecked assets are noted as "off-screen" — their mannequins will be hidden by default when this shot is active in the Studio

"Add Shot" appends a new card. Shots stack in order — this order is preserved in the Studio sidebar and Results view.

**CTA:** "Generate World & Enter Studio" — disabled until ≥3 images uploaded + ≥1 shot defined. On click: Marble API fires, loading state shown ("Building your set…"), transitions to Studio on success.

---

## View 2: Studio

Split layout — 3D canvas left, Shot Sidebar right.

```
┌───────────────────────────────────┬─────────────────────┐
│                                   │  SHOT SIDEBAR       │
│           3D CANVAS               │                     │
│        (Marble world)             │  ▶ Shot 1A — Wide   │
│                                   │    Shot 2A — OTS    │
│   ┌───────────────────────┐       │    Shot 3A — CU     │
│   │    VIEWFINDER BOX     │       │                     │
│   │    (aspect ratio)     │       │  ── Active Shot ──  │
│   └───────────────────────┘       │  Action: Marcus     │
│                                   │  enters, sees knife │
│  [📷 Capture]  [🎬 Start│End]     │                     │
│  [Reset Camera] [Aspect ▾]        │  Assets:            │
│                                   │  👁 Marcus          │
│                                   │  👁 Kitchen knife   │
│                                   │  – Detective (off)  │
│                                   │                     │
│                                   │  Start: 🖼 🖼        │
│                                   │  End:   🖼           │
└───────────────────────────────────┴─────────────────────┘
```

---

### 3D Canvas

- Renders the Marble API world
- `@react-three/fiber` + `@react-three/drei`
- Free first-person navigation: WASD + mouse-look, or click-drag + scroll-zoom

---

### Viewfinder Overlay

- Fixed 2D rectangle rendered over the canvas
- Aspect ratio selector in toolbar: `16:9` / `2.39:1` / `4:3` / `9:16`
- Outside viewfinder: subtle dark vignette
- Inside viewfinder: clean, no UI chrome
- **Captures crop to the viewfinder bounds only** — not the full canvas

---

### Shot Sidebar

Fixed right panel (~280px). The user's primary reference and control surface while in the world.

**Shot list (top section):**
- All shots listed in setup order
- Active shot highlighted
- Clicking a shot sets it as active — this updates:
  - The action description shown
  - The asset visibility state (assets unchecked in that shot auto-hide)
  - The capture tray shown below

**Active shot info:**
- Shot name + camera type badge
- Action description (read-only reference)
- Optional metadata shown if filled in (duration, camera height, movement) — small muted text, purely for the user to reference while positioning

**Asset visibility panel (middle section):**
- Lists every scene asset
- Each asset has an **eye toggle** (👁 = visible in world / – = hidden)
- On shot switch: visibility resets to match that shot's checkbox selections from Setup — assets unchecked default to hidden, checked assets default to visible
- User can manually override visibility at any time within a shot

**Capture tray (bottom section):**
- Two rows: **Start Frame** | **End Frame**
- Thumbnails of all captures taken for the active shot under each row
- Count badge per row (e.g. "Start: 3")

---

### Mannequin System

Each asset in the active shot can be placed as a 3D primitive in the world.

**Primitive types:**
| Asset type | Primitive | Notes |
|---|---|---|
| Character | Capsule + sphere (head) | Resizable, color-coded per character |
| Prop | Scaled box | |

**Interaction:**
- "Place" button in the asset panel drops the mannequin at world center
- `<TransformControls>` gizmo on click — translate / rotate / scale
- Click away to deselect gizmo
- Floating name label above each mannequin
- Right-click or "Remove" to delete from world
- **Eye toggle = hidden means the mannequin disappears from the canvas entirely** — off-screen is modeled as non-rendered, not physically moved to a staging area
- Character colors are consistent across the session (assigned at setup time, e.g. Marcus = blue, Detective = orange)

---

### Capture Flow

1. User selects active shot in sidebar
2. User selects **Start Frame** or **End Frame** via toggle in the toolbar
3. User positions camera inside the viewfinder to desired composition
4. Clicks **"📷 Capture"** or presses `Space`
5. Screenshot of viewfinder region only → thumbnail added to active shot's tray under the correct frame type
6. No limit per shot — expect 3–4 per frame type in practice
7. All captures held in React state for the session

---

### Toolbar (above canvas)

| Control | Notes |
|---|---|
| 📷 Capture | Primary action |
| Start \| End toggle | Sets which frame type next capture targets |
| Aspect ratio selector | 16:9 / 2.39:1 / 4:3 / 9:16 |
| Reset Camera | Returns to world origin |
| ← Collapse sidebar | Full-canvas mode |
| Done → Results | Navigates to View 3 |

---

## View 3: Results

Read-only. Structured view of everything captured.

### Layout

Shot cards in order, each showing:

```
Shot 1A — Wide
  Camera: Eye Level · Static · 8s
  Action: Marcus enters the kitchen, notices the knife on the counter

  START FRAMES              END FRAMES
  [img] [img] [img]         [img] [img]
```

- Clicking any thumbnail opens full-size lightbox
- Each image labeled with shot name + frame type

### Export Options

**Download ZIP** — all screenshots as PNGs, structured:
```
cineblock-export/
  shot-01A-wide/
    start-01.png
    start-02.png
    start-03.png
    end-01.png
    end-02.png
  shot-02A-ots/
    ...
```

**Export JSON** — full session manifest:
```json
{
  "exportedAt": "2026-03-15T14:32:00Z",
  "scene": {
    "assets": [
      { "name": "Marcus", "type": "character", "description": "tall man, 30s, grey hoodie" },
      { "name": "Kitchen knife", "type": "prop", "description": "" }
    ],
    "shots": [
      {
        "id": "shot-01A",
        "name": "Shot 1A",
        "cameraType": "Wide",
        "cameraHeight": "eye_level",
        "cameraMovement": "static",
        "duration": 8,
        "action": "Marcus enters the kitchen, notices the knife",
        "assetsInShot": ["Marcus", "Kitchen knife"],
        "startFrames": ["shot-01A-wide/start-01.png", "shot-01A-wide/start-02.png"],
        "endFrames": ["shot-01A-wide/end-01.png"]
      }
    ]
  }
}
```

**"Start Over"** — resets all state, returns to Setup.

---

## Tech Stack

| Concern | Implementation |
|---|---|
| Framework | React + Vite + TypeScript |
| Styling | Tailwind CSS |
| 3D rendering | `@react-three/fiber` + `@react-three/drei` |
| Mannequin gizmos | `<TransformControls>` from `@react-three/drei` |
| World generation | World Labs Marble API (seeded with uploaded location images) |
| Screenshot capture | `gl.domElement.toDataURL()` cropped to viewfinder bounds via canvas 2D |
| ZIP export | `jszip` + `file-saver` |
| State | React `useState` / `useReducer` — no backend, fully in-memory |
| Hosting | Vite dev server / Vercel |

---

## Build Priority

### Day 1 — Core Loop (must be demo-able)
- [ ] Setup: image uploader, asset list builder, shot list builder with asset checkboxes
- [ ] Marble API call on CTA click + loading state
- [ ] R3F canvas rendering the Marble world
- [ ] Viewfinder overlay + aspect ratio selector
- [ ] Free camera navigation
- [ ] Capture button → viewfinder crop → stores in shot tray
- [ ] Shot sidebar: shot list, active shot, capture tray thumbnails
- [ ] Start / End frame toggle

### Day 2 — Depth + Polish
- [ ] Asset visibility toggles (eye icon) + per-shot default state on shot switch
- [ ] Mannequin placement + TransformControls + name labels
- [ ] Optional metadata display in sidebar (camera height, movement, duration)
- [ ] Results view: grouped by shot, start/end rows
- [ ] ZIP export
- [ ] JSON export
- [ ] Lightbox on thumbnail click
- [ ] Sidebar collapse / full-canvas mode
- [ ] `Space` shortcut for capture

### Cut if needed
- [ ] Drag-to-reorder shots in Setup
- [ ] Camera position serialized per capture (return-to-angle)
- [ ] Character color assignment UI (can hardcode a color palette)

---

## Explicitly Out of Scope
- No database or backend
- No user auth
- No Aiuteur integration
- No multi-scene support (single scene per session)
- No video generation
- No physics / mannequin animation
- No lighting controls
- No collaborative sessions
- No physical "staging area" zone — off-screen = hidden via eye toggle only