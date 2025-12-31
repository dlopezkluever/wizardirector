# Golden Test Evaluation Framework

## Overview

This framework provides standardized test cases to evaluate the correctness and quality of AI agent outputs across all 12 stages of the Narrative-to-AI-Film Pipeline. Each test case exercises different aspects of the pipeline, and success criteria are defined for every stage to ensure technical accuracy before burning credits on video generation.

## Test Case Selection Strategy

Three test cases were selected to cover the pipeline's full range of capabilities:

1. **Simple Dialogue Scene** - Tests fundamental narrative structure and character continuity
2. **Complex Action Scene** - Tests visual complexity, continuity, and technical shot breakdown
3. **Audio-to-Video Podcast** - Tests audio-driven visual generation and timestamp synchronization

## Test Case 1: Simple Dialogue Scene

**Input Narrative:** Two characters (Alice and Bob) having a conversation in a coffee shop about a job interview. Alice is nervous, Bob is encouraging. The scene establishes their relationship and Alice's career aspirations.

**Project Parameters:**
- Target Length: 2:00-3:00 minutes
- Content Rating: PG
- Genre: Drama
- Project Type: Narrative Short Film

### Phase A Success Criteria

#### Stage 1: Input Modes & RAG Initialization
**Success Definition:**
- Correctly identifies 1-2 scenes from the input
- Selects appropriate Written Style RAG (conversational, character-driven)
- Project parameters are properly configured and validated

#### Stage 2: Treatment Generation (Iterative Prose)
**Success Definition:**
- Generates exactly 3 distinct treatment variants
- Each treatment contains 2-3 scenes with clear character arcs
- Prose establishes Alice's nervousness and Bob's supportive role
- Treatments are between 800-1200 words each
- Dialogue hints are present but not fully scripted

#### Stage 3: The Beat Sheet (Structural Anchor & Loop)
**Success Definition:**
- Extracts 8-12 beats covering the conversation arc
- Beats follow proper narrative structure: setup → rising tension → resolution
- Beat 1-2: Establish setting and characters
- Beat 3-6: Dialogue exchange showing character dynamics
- Beat 7-8: Emotional resolution
- Each beat is 1-3 sentences, action-oriented

#### Stage 4: The Descriptive Master Script (Finalized Narrative)
**Success Definition:**
- Generates 1 scene in proper screenplay format
- Scene heading: INT. COFFEE SHOP - DAY
- Character names in ALL CAPS before dialogue
- Action lines are visually descriptive (character postures, expressions, setting details)
- Dialogue is natural, reveals character personalities
- Script is 2-3 pages when formatted
- Contains explicit visual details for AI generation

#### Stage 5: Global Asset Definition & Style Lock
**Success Definition:**
- Extracts exactly 2 characters: ALICE (nervous professional) and BOB (supportive friend)
- Extracts 3-5 props: coffee cups, table, chairs, coffee shop elements
- Extracts 1 setting: coffee shop interior
- Generates appropriate image keys for each asset
- Visual Style RAG selection is photorealistic/character-focused
- Master descriptions include age, appearance, clothing details

### Phase B Success Criteria

#### Stage 6: The "Script Hub" & Scene Cycle
**Success Definition:**
- Displays 1 scene in hub
- Scene shows "Draft" status initially
- Correctly parses scene slug and summary
- No dependency warnings (first scene)

#### Stage 7: The Technical Shot List (Granular Breakdown & Control)
**Success Definition:**
- Generates 15-20 shots of exactly 8 seconds each
- Shots alternate between MEDIUM SHOTS for dialogue and CLOSE-UPS for emotional beats
- Dialogue is properly distributed across shots
- Camera directions are technically specific (MS, CU, etc.)
- Character prominence is correctly tagged (foreground/background)
- Total duration matches target length

#### Stage 8: Visual & Character Definition (Asset Assembly)
**Success Definition:**
- Correctly identifies both characters as relevant
- Alice: nervous posture, professional attire (blouse, slacks)
- Bob: relaxed posture, casual attire (button-up, jeans)
- Inherits Master Asset descriptions appropriately
- No modifications needed (simple scene)

#### Stage 9: Prompt Segmentation (The Merger and Formatting)
**Success Definition:**
- Frame prompts include camera specs, character descriptions, setting
- Video prompts focus on dialogue delivery and subtle gestures
- Prompts reference correct character appearances
- Veo3 format includes Audio: section with dialogue
- No visual verbosity in video prompts

#### Stage 10: Frame Generation (The Anchors & Continuity)
**Success Definition:**
- Start frame shows characters seated at table, coffee shop setting
- End frame shows same characters in similar positions
- Character appearances match descriptions (Alice nervous, Bob relaxed)
- Continuity maintained across shot boundaries
- Coffee shop setting consistent

#### Stage 11: Confirmation & Gatekeeping (The Credit Check)
**Success Definition:**
- Displays 15-20 shots with preview images
- Cost calculation is accurate for shot count
- All prompts are visible for review
- No continuity warnings

