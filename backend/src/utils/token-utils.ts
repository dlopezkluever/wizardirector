/**
 * Token counting and cost estimation utilities for LLM services
 * Supports Google Gemini models with accurate token counting and cost calculation
 */

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface CostEstimate {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
}

export interface UsageMetrics {
  tokens: TokenUsage;
  cost: CostEstimate;
  model: string;
  timestamp: Date;
}

// Gemini pricing (as of 2024) - prices per 1M tokens
const GEMINI_PRICING = {
  'gemini-1.5-flash': {
    input: 0.075,  // $0.075 per 1M input tokens
    output: 0.30,  // $0.30 per 1M output tokens
  },
  'gemini-1.5-pro': {
    input: 3.50,   // $3.50 per 1M input tokens
    output: 10.50, // $10.50 per 1M output tokens
  },
  'gemini-1.0-pro': {
    input: 0.50,   // $0.50 per 1M input tokens
    output: 1.50,  // $1.50 per 1M output tokens
  },
} as const;

/**
 * Estimates token count for text input
 * Uses a simple heuristic: ~4 characters per token for English text
 * This is approximate - actual tokenization may vary
 */
export function estimateTokenCount(text: string): number {
  if (!text || text.length === 0) return 0;
  
  // Remove extra whitespace and normalize
  const normalizedText = text.trim().replace(/\s+/g, ' ');
  
  // Rough estimation: 4 characters per token for English
  // Add some tokens for formatting and special characters
  const baseTokens = Math.ceil(normalizedText.length / 4);
  const formatTokens = Math.ceil(normalizedText.split('\n').length * 0.5);
  
  return baseTokens + formatTokens;
}

/**
 * Calculates cost for token usage based on model pricing
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): CostEstimate {
  const modelKey = model as keyof typeof GEMINI_PRICING;
  const pricing = GEMINI_PRICING[modelKey];
  
  if (!pricing) {
    throw new Error(`Unknown model for cost calculation: ${model}`);
  }
  
  // Convert to cost per token (pricing is per 1M tokens)
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  
  return {
    inputCost: Number(inputCost.toFixed(6)),
    outputCost: Number(outputCost.toFixed(6)),
    totalCost: Number((inputCost + outputCost).toFixed(6)),
    currency: 'USD',
  };
}

/**
 * Creates a complete usage metrics object
 */
export function createUsageMetrics(
  inputTokens: number,
  outputTokens: number,
  model: string
): UsageMetrics {
  const tokens: TokenUsage = {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
  };
  
  const cost = calculateCost(inputTokens, outputTokens, model);
  
  return {
    tokens,
    cost,
    model,
    timestamp: new Date(),
  };
}

/**
 * Estimates cost for a prompt before sending to LLM
 */
export function estimateCostForPrompt(
  systemPrompt: string,
  userPrompt: string,
  expectedOutputTokens: number,
  model: string
): CostEstimate {
  const inputTokens = estimateTokenCount(systemPrompt + userPrompt);
  return calculateCost(inputTokens, expectedOutputTokens, model);
}

/**
 * Formats cost for display
 */
export function formatCost(cost: CostEstimate): string {
  if (cost.totalCost < 0.001) {
    return `<$0.001 ${cost.currency}`;
  }
  return `$${cost.totalCost.toFixed(4)} ${cost.currency}`;
}

/**
 * Formats token usage for display
 */
export function formatTokenUsage(tokens: TokenUsage): string {
  return `${tokens.totalTokens.toLocaleString()} tokens (${tokens.inputTokens.toLocaleString()} in, ${tokens.outputTokens.toLocaleString()} out)`;
}

/**
 * Validates if a model is supported for cost calculation
 */
export function isSupportedModel(model: string): boolean {
  return model in GEMINI_PRICING;
}

/**
 * Gets available models for cost calculation
 */
export function getSupportedModels(): string[] {
  return Object.keys(GEMINI_PRICING);
}

/**
 * Usage tracking for budget management
 */
export class UsageTracker {
  private usage: UsageMetrics[] = [];
  
  addUsage(metrics: UsageMetrics): void {
    this.usage.push(metrics);
  }
  
  getTotalCost(timeframe?: { start: Date; end: Date }): number {
    let filteredUsage = this.usage;
    
    if (timeframe) {
      filteredUsage = this.usage.filter(
        u => u.timestamp >= timeframe.start && u.timestamp <= timeframe.end
      );
    }
    
    return filteredUsage.reduce((total, u) => total + u.cost.totalCost, 0);
  }
  
  getTotalTokens(timeframe?: { start: Date; end: Date }): number {
    let filteredUsage = this.usage;
    
    if (timeframe) {
      filteredUsage = this.usage.filter(
        u => u.timestamp >= timeframe.start && u.timestamp <= timeframe.end
      );
    }
    
    return filteredUsage.reduce((total, u) => total + u.tokens.totalTokens, 0);
  }
  
  getUsageByModel(model: string): UsageMetrics[] {
    return this.usage.filter(u => u.model === model);
  }
  
  clear(): void {
    this.usage = [];
  }
  
  getUsageHistory(): UsageMetrics[] {
    return [...this.usage];
  }
}

// Global usage tracker instance
export const globalUsageTracker = new UsageTracker();
