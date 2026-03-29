/**
 * Core data models for Find My Stuff application
 */

/**
 * Item model representing a physical item tracked in the app
 * 
 * Validation Rules:
 * - id: Must be valid UUID v4 format
 * - name: Required, 1-100 characters, trimmed
 * - imageUri: Required, must be valid file path
 * - thumbnailUri: Optional, must be valid file path if provided
 * - roomId: Required, must reference existing room
 * - specificLocation: Required, 1-200 characters, trimmed
 * - createdAt: Required, positive integer
 * - updatedAt: Required, positive integer, >= createdAt
 */
export type ItemLocation = {
    latitude: number;
    longitude: number;
    accuracy?: number;        // metres
};

export type Item = {
    id: string;                // UUID v4
    name: string;              // User-provided item name
    imageUri: string;          // Local file path to full-size image
    thumbnailUri?: string;     // Optional local file path to thumbnail (200x200)
    roomId: string;            // Foreign key to Room
    specificLocation: string;  // e.g., "Top shelf, left side"
    location?: ItemLocation;   // GPS coords captured at photo time
    detectedObjects?: string[]; // COCO-SSD labels e.g. ["laptop","bottle"]
    aiSummary?: string;         // Human-readable location summary
    createdAt: number;         // Unix timestamp (ms)
    updatedAt: number;         // Unix timestamp (ms)
};

/**
 * Room model representing a physical room or location
 * 
 * Validation Rules:
 * - id: Must be valid UUID v4 format
 * - name: Required, 1-50 characters, trimmed, unique
 * - icon: Required, must be from predefined icon set
 * - color: Required, must be valid hex color (#RRGGBB)
 * - description: Optional, max 200 characters, trimmed
 * - createdAt: Required, positive integer
 * 
 * Predefined Icons:
 * - kitchen, bedroom, living-room, bathroom, garage, office, 
 *   hallway, closet, basement, attic, storage, outdoor
 * 
 * Predefined Colors:
 * - #FF6B6B, #4ECDC4, #45B7D1, #FFA07A, #98D8C8, 
 *   #F7DC6F, #BB8FCE, #85C1E2
 */
export type Room = {
    id: string;           // UUID v4
    name: string;         // User-provided room name
    icon: string;         // Icon identifier (e.g., "kitchen", "bedroom")
    color: string;        // Hex color code
    description?: string; // Optional description
    createdAt: number;    // Unix timestamp (ms)
};

/**
 * Predefined icon identifiers for rooms
 */
export const ROOM_ICONS = [
    'kitchen',
    'bedroom',
    'living-room',
    'bathroom',
    'garage',
    'office',
    'hallway',
    'closet',
    'basement',
    'attic',
    'storage',
    'outdoor',
] as const;

export type RoomIcon = typeof ROOM_ICONS[number];

/**
 * Predefined color options for rooms
 */
export const ROOM_COLORS = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#FFA07A',
    '#98D8C8',
    '#F7DC6F',
    '#BB8FCE',
    '#85C1E2',
] as const;

export type RoomColor = typeof ROOM_COLORS[number];
