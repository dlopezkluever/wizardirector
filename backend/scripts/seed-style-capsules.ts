#!/usr/bin/env tsx

/**
 * Seed Script for Style Capsule Presets
 *
 * This script creates preset style capsules that users can duplicate and use as starting points.
 * Presets are system-owned and read-only for users.
 *
 * Presets include:
 * - Writing Styles: Hemingway Minimalist, Victorian Ornate, Hard-Boiled Noir, Whimsical Fantasy
 * - Visual Styles: Neo-Noir, Pixar Animation, Cinéma Vérité, Cyberpunk Neon
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Preset Writing Style Capsules
const WRITING_PRESETS = [
  {
    name: 'Hemingway Minimalist',
    exampleTextExcerpts: [
      'The old man was thin and gaunt with deep wrinkles in the back of his neck. The brown blotches of the benevolent skin cancer the sun brings from its reflection on the tropic sea were on his cheeks.',
      'The boy loved the old man. He watched him sleep and he saw how the old man\'s hands shook when he dreamed of the lions in the past.',
      'They sat on the Terrace and many of the fishermen made fun of the old man and he was not angry.'
    ],
    styleLabels: ['minimalist', 'sparse', 'honest', 'direct'],
    negativeConstraints: ['avoid metaphors', 'no adverbs', 'skip adjectives unless essential'],
    freeformNotes: 'Focus on simple, clear language. Show rather than tell. Use short sentences for impact.'
  },
  {
    name: 'Victorian Ornate',
    exampleTextExcerpts: [
      'The venerable mansion stood sentinel upon the misty moor, its weathered spires piercing the heavens like the fingers of some ancient, forgotten deity.',
      'Lady Arabella, with countenance pale as the driven snow and eyes like sapphires ensnared in frost, gazed upon the tumultuous landscape with a heart heavy with melancholy.',
      'The tempest raged without mercy, the wind howling like a chorus of tormented souls, while thunder clapped with the fury of celestial wrath.'
    ],
    styleLabels: ['ornate', 'formal', 'metaphorical', 'descriptive'],
    negativeConstraints: ['avoid contractions', 'no slang', 'never use simple words'],
    freeformNotes: 'Employ elaborate vocabulary and complex sentence structures. Use metaphors and similes liberally. Maintain formal, elevated tone.'
  },
  {
    name: 'Hard-Boiled Noir',
    exampleTextExcerpts: [
      'The dame walked into my office like she owned the joint. Legs that went on forever and a face that could launch a thousand ships—if the ships weren\'t already sunk.',
      'I lit a cigarette and blew smoke at the ceiling. The fan spun lazily, stirring the stale air that smelled of cheap perfume and desperation.',
      'He had eyes like a weasel in a trap—nervous, shifty, ready to bolt. His suit was cheap and his tie was crooked, but the gun in his pocket was the real article.'
    ],
    styleLabels: ['cynical', 'terse', 'street-smart', 'tough'],
    negativeConstraints: ['no sentimentality', 'avoid fancy words', 'skip emotional introspection'],
    freeformNotes: 'Use tough, cynical voice. Short, punchy sentences. Street-level observations. World-weary perspective.'
  },
  {
    name: 'Whimsical Fantasy',
    exampleTextExcerpts: [
      'The dragon\'s scales shimmered like captured starlight, and its eyes twinkled with the mischief of forgotten dreams. It huffed a plume of smoke that smelled suspiciously of cinnamon and adventure.',
      'The little cottage in the woods had a door that was just the right size for wonder, and windows that framed the most extraordinary views of imagination.',
      'The wizard\'s hat was tall and pointy, decorated with stars that actually twinkled and moons that occasionally winked. It contained more magic than pockets should reasonably hold.'
    ],
    styleLabels: ['playful', 'inventive', 'magical', 'lighthearted'],
    negativeConstraints: ['avoid darkness', 'no cynicism', 'skip mundane reality'],
    freeformNotes: 'Embrace wonder and imagination. Use playful language and inventive descriptions. Create a sense of magic and delight.'
  }
];

// Preset Visual Style Capsules
const VISUAL_PRESETS = [
  {
    name: 'Neo-Noir',
    designPillars: {
      colorPalette: 'Monochrome with cyan/blue accents',
      mood: 'Melancholic and mysterious',
      medium: 'Film grain with high contrast',
      lighting: 'Dramatic chiaroscuro',
      cameraLanguage: 'Dutch angles and deep focus'
    },
    descriptorStrings: 'Rain-slicked streets, neon signs reflecting in puddles, deep shadows obscuring faces, fedoras and trench coats, smoke-filled rooms with single light sources.',
    referenceImageUrls: [] // Will be populated with actual reference URLs later
  },
  {
    name: 'Pixar Animation',
    designPillars: {
      colorPalette: 'Vibrant primary colors',
      mood: 'Whimsical and emotional',
      medium: '3D computer animation',
      lighting: 'Soft and expressive',
      cameraLanguage: 'Dynamic and character-focused'
    },
    descriptorStrings: 'Exaggerated facial expressions, soft lighting with rim lights, colorful environments, detailed textures, emotional depth in character eyes.',
    referenceImageUrls: []
  },
  {
    name: 'Cinéma Vérité',
    designPillars: {
      colorPalette: 'Natural and desaturated',
      mood: 'Documentary and authentic',
      medium: '16mm film grain',
      lighting: 'Available light only',
      cameraLanguage: 'Handheld and observational'
    },
    descriptorStrings: 'Shaky camera work, natural lighting, real locations, candid moments, minimal staging, authentic human behavior.',
    referenceImageUrls: []
  },
  {
    name: 'Cyberpunk Neon',
    designPillars: {
      colorPalette: 'Neon pinks, blues, and greens',
      mood: 'Dystopian and intense',
      medium: 'High-tech digital',
      lighting: 'LED and holographic',
      cameraLanguage: 'Dutch angles with extreme perspectives'
    },
    descriptorStrings: 'Neon-lit megacities, holographic advertisements, cybernetic implants, high-tech low-life, rain-slicked streets with glowing signs.',
    referenceImageUrls: []
  }
];

async function seedStyleCapsules() {
  console.log('🚀 Seeding Style Capsule presets...\n');

  try {
    // Create system library for presets
    console.log('📚 Creating system preset library...');
    const { data: library, error: libraryError } = await supabase
      .from('style_capsule_libraries')
      .insert({
        user_id: null, // System-owned
        name: 'System Presets',
        description: 'Official preset style capsules curated by the system',
        is_preset: true
      })
      .select()
      .single();

    if (libraryError) {
      console.error('❌ Failed to create preset library:', libraryError);
      return;
    }

    console.log(`✅ Created preset library with ID: ${library.id}`);

    // Create writing style capsules
    console.log('\n✍️  Creating writing style presets...');
    for (const preset of WRITING_PRESETS) {
      const { data: capsule, error: capsuleError } = await supabase
        .from('style_capsules')
        .insert({
          library_id: library.id,
          user_id: null, // System-owned
          name: preset.name,
          type: 'writing',
          example_text_excerpts: preset.exampleTextExcerpts,
          style_labels: preset.styleLabels,
          negative_constraints: preset.negativeConstraints,
          freeform_notes: preset.freeformNotes,
          is_preset: true,
          is_favorite: false
        })
        .select()
        .single();

      if (capsuleError) {
        console.error(`❌ Failed to create writing preset "${preset.name}":`, capsuleError);
      } else {
        console.log(`✅ Created writing preset: ${preset.name}`);
      }
    }

    // Create visual style capsules
    console.log('\n🎨 Creating visual style presets...');
    for (const preset of VISUAL_PRESETS) {
      const { data: capsule, error: capsuleError } = await supabase
        .from('style_capsules')
        .insert({
          library_id: library.id,
          user_id: null, // System-owned
          name: preset.name,
          type: 'visual',
          design_pillars: preset.designPillars,
          descriptor_strings: preset.descriptorStrings,
          reference_image_urls: preset.referenceImageUrls,
          is_preset: true,
          is_favorite: false
        })
        .select()
        .single();

      if (capsuleError) {
        console.error(`❌ Failed to create visual preset "${preset.name}":`, capsuleError);
      } else {
        console.log(`✅ Created visual preset: ${preset.name}`);
      }
    }

    // Verify the seeding
    console.log('\n🔍 Verifying seed data...');
    const { data: writingCapsules, error: writingError } = await supabase
      .from('style_capsules')
      .select('name, type')
      .eq('type', 'writing')
      .eq('is_preset', true);

    const { data: visualCapsules, error: visualError } = await supabase
      .from('style_capsules')
      .select('name, type')
      .eq('type', 'visual')
      .eq('is_preset', true);

    if (writingError || visualError) {
      console.error('❌ Failed to verify seed data');
      return;
    }

    console.log(`📊 Seeded ${writingCapsules.length} writing style presets:`);
    writingCapsules.forEach(capsule => console.log(`   - ${capsule.name}`));

    console.log(`📊 Seeded ${visualCapsules.length} visual style presets:`);
    visualCapsules.forEach(capsule => console.log(`   - ${capsule.name}`));

    console.log(`\n✅ Style Capsule seeding completed successfully!`);
    console.log(`\n🎯 Total presets created: ${writingCapsules.length + visualCapsules.length}`);
    console.log(`\n📝 Next steps:`);
    console.log(`1. Deploy the backend API routes`);
    console.log(`2. Deploy the frontend components`);
    console.log(`3. Test the style capsule library page`);

  } catch (error) {
    console.error('❌ Unexpected error during seeding:', error);
    process.exit(1);
  }
}

// Run the seeding
seedStyleCapsules();
