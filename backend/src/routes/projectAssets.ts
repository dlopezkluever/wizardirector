/**
 * Project Assets Routes
 * Handles Stage 5 asset management for specific projects
 */

import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { AssetExtractionService } from '../services/assetExtractionService.js';
import { ImageGenerationService } from '../services/image-generation/ImageGenerationService.js';

const router = Router();
const extractionService = new AssetExtractionService();
const imageService = new ImageGenerationService();

/**
 * POST /api/projects/:projectId/assets/extract
 * Two-pass LLM extraction from Stage 4 script
 */
router.post('/:projectId/assets/extract', async (req, res) => {
    console.log('[ProjectAssets] ========== EXTRACT ENDPOINT HIT ==========');
    console.log('[ProjectAssets] Project ID:', req.params.projectId);
    console.log('[ProjectAssets] User ID:', req.user?.id);
    
    try {
        const userId = req.user!.id;
        const { projectId } = req.params;

        // Verify project ownership
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id, active_branch_id')
            .eq('id', projectId)
            .eq('user_id', userId)
            .single();

        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Get the latest Stage 5 state to retrieve locked visual style
        console.log('[ProjectAssets] Looking for latest Stage 5 state for branch:', project.active_branch_id);
        const { data: stage5States, error: stage5Error } = await supabase
            .from('stage_states')
            .select('content')
            .eq('branch_id', project.active_branch_id)
            .eq('stage_number', 5)
            .order('version', { ascending: false })
            .limit(1);

        console.log('[ProjectAssets] Stage 5 states query result:', { stage5States, stage5Error });

        const stage5State = stage5States?.[0];
        const visualStyleId = stage5State?.content?.locked_visual_style_capsule_id;
        console.log('[ProjectAssets] Visual style ID found:', visualStyleId);

        if (!visualStyleId) {
            return res.status(400).json({
                error: 'Visual Style Capsule must be selected before extraction'
            });
        }

        // Get the latest Stage 4 script
        console.log('[ProjectAssets] Looking for latest Stage 4 state for branch:', project.active_branch_id);
        const { data: stage4States, error: stage4Error } = await supabase
            .from('stage_states')
            .select('content')
            .eq('branch_id', project.active_branch_id)
            .eq('stage_number', 4)
            .order('version', { ascending: false })
            .limit(1);

        console.log('[ProjectAssets] Stage 4 states query result:', { stage4States, stage4Error });

        const stage4State = stage4States?.[0];
        const masterScript = stage4State?.content?.formattedScript;
        console.log('[ProjectAssets] Master script found:', !!masterScript, masterScript?.substring(0, 100) + '...');

        if (!masterScript) {
            return res.status(400).json({
                error: 'Stage 4 must be completed first. No script found.'
            });
        }

        console.log(`[ProjectAssets] Starting extraction for project ${projectId}`);

        // Run two-pass extraction
        const extractedAssets = await extractionService.extractAssets(
            masterScript,
            project.active_branch_id,
            visualStyleId
        );

        // Save to database with metadata
        const assetsToInsert = extractedAssets.map(asset => ({
            project_id: projectId,
            branch_id: project.active_branch_id,
            name: asset.name,
            asset_type: asset.type,
            description: asset.description,
            visual_style_capsule_id: visualStyleId,
            locked: false,
            metadata: {
                confidence_score: asset.confidenceScore,
                is_priority: asset.isPriority,
                has_conflicts: asset.hasVisualConflicts,
                conflict_details: asset.conflictDetails,
                source_mentions: asset.mentions
            }
        }));

        const { data: savedAssets, error: insertError } = await supabase
            .from('project_assets')
            .insert(assetsToInsert)
            .select();

        if (insertError) {
            console.error('[ProjectAssets] Insert error:', insertError);
            return res.status(500).json({ error: 'Failed to save extracted assets' });
        }

        console.log(`[ProjectAssets] Extracted and saved ${savedAssets.length} assets`);

        res.json(savedAssets);
    } catch (error) {
        console.error('[ProjectAssets] Extract error:', error);
        res.status(500).json({
            error: 'Asset extraction failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/projects/:projectId/assets
 * List all assets for a project
 */
router.get('/:projectId/assets', async (req, res) => {
    try {
        const userId = req.user!.id;
        const { projectId } = req.params;
        const { type } = req.query;

        // Verify project ownership
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id, active_branch_id')
            .eq('id', projectId)
            .eq('user_id', userId)
            .single();

        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        let query = supabase
            .from('project_assets')
            .select('*')
            .eq('branch_id', project.active_branch_id)
            .order('asset_type', { ascending: true })
            .order('name', { ascending: true });

        // Filter by type if provided
        if (type && typeof type === 'string') {
            query = query.eq('asset_type', type);
        }

        const { data: assets, error } = await query;

        if (error) {
            console.error('[ProjectAssets] List error:', error);
            return res.status(500).json({ error: 'Failed to fetch assets' });
        }

        res.json(assets);
    } catch (error) {
        console.error('[ProjectAssets] List error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/projects/:projectId/assets/:assetId
 * Get specific asset
 */
router.get('/:projectId/assets/:assetId', async (req, res) => {
    try {
        const userId = req.user!.id;
        const { projectId, assetId } = req.params;

        // Verify project ownership
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id')
            .eq('id', projectId)
            .eq('user_id', userId)
            .single();

        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const { data: asset, error } = await supabase
            .from('project_assets')
            .select('*')
            .eq('id', assetId)
            .eq('project_id', projectId)
            .single();

        if (error || !asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        res.json(asset);
    } catch (error) {
        console.error('[ProjectAssets] Get error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PUT /api/projects/:projectId/assets/:assetId
 * Update asset description or other fields
 */
router.put('/:projectId/assets/:assetId', async (req, res) => {
    try {
        const userId = req.user!.id;
        const { projectId, assetId } = req.params;
        const { name, description, image_prompt } = req.body;

        // Verify project ownership
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id')
            .eq('id', projectId)
            .eq('user_id', userId)
            .single();

        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Verify asset exists and is not locked
        const { data: existingAsset, error: fetchError } = await supabase
            .from('project_assets')
            .select('id, locked')
            .eq('id', assetId)
            .eq('project_id', projectId)
            .single();

        if (fetchError || !existingAsset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        if (existingAsset.locked) {
            return res.status(400).json({
                error: 'Cannot modify locked asset'
            });
        }

        // Build update object
        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (image_prompt !== undefined) updates.image_prompt = image_prompt;

        const { data: asset, error } = await supabase
            .from('project_assets')
            .update(updates)
            .eq('id', assetId)
            .eq('project_id', projectId)
            .select()
            .single();

        if (error) {
            console.error('[ProjectAssets] Update error:', error);
            return res.status(500).json({ error: 'Failed to update asset' });
        }

        res.json(asset);
    } catch (error) {
        console.error('[ProjectAssets] Update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/projects/:projectId/assets/:assetId
 * Remove asset from project
 */
router.delete('/:projectId/assets/:assetId', async (req, res) => {
    try {
        const userId = req.user!.id;
        const { projectId, assetId } = req.params;

        // Verify project ownership
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id')
            .eq('id', projectId)
            .eq('user_id', userId)
            .single();

        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Verify asset exists and is not locked
        const { data: existingAsset, error: fetchError } = await supabase
            .from('project_assets')
            .select('id, locked')
            .eq('id', assetId)
            .eq('project_id', projectId)
            .single();

        if (fetchError || !existingAsset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        if (existingAsset.locked) {
            return res.status(400).json({
                error: 'Cannot delete locked asset'
            });
        }

        const { error } = await supabase
            .from('project_assets')
            .delete()
            .eq('id', assetId)
            .eq('project_id', projectId);

        if (error) {
            console.error('[ProjectAssets] Delete error:', error);
            return res.status(500).json({ error: 'Failed to delete asset' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('[ProjectAssets] Delete error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/projects/:projectId/assets/merge
 * Merge two assets into one
 */
router.post('/:projectId/assets/merge', async (req, res) => {
    try {
        const userId = req.user!.id;
        const { projectId } = req.params;
        const { sourceAssetId, targetAssetId, mergedDescription } = req.body;

        if (!sourceAssetId || !targetAssetId || !mergedDescription) {
            return res.status(400).json({
                error: 'Missing required fields: sourceAssetId, targetAssetId, mergedDescription'
            });
        }

        // Verify project ownership
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id')
            .eq('id', projectId)
            .eq('user_id', userId)
            .single();

        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Verify both assets exist and are not locked
        const { data: assets, error: fetchError } = await supabase
            .from('project_assets')
            .select('id, locked, name')
            .eq('project_id', projectId)
            .in('id', [sourceAssetId, targetAssetId]);

        if (fetchError || !assets || assets.length !== 2) {
            return res.status(404).json({ error: 'One or both assets not found' });
        }

        const lockedAsset = assets.find(a => a.locked);
        if (lockedAsset) {
            return res.status(400).json({
                error: `Cannot merge locked asset: ${lockedAsset.name}`
            });
        }

        // Update target asset with merged description
        const { data: updatedAsset, error: updateError } = await supabase
            .from('project_assets')
            .update({ description: mergedDescription })
            .eq('id', targetAssetId)
            .eq('project_id', projectId)
            .select()
            .single();

        if (updateError) {
            console.error('[ProjectAssets] Merge update error:', updateError);
            return res.status(500).json({ error: 'Failed to update target asset' });
        }

        // Delete source asset
        const { error: deleteError } = await supabase
            .from('project_assets')
            .delete()
            .eq('id', sourceAssetId)
            .eq('project_id', projectId);

        if (deleteError) {
            console.error('[ProjectAssets] Merge delete error:', deleteError);
            return res.status(500).json({ error: 'Failed to delete source asset' });
        }

        console.log(`[ProjectAssets] Merged asset ${sourceAssetId} into ${targetAssetId}`);

        res.json(updatedAsset);
    } catch (error) {
        console.error('[ProjectAssets] Merge error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/projects/:projectId/assets
 * Manually create a new asset
 */
router.post('/:projectId/assets', async (req, res) => {
    try {
        const userId = req.user!.id;
        const { projectId } = req.params;
        const { name, asset_type, description, visual_style_capsule_id } = req.body;

        if (!name || !asset_type || !description) {
            return res.status(400).json({
                error: 'Missing required fields: name, asset_type, description'
            });
        }

        // Validate asset type
        const validTypes = ['character', 'prop', 'location'];
        if (!validTypes.includes(asset_type)) {
            return res.status(400).json({
                error: `Invalid asset type. Must be one of: ${validTypes.join(', ')}`
            });
        }

        // Verify project ownership
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id, active_branch_id')
            .eq('id', projectId)
            .eq('user_id', userId)
            .single();

        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Get locked visual style from Stage 5 if not provided
        let styleId = visual_style_capsule_id;
        if (!styleId) {
            const { data: stage5States } = await supabase
                .from('stage_states')
                .select('content')
                .eq('branch_id', project.active_branch_id)
                .eq('stage_number', 5)
                .order('version', { ascending: false })
                .limit(1);

            const stage5State = stage5States?.[0];
            styleId = stage5State?.content?.locked_visual_style_capsule_id;
        }

        const { data: asset, error } = await supabase
            .from('project_assets')
            .insert({
                project_id: projectId,
                branch_id: project.active_branch_id,
                name,
                asset_type,
                description,
                visual_style_capsule_id: styleId || null,
                locked: false
            })
            .select()
            .single();

        if (error) {
            console.error('[ProjectAssets] Create error:', error);
            return res.status(500).json({ error: 'Failed to create asset' });
        }

        res.status(201).json(asset);
    } catch (error) {
        console.error('[ProjectAssets] Create error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/projects/:projectId/assets/:assetId/generate-image
 * Generate image key for asset with type-specific aspect ratio
 */
router.post('/:projectId/assets/:assetId/generate-image', async (req, res) => {
    try {
        const userId = req.user!.id;
        const { projectId, assetId } = req.params;

        // Verify project ownership
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id, active_branch_id')
            .eq('id', projectId)
            .eq('user_id', userId)
            .single();

        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Get asset details
        const { data: asset, error: assetError } = await supabase
            .from('project_assets')
            .select('*')
            .eq('id', assetId)
            .eq('project_id', projectId)
            .single();

        if (assetError || !asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        // Use image_prompt if available, otherwise use description
        const prompt = asset.image_prompt || asset.description;

        console.log(`[ProjectAssets] Generating image for asset ${assetId} (${asset.asset_type})`);

        // Create image generation job (aspect ratio auto-determined by service)
        const result = await imageService.createImageJob({
            projectId,
            branchId: project.active_branch_id,
            jobType: 'master_asset',
            prompt,
            visualStyleCapsuleId: asset.visual_style_capsule_id,
            assetId,
            idempotencyKey: `asset-${assetId}-${Date.now()}`
        });

        res.json(result);
    } catch (error) {
        console.error('[ProjectAssets] Generate image error:', error);
        res.status(500).json({
            error: 'Image generation failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/projects/:projectId/assets/:assetId/lock
 * Lock individual asset
 */
router.post('/:projectId/assets/:assetId/lock', async (req, res) => {
    try {
        const userId = req.user!.id;
        const { projectId, assetId } = req.params;

        // Verify project ownership
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id')
            .eq('id', projectId)
            .eq('user_id', userId)
            .single();

        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Verify asset has image key
        const { data: asset, error: assetError } = await supabase
            .from('project_assets')
            .select('id, image_key_url')
            .eq('id', assetId)
            .eq('project_id', projectId)
            .single();

        if (assetError || !asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        if (!asset.image_key_url) {
            return res.status(400).json({
                error: 'Asset must have an image key before locking'
            });
        }

        // Lock the asset
        const { data: lockedAsset, error } = await supabase
            .from('project_assets')
            .update({ locked: true })
            .eq('id', assetId)
            .eq('project_id', projectId)
            .select()
            .single();

        if (error) {
            console.error('[ProjectAssets] Lock error:', error);
            return res.status(500).json({ error: 'Failed to lock asset' });
        }

        res.json(lockedAsset);
    } catch (error) {
        console.error('[ProjectAssets] Lock error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/projects/:projectId/assets/lock-all
 * Lock all assets (gatekeeper for Stage 6)
 */
router.post('/:projectId/assets/lock-all', async (req, res) => {
    try {
        const userId = req.user!.id;
        const { projectId } = req.params;

        // Verify project ownership
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id, active_branch_id')
            .eq('id', projectId)
            .eq('user_id', userId)
            .single();

        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Get all assets for the project
        const { data: assets, error: assetsError } = await supabase
            .from('project_assets')
            .select('id, locked, image_key_url')
            .eq('branch_id', project.active_branch_id);

        if (assetsError) {
            console.error('[ProjectAssets] Lock all fetch error:', assetsError);
            return res.status(500).json({ error: 'Failed to fetch assets' });
        }

        // Validate all assets have image keys
        const assetsWithoutImages = assets.filter(a => !a.image_key_url);
        if (assetsWithoutImages.length > 0) {
            return res.status(400).json({
                error: `${assetsWithoutImages.length} asset(s) missing image keys`
            });
        }

        // Lock all unlocked assets
        const unlockedAssetIds = assets.filter(a => !a.locked).map(a => a.id);

        if (unlockedAssetIds.length > 0) {
            const { error: lockError } = await supabase
                .from('project_assets')
                .update({ locked: true })
                .in('id', unlockedAssetIds);

            if (lockError) {
                console.error('[ProjectAssets] Lock all error:', lockError);
                return res.status(500).json({ error: 'Failed to lock assets' });
            }
        }

        console.log(`[ProjectAssets] Locked ${unlockedAssetIds.length} assets for project ${projectId}`);

        res.json({
            message: 'All assets locked successfully',
            lockedCount: unlockedAssetIds.length,
            totalCount: assets.length
        });
    } catch (error) {
        console.error('[ProjectAssets] Lock all error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/projects/:projectId/assets/:assetId/promote
 * Promote project asset to global library
 */
router.post('/:projectId/assets/:assetId/promote', async (req, res) => {
    try {
        const userId = req.user!.id;
        const { projectId, assetId } = req.params;

        // Verify project ownership
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id')
            .eq('id', projectId)
            .eq('user_id', userId)
            .single();

        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Get project asset
        const { data: projectAsset, error: assetError } = await supabase
            .from('project_assets')
            .select('*')
            .eq('id', assetId)
            .eq('project_id', projectId)
            .single();

        if (assetError || !projectAsset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        // Validate: must have locked image
        if (!projectAsset.image_key_url) {
            return res.status(400).json({
                error: 'Asset must have a generated image before promotion'
            });
        }

        // Create in global_assets table
        const { data: globalAsset, error: createError } = await supabase
            .from('global_assets')
            .insert({
                user_id: userId,
                name: projectAsset.name,
                asset_type: projectAsset.asset_type,
                description: projectAsset.description,
                image_prompt: projectAsset.image_prompt,
                image_key_url: projectAsset.image_key_url,
                visual_style_capsule_id: projectAsset.visual_style_capsule_id,
                promoted_from_project_id: projectId
            })
            .select()
            .single();

        if (createError) {
            console.error('[ProjectAssets] Promote error:', createError);
            return res.status(500).json({ error: 'Failed to promote asset' });
        }

        console.log(`[ProjectAssets] Promoted asset ${assetId} to global library as ${globalAsset.id}`);

        res.status(201).json(globalAsset);
    } catch (error) {
        console.error('[ProjectAssets] Promote error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export const projectAssetsRouter = router;

