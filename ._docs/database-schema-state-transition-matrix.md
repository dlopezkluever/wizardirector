# **Database Schema & State Transition Matrix**

## **Executive Summary**

This document defines the PostgreSQL schema and state transition rules for the 12-stage narrative-to-film pipeline. The schema implements:

1. **Git-style branching** ("Story Timelines") with non-destructive version control  
2. **Global-to-Local inheritance** with explicit override tracking  
3. **Deterministic invalidation cascades** when upstream stages change  
4. **Asset promotion** from project-specific to globally reusable  
5. **Status metadata tags** for temporal continuity across scenes

---

## **Core Design Principles**

### **1\. Immutability by Default**

* Completed stages are never mutated in place  
* Changes create new versions or branches  
* All historical states remain queryable

### **2\. Explicit Inheritance Tracking**

* Every artifact records what it inherited from  
* Overrides are logged, not silently applied  
* RAG retrieval results are versioned and traceable

### **3\. Deterministic Invalidation**

* Upstream changes trigger cascading invalidation flags  
* Invalidated artifacts remain accessible but marked  
* Cost implications are calculated before commits

### **4\. Separation of Concerns**

* **Global Context**: Project-wide constraints (Stages 1-5)  
* **Narrative Structure**: Beat sheets and scripts (Stages 3-4)  
* **Scene-Local Context**: Shot-specific data (Stages 6-12)

---

## **Schema Architecture**

### **Entity Relationship Overview**

projects (1) ──\> (N) branches  
branches (1) ──\> (N) stage\_states  
branches (1) ──\> (N) scenes  
scenes (1) ──\> (N) shots  
shots (1) ──\> (N) frames  
shots (1) ──\> (N) videos

global\_assets (N) \<── promotes from ──\> (N) project\_assets  
project\_assets (N) ──\> (N) scene\_asset\_instances

stage\_states (N) ──\> (N) rag\_retrievals  
stage\_states (N) ──\> (N) invalidation\_logs

---

## **Core Tables**

### **`projects`**

**Purpose**: Top-level container for all work

CREATE TABLE projects (  
    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    user\_id UUID NOT NULL REFERENCES auth.users(id),  
    title TEXT NOT NULL,  
      
    \-- Stage 1 Configuration (immutable once Stage 2 begins)  
    target\_length\_min INTEGER NOT NULL, \-- seconds  
    target\_length\_max INTEGER NOT NULL,  
    project\_type TEXT NOT NULL CHECK (project\_type IN ('narrative', 'commercial', 'audio\_visual')),  
    content\_rating TEXT NOT NULL CHECK (content\_rating IN ('G', 'PG', 'PG-13', 'M')),  
    genre TEXT\[\], \-- array of selected genres  
    tonal\_precision TEXT, \-- user's custom tone guidance  
      
    \-- RAG Configuration  
    written\_style\_rag\_id UUID REFERENCES rag\_databases(id),  
    visual\_style\_rag\_id UUID REFERENCES rag\_databases(id),  
      
    \-- Metadata  
    active\_branch\_id UUID, \-- FK added after branches table  
    created\_at TIMESTAMPTZ DEFAULT NOW(),  
    updated\_at TIMESTAMPTZ DEFAULT NOW()  
);

CREATE INDEX idx\_projects\_user ON projects(user\_id);  
CREATE INDEX idx\_projects\_active\_branch ON projects(active\_branch\_id);

---

### **`branches`**

**Purpose**: Git-style version control for non-linear project evolution

CREATE TABLE branches (  
    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    project\_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,  
      
    \-- Branch Identity  
    name TEXT NOT NULL, \-- user-provided or auto-generated ("Main", "Experiment 1")  
    parent\_branch\_id UUID REFERENCES branches(id), \-- NULL for initial "Main" branch  
    branched\_at\_stage INTEGER, \-- stage number where branch diverged  
      
    \-- Branch Metadata  
    commit\_message TEXT, \-- user's "why" for this branch  
    is\_main BOOLEAN DEFAULT FALSE, \-- only one per project  
    created\_at TIMESTAMPTZ DEFAULT NOW(),  
      
    UNIQUE(project\_id, name)  
);

CREATE INDEX idx\_branches\_project ON branches(project\_id);  
CREATE INDEX idx\_branches\_parent ON branches(parent\_branch\_id);

\-- Add FK back to projects for active branch  
ALTER TABLE projects   
ADD CONSTRAINT fk\_active\_branch   
FOREIGN KEY (active\_branch\_id) REFERENCES branches(id);

---

### **`stage_states`**

**Purpose**: Versioned snapshots of each pipeline stage's output

