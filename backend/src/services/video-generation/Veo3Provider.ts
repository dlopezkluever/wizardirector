/**
 * Veo3 Video Provider
 * Real implementation using Google Vertex AI / Veo3 REST API.
 * Activated when VIDEO_PROVIDER=veo3.
 *
 * Flow: authenticate via service account -> download start/end frame images ->
 * submit predictLongRunning -> poll fetchPredictOperation -> upload result to
 * Supabase Storage -> return VideoResult.
 */

import { GoogleAuth } from 'google-auth-library';
import { supabase } from '../../config/supabase.js';
import type { VideoProvider, VideoGenerationParams, VideoResult } from './VideoProviderInterface.js';
import { VideoProviderError } from './VideoProviderInterface.js';

/** Map our internal model variant names to Vertex AI model IDs */
const MODEL_ID_MAP: Record<string, string> = {
    veo_3_1_fast: 'veo-3.1-fast-generate-001',
    veo_3_1_standard: 'veo-3.1-generate-001',
};

/** Valid Veo 3 durations */
const VALID_DURATIONS = [4, 6, 8];

/** Max time to wait for a video to finish generating (5 minutes) */
const POLL_TIMEOUT_MS = 5 * 60 * 1000;
/** How often to poll the operation status */
const POLL_INTERVAL_MS = 10_000;

export class Veo3Provider implements VideoProvider {
    name = 'veo3';
    private auth: GoogleAuth;

