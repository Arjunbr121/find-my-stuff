/**
 * Storage utility functions
 * Helpers for checking storage availability and managing storage space
 */

import * as FileSystem from 'expo-file-system';
import { StorageError } from './validation';

/**
 * Minimum required storage space in bytes (100 MB)
 */
const MIN_STORAGE_BYTES = 100 * 1024 * 1024;

/**
 * Check if sufficient storage space is available
 * 
 * @returns Object with available space info
 */
export async function checkStorageSpace(): Promise<{
    available: number;
    total: number;
    isLow: boolean;
    isFull: boolean;
}> {
    try {
        const freeDiskStorage = await FileSystem.getFreeDiskStorageAsync();
        const totalDiskCapacity = await FileSystem.getTotalDiskCapacityAsync();

        return {
            available: freeDiskStorage,
            total: totalDiskCapacity,
            isLow: freeDiskStorage < MIN_STORAGE_BYTES,
            isFull: freeDiskStorage < 10 * 1024 * 1024, // Less than 10 MB
        };
    } catch (error) {
        // If we can't check storage, assume it's available
        console.warn('Failed to check storage space:', error);
        return {
            available: MIN_STORAGE_BYTES,
            total: MIN_STORAGE_BYTES * 10,
            isLow: false,
            isFull: false,
        };
    }
}

/**
 * Format bytes to human-readable string
 * 
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "1.5 GB")
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Check storage before saving and throw error if insufficient
 * 
 * @throws StorageError if storage is full
 */
export async function ensureSufficientStorage(): Promise<void> {
    const storageInfo = await checkStorageSpace();

    if (storageInfo.isFull) {
        throw new StorageError(
            `Storage full. Only ${formatBytes(storageInfo.available)} available. ` +
            `Please free up space and try again.`
        );
    }

    if (storageInfo.isLow) {
        console.warn(
            `Low storage warning: ${formatBytes(storageInfo.available)} available`
        );
    }
}

/**
 * Get storage usage for the app's images directory
 * 
 * @returns Total size in bytes
 */
export async function getImageStorageUsage(): Promise<number> {
    try {
        const imagesDir = `${FileSystem.documentDirectory}images/`;
        const dirInfo = await FileSystem.getInfoAsync(imagesDir);

        if (!dirInfo.exists) {
            return 0;
        }

        // Read all files in directory
        const files = await FileSystem.readDirectoryAsync(imagesDir);
        let totalSize = 0;

        for (const file of files) {
            const fileInfo = await FileSystem.getInfoAsync(`${imagesDir}${file}`);
            if (fileInfo.exists && 'size' in fileInfo) {
                totalSize += fileInfo.size || 0;
            }
        }

        return totalSize;
    } catch (error) {
        console.warn('Failed to calculate image storage usage:', error);
        return 0;
    }
}