#### Stage 12: Video Generation, Review & Iteration Loop
**Success Definition:**
- Generated video is exactly 2:00-3:00 minutes
- Dialogue is clearly audible and matches script
- Character movements are natural and continuous
- Visual quality maintains consistency
- No jumps or visual artifacts

---

## Test Case 2: Complex Action Scene

**Input Narrative:** A heist sequence where three characters break into a secure office, navigate laser grids, and retrieve a data drive while avoiding security guards. High-stakes action with precise timing requirements.

**Project Parameters:**
- Target Length: 3:00-4:00 minutes
- Content Rating: PG-13
- Genre: Action/Thriller
- Project Type: Narrative Short Film

### Phase A Success Criteria

#### Stage 1: Input Modes & RAG Initialization
**Success Definition:**
- Identifies complex multi-scene sequence
- Selects technical/action-oriented Written Style RAG
- Project parameters accommodate fast-paced content

#### Stage 2: Treatment Generation (Iterative Prose)
**Success Definition:**
- Generates exactly 3 distinct treatment variants
- Each treatment contains 4-6 interconnected scenes
- Prose establishes clear cause-and-effect action sequences
- Treatments emphasize spatial relationships and timing
- Character roles are clearly defined (leader, tech expert, lookout)

#### Stage 3: The Beat Sheet (Structural Anchor & Loop)
**Success Definition:**
- Extracts 15-25 beats covering the entire heist sequence
- Beats show clear progression: planning → infiltration → obstacles → climax → escape
- Each beat contains specific physical actions
- Timing relationships are established between beats
- Stakes escalate appropriately throughout

#### Stage 4: The Descriptive Master Script (Finalized Narrative)
**Success Definition:**
- Generates 4-6 scenes in proper screenplay format
- Scene headings establish clear spatial progression
- Action lines are highly visual and kinetic
- Technical jargon is appropriate for heist elements
- Character movements are precisely described
- Sound design cues are included (SFX)

#### Stage 5: Global Asset Definition & Style Lock
**Success Definition:**
- Extracts 3 main characters with distinct roles and appearances
- Extracts 8-12 props: data drive, laser equipment, security systems, tools
- Extracts 3-4 settings: exterior building, hallway, office, security room
- Visual Style RAG selection is cinematic/action-oriented
- Image keys show dynamic poses and equipment

### Phase B Success Criteria

#### Stage 6: The "Script Hub" & Scene Cycle
**Success Definition:**
- Displays 4-6 scenes in hub with proper sequencing
- Scenes show correct dependency relationships
- Continuity warnings appear for scenes 2-6 (dependent on scene 1 end state)
- Scene summaries accurately reflect action content

#### Stage 7: The Technical Shot List (Granular Breakdown & Control)
**Success Definition:**
- Generates 25-35 shots of exactly 8 seconds each
- Complex camera work: tracking shots, quick cuts, POV shots
- Shot splitting used appropriately for fast-paced sequences
- Continuity flags properly set for character handoffs, prop exchanges
- Technical camera specifications (DUTCH ANGLE, HANDHELD, etc.)

#### Stage 8: Visual & Character Definition (Asset Assembly)
**Success Definition:**
- Correctly manages asset inheritance across scenes
- Character states change appropriately (sweaty, injured, determined)
- Props show wear/use progression (tools get dirty, security systems activate)
- Multiple scene instances created for evolving asset states
- Status tags applied correctly ("damaged", "activated", "compromised")

#### Stage 9: Prompt Segmentation (The Merger and Formatting)
**Success Definition:**
- Frame prompts handle complex spatial relationships
- Video prompts emphasize kinetic action and sound design
- Continuity references properly chain between shots
- Prompts account for changing character states
- Technical equipment is accurately described

#### Stage 10: Frame Generation (The Anchors & Continuity)
**Success Definition:**
- Frame pairs show clear action progression
- Character positions change realistically between start/end frames
- Props show appropriate state changes
- Continuity maintained across scene boundaries
- Complex camera angles properly represented

#### Stage 11: Confirmation & Gatekeeping (The Credit Check)
**Success Definition:**
- All 25-35 shots displayed with frame pairs
- Cost calculation accounts for scene count and complexity
- Continuity warnings resolved before approval
- Technical prompts are validated

#### Stage 12: Video Generation, Review & Iteration Loop
**Success Definition:**
- Generated video maintains 3:00-4:00 minute target
- Action sequences are fluid and continuous
- Sound design enhances action (breathing, footsteps, equipment)
- Visual effects (lasers, security systems) are coherent
- No continuity breaks or visual artifacts

---

## Test Case 3: Audio-to-Video Podcast

**Input Audio:** A 15-minute podcast episode where two hosts discuss artificial intelligence trends. Audio includes timestamps, speaker identification, and topic transitions.