CREATE TABLE stage\_states (  
    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    branch\_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,  
    stage\_number INTEGER NOT NULL CHECK (stage\_number BETWEEN 1 AND 12),  
      
    \-- State Identity  
    version INTEGER NOT NULL DEFAULT 1, \-- increments on regeneration  
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (  
        'draft', 'locked', 'invalidated', 'outdated'  
    )),  
      
    \-- Inheritance Tracking  
    inherited\_from\_stage\_id UUID REFERENCES stage\_states(id), \-- parent stage that fed this one  
    overrides JSONB, \-- explicit field-level overrides applied  
      
    \-- Content Storage (stage-specific data)  
    content JSONB NOT NULL, \-- varies by stage (see Stage Content Schemas below)  
      
    \-- Prompt Engineering  
    prompt\_template\_version TEXT, \-- references versioned prompt  
    final\_prompt TEXT, \-- the exact prompt sent to LLM/API  
      
    \-- Regeneration Context  
    regeneration\_guidance TEXT, \-- user's "why" for regeneration  
      
    \-- Metadata  
    created\_at TIMESTAMPTZ DEFAULT NOW(),  
    created\_by UUID REFERENCES auth.users(id),  
      
    UNIQUE(branch\_id, stage\_number, version)  
);

CREATE INDEX idx\_stage\_states\_branch ON stage\_states(branch\_id);  
CREATE INDEX idx\_stage\_states\_stage ON stage\_states(stage\_number);  
CREATE INDEX idx\_stage\_states\_status ON stage\_states(status);  
CREATE INDEX idx\_stage\_states\_inherited ON stage\_states(inherited\_from\_stage\_id);

**Stage-Specific `content` JSONB Schemas**:

// Stage 2: Treatment  
{  
    prose\_treatment: string,  
    selected\_variant: number // which of 3 AI variants was chosen  
}

// Stage 3: Beat Sheet  
{  
    beats: Array\<{  
        id: string,  
        order: number,  
        text: string,  
        manually\_edited: boolean  
    }\>,  
    sync\_status: 'synced' | 'out\_of\_date\_with\_script'  
}

// Stage 4: Master Script  
{  
    formatted\_script: string, // full screenplay text  
    scenes: Array\<{  
        id: string,  
        slug: string,  
        heading: string,  
        content: string  
    }\>,  
    sync\_status: 'synced' | 'out\_of\_date\_with\_beats'  
}

// Stage 5: Global Assets  
{  
    locked\_visual\_style\_rag\_id: UUID,  
    assets\_locked: boolean  
}

// Stage 7: Shot List (scene-specific)  
{  
    scene\_id: UUID,  
    shots: Array\<{  
        shot\_id: string,  
        duration: number, // seconds  
        dialogue: string,  
        action: string,  
        characters: Array\<{name: string, prominence: string}\>,  
        setting: string,  
        camera: string,  
        continuity\_flags: string\[\]  
    }\>  
}

---

## `stage_locks` — Explicit Authority & Immutability

### Purpose (plain English)

This table makes **“locking a stage” a first-class, auditable event**, instead of an implicit status flag.

It answers:

* *Who* locked the stage

* *Why* it was locked

* *When* it became immutable

This directly enforces PRD §§3.1–3.5 and §§7.1–7.3.

## **Table Definition**

`CREATE TABLE stage_locks (`

    `id UUID PRIMARY KEY DEFAULT gen_random_uuid(),`

    `stage_state_id UUID NOT NULL`

        `REFERENCES stage_states(id)`

        `ON DELETE CASCADE,`

    `locked_by UUID`

        `REFERENCES auth.users(id),`

    `lock_reason TEXT NOT NULL,`

    `locked_at TIMESTAMPTZ DEFAULT NOW(),`

    `UNIQUE(stage_state_id)`

`);`

## **Enforced Behavior**

* A stage can only be locked **once**

* Lock metadata cannot be overwritten

* Locking is orthogonal to `status`

* Future multi-user workflows are supported

---

### **`scenes`**

**Purpose**: Scene-level organization within a branch

CREATE TABLE scenes (  
    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    branch\_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,  
      
    \-- Scene Identity  
    scene\_number INTEGER NOT NULL,  
    slug TEXT NOT NULL, \-- e.g., "INT. KITCHEN \- DAY"  
      
    \-- Script Content (extracted from Stage 4\)  
    script\_excerpt TEXT NOT NULL, \-- the actual scene script text  
      
    \-- Production Status  
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (  
        'draft', 'shot\_list\_ready', 'frames\_locked', 'video\_complete', 'outdated', 'continuity\_broken'  
    )),  
      
    \-- Continuity Tracking  
    end\_state\_summary TEXT, \-- prose description of final moment  
    end\_frame\_id UUID, \-- FK to frames table (added below)  
      
    \-- Metadata  
    created\_at TIMESTAMPTZ DEFAULT NOW(),  
      
    UNIQUE(branch\_id, scene\_number)  
);

CREATE INDEX idx\_scenes\_branch ON scenes(branch\_id);  
CREATE INDEX idx\_scenes\_status ON scenes(status);

---

### **`shots`**

**Purpose**: 8-second atomic video units

CREATE TABLE shots (  
    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    scene\_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,  
      
    \-- Shot Identity  
    shot\_id TEXT NOT NULL, \-- e.g., "3A", "3B"  
    shot\_order INTEGER NOT NULL,  
    duration INTEGER DEFAULT 8, \-- seconds  
      
    \-- Content (from Stage 7 Shot List)  
    dialogue TEXT,  
    action TEXT NOT NULL,  
    characters JSONB NOT NULL, \-- \[{name, prominence}\]  
    setting TEXT NOT NULL,  
    camera\_spec TEXT NOT NULL,  
    continuity\_flags TEXT\[\],  
      
    \-- Prompts (from Stage 9\)  
    frame\_prompt TEXT, \-- for image generation  
    video\_prompt TEXT, \-- for video generation  
    requires\_end\_frame BOOLEAN DEFAULT TRUE, \-- false for Sora-style models  
      
    \-- Production Status  
    frames\_approved BOOLEAN DEFAULT FALSE,  
    video\_approved BOOLEAN DEFAULT FALSE,  
      
    created\_at TIMESTAMPTZ DEFAULT NOW(),  
      
    UNIQUE(scene\_id, shot\_id)  
);

