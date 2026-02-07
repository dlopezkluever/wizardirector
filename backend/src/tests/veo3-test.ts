#!/usr/bin/env tsx
/**
 * Veo3 Provider End-to-End Test
 * Generates a single 4-second video using the real Veo3 API.
 * Run: npx tsx src/tests/veo3-test.ts
 */

import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

import { Veo3Provider } from '../services/video-generation/Veo3Provider.js';

async function runTest() {
    console.log('=== Veo3 Provider End-to-End Test ===\n');

    // Verify env vars
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

    console.log(`GOOGLE_CLOUD_PROJECT: ${project || 'NOT SET'}`);
    console.log(`GOOGLE_APPLICATION_CREDENTIALS: ${creds || 'NOT SET'}`);
    console.log(`GOOGLE_CLOUD_LOCATION: ${location}`);
    console.log(`VIDEO_PROVIDER: ${process.env.VIDEO_PROVIDER || 'not set'}\n`);

    if (!project || !creds) {
        console.error('Missing required env vars. Set GOOGLE_CLOUD_PROJECT and GOOGLE_APPLICATION_CREDENTIALS in backend/.env');
        process.exit(1);
    }

    const provider = new Veo3Provider();

    // Use a public domain test image (simple landscape)
    const testImageUrl = 'https://gdnurgghtmauclfkkvif.supabase.co/storage/v1/object/public/asset-images/global/fa58ace1-ae7e-4dd8-ab54-1fbe453701f2/23e414b0-1852-4d5c-96bc-0a01cedc3ab3/jd-erika.jpeg';

    console.log('--- Test: 4-second image-to-video generation ---');
    console.log(`Image: ${testImageUrl}`);
    console.log(`Duration: 4s`);
    console.log(`Model: veo_3_1_fast`);
    console.log('');

    const startTime = Date.now();

    try {
        const result = await provider.generateVideo({
            startFrameUrl: testImageUrl,
            endFrameUrl: null,
            prompt: 'A gentle slow zoom into this scene, the two characters standing together looking at each other warmly, cinematic lighting',
            durationSeconds: 4,
            modelVariant: 'veo_3_1_fast',
        });

        const elapsed = Math.round((Date.now() - startTime) / 1000);

        console.log('\n=== SUCCESS ===');
        console.log(`Total time: ${elapsed}s`);
        console.log(`Video URL: ${result.videoUrl}`);
        console.log(`Storage path: ${result.storagePath}`);
        console.log(`Actual cost: $${result.actualCost}`);
        console.log(`Provider job ID: ${result.providerJobId}`);
        console.log(`Metadata:`, JSON.stringify(result.providerMetadata, null, 2));
    } catch (err) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.error(`\n=== FAILED after ${elapsed}s ===`);
        if (err instanceof Error) {
            console.error(`Error: ${err.message}`);
            if ('code' in err) console.error(`Code: ${(err as any).code}`);
            if ('statusCode' in err) console.error(`Status: ${(err as any).statusCode}`);
        } else {
            console.error(err);
        }
        process.exit(1);
    }
}

runTest();
