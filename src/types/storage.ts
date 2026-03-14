/**
 * Storage abstraction layer interfaces
 * Provides unified interface for data persistence across platforms
 */

import { Item, Room } from './models';

/**
 * Storage interface providing unified API for data persistence
 * Implementations: WebStorage (IndexedDB), NativeStorage (SQLite)
 */
export interface IStorage {
    /**
     * Open/initialize the storage
     * Must be called before any other operations
     * @throws StorageError if initialization fails
     */
    open(): Promise<void>;

    // Item operations
    /**
     * Insert a new item into storage
     * @param item - Item to insert
     * @throws StorageError if insertion fails
     */
    insertItem(item: Item): Promise<void>;

    /**
     * Update an existing item
     * @param id - Item ID
     * @param updates - Partial item data to update
     * @throws NotFoundError if item doesn't exist
     * @throws StorageError if update fails
     */
    updateItem(id: string, updates: Partial<Item>): Promise<void>;

    /**
     * Delete an item from storage
     * @param id - Item ID
     * @throws NotFoundError if item doesn't exist
     * @throws StorageError if deletion fails
     */
    deleteItem(id: string): Promise<void>;

    /**
     * Get a single item by ID
     * @param id - Item ID
     * @returns Item if found, null otherwise
     */
    getItem(id: string): Promise<Item | null>;

    /**
     * Get all items from storage
     * @returns Array of all items
     */
    getAllItems(): Promise<Item[]>;

    /**
     * Get items in batches for progressive loading
     * @param offset - Starting index
     * @param limit - Number of items to fetch
     * @returns Array of items in the specified range
     */
    getItemsBatch(offset: number, limit: number): Promise<Item[]>;

    /**
     * Get total count of items
     * @returns Total number of items in storage
     */
    getItemsCount(): Promise<number>;

    /**
     * Search items by query string
     * @param query - Search query
     * @returns Array of matching items
     */
    searchItems(query: string): Promise<Item[]>;

    // Room operations
    /**
     * Insert a new room into storage
     * @param room - Room to insert
     * @throws StorageError if insertion fails
     * @throws ValidationError if room name already exists
     */
    insertRoom(room: Room): Promise<void>;

    /**
     * Update an existing room
     * @param id - Room ID
     * @param updates - Partial room data to update
     * @throws NotFoundError if room doesn't exist
     * @throws ValidationError if updated name conflicts with existing room
     * @throws StorageError if update fails
     */
    updateRoom(id: string, updates: Partial<Room>): Promise<void>;

    /**
     * Delete a room from storage
     * @param id - Room ID
     * @throws NotFoundError if room doesn't exist
     * @throws StorageError if deletion fails
     */
    deleteRoom(id: string): Promise<void>;

    /**
     * Get a single room by ID
     * @param id - Room ID
     * @returns Room if found, null otherwise
     */
    getRoom(id: string): Promise<Room | null>;

    /**
     * Get all rooms from storage
     * @returns Array of all rooms
     */
    getAllRooms(): Promise<Room[]>;

    // Batch operations
    /**
     * Clear all data from storage (items and rooms)
     * @throws StorageError if operation fails
     */
    clearAll(): Promise<void>;

    /**
     * Export all data from storage
     * @returns Object containing all items and rooms
     */
    exportData(): Promise<{ items: Item[]; rooms: Room[] }>;

    /**
     * Import data into storage
     * @param data - Object containing items and rooms to import
     * @throws ValidationError if data is invalid
     * @throws StorageError if import fails
     */
    importData(data: { items: Item[]; rooms: Room[] }): Promise<void>;

    // Health and recovery operations
    /**
     * Check if storage is healthy and accessible
     * @returns True if storage is working correctly, false otherwise
     */
    healthCheck(): Promise<boolean>;

    /**
     * Attempt to repair corrupted storage
     * @returns True if repair was successful, false otherwise
     */
    repair(): Promise<boolean>;

    /**
     * Get storage schema version
     * @returns Current schema version number
     */
    getSchemaVersion(): Promise<number>;
}

/**
 * Query result type for storage operations
 */
export type QueryResult<T> = {
    data: T;
    error?: Error;
};

/**
 * Storage error types
 */
export class StorageError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'StorageError';
    }
}

export class NotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NotFoundError';
    }
}

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class RoomNotEmptyError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'RoomNotEmptyError';
    }
}

export class FileNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FileNotFoundError';
    }
}

export class DatabaseCorruptionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DatabaseCorruptionError';
    }
}
