# Storage Layer

This directory contains the storage abstraction layer implementations for the Find My Stuff application.

## Overview

The storage layer provides a unified interface (`IStorage`) for data persistence across different platforms:
- **Web**: Uses IndexedDB via the `idb` library
- **iOS/Android**: Uses SQLite via `expo-sqlite`

## Files

### `webStorage.ts`
IndexedDB implementation for web platform.

**Features:**
- Object stores for items and rooms
- Indexes for fast queries (roomId, name, specificLocation)
- Unique constraint on room names
- Transaction support for batch operations
- Full CRUD operations for items and rooms

### `nativeStorage.ts`
SQLite implementation for iOS and Android platforms.

**Features:**
- SQL tables for items and rooms
- Indexes for performance optimization
- Unique constraint on room names
- Transaction support with `withTransactionAsync`
- Row-to-object mapping functions
- Full CRUD operations for items and rooms

### `index.ts`
Storage factory and initialization utilities.

**Functions:**
- `initializeStorage()`: Creates and initializes platform-specific storage
- `healthCheck()`: Verifies storage is working correctly
- `getSchemaVersion()`: Returns current schema version
- `runMigrations()`: Handles schema migrations (future use)
- `repairStorage()`: Attempts to repair corrupted storage
- `resetStorage()`: Clears all data from storage

## Usage

```typescript
import { initializeStorage } from './storage';

// Initialize storage (auto-detects platform)
const storage = await initializeStorage();

// Insert an item
await storage.insertItem({
  id: 'uuid-here',
  name: 'My Item',
  imageUri: 'file://path/to/image.jpg',
  roomId: 'room-uuid',
  specificLocation: 'Top shelf',
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// Get all items
const items = await storage.getAllItems();

// Search items
const results = await storage.searchItems('shelf');

// Export data
const data = await storage.exportData();

// Import data
await storage.importData(data);
```

## Error Handling

All storage operations throw typed errors:
- `StorageError`: General storage operation failures
- `NotFoundError`: Item/room not found
- `ValidationError`: Data validation failures (e.g., duplicate room name)
- `RoomNotEmptyError`: Attempting to delete room with items
- `FileNotFoundError`: File system errors

## Platform Detection

The storage factory automatically detects the platform using React Native's `Platform.OS`:
- `web` → WebStorage (IndexedDB)
- `ios` → NativeStorage (SQLite)
- `android` → NativeStorage (SQLite)

## Schema

### Items Table/Store
- `id` (string, primary key)
- `name` (string, indexed)
- `imageUri` (string)
- `roomId` (string, indexed)
- `specificLocation` (string, indexed)
- `createdAt` (number)
- `updatedAt` (number)

### Rooms Table/Store
- `id` (string, primary key)
- `name` (string, unique, indexed)
- `icon` (string)
- `color` (string)
- `description` (string, optional)
- `createdAt` (number)

## Performance

- Indexes on frequently queried fields (roomId, name, specificLocation)
- Batch operations use transactions for atomicity
- Search operations use platform-specific optimizations:
  - Web: In-memory filtering with `includes()`
  - Native: SQL `LIKE` queries with indexes

## Future Enhancements

- Schema versioning and migrations
- Automatic backup before migrations
- Storage usage monitoring
- Compression for large datasets
- Encryption for sensitive data
