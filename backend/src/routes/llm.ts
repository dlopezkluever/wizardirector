/**
 * LLM API Routes
 * Provides endpoints for text generation and prompt template management
 */

import { Router } from 'express';
import { z } from 'zod';
import { llmClient, LLMClientError } from '../services/llm-client.js';
import { 
  promptTemplateService, 
  PromptTemplateError,
  type PromptTemplateCreate,
  type PromptTemplateUpdate 
} from '../services/prompt-template.js';

const router = Router();

// Validation schemas
const generateRequestSchema = z.object({
  systemPrompt: z.string().min(1, 'System prompt is required'),
  userPrompt: z.string().min(1, 'User prompt is required'),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(8192).optional(),
  metadata: z.record(z.any()).optional(),
});

const templateCreateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  stage_number: z.number().int().min(1).max(12),
  version: z.string().min(1, 'Version is required'),
  system_prompt: z.string().min(1, 'System prompt is required'),
  user_prompt_template: z.string().min(1, 'User prompt template is required'),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
});

const templateUpdateSchema = z.object({
  system_prompt: z.string().min(1).optional(),
  user_prompt_template: z.string().min(1).optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
});

const interpolateRequestSchema = z.object({
  templateId: z.string().uuid('Invalid template ID'),
  variables: z.record(z.any()),
});

/**
 * POST /api/llm/generate
 * Generate text using LLM with full tracing
 */