CREATE INDEX idx\_shots\_scene ON shots(scene\_id);  
CREATE INDEX idx\_shots\_order ON shots(scene\_id, shot\_order);

---

### **`frames`**

**Purpose**: Anchor frames for video generation

CREATE TABLE frames (  
    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    shot\_id UUID NOT NULL REFERENCES shots(id) ON DELETE CASCADE,  
      
    \-- Frame Identity  
    frame\_type TEXT NOT NULL CHECK (frame\_type IN ('start', 'end')),  
      
    \-- Generation Context  
    prompt TEXT NOT NULL, \-- exact prompt sent to Nano Banana  
    visual\_style\_rag\_id UUID REFERENCES rag\_databases(id),  
    prior\_frame\_id UUID REFERENCES frames(id), \-- for continuity seeding  
      
    \-- Storage  
    image\_url TEXT NOT NULL, \-- Supabase Storage path  
      
    \-- Approval  
    approved BOOLEAN DEFAULT FALSE,  
    regeneration\_count INTEGER DEFAULT 0,  
      
    \-- Metadata  
    created\_at TIMESTAMPTZ DEFAULT NOW(),  
    cost\_credits NUMERIC(10,4) \-- cost in API credits  
);

CREATE INDEX idx\_frames\_shot ON frames(shot\_id);  
CREATE INDEX idx\_frames\_prior ON frames(prior\_frame\_id);

\-- Add FK back to scenes for end\_frame\_id  
ALTER TABLE scenes  
ADD CONSTRAINT fk\_end\_frame  
FOREIGN KEY (end\_frame\_id) REFERENCES frames(id);

---

### **`videos`**

**Purpose**: Generated video clips

CREATE TABLE videos (  
    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    shot\_id UUID NOT NULL REFERENCES shots(id) ON DELETE CASCADE,  
      
    \-- Generation Context  
    start\_frame\_id UUID NOT NULL REFERENCES frames(id),  
    end\_frame\_id UUID REFERENCES frames(id), \-- NULL if start-frame-only  
    video\_prompt TEXT NOT NULL,  
      
    \-- Storage  
    video\_url TEXT NOT NULL, \-- Supabase Storage path  
      
    \-- Approval & Status  
    approved BOOLEAN DEFAULT FALSE,  
    status TEXT DEFAULT 'rendering' CHECK (status IN (  
        'queued', 'rendering', 'complete', 'failed'  
    )),  
    error\_message TEXT,  
      
    \-- Metadata  
    created\_at TIMESTAMPTZ DEFAULT NOW(),  
    completed\_at TIMESTAMPTZ,  
    cost\_credits NUMERIC(10,4),  
      
    \-- Version tracking (multiple attempts per shot)  
    version INTEGER DEFAULT 1  
);

CREATE INDEX idx\_videos\_shot ON videos(shot\_id);  
CREATE INDEX idx\_videos\_status ON videos(status);

---

## **Asset Management**

### **`global_assets`**

**Purpose**: Reusable master assets across all projects

CREATE TABLE global\_assets (  
    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    user\_id UUID NOT NULL REFERENCES auth.users(id),  
      
    \-- Asset Identity  
    name TEXT NOT NULL, \-- "John Doe", "Detective's Office"  
    asset\_type TEXT NOT NULL CHECK (asset\_type IN ('character', 'prop', 'location')),  
      
    \-- Visual Definition  
    description TEXT NOT NULL, \-- master descriptive text  
    image\_key\_url TEXT, \-- Nano Banana generated reference image  
    visual\_style\_rag\_id UUID REFERENCES rag\_databases(id),  
      
    \-- Voice Profile (Stretch Goal)  
    voice\_profile\_id TEXT, \-- ElevenLabs ID or similar  
      
    \-- Metadata  
    created\_at TIMESTAMPTZ DEFAULT NOW(),  
    promoted\_from\_project\_id UUID REFERENCES projects(id) \-- NULL if created directly  
);

CREATE INDEX idx\_global\_assets\_user ON global\_assets(user\_id);  
CREATE INDEX idx\_global\_assets\_type ON global\_assets(asset\_type);

---

### **`project_assets`**

**Purpose**: Project-specific asset definitions (Stage 5\)

CREATE TABLE project\_assets (  
    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    project\_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,  
      
    \-- Source Tracking  
    global\_asset\_id UUID REFERENCES global\_assets(id), \-- NULL if created fresh  
      
    \-- Asset Identity  
    name TEXT NOT NULL,  
    asset\_type TEXT NOT NULL CHECK (asset\_type IN ('character', 'prop', 'location')),  
      
    \-- Visual Definition  
    description TEXT NOT NULL,  
    image\_key\_url TEXT NOT NULL,  
    visual\_style\_rag\_id UUID REFERENCES rag\_databases(id),  
      
    \-- Status  
    locked BOOLEAN DEFAULT FALSE, \-- Stage 5 gatekeeper  
      
    created\_at TIMESTAMPTZ DEFAULT NOW()  
);

