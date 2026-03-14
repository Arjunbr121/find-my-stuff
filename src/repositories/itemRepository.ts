/**
 * Item repository implementation
 * Business logic layer for item operations
 */

import * as FileSystem from 'expo-file-system';
import { Item } from '../types/models';
import { ItemRepository } from '../types/repositories';
import { IStorage } from '../types/storage';
import { generateUUID, isValidUUID } from '../utils/uuid';
import {
    validateItem,
    ValidationError,
    NotFoundError,
    StorageError,
    FileNotFoundError,
} from '../utils/validation';
import { ensureSufficientStorage } from '../utils/storage';
import { generateThumbnail, deleteThumbnail } from '../utils/imageOptimization';

/**
 * Get file extension from URI
 */
function getFileExtension(uri: string): string {
    const match = uri.match(/\.([^./?#]+)(?:[?#]|$)/);
    return match ? match[1] : 'jpg';
}

/**
 * ItemRepository implementation
 * Handles all business logic for item operations including image management
 */
export class ItemRepositoryImpl implements ItemRepository {
    constructor(private storage: IStorage) { }

    /**
     * Create a new item
     * Generates ID and timestamps, validates data, saves image
     */
    async create(itemData: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<Item> {
        // Generate ID and timestamps
        const id = generateUUID();
        const now = Date.now();

        // Save image to permanent location and generate thumbnail
        const { imageUri: permanentImageUri, thumbnailUri } = await this.saveImage(itemData.imageUri);

        // Create item object
        const item: Item = {
            id,
            ...itemData,
            imageUri: permanentImageUri,
            thumbnailUri: thumbnailUri || undefined,
            name: itemData.name.trim(),
            specificLocation: itemData.specificLocation.trim(),
            createdAt: now,
            updatedAt: now,
        };

        // Validate item
        validateItem(item);

        // Verify room exists
        const room = await this.storage.getRoom(item.roomId);
        if (!room) {
            // Clean up image and thumbnail if room doesn't exist
            await this.deleteImage(permanentImageUri).catch(() => { });
            if (thumbnailUri) {
                await deleteThumbnail(thumbnailUri).catch(() => { });
            }
            throw new ValidationError(`Room with id "${item.roomId}" does not exist`);
        }

        try {
            // Insert into storage
            await this.storage.insertItem(item);
            return item;
        } catch (error) {
            // Clean up image and thumbnail if storage fails
            await this.deleteImage(permanentImageUri).catch(() => { });
            if (thumbnailUri) {
                await deleteThumbnail(thumbnailUri).catch(() => { });
            }
            throw error;
        }
    }

    /**
     * Update an existing item
     * Updates timestamp and validates data
     */
    async update(id: string, updates: Partial<Item>): Promise<Item> {
        // Validate ID format
        if (!isValidUUID(id)) {
            throw new ValidationError('Invalid item ID format');
        }

        // Get existing item
        const existing = await this.storage.getItem(id);
        if (!existing) {
            throw new NotFoundError(`Item not found: ${id}`);
        }

        // Trim string fields if provided
        const trimmedUpdates = { ...updates };
        if (trimmedUpdates.name !== undefined) {
            trimmedUpdates.name = trimmedUpdates.name.trim();
        }
        if (trimmedUpdates.specificLocation !== undefined) {
            trimmedUpdates.specificLocation = trimmedUpdates.specificLocation.trim();
        }

        // Update timestamp
        trimmedUpdates.updatedAt = Date.now();

        // If roomId is being updated, verify new room exists
        if (trimmedUpdates.roomId && trimmedUpdates.roomId !== existing.roomId) {
            const room = await this.storage.getRoom(trimmedUpdates.roomId);
            if (!room) {
                throw new ValidationError(`Room with id "${trimmedUpdates.roomId}" does not exist`);
            }
        }

        // Handle image update
        let oldImageUri: string | null = null;
        let oldThumbnailUri: string | null = null;
        if (trimmedUpdates.imageUri && trimmedUpdates.imageUri !== existing.imageUri) {
            oldImageUri = existing.imageUri;
            oldThumbnailUri = existing.thumbnailUri || null;
            const { imageUri, thumbnailUri } = await this.saveImage(trimmedUpdates.imageUri);
            trimmedUpdates.imageUri = imageUri;
            trimmedUpdates.thumbnailUri = thumbnailUri || undefined;
        }

        // Create updated item for validation
        const updatedItem: Item = {
            ...existing,
            ...trimmedUpdates,
            id, // Ensure ID doesn't change
        };

        // Validate updated item
        validateItem(updatedItem);

        try {
            // Update in storage
            await this.storage.updateItem(id, trimmedUpdates);

            // Delete old image and thumbnail if they were replaced
            if (oldImageUri) {
                await this.deleteImage(oldImageUri).catch(() => { });
            }
            if (oldThumbnailUri) {
                await deleteThumbnail(oldThumbnailUri).catch(() => { });
            }

            return updatedItem;
        } catch (error) {
            // Clean up new image and thumbnail if storage fails
            if (trimmedUpdates.imageUri && trimmedUpdates.imageUri !== existing.imageUri) {
                await this.deleteImage(trimmedUpdates.imageUri).catch(() => { });
                if (trimmedUpdates.thumbnailUri) {
                    await deleteThumbnail(trimmedUpdates.thumbnailUri).catch(() => { });
                }
            }
            throw error;
        }
    }

    /**
     * Delete an item
     * Also deletes associated image file and thumbnail
     */
    async delete(id: string): Promise<void> {
        // Validate ID format
        if (!isValidUUID(id)) {
            throw new ValidationError('Invalid item ID format');
        }

        // Get item to retrieve image URI and thumbnail URI
        const item = await this.storage.getItem(id);
        if (!item) {
            throw new NotFoundError(`Item not found: ${id}`);
        }

        // Delete from storage
        await this.storage.deleteItem(id);

        // Delete image file (best effort, don't fail if image is missing)
        await this.deleteImage(item.imageUri).catch(() => { });

        // Delete thumbnail file (best effort)
        if (item.thumbnailUri) {
            await deleteThumbnail(item.thumbnailUri).catch(() => { });
        }
    }

    /**
     * Get item by ID
     */
    async getById(id: string): Promise<Item | null> {
        if (!isValidUUID(id)) {
            throw new ValidationError('Invalid item ID format');
        }

        return await this.storage.getItem(id);
    }

    /**
     * Get all items
     */
    async getAll(): Promise<Item[]> {
        return await this.storage.getAllItems();
    }

    /**
     * Get items by room ID
     */
    async getByRoom(roomId: string): Promise<Item[]> {
        if (!isValidUUID(roomId)) {
            throw new ValidationError('Invalid room ID format');
        }

        const allItems = await this.storage.getAllItems();
        return allItems.filter((item) => item.roomId === roomId);
    }

    /**
     * Search items by query
     */
    async search(query: string): Promise<Item[]> {
        return await this.storage.searchItems(query);
    }

    /**
     * Save image to permanent storage and generate thumbnail
     * 
     * Algorithm:
     * 1. Validate source URI
     * 2. Check if source file exists
     * 3. Check available storage space
     * 4. Generate unique filename
     * 5. Determine permanent directory
     * 6. Ensure directory exists
     * 7. Copy file to permanent location
     * 8. Generate thumbnail
     * 9. Verify destination file exists
     * 
     * @param sourceUri - Source image URI (temporary or permanent)
     * @returns Object with imageUri and thumbnailUri
     * @throws FileNotFoundError if source doesn't exist
     * @throws StorageError if insufficient space or copy fails
     */
    async saveImage(uri: string): Promise<{ imageUri: string; thumbnailUri: string }> {
        // Step 1: Validate source URI
        if (!uri || uri.trim().length === 0) {
            throw new ValidationError('Invalid source URI');
        }

        // If URI is already in our permanent directory, check if thumbnail exists
        const permanentDir = `${FileSystem.documentDirectory}images/`;
        if (uri.startsWith(permanentDir)) {
            // Try to find or generate thumbnail
            try {
                const thumbnailUri = await generateThumbnail(uri);
                return { imageUri: uri, thumbnailUri };
            } catch (error) {
                // If thumbnail generation fails, return without thumbnail
                console.warn('Failed to generate thumbnail for existing image:', error);
                return { imageUri: uri, thumbnailUri: '' };
            }
        }

        // Step 2: Check if source file exists
        const sourceInfo = await FileSystem.getInfoAsync(uri);
        if (!sourceInfo.exists) {
            throw new FileNotFoundError(`Source file not found: ${uri}`);
        }

        // Step 3: Check available storage space
        await ensureSufficientStorage();

        // Step 4: Generate unique filename
        const timestamp = Date.now();
        const randomId = generateUUID();
        const extension = getFileExtension(uri);
        const filename = `item_${timestamp}_${randomId}.${extension}`;

        // Step 5: Determine permanent directory
        // Already defined above

        // Step 6: Ensure directory exists
        const dirInfo = await FileSystem.getInfoAsync(permanentDir);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(permanentDir, { intermediates: true });
        }

        // Step 7: Copy file to permanent location
        const destinationUri = `${permanentDir}${filename}`;

        try {
            await FileSystem.copyAsync({
                from: uri,
                to: destinationUri,
            });
        } catch (error) {
            // Check for storage full error
            if (error instanceof Error && error.message.includes('ENOSPC')) {
                throw new StorageError('Insufficient storage space. Please free up space and try again.');
            }
            throw new StorageError(
                `Failed to save image: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }

        // Step 8: Verify destination file exists
        const destInfo = await FileSystem.getInfoAsync(destinationUri);
        if (!destInfo.exists) {
            throw new StorageError('Failed to save image: destination file not created');
        }

        // Step 9: Generate thumbnail
        let thumbnailUri = '';
        try {
            thumbnailUri = await generateThumbnail(destinationUri);
        } catch (error) {
            // Log error but don't fail - thumbnail is optional
            console.warn('Failed to generate thumbnail:', error);
        }

        return { imageUri: destinationUri, thumbnailUri };
    }

    /**
     * Delete image file
     * 
     * @param uri - Image URI to delete
     * @throws FileNotFoundError if file doesn't exist
     */
    async deleteImage(uri: string): Promise<void> {
        if (!uri || uri.trim().length === 0) {
            return; // Nothing to delete
        }

        // Check if file exists
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) {
            throw new FileNotFoundError(`Image file not found: ${uri}`);
        }

        // Delete file
        await FileSystem.deleteAsync(uri, { idempotent: true });
    }
}

/**
 * Create item repository instance
 * Factory function for creating repository with storage dependency
 */
export function createItemRepository(storage: IStorage): ItemRepository {
    return new ItemRepositoryImpl(storage);
}
