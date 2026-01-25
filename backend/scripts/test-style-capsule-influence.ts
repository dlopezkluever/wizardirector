/**
 * Test script to compare image generation with and without reference images
 * from visual style capsules.
 * 
 * Usage: npx tsx backend/scripts/test-style-capsule-influence.ts <capsuleId> [testPrompt] [userId] [--keep-asset]
 * 
 * Options:
 *   --keep-asset    Don't delete the test asset after generation (allows you to inspect results)
 * 
 * If userId is not provided, the script will use the capsule's owner user_id.
 */

import { supabase } from '../src/config/supabase.js';
import { ImageGenerationService } from '../src/services/image-generation/ImageGenerationService.js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

interface TestResult {
    testName: string;
    capsuleId: string;
    prompt: string;
    usedReferenceImages: boolean;
    referenceImageCount: number;
    jobId: string;
    publicUrl?: string;
    error?: string;
    timestamp: string;
}

async function main() {
    const args = process.argv.slice(2);
    const capsuleId = args[0];
    const testPrompt = args[1] || 'A futuristic robot character in a cyberpunk setting';
    const providedUserId = args.find(arg => !arg.startsWith('--') && args.indexOf(arg) > 1) || undefined;
    const keepAsset = args.includes('--keep-asset');

    if (!capsuleId) {
        console.error('Usage: npx tsx backend/scripts/test-style-capsule-influence.ts <capsuleId> [testPrompt] [userId] [--keep-asset]');
        console.error('\nOptions:');
        console.error('  --keep-asset    Don\'t delete the test asset after generation (allows you to inspect results)');
        process.exit(1);
    }

    console.log('🧪 Visual Style Capsule Influence Test');
    console.log('=====================================\n');
    console.log(`Capsule ID: ${capsuleId}`);
    console.log(`Test Prompt: ${testPrompt}\n`);

    // Fetch capsule data (including user_id)
    const { data: capsule, error: fetchError } = await supabase
        .from('style_capsules')
        .select('id, name, type, descriptor_strings, design_pillars, reference_image_urls, user_id')
        .eq('id', capsuleId)
        .single();

    if (fetchError || !capsule) {
        console.error('❌ Failed to fetch style capsule:', fetchError?.message);
        process.exit(1);
    }

    if (capsule.type !== 'visual') {
        console.error('❌ Capsule is not a visual style capsule');
        process.exit(1);
    }

    const hasReferenceImages = !!(capsule.reference_image_urls && capsule.reference_image_urls.length > 0);
    const hasTextContext = !!(capsule.descriptor_strings?.trim() || capsule.design_pillars);

    console.log('📊 Capsule Analysis:');
    console.log(`  Name: ${capsule.name}`);
    console.log(`  Has Descriptor Strings: ${!!capsule.descriptor_strings?.trim()} (${capsule.descriptor_strings?.length || 0} chars)`);
    console.log(`  Has Design Pillars: ${!!capsule.design_pillars} (${Object.keys(capsule.design_pillars || {}).length} items)`);
    console.log(`  Has Reference Images: ${hasReferenceImages} (${capsule.reference_image_urls?.length || 0} images)`);
    console.log('');

    if (!hasReferenceImages && !hasTextContext) {
        console.error('❌ Capsule has no style data (no descriptors, pillars, or reference images)');
        process.exit(1);
    }

    const imageService = new ImageGenerationService();
    const testResults: TestResult[] = [];

    // Test 1: With reference images (if available) - NEW IMPLEMENTATION
    // Use global asset generation path (doesn't require project/branch setup)
    if (hasReferenceImages) {
        console.log('🔄 Test 1: Generating with reference images (NEW implementation)...');
        let testAssetId: string | null = null;
        try {
            // Determine user_id: use provided, or capsule owner, or find first user
            let userId: string | null = providedUserId || capsule.user_id || null;
            
            if (!userId) {
                // If no user_id available, try to find any user from the database
                const { data: users, error: userError } = await supabase
                    .from('users')
                    .select('id')
                    .limit(1)
                    .single();
                
                if (userError || !users) {
                    // Try auth.users table instead
                    const { data: authUsers } = await supabase.auth.admin.listUsers();
                    if (authUsers && authUsers.users.length > 0) {
                        userId = authUsers.users[0].id;
                        console.log(`  ℹ️  Using user from auth.users: ${userId}`);
                    } else {
                        console.error('❌ No user_id available. Please provide userId as third argument:');
                        console.error('   npx tsx backend/scripts/test-style-capsule-influence.ts <capsuleId> <prompt> <userId>');
                        process.exit(1);
                    }
                } else {
                    userId = users.id;
                    console.log(`  ℹ️  Using user from users table: ${userId}`);
                }
            } else {
                console.log(`  ℹ️  Using user_id: ${userId}`);
            }

            // Create a temporary global asset for testing
            testAssetId = uuidv4();
            const { error: assetError } = await supabase
                .from('global_assets')
                .insert({
                    id: testAssetId,
                    user_id: userId,
                    name: 'Test Asset (Auto-generated)',
                    asset_type: 'character',
                    description: testPrompt,
                    visual_style_capsule_id: capsuleId
                });

            if (assetError) {
                console.error('❌ Failed to create test asset:', assetError.message);
                process.exit(1);
            }

            console.log(`  📦 Created temporary test asset: ${testAssetId}`);

            const result = await imageService.createGlobalAssetImageJob({
                assetId: testAssetId,
                userId: userId!,
                prompt: testPrompt,
                visualStyleCapsuleId: capsuleId,
                width: 512,
                height: 512,
                idempotencyKey: `test-with-images-${Date.now()}`
            });

            testResults.push({
                testName: 'With Reference Images (NEW)',
                capsuleId,
                prompt: testPrompt,
                usedReferenceImages: true,
                referenceImageCount: capsule.reference_image_urls!.length,
                jobId: result.jobId,
                timestamp: new Date().toISOString()
            });

            console.log(`  ✅ Job created: ${result.jobId}`);
            console.log(`  📝 Polling for completion...`);

            // Poll for completion
            let completed = false;
            let attempts = 0;
            const maxAttempts = 60;

            while (!completed && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                const status = await imageService.getJobStatus(result.jobId);
                
                if (status.status === 'completed') {
                    testResults[testResults.length - 1].publicUrl = status.publicUrl;
                    console.log(`  ✅ Completed! URL: ${status.publicUrl}`);
                    completed = true;
                } else if (status.status === 'failed') {
                    testResults[testResults.length - 1].error = status.error?.message || 'Unknown error';
                    console.log(`  ❌ Failed: ${status.error?.message}`);
                    completed = true;
                } else {
                    attempts++;
                    process.stdout.write(`  ⏳ Status: ${status.status}...\r`);
                }
            }

            if (!completed) {
                console.log(`  ⚠️  Timeout after ${maxAttempts} attempts`);
            }

            // Show results before cleanup
            if (testResults[testResults.length - 1].publicUrl) {
                console.log(`\n  🖼️  Generated Image URL: ${testResults[testResults.length - 1].publicUrl}`);
                console.log(`  📦 Test Asset ID: ${testAssetId}`);
                console.log(`  💡 You can view this asset in the UI at: /assets (search for "Test Asset (Auto-generated)")`);
            }

            // Cleanup: Delete the temporary test asset (unless --keep-asset flag is set)
            if (testAssetId && !keepAsset) {
                try {
                    await supabase
                        .from('global_assets')
                        .delete()
                        .eq('id', testAssetId);
                    console.log(`  🧹 Cleaned up temporary test asset`);
                } catch (cleanupError) {
                    console.warn(`  ⚠️  Failed to cleanup test asset: ${cleanupError}`);
                }
            } else if (testAssetId && keepAsset) {
                console.log(`  💾 Test asset preserved (use --keep-asset flag was set)`);
                console.log(`  📦 Asset ID: ${testAssetId}`);
                console.log(`  🖼️  Image URL: ${testResults[testResults.length - 1].publicUrl || 'Pending...'}`);
            }
        } catch (error) {
            console.error(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            
            // Cleanup on error too
            if (testAssetId) {
                try {
                    await supabase
                        .from('global_assets')
                        .delete()
                        .eq('id', testAssetId);
                } catch (cleanupError) {
                    // Ignore cleanup errors
                }
            }
            
            testResults.push({
                testName: 'With Reference Images (NEW)',
                capsuleId,
                prompt: testPrompt,
                usedReferenceImages: true,
                referenceImageCount: capsule.reference_image_urls!.length,
                jobId: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
        console.log('');
    }

    // Test 2: Text-only (if text context available) - SIMULATED OLD BEHAVIOR
    if (hasTextContext) {
        console.log('🔄 Test 2: Generating with text-only context (SIMULATED OLD behavior)...');
        console.log('  ℹ️  Note: This simulates the old behavior by using a capsule without reference images');
        console.log('  ℹ️  In practice, you would need a separate capsule with only text descriptors\n');
        
        // For this test, we'll still use the same capsule but note that reference images won't be used
        // if the implementation properly checks for them
        console.log('  ⚠️  Skipping - would require a text-only capsule for accurate comparison');
        console.log('');
    }

    // Summary
    console.log('📋 Test Summary:');
    console.log('================\n');
    
    testResults.forEach((result, index) => {
        console.log(`${index + 1}. ${result.testName}`);
        console.log(`   Job ID: ${result.jobId}`);
        console.log(`   Reference Images Used: ${result.usedReferenceImages} (${result.referenceImageCount} images)`);
        if (result.publicUrl) {
            console.log(`   ✅ Success: ${result.publicUrl}`);
        } else if (result.error) {
            console.log(`   ❌ Error: ${result.error}`);
        } else {
            console.log(`   ⏳ Status: Pending`);
        }
        console.log('');
    });

    console.log('💡 Next Steps:');
    console.log('  1. Compare the generated images visually with the reference images');
    console.log('  2. Check server logs for detailed API request information');
    console.log('  3. Verify reference images were downloaded and sent to Gemini API');
    console.log('  4. Test with different capsule configurations');
    console.log('  5. Use --keep-asset flag to preserve test assets for inspection\n');
    
    // Show preserved assets
    const preservedAssets = testResults.filter(r => r.publicUrl && keepAsset);
    if (preservedAssets.length > 0) {
        console.log('📦 Preserved Test Assets:');
        preservedAssets.forEach((result, idx) => {
            console.log(`  ${idx + 1}. ${result.publicUrl}`);
        });
        console.log('');
    }

    // Save results to file
    const resultsPath = path.join(__dirname, `test-results-${Date.now()}.json`);
    const fs = await import('fs/promises');
    await fs.writeFile(resultsPath, JSON.stringify(testResults, null, 2));
    console.log(`📄 Results saved to: ${resultsPath}`);
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

