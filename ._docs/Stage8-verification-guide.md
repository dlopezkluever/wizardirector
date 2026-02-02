# Stage 8 Implementation – Verification Guide

How to test/verify the Stage 8 (Visual & Character Definition) implementation: scene asset service, Stage 8 shell, and Continuity Header.

---

## 1. Prerequisites

- **Backend** running: `cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend"` then `npm run dev` (localhost:3001).
- **Frontend** running: `cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector"` then `npm run dev` (localhost:8080).
- **Auth**: Log in so API calls send a valid session.
- **Project**: At least one project with:
  - **Stage 5** completed (or at least some project assets) so “Add from project assets” has something to show.
  - **Stage 6** (Script Hub) so you can open a scene.
  - **Stage 7** optional; you can jump to Stage 8 from the sidebar.

---

## 2. Get to Stage 8

1. Open the app (e.g. `http://localhost:8080`).
2. Open a **project** (e.g. from dashboard).
3. Go to **Stage 6 – Script Hub** (ensure `currentStage > 5` so Phase B is active).
4. **Enter a scene**: click a scene in the list so the view switches to “scene workflow” (Stages 7–12) with a scene selected.
5. **Open Stage 8**:
   - Either complete Stage 7 and click “Proceed”, or  
   - In the **Scene Workflow Sidebar** (right), click **Stage 8 – Visual Definition**.

You should see Stage 8 with either the **empty state** or the **three-panel layout**, and the **Continuity Header** at the top if there is a previous scene.

---

## 3. What to Verify

### 3.1 Continuity Header (Rearview Mirror)

- **When**: Current scene is not the first (e.g. Scene 2+).
- **Expected**: A collapsible “Rearview Mirror” at the top with “Previous: Scene N” and either:
  - Text summary of the previous scene’s end state, or  
  - Final frame thumbnail if the previous scene has one.
- **When no prior scene**: Header may be absent or show nothing (both are acceptable).

### 3.2 Empty State (no scene assets yet)

- **When**: The scene has no scene asset instances (first time on Stage 8 for this scene, or after clearing).
- **Expected**:
  - Message like “No scene assets yet”.
  - **“Detect Required Assets”**: Starts AI relevance detection, then creates scene instances from the result and shows the three-panel layout (or an error toast).
  - **“Add Manually”**: Opens the Asset Drawer (sheet from the right).
- **Check**: No automatic AI run on first load; user must choose Detect or Add.

### 3.3 Detect Required Assets

- From empty state, click **“Detect Required Assets”**.
- **Expected**:
  - Button shows loading (“Detecting…”).
  - Backend `POST …/scenes/:sceneId/assets/detect-relevance` is called (check Network tab).
  - On success: scene instances are created, list refetches, and the **left panel** shows grouped assets (Characters, Locations, Props) with source badge (Master / Prior Scene) and status (Unreviewed / Edited / Locked).
  - Toast like “Added N relevant asset(s). M new assets suggested.”
- If the project has no assets or the backend fails, you may see an error toast; that’s expected when preconditions aren’t met.

### 3.4 Add Manually / Asset Drawer

- From empty state (or any time), click **“Add Manually”** or **“Add from project assets”** in the right panel.
- **Expected**:
  - A **sheet** opens listing **project assets** (from Stage 5).
  - Copy like “Inheritance source: Master” in the sheet.
  - Clicking an asset (or its “add” control) calls `POST …/scenes/:sceneId/assets` with that `projectAssetId`, then closes the sheet and refreshes the scene asset list.
  - New instance appears in the left panel.

### 3.5 Three-Panel Layout (when scene has assets)

- **Left – Scene Visual Elements**:
  - List grouped by type (Characters, Locations, Props).
  - Each row: name, source badge (Master / Prior Scene), status (Unreviewed / Edited / Locked).
  - Checkboxes to multi-select for bulk generation.
  - “Inherit from prior scene” (if applicable).
  - “Generate Scene Starting Visuals (N)” enabled when at least one asset is selected.

- **Center – Visual State Editor** (after selecting an asset):
  - Shows asset name and inheritance line (e.g. “Inheriting from Scene 4” or “Inheritance source: Master”).
  - Editable **Visual state description** (saves as `description_override` on blur or equivalent).
  - **Lock** button: sets status to Locked (sends `statusTags` including `'locked'` and `modificationReason`).
  - **Generate image** button (single asset).
  - If present: audit (modification count / last modified field) and master reference image.

- **Right – Asset library**:
  - “Add from project assets” opens the same drawer as “Add Manually”.
  - “Create scene asset” opens the drawer (same flow for now).
  - **Back** returns to Stage 7.
  - **Proceed** advances to Stage 9.

### 3.6 Inherit from Prior Scene

- With Scene 2+ and no (or few) scene assets, click **“Inherit from prior scene”** in the left panel.
- **Expected**: `POST …/scenes/:sceneId/assets/inherit` is called; toast “Assets inherited from prior scene”; list refetches and shows inherited instances (Prior Scene badge where applicable).

### 3.7 Bulk Generate (cost modal stub)

- Select one or more assets with the checkboxes, then click **“Generate Scene Starting Visuals (N)”**.
- **Expected**: A **cost confirmation modal** appears (stub for Task 7.0) with selected count and estimated credits.
  - **Confirm**: Calls bulk generate API, then refetches; toast like “Bulk generation started for N asset(s)”.
  - **Cancel**: Closes modal without calling API.

### 3.8 Lock / Unlock and status

- Select an asset, optionally edit the description, then click **Lock**.
- **Expected**: Update request includes `statusTags` (with `'locked'`) and `modificationReason`; asset row in the left panel shows “Locked” badge.

---

## 4. Quick API Checks (Browser DevTools)

Open **Network** tab (filter by “Fetch/XHR”):

| Action                 | Method | Endpoint (pattern) |
|------------------------|--------|-------------------|
| Load Stage 8           | GET    | `…/projects/:id/scenes/:id/assets` |
| Detect relevance       | POST   | `…/scenes/:id/assets/detect-relevance` |
| Add from drawer        | POST   | `…/scenes/:id/assets` (body: `projectAssetId`, …) |
| Inherit                | POST   | `…/scenes/:id/assets/inherit` |
| Update (description/Lock) | PUT | `…/scenes/:id/assets/:instanceId` |
| Generate image (single) | POST  | `…/scenes/:id/assets/:id/generate-image` |

All requests should send `Authorization: Bearer <token>`.

---

## 5. Lint and Build (sanity check)

- **Frontend**:  
  `cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector"`  
  `npm run lint`  
  `npm run build`

- **Backend**:  
  `cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend"`  
  `npm run build`  
  `npm run test` (if you have scene-asset or relevance tests).

---

## 6. Optional: Direct URL to Stage 8

If you know `projectId` and `sceneId` (e.g. from URL or DB), you can try:

`http://localhost:8080/projects/<projectId>?stage=8&sceneId=<sceneId>`

After load, the app should restore `stage=8` and `sceneId` and show Stage 8 for that scene (assuming you’re in Phase B and the scene is valid).

---

## 7. Troubleshooting

- **Stage 8 not showing**: Ensure `projectId` and `activeSceneId` are set (you’ve opened a project and entered a scene). Sidebar must show “Stage 8” and you must click it (or advance from Stage 7).
- **“Missing project or scene context”**: URL or state is missing `projectId` or `sceneId`; re-enter the project and scene.
- **Detect / Inherit / Add fails**: Check backend is running, auth token is valid, and (for Detect) the project has a shot list/script and project assets as required by the relevance agent.
- **Empty project asset list in drawer**: Add or extract assets in **Stage 5** first.
