import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    ImageProvider,
    ImageGenerationOptions,
    ImageGenerationResult,
    ImageArtifact,
    ImageProviderError,
    InpaintOptions,
    ReferenceImage
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

            // Download and convert reference images to base64
            const imageParts: any[] = [];
            if (options.referenceImages && options.referenceImages.length > 0) {
                console.log(`[NanoBanana] Processing ${options.referenceImages.length} reference image(s)...`);
                let successCount = 0;
                let failureCount = 0;
                
                for (const refImage of options.referenceImages) {
                    try {
                        const imageData = await this.downloadAndConvertImage(refImage);
                        imageParts.push({
                            inlineData: {
                                mimeType: imageData.mimeType,
                                data: imageData.base64
                            }
                        });
                        successCount++;
                        console.log(`[NanoBanana] Successfully processed reference image ${successCount}/${options.referenceImages.length}: ${refImage.url.substring(0, 80)}...`);
                    } catch (error) {
                        failureCount++;
                        console.error(`[NanoBanana] Failed to process reference image ${refImage.url}:`, error instanceof Error ? error.message : error);
                        // Continue with other images - don't fail the entire request
                    }
                }
                
                console.log(`[NanoBanana] Reference image processing complete: ${successCount} succeeded, ${failureCount} failed`);
                
                // If all images failed but we have text context, continue with text-only
                if (imageParts.length === 0 && options.visualStyleContext) {
                    console.warn(`[NanoBanana] All reference images failed to load, falling back to text-only style context`);
                } else if (imageParts.length === 0 && !options.visualStyleContext) {
                    console.warn(`[NanoBanana] No reference images or text context available - proceeding with base prompt only`);
                }
            }

            // Build enhanced prompt with visual style context
            let prompt = options.prompt;
            if (options.visualStyleContext || (options.referenceImages && options.referenceImages.length > 0)) {
                if (imageParts.length > 1) {
                    // Multiple reference images: first is subject/identity, rest are style references
                    const styleGuidance = options.visualStyleContext
                        ? `Apply these style guidelines: ${options.visualStyleContext}. `
                        : '';
                    prompt = `Generate an image of the subject shown in the FIRST reference image. Maintain the subject's identity, key features, and overall appearance. Apply the visual style, color palette, mood, and aesthetic from the remaining reference images. ${styleGuidance}Subject: ${options.prompt}`;
                } else if (imageParts.length === 1) {
                    // Single reference image: treat as combined subject/style reference
                    const styleGuidance = options.visualStyleContext
                        ? `Apply these style guidelines: ${options.visualStyleContext}. `
                        : '';
                    prompt = `Generate an image that matches the visual style, color palette, mood, and aesthetic shown in the provided reference image. ${styleGuidance}Subject: ${options.prompt}`;
                } else if (options.visualStyleContext) {
                    // No successfully loaded images, fallback to text-only style context
                    // Use more directive prompt to strengthen style influence
                    prompt = `Generate an image with the following visual style applied strongly throughout: ${options.visualStyleContext}\n\nSubject: ${options.prompt}\n\nIMPORTANT: The visual style described above must be clearly evident in the generated image.`;
                }
            }

            // Log what we're sending to the API
            console.log(`[NanoBanana] API Request Details:`, {
                promptLength: prompt.length,
                hasVisualStyleContext: !!options.visualStyleContext,
                visualStyleContextLength: options.visualStyleContext?.length || 0,
                hasReferenceImages: !!(options.referenceImages && options.referenceImages.length > 0),
                referenceImageCount: options.referenceImages?.length || 0,
                successfullyProcessedImages: imageParts.length,
                finalPrompt: prompt.substring(0, 200) + (prompt.length > 200 ? '...' : '')
            });

            // Use Gemini 2.5 Flash Image model
            const model = this.client.getGenerativeModel({
                model: 'gemini-2.5-flash-image'
            });

            // Build parts array: reference images first, then text prompt
            const parts: any[] = [...imageParts, { text: prompt }];

            const response = await model.generateContent({
                contents: [{
                    role: 'user',
                    parts: parts
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

    /**
     * Download image from URL and convert to base64 with MIME type detection
     */
    private async downloadAndConvertImage(refImage: ReferenceImage): Promise<{ base64: string; mimeType: string }> {
        try {
            const response = await fetch(refImage.url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64 = buffer.toString('base64');

            // Detect MIME type from response headers or URL extension
            let mimeType = refImage.mimeType;
            if (!mimeType) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.startsWith('image/')) {
                    mimeType = contentType;
                } else {
                    // Fallback to extension detection
                    const urlLower = refImage.url.toLowerCase();
                    if (urlLower.endsWith('.png')) {
                        mimeType = 'image/png';
                    } else if (urlLower.endsWith('.jpg') || urlLower.endsWith('.jpeg')) {
                        mimeType = 'image/jpeg';
                    } else if (urlLower.endsWith('.webp')) {
                        mimeType = 'image/webp';
                    } else if (urlLower.endsWith('.gif')) {
                        mimeType = 'image/gif';
                    } else {
                        // Default to PNG if unknown
                        mimeType = 'image/png';
                    }
                }
            }

            return { base64, mimeType };
        } catch (error) {
            throw new Error(`Failed to download/convert image from ${refImage.url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

