/**
 * UUID generation and validation utilities
 */

import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

/**
 * Generate a new UUID v4
 * 
 * @returns A new UUID v4 string
 * 
 * @example
 * const id = generateUUID();
 * // Returns: "550e8400-e29b-41d4-a716-446655440000"
 */
export function generateUUID(): string {
    return uuidv4();
}

/**
 * Validate if a string is a valid UUID
 * 
 * @param uuid - The string to validate
 * @returns True if the string is a valid UUID, false otherwise
 * 
 * @example
 * isValidUUID("550e8400-e29b-41d4-a716-446655440000"); // true
 * isValidUUID("invalid-uuid"); // false
 * isValidUUID(""); // false
 */
export function isValidUUID(uuid: string): boolean {
    if (!uuid || typeof uuid !== 'string') {
        return false;
    }
    return uuidValidate(uuid);
}