    constructor() {
        this.auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });
    }

    async generateVideo(params: VideoGenerationParams): Promise<VideoResult> {
        const projectId = process.env.GOOGLE_CLOUD_PROJECT;
        const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

        if (!projectId) {
            throw new VideoProviderError(
                'GOOGLE_CLOUD_PROJECT environment variable is required for Veo3 provider',
                'AUTH_ERROR',
                undefined,
                false
            );
        }

        const modelId = MODEL_ID_MAP[params.modelVariant];
        if (!modelId) {
            throw new VideoProviderError(
                `Unknown model variant: ${params.modelVariant}`,
                'PERMANENT',
                400,
                false
            );
        }

        const duration = this.clampDuration(params.durationSeconds);
        console.log(`[Veo3Provider] Generating video: ${duration}s, model=${modelId}, project=${projectId}, location=${location}`);

        // --- 1. Get access token ---
        const accessToken = await this.getAccessToken();

        // --- 2. Build request body (image-to-video) ---
        const instance: Record<string, unknown> = {};

        if (params.prompt) {
            instance.prompt = params.prompt;
        }

        // Download start frame and base64 encode it
        const startFrameB64 = await this.downloadImageAsBase64(params.startFrameUrl);
        const startFrameMime = this.guessMimeType(params.startFrameUrl);
        instance.image = {
            bytesBase64Encoded: startFrameB64,
            mimeType: startFrameMime,
        };

        // If end frame is provided, add as lastFrame
        if (params.endFrameUrl) {
            const endFrameB64 = await this.downloadImageAsBase64(params.endFrameUrl);
            const endFrameMime = this.guessMimeType(params.endFrameUrl);
            instance.lastFrame = {
                bytesBase64Encoded: endFrameB64,
                mimeType: endFrameMime,
            };
        }

        const requestBody = {
            instances: [instance],
            parameters: {
                durationSeconds: duration,
                sampleCount: 1,
                generateAudio: true,
                aspectRatio: '16:9',
                personGeneration: 'allow_adult',
                resizeMode: 'pad',
            },
        };

        // --- 3. Submit predictLongRunning ---
        const baseUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}`;

        const submitRes = await fetch(`${baseUrl}:predictLongRunning`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!submitRes.ok) {
            const errorBody = await submitRes.text();
            console.error(`[Veo3Provider] Submit failed (${submitRes.status}):`, errorBody);
            throw new VideoProviderError(
                `Veo3 API submit failed: ${submitRes.status} - ${errorBody}`,
                submitRes.status === 429 ? 'RATE_LIMIT' : submitRes.status === 401 || submitRes.status === 403 ? 'AUTH_ERROR' : 'TEMPORARY',
                submitRes.status,
                submitRes.status === 429 || submitRes.status >= 500
            );
        }

        const submitData = await submitRes.json() as { name: string };
        const operationName = submitData.name;
        console.log(`[Veo3Provider] Operation started: ${operationName}`);

        // --- 4. Poll for completion ---
        const result = await this.pollOperation(baseUrl, operationName, accessToken);

        // --- 5. Extract video and upload to Supabase ---
        const videoUrl = await this.handleVideoResult(result, projectId, params);

        const actualCost = this.estimateCost(duration, params.modelVariant);

        console.log(`[Veo3Provider] Video generation complete, uploaded to: ${videoUrl}`);

        return {
            videoUrl,
            storagePath: `videos/${projectId}/${Date.now()}.mp4`,
            actualCost,
            providerJobId: operationName,
            providerMetadata: {
                provider: 'veo3',
                modelId,
                duration,
                operationName,
            },
        };
    }

    estimateCost(durationSeconds: number, modelVariant: string): number {
        const rate = modelVariant === 'veo_3_1_fast' ? 0.15 : 0.40;
        return parseFloat((durationSeconds * rate).toFixed(4));
    }

    // ---- Private helpers ----

    private async getAccessToken(): Promise<string> {
        try {
            const client = await this.auth.getClient();
            const tokenResponse = await client.getAccessToken();
            if (!tokenResponse.token) {
                throw new Error('No token returned');
            }
            return tokenResponse.token;
        } catch (err) {
            throw new VideoProviderError(
                `Failed to get GCP access token: ${err instanceof Error ? err.message : String(err)}`,
                'AUTH_ERROR',
                undefined,
                false
            );
        }
    }

    private async downloadImageAsBase64(url: string): Promise<string> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} fetching ${url}`);
            }
            const buffer = await response.arrayBuffer();
            return Buffer.from(buffer).toString('base64');
        } catch (err) {
            throw new VideoProviderError(
                `Failed to download image from ${url}: ${err instanceof Error ? err.message : String(err)}`,
                'TEMPORARY',
                undefined,
                true
            );
        }
    }

    private guessMimeType(url: string): string {
        const lower = url.toLowerCase();
        if (lower.includes('.png')) return 'image/png';
        if (lower.includes('.webp')) return 'image/webp';
        return 'image/jpeg';
    }

    /** Clamp duration to nearest valid Veo 3 value (4, 6, or 8) */
    private clampDuration(requested: number): number {
        let closest = VALID_DURATIONS[0];
        let minDiff = Math.abs(requested - closest);
        for (const d of VALID_DURATIONS) {
            const diff = Math.abs(requested - d);
            if (diff < minDiff) {
                closest = d;
                minDiff = diff;
            }
        }
        if (closest !== requested) {
            console.log(`[Veo3Provider] Clamped duration from ${requested}s to ${closest}s (Veo3 supports 4/6/8)`);
        }
        return closest;
    }

    private async pollOperation(
        baseUrl: string,
        operationName: string,
        accessToken: string
    ): Promise<VeoOperationResponse> {
        const startTime = Date.now();

        while (Date.now() - startTime < POLL_TIMEOUT_MS) {
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

            const pollRes = await fetch(`${baseUrl}:fetchPredictOperation`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ operationName }),
            });

            if (!pollRes.ok) {
                const errorBody = await pollRes.text();
                console.warn(`[Veo3Provider] Poll request failed (${pollRes.status}): ${errorBody}`);
                // Continue polling on transient errors
                if (pollRes.status >= 500) continue;
                throw new VideoProviderError(
                    `Veo3 poll failed: ${pollRes.status} - ${errorBody}`,
                    'TEMPORARY',
                    pollRes.status,
                    true
                );
            }

            const data = await pollRes.json() as VeoOperationResponse;

            if (data.done) {
                // Check for errors in the response
                if (data.error) {
                    throw new VideoProviderError(
                        `Veo3 generation failed: ${data.error.message || JSON.stringify(data.error)}`,
                        'PERMANENT',
                        data.error.code,
                        false
                    );
                }

                // Check if videos were filtered by safety
                if (data.response?.raiMediaFilteredCount && data.response.raiMediaFilteredCount > 0) {
                    const reasons = data.response.raiMediaFilteredReasons?.join(', ') || 'unknown';
                    throw new VideoProviderError(
                        `Video was filtered by safety policies: ${reasons}`,
                        'PERMANENT',
                        undefined,
                        false
                    );
                }

                if (!data.response?.videos || data.response.videos.length === 0) {
                    throw new VideoProviderError(
                        'Veo3 returned no videos in the response',
                        'PERMANENT',
                        undefined,
                        false
                    );
                }

                console.log(`[Veo3Provider] Operation complete after ${Math.round((Date.now() - startTime) / 1000)}s`);
                return data;
            }

            console.log(`[Veo3Provider] Still generating... (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`);
        }

        throw new VideoProviderError(
            `Veo3 generation timed out after ${POLL_TIMEOUT_MS / 1000}s`,
            'TEMPORARY',
            undefined,
            true
        );
    }

    /**
     * Handle the video result: extract video bytes (base64 or GCS URI),
     * upload to Supabase Storage, and return a public URL.
     */
    private async handleVideoResult(
        operationResult: VeoOperationResponse,
        projectId: string,
        params: VideoGenerationParams
    ): Promise<string> {
        const video = operationResult.response!.videos[0];

        let videoBuffer: Buffer;

        if (video.bytesBase64Encoded) {
            // Video returned as base64 - decode it
            videoBuffer = Buffer.from(video.bytesBase64Encoded, 'base64');
        } else if (video.gcsUri) {
            // Video is in GCS - download it
            const accessToken = await this.getAccessToken();
            videoBuffer = await this.downloadFromGcs(video.gcsUri, accessToken);
        } else {
            throw new VideoProviderError(
                'Veo3 response contains no video data (no base64 or GCS URI)',
                'PERMANENT',
                undefined,
                false
            );
        }

        // Upload to Supabase Storage
        const timestamp = Date.now();
        const storagePath = `${projectId}/${timestamp}.mp4`;

        const { error: uploadError } = await supabase.storage
            .from('videos')
            .upload(storagePath, videoBuffer, {
                contentType: 'video/mp4',
                upsert: false,
            });

        if (uploadError) {
            throw new VideoProviderError(
                `Failed to upload video to Supabase Storage: ${uploadError.message}`,
                'TEMPORARY',
                undefined,
                true
            );
        }

        const { data: urlData } = supabase.storage
            .from('videos')
            .getPublicUrl(storagePath);

        return urlData.publicUrl;
    }

    /** Download a file from a GCS URI (gs://bucket/path) using the JSON API */
    private async downloadFromGcs(gcsUri: string, accessToken: string): Promise<Buffer> {
        // Parse gs://bucket/path
        const match = gcsUri.match(/^gs:\/\/([^/]+)\/(.+)$/);
        if (!match) {
            throw new VideoProviderError(`Invalid GCS URI: ${gcsUri}`, 'PERMANENT', undefined, false);
        }
        const [, bucket, objectPath] = match;
        const encodedPath = encodeURIComponent(objectPath);

        const url = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodedPath}?alt=media`;
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        if (!res.ok) {
            throw new VideoProviderError(
                `Failed to download from GCS (${res.status}): ${gcsUri}`,
                'TEMPORARY',
                res.status,
                true
            );
        }

        const buffer = await res.arrayBuffer();
        return Buffer.from(buffer);
    }
}

// ---- Types for Veo3 API responses ----

interface VeoOperationResponse {
    name: string;
    done: boolean;
    error?: {
        code: number;
        message: string;
    };
    response?: {
        '@type': string;
        raiMediaFilteredCount?: number;
        raiMediaFilteredReasons?: string[];
        videos: VeoVideo[];
    };
}

interface VeoVideo {
    bytesBase64Encoded?: string;
    gcsUri?: string;
    mimeType: string;
}
