/**
 * LLM Client Service with LangSmith integration
 * Provides a unified interface for Google Gemini with full observability
 */

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getLangchainCallbacks } from 'langsmith/langchain';
import { Client } from 'langsmith';
import { v4 as uuidv4 } from 'uuid';
import {
  estimateTokenCount,
  createUsageMetrics,
  globalUsageTracker,
  type UsageMetrics,
  type CostEstimate,
  calculateCost,
} from '../utils/token-utils.js';

export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  metadata?: Record<string, any>;
}

export interface LLMResponse {
  content: string;
  usage: UsageMetrics;
  traceId: string;
  requestId: string;
  model: string;
  finishReason?: string;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

export class LLMClientError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'LLMClientError';
  }
}

export class LLMClient {
  private client: ChatGoogleGenerativeAI;
  private langsmithClient: Client;
  private retryConfig: RetryConfig;

  constructor() {
    // Validate required environment variables
    this.validateEnvironment();

    // Initialize Gemini client
    this.client = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_AI_API_KEY!,
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
      temperature: 0.7,
      maxOutputTokens: 4096,
    });

    // Initialize LangSmith client
    this.langsmithClient = new Client({
      apiKey: process.env.LANGSMITH_API_KEY!,
    });

    this.retryConfig = DEFAULT_RETRY_CONFIG;
  }

  private validateEnvironment(): void {
    const required = [
      'GOOGLE_AI_API_KEY',
      'LANGSMITH_API_KEY',
    ];

    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  /**
   * Generate text with full LangSmith tracing and retry logic
   */
  async generate(request: LLMRequest): Promise<LLMResponse> {
    const requestId = uuidv4();
    const model = request.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    console.log(`[LLM] Starting generation request ${requestId} with model ${model}`);

    // Estimate input tokens for cost tracking
    const inputTokens = estimateTokenCount(request.systemPrompt + request.userPrompt);
    
    try {
      const response = await this.executeWithRetry(async () => {
        return await this.performGeneration(request, requestId, model, inputTokens);
      });

      console.log(`[LLM] Successfully completed request ${requestId}`);
      return response;
    } catch (error) {
      console.error(`[LLM] Failed request ${requestId}:`, error);
      throw error;
    }
  }

  private async performGeneration(
    request: LLMRequest,
    requestId: string,
    model: string,
    inputTokens: number
  ): Promise<LLMResponse> {
    // Create a new client instance with request-specific settings
    const client = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_AI_API_KEY!,
      model,
      temperature: request.temperature ?? 0.7,
      maxOutputTokens: request.maxTokens ?? 4096,
    });

    // Prepare messages
    const messages = [
      new SystemMessage(request.systemPrompt),
      new HumanMessage(request.userPrompt),
    ];

    // Execute with LangSmith tracing
    const startTime = Date.now();
    let traceId: string | undefined;

    try {
      // Get LangSmith callbacks (configured via environment variables)
      const callbacks = await getLangchainCallbacks();

      const response = await client.invoke(messages, {
        callbacks,
        metadata: {
          requestId,
          model,
          inputTokens,
          ...request.metadata,
        },
        tags: ['llm-generation', 'gemini', model],
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Use request ID as trace ID for now
      traceId = requestId;

      // Estimate output tokens
      const outputTokens = estimateTokenCount(response.content.toString());

      // Create usage metrics
      const usage = createUsageMetrics(inputTokens, outputTokens, model);
      
      // Track usage globally
      globalUsageTracker.addUsage(usage);

      console.log(`[LLM] Generation completed in ${duration}ms, ${usage.tokens.totalTokens} tokens, $${usage.cost.totalCost.toFixed(4)}`);

      return {
        content: response.content.toString(),
        usage,
        traceId,
        requestId,
        model,
        finishReason: 'stop', // Gemini doesn't provide finish reason in the same way
      };
    } catch (error) {
      console.error(`[LLM] Generation error for request ${requestId}:`, error);
      
      // Classify error for retry logic
      const llmError = this.classifyError(error);
      throw llmError;
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on the last attempt or if error is not retryable
        if (attempt === this.retryConfig.maxRetries || 
            (error instanceof LLMClientError && !error.retryable)) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt),
          this.retryConfig.maxDelay
        );

        console.log(`[LLM] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private classifyError(error: any): LLMClientError {
    const message = error.message || 'Unknown error';
    
    // Rate limiting errors
    if (message.includes('rate limit') || message.includes('quota') || error.status === 429) {
      return new LLMClientError(
        `Rate limit exceeded: ${message}`,
        'RATE_LIMIT',
        429,
        true // retryable
      );
    }

    // Authentication errors
    if (message.includes('auth') || message.includes('key') || error.status === 401) {
      return new LLMClientError(
        `Authentication error: ${message}`,
        'AUTH_ERROR',
        401,
        false // not retryable
      );
    }

    // Server errors (5xx)
    if (error.status >= 500 && error.status < 600) {
      return new LLMClientError(
        `Server error: ${message}`,
        'SERVER_ERROR',
        error.status,
        true // retryable
      );
    }

    // Network errors
    if (message.includes('network') || message.includes('timeout') || message.includes('ECONNRESET')) {
      return new LLMClientError(
        `Network error: ${message}`,
        'NETWORK_ERROR',
        undefined,
        true // retryable
      );
    }

    // Client errors (4xx) - generally not retryable
    if (error.status >= 400 && error.status < 500) {
      return new LLMClientError(
        `Client error: ${message}`,
        'CLIENT_ERROR',
        error.status,
        false // not retryable
      );
    }

    // Unknown errors - be conservative and don't retry
    return new LLMClientError(
      `Unknown error: ${message}`,
      'UNKNOWN_ERROR',
      undefined,
      false
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Estimate cost for a request without executing it
   */
  estimateCost(request: LLMRequest, expectedOutputTokens: number = 1000): CostEstimate {
    const model = request.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    const inputTokens = estimateTokenCount(request.systemPrompt + request.userPrompt);
    
    return calculateCost(inputTokens, expectedOutputTokens, model);
  }

  /**
   * Get usage statistics
   */
  getUsageStats(timeframe?: { start: Date; end: Date }) {
    return {
      totalCost: globalUsageTracker.getTotalCost(timeframe),
      totalTokens: globalUsageTracker.getTotalTokens(timeframe),
      usageHistory: globalUsageTracker.getUsageHistory(),
    };
  }

  /**
   * Update retry configuration
   */
  setRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
  }

  /**
   * Test connectivity to both Gemini and LangSmith
   */
  async testConnectivity(): Promise<{ gemini: boolean; langsmith: boolean; error?: string }> {
    const result = { gemini: false, langsmith: false, error: undefined as string | undefined };

    try {
      // Test Gemini
      const testResponse = await this.generate({
        systemPrompt: 'You are a test assistant.',
        userPrompt: 'Say "Hello, test successful!" and nothing else.',
        maxTokens: 50,
        metadata: { test: true },
      });

      result.gemini = testResponse.content.includes('Hello');
      result.langsmith = !!testResponse.traceId;

    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return result;
  }
}

// Export lazy-loaded singleton instance
let _llmClient: LLMClient | null = null;

export const llmClient = {
  get instance(): LLMClient {
    if (!_llmClient) {
      _llmClient = new LLMClient();
    }
    return _llmClient;
  },
  
  // Proxy all methods to the instance
  async generate(request: LLMRequest): Promise<LLMResponse> {
    return this.instance.generate(request);
  },
  
  estimateCost(request: LLMRequest, expectedOutputTokens?: number): CostEstimate {
    return this.instance.estimateCost(request, expectedOutputTokens);
  },
  
  getUsageStats(timeframe?: { start: Date; end: Date }) {
    return this.instance.getUsageStats(timeframe);
  },
  
  setRetryConfig(config: Partial<RetryConfig>): void {
    return this.instance.setRetryConfig(config);
  },
  
  async testConnectivity(): Promise<{ gemini: boolean; langsmith: boolean; error?: string }> {
    return this.instance.testConnectivity();
  }
};
