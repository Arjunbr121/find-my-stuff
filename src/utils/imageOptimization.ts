/**
 * Image Optimization Utilities
 * 
 * Provides thumbnail generation and image caching for performance optimization.
 * Thumbnails are used in list views to reduce memory usage and improve scrolling performance.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { generateUUID } from './uuid';

/**
 * Thumbnail configuration
 */
const THUMBNAIL_SIZE = 200; // 200x200 pixels
const THUMBNAIL_QUALITY = 0.7; // 70% quality for smaller file size

/**
 * Generate thumbnail from source image
 * 
 * @param sourceUri - Source image URI
 * @returns Thumbnail URI
 */
export async function generateThumbnail(sourceUri: string): Promise<string> {
    // Validate source URI
    if (!sourceUri || sourceUri.trim().length === 0) {
        throw new Error('Invalid source URI');
    }

    // Check if source file exists
    const sourceInfo = await FileSystem.getInfoAsync(sourceUri);
    if (!sourceInfo.exists) {
        throw new Error(`Source file not found: ${sourceUri}`);
    }

    // Generate thumbnail using expo-image-manipulator
    const manipResult = await manipulateAsync(
        sourceUri,
        [
            {
                resize: {
                    width: THUMBNAIL_SIZE,
                    height: THUMBNAIL_SIZE,
                },
            },
        ],
        {
            compress: THUMBNAIL_QUALITY,
            format: SaveFormat.JPEG,
        }
    );

    // Move thumbnail to permanent location
    const thumbnailDir = `${FileSystem.documentDirectory}thumbnails/`;

    // Ensure directory exists
    const dirInfo = await FileSystem.getInfoAsync(thumbnailDir);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(thumbnailDir, { intermediates: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = generateUUID();
    const filename = `thumb_${timestamp}_${randomId}.jpg`;
    const destinationUri = `${thumbnailDir}${filename}`;

    // Move thumbnail to permanent location
    await FileSystem.moveAsync({
        from: manipResult.uri,
        to: destinationUri,
    });

    return destinationUri;
}

/**
 * Delete thumbnail file
 * 
 * @param thumbnailUri - Thumbnail URI to delete
 */
export async function deleteThumbnail(thumbnailUri: string): Promise<void> {
    if (!thumbnailUri) {
        return;
    }

    try {
        const fileInfo = await FileSystem.getInfoAsync(thumbnailUri);
        if (fileInfo.exists) {
            await FileSystem.deleteAsync(thumbnailUri, { idempotent: true });
        }
    } catch (error) {
        // Log error but don't throw - thumbnail deletion is not critical
        console.warn('Failed to delete thumbnail:', error);
    }
}

/**
 * Get thumbnail URI from full image URI
 * If thumbnail doesn't exist, returns the full image URI
 * 
 * @param imageUri - Full image URI
 * @param thumbnailUri - Optional thumbnail URI
 * @returns URI to use for display
 */
export function getThumbnailUri(imageUri: string, thumbnailUri?: string): string {
    return thumbnailUri || imageUri;
}

/**
 * Clean up orphaned thumbnails
 * Removes thumbnails that don't have corresponding items
 * 
 * @param validThumbnailUris - Set of valid thumbnail URIs
 */
export async function cleanupOrphanedThumbnails(validThumbnailUris: Set<string>): Promise<void> {
    const thumbnailDir = `${FileSystem.documentDirectory}thumbnails/`;

    try {
        const dirInfo = await FileSystem.getInfoAsync(thumbnailDir);
        if (!dirInfo.exists) {
            return;
        }

        const files = await FileSystem.readDirectoryAsync(thumbnailDir);

        for (const file of files) {
            const fullPath = `${thumbnailDir}${file}`;
            if (!validThumbnailUris.has(fullPath)) {
                await FileSystem.deleteAsync(fullPath, { idempotent: true });
            }
        }
    } catch (error) {
        console.warn('Failed to cleanup orphaned thumbnails:', error);
    }
}