CREATE INDEX idx\_project\_assets\_project ON project\_assets(project\_id);  
CREATE INDEX idx\_project\_assets\_global ON project\_assets(global\_asset\_id);

---

### **`scene_asset_instances`**

**Purpose**: Scene-specific asset states (Stage 8\)

CREATE TABLE scene\_asset\_instances (  
    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    scene\_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,  
    project\_asset\_id UUID NOT NULL REFERENCES project\_assets(id),  
      
    \-- Stateful Modification  
    description\_override TEXT, \-- NULL if unchanged from project asset  
    image\_key\_url TEXT, \-- regenerated if description changed  
      
    \-- Status Metadata Tags (NEW)  
    status\_tags TEXT\[\], \-- e.g., \['muddy', 'torn\_shirt', 'bloody'\]  
    carry\_forward BOOLEAN DEFAULT TRUE, \-- should tags persist to next scene?  
      
    \-- Inheritance Tracking  
    inherited\_from\_scene\_id UUID REFERENCES scenes(id), \-- prior scene's instance  
      
    created\_at TIMESTAMPTZ DEFAULT NOW(),  
      
    UNIQUE(scene\_id, project\_asset\_id)  
);

CREATE INDEX idx\_scene\_instances\_scene ON scene\_asset\_instances(scene\_id);  
CREATE INDEX idx\_scene\_instances\_asset ON scene\_asset\_instances(project\_asset\_id);  
CREATE INDEX idx\_scene\_instances\_inherited ON scene\_asset\_instances(inherited\_from\_scene\_id);

---

## **RAG & Retrieval Tracking**

### **`rag_databases`**

**Purpose**: User-uploaded style vector databases

CREATE TABLE rag\_databases (  
    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    user\_id UUID NOT NULL REFERENCES auth.users(id),  
      
    \-- Database Identity  
    name TEXT NOT NULL,  
    db\_type TEXT NOT NULL CHECK (db\_type IN ('written\_style', 'visual\_style')),  
      
    \-- Storage  
    embedding\_version TEXT NOT NULL, \-- e.g., "text-embedding-3-small"  
    document\_count INTEGER DEFAULT 0,  
      
    created\_at TIMESTAMPTZ DEFAULT NOW()  
);

CREATE INDEX idx\_rag\_user ON rag\_databases(user\_id);

---

### **`rag_documents`**

**Purpose**: Individual chunks in RAG databases (uses pgvector)

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE rag\_documents (  
    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    rag\_db\_id UUID NOT NULL REFERENCES rag\_databases(id) ON DELETE CASCADE,  
      
    \-- Content  
    text\_content TEXT NOT NULL,  
    embedding vector(1536), \-- OpenAI ada-002 or equivalent  
      
    \-- Metadata for Scoped Retrieval  
    metadata JSONB, \-- e.g., {scene\_id, character\_id, verbosity\_flag}  
      
    created\_at TIMESTAMPTZ DEFAULT NOW()  
);

CREATE INDEX idx\_rag\_docs\_db ON rag\_documents(rag\_db\_id);  
CREATE INDEX idx\_rag\_docs\_embedding ON rag\_documents USING hnsw (embedding vector\_cosine\_ops)  
    WITH (m \= 16, ef\_construction \= 64); \-- tuned HNSW parameters

---

### **`rag_retrievals`**

**Purpose**: Audit log of RAG queries per generation

CREATE TABLE rag\_retrievals (  
    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    stage\_state\_id UUID NOT NULL REFERENCES stage\_states(id) ON DELETE CASCADE,  
      
    \-- Query Context  
    query\_embedding vector(1536),  
    retrieval\_scope TEXT, \-- 'global\_only', 'scene\_only', 'combined'  
      
    \-- Results  
    retrieved\_doc\_ids UUID\[\], \-- array of rag\_documents.id  
    relevance\_scores NUMERIC\[\],  
      
    created\_at TIMESTAMPTZ DEFAULT NOW()  
);

CREATE INDEX idx\_rag\_retrievals\_stage ON rag\_retrievals(stage\_state\_id);

---

## `override_violations` — Contract Enforcement & Audit Trail

## **Purpose (plain English)**

This table records **attempted violations of the Inheritance Contract**.

It does *not* block execution by itself — it **documents when creative law was broken or nearly broken**.

It answers:

* What field was violated

* At which stage

* With what attempted value

* Under which rule

## **Table Definition**

`CREATE TABLE override_violations (`  
    `id UUID PRIMARY KEY DEFAULT gen_random_uuid(),`

    `stage_state_id UUID NOT NULL`  
        `REFERENCES stage_states(id)`  
        `ON DELETE CASCADE,`

    `field_name TEXT NOT NULL,`  
    `attempted_value TEXT,`  
      
    `violation_type TEXT NOT NULL CHECK (`  
        `violation_type IN (`  
            `'forbidden_override',`  
            `'authority_escalation',`  
            `'style_lock_violation',`  
            `'tone_violation'`  
        `)`  
    `),`

    `detected_at TIMESTAMPTZ DEFAULT NOW()`  