**Project Parameters:**
- Target Length: 15:00 minutes (matches audio)
- Content Rating: G
- Genre: Documentary/Educational
- Project Type: Video Content for Audio

### Phase A Success Criteria

#### Stage 1: Input Modes & RAG Initialization
**Success Definition:**
- Accepts audio file upload with transcript
- Identifies timestamp-based structure
- Selects documentary/educational Written Style RAG
- Project type correctly set to "Video Content for Audio"

#### Stage 2: Treatment Generation (Iterative Prose)
**Success Definition:**
- Generates exactly 3 distinct treatment variants
- Treatments align with audio timestamps and topics
- Visual descriptions complement rather than compete with audio
- Treatments suggest visual metaphors for abstract AI concepts
- Timing matches audio duration markers

#### Stage 3: The Beat Sheet (Structural Anchor & Loop)
**Success Definition:**
- Extracts 20-30 beats aligned with audio topic transitions
- Beats reference specific timestamps from audio
- Visual beats complement audio content (charts, demonstrations, interviews)
- Timing is synchronized with audio structure
- Each beat has clear visual objectives

#### Stage 4: The Descriptive Master Script (Finalized Narrative)
**Success Definition:**
- Generates multiple "visual scenes" synchronized with audio
- Script format adapted for audio-visual content
- Visual descriptions enhance audio topics
- Timing cues reference audio timestamps
- Transitions align with audio topic changes

#### Stage 5: Global Asset Definition & Style Lock
**Success Definition:**
- Extracts 2 main characters (podcast hosts) from audio
- Extracts visual props: charts, screens, background elements
- Visual Style RAG selection is clean/professional
- Assets support informational content
- Image keys show speaking poses, presentation materials

### Phase B Success Criteria

#### Stage 6: The "Script Hub" & Scene Cycle
**Success Definition:**
- Scenes correspond to audio topic segments
- Timestamps are preserved and displayed
- Scene dependencies based on topic flow
- Audio transcript integration visible

#### Stage 7: The Technical Shot List (Granular Breakdown & Control)
**Success Definition:**
- Shots align with audio timing (8-second segments)
- Camera work supports content (medium shots for discussion, close-ups for emphasis)
- Visual transitions match audio topic changes
- Dialogue field contains audio transcript excerpts
- Action describes visual elements that complement audio

#### Stage 8: Visual & Character Definition (Asset Assembly)
**Success Definition:**
- Host appearances match audio-described personas
- Visual aids (charts, graphics) properly defined
- Setting maintains professional/studio aesthetic
- Asset states change appropriately for topic transitions

#### Stage 9: Prompt Segmentation (The Merger and Formatting)
**Success Definition:**
- Frame prompts establish visual context for audio content
- Video prompts heavily emphasize audio synchronization
- Visual elements are secondary to audio narrative
- Prompts include timing cues for audio alignment
- Professional presentation aesthetic maintained

#### Stage 10: Frame Generation (The Anchors & Continuity)
**Success Definition:**
- Frames show hosts in natural speaking positions
- Visual aids appear at appropriate timestamps
- Professional setting maintained throughout
- Transitions smooth between topic segments
- Timing aligns with audio structure

#### Stage 11: Confirmation & Gatekeeping (The Credit Check)
**Success Definition:**
- All shots displayed with audio timestamp references
- Cost calculation appropriate for duration
- Audio-visual synchronization verified
- Professional quality standards met

#### Stage 12: Video Generation, Review & Iteration Loop
**Success Definition:**
- Generated video matches 15-minute audio duration exactly
- Visuals complement audio without distracting
- Host movements appear natural and engaged
- Visual aids appear at correct timestamps
- Professional production quality maintained

---

## Framework Usage Guidelines

### Pre-Implementation Testing
- Run all three test cases through each AI agent individually
- Verify outputs meet success criteria before integration
- Document any deviations and agent improvements needed

### Integration Testing
- Execute complete pipeline runs for each test case
- Validate context propagation between stages
- Confirm branching and invalidation logic works correctly

### Quality Gates
- **Stage 5 Gate:** All assets must have valid image keys before Phase B
- **Stage 7 Gate:** Shot list must cover complete scene duration
- **Stage 11 Gate:** All continuity issues must be resolved
- **Stage 12 Gate:** Final video must meet technical specifications

### Success Metrics
- **Completeness:** All required fields populated in outputs
- **Accuracy:** Content matches input narrative and project parameters
- **Consistency:** Character/asset continuity maintained across stages
- **Technical Compliance:** Proper formatting and API requirements met

### Failure Analysis
When success criteria are not met:
1. Identify which AI agent produced the incorrect output
2. Review agent system prompts and input context
3. Check for context propagation issues
4. Validate against golden test expectations
5. Update agent logic or prompts as needed

This framework ensures that technical accuracy is verified at every stage, preventing expensive video generation failures and ensuring the pipeline produces high-quality, consistent AI-generated films.
