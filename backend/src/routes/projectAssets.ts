/**
 * Project Assets Routes
 * Handles Stage 5 asset management for specific projects
 */

import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { AssetExtractionService } from '../services/assetExtractionService.js';
import { ImageGenerationService } from '../services/image-generation/ImageGenerationService.js';
import { ImageAnalysisService } from '../services/imageAnalysisService.js';
import { ProjectAssetAttemptsService } from '../services/projectAssetAttemptsService.js';
import { localizeAssetImage } from '../services/assetImageLocalizer.js';
import { mergeDescriptions } from '../services/assetDescriptionMerger.js';
import { extractManifest } from '../utils/scriptManifest.js';
import multer from 'multer';
import path from 'path';

const router = Router();
const extractionService = new AssetExtractionService();
const imageService = new ImageGenerationService();
const projectAssetAttemptsService = new ProjectAssetAttemptsService();

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only PNG, JPEG, and WebP are allowed.'));
    }
    cb(null, true);
  }
});

/**
 * POST /api/projects/:projectId/assets/extract
 * Aggregation-based extraction from Stage 4 scene dependencies
 * (Task 3B: Uses pre-extracted scene dependencies instead of parsing full script)
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

        // Run aggregation-based extraction (Task 3B: uses scene dependencies instead of full script)
        // masterScript parameter is deprecated but kept for backwards compatibility
        const extractedAssets = await extractionService.extractAssets(
            '', // Empty string - no longer used (scene aggregation replaces full script parsing)
            project.active_branch_id,
            visualStyleId
        );

        // Save to database (metadata column not in schema yet, will be added in future migration)
        const assetsToInsert = extractedAssets.map(asset => ({
            project_id: projectId,
            branch_id: project.active_branch_id,
            name: asset.name,
            asset_type: asset.type,
            description: asset.description,
            visual_style_capsule_id: visualStyleId,
            locked: false
            // TODO: Add metadata column to project_assets table in future migration
            // metadata: {
            //     confidence_score: asset.confidenceScore,
            //     is_priority: asset.isPriority,
            //     has_conflicts: asset.hasVisualConflicts,
            //     conflict_details: asset.conflictDetails,
            //     source_mentions: asset.mentions
            // }
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
 * POST /api/projects/:projectId/assets/extract-preview
 * Instant preview of entities aggregated from scene dependencies (no LLM).
 * Falls back to tiptapDoc from stage_states if scenes have empty dependencies.
 */