`);`

## **Enforced Behavior**

* Violations are immutable records

* Enables post-mortem debugging of creative drift

* Allows future analytics (“where do users fight the system?”)

---

# Cost Modeling & Estimation

## `cost_models` — Predictable, Auditable Cost Estimation

## **Purpose (plain English)**

This table separates:

* **Cost rules** (what *should* happen)  
   from

* **Cost outcomes** (what *did* happen)

This directly supports PRD §4.6 (“The Credit Check”).

## **Table Definition**

`CREATE TABLE cost_models (`  
    `id UUID PRIMARY KEY DEFAULT gen_random_uuid(),`

    `model_name TEXT NOT NULL, -- e.g. "Veo3", "Nano Banana"`  
    `stage_number INTEGER NOT NULL CHECK (stage_number BETWEEN 1 AND 12),`

    `base_cost NUMERIC(10,4) NOT NULL,`  
    `per_unit_cost NUMERIC(10,4),`

    `unit_type TEXT CHECK (`  
        `unit_type IN ('scene', 'shot', 'frame', 'video', 'token')`  
    `),`

    `created_at TIMESTAMPTZ DEFAULT NOW(),`

    `UNIQUE(model_name, stage_number)`  
`);`

## **Optional (but recommended) link**

Add this nullable FK to `invalidation_logs`:

`ALTER TABLE invalidation_logs`  
`ADD COLUMN cost_model_id UUID`  
    `REFERENCES cost_models(id);`  
---

## **Invalidation & Cost Tracking**

### **`invalidation_logs`**

**Purpose**: Record of cascading invalidations from upstream changes

CREATE TABLE invalidation\_logs (  
    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
      
    \-- Source of Change  
    triggering\_stage\_state\_id UUID NOT NULL REFERENCES stage\_states(id),  
    branch\_id UUID NOT NULL REFERENCES branches(id),  
      
    \-- Invalidation Scope  
    invalidation\_type TEXT NOT NULL CHECK (invalidation\_type IN (  
        'global', \-- affects all downstream stages  
        'local\_scene', \-- affects current scene only  
        'continuity\_break' \-- affects subsequent scenes  
    )),  
      
    \-- Affected Artifacts  
    invalidated\_stage\_states UUID\[\], \-- array of stage\_states.id  
    invalidated\_scenes UUID\[\], \-- array of scenes.id  
      
    \-- Cost Implications  
    estimated\_regen\_cost NUMERIC(10,2), \-- in credits  
    warning\_acknowledged BOOLEAN DEFAULT FALSE,  
      
    created\_at TIMESTAMPTZ DEFAULT NOW()  
);

CREATE INDEX idx\_invalidation\_branch ON invalidation\_logs(branch\_id);  
CREATE INDEX idx\_invalidation\_trigger ON invalidation\_logs(triggering\_stage\_state\_id);

---

## **State Transition Matrix**

### **Stage 1-5: Global Context (Immutable After Locking)**

| User Action | Trigger Condition | Branch Behavior | Invalidation Cascade | Cost Implications |
| ----- | ----- | ----- | ----- | ----- |
| **Edit Stage 1 Config** | After Stage 2 started | ❌ **Blocked** | N/A | N/A |
| **Regenerate Treatment (Stage 2\)** | From updated guidance | ✅ Same branch, new version | None (upstream of all) | Low (LLM only) |
| **Edit Beat Sheet (Stage 3\)** | Manual text edit | ✅ Same branch | **Flags** Stage 4 as "out of date" | None immediate |
| **Regenerate Master Script (Stage 4\)** from edited Beat Sheet | User clicks "Regenerate" | 🔀 **Mandatory new branch** | **Global**: All Phase B (Stages 5-12) on new branch marked `invalidated` | High (entire Phase B) |
| **Manual edit Stage 4 Script** | Direct text edit | ✅ Same branch (optional branch recommended) | **Flags** Stage 3 Beat Sheet as "out of date" \+ **Local**: All scenes marked `outdated` | Medium-High (scene videos) |
| **Lock Stage 5 Assets** | User confirms all image keys | ✅ Stage locked | None | N/A |

---

### **Stage 6-12: Scene Production (Cascading Continuity)**

| User Action | Trigger Condition | Branch Behavior | Invalidation Cascade | Cost Implications |
| ----- | ----- | ----- | ----- | ----- |
| **Edit Shot List (Stage 7\)** | Scene N active | ✅ Same branch | **Local Scene**: Scene N video marked `outdated` | Medium (scene only) |
| **Edit Stage 8 Asset** | Scene N active | ✅ Same branch | **Local Scene**: Scene N frames/video invalidated | Medium (frames \+ video) |
| **Regenerate Frame (Stage 10\)** | Failed continuity check | ✅ Same branch | **Scene N** video invalidated \+ **Continuity Break**: Scenes N+1, N+2... marked `continuity_broken` | High (cascades downstream) |
| **Approve Shot Video (Stage 12\)** | User clicks "Complete Scene" | ✅ Scene marked `video_complete` | None (terminal stage) | N/A |
| **Return to Stage 7 from Stage 12** | Narrative/audio issue | ✅ Same branch | **Local Scene**: All downstream artifacts (Stages 8-12) for Scene N invalidated | High (full scene regen) |