router.post('/generate', async (req, res) => {
  try {
    const validatedRequest = generateRequestSchema.parse(req.body);
    
    console.log(`[API] LLM generation request from user ${req.user?.id}`);
    
    const response = await llmClient.generate({
      systemPrompt: validatedRequest.systemPrompt,
      userPrompt: validatedRequest.userPrompt,
      model: validatedRequest.model,
      temperature: validatedRequest.temperature,
      maxTokens: validatedRequest.maxTokens,
      metadata: {
        ...validatedRequest.metadata,
        userId: req.user?.id,
        endpoint: '/api/llm/generate',
      },
    });

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('[API] LLM generation error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    
    if (error instanceof LLMClientError) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        error: error.message,
        code: error.code,
        retryable: error.retryable,
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/llm/estimate-cost
 * Estimate cost for a generation request without executing it
 */
router.post('/estimate-cost', async (req, res) => {
  try {
    const validatedRequest = generateRequestSchema.parse(req.body);
    
    const expectedOutputTokens = req.body.expectedOutputTokens || 1000;
    
    const estimate = llmClient.estimateCost(
      {
        systemPrompt: validatedRequest.systemPrompt,
        userPrompt: validatedRequest.userPrompt,
        model: validatedRequest.model,
      },
      expectedOutputTokens
    );

    res.json({
      success: true,
      data: estimate,
    });
  } catch (error) {
    console.error('[API] Cost estimation error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/llm/usage-stats
 * Get usage statistics
 */
router.get('/usage-stats', async (req, res) => {
  try {
    const { start, end } = req.query;
    
    let timeframe: { start: Date; end: Date } | undefined;
    if (start && end) {
      timeframe = {
        start: new Date(start as string),
        end: new Date(end as string),
      };
    }
    
    const stats = llmClient.getUsageStats(timeframe);
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[API] Usage stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/llm/test-connectivity
 * Test connectivity to LLM services
 */
router.get('/test-connectivity', async (req, res) => {
  try {
    const result = await llmClient.testConnectivity();
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[API] Connectivity test error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Prompt Template Routes

/**
 * GET /api/llm/templates
 * List prompt templates with optional filtering
 */
router.get('/templates', async (req, res) => {
  try {
    const { stage, active, name, limit, offset } = req.query;
    
    const options = {
      stageNumber: stage ? parseInt(stage as string) : undefined,
      activeOnly: active === 'true',
      name: name as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };
    
    const templates = await promptTemplateService.listTemplates(options);
    
    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error('[API] List templates error:', error);
    
    if (error instanceof PromptTemplateError) {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: error.code,
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/llm/templates
 * Create a new prompt template
 */
router.post('/templates', async (req, res) => {
  try {
    const validatedTemplate = templateCreateSchema.parse(req.body);
    
    const template = await promptTemplateService.createTemplate(
      validatedTemplate as PromptTemplateCreate,
      req.user?.id
    );
    
    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('[API] Create template error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    
    if (error instanceof PromptTemplateError) {
      const statusCode = error.code === 'PERMISSION_DENIED' ? 403 : 400;
      return res.status(statusCode).json({
        success: false,
        error: error.message,
        code: error.code,
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/llm/templates/:id
 * Get a specific prompt template
 */
router.get('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await promptTemplateService.getTemplate(id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }
    
    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('[API] Get template error:', error);
    
    if (error instanceof PromptTemplateError) {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: error.code,
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * PUT /api/llm/templates/:id
 * Update a prompt template
 */
router.put('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validatedUpdates = templateUpdateSchema.parse(req.body);
    
    const template = await promptTemplateService.updateTemplate(
      id,
      validatedUpdates as PromptTemplateUpdate,
      req.user?.id
    );
    
    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('[API] Update template error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    
    if (error instanceof PromptTemplateError) {
      const statusCode = error.code === 'NOT_FOUND' ? 404 :
                        error.code === 'PERMISSION_DENIED' ? 403 : 400;
      return res.status(statusCode).json({
        success: false,
        error: error.message,
        code: error.code,
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * DELETE /api/llm/templates/:id
 * Delete a prompt template
 */
router.delete('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await promptTemplateService.deleteTemplate(id, req.user?.id);
    
    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    console.error('[API] Delete template error:', error);
    
    if (error instanceof PromptTemplateError) {
      const statusCode = error.code === 'NOT_FOUND' ? 404 :
                        error.code === 'PERMISSION_DENIED' ? 403 : 400;
      return res.status(statusCode).json({
        success: false,
        error: error.message,
        code: error.code,
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/llm/templates/:id/activate
 * Activate a specific template version
 */
router.post('/templates/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await promptTemplateService.activateTemplate(id, req.user?.id);
    
    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('[API] Activate template error:', error);
    
    if (error instanceof PromptTemplateError) {
      const statusCode = error.code === 'NOT_FOUND' ? 404 :
                        error.code === 'PERMISSION_DENIED' ? 403 : 400;
      return res.status(statusCode).json({
        success: false,
        error: error.message,
        code: error.code,
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/llm/templates/interpolate
 * Interpolate variables in a template
 */
router.post('/templates/interpolate', async (req, res) => {
  try {
    const { templateId, variables } = interpolateRequestSchema.parse(req.body);
    
    const template = await promptTemplateService.getTemplate(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }
    
    const validation = promptTemplateService.validateVariables(template, variables);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Missing required variables',
        missing: validation.missing,
        extra: validation.extra,
      });
    }
    
    const interpolated = promptTemplateService.interpolateTemplate(template, variables);
    
    res.json({
      success: true,
      data: interpolated,
    });
  } catch (error) {
    console.error('[API] Interpolate template error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/llm/templates/stage/:stageNumber/active
 * Get active template for a specific stage
 */
router.get('/templates/stage/:stageNumber/active', async (req, res) => {
  try {
    const stageNumber = parseInt(req.params.stageNumber);
    const { name } = req.query;
    
    if (isNaN(stageNumber) || stageNumber < 1 || stageNumber > 12) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stage number',
      });
    }
    
    const template = await promptTemplateService.getActiveTemplateForStage(
      stageNumber,
      name as string | undefined
    );
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'No active template found for this stage',
      });
    }
    
    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('[API] Get active template error:', error);
    
    if (error instanceof PromptTemplateError) {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: error.code,
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export { router as llmRouter };
