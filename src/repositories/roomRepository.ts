/**
 * Room repository implementation
 * Business logic layer for room operations
 */

import { Room } from '../types/models';
import { RoomRepository } from '../types/repositories';
import { IStorage } from '../types/storage';
import { generateUUID, isValidUUID } from '../utils/uuid';
import {
    validateRoom,
    ValidationError,
    NotFoundError,
    RoomNotEmptyError,
} from '../utils/validation';

/**
 * RoomRepository implementation
 * Handles all business logic for room operations
 */
export class RoomRepositoryImpl implements RoomRepository {
    constructor(private storage: IStorage) { }

    /**
     * Create a new room
     * Generates ID and timestamp, validates data
     */
    async create(roomData: Omit<Room, 'id' | 'createdAt'>): Promise<Room> {
        // Generate ID and timestamp
        const id = generateUUID();
        const now = Date.now();

        // Create room object
        const room: Room = {
            id,
            ...roomData,
            name: roomData.name.trim(),
            description: roomData.description?.trim(),
            createdAt: now,
        };

        // Validate room
        validateRoom(room);

        // Check for name uniqueness (case-insensitive)
        const existingRooms = await this.storage.getAllRooms();
        const duplicateName = existingRooms.find(
            (r) => r.name.toLowerCase() === room.name.toLowerCase()
        );

        if (duplicateName) {
            throw new ValidationError(`Room with name "${room.name}" already exists`);
        }

        // Insert into storage
        await this.storage.insertRoom(room);

        return room;
    }

    /**
     * Update an existing room
     * Validates data and checks name uniqueness
     */
    async update(id: string, updates: Partial<Room>): Promise<Room> {
        // Validate ID format
        if (!isValidUUID(id)) {
            throw new ValidationError('Invalid room ID format');
        }

        // Get existing room
        const existing = await this.storage.getRoom(id);
        if (!existing) {
            throw new NotFoundError(`Room not found: ${id}`);
        }

        // Trim string fields if provided
        const trimmedUpdates = { ...updates };
        if (trimmedUpdates.name !== undefined) {
            trimmedUpdates.name = trimmedUpdates.name.trim();
        }
        if (trimmedUpdates.description !== undefined) {
            trimmedUpdates.description = trimmedUpdates.description.trim();
        }

        // Check for name uniqueness if name is being updated (case-insensitive)
        if (trimmedUpdates.name && trimmedUpdates.name.toLowerCase() !== existing.name.toLowerCase()) {
            const existingRooms = await this.storage.getAllRooms();
            const duplicateName = existingRooms.find(
                (r) => r.id !== id && r.name.toLowerCase() === trimmedUpdates.name!.toLowerCase()
            );

            if (duplicateName) {
                throw new ValidationError(`Room with name "${trimmedUpdates.name}" already exists`);
            }
        }

        // Create updated room for validation
        const updatedRoom: Room = {
            ...existing,
            ...trimmedUpdates,
            id, // Ensure ID doesn't change
            createdAt: existing.createdAt, // Ensure createdAt doesn't change
        };

        // Validate updated room
        validateRoom(updatedRoom);

        // Update in storage
        await this.storage.updateRoom(id, trimmedUpdates);

        return updatedRoom;
    }

    /**
     * Delete a room
     * Prevents deletion if room contains items
     * 
     * Algorithm:
     * 1. Validate roomId format
     * 2. Check if room exists
     * 3. Check for items in room
     * 4. If room has items, throw RoomNotEmptyError
     * 5. Delete room (atomic operation)
     * 6. Verify deletion
     */
    async delete(id: string): Promise<void> {
        // Step 1: Validate roomId format
        if (!isValidUUID(id)) {
            throw new ValidationError('Invalid room ID format');
        }

        // Step 2: Check if room exists
        const room = await this.storage.getRoom(id);
        if (!room) {
            throw new NotFoundError(`Room not found: ${id}`);
        }

        // Step 3: Check for items in room
        const itemsInRoom = await this.getItemCount(id);

        // Step 4: If room has items, throw error
        if (itemsInRoom > 0) {
            throw new RoomNotEmptyError(
                `Cannot delete room with ${itemsInRoom} items. Please reassign or delete items first.`
            );
        }

        // Step 5: Delete room (atomic operation)
        await this.storage.deleteRoom(id);

        // Step 6: Verify deletion
        const verifyRoom = await this.storage.getRoom(id);
        if (verifyRoom !== null) {
            throw new Error('Room deletion failed');
        }
    }

    /**
     * Get room by ID
     */
    async getById(id: string): Promise<Room | null> {
        if (!isValidUUID(id)) {
            throw new ValidationError('Invalid room ID format');
        }

        return await this.storage.getRoom(id);
    }

    /**
     * Get all rooms
     */
    async getAll(): Promise<Room[]> {
        return await this.storage.getAllRooms();
    }

    /**
     * Get count of items in a room
     */
    async getItemCount(roomId: string): Promise<number> {
        if (!isValidUUID(roomId)) {
            throw new ValidationError('Invalid room ID format');
        }

        const allItems = await this.storage.getAllItems();
        return allItems.filter((item) => item.roomId === roomId).length;
    }
}

/**
 * Create room repository instance
 * Factory function for creating repository with storage dependency
 */
export function createRoomRepository(storage: IStorage): RoomRepository {
    return new RoomRepositoryImpl(storage);
}
