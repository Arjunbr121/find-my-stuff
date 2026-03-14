/**
 * Export/Import utility functions
 * Handles data export to JSON and import from JSON files
 */

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { Item, Room } from '../types/models';
import { ValidationError } from '../types/storage';
import { validateItem, validateRoom } from './validation';

/**
 * Export data structure
 */
export interface ExportData {
    version: number;
    exportDate: string;
    items: Item[];
    rooms: Room[];
}

/**
 * Export data to JSON file
 * 
 * @param data - Data to export (items and rooms)
 * @returns File URI of the exported file
 */
export async function exportToFile(data: { items: Item[]; rooms: Room[] }): Promise<string> {
    try {
        // Create export data with metadata
        const exportData: ExportData = {
            version: 1,
            exportDate: new Date().toISOString(),
            items: data.items,
            rooms: data.rooms,
        };

        // Convert to JSON
        const jsonString = JSON.stringify(exportData, null, 2);

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const filename = `find-my-stuff-backup-${timestamp}.json`;

        // Determine file path based on platform
        const fileUri = `${FileSystem.documentDirectory}${filename}`;

        // Write file
        await FileSystem.writeAsStringAsync(fileUri, jsonString, {
            encoding: FileSystem.EncodingType.UTF8,
        });

        return fileUri;
    } catch (error) {
        throw new Error(
            `Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Share exported file with user
 * 
 * @param fileUri - URI of the file to share
 */
export async function shareExportFile(fileUri: string): Promise<void> {
    try {
        const isAvailable = await Sharing.isAvailableAsync();

        if (!isAvailable) {
            throw new Error('Sharing is not available on this device');
        }

        await Sharing.shareAsync(fileUri, {
            mimeType: 'application/json',
            dialogTitle: 'Export Find My Stuff Data',
            UTI: 'public.json',
        });
    } catch (error) {
        throw new Error(
            `Failed to share file: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Pick a file for import
 * 
 * @returns File URI and content, or null if cancelled
 */
export async function pickImportFile(): Promise<{ uri: string; content: string } | null> {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: 'application/json',
            copyToCacheDirectory: true,
        });

        if (result.canceled) {
            return null;
        }

        const file = result.assets[0];
        const fileUri = file.uri;

        // Read file content
        const content = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.UTF8,
        });

        return { uri: fileUri, content };
    } catch (error) {
        throw new Error(
            `Failed to pick file: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Parse and validate import data
 * 
 * @param jsonString - JSON string to parse
 * @returns Validated export data
 * @throws ValidationError if data is invalid
 */
export function parseImportData(jsonString: string): ExportData {
    try {
        const data = JSON.parse(jsonString);

        // Validate structure
        if (!data || typeof data !== 'object') {
            throw new ValidationError('Invalid data format');
        }

        if (!data.version || typeof data.version !== 'number') {
            throw new ValidationError('Missing or invalid version');
        }

        if (data.version !== 1) {
            throw new ValidationError(`Unsupported version: ${data.version}`);
        }

        if (!Array.isArray(data.items)) {
            throw new ValidationError('Invalid items array');
        }

        if (!Array.isArray(data.rooms)) {
            throw new ValidationError('Invalid rooms array');
        }

        // Validate each room
        for (const room of data.rooms) {
            const validation = validateRoom(room);
            if (!validation.isValid) {
                throw new ValidationError(`Invalid room data: ${validation.errors.join(', ')}`);
            }
        }

        // Validate each item
        for (const item of data.items) {
            const validation = validateItem(item);
            if (!validation.isValid) {
                throw new ValidationError(`Invalid item data: ${validation.errors.join(', ')}`);
            }
        }

        return data as ExportData;
    } catch (error) {
        if (error instanceof ValidationError) {
            throw error;
        }
        throw new ValidationError(
            `Failed to parse import data: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Get import preview information
 * 
 * @param data - Parsed export data
 * @returns Preview information
 */
export function getImportPreview(data: ExportData): {
    itemCount: number;
    roomCount: number;
    exportDate: string;
    version: number;
} {
    return {
        itemCount: data.items.length,
        roomCount: data.rooms.length,
        exportDate: data.exportDate,
        version: data.version,
    };
}
