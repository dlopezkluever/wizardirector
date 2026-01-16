import axios, { AxiosInstance } from 'axios';
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
    
    private client: AxiosInstance;
    private maxRetries = 3;
    private baseDelay = 1000;

    constructor() {
        const apiKey = process.env.NANO_BANANA_API_KEY;
        if (!apiKey || apiKey === 'placeholder') {
            throw new Error('NANO_BANANA_API_KEY not configured');
        }

        this.client = axios.create({
            baseURL: process.env.NANO_BANANA_API_URL || 'https://api.nanobanana.ai/v1',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 60000
        });
    }

    async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
        const requestBody = {
            prompt: options.prompt,
            width: options.width || 512,
            height: options.height || 512,
            negative_prompt: options.negativePrompt,
            seed: options.seed,
            ...(options.visualStyleContext && {
                style_reference: options.visualStyleContext
            })
        };

        return this.executeWithRetry(async (attemptNumber) => {
            console.log(`[NanoBanana] Generating image (attempt ${attemptNumber})...`);
            
            const response = await this.client.post('/generate', requestBody);
            
            // Normalize provider response to ImageArtifact
            const artifact = await this.normalizeResponseToArtifact(response.data);

            return {
                artifact,
                metadata: {
                    width: options.width || 512,
                    height: options.height || 512,
                    seed: response.data.seed,
                    estimatedCost: this.estimateCost(options),
                    actualCost: response.data.cost,
                    generationId: response.data.id
                },
                providerRawResponse: response.data
            };
        });
    }

    async inpaintImage(options: InpaintOptions): Promise<ImageGenerationResult> {
        const requestBody = {
            prompt: options.prompt,
            source_image: options.sourceImageUrl,
            mask_description: options.maskDescription,
            width: options.width || 512,
            height: options.height || 512,
            negative_prompt: options.negativePrompt,
            seed: options.seed
        };

        return this.executeWithRetry(async (attemptNumber) => {
            console.log(`[NanoBanana] Inpainting image (attempt ${attemptNumber})...`);
            
            const response = await this.client.post('/inpaint', requestBody);
            const artifact = await this.normalizeResponseToArtifact(response.data);

            return {
                artifact,
                metadata: {
                    width: options.width || 512,
                    height: options.height || 512,
                    seed: response.data.seed,
                    estimatedCost: this.estimateCost(options),
                    actualCost: response.data.cost,
                    generationId: response.data.id
                },
                providerRawResponse: response.data
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
     * Normalize various provider response formats to unified ImageArtifact
     */
    private async normalizeResponseToArtifact(responseData: any): Promise<ImageArtifact> {
        // Case 1: Direct URL provided
        if (responseData.image_url || responseData.url) {
            const imageUrl = responseData.image_url || responseData.url;
            
            // Download the image
            const imageResponse = await axios.get(imageUrl, {
                responseType: 'arraybuffer'
            });

            return {
                type: 'buffer',
                data: Buffer.from(imageResponse.data),
                contentType: imageResponse.headers['content-type'] || 'image/png'
            };
        }
        
        // Case 2: Base64 encoded data
        if (responseData.image_data || responseData.base64) {
            const base64Data = responseData.image_data || responseData.base64;
            return {
                type: 'base64',
                data: base64Data,
                contentType: responseData.content_type || 'image/png'
            };
        }
        
        // Case 3: Job ID (async provider)
        if (responseData.job_id && !responseData.image_url) {
            throw new ImageProviderError(
                'Provider returned job ID - async generation not yet supported',
                'PERMANENT',
                undefined,
                false
            );
        }

        throw new ImageProviderError(
            'Unknown provider response format',
            'PERMANENT',
            undefined,
            false
        );
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
        const status = error.response?.status;

        if (status === 429 || message.includes('rate limit')) {
            return new ImageProviderError(
                `Rate limit exceeded: ${message}`,
                'RATE_LIMIT',
                429,
                true
            );
        }

        if (status === 401 || status === 403) {
            return new ImageProviderError(
                `Authentication error: ${message}`,
                'AUTH_ERROR',
                status,
                false
            );
        }

        if (status >= 500) {
            return new ImageProviderError(
                `Server error: ${message}`,
                'TEMPORARY',
                status,
                true
            );
        }

        if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
            return new ImageProviderError(
                `Network error: ${message}`,
                'TEMPORARY',
                undefined,
                true
            );
        }

        if (status >= 400 && status < 500) {
            return new ImageProviderError(
                `Invalid request: ${message}`,
                'PERMANENT',
                status,
                false
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

