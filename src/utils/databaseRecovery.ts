/**
 * Database recovery utilities
 * Handles database corruption detection and recovery
 */

import { Alert } from 'react-native';
import { IStorage } from '../types/storage';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Check database health and attempt recovery if needed
 * 
 * @param storage - Storage instance to check
 * @returns True if database is healthy or was successfully repaired
 */
export async function checkAndRecoverDatabase(storage: IStorage): Promise<boolean> {
    try {
        // Perform health check
        const isHealthy = await storage.healthCheck();

        if (isHealthy) {
            return true;
        }

        // Database is not healthy - attempt repair
        console.warn('Database health check failed. Attempting repair...');

        const repaired = await storage.repair();

        if (repaired) {
            console.log('Database repair successful');
            return true;
        }

        // Repair failed - offer to reset database
        return await offerDatabaseReset(storage);
    } catch (error) {
        console.error('Database check failed:', error);
        return await offerDatabaseReset(storage);
    }
}

/**
 * Offer user the option to reset corrupted database
 * 
 * @param storage - Storage instance
 * @returns Promise that resolves to true if reset was successful
 */
async function offerDatabaseReset(storage: IStorage): Promise<boolean> {
    return new Promise((resolve) => {
        Alert.alert(
            'Database Error',
            'The app database appears to be corrupted and cannot be repaired automatically. Would you like to reset the app data? This will delete all items and rooms.',
            [
                {
                    text: 'Export Data First',
                    onPress: async () => {
                        try {
                            // Attempt to export data before reset
                            const exported = await exportDataBeforeReset(storage);

                            if (exported) {
                                // Now offer reset again
                                const resetSuccess = await confirmAndResetDatabase(storage);
                                resolve(resetSuccess);
                            } else {
                                resolve(false);
                            }
                        } catch (error) {
                            console.error('Export failed:', error);
                            Alert.alert(
                                'Export Failed',
                                'Could not export data. The database may be too corrupted.',
                                [{ text: 'OK', onPress: () => resolve(false) }]
                            );
                        }
                    },
                },
                {
                    text: 'Reset Now',
                    style: 'destructive',
                    onPress: async () => {
                        const resetSuccess = await resetDatabase(storage);
                        resolve(resetSuccess);
                    },
                },
                {
                    text: 'Cancel',
                    style: 'cancel',
                    onPress: () => resolve(false),
                },
            ]
        );
    });
}

/**
 * Confirm and reset database
 * 
 * @param storage - Storage instance
 * @returns Promise that resolves to true if reset was successful
 */
async function confirmAndResetDatabase(storage: IStorage): Promise<boolean> {
    return new Promise((resolve) => {
        Alert.alert(
            'Confirm Reset',
            'Are you sure you want to reset the app data? This cannot be undone.',
            [
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        const resetSuccess = await resetDatabase(storage);
                        resolve(resetSuccess);
                    },
                },
                {
                    text: 'Cancel',
                    style: 'cancel',
                    onPress: () => resolve(false),
                },
            ]
        );
    });
}

/**
 * Attempt to export data before reset
 * 
 * @param storage - Storage instance
 * @returns True if export was successful
 */
async function exportDataBeforeReset(storage: IStorage): Promise<boolean> {
    try {
        // Try to export data
        const data = await storage.exportData();

        // Save to file system
        const timestamp = Date.now();
        const filename = `findmystuff_backup_${timestamp}.json`;
        const filepath = `${FileSystem.documentDirectory}${filename}`;

        await FileSystem.writeAsStringAsync(
            filepath,
            JSON.stringify(data, null, 2)
        );

        Alert.alert(
            'Export Successful',
            `Data exported to: ${filename}\n\nYou can find this file in the app's documents folder.`,
            [{ text: 'OK' }]
        );

        return true;
    } catch (error) {
        console.error('Export failed:', error);
        return false;
    }
}

/**
 * Reset database by clearing all data and reinitializing
 * 
 * @param storage - Storage instance
 * @returns True if reset was successful
 */
async function resetDatabase(storage: IStorage): Promise<boolean> {
    try {
        // Clear all data
        await storage.clearAll();

        // Verify health after reset
        const isHealthy = await storage.healthCheck();

        if (isHealthy) {
            Alert.alert(
                'Reset Complete',
                'The app data has been reset. You can now start adding items again.',
                [{ text: 'OK' }]
            );
            return true;
        } else {
            Alert.alert(
                'Reset Failed',
                'Failed to reset the database. Please try reinstalling the app.',
                [{ text: 'OK' }]
            );
            return false;
        }
    } catch (error) {
        console.error('Database reset failed:', error);
        Alert.alert(
            'Reset Failed',
            'Failed to reset the database. Please try reinstalling the app.',
            [{ text: 'OK' }]
        );
        return false;
    }
}

/**
 * Perform integrity check on database
 * Checks for common corruption issues
 * 
 * @param storage - Storage instance
 * @returns Object with integrity check results
 */
export async function performIntegrityCheck(storage: IStorage): Promise<{
    isValid: boolean;
    issues: string[];
}> {
    const issues: string[] = [];

    try {
        // Check if we can read items
        const items = await storage.getAllItems();

        // Check if we can read rooms
        const rooms = await storage.getAllRooms();

        // Check for orphaned items (items with invalid roomId)
        const roomIds = new Set(rooms.map(r => r.id));
        const orphanedItems = items.filter(item => !roomIds.has(item.roomId));

        if (orphanedItems.length > 0) {
            issues.push(`Found ${orphanedItems.length} items with invalid room references`);
        }

        // Check for duplicate IDs
        const itemIds = new Set<string>();
        const duplicateItemIds: string[] = [];

        for (const item of items) {
            if (itemIds.has(item.id)) {
                duplicateItemIds.push(item.id);
            }
            itemIds.add(item.id);
        }

        if (duplicateItemIds.length > 0) {
            issues.push(`Found ${duplicateItemIds.length} duplicate item IDs`);
        }

        // Check for duplicate room names
        const roomNames = new Set<string>();
        const duplicateRoomNames: string[] = [];

        for (const room of rooms) {
            const normalizedName = room.name.toLowerCase();
            if (roomNames.has(normalizedName)) {
                duplicateRoomNames.push(room.name);
            }
            roomNames.add(normalizedName);
        }

        if (duplicateRoomNames.length > 0) {
            issues.push(`Found ${duplicateRoomNames.length} duplicate room names`);
        }

        return {
            isValid: issues.length === 0,
            issues,
        };
    } catch (error) {
        issues.push(`Database read error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return {
            isValid: false,
            issues,
        };
    }
}
