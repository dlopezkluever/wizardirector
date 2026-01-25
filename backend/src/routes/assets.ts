import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { ImageGenerationService } from '../services/image-generation/ImageGenerationService.js';
import multer from 'multer';
import path from 'path';

const router = Router();
const imageService = new ImageGenerationService();

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

        // Validate: at least one of image_key_url OR description required
        // Note: image_key_url will be set after upload/generation, so we check description here
        // Description validation happens at creation time
        if (description.length < 10) {
            return res.status(400).json({
                error: 'Description must be at least 10 characters (or provide an image)'
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
            voiceProfileId,
            removeImage
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

        // Validate: at least one of image_key_url OR description required
        // Get current asset to check if it has an image
        const { data: currentAsset } = await supabase
            .from('global_assets')
            .select('image_key_url, description')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        // If description is being updated, validate it
        if (description !== undefined) {
            if (description.length < 10) {
                // Check if asset has an image - if yes, description can be shorter
                if (!currentAsset?.image_key_url) {
                    return res.status(400).json({
                        error: 'Description must be at least 10 characters (or provide an image)'
                    });
                }
            }
        }

        // If description is being removed/cleared, ensure image exists
        if (description === '' && !currentAsset?.image_key_url) {
            return res.status(400).json({
                error: 'Asset must have either a description (min 10 chars) or an image'
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
        
        // Handle image removal
        if (removeImage === true) {
            updates.image_key_url = null;
        }

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

// POST /api/assets/:id/upload-image - Upload image for global asset
router.post('/:id/upload-image', upload.single('image'), async (req, res) => {
    try {
        const userId = req.user!.id;
        const assetId = req.params.id;

        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        // Verify asset ownership
        const { data: asset, error: fetchError } = await supabase
            .from('global_assets')
            .select('id, name, version')
            .eq('id', assetId)
            .eq('user_id', userId)
            .single();

        if (fetchError || !asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        // Generate unique filename
        const fileExt = path.extname(req.file.originalname);
        const fileName = `global/${userId}/${assetId}/${Date.now()}-${Math.random().toString(36).substring(2)}${fileExt}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('asset-images')
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false
            });

        if (uploadError) {
            console.error('[Assets API] Error uploading image:', uploadError);
            return res.status(500).json({ error: 'Failed to upload image' });
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('asset-images')
            .getPublicUrl(fileName);

        // Update asset with image URL and increment version
        const { data: updatedAsset, error: updateError } = await supabase
            .from('global_assets')
            .update({
                image_key_url: urlData.publicUrl,
                version: asset.version + 1
            })
            .eq('id', assetId)
            .eq('user_id', userId)
            .select()
            .single();

        if (updateError) {
            console.error('[Assets API] Error updating asset with image URL:', updateError);
            return res.status(500).json({ error: 'Failed to update asset with image URL' });
        }

        console.log(`[Assets API] Successfully uploaded image for asset ${assetId}`);
        res.json(updatedAsset);
    } catch (error) {
        console.error('[Assets API] Unexpected error in image upload:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/assets/:id/generate-image - Generate/regenerate image key for global asset
router.post('/:id/generate-image', async (req, res) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;
        const { prompt, visualStyleCapsuleId } = req.body;

        // Verify asset ownership
        const { data: asset, error: fetchError } = await supabase
            .from('global_assets')
            .select('id, name, asset_type, description, image_prompt, visual_style_capsule_id')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (fetchError || !asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        // Use provided prompt, or image_prompt, or description
        const finalPrompt = prompt || asset.image_prompt || asset.description;
        if (!finalPrompt) {
            return res.status(400).json({
                error: 'No prompt available. Please provide a prompt, or ensure the asset has a description or image_prompt.'
            });
        }

        // Use provided visual style or asset's visual style
        const finalVisualStyleId = visualStyleCapsuleId || asset.visual_style_capsule_id;

        console.log(`[Assets API] Image generation requested for global asset ${id}`);

        // Create image generation job for global asset
        const result = await imageService.createGlobalAssetImageJob({
            assetId: id,
            userId,
            prompt: finalPrompt,
            visualStyleCapsuleId: finalVisualStyleId,
            idempotencyKey: `global-asset-${id}-${Date.now()}`
        });

        res.json(result);
    } catch (error) {
        console.error('[Assets API] Image generation error:', error);
        res.status(500).json({
            error: 'Image generation failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export const assetsRouter = router;

