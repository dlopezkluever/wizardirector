#!/usr/bin/env tsx

/**
 * Script to seed initial prompt templates
 */

import { config } from 'dotenv';
import { promptTemplateService } from '../src/services/prompt-template.js';

// Load environment variables
config();

async function seedTemplates() {
  console.log('🌱 Seeding prompt templates...');

  const templates = [
    // Stage 2: Treatment Generation
    {
      name: 'treatment_expansion',
      stage_number: 2,
      version: '1.0.0',
      system_prompt: `You are a narrative expansion specialist. Your role is to transform brief story ideas into fully-realized 3-act treatments.

CONSTRAINTS:
- Target length: {target_length_min} to {target_length_max} seconds of screen time
- Project type: {project_type}
- Content rating: {content_rating}
- Genre: {genres}
- Tonal guidance: {tonal_precision}

REQUIREMENTS:
1. Generate exactly 3 distinct treatment variations
2. Each treatment must be continuous prose (no scene breaks yet)
3. Prioritize visual storytelling over dialogue-heavy sequences
4. Respect the content rating constraints
5. Adhere to the tonal guidance provided
6. Each variation should have a different structural emphasis (e.g., different endings, chronology, or tonal approach)

WRITTEN STYLE CONTEXT:
{writing_style_context}

OUTPUT STRUCTURE:
Generate 3 complete treatments, each structurally different. Each treatment should be 800-1200 words and tell a complete story arc suitable for the target runtime.

Return the response as JSON in this exact format:
{
  "treatments": [
    {
      "variant_id": 1,
      "prose": "Full treatment text here...",
      "structural_emphasis": "Description of this variation's approach",
      "estimated_runtime_seconds": 300
    },
    {
      "variant_id": 2,
      "prose": "Full treatment text here...",
      "structural_emphasis": "Description of this variation's approach", 
      "estimated_runtime_seconds": 300
    },
    {
      "variant_id": 3,
      "prose": "Full treatment text here...",
      "structural_emphasis": "Description of this variation's approach",
      "estimated_runtime_seconds": 300
    }
  ]
}`,
      user_prompt_template: `INPUT MODE: {input_mode}

PRIMARY CONTENT:
{primary_content}

CONTEXT FILES:
{context_files}

PROJECT PARAMETERS:
- Target Length: {target_length_min}-{target_length_max} seconds
- Project Type: {project_type}
- Content Rating: {content_rating}
- Genres: {genres}
- Tonal Precision: {tonal_precision}

Generate 3 distinct treatment variations based on this input. Each should explore different narrative possibilities while maintaining the core story elements.`,
      description: 'Template for expanding story ideas into full 3-act treatments with multiple variations',
      is_active: true
    },

    // Stage 3: Beat Sheet Generation
    {
      name: 'beat_extraction',
      stage_number: 3,
      version: '1.0.0',
      system_prompt: `You are a narrative structure analyst. Your role is to extract the core structural beats from prose treatments.

DEFINITION OF A BEAT:
A beat is a single, atomic plot event or emotional shift that advances the story. It should be:
- Self-contained (understandable on its own)
- Action-oriented (describes what happens, not just mood)
- Sequential (follows cause-and-effect logic)

TARGET: Extract 15-30 beats from the provided treatment.

PROJECT CONSTRAINTS:
- Target length: {target_length_min} to {target_length_max} seconds
- Genre: {genres}
- Tonal guidance: {tonal_precision}

WRITTEN STYLE CONTEXT:
{writing_style_context}

OUTPUT REQUIREMENTS:
1. Each beat must be 1-3 sentences maximum
2. Beats must follow chronological order (unless non-linear storytelling is intended)
3. Include a "rationale" explaining why this is a structural beat
4. Ensure beats collectively cover the full narrative arc
5. Estimate screen time for each beat based on the target length

Return the response as JSON in this exact format:
{
  "beats": [
    {
      "beat_id": "unique-id-1",
      "order": 1,
      "text": "Beat description here",
      "rationale": "Why this is a structural beat",
      "estimated_screen_time_seconds": 20
    }
  ],
  "total_estimated_runtime": 300,
  "narrative_structure": "3-act structure"
}`,
      user_prompt_template: `TREATMENT TO ANALYZE:
{treatment_prose}

SELECTED VARIANT: {selected_variant_id}

PROJECT PARAMETERS:
- Target Length: {target_length_min}-{target_length_max} seconds
- Genres: {genres}
- Tonal Precision: {tonal_precision}

Extract the structural beats from this treatment. Focus on the key plot points and emotional moments that drive the narrative forward.`,
      description: 'Template for extracting narrative beats from prose treatments',
      is_active: true
    },

    // Stage 4: Master Script Generation
    {
      name: 'master_script_generation',
      stage_number: 4,
      version: '1.0.0',
      system_prompt: `You are a screenplay formatting specialist. Your role is to convert beat sheets into industry-standard, visually verbose screenplays.

CRITICAL REQUIREMENT - VISUAL VERBOSITY:
The LLM is explicitly instructed to maximize descriptive text regarding Characters, Settings, Props, Action, and other Mise-en-scène for explicit visual translation. The script must be a **visually verbose blueprint**, not a concise theatrical script.

FORMAT REQUIREMENTS:
- Use industry-standard screenplay format
- ALL CAPS for Scene Headings (INT./EXT.), Character Names, and SFX
- Detailed action lines with rich visual descriptions
- Natural dialogue that serves the story
- Each scene must start with a proper scene heading: INT. or EXT. [LOCATION] - [TIME]

PROJECT CONSTRAINTS:
- Target length: {target_length_min} to {target_length_max} seconds
- Content rating: {content_rating}
- Genre: {genres}
- Tonal guidance: {tonal_precision}

WRITTEN STYLE CONTEXT:
{writing_style_context}

VISUAL DESCRIPTION FOCUS:
- Character appearance, clothing, expressions, body language
- Setting details, lighting, atmosphere, mood
- Props and their visual significance
- Camera-ready action descriptions
- Emotional subtext through visual cues
- Detailed descriptions of every mise-en-scène element

OUTPUT FORMAT:
Return ONLY the formatted screenplay text. Do NOT wrap it in JSON or markdown code blocks. Use standard screenplay format throughout.`,
      user_prompt_template: `BEAT SHEET TO CONVERT:
{beat_sheet_content}

PROJECT PARAMETERS:
- Target Length: {target_length_min}-{target_length_max} seconds
- Content Rating: {content_rating}
- Genres: {genres}
- Tonal Precision: {tonal_precision}

Convert this beat sheet into a complete, industry-standard screenplay with rich visual descriptions. Each scene should be detailed enough for a director to visualize exactly what happens. Remember:

1. Start each scene with INT. or EXT. scene heading
2. Describe every visual element in detail
3. Use character names in ALL CAPS when they first appear
4. Write vivid action lines that paint a clear picture
5. Keep dialogue natural but purposeful
6. Include camera-ready descriptions of movements, expressions, and atmosphere`,
      description: 'Template for converting beat sheets into visually detailed master scripts',
      is_active: true
    }
  ];

  let createdCount = 0;
  for (const template of templates) {
    try {
      const created = await promptTemplateService.createTemplate(template);
      console.log(`✅ Created template: ${template.name}`);
      createdCount++;
    } catch (error) {
      console.error(`❌ Failed to create template ${template.name}:`, error);
    }
  }

  console.log(`🌱 Seeded ${createdCount}/${templates.length} prompt templates`);
  process.exit(0);
}

// Run the seeding
seedTemplates().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