---

### **Special Cases**

#### **Status Metadata Tag Propagation**

\-- When entering Scene N+1, check for tags from Scene N  
SELECT sai.status\_tags, sai.carry\_forward  
FROM scene\_asset\_instances sai  
JOIN scenes s ON sai.scene\_id \= s.id  
WHERE s.scene\_number \= (SELECT scene\_number \- 1 FROM scenes WHERE id \= :current\_scene\_id)  
  AND sai.carry\_forward \= TRUE;

\-- If tags exist, prompt user:  
\-- "Character 'John Doe' has status 'muddy' from Scene N. Carry forward to Scene N+1?"

#### **Promote to Global Asset**

\-- When user clicks "Promote" in Artifact Vault  
INSERT INTO global\_assets (user\_id, name, asset\_type, description, image\_key\_url, promoted\_from\_project\_id)  
SELECT   
    :user\_id,  
    pa.name,  
    pa.asset\_type,  
    pa.description,  
    pa.image\_key\_url,  
    pa.project\_id  
FROM project\_assets pa  
WHERE pa.id \= :project\_asset\_id;

\-- Link back to source  
UPDATE project\_assets   
SET global\_asset\_id \= (SELECT id FROM global\_assets WHERE promoted\_from\_project\_id \= :project\_id AND name \= :asset\_name)  
WHERE id \= :project\_asset\_id;

---

## **Invalidation Rules: Detailed Logic**

### **Rule 1: Beat Sheet Edit (Stage 3\) → Script (Stage 4\)**

**Trigger**: User manually edits beat text in Stage 3\.

**Behavior**:

1. Update `stage_states.content` for Stage 3 (new version)  
2. Set Stage 4 `stage_states.status = 'outdated'`  
3. Set Stage 3 `content.sync_status = 'out_of_date_with_script'`  
4. **No automatic regeneration**  
5. **No new branch** (edit is non-destructive)

**UI Display**: Yellow flag in Stage 3: "Not Up-to-Date with Current Script"

---

### **Rule 2: Script Regeneration (Stage 4\) from Edited Beat Sheet**

**Trigger**: User clicks "Regenerate Master Script" after editing Stage 3\.

**Behavior**:

1. **Force branch creation** (system-initiated modal)  
2. User provides branch name \+ commit message

Create new row in `branches` table:  
 INSERT INTO branches (project\_id, name, parent\_branch\_id, branched\_at\_stage, commit\_message)VALUES (:project\_id, :branch\_name, :current\_branch\_id, 4, :commit\_message);

3.   
4. Copy Stage 1-3 state to new branch  
5. Generate new Stage 4 on new branch

**Mark all Phase B stages (5-12) on new branch as `invalidated`**:  
 INSERT INTO invalidation\_logs (triggering\_stage\_state\_id, branch\_id, invalidation\_type, invalidated\_stage\_states)VALUES (    :new\_stage\_4\_id,    :new\_branch\_id,    'global',    ARRAY(SELECT id FROM stage\_states WHERE branch\_id \= :new\_branch\_id AND stage\_number BETWEEN 5 AND 12));

6. 

**Cost Calculation**:

\-- Estimate regeneration cost for invalidated stages  
SELECT SUM(  
    CASE   
        WHEN stage\_number \= 10 THEN (shot\_count \* 2 \* :nano\_banana\_cost\_per\_frame)  
        WHEN stage\_number \= 12 THEN (shot\_count \* :veo3\_cost\_per\_shot)  
        ELSE 0  
    END  
) as estimated\_cost  
FROM (  
    SELECT stage\_number, COUNT(DISTINCT shot\_id) as shot\_count  
    FROM stage\_states ss  
    JOIN shots s ON s.scene\_id IN (SELECT id FROM scenes WHERE branch\_id \= :new\_branch\_id)  
    WHERE ss.id \= ANY(:invalidated\_stage\_states)  
    GROUP BY stage\_number  
) costs;

---

### **Rule 3: Manual Script Edit (Stage 4\) → Downstream Cascades**

**Trigger**: User directly edits script text in Stage 4\.

**Behavior**:

1. Update `stage_states.content` for Stage 4 (new version)  
2. Set Stage 3 Beat Sheet `sync_status = 'out_of_date_with_beats'`

**Mark all scenes as `outdated`**:  
 UPDATE scenes SET status \= 'outdated' WHERE branch\_id \= :current\_branch\_id;

3.   
4. **Continuity break cascade**: All scenes after first edited scene marked `continuity_broken`  
5. Insert `invalidation_logs` entry with `invalidation_type = 'local_scene'`

**UI Warning**: Modal before save:

"This edit will invalidate all approved videos. Estimated regen cost: $X.XX. Proceed?"

---

### **Rule 4: Frame Regeneration (Stage 10\) → Scene Continuity Break**

**Trigger**: User regenerates a start or end frame in Scene N.

**Behavior**:

