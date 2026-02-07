/**
 * Provider-agnostic video generation interface
 * Supports Veo3 and mock implementations
 */

export interface VideoGenerationParams {
    startFrameUrl: string;
    endFrameUrl?: string | null;
    prompt: string;
    durationSeconds: number;
    modelVariant: 'veo_3_1_fast' | 'veo_3_1_standard';
}

export interface VideoResult {
    videoUrl: string;
    storagePath: string;
    actualCost: number;
    providerJobId: string;
    providerMetadata: Record<string, unknown>;
}

export interface VideoProvider {
    name: string;
    generateVideo(params: VideoGenerationParams): Promise<VideoResult>;
    estimateCost(durationSeconds: number, modelVariant: string): number;
}

export class VideoProviderError extends Error {
    constructor(
        message: string,
        public code: 'TEMPORARY' | 'PERMANENT' | 'RATE_LIMIT' | 'AUTH_ERROR' | 'UNKNOWN',
        public statusCode?: number,
        public retryable: boolean = false
    ) {
        super(message);
        this.name = 'VideoProviderError';
    }
}
