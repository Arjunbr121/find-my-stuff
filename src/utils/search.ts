/**
 * Fuzzy search algorithm for finding items
 */

import { Item, Room } from '../types/models';

/**
 * Calculate match score between text and query using substring matching
 * 
 * Scoring Tiers:
 * - 100: Exact match
 * - 80: Starts with query (prefix match)
 * - 50: Contains query (substring match)
 * - 0-30: Fuzzy character match (60%+ characters matched)
 * - 0: No match
 * 
 * @param text - The text to search in (should be lowercase)
 * @param query - The search query (should be lowercase)
 * @returns Score between 0 and 100
 * 
 * @example
 * calculateMatchScore("kitchen", "kitchen"); // 100 (exact)
 * calculateMatchScore("kitchen", "kit"); // 80 (prefix)
 * calculateMatchScore("kitchen", "tch"); // 50 (substring)
 * calculateMatchScore("kitchen", "ktn"); // ~18 (fuzzy)
 * calculateMatchScore("kitchen", "xyz"); // 0 (no match)
 */
export function calculateMatchScore(text: string, query: string): number {
    // Exact match (highest score)
    if (text === query) {
        return 100;
    }

    // Starts with query (high score)
    if (text.startsWith(query)) {
        return 80;
    }

    // Contains query as substring (medium score)
    if (text.includes(query)) {
        return 50;
    }

    // Character-by-character fuzzy match (low score)
    let matchCount = 0;
    let textIndex = 0;

    for (let i = 0; i < query.length; i++) {
        const char = query[i];
        const foundIndex = text.indexOf(char, textIndex);

        if (foundIndex !== -1) {
            matchCount++;
            textIndex = foundIndex + 1;
        }
    }

    // Score based on percentage of matched characters
    const matchPercentage = matchCount / query.length;
    return matchPercentage >= 0.6 ? matchPercentage * 30 : 0;
}

/**
 * Fuzzy search algorithm with multi-field matching and relevance scoring
 * 
 * Searches across item name, specific location, and room name.
 * Results are sorted by relevance score (highest first).
 * 
 * Scoring weights:
 * - Item name: 3x
 * - Specific location: 2x
 * - Room name: 1x
 * 
 * @param items - Array of items to search
 * @param query - Search query string
 * @param rooms - Array of rooms for room name lookup
 * @returns Filtered and sorted array of items matching the query
 * 
 * @example
 * const results = fuzzySearch(items, "keys", rooms);
 * // Returns items with "keys" in name, location, or room name
 * // Sorted by relevance (exact matches first, then prefix, etc.)
 * 
 * @preconditions
 * - items is a valid array (may be empty)
 * - query is a string (may be empty)
 * - rooms is a valid array containing all referenced rooms
 * - All items in items have valid roomId references in rooms
 * 
 * @postconditions
 * - Returns array of items matching the query
 * - If query is empty, returns all items
 * - Results are sorted by relevance score (highest first)
 * - No duplicate items in results
 * - All returned items exist in input items array
 * - Original items array is not mutated
 */
export function fuzzySearch(
    items: Item[],
    query: string,
    rooms: Room[]
): Item[] {
    // Step 1: Normalize query
    const normalizedQuery = query.toLowerCase().trim();

    // Early return for empty query
    if (normalizedQuery.length === 0) {
        return items;
    }

    // Step 2: Create room lookup map for O(1) access
    const roomMap = new Map<string, Room>();
    for (const room of rooms) {
        roomMap.set(room.id, room);
    }

    // Step 3: Score each item
    const scoredItems: Array<{ item: Item; score: number }> = [];

    for (const item of items) {
        const room = roomMap.get(item.roomId);
        if (!room) continue; // Skip items with invalid room references

        let score = 0;

        // Score item name (highest weight)
        score += calculateMatchScore(item.name.toLowerCase(), normalizedQuery) * 3;

        // Score specific location (medium weight)
        score += calculateMatchScore(item.specificLocation.toLowerCase(), normalizedQuery) * 2;

        // Score room name (lowest weight)
        score += calculateMatchScore(room.name.toLowerCase(), normalizedQuery) * 1;

        // Only include items with positive score
        if (score > 0) {
            scoredItems.push({ item, score });
        }
    }

    // Step 4: Sort by score descending
    scoredItems.sort((a, b) => b.score - a.score);

    // Step 5: Extract items
    return scoredItems.map(({ item }) => item);
}
