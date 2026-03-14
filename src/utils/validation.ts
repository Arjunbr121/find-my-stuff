/**
 * Validation utilities and error types
 */

import { Item, Room, ROOM_ICONS, ROOM_COLORS } from '../types/models';
import { isValidUUID } from './uuid';

/**
 * Custom error types for validation and business logic
 */

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class NotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NotFoundError';
    }
}

export class RoomNotEmptyError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'RoomNotEmptyError';
    }
}

export class StorageError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'StorageError';
    }
}

export class FileNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FileNotFoundError';
    }
}

export class PermissionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PermissionError';
    }
}

/**
 * Validate an item object
 * 
 * Validation Rules:
 * - id: Must be valid UUID v4 format
 * - name: Required, 1-100 characters, trimmed
 * - imageUri: Required, must be valid file path
 * - roomId: Required, must be valid UUID format
 * - specificLocation: Required, 1-200 characters, trimmed
 * - createdAt: Required, positive integer
 * - updatedAt: Required, positive integer, >= createdAt
 * 
 * @param item - The item to validate
 * @throws ValidationError if validation fails
 */
export function validateItem(item: Item): void {
    // Validate id
    if (!isValidUUID(item.id)) {
        throw new ValidationError('Item id must be a valid UUID v4');
    }

    // Validate name
    if (!item.name || typeof item.name !== 'string') {
        throw new ValidationError('Item name is required');
    }
    const trimmedName = item.name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 100) {
        throw new ValidationError('Item name must be between 1 and 100 characters');
    }

    // Validate imageUri
    if (!item.imageUri || typeof item.imageUri !== 'string') {
        throw new ValidationError('Item imageUri is required');
    }
    if (item.imageUri.trim().length === 0) {
        throw new ValidationError('Item imageUri cannot be empty');
    }

    // Validate roomId
    if (!isValidUUID(item.roomId)) {
        throw new ValidationError('Item roomId must be a valid UUID v4');
    }

    // Validate specificLocation
    if (!item.specificLocation || typeof item.specificLocation !== 'string') {
        throw new ValidationError('Item specificLocation is required');
    }
    const trimmedLocation = item.specificLocation.trim();
    if (trimmedLocation.length < 1 || trimmedLocation.length > 200) {
        throw new ValidationError('Item specificLocation must be between 1 and 200 characters');
    }

    // Validate createdAt
    if (typeof item.createdAt !== 'number' || item.createdAt <= 0) {
        throw new ValidationError('Item createdAt must be a positive number');
    }

    // Validate updatedAt
    if (typeof item.updatedAt !== 'number' || item.updatedAt <= 0) {
        throw new ValidationError('Item updatedAt must be a positive number');
    }
    if (item.updatedAt < item.createdAt) {
        throw new ValidationError('Item updatedAt must be greater than or equal to createdAt');
    }
}

/**
 * Validate a room object
 * 
 * Validation Rules:
 * - id: Must be valid UUID v4 format
 * - name: Required, 1-50 characters, trimmed
 * - icon: Required, must be from predefined icon set
 * - color: Required, must be valid hex color (#RRGGBB)
 * - description: Optional, max 200 characters, trimmed
 * - createdAt: Required, positive integer
 * 
 * Note: Room name uniqueness must be checked separately by the repository layer
 * 
 * @param room - The room to validate
 * @throws ValidationError if validation fails
 */
export function validateRoom(room: Room): void {
    // Validate id
    if (!isValidUUID(room.id)) {
        throw new ValidationError('Room id must be a valid UUID v4');
    }

    // Validate name
    if (!room.name || typeof room.name !== 'string') {
        throw new ValidationError('Room name is required');
    }
    const trimmedName = room.name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 50) {
        throw new ValidationError('Room name must be between 1 and 50 characters');
    }

    // Validate icon
    if (!room.icon || typeof room.icon !== 'string') {
        throw new ValidationError('Room icon is required');
    }
    if (!ROOM_ICONS.includes(room.icon as any)) {
        throw new ValidationError(
            `Room icon must be one of: ${ROOM_ICONS.join(', ')}`
        );
    }

    // Validate color
    if (!room.color || typeof room.color !== 'string') {
        throw new ValidationError('Room color is required');
    }
    const hexColorRegex = /^#[0-9A-F]{6}$/i;
    if (!hexColorRegex.test(room.color)) {
        throw new ValidationError('Room color must be a valid hex color (#RRGGBB)');
    }
    if (!ROOM_COLORS.includes(room.color as any)) {
        throw new ValidationError(
            `Room color must be one of: ${ROOM_COLORS.join(', ')}`
        );
    }

    // Validate description (optional)
    if (room.description !== undefined) {
        if (typeof room.description !== 'string') {
            throw new ValidationError('Room description must be a string');
        }
        const trimmedDescription = room.description.trim();
        if (trimmedDescription.length > 200) {
            throw new ValidationError('Room description must be at most 200 characters');
        }
    }

    // Validate createdAt
    if (typeof room.createdAt !== 'number' || room.createdAt <= 0) {
        throw new ValidationError('Room createdAt must be a positive number');
    }
}
