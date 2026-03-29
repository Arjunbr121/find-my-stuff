/**
 * Native storage implementation using SQLite
 * Provides data persistence for iOS and Android platforms
 */

import * as SQLite from 'expo-sqlite';
import { Item, Room } from '../types/models';
import {
    IStorage,
    StorageError,
    NotFoundError,
    ValidationError,
} from '../types/storage';

/**
 * NativeStorage implementation using SQLite
 * Handles all data persistence operations for mobile platforms
 */
export class NativeStorage implements IStorage {
    private db: SQLite.SQLiteDatabase | null = null;
    private readonly dbName = 'findmystuff.db';

    /**
     * Open/create the SQLite database
     * Creates tables and indexes if needed
     */
    async open(): Promise<void> {
        try {
            this.db = await SQLite.openDatabaseAsync(this.dbName);
            await this.initializeSchema();
        } catch (error) {
            throw new StorageError(
                `Failed to open database: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Initialize database schema
     * Creates tables and indexes
     */
    private async initializeSchema(): Promise<void> {
        if (!this.db) {
            throw new StorageError('Database not initialized');
        }

        try {
            // Create items table
            await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS items (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          imageUri TEXT NOT NULL,
          thumbnailUri TEXT,
          roomId TEXT NOT NULL,
          specificLocation TEXT NOT NULL,
          location TEXT,
          detectedObjects TEXT,
          aiSummary TEXT,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        );
      `);

            // Migrate existing tables — add columns if they don't exist yet
            const migrations = [
                `ALTER TABLE items ADD COLUMN thumbnailUri TEXT`,
                `ALTER TABLE items ADD COLUMN location TEXT`,
                `ALTER TABLE items ADD COLUMN detectedObjects TEXT`,
                `ALTER TABLE items ADD COLUMN aiSummary TEXT`,
            ];
            for (const sql of migrations) {
                try { await this.db.execAsync(sql); } catch { /* column already exists */ }
            }

            // Create indexes for items
            await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_items_roomId ON items(roomId);
        CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
        CREATE INDEX IF NOT EXISTS idx_items_specificLocation ON items(specificLocation);
      `);

            // Create rooms table
            await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS rooms (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          icon TEXT NOT NULL,
          color TEXT NOT NULL,
          description TEXT,
          createdAt INTEGER NOT NULL
        );
      `);

            // Create index for rooms
            await this.db.execAsync(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_name ON rooms(name);
      `);
        } catch (error) {
            throw new StorageError(
                `Failed to initialize schema: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Ensure database is initialized
     */
    private ensureDB(): SQLite.SQLiteDatabase {
        if (!this.db) {
            throw new StorageError('Database not initialized. Call open() first.');
        }
        return this.db;
    }

    /**
     * Convert database row to Item object
     */
    private rowToItem(row: any): Item {
        return {
            id: row.id,
            name: row.name,
            imageUri: row.imageUri,
            thumbnailUri: row.thumbnailUri || undefined,
            roomId: row.roomId,
            specificLocation: row.specificLocation,
            location: row.location ? JSON.parse(row.location) : undefined,
            detectedObjects: row.detectedObjects ? JSON.parse(row.detectedObjects) : undefined,
            aiSummary: row.aiSummary || undefined,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }

    /**
     * Convert database row to Room object
     */
    private rowToRoom(row: any): Room {
        return {
            id: row.id,
            name: row.name,
            icon: row.icon,
            color: row.color,
            description: row.description || undefined,
            createdAt: row.createdAt,
        };
    }

    // ==================== Item Operations ====================

    async insertItem(item: Item): Promise<void> {
        const db = this.ensureDB();

        try {
            await db.runAsync(
                `INSERT INTO items (id, name, imageUri, thumbnailUri, roomId, specificLocation, location, detectedObjects, aiSummary, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    item.id,
                    item.name,
                    item.imageUri,
                    item.thumbnailUri ?? null,
                    item.roomId,
                    item.specificLocation,
                    item.location ? JSON.stringify(item.location) : null,
                    item.detectedObjects ? JSON.stringify(item.detectedObjects) : null,
                    item.aiSummary ?? null,
                    item.createdAt,
                    item.updatedAt,
                ]
            );
        } catch (error) {
            throw new StorageError(
                `Failed to insert item: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async updateItem(id: string, updates: Partial<Item>): Promise<void> {
        const db = this.ensureDB();

        try {
            // Check if item exists
            const existing = await db.getFirstAsync<any>(
                'SELECT * FROM items WHERE id = ?',
                [id]
            );

            if (!existing) {
                throw new NotFoundError(`Item not found: ${id}`);
            }

            // Build update query dynamically
            const fields: string[] = [];
            const values: any[] = [];

            if (updates.name !== undefined) {
                fields.push('name = ?');
                values.push(updates.name);
            }
            if (updates.imageUri !== undefined) {
                fields.push('imageUri = ?');
                values.push(updates.imageUri);
            }
            if (updates.roomId !== undefined) {
                fields.push('roomId = ?');
                values.push(updates.roomId);
            }
            if (updates.specificLocation !== undefined) {
                fields.push('specificLocation = ?');
                values.push(updates.specificLocation);
            }
            if (updates.location !== undefined) {
                fields.push('location = ?');
                values.push(updates.location ? JSON.stringify(updates.location) : null);
            }
            if (updates.detectedObjects !== undefined) {
                fields.push('detectedObjects = ?');
                values.push(updates.detectedObjects ? JSON.stringify(updates.detectedObjects) : null);
            }
            if (updates.aiSummary !== undefined) {
                fields.push('aiSummary = ?');
                values.push(updates.aiSummary ?? null);
            }
            if (updates.updatedAt !== undefined) {
                fields.push('updatedAt = ?');
                values.push(updates.updatedAt);
            }

            if (fields.length === 0) {
                return; // No updates to perform
            }

            values.push(id);

            await db.runAsync(
                `UPDATE items SET ${fields.join(', ')} WHERE id = ?`,
                values
            );
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
            // Check if item exists
            const existing = await db.getFirstAsync<any>(
                'SELECT * FROM items WHERE id = ?',
                [id]
            );

            if (!existing) {
                throw new NotFoundError(`Item not found: ${id}`);
            }

            await db.runAsync('DELETE FROM items WHERE id = ?', [id]);
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
            const row = await db.getFirstAsync<any>(
                'SELECT * FROM items WHERE id = ?',
                [id]
            );

            return row ? this.rowToItem(row) : null;
        } catch (error) {
            throw new StorageError(
                `Failed to get item: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async getAllItems(): Promise<Item[]> {
        const db = this.ensureDB();

        try {
            const rows = await db.getAllAsync<any>('SELECT * FROM items');
            return rows.map((row) => this.rowToItem(row));
        } catch (error) {
            throw new StorageError(
                `Failed to get all items: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async searchItems(query: string): Promise<Item[]> {
        const db = this.ensureDB();

        try {
            const normalizedQuery = query.toLowerCase().trim();

            if (normalizedQuery.length === 0) {
                return await this.getAllItems();
            }

            // Use LIKE for case-insensitive search
            const searchPattern = `%${normalizedQuery}%`;
            const rows = await db.getAllAsync<any>(
                `SELECT * FROM items 
         WHERE LOWER(name) LIKE ? OR LOWER(specificLocation) LIKE ?`,
                [searchPattern, searchPattern]
            );

            return rows.map((row) => this.rowToItem(row));
        } catch (error) {
            throw new StorageError(
                `Failed to search items: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async getItemsBatch(offset: number, limit: number): Promise<Item[]> {
        const db = this.ensureDB();

        try {
            const rows = await db.getAllAsync<any>(
                'SELECT * FROM items ORDER BY updatedAt DESC LIMIT ? OFFSET ?',
                [limit, offset]
            );

            return rows.map((row) => this.rowToItem(row));
        } catch (error) {
            throw new StorageError(
                `Failed to get items batch: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async getItemsCount(): Promise<number> {
        const db = this.ensureDB();

        try {
            const result = await db.getFirstAsync<{ count: number }>(
                'SELECT COUNT(*) as count FROM items'
            );

            return result?.count || 0;
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
            await db.runAsync(
                `INSERT INTO rooms (id, name, icon, color, description, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    room.id,
                    room.name,
                    room.icon,
                    room.color,
                    room.description || null,
                    room.createdAt,
                ]
            );
        } catch (error) {
            // Check for unique constraint violation
            if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
                throw new ValidationError(`Room with name "${room.name}" already exists`);
            }
            throw new StorageError(
                `Failed to insert room: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async updateRoom(id: string, updates: Partial<Room>): Promise<void> {
        const db = this.ensureDB();

        try {
            // Check if room exists
            const existing = await db.getFirstAsync<any>(
                'SELECT * FROM rooms WHERE id = ?',
                [id]
            );

            if (!existing) {
                throw new NotFoundError(`Room not found: ${id}`);
            }

            // Build update query dynamically
            const fields: string[] = [];
            const values: any[] = [];

            if (updates.name !== undefined) {
                fields.push('name = ?');
                values.push(updates.name);
            }
            if (updates.icon !== undefined) {
                fields.push('icon = ?');
                values.push(updates.icon);
            }
            if (updates.color !== undefined) {
                fields.push('color = ?');
                values.push(updates.color);
            }
            if (updates.description !== undefined) {
                fields.push('description = ?');
                values.push(updates.description || null);
            }

            if (fields.length === 0) {
                return; // No updates to perform
            }

            values.push(id);

            await db.runAsync(
                `UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`,
                values
            );
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            // Check for unique constraint violation
            if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
                throw new ValidationError(`Room with name "${updates.name}" already exists`);
            }
            throw new StorageError(
                `Failed to update room: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async deleteRoom(id: string): Promise<void> {
        const db = this.ensureDB();

        try {
            // Check if room exists
            const existing = await db.getFirstAsync<any>(
                'SELECT * FROM rooms WHERE id = ?',
                [id]
            );

            if (!existing) {
                throw new NotFoundError(`Room not found: ${id}`);
            }

            await db.runAsync('DELETE FROM rooms WHERE id = ?', [id]);
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
            const row = await db.getFirstAsync<any>(
                'SELECT * FROM rooms WHERE id = ?',
                [id]
            );

            return row ? this.rowToRoom(row) : null;
        } catch (error) {
            throw new StorageError(
                `Failed to get room: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async getAllRooms(): Promise<Room[]> {
        const db = this.ensureDB();

        try {
            const rows = await db.getAllAsync<any>('SELECT * FROM rooms');
            return rows.map((row) => this.rowToRoom(row));
        } catch (error) {
            throw new StorageError(
                `Failed to get all rooms: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    // ==================== Batch Operations ====================

    async clearAll(): Promise<void> {
        const db = this.ensureDB();

        try {
            await db.execAsync(`
        DELETE FROM items;
        DELETE FROM rooms;
      `);
        } catch (error) {
            throw new StorageError(
                `Failed to clear all data: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async exportData(): Promise<{ items: Item[]; rooms: Room[] }> {
        const db = this.ensureDB();

        try {
            const items = await this.getAllItems();
            const rooms = await this.getAllRooms();
            return { items, rooms };
        } catch (error) {
            throw new StorageError(
                `Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async importData(data: { items: Item[]; rooms: Room[] }): Promise<void> {
        const db = this.ensureDB();

        try {
            // Use transaction for atomic import
            await db.withTransactionAsync(async () => {
                // Import rooms first (items depend on rooms)
                for (const room of data.rooms) {
                    await db.runAsync(
                        `INSERT OR REPLACE INTO rooms (id, name, icon, color, description, createdAt)
             VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            room.id,
                            room.name,
                            room.icon,
                            room.color,
                            room.description || null,
                            room.createdAt,
                        ]
                    );
                }

                // Import items
                for (const item of data.items) {
                    await db.runAsync(
                        `INSERT OR REPLACE INTO items (id, name, imageUri, roomId, specificLocation, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [
                            item.id,
                            item.name,
                            item.imageUri,
                            item.roomId,
                            item.specificLocation,
                            item.createdAt,
                            item.updatedAt,
                        ]
                    );
                }
            });
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

            // Try to read from both tables
            await db.getAllAsync('SELECT * FROM items LIMIT 1');
            await db.getAllAsync('SELECT * FROM rooms LIMIT 1');

            // Check if tables exist
            const tables = await db.getAllAsync<{ name: string }>(
                "SELECT name FROM sqlite_master WHERE type='table' AND (name='items' OR name='rooms')"
            );

            if (tables.length !== 2) {
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
            const db = this.ensureDB();

            // Run SQLite integrity check
            const integrityResult = await db.getFirstAsync<{ integrity_check: string }>(
                'PRAGMA integrity_check'
            );

            if (integrityResult?.integrity_check !== 'ok') {
                console.error('Database integrity check failed:', integrityResult);

                // Try to rebuild the database by recreating schema
                await this.initializeSchema();

                // Check again
                return await this.healthCheck();
            }

            return true;
        } catch (error) {
            console.error('Repair failed:', error);
            return false;
        }
    }

    async getSchemaVersion(): Promise<number> {
        try {
            const db = this.ensureDB();

            // Check if version table exists
            const versionTable = await db.getFirstAsync<{ name: string }>(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'"
            );

            if (!versionTable) {
                // No version table, assume version 1
                return 1;
            }

            const version = await db.getFirstAsync<{ version: number }>(
                'SELECT version FROM schema_version LIMIT 1'
            );

            return version?.version || 1;
        } catch (error) {
            console.error('Failed to get schema version:', error);
            return 1;
        }
    }
}
