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
import { ContextManager } from '../services/contextManager.js';

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

const generateFromTemplateSchema = z.object({
  templateName: z.string().min(1, 'Template name is required'),
  variables: z.record(z.any()),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(8192).optional(),
  metadata: z.record(z.any()).optional(),
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
    console.error('[API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[API] Error type:', error?.constructor?.name);
    
    if (error instanceof z.ZodError) {
      console.error('[API] Zod validation error details:', error.errors);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    
    if (error instanceof LLMClientError) {
      console.error('[API] LLMClientError details:', { message: error.message, code: error.code, retryable: error.retryable });
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        error: error.message,
        code: error.code,
        retryable: error.retryable,
      });
    }
    
    if (error instanceof PromptTemplateError) {
      console.error('[API] PromptTemplateError details:', { message: error.message, code: error.code });
      return res.status(400).json({
        success: false,
        error: error.message,
        code: error.code,
      });
    }
    
    // Generic error
    console.error('[API] Generic error details:', { 
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/llm/generate-from-template
 * Generate text using a prompt template with variable interpolation
 */
router.post('/generate-from-template', async (req, res) => {
  try {
    console.log(`[API] ===== GENERATE FROM TEMPLATE REQUEST START =====`);
    console.log(`[API] Environment check:`, {
      hasGoogleAIKey: !!process.env.GOOGLE_AI_API_KEY,
      hasLangSmithKey: !!process.env.LANGSMITH_API_KEY,
      nodeEnv: process.env.NODE_ENV
    });
    
    const validatedRequest = generateFromTemplateSchema.parse(req.body);
    
    console.log(`[API] Template-based generation request from user ${req.user?.id}`);
    
    // Get the active template for the specified name
    const templates = await promptTemplateService.listTemplates({
      name: validatedRequest.templateName,
      activeOnly: true,
      limit: 1
    });
    
    if (templates.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No active template found with name: ${validatedRequest.templateName}`,
      });
    }
    
    const template = templates[0];
    
    // Validate variables
    console.log(`[API] Validating template variables for template: ${template.name}`);
    console.log(`[API] Template system_prompt variables:`, promptTemplateService.extractVariables({ ...template, user_prompt_template: '' }));
    console.log(`[API] Template user_prompt_template variables:`, promptTemplateService.extractVariables({ ...template, system_prompt: '' }));
    console.log(`[API] All template variables required:`, promptTemplateService.extractVariables(template));
    console.log(`[API] Variables provided:`, Object.keys(validatedRequest.variables));
    console.log(`[API] Variable values:`, validatedRequest.variables);
    
    const validation = promptTemplateService.validateVariables(template, validatedRequest.variables);
    console.log(`[API] Validation result:`, validation);
    
    if (!validation.valid) {
      console.error(`[API] Template validation failed - Missing variables:`, validation.missing);
      return res.status(400).json({
        success: false,
        error: 'Missing required template variables',
        missing: validation.missing,
        extra: validation.extra,
      });
    }
    
    console.log(`[API] Template validation passed! Proceeding with context assembly...`);
    
    // Use Context Manager to assemble context if project/branch metadata provided
    const contextManager = new ContextManager();
    
    if (validatedRequest.metadata?.projectId && validatedRequest.metadata?.branchId) {
      console.log(`[API] Assembling global context for project ${validatedRequest.metadata.projectId}`);
      
      try {
        const globalContext = await contextManager.assembleGlobalContext(
          validatedRequest.metadata.projectId,
          validatedRequest.metadata.branchId,
          req.user!.id
        );
        
        // Inject writing style context if available
        if (globalContext.writingStyleCapsule) {
          const { StyleCapsuleService } = await import('../services/styleCapsuleService.js');
          const styleCapsuleService = new StyleCapsuleService();
          const formattedContext = styleCapsuleService.formatWritingStyleInjection(
            globalContext.writingStyleCapsule
          );
          validatedRequest.variables.writing_style_context = formattedContext;
          console.log(`[API] Injected writing style context from Context Manager (${formattedContext.length} chars)`);
        } else {
          validatedRequest.variables.writing_style_context = '';
        }
        
        // Add beat sheet context if available and needed
        if (globalContext.beatSheet && validatedRequest.metadata?.stage >= 4) {
          const beatSheetContext = contextManager.formatBeatSheet(globalContext.beatSheet);
          validatedRequest.variables.beat_sheet_reference = beatSheetContext;
          console.log(`[API] Added beat sheet reference context (${beatSheetContext.length} chars)`);
        }
        
        // Store global context in metadata for potential logging
        validatedRequest.metadata.globalContext = globalContext;
        
      } catch (error) {
        console.error('[API] Failed to assemble global context:', error);
        // Fall back to manual style capsule injection
        validatedRequest.variables.writing_style_context = '';
      }
    } else {
      // Fallback: Manual style capsule injection for backward compatibility
      console.log(`[API] No project/branch metadata, using fallback style capsule injection`);
      
      if (validatedRequest.variables.writing_style_capsule_id && 
          typeof validatedRequest.variables.writing_style_capsule_id === 'string' &&
          validatedRequest.variables.writing_style_capsule_id.trim() !== '') {
        
        try {
          const { StyleCapsuleService } = await import('../services/styleCapsuleService.js');
          const styleCapsuleService = new StyleCapsuleService();
          
          const capsule = await styleCapsuleService.getCapsuleById(
            validatedRequest.variables.writing_style_capsule_id,
            req.user!.id
          );
          
          if (capsule) {
            const formattedContext = styleCapsuleService.formatWritingStyleInjection(capsule);
            validatedRequest.variables.writing_style_context = formattedContext;
            console.log(`[API] Injected writing style context (fallback) (${formattedContext.length} chars)`);
          } else {
            validatedRequest.variables.writing_style_context = '';
          }
        } catch (error) {
          console.error('[API] Failed to load writing style capsule (fallback):', error);
          validatedRequest.variables.writing_style_context = '';
        }
      } else {
        validatedRequest.variables.writing_style_context = '';
      }
    }
    
    // Interpolate the template
    console.log(`[API] Interpolating template with variables...`);
    const interpolated = promptTemplateService.interpolateTemplate(template, validatedRequest.variables);
    console.log(`[API] Template interpolated successfully. System prompt length: ${interpolated.system_prompt.length}, User prompt length: ${interpolated.user_prompt.length}`);
    
    // Generate using the interpolated prompts
    console.log(`[API] Calling LLM client to generate response...`);
    const response = await llmClient.generate({
      systemPrompt: interpolated.system_prompt,
      userPrompt: interpolated.user_prompt,
      model: validatedRequest.model,
      temperature: validatedRequest.temperature,
      maxTokens: validatedRequest.maxTokens,
      metadata: {
        ...validatedRequest.metadata,
        userId: req.user?.id,
        endpoint: '/api/llm/generate-from-template',
        templateId: template.id,
        templateName: template.name,
        templateVersion: template.version,
      },
    });
    
    console.log(`[API] LLM generation completed successfully!`);

    // Prepare style capsule metadata for frontend to pass when creating stage state
    let styleCapsuleMetadata = null;
    const globalContext = validatedRequest.metadata?.globalContext as any;
    if (globalContext?.writingStyleCapsule) {
      styleCapsuleMetadata = {
        styleCapsuleId: globalContext.writingStyleCapsule.id,
        injectionContext: {
          stage: validatedRequest.metadata.stage,
          templateName: validatedRequest.templateName,
          formattedContextLength: validatedRequest.variables.writing_style_context?.length || 0,
          timestamp: new Date().toISOString(),
          traceId: response.traceId
        }
      };
      console.log(`[API] Prepared style capsule metadata for stage ${validatedRequest.metadata.stage}`);
    }

    res.json({
      success: true,
      data: {
        ...response,
        promptTemplateVersion: template.version,
        templateId: template.id,
        styleCapsuleMetadata, // Include for frontend to pass when saving stage state
      },
    });
  } catch (error) {
    console.error('[API] Template-based generation error:', error);
    
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