1. New frame row in `frames` table  
2. Mark Scene N video as `outdated`

**Break continuity for Scene N+1**:  
 UPDATE scenes SET status \= 'continuity\_broken'WHERE branch\_id \= :current\_branch\_id   AND scene\_number \> :scene\_n\_number;

3.   
4. Update `scenes.end_frame_id` for Scene N  
5. Insert `invalidation_logs` with `invalidation_type = 'continuity_break'`

---

## **Query Patterns**

### **Get Active Branch State**

SELECT   
    ss.stage\_number,  
    ss.status,  
    ss.content,  
    ss.created\_at  
FROM stage\_states ss  
JOIN branches b ON ss.branch\_id \= b.id  
WHERE b.id \= (SELECT active\_branch\_id FROM projects WHERE id \= :project\_id)  
ORDER BY ss.stage\_number ASC;

### **Get Scene Production Status**

SELECT   
    s.scene\_number,  
    s.slug,  
    s.status,  
    COUNT(DISTINCT sh.id) as total\_shots,  
    COUNT(DISTINCT v.id) FILTER (WHERE v.approved \= TRUE) as approved\_videos  
FROM scenes s  
LEFT JOIN shots sh ON sh.scene\_id \= s.id  
LEFT JOIN videos v ON v.shot\_id \= sh.id  
WHERE s.branch\_id \= :branch\_id  
GROUP BY s.id  
ORDER BY s.scene\_number;

### **Get Asset Lineage**

WITH RECURSIVE asset\_history AS (  
    \-- Base case: current scene instance  
    SELECT   
        sai.id,  
        sai.scene\_id,  
        sai.description\_override,  
        sai.status\_tags,  
        sai.inherited\_from\_scene\_id,  
        1 as depth  
    FROM scene\_asset\_instances sai  
    WHERE sai.scene\_id \= :current\_scene\_id  
      AND sai.project\_asset\_id \= :asset\_id  
      
    UNION ALL  
      
    \-- Recursive case: trace back through inheritance chain  
    SELECT   
        sai.id,  
        sai.scene\_id,  
        sai.description\_override,  
        sai.status\_tags,  
        sai.inherited\_from\_scene\_id,  
        ah.depth \+ 1  
    FROM scene\_asset\_instances sai  
    JOIN asset\_history ah ON sai.scene\_id \= ah.inherited\_from\_scene\_id  
    WHERE ah.depth \< 10 \-- prevent infinite loops  
)  
SELECT \* FROM asset\_history ORDER BY depth DESC;

### **Calculate Invalidation Cost**

SELECT   
    il.invalidation\_type,  
    il.estimated\_regen\_cost,  
    COUNT(scenes.id) as affected\_scenes,  
    ARRAY\_AGG(DISTINCT ss.stage\_number) as affected\_stages  
FROM invalidation\_logs il  
LEFT JOIN LATERAL UNNEST(il.invalidated\_scenes) AS scene\_id ON TRUE  
LEFT JOIN scenes ON scenes.id \= scene\_id  
LEFT JOIN LATERAL UNNEST(il.invalidated\_stage\_states) AS stage\_state\_id ON TRUE  
LEFT JOIN stage\_states ss ON ss.id \= stage\_state\_id  
WHERE il.branch\_id \= :branch\_id  
  AND il.warning\_acknowledged \= FALSE  
GROUP BY il.id;

---

## **Constraints & Validation**

### **Business Rules Enforced by DB**

\-- Only one main branch per project  
CREATE UNIQUE INDEX idx\_one\_main\_branch   
ON branches (project\_id)   
WHERE is\_main \= TRUE;

\-- Stage states must be sequential  
CREATE OR REPLACE FUNCTION check\_stage\_sequence()   
RETURNS TRIGGER AS $$  
BEGIN  
    IF NEW.stage\_number \> 1 THEN  
        IF NOT EXISTS (  
            SELECT 1 FROM stage\_states   
            WHERE branch\_id \= NEW.branch\_id   
              AND stage\_number \= NEW.stage\_number \- 1  
              AND status IN ('locked', 'invalidated')  
        ) THEN  
            RAISE EXCEPTION 'Cannot create stage % without completing stage %',   
                NEW.stage\_number, NEW.stage\_number \- 1;  
        END IF;  
    END IF;  
    RETURN NEW;  
END;  
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce\_stage\_sequence  
BEFORE INSERT ON stage\_states  
FOR EACH ROW EXECUTE FUNCTION check\_stage\_sequence();

\-- Status tags can only be set in Stage 8+  
CREATE OR REPLACE FUNCTION validate\_status\_tags()  
RETURNS TRIGGER AS $$  
BEGIN  
    IF array\_length(NEW.status\_tags, 1\) \> 0 THEN  
        IF NOT EXISTS (  
            SELECT 1 FROM scenes s  
            WHERE s.id \= NEW.scene\_id   
              AND s.status IN ('shot\_list\_ready', 'frames\_locked', 'video\_complete')  
        ) THEN  
            RAISE EXCEPTION 'Status tags can only be applied after Stage 7';  
        END IF;  
    END IF;  
    RETURN NEW;  
