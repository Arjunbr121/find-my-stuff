/**
 * Storage factory and initialization
 * Provides platform-specific storage implementation
 */

import { Platform } from 'react-native';
import { IStorage, StorageError } from '../types/storage';
import { WebStorage } from './webStorage';
import { NativeStorage } from './nativeStorage';

/**
 * Platform type for storage initialization
 */
export type StoragePlatform = 'web' | 'ios' | 'android';

/**
 * Get current platform
 */
function getCurrentPlatform(): StoragePlatform {
    if (Platform.OS === 'web') {
        return 'web';
    } else if (Platform.OS === 'ios') {
        return 'ios';
    } else if (Platform.OS === 'android') {
        return 'android';
    }

    // Default to web for unknown platforms
    return 'web';
}

/**
 * Initialize platform-specific storage
 * 
 * Algorithm:
 * 1. Detect platform (web, iOS, Android)
 * 2. Create appropriate storage implementation
 * 3. Open/initialize database
 * 4. Run schema migrations if needed
 * 5. Verify storage is ready
 * 
 * @param platform - Optional platform override (defaults to current platform)
 * @returns Initialized storage instance
 * @throws StorageError if initialization fails
 */
export async function initializeStorage(
    platform?: StoragePlatform
): Promise<IStorage> {
    const targetPlatform = platform || getCurrentPlatform();

    let storage: IStorage;

    // Step 1: Select storage implementation based on platform
    if (targetPlatform === 'web') {
        storage = new WebStorage();
    } else {
        // Both iOS and Android use SQLite
        storage = new NativeStorage();
    }

    try {
        // Step 2: Open/create database
        await storage.open();

        // Step 3: Verify storage is ready with health check
        const isHealthy = await healthCheck(storage);
        if (!isHealthy) {
            throw new StorageError('Storage health check failed');
        }

        return storage;
    } catch (error) {
        throw new StorageError(
            `Storage initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Perform health check on storage
 * Verifies basic operations work correctly
 * 
 * @param storage - Storage instance to check
 * @returns true if healthy, false otherwise
 */
export async function healthCheck(storage: IStorage): Promise<boolean> {
    try {
        // Test basic read operations
        await storage.getAllItems();
        await storage.getAllRooms();

        return true;
    } catch (error) {
        console.error('Storage health check failed:', error);
        return false;
    }
}

/**
 * Get schema version from storage
 * Used for migration support
 * 
 * @param storage - Storage instance
 * @returns Current schema version
 */
export async function getSchemaVersion(storage: IStorage): Promise<number> {
    // For now, we only have version 1
    // Future versions will need to track version in storage
    return 1;
}

/**
 * Run schema migrations
 * Upgrades storage schema from current version to target version
 * 
 * @param storage - Storage instance
 * @param currentVersion - Current schema version
 * @param targetVersion - Target schema version
 */
export async function runMigrations(
    storage: IStorage,
    currentVersion: number,
    targetVersion: number
): Promise<void> {
    if (currentVersion >= targetVersion) {
        return; // No migration needed
    }

    // Future migrations will be implemented here
    // Example:
    // if (currentVersion < 2) {
    //   await migrateV1ToV2(storage);
    // }
    // if (currentVersion < 3) {
    //   await migrateV2ToV3(storage);
    // }

    console.log(`Migrated storage from version ${currentVersion} to ${targetVersion}`);
}

/**
 * Attempt to repair corrupted storage
 * 
 * @param storage - Storage instance
 * @returns true if repair successful, false otherwise
 */
export async function repairStorage(storage: IStorage): Promise<boolean> {
    try {
        // Attempt to export data
        const data = await storage.exportData();

        // Clear all data
        await storage.clearAll();

        // Re-import data
        await storage.importData(data);

        // Verify health
        return await healthCheck(storage);
    } catch (error) {
        console.error('Storage repair failed:', error);
        return false;
    }
}

/**
 * Reset storage to clean state
 * WARNING: This deletes all data
 * 
 * @param storage - Storage instance
 */
export async function resetStorage(storage: IStorage): Promise<void> {
    try {
        await storage.clearAll();
    } catch (error) {
        throw new StorageError(
            `Failed to reset storage: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

// Re-export storage types and implementations
export { IStorage, WebStorage, NativeStorage };
export * from '../types/storage';

/**
 * Global storage instance
 * Initialized by App.tsx on startup
 * Imported by components that need direct storage access (e.g., SettingsScreen)
 */
import { getStorage } from '../../App';
export const storage = {
    get instance() {
        return getStorage();
    },
    // Proxy all IStorage methods to the singleton
    open: () => getStorage().open(),
    getAllItems: () => getStorage().getAllItems(),
    getItem: (id: string) => getStorage().getItem(id),
    insertItem: (item: any) => getStorage().insertItem(item),
    updateItem: (id: string, updates: any) => getStorage().updateItem(id, updates),
    deleteItem: (id: string) => getStorage().deleteItem(id),
    getItemsBatch: (offset: number, limit: number) => getStorage().getItemsBatch(offset, limit),
    getItemsCount: () => getStorage().getItemsCount(),
    searchItems: (query: string) => getStorage().searchItems(query),
    getAllRooms: () => getStorage().getAllRooms(),
    getRoom: (id: string) => getStorage().getRoom(id),
    insertRoom: (room: any) => getStorage().insertRoom(room),
    updateRoom: (id: string, updates: any) => getStorage().updateRoom(id, updates),
    deleteRoom: (id: string) => getStorage().deleteRoom(id),
    clearAll: () => getStorage().clearAll(),
    exportData: () => getStorage().exportData(),
    importData: (data: any) => getStorage().importData(data),
    healthCheck: () => getStorage().healthCheck(),
    repair: () => getStorage().repair(),
    getSchemaVersion: () => getStorage().getSchemaVersion(),
};
