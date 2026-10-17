# CineBlock — Virtual Production Studio
### Hackathon Build Spec · Standalone Demo

---

## What We're Building

A standalone web app where a filmmaker inputs their location images, shot list, and scene assets — then enters a Marble API-generated 3D world to physically block each shot and capture reference frames. The output is a structured screenshot library grouped by shot, exportable as ZIP + JSON for use in downstream image generation.

This is **not** integrated into Aiuteur during the hackathon. It is a self-contained demo that proves the concept end-to-end.

---

## App Structure — 3 Views

```
[ 1. SETUP ] → [ 2. STUDIO ] → [ 3. RESULTS ]
```

Linear flow. User completes Setup, enters Studio, then views Results. Back-navigation allowed at any point.

---

## View 1: Setup

The user provides everything the Studio needs before entering the 3D world.

### Section A — Location Images
- Multi-image uploader (drag & drop or file picker)
- Minimum: 3 images required before proceeding
- Recommended angles shown as helper text:
  - Establishing wide / aerial
  - Eye-level hero angle
  - Opposite wall / reverse
- Images are previewed as thumbnails with remove option
- These images are passed directly to Marble API as world gen seed

### Section B — Scene Assets
Single flat list of assets for the entire scene. No per-shot assignment.

Each asset entry has:
- **Name** (text field, e.g. "Marcus", "Kitchen knife")
- **Type** selector: `Character` | `Prop`
- **Brief description** (1-line text, e.g. "tall man, 30s, grey hoodie")

UI: expandable list, "Add Asset" button adds a new row, trash icon removes. No limit on count.

### Section C — Shot List
User builds the shot list via structured form fields. Each shot is a card with:

| Field | Input Type | Notes |
|---|---|---|
| Shot name / number | Text | e.g. "Shot 1", "1A" |
| Description | Textarea | What happens in this shot |
| Camera type | Select | Wide, Medium, Close-Up, OTS, POV, Two-Shot, Insert |

"Add Shot" button appends a new card. Shots are ordered (drag to reorder optional / stretch).

### CTA
**"Generate World & Enter Studio"** button — disabled until:
- ≥ 3 location images uploaded
- ≥ 1 shot defined
- Marble API world gen call can fire

On click: triggers Marble API with the uploaded location images, shows a loading state ("Building your set…"), then transitions to Studio view on success.

---

## View 2: Studio

The main working environment. Split layout.

```
┌─────────────────────────────────┬──────────────────────┐
│                                 │                      │
│         3D CANVAS               │    SHOT SIDEBAR      │
│       (Marble world)            │                      │
│                                 │  Shot 1 — Wide       │
│   ┌──────────────────────┐      │  Shot 2 — OTS        │
│   │   VIEWFINDER BOX     │      │  Shot 3 — Close-Up   │
│   │   (aspect ratio)     │      │                      │
│   └──────────────────────┘      │  Assets in scene:    │
│                                 │  • Marcus            │
│  [📷 Capture]  [Reset Camera]   │  • Kitchen knife     │
│                                 │                      │
└─────────────────────────────────┴──────────────────────┘
```

### 3D Canvas
- Renders the Marble API-generated world
- Free first-person navigation: WASD + mouse look, or click-drag + scroll-zoom
- `@react-three/fiber` + `@react-three/drei` wrapping the Marble API scene output

### Viewfinder Overlay
- A fixed 2D rectangle rendered on top of the canvas
- Aspect ratio options: 16:9 / 2.39:1 / 4:3 / 9:16 — selectable in a small toolbar
- Outside the viewfinder: subtle dark vignette
- Inside: clean, no UI chrome
- This is the capture area — screenshots crop to this box only

### Shot Sidebar (Drawer)
- Fixed right panel, ~280px wide
- Lists every shot from Setup in order
- Each shot card shows:
  - Shot name + camera type badge
  - Shot description (truncated, expandable)
  - Capture tray: thumbnail strip of screenshots taken for this shot, split into **Start Frame** / **End Frame** sections
  - Active shot is highlighted
- Clicking a shot card sets it as the **active shot** for the next capture
- Scene assets listed at the bottom of the sidebar (static, same for all shots)
- Sidebar is collapsible to give full-canvas mode

### Mannequin System
Asset panel at the bottom of the sidebar. Each asset from Setup has a **"Place"** button.

