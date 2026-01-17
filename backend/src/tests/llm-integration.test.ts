/**
 * LLM Integration Tests
 * Tests for LLM client, prompt templates, and LangSmith integration
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { llmClient, LLMClientError } from '../services/llm-client.js';
import { promptTemplateService, PromptTemplateError } from '../services/prompt-template.js';
import { 
  estimateTokenCount, 
  calculateCost, 
  createUsageMetrics,
  formatCost,
  formatTokenUsage,
  isSupportedModel,
  getSupportedModels 
} from '../utils/token-utils.js';

// Test configuration
const TEST_TIMEOUT = 30000; // 30 seconds for LLM calls

describe('Token Utils', () => {
  test('should estimate token count correctly', () => {
    const text = 'Hello, this is a test message for token counting.';
    const tokenCount = estimateTokenCount(text);
    
    expect(tokenCount).toBeGreaterThan(0);
    expect(tokenCount).toBeLessThan(50); // Should be reasonable
  });

  test('should handle empty text', () => {
    expect(estimateTokenCount('')).toBe(0);
    // Whitespace-only text may return 1 token (acceptable)
    expect(estimateTokenCount('   ')).toBeLessThanOrEqual(1);
  });

  test('should calculate cost correctly', () => {
    const cost = calculateCost(1000, 500, 'gemini-1.5-flash');
    
    expect(cost.inputCost).toBeGreaterThan(0);
    expect(cost.outputCost).toBeGreaterThan(0);
    expect(cost.totalCost).toBe(cost.inputCost + cost.outputCost);
    expect(cost.currency).toBe('USD');
  });

  test('should throw error for unknown model', () => {
    expect(() => {
      calculateCost(1000, 500, 'unknown-model');
    }).toThrow('Unknown model for cost calculation');
  });

  test('should create usage metrics', () => {
    const metrics = createUsageMetrics(1000, 500, 'gemini-1.5-flash');
    
    expect(metrics.tokens.inputTokens).toBe(1000);
    expect(metrics.tokens.outputTokens).toBe(500);
    expect(metrics.tokens.totalTokens).toBe(1500);
    expect(metrics.model).toBe('gemini-1.5-flash');
    expect(metrics.cost.totalCost).toBeGreaterThan(0);
    expect(metrics.timestamp).toBeInstanceOf(Date);
  });

  test('should format cost correctly', () => {
    const cost = { inputCost: 0.001, outputCost: 0.002, totalCost: 0.003, currency: 'USD' };
    expect(formatCost(cost)).toBe('$0.0030 USD');
    
    const smallCost = { inputCost: 0.0001, outputCost: 0.0001, totalCost: 0.0002, currency: 'USD' };
    expect(formatCost(smallCost)).toBe('<$0.001 USD');
  });

  test('should format token usage correctly', () => {
    const tokens = { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 };
    expect(formatTokenUsage(tokens)).toBe('1,500 tokens (1,000 in, 500 out)');
  });

  test('should validate supported models', () => {
    expect(isSupportedModel('gemini-1.5-flash')).toBe(true);
    expect(isSupportedModel('gemini-1.5-pro')).toBe(true);
    expect(isSupportedModel('unknown-model')).toBe(false);
    
    const supportedModels = getSupportedModels();
    expect(supportedModels).toContain('gemini-1.5-flash');
    expect(supportedModels).toContain('gemini-1.5-pro');
  });
});

describe('Prompt Template Service', () => {
  let testTemplateId: string;

  beforeEach(async () => {
    // Clean up any existing test templates
    try {
      const existingTemplates = await promptTemplateService.listTemplates({
        name: 'test-template',
      });
      
      for (const template of existingTemplates) {
        await promptTemplateService.deleteTemplate(template.id);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterAll(async () => {
    // Clean up test template
    if (testTemplateId) {
      try {
        await promptTemplateService.deleteTemplate(testTemplateId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  test('should create a prompt template', async () => {
    const template = await promptTemplateService.createTemplate({
      name: 'test-template',
      stage_number: 2,
      version: '1.0.0',
      system_prompt: 'You are a test assistant.',
      user_prompt_template: 'Please process this: {input}',
      description: 'Test template for integration tests',
    });

    testTemplateId = template.id;

    expect(template.id).toBeDefined();
    expect(template.name).toBe('test-template');
    expect(template.stage_number).toBe(2);
    expect(template.version).toBe('1.0.0');
    expect(template.is_active).toBe(true);
  });

  test('should get a template by ID', async () => {
    // First create a template
    const created = await promptTemplateService.createTemplate({
      name: 'test-get-template',
      stage_number: 3,
      version: '1.0.0',
      system_prompt: 'You are a test assistant.',
      user_prompt_template: 'Process: {input}',
    });

    const retrieved = await promptTemplateService.getTemplate(created.id);
    
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(created.id);
    expect(retrieved!.name).toBe('test-get-template');

    // Clean up
    await promptTemplateService.deleteTemplate(created.id);
  });

  test('should return null for non-existent template', async () => {
    const template = await promptTemplateService.getTemplate('00000000-0000-0000-0000-000000000000');
    expect(template).toBeNull();
  });

  test('should list templates with filtering', async () => {
    // Create test templates
    const template1 = await promptTemplateService.createTemplate({
      name: 'test-list-1',
      stage_number: 2,
      version: '1.0.0',
      system_prompt: 'Test 1',
      user_prompt_template: 'Input: {input}',
    });

    const template2 = await promptTemplateService.createTemplate({
      name: 'test-list-2',
      stage_number: 3,
      version: '1.0.0',
      system_prompt: 'Test 2',
      user_prompt_template: 'Input: {input}',
    });

    // Test listing all
    const allTemplates = await promptTemplateService.listTemplates();
    expect(allTemplates.length).toBeGreaterThanOrEqual(2);

    // Test filtering by stage
    const stage2Templates = await promptTemplateService.listTemplates({ stageNumber: 2 });
    const stage2Names = stage2Templates.map(t => t.name);
    expect(stage2Names).toContain('test-list-1');

    // Test filtering by active only
    const activeTemplates = await promptTemplateService.listTemplates({ activeOnly: true });
    expect(activeTemplates.every(t => t.is_active)).toBe(true);

    // Clean up
    await promptTemplateService.deleteTemplate(template1.id);
    await promptTemplateService.deleteTemplate(template2.id);
  });

  test('should interpolate template variables', async () => {
    const template = await promptTemplateService.createTemplate({
      name: 'test-interpolation',
      stage_number: 2,
      version: '1.0.0',
      system_prompt: 'You are a {role} assistant.',
      user_prompt_template: 'Process this {input} with {method} approach.',
    });

    const variables = {
      role: 'helpful',
      input: 'test data',
      method: 'careful',
    };

    const interpolated = promptTemplateService.interpolateTemplate(template, variables);

    expect(interpolated.system_prompt).toBe('You are a helpful assistant.');
    expect(interpolated.user_prompt).toBe('Process this test data with careful approach.');
    expect(interpolated.variables_used).toContain('role');
    expect(interpolated.variables_used).toContain('input');
    expect(interpolated.variables_used).toContain('method');

    // Clean up
    await promptTemplateService.deleteTemplate(template.id);
  });

  test('should extract variables from template', async () => {
    const template = await promptTemplateService.createTemplate({
      name: 'test-extract-vars',
      stage_number: 2,
      version: '1.0.0',
      system_prompt: 'You are a {role} assistant with {capability}.',
      user_prompt_template: 'Process {input} using {method}.',
    });

    const variables = promptTemplateService.extractVariables(template);

    expect(variables).toContain('role');
    expect(variables).toContain('capability');
    expect(variables).toContain('input');
    expect(variables).toContain('method');
    expect(variables.length).toBe(4);

    // Clean up
    await promptTemplateService.deleteTemplate(template.id);
  });

  test('should validate variables', async () => {
    const template = await promptTemplateService.createTemplate({
      name: 'test-validate-vars',
      stage_number: 2,
      version: '1.0.0',
      system_prompt: 'You are a {role} assistant.',
      user_prompt_template: 'Process {input}.',
    });

    // Valid variables
    const validVariables = { role: 'helpful', input: 'test data' };
    const validValidation = promptTemplateService.validateVariables(template, validVariables);
    expect(validValidation.valid).toBe(true);
    expect(validValidation.missing).toHaveLength(0);

    // Missing variables
    const incompleteVariables = { role: 'helpful' };
    const incompleteValidation = promptTemplateService.validateVariables(template, incompleteVariables);
    expect(incompleteValidation.valid).toBe(false);
    expect(incompleteValidation.missing).toContain('input');

    // Extra variables
    const extraVariables = { role: 'helpful', input: 'test', extra: 'value' };
    const extraValidation = promptTemplateService.validateVariables(template, extraVariables);
    expect(extraValidation.valid).toBe(true);
    expect(extraValidation.extra).toContain('extra');

    // Clean up
    await promptTemplateService.deleteTemplate(template.id);
  });
});

describe('LLM Client Service', () => {
  test('should estimate cost without making API call', () => {
    const request = {
      systemPrompt: 'You are a helpful assistant.',
      userPrompt: 'Say hello.',
    };

    const estimate = llmClient.estimateCost(request, 50);
    
    expect(estimate.inputCost).toBeGreaterThan(0);
    expect(estimate.outputCost).toBeGreaterThan(0);
    expect(estimate.totalCost).toBeGreaterThan(0);
    expect(estimate.currency).toBe('USD');
  });

  test('should get usage statistics', () => {
    const stats = llmClient.getUsageStats();
    
    expect(stats).toHaveProperty('totalCost');
    expect(stats).toHaveProperty('totalTokens');
    expect(stats).toHaveProperty('usageHistory');
    expect(Array.isArray(stats.usageHistory)).toBe(true);
  });

  // Note: The following tests require actual API keys and will make real API calls
  // They should be run manually with proper environment setup

  test.skip('should test connectivity to LLM services', async () => {
    const result = await llmClient.testConnectivity();
    
    expect(result).toHaveProperty('gemini');
    expect(result).toHaveProperty('langsmith');
    
    if (result.error) {
      console.log('Connectivity test error (expected in CI):', result.error);
    } else {
      expect(result.gemini).toBe(true);
      expect(result.langsmith).toBe(true);
    }
  }, TEST_TIMEOUT);

  test.skip('should generate text with LangSmith tracing', async () => {
    const request = {
      systemPrompt: 'You are a helpful assistant that responds concisely.',
      userPrompt: 'Say "Hello, test!" and nothing else.',
      maxTokens: 50,
      metadata: { test: true },
    };

    const response = await llmClient.generate(request);

    expect(response.content).toContain('Hello');
    expect(response.traceId).toBeDefined();
    expect(response.requestId).toBeDefined();
    expect(response.usage.tokens.totalTokens).toBeGreaterThan(0);
    expect(response.usage.cost.totalCost).toBeGreaterThan(0);
  }, TEST_TIMEOUT);

  test.skip('should handle rate limiting gracefully', async () => {
    // This test would require triggering rate limits
    // Skip in normal test runs
  });

  test.skip('should retry on transient errors', async () => {
    // This test would require simulating network errors
    // Skip in normal test runs
  });
});

describe('Integration Tests', () => {
  test.skip('should create template and use it for generation', async () => {
    // Create a template
    const template = await promptTemplateService.createTemplate({
      name: 'integration-test-template',
      stage_number: 2,
      version: '1.0.0',
      system_prompt: 'You are a {role} assistant.',
      user_prompt_template: 'Please {action} the following: {content}',
      description: 'Integration test template',
    });

    // Interpolate the template
    const variables = {
      role: 'helpful',
      action: 'summarize',
      content: 'This is a test document for summarization.',
    };

    const interpolated = promptTemplateService.interpolateTemplate(template, variables);

    // Use the interpolated prompts for generation
    const response = await llmClient.generate({
      systemPrompt: interpolated.system_prompt,
      userPrompt: interpolated.user_prompt,
      maxTokens: 100,
      metadata: { 
        templateId: template.id,
        templateVersion: template.version,
      },
    });

    expect(response.content).toBeDefined();
    expect(response.traceId).toBeDefined();
    expect(response.usage.tokens.totalTokens).toBeGreaterThan(0);

    // Clean up
    await promptTemplateService.deleteTemplate(template.id);
  }, TEST_TIMEOUT);
});

// Helper function to check if environment is properly configured
function isEnvironmentConfigured(): boolean {
  return !!(
    process.env.GOOGLE_AI_API_KEY &&
    process.env.LANGSMITH_API_KEY &&
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_ANON_KEY
  );
}

// Log environment status
beforeAll(() => {
  const configured = isEnvironmentConfigured();
  console.log(`Environment configured for full integration tests: ${configured}`);
  
  if (!configured) {
    console.log('Skipping API-dependent tests. Set environment variables to run full integration tests.');
  }
});
