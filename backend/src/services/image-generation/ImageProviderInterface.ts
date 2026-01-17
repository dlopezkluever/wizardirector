/**
 * Provider-agnostic image generation interface
 * Supports multiple output formats to avoid provider lock-in
 */

export interface ImageGenerationOptions {
    prompt: string;
    width?: number;
    height?: number;
    visualStyleContext?: string;
    negativePrompt?: string;
    seed?: number;
}

export interface InpaintOptions extends ImageGenerationOptions {
    sourceImageUrl: string;
    maskDescription: string;
}

/**
 * Flexible artifact response - supports multiple provider output formats
 */
export interface ImageArtifact {
    type: 'buffer' | 'base64' | 'url';
    data: Buffer | string; // Buffer for binary, string for base64/url
    contentType?: string;
}

export interface ImageGenerationResult {
    artifact: ImageArtifact;
    metadata: {
        width: number;
        height: number;
        seed?: number;
        estimatedCost?: number; // Provider estimate
        actualCost?: number;    // Actual billed cost (if available)
        generationId?: string;
    };
    providerRawResponse?: any;
}

export interface ImageProvider {
    name: string;
    generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult>;
    inpaintImage(options: InpaintOptions): Promise<ImageGenerationResult>;
    supportsInpainting: boolean;
    estimateCost(options: ImageGenerationOptions): number;
}

export class ImageProviderError extends Error {
    constructor(
        message: string,
        public code: 'TEMPORARY' | 'PERMANENT' | 'RATE_LIMIT' | 'AUTH_ERROR' | 'UNKNOWN',
        public statusCode?: number,
        public retryable: boolean = false
    ) {
        super(message);
        this.name = 'ImageProviderError';
    }
}