router.post('/:projectId/assets/extract-preview', async (req, res) => {
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

        // Try aggregation from scenes table first
        const entities = await extractionService.aggregatePreview(project.active_branch_id);

        // Fallback: if scenes have empty dependencies, try tiptapDoc from stage_states
        const hasPopulatedDeps = entities.length > 0;
        if (!hasPopulatedDeps) {
            console.log('[ProjectAssets] No scene dependencies found, trying tiptapDoc fallback');

            const { data: stage4States } = await supabase
                .from('stage_states')
                .select('content')
                .eq('branch_id', project.active_branch_id)
                .eq('stage_number', 4)
                .order('version', { ascending: false })
                .limit(1);

            const tiptapDoc = stage4States?.[0]?.content?.tiptapDoc;
            if (tiptapDoc) {
                const manifest = extractManifest(tiptapDoc);
                // Convert manifest to preview entities
                const entityMap = new Map<string, { name: string; type: string; sceneNumbers: number[]; mentionCount: number }>();

                for (const [, char] of manifest.globalCharacters) {
                    entityMap.set(`character:${char.name.toLowerCase()}`, {
                        name: char.name,
                        type: 'character',
                        sceneNumbers: char.sceneNumbers,
                        mentionCount: char.dialogueCount,
                    });
                }

                for (const loc of manifest.globalLocations) {
                    const sceneNums = manifest.scenes
                        .filter(s => s.location === loc)
                        .map(s => s.sceneNumber);
                    entityMap.set(`location:${loc.toLowerCase()}`, {
                        name: loc,
                        type: 'location',
                        sceneNumbers: sceneNums,
                        mentionCount: sceneNums.length,
                    });
                }

                for (const [, prop] of manifest.globalProps) {
                    entityMap.set(`prop:${prop.name.toLowerCase()}`, {
                        name: prop.name,
                        type: 'prop',
                        sceneNumbers: prop.sceneNumbers,
                        mentionCount: prop.contexts.length,
                    });
                }

                const previewEntities = Array.from(entityMap.values());
                const counts = {
                    characters: previewEntities.filter(e => e.type === 'character').length,
                    locations: previewEntities.filter(e => e.type === 'location').length,
                    props: previewEntities.filter(e => e.type === 'prop').length,
                };

                return res.json({ entities: previewEntities, counts });
            }
        }

        // Convert RawEntity[] to preview format
        const previewEntities = entities.map(e => ({
            name: e.name,
            type: e.type,
            sceneNumbers: [...new Set(e.mentions.map(m => m.sceneNumber))],
            mentionCount: e.mentions.length,
        }));

        const counts = {
            characters: previewEntities.filter(e => e.type === 'character').length,
            locations: previewEntities.filter(e => e.type === 'location').length,
            props: previewEntities.filter(e => e.type === 'prop').length,
        };

        res.json({ entities: previewEntities, counts });
    } catch (error) {
        console.error('[ProjectAssets] Extract preview error:', error);
        res.status(500).json({
            error: 'Preview extraction failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

/**
 * POST /api/projects/:projectId/assets/extract-confirm
 * Run LLM Pass 2 (visual distillation) only for user-selected entities.
 */
router.post('/:projectId/assets/extract-confirm', async (req, res) => {
    try {
        const userId = req.user!.id;
        const { projectId } = req.params;
        const { selectedEntities } = req.body;

        if (!selectedEntities || !Array.isArray(selectedEntities) || selectedEntities.length === 0) {
            return res.status(400).json({ error: 'selectedEntities array is required and must not be empty' });
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

        // Get visual style from Stage 5
        const { data: stage5States } = await supabase
            .from('stage_states')
            .select('content')
            .eq('branch_id', project.active_branch_id)
            .eq('stage_number', 5)
            .order('version', { ascending: false })
            .limit(1);

        const stage5Content = stage5States?.[0]?.content;
        const visualStyleId = stage5Content?.locked_visual_style_capsule_id;
        const manualVisualTone = stage5Content?.manual_visual_tone;
        if (!visualStyleId && !manualVisualTone) {
            return res.status(400).json({
                error: 'Visual Style Capsule or manual tone must be selected before extraction',
            });
        }

        // Filter out deleted entities, separate keep vs defer
        interface ConfirmEntity { name: string; type: string; decision?: string; sceneNumbers?: number[] }
        const keptEntities = selectedEntities.filter((e: ConfirmEntity) => !e.decision || e.decision === 'keep');
        const deferredEntities = selectedEntities.filter((e: ConfirmEntity) => e.decision === 'defer');
        const entitiesToProcess = [...keptEntities, ...deferredEntities];

        console.log(`[ProjectAssets] Confirming extraction: ${keptEntities.length} keep, ${deferredEntities.length} defer, ${selectedEntities.length - entitiesToProcess.length} deleted`);

        if (entitiesToProcess.length === 0) {
            return res.status(400).json({ error: 'No entities to process after filtering' });
        }

        const extractedAssets = await extractionService.extractSelectedAssets(
            project.active_branch_id,
            entitiesToProcess.map((e: ConfirmEntity) => ({ name: e.name, type: e.type })),
            visualStyleId,
            manualVisualTone
        );

        // Build a lookup from entity name+type to decision and sceneNumbers
        const entityLookup = new Map(
            selectedEntities.map((e: ConfirmEntity) => [
                `${e.type}:${e.name.toLowerCase()}`,
                { decision: e.decision || 'keep', sceneNumbers: e.sceneNumbers || [] }
            ])
        );

        // Save to database with deferred flag and scene_numbers
        const assetsToInsert = extractedAssets.map(asset => {
            const key = `${asset.type}:${asset.name.toLowerCase()}`;
            const entityInfo = entityLookup.get(key) || { decision: 'keep', sceneNumbers: [] };
            return {
                project_id: projectId,
                branch_id: project.active_branch_id,
                name: asset.name,
                asset_type: asset.type,
                description: asset.description,
                visual_style_capsule_id: visualStyleId || null,
                locked: false,
                deferred: entityInfo.decision === 'defer',
                scene_numbers: entityInfo.sceneNumbers,
                source: 'extracted',
            };
        });

        const { data: savedAssets, error: insertError } = await supabase
            .from('project_assets')
            .insert(assetsToInsert)
            .select();

        if (insertError) {
            console.error('[ProjectAssets] Insert error:', insertError);
            return res.status(500).json({ error: 'Failed to save extracted assets' });
        }

        console.log(`[ProjectAssets] Confirmed and saved ${savedAssets.length} assets`);
        res.json(savedAssets);
    } catch (error) {
        console.error('[ProjectAssets] Extract confirm error:', error);
        res.status(500).json({
            error: 'Asset extraction confirmation failed',
            message: error instanceof Error ? error.message : 'Unknown error',
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
 * GET /api/projects/:projectId/assets/version-sync-status
 * Check version sync status for all project assets that have global_asset_id
 */
router.get('/:projectId/assets/version-sync-status', async (req, res) => {
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

        // Get all project assets with global_asset_id set
        const { data: projectAssets, error: assetsError } = await supabase
            .from('project_assets')
            .select('id, global_asset_id, source_version, name')
            .eq('branch_id', project.active_branch_id)
            .not('global_asset_id', 'is', null);

        if (assetsError) {
            console.error('[ProjectAssets] Version sync fetch error:', assetsError);
            return res.status(500).json({ error: 'Failed to fetch project assets' });
        }

        if (!projectAssets || projectAssets.length === 0) {
            return res.json({ outdated: [] });
        }

        // Fetch corresponding global assets and compare versions
        const globalAssetIds = projectAssets
            .map(pa => pa.global_asset_id)
            .filter((id): id is string => id !== null);

        const { data: globalAssets, error: globalError } = await supabase
            .from('global_assets')
            .select('id, version, name')
            .in('id', globalAssetIds)
            .eq('user_id', userId);

        if (globalError) {
            console.error('[ProjectAssets] Version sync global fetch error:', globalError);
            return res.status(500).json({ error: 'Failed to fetch global assets' });
        }

        // Create a map of global assets for quick lookup
        const globalAssetMap = new Map(
            (globalAssets || []).map(ga => [ga.id, ga])
        );

        // Find outdated assets
        const outdated = projectAssets
            .filter(pa => {
                const globalAsset = globalAssetMap.get(pa.global_asset_id!);
                if (!globalAsset) return false; // Global asset deleted or not found
                return (pa.source_version || 0) < globalAsset.version;
            })
            .map(pa => {
                const globalAsset = globalAssetMap.get(pa.global_asset_id!);
                return {
                    projectAssetId: pa.id,
                    globalAssetId: pa.global_asset_id!,
                    projectVersion: pa.source_version || 0,
                    globalVersion: globalAsset?.version || 0,
                    globalAssetName: globalAsset?.name || 'Unknown',
                };
            });

        res.json({ outdated });
    } catch (error) {
        console.error('[ProjectAssets] Version sync status error:', error);
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
        const { name, description, image_prompt, deferred } = req.body;

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

        // Verify asset exists
        const { data: existingAsset, error: fetchError } = await supabase
            .from('project_assets')
            .select('id, locked, global_asset_id, overridden_fields')
            .eq('id', assetId)
            .eq('project_id', projectId)
            .single();

        if (fetchError || !existingAsset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        // Allow deferred toggling regardless of lock state
        // For other fields, check locked status
        const isOnlyDeferredUpdate = deferred !== undefined && name === undefined && description === undefined && image_prompt === undefined;
        if (existingAsset.locked && !isOnlyDeferredUpdate) {
            return res.status(400).json({
                error: 'Cannot modify locked asset'
            });
        }

        // Build update object
        const updates: any = {};
        const fieldsToTrack: string[] = [];

        if (deferred !== undefined) {
            updates.deferred = deferred;
        }
        if (name !== undefined) {
            updates.name = name;
            // Only track override if asset is linked to global (has inheritance)
            if (existingAsset.global_asset_id) {
                fieldsToTrack.push('name');
            }
        }
        if (description !== undefined) {
            updates.description = description;
            if (existingAsset.global_asset_id) {
                fieldsToTrack.push('description');
            }
        }
        if (image_prompt !== undefined) {
            updates.image_prompt = image_prompt;
            if (existingAsset.global_asset_id) {
                fieldsToTrack.push('image_prompt');
            }
        }

        // Update overridden_fields array: add new fields, keep existing ones
        if (existingAsset.global_asset_id && fieldsToTrack.length > 0) {
            const currentOverrides = (existingAsset.overridden_fields || []) as string[];
            const updatedOverrides = Array.from(new Set([...currentOverrides, ...fieldsToTrack]));
            updates.overridden_fields = updatedOverrides;
        }

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
        const { name, asset_type, description, visual_style_capsule_id, scene_numbers, source } = req.body;

        if (!name || !asset_type || !description) {
            return res.status(400).json({
                error: 'Missing required fields: name, asset_type, description'
            });
        }

        // Validate asset type
        const validTypes = ['character', 'prop', 'location', 'extra_archetype'];
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
            // Note: if using manual tone instead of capsule, styleId will be null — that's OK
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
                locked: false,
                source: source || 'manual',
                scene_numbers: scene_numbers || [],
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

        // Check for manual visual tone in stage state as fallback if no capsule ID
        let manualVisualTone: string | undefined;
        if (!asset.visual_style_capsule_id) {
            const { data: stage5States } = await supabase
                .from('stage_states')
                .select('content')
                .eq('branch_id', project.active_branch_id)
                .eq('stage_number', 5)
                .order('version', { ascending: false })
                .limit(1);

            const stageContent = stage5States?.[0]?.content;
            if (stageContent?.manual_visual_tone) {
                manualVisualTone = stageContent.manual_visual_tone;
                console.log(`[ProjectAssets] Using manual visual tone for asset ${assetId}`);
            }
        }

        // Create image generation job (aspect ratio auto-determined by service)
        const result = await imageService.createImageJob({
            projectId,
            branchId: project.active_branch_id,
            jobType: 'master_asset',
            prompt,
            visualStyleCapsuleId: asset.visual_style_capsule_id,
            manualVisualTone,
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
 * POST /api/projects/:projectId/assets/:assetId/upload-image
 * Upload image for project asset
 */
router.post('/:projectId/assets/:assetId/upload-image', upload.single('image'), async (req, res) => {
    try {
        const userId = req.user!.id;
        const { projectId, assetId } = req.params;

        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
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

        // Verify asset ownership
        const { data: asset, error: assetError } = await supabase
            .from('project_assets')
            .select('id, name')
            .eq('id', assetId)
            .eq('project_id', projectId)
            .single();

        if (assetError || !asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        // Generate unique filename
        const fileExt = path.extname(req.file.originalname);
        const fileName = `project/${projectId}/${assetId}/${Date.now()}-${Math.random().toString(36).substring(2)}${fileExt}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('asset-images')
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false
            });

        if (uploadError) {
            console.error('[ProjectAssets] Error uploading image:', uploadError);
            return res.status(500).json({ error: 'Failed to upload image' });
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('asset-images')
            .getPublicUrl(fileName);

        // Create generation attempt (enforce cap first)
        await projectAssetAttemptsService.enforceAttemptCap(assetId);
        await projectAssetAttemptsService.createAttempt(assetId, {
            image_url: urlData.publicUrl,
            storage_path: fileName,
            source: 'uploaded',
            is_selected: true,
            original_filename: req.file.originalname,
            file_size_bytes: req.file.size,
            mime_type: req.file.mimetype,
        });

        // Fetch updated asset (image_key_url is set by createAttempt)
        const { data: updatedAsset, error: updateError } = await supabase
            .from('project_assets')
            .select('*')
            .eq('id', assetId)
            .eq('project_id', projectId)
            .single();

        if (updateError) {
            console.error('[ProjectAssets] Error fetching updated asset:', updateError);
            return res.status(500).json({ error: 'Failed to fetch updated asset' });
        }

        console.log(`[ProjectAssets] Successfully uploaded image for asset ${assetId}`);
        res.json(updatedAsset);
    } catch (error) {
        console.error('[ProjectAssets] Unexpected error in image upload:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/projects/:projectId/assets/:assetId/analyze-image
 * Analyze uploaded image via Gemini Vision and extract visual description
 */
router.post('/:projectId/assets/:assetId/analyze-image', async (req, res) => {
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

        // Get asset details
        const { data: asset, error: assetError } = await supabase
            .from('project_assets')
            .select('id, name, asset_type, description, image_key_url')
            .eq('id', assetId)
            .eq('project_id', projectId)
            .single();

        if (assetError || !asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        if (!asset.image_key_url) {
            return res.status(400).json({ error: 'Asset has no image to analyze' });
        }

        const analysisService = new ImageAnalysisService();
        const result = await analysisService.analyzeAssetImage(
            asset.image_key_url,
            asset.description || '',
            asset.asset_type,
            asset.name
        );

        res.json(result);
    } catch (error) {
        console.error('[ProjectAssets] Analyze image error:', error);
        res.status(500).json({
            error: 'Image analysis failed',
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
 * POST /api/projects/:projectId/assets/mark-style-outdated
 * Mark all assets with images as style_outdated (3A.9)
 */
router.post('/:projectId/assets/mark-style-outdated', async (req, res) => {
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

        // Mark all assets with images as style_outdated
        const { data: updatedAssets, error: updateError } = await supabase
            .from('project_assets')
            .update({ style_outdated: true })
            .eq('branch_id', project.active_branch_id)
            .not('image_key_url', 'is', null)
            .select('id');

        if (updateError) {
            console.error('[ProjectAssets] Mark style outdated error:', updateError);
            return res.status(500).json({ error: 'Failed to mark assets as outdated' });
        }

        const count = updatedAssets?.length || 0;
        console.log(`[ProjectAssets] Marked ${count} assets as style_outdated for project ${projectId}`);

        res.json({ count });
    } catch (error) {
        console.error('[ProjectAssets] Mark style outdated error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/projects/:projectId/assets/clear-all-images
 * Clear all asset images for the branch (3A.9)
 */
router.post('/:projectId/assets/clear-all-images', async (req, res) => {
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

        // Clear image_key_url on all assets for the branch
        const { data: updatedAssets, error: updateError } = await supabase
            .from('project_assets')
            .update({ image_key_url: null, style_outdated: false })
            .eq('branch_id', project.active_branch_id)
            .not('image_key_url', 'is', null)
            .select('id');

        if (updateError) {
            console.error('[ProjectAssets] Clear all images error:', updateError);
            return res.status(500).json({ error: 'Failed to clear images' });
        }

        const count = updatedAssets?.length || 0;
        console.log(`[ProjectAssets] Cleared images for ${count} assets in project ${projectId}`);

        res.json({ count });
    } catch (error) {
        console.error('[ProjectAssets] Clear all images error:', error);
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
            .select('id, locked, image_key_url, deferred, asset_type')
            .eq('branch_id', project.active_branch_id);

        if (assetsError) {
            console.error('[ProjectAssets] Lock all fetch error:', assetsError);
            return res.status(500).json({ error: 'Failed to fetch assets' });
        }

        // Only validate active (non-deferred) assets
        const activeAssets = assets.filter(a => !a.deferred);

        // Gate assets = active assets excluding extra_archetypes (extras don't require images)
        const gateAssets = activeAssets.filter(a => a.asset_type !== 'extra_archetype');

        if (gateAssets.length === 0) {
            return res.status(400).json({
                error: 'No active assets to lock. At least one non-deferred asset is required.'
            });
        }

        // Validate gate assets have image keys (extra_archetypes exempt)
        const gateWithoutImages = gateAssets.filter(a => !a.image_key_url);
        if (gateWithoutImages.length > 0) {
            return res.status(400).json({
                error: `${gateWithoutImages.length} active asset(s) missing image keys`
            });
        }

        // Lock all active unlocked assets (skip deferred)
        const unlockedActiveIds = activeAssets.filter(a => !a.locked).map(a => a.id);

        if (unlockedActiveIds.length > 0) {
            const { error: lockError } = await supabase
                .from('project_assets')
                .update({ locked: true })
                .in('id', unlockedActiveIds);

            if (lockError) {
                console.error('[ProjectAssets] Lock all error:', lockError);
                return res.status(500).json({ error: 'Failed to lock assets' });
            }
        }

        console.log(`[ProjectAssets] Locked ${unlockedActiveIds.length} active assets for project ${projectId} (${assets.length - activeAssets.length} deferred)`);

        res.json({
            message: 'All active assets locked successfully',
            lockedCount: unlockedActiveIds.length,
            totalCount: activeAssets.length,
            deferredCount: assets.length - activeAssets.length,
        });
    } catch (error) {
        console.error('[ProjectAssets] Lock all error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/projects/:projectId/assets/clone-from-global
 * Clone/inherit a global asset into the project
 */
router.post('/:projectId/assets/clone-from-global', async (req, res) => {
    try {
        const userId = req.user!.id;
        const { projectId } = req.params;
        const { 
            globalAssetId, 
            overrideDescription, 
            target_branch_id,
            matchWithAssetId,
            descriptionStrategy,
            regenerateImage,
            nameStrategy,
            customName
        } = req.body;

        if (!globalAssetId) {
            return res.status(400).json({
                error: 'Missing required field: globalAssetId'
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

        // Determine target branch (use provided or project's active branch)
        const branchId = target_branch_id || project.active_branch_id;

        // Branch Validation: Verify branch belongs to project and user has write access
        const { data: branch, error: branchError } = await supabase
            .from('branches')
            .select('id, project_id')
            .eq('id', branchId)
            .eq('project_id', projectId)
            .single();

        if (branchError || !branch) {
            return res.status(404).json({ 
                error: 'Branch not found or does not belong to this project' 
            });
        }

        // Fetch global asset and verify ownership
        const { data: globalAsset, error: globalAssetError } = await supabase
            .from('global_assets')
            .select('*')
            .eq('id', globalAssetId)
            .eq('user_id', userId)
            .single();

        if (globalAssetError || !globalAsset) {
            return res.status(404).json({ 
                error: 'Global asset not found or access denied' 
            });
        }

        // Get the latest Stage 5 state for visual style inheritance
        const { data: stage5States, error: stage5Error } = await supabase
            .from('stage_states')
            .select('content')
            .eq('branch_id', branchId)
            .eq('stage_number', 5)
            .order('version', { ascending: false })
            .limit(1);

        if (stage5Error) {
            console.error('[ProjectAssets] Error fetching Stage 5 state:', stage5Error);
            // Continue without visual style if Stage 5 not completed yet
        }

        const stage5State = stage5States?.[0];
        const visualStyleCapsuleId = stage5State?.content?.locked_visual_style_capsule_id || globalAsset.visual_style_capsule_id;

        // If matching with existing asset, fetch it first
        let extractedAsset = null;
        if (matchWithAssetId) {
            const { data: asset, error: assetError } = await supabase
                .from('project_assets')
                .select('*')
                .eq('id', matchWithAssetId)
                .eq('branch_id', branchId)
                .eq('project_id', projectId)
                .single();

            if (assetError || !asset) {
                return res.status(404).json({
                    error: 'Extracted asset not found or does not belong to this project'
                });
            }

            // Verify it's an extracted asset (no global_asset_id)
            if (asset.global_asset_id) {
                return res.status(400).json({
                    error: 'Cannot match with an asset that is already linked to a global asset'
                });
            }

            extractedAsset = asset;
            console.log(`[ProjectAssets] Matching global asset ${globalAssetId} with extracted asset ${matchWithAssetId}`);
        }

        // Determine final name based on name strategy
        let finalName = globalAsset.name; // Default to global name
        if (matchWithAssetId && extractedAsset && nameStrategy) {
            if (nameStrategy === 'project') {
                // Use project asset name as-is
                finalName = extractedAsset.name;
            } else if (nameStrategy === 'global') {
                // Use global name with project name in parentheses
                finalName = `${globalAsset.name} (${extractedAsset.name})`;
            } else if (nameStrategy === 'custom' && customName) {
                // Use custom name with project name in parentheses
                finalName = `${customName.trim()} (${extractedAsset.name})`;
            } else {
                // Fallback to project name if custom name is missing
                finalName = extractedAsset.name;
            }
            console.log(`[ProjectAssets] Name strategy "${nameStrategy}" resulted in: "${finalName}"`);
        } else if (matchWithAssetId && extractedAsset) {
            // Default to project name if no strategy specified
            finalName = extractedAsset.name;
        }

        // Merge descriptions if matching
        let finalDescription = overrideDescription || globalAsset.description;
        if (matchWithAssetId && extractedAsset && descriptionStrategy) {
            const strategy = descriptionStrategy || 'merge';
            finalDescription = await mergeDescriptions(
                globalAsset.description,
                extractedAsset.description,
                strategy
            );
            console.log(`[ProjectAssets] Merged descriptions using strategy: ${strategy}`);
        }

        // Track overridden fields
        const overriddenFields: string[] = [];
        if (overrideDescription) {
            overriddenFields.push('description');
        }

        let projectAsset;

        if (matchWithAssetId && extractedAsset) {
            // UPDATE existing extracted asset instead of creating new
            const updateData: any = {
                global_asset_id: globalAssetId,
                source_version: globalAsset.version,
                name: finalName, // Use name based on name strategy
                description: finalDescription,
                image_prompt: globalAsset.image_prompt || extractedAsset.image_prompt,
                visual_style_capsule_id: visualStyleCapsuleId,
                overridden_fields: overriddenFields.length > 0 ? overriddenFields : undefined,
                updated_at: new Date().toISOString()
            };

            const { data: updatedAsset, error: updateError } = await supabase
                .from('project_assets')
                .update(updateData)
                .eq('id', matchWithAssetId)
                .select()
                .single();

            if (updateError) {
                console.error('[ProjectAssets] Failed to update matched asset:', updateError);
                return res.status(500).json({ error: 'Failed to update matched asset' });
            }

            projectAsset = updatedAsset;
            console.log(`[ProjectAssets] Updated extracted asset ${matchWithAssetId} with global asset data`);
        } else {
            // CREATE new asset (existing behavior)
            // Check for duplicate asset names (warn but allow)
            const { data: existingAssets } = await supabase
                .from('project_assets')
                .select('id, name')
                .eq('branch_id', branchId)
                .eq('name', globalAsset.name)
                .limit(1);

            if (existingAssets && existingAssets.length > 0) {
                console.warn(`[ProjectAssets] Warning: Asset with name "${globalAsset.name}" already exists in branch`);
            }

            const { data: newAsset, error: insertError } = await supabase
                .from('project_assets')
                .insert({
                    project_id: projectId,
                    branch_id: branchId, // CRITICAL: ensures branch isolation
                    global_asset_id: globalAssetId,
                    source_version: globalAsset.version,
                    name: globalAsset.name,
                    asset_type: globalAsset.asset_type,
                    description: finalDescription,
                    image_prompt: globalAsset.image_prompt,
                    image_key_url: null, // Will be updated after localization/generation
                    visual_style_capsule_id: visualStyleCapsuleId, // From branch's Stage 5 state
                    overridden_fields: overriddenFields.length > 0 ? overriddenFields : undefined, // Track overrides at clone time
                    locked: false
                })
                .select()
                .single();

            if (insertError) {
                console.error('[ProjectAssets] Clone insert error:', insertError);
                return res.status(500).json({ error: 'Failed to clone asset into project' });
            }

            projectAsset = newAsset;
            console.log(`[ProjectAssets] Created new project asset from global asset ${globalAssetId}`);
        }

        // Handle image: regenerate or localize
        const imageService = new ImageGenerationService();
        
        if (regenerateImage && globalAsset.image_key_url && visualStyleCapsuleId) {
            // Regenerate image with merged description and global image as reference
            try {
                console.log(`[ProjectAssets] Regenerating image for asset ${projectAsset.id} with reference image`);
                
                const jobResult = await imageService.createImageJob({
                    projectId,
                    branchId,
                    jobType: 'master_asset',
                    assetId: projectAsset.id,
                    prompt: finalDescription,
                    visualStyleCapsuleId,
                    referenceImageUrl: globalAsset.image_key_url, // Use global asset image as reference
                });

                // Image will be updated asynchronously when job completes
                // The job handler will update project_assets.image_key_url
                console.log(`[ProjectAssets] Image regeneration job ${jobResult.jobId} queued`);
            } catch (regenerateError) {
                console.error('[ProjectAssets] Failed to queue image regeneration:', regenerateError);
                // Continue without image regeneration - asset is still created/updated
            }
        } else if (globalAsset.image_key_url) {
            // Localize image (copy from global to project storage)
            try {
                const localizationResult = await localizeAssetImage({
                    sourceUrl: globalAsset.image_key_url,
                    targetProjectId: projectId,
                    targetBranchId: branchId,
                    assetId: projectAsset.id
                });

                // Update the asset with the localized image URL
                const { error: updateError } = await supabase
                    .from('project_assets')
                    .update({ image_key_url: localizationResult.newImageUrl })
                    .eq('id', projectAsset.id);

                if (updateError) {
                    console.error('[ProjectAssets] Failed to update localized image URL:', updateError);
                    // Continue without image update - asset is created but image URL not updated
                } else {
                    projectAsset.image_key_url = localizationResult.newImageUrl;
                    console.log(`[ProjectAssets] Localized image from global asset: ${localizationResult.newImageUrl}`);
                }
            } catch (localizeError) {
                console.error('[ProjectAssets] Failed to localize image:', localizeError);
                // Continue without image if localization fails (allow cloning without image)
            }
        }

        const action = matchWithAssetId ? 'matched' : 'cloned';
        console.log(`[ProjectAssets] Successfully ${action} global asset ${globalAssetId} to project ${projectId} as ${projectAsset.id}`);

        res.status(matchWithAssetId ? 200 : 201).json(projectAsset);
    } catch (error) {
        console.error('[ProjectAssets] Clone from global error:', error);
        res.status(500).json({
            error: 'Failed to clone asset from global library',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/projects/:projectId/assets/:assetId/sync-from-global
 * Sync project asset with latest version from global library
 */
router.post('/:projectId/assets/:assetId/sync-from-global', async (req, res) => {
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

        // Get project asset and verify it has global_asset_id
        const { data: projectAsset, error: assetError } = await supabase
            .from('project_assets')
            .select('*, overridden_fields')
            .eq('id', assetId)
            .eq('project_id', projectId)
            .eq('branch_id', project.active_branch_id)
            .single();

        if (assetError || !projectAsset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        if (!projectAsset.global_asset_id) {
            return res.status(400).json({
                error: 'Asset is not linked to a global asset'
            });
        }

        // Check if asset is locked
        if (projectAsset.locked) {
            return res.status(400).json({
                error: 'Cannot sync locked asset'
            });
        }

        // Fetch latest global asset version
        const { data: globalAsset, error: globalError } = await supabase
            .from('global_assets')
            .select('*')
            .eq('id', projectAsset.global_asset_id)
            .eq('user_id', userId)
            .single();

        if (globalError || !globalAsset) {
            return res.status(404).json({
                error: 'Global asset not found or access denied'
            });
        }

        // Localize image if it exists and has changed
        let updatedImageUrl = projectAsset.image_key_url;
        if (globalAsset.image_key_url && globalAsset.image_key_url !== projectAsset.image_key_url) {
            try {
                const localizationResult = await localizeAssetImage({
                    sourceUrl: globalAsset.image_key_url,
                    targetProjectId: projectId,
                    targetBranchId: project.active_branch_id,
                    assetId: projectAsset.id
                });
                updatedImageUrl = localizationResult.newImageUrl;
                console.log(`[ProjectAssets] Localized updated image: ${updatedImageUrl}`);
            } catch (localizeError) {
                console.error('[ProjectAssets] Failed to localize updated image:', localizeError);
                // Continue with existing image if localization fails
            }
        }

        // Get list of overridden fields to skip during sync
        // Ensure we're working with a proper array
        let overriddenFields: string[] = [];
        if (projectAsset.overridden_fields) {
            if (Array.isArray(projectAsset.overridden_fields)) {
                overriddenFields = projectAsset.overridden_fields as string[];
            } else if (typeof projectAsset.overridden_fields === 'string') {
                // Handle case where it might be stored as a string
                try {
                    overriddenFields = JSON.parse(projectAsset.overridden_fields);
                } catch {
                    overriddenFields = [];
                }
            }
        }
        
        console.log(`[ProjectAssets] Overridden fields for asset ${assetId}:`, overriddenFields);
        console.log(`[ProjectAssets] Current project description: "${projectAsset.description}"`);
        console.log(`[ProjectAssets] Global asset description: "${globalAsset.description}"`);
        
        // Build update object, skipping overridden fields
        // BUT: If user explicitly syncs, we'll clear overrides for synced fields (user is choosing to accept global version)
        const syncUpdates: any = {
            source_version: globalAsset.version,
            last_synced_at: new Date().toISOString(), // Track sync timestamp
        };
        
        // Track which fields we're syncing (to remove from overridden_fields)
        const fieldsBeingSynced: string[] = [];

        // Sync all fields - if user explicitly clicks sync, they're choosing to accept global version
        // This means we should sync even overridden fields and clear them from overridden_fields
        if (globalAsset.name !== undefined && globalAsset.name !== null) {
            syncUpdates.name = globalAsset.name;
            fieldsBeingSynced.push('name');
            if (overriddenFields.includes('name')) {
                console.log(`[ProjectAssets] Force syncing 'name' (was overridden, but user chose to sync)`);
            }
        }
        
        // Always sync description if not overridden, even if values appear the same
        if (!overriddenFields.includes('description')) {
            if (globalAsset.description !== undefined && globalAsset.description !== null) {
                syncUpdates.description = globalAsset.description;
                fieldsBeingSynced.push('description');
                console.log(`[ProjectAssets] Will sync description: "${globalAsset.description?.substring(0, 50)}..." (current: "${projectAsset.description?.substring(0, 50)}...")`);
            } else {
                console.warn(`[ProjectAssets] Global asset description is null/undefined, skipping sync`);
            }
        } else {
            // Description is overridden, but user clicked sync - they want to accept global version
            // So we'll sync it and remove from overridden_fields
            if (globalAsset.description !== undefined && globalAsset.description !== null) {
                syncUpdates.description = globalAsset.description;
                fieldsBeingSynced.push('description');
                console.log(`[ProjectAssets] Force syncing 'description' (was overridden, but user chose to sync). Global: "${globalAsset.description?.substring(0, 50)}..."`);
            }
        }
        
        if (!overriddenFields.includes('image_prompt')) {
            syncUpdates.image_prompt = globalAsset.image_prompt;
            fieldsBeingSynced.push('image_prompt');
        } else {
            // Force sync if user explicitly requested sync
            if (globalAsset.image_prompt !== undefined) {
                syncUpdates.image_prompt = globalAsset.image_prompt;
                fieldsBeingSynced.push('image_prompt');
                console.log(`[ProjectAssets] Force syncing 'image_prompt' (was overridden, but user chose to sync)`);
            } else {
                console.log(`[ProjectAssets] Skipping 'image_prompt' - marked as overridden`);
            }
        }
        
        if (!overriddenFields.includes('image_key_url')) {
            syncUpdates.image_key_url = updatedImageUrl;
            fieldsBeingSynced.push('image_key_url');
        } else {
            // Force sync if user explicitly requested sync
            if (updatedImageUrl) {
                syncUpdates.image_key_url = updatedImageUrl;
                fieldsBeingSynced.push('image_key_url');
                console.log(`[ProjectAssets] Force syncing 'image_key_url' (was overridden, but user chose to sync)`);
            } else {
                console.log(`[ProjectAssets] Skipping 'image_key_url' - marked as overridden`);
            }
        }
        
        if (!overriddenFields.includes('visual_style_capsule_id')) {
            syncUpdates.visual_style_capsule_id = globalAsset.visual_style_capsule_id || projectAsset.visual_style_capsule_id;
            fieldsBeingSynced.push('visual_style_capsule_id');
        } else {
            // Force sync if user explicitly requested sync
            if (globalAsset.visual_style_capsule_id !== undefined) {
                syncUpdates.visual_style_capsule_id = globalAsset.visual_style_capsule_id || projectAsset.visual_style_capsule_id;
                fieldsBeingSynced.push('visual_style_capsule_id');
                console.log(`[ProjectAssets] Force syncing 'visual_style_capsule_id' (was overridden, but user chose to sync)`);
            } else {
                console.log(`[ProjectAssets] Skipping 'visual_style_capsule_id' - marked as overridden`);
            }
        }
        
        // Remove synced fields from overridden_fields (user chose to accept global version)
        if (fieldsBeingSynced.length > 0 && overriddenFields.length > 0) {
            const remainingOverrides = overriddenFields.filter(field => !fieldsBeingSynced.includes(field));
            if (remainingOverrides.length !== overriddenFields.length) {
                syncUpdates.overridden_fields = remainingOverrides;
                console.log(`[ProjectAssets] Clearing overrides for synced fields: ${fieldsBeingSynced.join(', ')}. Remaining overrides: ${remainingOverrides.join(', ') || 'none'}`);
            }
        }

        // Log what we're syncing
        console.log(`[ProjectAssets] Syncing asset ${assetId}:`, {
            fieldsToSync: Object.keys(syncUpdates),
            overriddenFields: overriddenFields,
            globalVersion: globalAsset.version,
            projectVersion: projectAsset.source_version,
            syncUpdates: JSON.stringify(syncUpdates, null, 2)
        });

        // Log which fields were skipped due to overrides
        if (overriddenFields.length > 0) {
            const skippedFields = overriddenFields.filter(field => 
                ['name', 'description', 'image_prompt', 'image_key_url', 'visual_style_capsule_id'].includes(field)
            );
            if (skippedFields.length > 0) {
                console.log(`[ProjectAssets] Skipped syncing overridden fields: ${skippedFields.join(', ')}`);
            }
        }

        // Update project asset with latest global asset data
        // Preserve project-specific overrides
        console.log(`[ProjectAssets] Executing update with syncUpdates:`, JSON.stringify(syncUpdates, null, 2));
        
        const { data: updatedAsset, error: updateError } = await supabase
            .from('project_assets')
            .update(syncUpdates)
            .eq('id', assetId)
            .eq('project_id', projectId)
            .select()
            .single();

        if (updateError) {
            console.error('[ProjectAssets] Sync update error:', updateError);
            return res.status(500).json({ error: 'Failed to sync asset' });
        }

        // Verify what was actually updated
        console.log(`[ProjectAssets] Update completed. Updated asset description: "${updatedAsset?.description?.substring(0, 50)}..."`);
        console.log(`[ProjectAssets] Successfully synced asset ${assetId} from global asset ${globalAsset.id} (v${globalAsset.version})`);

        res.json(updatedAsset);
    } catch (error) {
        console.error('[ProjectAssets] Sync from global error:', error);
        res.status(500).json({
            error: 'Failed to sync asset from global library',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
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

// ============================================================================
// PROJECT ASSET GENERATION ATTEMPTS (3A.6)
// ============================================================================

/**
 * GET /api/projects/:projectId/assets/:assetId/attempts
 * List all generation attempts for a project asset
 */
router.get('/:projectId/assets/:assetId/attempts', async (req, res) => {
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

        // Verify asset belongs to project
        const { data: asset, error: assetError } = await supabase
            .from('project_assets')
            .select('id')
            .eq('id', assetId)
            .eq('project_id', projectId)
            .single();

        if (assetError || !asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        // Lazy backfill: if asset has image but no attempts, create one
        await projectAssetAttemptsService.backfillAttemptIfNeeded(assetId);

        const attempts = await projectAssetAttemptsService.listAttempts(assetId);
        res.json(attempts);
    } catch (error) {
        console.error('[ProjectAssets] List attempts error:', error);
        res.status(500).json({ error: 'Failed to list attempts' });
    }
});

/**
 * POST /api/projects/:projectId/assets/:assetId/attempts/:attemptId/select
 * Select a generation attempt as the active image
 */
router.post('/:projectId/assets/:assetId/attempts/:attemptId/select', async (req, res) => {
    try {
        const userId = req.user!.id;
        const { projectId, assetId, attemptId } = req.params;

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

        const attempt = await projectAssetAttemptsService.selectAttempt(assetId, attemptId);
        res.json(attempt);
    } catch (error) {
        console.error('[ProjectAssets] Select attempt error:', error);
        const message = error instanceof Error ? error.message : 'Failed to select attempt';
        res.status(500).json({ error: message });
    }
});

/**
 * DELETE /api/projects/:projectId/assets/:assetId/attempts/:attemptId
 * Delete a generation attempt
 */
router.delete('/:projectId/assets/:assetId/attempts/:attemptId', async (req, res) => {
    try {
        const userId = req.user!.id;
        const { projectId, assetId, attemptId } = req.params;

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

        await projectAssetAttemptsService.deleteAttempt(assetId, attemptId);
        res.status(204).send();
    } catch (error) {
        console.error('[ProjectAssets] Delete attempt error:', error);
        const message = error instanceof Error ? error.message : 'Failed to delete attempt';
        res.status(400).json({ error: message });
    }
});

// ============================================================================
// 3C.2: ANGLE VARIANT ENDPOINTS
// ============================================================================

/**
 * GET /api/projects/:projectId/assets/:assetId/angle-variants
 * List all angle variants for a character asset
 */
router.get('/:projectId/assets/:assetId/angle-variants', async (req, res) => {
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

        // Verify asset belongs to project
        const { data: asset, error: assetError } = await supabase
            .from('project_assets')
            .select('id, asset_type')
            .eq('id', assetId)
            .eq('project_id', projectId)
            .single();

        if (assetError || !asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        const { data: variants, error } = await supabase
            .from('asset_angle_variants')
            .select('*')
            .eq('project_asset_id', assetId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[ProjectAssets] List angle variants error:', error);
            return res.status(500).json({ error: 'Failed to list angle variants' });
        }

        res.json(variants || []);
    } catch (error) {
        console.error('[ProjectAssets] List angle variants error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/projects/:projectId/assets/:assetId/angle-variants/generate
 * Generate angle variant(s) for a character asset.
 * Body: { angleTypes: ('front' | 'side' | 'three_quarter' | 'back')[] }
 */
router.post('/:projectId/assets/:assetId/angle-variants/generate', async (req, res) => {
    try {
        const userId = req.user!.id;
        const { projectId, assetId } = req.params;
        const { angleTypes } = req.body;

        if (!angleTypes || !Array.isArray(angleTypes) || angleTypes.length === 0) {
            return res.status(400).json({ error: 'angleTypes array is required' });
        }

        const validAngles = ['front', 'side', 'three_quarter', 'back'];
        const invalidAngles = angleTypes.filter((a: string) => !validAngles.includes(a));
        if (invalidAngles.length > 0) {
            return res.status(400).json({ error: `Invalid angle types: ${invalidAngles.join(', ')}` });
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

        // Verify asset is a character
        const { data: asset, error: assetError } = await supabase
            .from('project_assets')
            .select('id, asset_type, visual_style_capsule_id')
            .eq('id', assetId)
            .eq('project_id', projectId)
            .single();

        if (assetError || !asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        if (asset.asset_type !== 'character') {
            return res.status(400).json({ error: 'Multi-angle generation is only supported for character assets' });
        }

        // Get visual style: from asset or from stage 5 state
        let visualStyleCapsuleId = asset.visual_style_capsule_id;
        let manualVisualTone: string | undefined;

        if (!visualStyleCapsuleId) {
            const { data: stage5States } = await supabase
                .from('stage_states')
                .select('content')
                .eq('branch_id', project.active_branch_id)
                .eq('stage_number', 5)
                .order('version', { ascending: false })
                .limit(1);

            const stageContent = stage5States?.[0]?.content;
            visualStyleCapsuleId = stageContent?.locked_visual_style_capsule_id;
            if (!visualStyleCapsuleId && stageContent?.manual_visual_tone) {
                manualVisualTone = stageContent.manual_visual_tone;
            }
        }

        if (!visualStyleCapsuleId && !manualVisualTone) {
            return res.status(400).json({ error: 'Visual style is required. Set a style capsule or manual tone in Stage 5.' });
        }

        const variants = [];
        const jobIds = [];

        for (const angleType of angleTypes) {
            // Upsert: create or reset existing variant row
            const { data: variant, error: upsertError } = await supabase
                .from('asset_angle_variants')
                .upsert(
                    {
                        project_asset_id: assetId,
                        angle_type: angleType,
                        status: 'pending',
                        image_url: null,
                        storage_path: null,
                        image_generation_job_id: null,
                    },
                    { onConflict: 'project_asset_id,angle_type' }
                )
                .select()
                .single();

            if (upsertError || !variant) {
                console.error(`[ProjectAssets] Failed to upsert angle variant ${angleType}:`, upsertError);
                continue;
            }

            // Kick off generation job
            const result = await imageService.createAngleVariantJob(
                variant.id,
                assetId,
                angleType,
                projectId,
                project.active_branch_id,
                visualStyleCapsuleId || undefined,
                manualVisualTone
            );

            variants.push(variant);
            jobIds.push(result.jobId);
        }

        res.json({ variants, jobIds });
    } catch (error) {
        console.error('[ProjectAssets] Generate angle variants error:', error);
        res.status(500).json({
            error: 'Angle variant generation failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

/**
 * DELETE /api/projects/:projectId/assets/:assetId/angle-variants/:variantId
 * Delete a specific angle variant
 */
router.delete('/:projectId/assets/:assetId/angle-variants/:variantId', async (req, res) => {
    try {
        const userId = req.user!.id;
        const { projectId, assetId, variantId } = req.params;

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

        // Verify variant belongs to the correct asset
        const { data: variant, error: variantError } = await supabase
            .from('asset_angle_variants')
            .select('id, storage_path')
            .eq('id', variantId)
            .eq('project_asset_id', assetId)
            .single();

        if (variantError || !variant) {
            return res.status(404).json({ error: 'Angle variant not found' });
        }

        // Delete storage file if it exists
        if (variant.storage_path) {
            await supabase.storage
                .from('asset-images')
                .remove([variant.storage_path]);
        }

        // Delete the variant row
        const { error: deleteError } = await supabase
            .from('asset_angle_variants')
            .delete()
            .eq('id', variantId);

        if (deleteError) {
            console.error('[ProjectAssets] Delete angle variant error:', deleteError);
            return res.status(500).json({ error: 'Failed to delete angle variant' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('[ProjectAssets] Delete angle variant error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export const projectAssetsRouter = router;