END;  
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate\_tags  
BEFORE INSERT OR UPDATE ON scene\_asset\_instances  
FOR EACH ROW EXECUTE FUNCTION validate\_status\_tags();

---

# **ADDITIONAL CRITICAL CONSTRAINTS (these are more important than tables)**

These are **PRD-mandated invariants** that must not rely on application code.

## **i. Enforce upstream → downstream directionality**

### **Constraint**

`CREATE OR REPLACE FUNCTION enforce_stage_direction()`  
`RETURNS TRIGGER AS $$`  
`BEGIN`  
    `IF NEW.inherited_from_stage_id IS NOT NULL THEN`  
        `IF (`  
            `SELECT stage_number`  
            `FROM stage_states`  
            `WHERE id = NEW.inherited_from_stage_id`  
        `) >= NEW.stage_number THEN`  
            `RAISE EXCEPTION`  
                `'Stage % cannot inherit from same or downstream stage',`  
                `NEW.stage_number;`  
        `END IF;`  
    `END IF;`  
    `RETURN NEW;`  
`END;`  
`$$ LANGUAGE plpgsql;`

`CREATE TRIGGER enforce_stage_direction`  
`BEFORE INSERT OR UPDATE ON stage_states`  
`FOR EACH ROW EXECUTE FUNCTION enforce_stage_direction();`

## **ii. Remove creative authority from Stages 11–12**

### **Constraint**

`CREATE OR REPLACE FUNCTION forbid_late_stage_overrides()`  
`RETURNS TRIGGER AS $$`  
`BEGIN`  
    `IF NEW.stage_number >= 11 AND NEW.overrides IS NOT NULL THEN`  
        `RAISE EXCEPTION`  
            `'Stages 11–12 may not define creative overrides';`  
    `END IF;`  
    `RETURN NEW;`  
`END;`  
`$$ LANGUAGE plpgsql;`

`CREATE TRIGGER forbid_late_stage_overrides`  
`BEFORE INSERT OR UPDATE ON stage_states`  
`FOR EACH ROW EXECUTE FUNCTION forbid_late_stage_overrides();`

## **iii. Enforce monotonic locking (no unlock without branching)**

### **Constraint**

`CREATE OR REPLACE FUNCTION prevent_unlocking()`  
`RETURNS TRIGGER AS $$`  
`BEGIN`  
    `IF OLD.status = 'locked' AND NEW.status <> 'locked' THEN`  
        `RAISE EXCEPTION`  
            `'Locked stages cannot be reverted; create a new branch instead';`  
    `END IF;`  
    `RETURN NEW;`  
`END;`  
`$$ LANGUAGE plpgsql;`

`CREATE TRIGGER prevent_unlocking`  
`BEFORE UPDATE ON stage_states`  
`FOR EACH ROW EXECUTE FUNCTION prevent_unlocking();`

---

## **Performance Considerations**

### **Indexing Strategy**

* **Hot path queries**: Branch state, scene status, shot production  
* **HNSW tuning**: `m=16, ef_construction=64` balances speed/accuracy for RAG  
* **Partial indexes**: Only index active branches for write-heavy operations

### **Archival Strategy**

\-- Move completed branches to cold storage after 90 days  
CREATE TABLE archived\_branches (LIKE branches INCLUDING ALL);  
CREATE OR REPLACE FUNCTION archive\_old\_branches()   
RETURNS void AS $$   
BEGIN   
WITH archived AS (   
DELETE FROM branches   
WHERE created\_at \< NOW() \- INTERVAL '90 days'  
AND is\_main \= FALSE  
AND NOT EXISTS (SELECT 1 FROM projects WHERE active\_branch\_id \= [branches.id](http://branches.id))  
RETURNING \*   
)   
INSERT INTO archived\_branches SELECT \* FROM archived;  
END;  
$$ LANGUAGE plpgsql;

\---

\#\# Migration Path

\#\#\# From Legacy Schema  
If migrating from a simpler schema:  
1\. Create \`branches\` table with one "Main" branch per project  
2\. Migrate existing \`stage\_states\` to point to Main branch  
3\. Backfill \`inherited\_from\_stage\_id\` using timestamp ordering  
4\. Generate \`invalidation\_logs\` retroactively from status changes

\#\#\# Adding New Stages  
\`\`\`sql  
\-- To add Stage 13 (e.g., "Audio Mixing"):  
ALTER TABLE stage\_states   
DROP CONSTRAINT stage\_states\_stage\_number\_check;

ALTER TABLE stage\_states   
ADD CONSTRAINT stage\_states\_stage\_number\_check   
CHECK (stage\_number BETWEEN 1 AND 13);  
\`\`\`

\---

\#\# Summary

This schema provides:

✅ \*\*Non-destructive branching\*\* with full audit trail    
✅ \*\*Deterministic invalidation\*\* with cost forecasting    
✅ \*\*Explicit inheritance tracking\*\* at every stage    
✅ \*\*Asset promotion\*\* from project → global scope    
✅ \*\*Status tag continuity\*\* across scene boundaries    
✅ \*\*RAG retrieval logging\*\* for debugging creative drift    
✅ \*\*Performance optimization\*\* via tuned indexes and archival

All state transitions are logged, reversible, and traceable through LangSmith integration points.

