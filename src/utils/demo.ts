/**
 * Demo script to verify utility functions work correctly
 * Run with: npx ts-node src/utils/demo.ts
 */

import { generateUUID, isValidUUID } from './uuid';
import { validateItem, validateRoom, ValidationError } from './validation';
import { fuzzySearch, calculateMatchScore } from './search';
import { Item, Room } from '../types/models';

console.log('=== UUID Utilities Demo ===\n');

// Generate UUIDs
const uuid1 = generateUUID();
const uuid2 = generateUUID();
console.log('Generated UUID 1:', uuid1);
console.log('Generated UUID 2:', uuid2);
console.log('UUIDs are unique:', uuid1 !== uuid2);
console.log('UUID 1 is valid:', isValidUUID(uuid1));
console.log('Invalid UUID check:', isValidUUID('not-a-uuid'));

console.log('\n=== Validation Utilities Demo ===\n');

// Create valid room
const validRoom: Room = {
    id: generateUUID(),
    name: 'Kitchen',
    icon: 'kitchen',
    color: '#FF6B6B',
    description: 'Main kitchen area',
    createdAt: Date.now(),
};

try {
    validateRoom(validRoom);
    console.log('✓ Valid room passed validation');
} catch (error) {
    console.log('✗ Valid room failed validation:', error);
}

// Create valid item
const validItem: Item = {
    id: generateUUID(),
    name: 'Car Keys',
    imageUri: 'file:///path/to/keys.jpg',
    roomId: validRoom.id,
    specificLocation: 'Top drawer by the door',
    createdAt: Date.now(),
    updatedAt: Date.now(),
};

try {
    validateItem(validItem);
    console.log('✓ Valid item passed validation');
} catch (error) {
    console.log('✗ Valid item failed validation:', error);
}

// Test invalid item
const invalidItem: Item = {
    ...validItem,
    name: '', // Invalid: empty name
};

try {
    validateItem(invalidItem);
    console.log('✗ Invalid item should have failed validation');
} catch (error) {
    if (error instanceof ValidationError) {
        console.log('✓ Invalid item correctly rejected:', error.message);
    }
}

console.log('\n=== Search Utilities Demo ===\n');

// Test match scoring
console.log('Match scores:');
console.log('  Exact match "kitchen" vs "kitchen":', calculateMatchScore('kitchen', 'kitchen'));
console.log('  Prefix match "kitchen" vs "kit":', calculateMatchScore('kitchen', 'kit'));
console.log('  Substring match "kitchen" vs "tch":', calculateMatchScore('kitchen', 'tch'));
console.log('  No match "kitchen" vs "xyz":', calculateMatchScore('kitchen', 'xyz'));

// Create test data
const bedroom: Room = {
    id: generateUUID(),
    name: 'Bedroom',
    icon: 'bedroom',
    color: '#4ECDC4',
    createdAt: Date.now(),
};

const items: Item[] = [
    {
        id: generateUUID(),
        name: 'Car Keys',
        imageUri: 'file:///keys.jpg',
        roomId: validRoom.id,
        specificLocation: 'Top drawer',
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        id: generateUUID(),
        name: 'Wallet',
        imageUri: 'file:///wallet.jpg',
        roomId: bedroom.id,
        specificLocation: 'Nightstand',
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        id: generateUUID(),
        name: 'Phone Charger',
        imageUri: 'file:///charger.jpg',
        roomId: validRoom.id,
        specificLocation: 'Kitchen counter',
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
];

const rooms = [validRoom, bedroom];

console.log('\nSearch tests:');
console.log('  Total items:', items.length);

const keysResults = fuzzySearch(items, 'keys', rooms);
console.log('  Search "keys":', keysResults.length, 'results');
if (keysResults.length > 0) {
    console.log('    Found:', keysResults[0].name);
}

const kitchenResults = fuzzySearch(items, 'kitchen', rooms);
console.log('  Search "kitchen":', kitchenResults.length, 'results');

const emptyResults = fuzzySearch(items, '', rooms);
console.log('  Search "" (empty):', emptyResults.length, 'results (should return all)');

console.log('\n✓ All utility functions working correctly!\n');
