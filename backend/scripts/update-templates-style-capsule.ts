#!/usr/bin/env tsx

/**
 * Script to update existing prompt templates to use Style Capsule system
 * Replaces rag_retrieved_style_examples with writing_style_context
 */

import { config } from 'dotenv';
import { promptTemplateService } from '../src/services/prompt-template.js';

// Load environment variables
config();

async function updateTemplates() {
  console.log('🔄 Updating prompt templates for Style Capsule system...');

  try {
    // Get all templates
    const templates = await promptTemplateService.listTemplates();
    
    let updatedCount = 0;
    
    for (const template of templates) {
      let needsUpdate = false;
      let updatedSystemPrompt = template.system_prompt;
      let updatedUserPrompt = template.user_prompt_template;
      
      // Check if template uses old RAG variable
      if (template.system_prompt.includes('{rag_retrieved_style_examples}')) {
        console.log(`📝 Updating template: ${template.name}`);
        updatedSystemPrompt = template.system_prompt.replace(
          /\{rag_retrieved_style_examples\}/g,
          '{writing_style_context}'
        );
        needsUpdate = true;
      }
      
      if (template.user_prompt_template.includes('{rag_retrieved_style_examples}')) {
        updatedUserPrompt = template.user_prompt_template.replace(
          /\{rag_retrieved_style_examples\}/g,
          '{writing_style_context}'
        );
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await promptTemplateService.updateTemplate(template.id, {
          system_prompt: updatedSystemPrompt,
          user_prompt_template: updatedUserPrompt
        });
        console.log(`✅ Updated template: ${template.name}`);
        updatedCount++;
      } else {
        console.log(`⏭️  Skipping template (no RAG references): ${template.name}`);
      }
    }
    
    console.log(`\n🎉 Updated ${updatedCount}/${templates.length} prompt templates`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  }
}

// Run the update
updateTemplates();

