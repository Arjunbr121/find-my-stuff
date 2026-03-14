/**
 * Web storage implementation using IndexedDB
 * Provides data persistence for web platform
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Item, Room } from '../types/models';
import {
    IStorage,
    StorageError,
    NotFoundError,
    ValidationError,
} from '../types/storage';

/**
 * IndexedDB schema definition
 */
interface FindMyStuffDB extends DBSchema {
    items: {
        key: string;
        value: Item;
        indexes: {
            'by-roomId': string;
            'by-name': string;
            'by-specificLocation': string;
        };
    };
    rooms: {
        key: string;
        value: Room;
        indexes: {
            'by-name': string;
        };
    };
}

/**
 * WebStorage implementation using IndexedDB
 * Handles all data persistence operations for web platform
 */
export class WebStorage implements IStorage {
    private db: IDBPDatabase<FindMyStuffDB> | null = null;
    private readonly dbName = 'FindMyStuffDB';
    private readonly dbVersion = 1;

    /**
     * Open/create the IndexedDB database
     * Creates object stores and indexes if needed
     */
    async open(): Promise<void> {
        try {
            this.db = await openDB<FindMyStuffDB>(this.dbName, this.dbVersion, {
                upgrade(db) {
                    // Create items object store
                    if (!db.objectStoreNames.contains('items')) {
                        const itemStore = db.createObjectStore('items', { keyPath: 'id' });
                        itemStore.createIndex('by-roomId', 'roomId', { unique: false });
                        itemStore.createIndex('by-name', 'name', { unique: false });
                        itemStore.createIndex('by-specificLocation', 'specificLocation', {
                            unique: false,
                        });
                    }

                    // Create rooms object store
                    if (!db.objectStoreNames.contains('rooms')) {
                        const roomStore = db.createObjectStore('rooms', { keyPath: 'id' });
                        roomStore.createIndex('by-name', 'name', { unique: true });
                    }
                },
            });
        } catch (error) {
            throw new StorageError(
                `Failed to open database: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Ensure database is initialized
     */
    private ensureDB(): IDBPDatabase<FindMyStuffDB> {
        if (!this.db) {
            throw new StorageError('Database not initialized. Call open() first.');
        }
        return this.db;
    }

    // ==================== Item Operations ====================

    async insertItem(item: Item): Promise<void> {
        const db = this.ensureDB();
        try {
            await db.add('items', item);
        } catch (error) {
            throw new StorageError(
                `Failed to insert item: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async updateItem(id: string, updates: Partial<Item>): Promise<void> {
        const db = this.ensureDB();
        const tx = db.transaction('items', 'readwrite');

        try {
            const existing = await tx.store.get(id);

            if (!existing) {
                throw new NotFoundError(`Item not found: ${id}`);
            }

            const updated = { ...existing, ...updates, id };
            await tx.store.put(updated);
            await tx.done;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new StorageError(
                `Failed to update item: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async deleteItem(id: string): Promise<void> {
        const db = this.ensureDB();

        try {
            const existing = await db.get('items', id);

            if (!existing) {
                throw new NotFoundError(`Item not found: ${id}`);
            }

            await db.delete('items', id);
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new StorageError(
                `Failed to delete item: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async getItem(id: string): Promise<Item | null> {
        const db = this.ensureDB();

        try {
            const item = await db.get('items', id);
            return item || null;
        } catch (error) {
            throw new StorageError(
                `Failed to get item: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async getAllItems(): Promise<Item[]> {
        const db = this.ensureDB();

        try {
            return await db.getAll('items');
        } catch (error) {
            throw new StorageError(
                `Failed to get all items: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async searchItems(query: string): Promise<Item[]> {
        const db = this.ensureDB();

        try {
            const allItems = await db.getAll('items');
            const normalizedQuery = query.toLowerCase().trim();

            if (normalizedQuery.length === 0) {
                return allItems;
            }

            // Filter items that match the query in name or specificLocation
            return allItems.filter(
                (item) =>
                    item.name.toLowerCase().includes(normalizedQuery) ||
                    item.specificLocation.toLowerCase().includes(normalizedQuery)
            );
        } catch (error) {
            throw new StorageError(
                `Failed to search items: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async getItemsBatch(offset: number, limit: number): Promise<Item[]> {
        const db = this.ensureDB();

        try {
            const allItems = await db.getAll('items');
            return allItems.slice(offset, offset + limit);
        } catch (error) {
            throw new StorageError(
                `Failed to get items batch: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async getItemsCount(): Promise<number> {
        const db = this.ensureDB();

        try {
            return await db.count('items');
        } catch (error) {
            throw new StorageError(
                `Failed to get items count: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }


    // ==================== Room Operations ====================

    async insertRoom(room: Room): Promise<void> {
        const db = this.ensureDB();

        try {
            // Check for duplicate name
            const existingByName = await db.getFromIndex('rooms', 'by-name', room.name);
            if (existingByName) {
                throw new ValidationError(`Room with name "${room.name}" already exists`);
            }

            await db.add('rooms', room);
        } catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new StorageError(
                `Failed to insert room: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async updateRoom(id: string, updates: Partial<Room>): Promise<void> {
        const db = this.ensureDB();
        const tx = db.transaction('rooms', 'readwrite');

        try {
            const existing = await tx.store.get(id);

            if (!existing) {
                throw new NotFoundError(`Room not found: ${id}`);
            }

            // Check for duplicate name if name is being updated
            if (updates.name && updates.name !== existing.name) {
                const existingByName = await tx.store.index('by-name').get(updates.name);
                if (existingByName) {
                    throw new ValidationError(`Room with name "${updates.name}" already exists`);
                }
            }

            const updated = { ...existing, ...updates, id };
            await tx.store.put(updated);
            await tx.done;
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof ValidationError) {
                throw error;
            }
            throw new StorageError(
                `Failed to update room: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async deleteRoom(id: string): Promise<void> {
        const db = this.ensureDB();

        try {
            const existing = await db.get('rooms', id);

            if (!existing) {
                throw new NotFoundError(`Room not found: ${id}`);
            }

            await db.delete('rooms', id);
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new StorageError(
                `Failed to delete room: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async getRoom(id: string): Promise<Room | null> {
        const db = this.ensureDB();

        try {
            const room = await db.get('rooms', id);
            return room || null;
        } catch (error) {
            throw new StorageError(
                `Failed to get room: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async getAllRooms(): Promise<Room[]> {
        const db = this.ensureDB();

        try {
            return await db.getAll('rooms');
        } catch (error) {
            throw new StorageError(
                `Failed to get all rooms: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    // ==================== Batch Operations ====================

    async clearAll(): Promise<void> {
        const db = this.ensureDB();
        const tx = db.transaction(['items', 'rooms'], 'readwrite');

        try {
            await tx.objectStore('items').clear();
            await tx.objectStore('rooms').clear();
            await tx.done;
        } catch (error) {
            throw new StorageError(
                `Failed to clear all data: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async exportData(): Promise<{ items: Item[]; rooms: Room[] }> {
        const db = this.ensureDB();

        try {
            const items = await db.getAll('items');
            const rooms = await db.getAll('rooms');
            return { items, rooms };
        } catch (error) {
            throw new StorageError(
                `Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async importData(data: { items: Item[]; rooms: Room[] }): Promise<void> {
        const db = this.ensureDB();
        const tx = db.transaction(['items', 'rooms'], 'readwrite');

        try {
            // Import rooms first (items depend on rooms)
            for (const room of data.rooms) {
                await tx.objectStore('rooms').put(room);
            }

            // Import items
            for (const item of data.items) {
                await tx.objectStore('items').put(item);
            }

            await tx.done;
        } catch (error) {
            throw new StorageError(
                `Failed to import data: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    // ==================== Health and Recovery Operations ====================

    async healthCheck(): Promise<boolean> {
        try {
            const db = this.ensureDB();

            // Try to read from both object stores
            await db.getAll('items');
            await db.getAll('rooms');

            // Check if object stores exist
            if (!db.objectStoreNames.contains('items') || !db.objectStoreNames.contains('rooms')) {
                return false;
            }

            return true;
        } catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    }

    async repair(): Promise<boolean> {
        try {
            // For IndexedDB, repair means closing and reopening the database
            if (this.db) {
                this.db.close();
                this.db = null;
            }

            // Try to reopen
            await this.open();

            // Verify it works
            return await this.healthCheck();
        } catch (error) {
            console.error('Repair failed:', error);
            return false;
        }
    }

    async getSchemaVersion(): Promise<number> {
        return this.dbVersion;
    }
}
