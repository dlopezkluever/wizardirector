#!/usr/bin/env tsx
/**
 * Connectivity Test Script
 * Tests LangSmith and Gemini connectivity and verifies trace creation
 */

import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { llmClient } from '../services/llm-client.js';
import { promptTemplateService } from '../services/prompt-template.js';
import { DatabaseService } from '../config/database.js';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the backend directory
dotenv.config({ path: join(__dirname, '../../.env') });

async function testConnectivity() {
  console.log('🧪 Testing LLM Service Connectivity...\n');

  // Test 1: Database Connection
  console.log('1. Testing database connection...');
  try {
    const dbConnected = await DatabaseService.testConnection();
    if (dbConnected) {
      console.log('✅ Database connection successful');
    } else {
      console.log('❌ Database connection failed');
      return;
    }
  } catch (error) {
    console.error('❌ Database connection error:', error);
    return;
  }

  // Test 2: Environment Variables
  console.log('\n2. Checking environment variables...');
  const requiredVars = [
    'GOOGLE_AI_API_KEY',
    'LANGSMITH_API_KEY',
    'LANGSMITH_PROJECT',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY'
  ];

  let envValid = true;
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      console.log(`✅ ${varName} is set`);
    } else {
      console.log(`❌ ${varName} is missing`);
      envValid = false;
    }
  }

  if (!envValid) {
    console.log('\n❌ Environment variables are not properly configured');
    console.log('Please set the required environment variables and try again.');
    return;
  }

  // Test 3: LLM Client Connectivity
  console.log('\n3. Testing LLM client connectivity...');
  try {
    const connectivityResult = await llmClient.testConnectivity();
    
    if (connectivityResult.gemini) {
      console.log('✅ Google Gemini API connection successful');
    } else {
      console.log('❌ Google Gemini API connection failed');
    }

    if (connectivityResult.langsmith) {
      console.log('✅ LangSmith tracing successful');
    } else {
      console.log('❌ LangSmith tracing failed');
    }

    if (connectivityResult.error) {
      console.log(`⚠️  Error details: ${connectivityResult.error}`);
    }

  } catch (error) {
    console.error('❌ LLM connectivity test failed:', error);
  }

  // Test 4: Prompt Template System
  console.log('\n4. Testing prompt template system...');
  try {
    // Create a test template
    const testTemplate = await promptTemplateService.createTemplate({
      name: 'connectivity-test',
      stage_number: 1,
      version: '1.0.0',
      system_prompt: 'You are a connectivity test assistant.',
      user_prompt_template: 'Respond with: {response}',
      description: 'Test template for connectivity verification',
    });

    console.log('✅ Prompt template creation successful');

    // Test template interpolation
    const interpolated = promptTemplateService.interpolateTemplate(testTemplate, {
      response: 'Connectivity test successful!'
    });

    if (interpolated.user_prompt.includes('Connectivity test successful!')) {
      console.log('✅ Template interpolation successful');
    } else {
      console.log('❌ Template interpolation failed');
    }

    // Clean up test template
    await promptTemplateService.deleteTemplate(testTemplate.id);
    console.log('✅ Test template cleanup successful');

  } catch (error) {
    console.error('❌ Prompt template test failed:', error);
  }

  // Test 5: Full Integration Test (if environment allows)
  console.log('\n5. Running full integration test...');
  try {
    const response = await llmClient.generate({
      systemPrompt: 'You are a test assistant. Respond concisely.',
      userPrompt: 'Say "Integration test successful!" and nothing else.',
      maxTokens: 20,
      metadata: {
        test: 'connectivity-verification',
        timestamp: new Date().toISOString(),
      },
    });

    if (response.content.toLowerCase().includes('integration test successful')) {
      console.log('✅ Full integration test successful');
      console.log(`   Trace ID: ${response.traceId}`);
      console.log(`   Tokens used: ${response.usage.tokens.totalTokens}`);
      console.log(`   Cost: $${response.usage.cost.totalCost.toFixed(6)}`);
    } else {
      console.log('⚠️  Integration test completed but response unexpected');
      console.log(`   Response: ${response.content}`);
      console.log(`   Trace ID: ${response.traceId}`);
    }

  } catch (error) {
    console.error('❌ Full integration test failed:', error);
  }

  // Test 6: Usage Statistics
  console.log('\n6. Checking usage statistics...');
  try {
    const stats = llmClient.getUsageStats();
    console.log('✅ Usage statistics retrieved');
    console.log(`   Total cost: $${stats.totalCost.toFixed(6)}`);
    console.log(`   Total tokens: ${stats.totalTokens.toLocaleString()}`);
    console.log(`   Usage entries: ${stats.usageHistory.length}`);
  } catch (error) {
    console.error('❌ Usage statistics test failed:', error);
  }

  console.log('\n🎉 Connectivity test completed!');
  console.log('\nNext steps:');
  console.log('1. Check your LangSmith dashboard at https://smith.langchain.com');
  console.log('2. Look for traces from the "Aiutuer" project');
  console.log('3. Verify that traces contain the expected metadata and prompts');
}

// Run the test
testConnectivity().catch(error => {
  console.error('Fatal error during connectivity test:', error);
  process.exit(1);
});
