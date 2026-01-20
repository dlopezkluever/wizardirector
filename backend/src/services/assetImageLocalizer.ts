/**
 * Asset Image Localizer Service
 * 
 * Purpose: Decouple project assets from the Global Library storage to prevent broken links
 * if global assets are deleted. Copies images from global storage to project-specific storage.
 * 
 * Storage Structure:
 * - Global assets: stored in global-assets bucket or asset-images bucket with global path
 * - Project assets: stored in asset-images bucket at project_{projectId}/branch_{branchId}/master-assets/
 */

import { supabase } from '../config/supabase.js';

export interface LocalizeAssetImageParams {
  sourceUrl: string;
  targetProjectId: string;
  targetBranchId: string;
  assetId: string;
}

export interface LocalizeAssetImageResult {
  newImageUrl: string;
  storagePath: string;
}

/**
 * Localizes an asset image by copying it from global storage to project-specific storage
 * 
 * @param params - Parameters for localization
 * @returns The new public URL and storage path for the localized image
 * @throws Error if source image cannot be downloaded or uploaded fails
 */
export async function localizeAssetImage(
  params: LocalizeAssetImageParams
): Promise<LocalizeAssetImageResult> {
  const { sourceUrl, targetProjectId, targetBranchId, assetId } = params;

  if (!sourceUrl) {
    throw new Error('Source URL is required');
  }

  try {
    // Step 1: Download the image from the source URL
    console.log(`[AssetImageLocalizer] Downloading image from: ${sourceUrl}`);
    const response = await fetch(sourceUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }

    // Get content type from response or default to PNG
    const contentType = response.headers.get('content-type') || 'image/png';
    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // Step 2: Determine file extension from content type or URL
    let fileExt = '.png';
    if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      fileExt = '.jpg';
    } else if (contentType.includes('webp')) {
      fileExt = '.webp';
    } else if (sourceUrl.includes('.jpg') || sourceUrl.includes('.jpeg')) {
      fileExt = '.jpg';
    } else if (sourceUrl.includes('.webp')) {
      fileExt = '.webp';
    }

    // Step 3: Build target storage path
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const storagePath = `project_${targetProjectId}/branch_${targetBranchId}/master-assets/${assetId}_${timestamp}_${random}${fileExt}`;

    console.log(`[AssetImageLocalizer] Uploading to: ${storagePath}`);

    // Step 4: Upload to project-specific storage location
    const { error: uploadError } = await supabase.storage
      .from('asset-images')
      .upload(storagePath, imageBuffer, {
        contentType,
        upsert: false
      });

    if (uploadError) {
      console.error('[AssetImageLocalizer] Upload error:', uploadError);
      throw new Error(`Failed to upload localized image: ${uploadError.message}`);
    }

    // Step 5: Get public URL for the new location
    const { data: urlData } = supabase.storage
      .from('asset-images')
      .getPublicUrl(storagePath);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL for localized image');
    }

    console.log(`[AssetImageLocalizer] Successfully localized image to: ${urlData.publicUrl}`);

    return {
      newImageUrl: urlData.publicUrl,
      storagePath
    };
  } catch (error) {
    console.error('[AssetImageLocalizer] Error localizing image:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Unknown error occurred while localizing image');
  }
}

