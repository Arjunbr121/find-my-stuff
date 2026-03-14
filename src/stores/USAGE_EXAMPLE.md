# Store Usage Example

This document shows how to initialize and use the Zustand stores in your application.

## Initialization

Create a central location to initialize your stores with their dependencies:

```typescript
// src/stores/setup.ts
import { createItemStore } from './itemStore';
import { createRoomStore } from './roomStore';
import { createItemRepository } from '../repositories/itemRepository';
import { createRoomRepository } from '../repositories/roomRepository';
import { IStorage } from '../types/storage';

/**
 * Initialize stores with storage implementation
 * Call this once at app startup
 */
export function initializeStores(storage: IStorage) {
  // Create repositories
  const itemRepository = createItemRepository(storage);
  const roomRepository = createRoomRepository(storage);

  // Create stores with cross-dependencies
  const useItemStore = createItemStore(
    itemRepository,
    () => useRoomStore.getState().rooms
  );

  const useRoomStore = createRoomStore(
    roomRepository,
    () => useItemStore.getState().items
  );

  return { useItemStore, useRoomStore };
}
```

## Usage in App

```typescript
// App.tsx
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { WebStorage } from './storage/webStorage';
import { NativeStorage } from './storage/nativeStorage';
import { initializeStores } from './stores/setup';

// Initialize storage based on platform
const storage = Platform.OS === 'web' 
  ? new WebStorage() 
  : new NativeStorage();

// Initialize stores
const { useItemStore, useRoomStore } = initializeStores(storage);

// Export for use in components
export { useItemStore, useRoomStore };

function App() {
  const loadItems = useItemStore(state => state.loadItems);
  const loadRooms = useRoomStore(state => state.loadRooms);

  useEffect(() => {
    // Initialize storage and load data
    const init = async () => {
      await storage.open();
      await loadRooms(); // Load rooms first
      await loadItems(); // Then load items
    };
    init();
  }, []);

  return (
    // Your app components
  );
}
```

## Usage in Components

### Adding an Item

```typescript
import { useItemStore, useRoomStore } from '../App';

function AddItemScreen() {
  const addItem = useItemStore(state => state.addItem);
  const rooms = useRoomStore(state => state.rooms);
  const error = useItemStore(state => state.error);

  const handleSave = async () => {
    try {
      await addItem({
        name: 'My Keys',
        imageUri: 'file://...',
        roomId: rooms[0].id,
        specificLocation: 'On the counter'
      });
      // Navigate back or show success
    } catch (err) {
      // Error is already in store.error
      console.error('Failed to add item:', error);
    }
  };

  return (
    // Your form UI
  );
}
```

### Searching Items

```typescript
import { useState, useMemo } from 'react';
import { useItemStore } from '../App';

function SearchScreen() {
  const [query, setQuery] = useState('');
  const searchItems = useItemStore(state => state.searchItems);
  
  // Memoize search results
  const results = useMemo(() => {
    return searchItems(query);
  }, [query, searchItems]);

  return (
    <View>
      <SearchBar value={query} onChangeText={setQuery} />
      <FlatList
        data={results}
        renderItem={({ item }) => <ItemCard item={item} />}
      />
    </View>
  );
}
```

### Displaying Room with Item Count

```typescript
import { useRoomStore } from '../App';

function RoomList() {
  const rooms = useRoomStore(state => state.rooms);
  const getItemCount = useRoomStore(state => state.getItemCount);

  return (
    <FlatList
      data={rooms}
      renderItem={({ item: room }) => (
        <RoomCard
          room={room}
          itemCount={getItemCount(room.id)}
        />
      )}
    />
  );
}
```

### Deleting a Room

```typescript
import { useRoomStore } from '../App';

function RoomDetailScreen({ roomId }) {
  const deleteRoom = useRoomStore(state => state.deleteRoom);
  const error = useRoomStore(state => state.error);

  const handleDelete = async () => {
    try {
      await deleteRoom(roomId);
      // Navigate back
    } catch (err) {
      // Will throw RoomNotEmptyError if room has items
      Alert.alert('Error', error || 'Failed to delete room');
    }
  };

  return (
    // Your UI with delete button
  );
}
```

## Performance Tips

1. **Selective Subscriptions**: Only subscribe to the state you need
   ```typescript
   // Good - only re-renders when items change
   const items = useItemStore(state => state.items);
   
   // Bad - re-renders on any state change
   const store = useItemStore();
   ```

2. **Memoize Expensive Operations**: Use useMemo for search/filter
   ```typescript
   const results = useMemo(() => searchItems(query), [query, searchItems]);
   ```

3. **Debounce Search Input**: Prevent search on every keystroke
   ```typescript
   const debouncedQuery = useDebounce(query, 300);
   const results = useMemo(() => searchItems(debouncedQuery), [debouncedQuery]);
   ```

4. **Virtualize Lists**: Use FlatList for large item lists
   ```typescript
   <FlatList
     data={items}
     maxToRenderPerBatch={10}
     windowSize={5}
   />
   ```
