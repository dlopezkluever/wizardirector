import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { ImageGenerationService } from '../services/image-generation/ImageGenerationService.js';

const router = Router();
const imageService = new ImageGenerationService();

// GET /api/assets - List all global assets for authenticated user
router.get('/', async (req, res) => {
    try {
        const userId = req.user!.id;
        const { type, search, has_image } = req.query;

        let query = supabase
            .from('global_assets')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        // Apply filters
        if (type && typeof type === 'string') {
            query = query.eq('asset_type', type);
        }

        if (search && typeof search === 'string') {
            query = query.ilike('name', `%${search}%`);
        }

        if (has_image === 'true') {
            query = query.not('image_key_url', 'is', null);
        } else if (has_image === 'false') {
            query = query.is('image_key_url', null);
        }

        const { data: assets, error } = await query;

        if (error) {
            console.error('Error fetching assets:', error);
            return res.status(500).json({ error: 'Failed to fetch assets' });
        }

        res.json(assets);
    } catch (error) {
        console.error('[Assets API] List error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/assets/:id - Get specific asset
router.get('/:id', async (req, res) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        const { data: asset, error } = await supabase
            .from('global_assets')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (error || !asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        res.json(asset);
    } catch (error) {
        console.error('[Assets API] Get error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/assets - Create new global asset
router.post('/', async (req, res) => {
    try {
        const userId = req.user!.id;
        const {
            name,
            assetType,
            description,
            imagePrompt,
            visualStyleCapsuleId,
            voiceProfileId,
            promotedFromProjectId
        } = req.body;

        // Validate required fields
        if (!name || !assetType || !description) {
            return res.status(400).json({
                error: 'Missing required fields: name, assetType, description'
            });
        }

        // Validate asset type
        const validTypes = ['character', 'prop', 'location'];
        if (!validTypes.includes(assetType)) {
            return res.status(400).json({
                error: `Invalid asset type. Must be one of: ${validTypes.join(', ')}`
            });
        }

        // Validate description length
        if (description.length < 10) {
            return res.status(400).json({
                error: 'Description must be at least 10 characters'
            });
        }

        // If promoted from project, verify project ownership
        if (promotedFromProjectId) {
            const { data: project, error: projectError } = await supabase
                .from('projects')
                .select('id')
                .eq('id', promotedFromProjectId)
                .eq('user_id', userId)
                .single();

            if (projectError || !project) {
                return res.status(404).json({ error: 'Project not found' });
            }
        }

        const { data: asset, error } = await supabase
            .from('global_assets')
            .insert({
                user_id: userId,
                name,
                asset_type: assetType,
                description,
                image_prompt: imagePrompt || null,
                visual_style_capsule_id: visualStyleCapsuleId || null,
                voice_profile_id: voiceProfileId || null,
                promoted_from_project_id: promotedFromProjectId || null
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating asset:', error);
            return res.status(500).json({ error: 'Failed to create asset' });
        }

        res.status(201).json(asset);
    } catch (error) {
        console.error('[Assets API] Create error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/assets/:id - Update asset
router.put('/:id', async (req, res) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;
        const {
            name,
            assetType,
            description,
            imagePrompt,
            visualStyleCapsuleId,
            voiceProfileId
        } = req.body;

        // Verify asset ownership
        const { data: existingAsset, error: fetchError } = await supabase
            .from('global_assets')
            .select('id, version')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (fetchError || !existingAsset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        // Validate asset type if provided
        if (assetType) {
            const validTypes = ['character', 'prop', 'location'];
            if (!validTypes.includes(assetType)) {
                return res.status(400).json({
                    error: `Invalid asset type. Must be one of: ${validTypes.join(', ')}`
                });
            }
        }

        // Validate description length if provided
        if (description && description.length < 10) {
            return res.status(400).json({
                error: 'Description must be at least 10 characters'
            });
        }

        // Build update object
        const updates: any = {
            version: existingAsset.version + 1 // Increment version
        };

        if (name !== undefined) updates.name = name;
        if (assetType !== undefined) updates.asset_type = assetType;
        if (description !== undefined) updates.description = description;
        if (imagePrompt !== undefined) updates.image_prompt = imagePrompt;
        if (visualStyleCapsuleId !== undefined) updates.visual_style_capsule_id = visualStyleCapsuleId;
        if (voiceProfileId !== undefined) updates.voice_profile_id = voiceProfileId;

        const { data: asset, error } = await supabase
            .from('global_assets')
            .update(updates)
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) {
            console.error('Error updating asset:', error);
            return res.status(500).json({ error: 'Failed to update asset' });
        }

        res.json(asset);
    } catch (error) {
        console.error('[Assets API] Update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/assets/:id - Delete asset with dependency checking
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        // Verify asset ownership
        const { data: asset, error: fetchError } = await supabase
            .from('global_assets')
            .select('id, name')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (fetchError || !asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        // Check for dependencies in project_assets
        const { data: usage, error: usageError } = await supabase
            .from('project_assets')
            .select(`
                project_id,
                projects!inner (
                    id,
                    title,
                    user_id
                )
            `)
            .eq('global_asset_id', id);

        if (usageError) {
            console.error('Error checking asset usage:', usageError);
            return res.status(500).json({ error: 'Failed to check asset usage' });
        }

        if (usage && usage.length > 0) {
            const projects = usage.map((u: any) => ({
                id: u.projects.id,
                title: u.projects.title
            }));

            return res.status(409).json({
                error: 'Asset is in use',
                message: `This asset is used in ${projects.length} project(s) and cannot be deleted`,
                projects
            });
        }

        // Delete asset
        const { error: deleteError } = await supabase
            .from('global_assets')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (deleteError) {
            console.error('Error deleting asset:', deleteError);
            return res.status(500).json({ error: 'Failed to delete asset' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('[Assets API] Delete error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/assets/:id/generate-image - Generate/regenerate image key
// NOTE: Image generation for global assets requires special handling
// This endpoint is currently commented out pending integration with image service
// that supports global asset context (assets not tied to projects)
/*
router.post('/:id/generate-image', async (req, res) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;
        const { prompt, visualStyleCapsuleId } = req.body;

        // Validate required fields
        if (!prompt) {
            return res.status(400).json({
                error: 'Missing required field: prompt'
            });
        }

        // Verify asset ownership
        const { data: asset, error: fetchError } = await supabase
            .from('global_assets')
            .select('id, name, asset_type')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (fetchError || !asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        console.log(`[Assets API] Image generation requested for asset ${id}`);

        // Create a temporary project context for image generation
        // Global assets don't have projectId/branchId, so we'll use special handling
        const result = await imageService.createImageJob({
            projectId: null as any, // Global asset context
            branchId: null as any, // Global asset context
            jobType: 'asset_key',
            prompt,
            visualStyleCapsuleId: visualStyleCapsuleId || asset.visual_style_capsule_id,
            assetId: id,
            width: 1024,
            height: 1024,
            idempotencyKey: `asset-${id}-${Date.now()}`
        });

        res.json(result);
    } catch (error) {
        console.error('[Assets API] Image generation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
*/

export const assetsRouter = router;

