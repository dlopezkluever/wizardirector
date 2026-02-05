/**
 * Mock Video Provider
 * Simulates video generation with realistic delays and placeholder videos.
 * Used when VIDEO_PROVIDER=mock (default) for development/testing.
 */

import type { VideoProvider, VideoGenerationParams, VideoResult } from './VideoProviderInterface.js';

// Public domain sample video URL (Big Buck Bunny clip)
const SAMPLE_VIDEO_URL = 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

export class MockVideoProvider implements VideoProvider {
    name = 'mock';

    async generateVideo(params: VideoGenerationParams): Promise<VideoResult> {
        console.log(`[MockVideoProvider] Generating mock video: ${params.durationSeconds}s, model=${params.modelVariant}`);

        // Simulate generation delay (3-8 seconds)
        const delay = 3000 + Math.random() * 5000;
        await new Promise(resolve => setTimeout(resolve, delay));

        // Simulate occasional failures (5% chance)
        if (Math.random() < 0.05) {
            throw new Error('Mock generation failure: simulated provider error');
        }

        const actualCost = this.estimateCost(params.durationSeconds, params.modelVariant);
        const mockJobId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        return {
            videoUrl: SAMPLE_VIDEO_URL,
            storagePath: `mock/${mockJobId}.mp4`,
            actualCost,
            providerJobId: mockJobId,
            providerMetadata: {
                provider: 'mock',
                simulatedDelay: Math.round(delay),
                inputPrompt: params.prompt.slice(0, 100),
            },
        };
    }

    estimateCost(durationSeconds: number, modelVariant: string): number {
        const rate = modelVariant === 'veo_3_1_fast' ? 0.15 : 0.40;
        return parseFloat((durationSeconds * rate).toFixed(4));
    }
}
