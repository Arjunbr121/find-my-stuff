# Stores

Zustand state management stores for global application state.

## Overview

The stores provide a lightweight state management layer using Zustand. Each store maintains an in-memory cache of data, handles loading/error states, and coordinates with repositories for persistence.

## Implemented Stores

### itemStore
Global state management for items with the following features:
- In-memory cache of all items
- Loading and error state management
- CRUD operations (create, read, update, delete)
- Client-side fuzzy search across item name, location, and room
- Filter items by room
- Automatic sorting by most recently updated

**Usage:**
```typescript
import { createItemStore } from './stores';
import { itemRepository } from './repositories';
import { useRoomStore } from './stores';

// Create store with dependencies
const useItemStore = createItemStore(
  itemRepository,
  () => useRoomStore.getState().rooms
);

// Use in components
function MyComponent() {
  const { items, loading, error, loadItems, addItem } = useItemStore();
  
  useEffect(() => {
    loadItems();
  }, []);
  
  // ... use items
}
```

### roomStore
Global state management for rooms with the following features:
- In-memory cache of all rooms
- Loading and error state management
- CRUD operations (create, read, update, delete)
- Get room by ID
- Get item count per room
- Automatic sorting by creation date

**Usage:**
```typescript
import { createRoomStore } from './stores';
import { roomRepository } from './repositories';
import { useItemStore } from './stores';

// Create store with dependencies
const useRoomStore = createRoomStore(
  roomRepository,
  () => useItemStore.getState().items
);

// Use in components
function MyComponent() {
  const { rooms, loading, error, loadRooms, addRoom } = useRoomStore();
  
  useEffect(() => {
    loadRooms();
  }, []);
  
  // ... use rooms
}
```

## Store Architecture

Both stores follow the same pattern:

1. **State**: Maintains items/rooms array, loading flag, and error message
2. **Actions**: Async functions that coordinate with repositories
3. **Selectors**: Synchronous functions that query in-memory data
4. **Error Handling**: Catches errors and updates error state

## Dependencies

The stores have circular dependencies with each other:
- itemStore needs rooms for search functionality
- roomStore needs items for counting items per room

This is resolved by passing getter functions during store creation, allowing lazy access to the other store's state.

## Performance

- All search and filtering operations work on in-memory data (O(n) complexity)
- No database queries for read operations after initial load
- Stores automatically update when data changes
- Suitable for 10,000+ items with proper list virtualization in UI
