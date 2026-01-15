import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import multer from 'multer';
import path from 'path';
import { capsuleToApi, capsulesToApi, libraryToApi, librariesToApi } from '../transformers/styleCapsule.js';

const router = Router();

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only PNG, JPEG, and WebP are allowed.'));
    }
    cb(null, true);
  }
});

// GET /api/style-capsules - List all accessible capsules (user + presets)
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;

    const { data: capsules, error } = await supabase
      .from('style_capsules')
      .select(`
        id,
        name,
        type,
        is_preset,
        is_favorite,
        created_at,
        updated_at,
        style_capsule_libraries (
          name,
          user_id
        )
      `)
      .or(`user_id.eq.${userId},is_preset.eq.true`)
      .order('is_preset', { ascending: false }) // Presets first
      .order('name');

    if (error) {
      console.error('Error fetching style capsules:', error);
      return res.status(500).json({ error: 'Failed to fetch style capsules' });
    }

    res.json({ data: capsulesToApi(capsules) });
  } catch (error) {
    console.error('Unexpected error in style capsules list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/style-capsules/:id - Get single capsule details
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const capsuleId = req.params.id;

    const { data: capsule, error } = await supabase
      .from('style_capsules')
      .select('*')
      .eq('id', capsuleId)
      .or(`user_id.eq.${userId},is_preset.eq.true`)
      .single();

    if (error) {
      console.error('Error fetching style capsule:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Style capsule not found' });
      }
      return res.status(500).json({ error: 'Failed to fetch style capsule' });
    }

    res.json({ data: capsuleToApi(capsule) });
  } catch (error) {
    console.error('Unexpected error in style capsule fetch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/style-capsules - Create new capsule
router.post('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { name, type, ...capsuleData } = req.body;

    // Validate required fields
    if (!name || !type) {
      return res.status(400).json({
        error: 'Missing required fields: name, type'
      });
    }

    if (!['writing', 'visual'].includes(type)) {
      return res.status(400).json({
        error: 'Type must be either "writing" or "visual"'
      });
    }

    // Map camelCase to snake_case for database
    const dbData: any = {
      name,
      type,
      library_id: null, // No library needed
      user_id: userId,
      is_preset: false, // User capsules are always custom
    };

    // Map writing style fields
    if (type === 'writing') {
      if (capsuleData.exampleTextExcerpts) dbData.example_text_excerpts = capsuleData.exampleTextExcerpts;
      if (capsuleData.styleLabels) dbData.style_labels = capsuleData.styleLabels;
      if (capsuleData.negativeConstraints) dbData.negative_constraints = capsuleData.negativeConstraints;
      if (capsuleData.freeformNotes) dbData.freeform_notes = capsuleData.freeformNotes;
    }

    // Map visual style fields
    if (type === 'visual') {
      if (capsuleData.designPillars) dbData.design_pillars = capsuleData.designPillars;
      if (capsuleData.referenceImageUrls) dbData.reference_image_urls = capsuleData.referenceImageUrls;
      if (capsuleData.descriptorStrings) dbData.descriptor_strings = capsuleData.descriptorStrings;
    }

    // Create the capsule
    const { data: capsule, error } = await supabase
      .from('style_capsules')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      console.error('Error creating style capsule:', error);
      console.error('Full error details:', JSON.stringify(error, null, 2));
      console.error('Attempted data:', JSON.stringify({
        name,
        type,
        library_id: null,
        user_id: userId,
        is_preset: false,
        ...capsuleData
      }, null, 2));
      return res.status(500).json({ error: 'Failed to create style capsule', details: error.message });
    }

    res.status(201).json({ data: capsuleToApi(capsule) });
  } catch (error) {
    console.error('Unexpected error in style capsule creation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/style-capsules/:id - Update capsule
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const capsuleId = req.params.id;
    const updates = req.body;

    // Cannot update preset capsules
    const { data: existingCapsule, error: fetchError } = await supabase
      .from('style_capsules')
      .select('is_preset, user_id')
      .eq('id', capsuleId)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: 'Style capsule not found' });
    }

    if (existingCapsule.is_preset) {
      return res.status(403).json({ error: 'Cannot modify preset capsules' });
    }

    if (existingCapsule.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update the capsule
    const { data: capsule, error } = await supabase
      .from('style_capsules')
      .update(updates)
      .eq('id', capsuleId)
      .select()
      .single();

    if (error) {
      console.error('Error updating style capsule:', error);
      return res.status(500).json({ error: 'Failed to update style capsule' });
    }

    res.json({ data: capsuleToApi(capsule) });
  } catch (error) {
    console.error('Unexpected error in style capsule update:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/style-capsules/:id - Delete capsule
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const capsuleId = req.params.id;

    // Check ownership and preset status
    const { data: capsule, error: fetchError } = await supabase
      .from('style_capsules')
      .select('is_preset, user_id')
      .eq('id', capsuleId)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: 'Style capsule not found' });
    }

    if (capsule.is_preset) {
      return res.status(403).json({ error: 'Cannot delete preset capsules' });
    }

    if (capsule.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete the capsule
    const { error } = await supabase
      .from('style_capsules')
      .delete()
      .eq('id', capsuleId);

    if (error) {
      console.error('Error deleting style capsule:', error);
      return res.status(500).json({ error: 'Failed to delete style capsule' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Unexpected error in style capsule deletion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/style-capsules/:id/favorite - Toggle favorite status
router.post('/:id/favorite', async (req, res) => {
  try {
    const userId = req.user!.id;
    const capsuleId = req.params.id;

    // Check access
    const { data: capsule, error: fetchError } = await supabase
      .from('style_capsules')
      .select('user_id, is_favorite')
      .eq('id', capsuleId)
      .or(`user_id.eq.${userId},is_preset.eq.true`)
      .single();

    if (fetchError || !capsule) {
      return res.status(404).json({ error: 'Style capsule not found' });
    }

    // Toggle favorite status
    const newFavoriteStatus = !capsule.is_favorite;
    const { data: updatedCapsule, error } = await supabase
      .from('style_capsules')
      .update({ is_favorite: newFavoriteStatus })
      .eq('id', capsuleId)
      .select()
      .single();

    if (error) {
      console.error('Error toggling favorite status:', error);
      return res.status(500).json({ error: 'Failed to update favorite status' });
    }

    res.json({ data: capsuleToApi(updatedCapsule) });
  } catch (error) {
    console.error('Unexpected error in favorite toggle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/style-capsules/:id/duplicate - Duplicate preset to user's library
router.post('/:id/duplicate', async (req, res) => {
  try {
    const userId = req.user!.id;
    const capsuleId = req.params.id;
    const { libraryId, newName } = req.body;

    if (!libraryId) {
      return res.status(400).json({ error: 'libraryId is required' });
    }

    // Get the preset capsule
    const { data: presetCapsule, error: fetchError } = await supabase
      .from('style_capsules')
      .select('*')
      .eq('id', capsuleId)
      .eq('is_preset', true)
      .single();

    if (fetchError || !presetCapsule) {
      return res.status(404).json({ error: 'Preset capsule not found' });
    }

    // Verify library ownership
    const { data: library, error: libraryError } = await supabase
      .from('style_capsule_libraries')
      .select('id')
      .eq('id', libraryId)
      .eq('user_id', userId)
      .single();

    if (libraryError || !library) {
      return res.status(403).json({ error: 'Library not found or access denied' });
    }

    // Create duplicate
    const duplicateName = newName || `${presetCapsule.name} (Copy)`;
    const { data: duplicate, error } = await supabase
      .from('style_capsules')
      .insert({
        name: duplicateName,
        type: presetCapsule.type,
        library_id: libraryId,
        user_id: userId,
        example_text_excerpts: presetCapsule.example_text_excerpts,
        style_labels: presetCapsule.style_labels,
        negative_constraints: presetCapsule.negative_constraints,
        freeform_notes: presetCapsule.freeform_notes,
        design_pillars: presetCapsule.design_pillars,
        descriptor_strings: presetCapsule.descriptor_strings,
        reference_image_urls: presetCapsule.reference_image_urls,
        is_preset: false,
        is_favorite: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error duplicating capsule:', error);
      return res.status(500).json({ error: 'Failed to duplicate capsule' });
    }

    res.status(201).json({ data: capsuleToApi(duplicate) });
  } catch (error) {
    console.error('Unexpected error in capsule duplication:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/style-capsules/:id/upload-image - Upload reference image
router.post('/:id/upload-image', upload.single('image'), async (req, res) => {
  try {
    const userId = req.user!.id;
    const capsuleId = req.params.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Check capsule ownership and type
    const { data: capsule, error: fetchError } = await supabase
      .from('style_capsules')
      .select('user_id, type, reference_image_urls')
      .eq('id', capsuleId)
      .single();

    if (fetchError || !capsule) {
      return res.status(404).json({ error: 'Style capsule not found' });
    }

    if (capsule.type !== 'visual') {
      return res.status(400).json({ error: 'Only visual style capsules can have reference images' });
    }

    if (capsule.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate unique filename
    const fileExt = path.extname(req.file.originalname);
    const fileName = `${userId}/${capsuleId}/${Date.now()}-${Math.random().toString(36).substring(2)}${fileExt}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('style-capsule-images')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return res.status(500).json({ error: 'Failed to upload image' });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('style-capsule-images')
      .getPublicUrl(fileName);

    // Update capsule with new image URL
    const currentUrls = capsule.reference_image_urls || [];
    const updatedUrls = [...currentUrls, urlData.publicUrl];

    const { data: updatedCapsule, error: updateError } = await supabase
      .from('style_capsules')
      .update({ reference_image_urls: updatedUrls })
      .eq('id', capsuleId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating capsule with image URL:', updateError);
      return res.status(500).json({ error: 'Failed to update capsule with image URL' });
    }

    res.json({ data: capsuleToApi(updatedCapsule) });
  } catch (error) {
    console.error('Unexpected error in image upload:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/style-capsules/:id/images/:imageIndex - Remove reference image
router.delete('/:id/images/:imageIndex', async (req, res) => {
  try {
    const userId = req.user!.id;
    const capsuleId = req.params.id;
    const imageIndex = parseInt(req.params.imageIndex);

    if (isNaN(imageIndex) || imageIndex < 0) {
      return res.status(400).json({ error: 'Invalid image index' });
    }

    // Check capsule ownership
    const { data: capsule, error: fetchError } = await supabase
      .from('style_capsules')
      .select('user_id, reference_image_urls')
      .eq('id', capsuleId)
      .single();

    if (fetchError || !capsule) {
      return res.status(404).json({ error: 'Style capsule not found' });
    }

    if (capsule.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const currentUrls = capsule.reference_image_urls || [];
    if (imageIndex >= currentUrls.length) {
      return res.status(400).json({ error: 'Image index out of range' });
    }

    // Remove image URL from array
    const updatedUrls = currentUrls.filter((_: any, index: number) => index !== imageIndex);

    const { data: updatedCapsule, error: updateError } = await supabase
      .from('style_capsules')
      .update({ reference_image_urls: updatedUrls })
      .eq('id', capsuleId)
      .select()
      .single();

    if (updateError) {
      console.error('Error removing image URL:', updateError);
      return res.status(500).json({ error: 'Failed to remove image' });
    }

    // TODO: Optionally delete the actual file from storage
    // For now, we just remove the URL reference

    res.json({ data: capsuleToApi(updatedCapsule) });
  } catch (error) {
    console.error('Unexpected error in image removal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/style-capsules/libraries - List user's libraries
router.get('/libraries/all', async (req, res) => {
  try {
    const userId = req.user!.id;

    // First, check if user has any personal libraries
    const { data: userLibraries, error: userLibError } = await supabase
      .from('style_capsule_libraries')
      .select('id')
      .eq('user_id', userId)
      .eq('is_preset', false);

    if (userLibError) {
      console.error('Error checking user libraries:', userLibError);
      return res.status(500).json({ error: 'Failed to check user libraries' });
    }

    // If user has no personal libraries, create a default one
    if (!userLibraries || userLibraries.length === 0) {
      console.log(`Creating default library for user ${userId}`);
      
      const { error: createError } = await supabase
        .from('style_capsule_libraries')
        .insert({
          name: 'My Style Capsules',
          description: 'Your personal collection of style capsules',
          user_id: userId,
          is_preset: false
        });

      if (createError) {
        console.error('Error creating default library:', createError);
        // Don't fail the request, just log the error
      }
    }

    // Now fetch all accessible libraries
    const { data: libraries, error } = await supabase
      .from('style_capsule_libraries')
      .select(`
        id,
        name,
        description,
        is_preset,
        created_at,
        updated_at,
        style_capsules (
          id,
          name,
          type,
          is_preset
        )
      `)
      .or(`user_id.eq.${userId},is_preset.eq.true`)
      .order('is_preset', { ascending: false })
      .order('name');

    if (error) {
      console.error('Error fetching libraries:', error);
      return res.status(500).json({ error: 'Failed to fetch libraries' });
    }

    res.json({ data: librariesToApi(libraries) });
  } catch (error) {
    console.error('Unexpected error in libraries fetch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/style-capsules/libraries - Create new library
router.post('/libraries', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Library name is required' });
    }

    const { data: library, error } = await supabase
      .from('style_capsule_libraries')
      .insert({
        name,
        description,
        user_id: userId,
        is_preset: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating library:', error);
      return res.status(500).json({ error: 'Failed to create library' });
    }

    res.status(201).json({ data: libraryToApi(library) });
  } catch (error) {
    console.error('Unexpected error in library creation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;