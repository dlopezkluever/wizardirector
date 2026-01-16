import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    ImageProvider,
    ImageGenerationOptions,
    ImageGenerationResult,
    ImageArtifact,
    ImageProviderError,
    InpaintOptions
} from './ImageProviderInterface.js';

export class NanoBananaClient implements ImageProvider {
    name = 'nano-banana';
    supportsInpainting = true;

    private client: GoogleGenerativeAI;
    private maxRetries = 3;
    private baseDelay = 1000;

    constructor() {
        const apiKey = process.env.GOOGLE_AI_API_KEY;
        if (!apiKey || apiKey === 'placeholder') {
            throw new Error('GOOGLE_AI_API_KEY not configured');
        }

        this.client = new GoogleGenerativeAI(apiKey);
    }

    async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
        return this.executeWithRetry(async (attemptNumber) => {
            console.log(`[NanoBanana] Generating image (attempt ${attemptNumber})...`);

            // Build prompt with visual style context
            let prompt = options.prompt;
            if (options.visualStyleContext) {
                prompt = `${options.prompt}\n\nStyle: ${options.visualStyleContext}`;
            }

            // Use Gemini 2.5 Flash Image model
            const model = this.client.getGenerativeModel({
                model: 'gemini-2.5-flash-image'
            });

            const response = await model.generateContent({
                contents: [{
                    role: 'user',
                    parts: [{ text: prompt }]
                }]
            });

            // Extract image from response
            const imagePart = response.response.candidates?.[0]?.content?.parts?.find(
                (part: any) => part.inlineData
            );

            if (!imagePart?.inlineData) {
                throw new ImageProviderError(
                    'No image generated in response',
                    'PERMANENT',
                    undefined,
                    false
                );
            }

            // Create artifact from base64 data
            const artifact: ImageArtifact = {
                type: 'base64',
                data: imagePart.inlineData.data,
                contentType: imagePart.inlineData.mimeType || 'image/png'
            };

            // Generate a simple ID for tracking
            const generationId = `gemini_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

            return {
                artifact,
                metadata: {
                    width: options.width || 512,
                    height: options.height || 512,
                    seed: options.seed,
                    estimatedCost: this.estimateCost(options),
                    actualCost: this.estimateCost(options), // Gemini doesn't provide actual costs
                    generationId
                },
                providerRawResponse: response.response
            };
        });
    }

    async inpaintImage(options: InpaintOptions): Promise<ImageGenerationResult> {
        return this.executeWithRetry(async (attemptNumber) => {
            console.log(`[NanoBanana] Inpainting image (attempt ${attemptNumber})...`);

            // Build inpainting prompt
            const prompt = `${options.prompt}\n\nMask description: ${options.maskDescription}\n\nPlease edit the image according to the mask description.`;

            // Use Gemini 2.5 Flash Image model
            const model = this.client.getGenerativeModel({
                model: 'gemini-2.5-flash-image'
            });

            // For inpainting, we'd need to download and provide the source image
            // For now, create a text-based inpainting request
            // TODO: Implement proper image upload for inpainting
            const response = await model.generateContent({
                contents: [{
                    role: 'user',
                    parts: [{ text: prompt }]
                }]
            });

            // Extract image from response
            const imagePart = response.response.candidates?.[0]?.content?.parts?.find(
                (part: any) => part.inlineData
            );

            if (!imagePart?.inlineData) {
                throw new ImageProviderError(
                    'No image generated in inpainting response',
                    'PERMANENT',
                    undefined,
                    false
                );
            }

            const artifact: ImageArtifact = {
                type: 'base64',
                data: imagePart.inlineData.data,
                contentType: imagePart.inlineData.mimeType || 'image/png'
            };

            const generationId = `gemini_inpaint_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

            return {
                artifact,
                metadata: {
                    width: options.width || 512,
                    height: options.height || 512,
                    seed: options.seed,
                    estimatedCost: this.estimateCost(options),
                    actualCost: this.estimateCost(options),
                    generationId
                },
                providerRawResponse: response.response
            };
        });
    }

    estimateCost(options: ImageGenerationOptions): number {
        const pixels = (options.width || 512) * (options.height || 512);
        const baseCredits = 0.01;
        const pixelMultiplier = pixels / (512 * 512);
        return baseCredits * pixelMultiplier;
    }


    /**
     * Execute with retry logic, tracking attempt numbers
     */
    private async executeWithRetry<T>(
        operation: (attemptNumber: number) => Promise<T>
    ): Promise<T> {
        let lastError: Error;

        for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
            try {
                return await operation(attempt);
            } catch (error: any) {
                lastError = error;
                
                const classifiedError = this.classifyError(error);
                
                if (attempt > this.maxRetries || !classifiedError.retryable) {
                    throw classifiedError;
                }

                const delay = Math.min(
                    this.baseDelay * Math.pow(2, attempt - 1),
                    10000
                );

                console.log(`[NanoBanana] Retry ${attempt}/${this.maxRetries} after ${delay}ms`);
                await this.sleep(delay);
            }
        }

        throw lastError!;
    }

    private classifyError(error: any): ImageProviderError {
        const message = error.message || 'Unknown error';

        // Check for Gemini-specific error types
        if (message.includes('API_KEY') || message.includes('PERMISSION_DENIED') || message.includes('INVALID_ARGUMENT')) {
            return new ImageProviderError(
                `Authentication error: ${message}`,
                'AUTH_ERROR',
                undefined,
                false
            );
        }

        if (message.includes('RESOURCE_EXHAUSTED') || message.includes('QUOTA_EXCEEDED') || message.includes('rate limit')) {
            return new ImageProviderError(
                `Rate limit exceeded: ${message}`,
                'RATE_LIMIT',
                undefined,
                true
            );
        }

        if (message.includes('UNAVAILABLE') || message.includes('DEADLINE_EXCEEDED')) {
            return new ImageProviderError(
                `Service temporarily unavailable: ${message}`,
                'TEMPORARY',
                undefined,
                true
            );
        }

        if (message.includes('FAILED_PRECONDITION') || message.includes('OUT_OF_RANGE')) {
            return new ImageProviderError(
                `Invalid request: ${message}`,
                'PERMANENT',
                undefined,
                false
            );
        }

        if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
            return new ImageProviderError(
                `Network error: ${message}`,
                'TEMPORARY',
                undefined,
                true
            );
        }

        return new ImageProviderError(
            `Unknown error: ${message}`,
            'UNKNOWN',
            undefined,
            false
        );
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