- Clicking "Place" drops a primitive into the scene at center
- **Character** → capsule + sphere (humanoid, color-coded per character)
- **Prop** → scaled box
- Placed mannequins show a **`<TransformControls>`** gizmo (translate / rotate / scale)
- Click away to deselect gizmo
- Each placed mannequin has a small label floating above it (asset name)
- "Remove" button on the gizmo or right-click to delete
- Characters are color-consistent: same character always same color across sessions

### Capture Flow
1. User selects the active shot in the sidebar
2. User selects **Start Frame** or **End Frame** as the capture target (toggle above the capture button)
3. User navigates to desired composition inside the viewfinder
4. Clicks **"📷 Capture"** (or `Space` shortcut)
5. Screenshot is taken of the viewfinder region only → thumbnail appears in the active shot's tray under the correct frame type
6. No limit on captures per shot — most users will grab 3–4 per frame type
7. Captures are held in memory during the session (no persistence required for hackathon)

### Toolbar (minimal, above canvas)
- Aspect ratio selector
- Start / End frame toggle
- Reset camera to origin
- "Done → View Results" button

---

## View 3: Results

Read-only. Shows everything captured during the Studio session.

### Layout
Shot-by-shot accordion or card list:

```
Shot 1 — Wide
  START FRAMES          END FRAMES
  [img] [img] [img]     [img] [img]

Shot 2 — OTS
  START FRAMES          END FRAMES
  [img] [img]           [img] [img] [img]
```

- Clicking any thumbnail opens a full-size lightbox
- Each image shows its shot name + frame type as an overlay label

### Export Options (both available)

**Download ZIP**
- All screenshots as PNG files
- Folder structure:
  ```
  cineblock-export/
    shot-01-wide/
      start-01.png
      start-02.png
      end-01.png
    shot-02-ots/
      start-01.png
      ...
  ```

**Export JSON**
- Structured manifest of the full session:
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
          "id": "shot-01",
          "name": "Shot 1",
          "description": "Marcus enters the kitchen, notices the knife",
          "cameraType": "Wide",
          "startFrames": ["shot-01/start-01.png", "shot-01/start-02.png"],
          "endFrames": ["shot-01/end-01.png"]
        }
      ]
    }
  }
  ```

**"Start Over"** button → resets app state and returns to Setup.

---

## Tech Stack

| Concern | Implementation |
|---|---|
| Framework | React + Vite + TypeScript |
| Styling | Tailwind CSS |
| 3D rendering | `@react-three/fiber` + `@react-three/drei` |
| Mannequin gizmos | `@react-three/drei` `<TransformControls>` |
| World generation | World Labs Marble API (called live, seeded with uploaded images) |
| Screenshot capture | `gl.domElement.toDataURL()` on the R3F renderer, cropped to viewfinder bounds |
| ZIP export | `jszip` + `file-saver` |
| State management | React `useState` / `useReducer` — no backend, all in-memory |
| Hosting | Vite dev server / Vercel deploy |

No database. No auth. No backend. Everything lives in client memory for the duration of the session.

---

## Build Priority

### Must Have (Demo-critical)
- [ ] Setup form: image upload, asset list, shot list builder
- [ ] Marble API call + loading state + world render in R3F canvas
- [ ] Viewfinder overlay with aspect ratio selector
- [ ] Free camera navigation
- [ ] Capture button → stores screenshot in shot tray
- [ ] Shot sidebar with start/end frame assignment
- [ ] Results view: screenshots grouped by shot
- [ ] ZIP download export

### Should Have
- [ ] Mannequin placement + TransformControls
- [ ] JSON export
- [ ] Sidebar collapse / full-canvas mode
- [ ] Keyboard shortcut for capture (Space)

### Nice to Have (if time allows)
- [ ] Drag-to-reorder shots in Setup
- [ ] Lightbox on screenshot click in Results
- [ ] Camera position saved per capture (for "return to this angle")
- [ ] Asset color-coding on mannequins

---

## What's Explicitly Out of Scope
- No persistence / database
- No user auth
- No Aiuteur integration
- No video generation
- No multi-scene support (single scene per session)
- No mannequin physics or animation
- No lighting controls
- No collaborative sessions

#
I decided to move out here to really make the most out of my 20s, like you know, your only in your 20s once, so I've ebeen like, really going to every restruarant, like trying all these crazy foods, um going to 