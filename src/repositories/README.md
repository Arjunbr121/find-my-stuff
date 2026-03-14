# Repositories

Business logic layer between stores and storage.

## Implemented Repositories

### ItemRepository (`itemRepository.ts`)
Handles all business logic for item operations including:
- **create()**: Generates ID and timestamps, validates data, saves images to permanent storage
- **update()**: Updates items with validation and timestamp management
- **delete()**: Removes items and cleans up associated image files
- **getById()**: Retrieves a single item by ID
- **getAll()**: Retrieves all items
- **getByRoom()**: Filters items by room ID
- **search()**: Searches items using storage layer
- **saveImage()**: Copies images from temporary to permanent storage with unique filenames
- **deleteImage()**: Removes image files from storage

Key features:
- Automatic ID generation using UUID v4
- Timestamp management (createdAt, updatedAt)
- Image file management with cleanup on errors
- Foreign key validation (ensures room exists)
- Input validation and trimming

### RoomRepository (`roomRepository.ts`)
Handles all business logic for room operations including:
- **create()**: Generates ID and timestamp, validates data, checks name uniqueness
- **update()**: Updates rooms with validation and uniqueness checks
- **delete()**: Removes rooms with safety checks (prevents deletion if items exist)
- **getById()**: Retrieves a single room by ID
- **getAll()**: Retrieves all rooms
- **getItemCount()**: Counts items in a room

Key features:
- Automatic ID generation using UUID v4
- Timestamp management (createdAt)
- Case-insensitive name uniqueness validation
- Room deletion protection (RoomNotEmptyError if items exist)
- Input validation and trimming

## Usage

```typescript
import { createItemRepository, createRoomRepository } from './repositories';
import { initializeStorage } from './storage';

// Initialize storage
const storage = await initializeStorage();

// Create repositories
const itemRepository = createItemRepository(storage);
const roomRepository = createRoomRepository(storage);

// Use repositories
const room = await roomRepository.create({
  name: 'Kitchen',
  icon: 'kitchen',
  color: '#FF6B6B',
});

const item = await itemRepository.create({
  name: 'Coffee Maker',
  imageUri: 'file:///temp/photo.jpg',
  roomId: room.id,
  specificLocation: 'Counter, left side',
});
```

## Error Handling

Repositories throw specific error types:
- **ValidationError**: Invalid input data
- **NotFoundError**: Entity not found
- **RoomNotEmptyError**: Attempting to delete room with items
- **StorageError**: Storage operation failed
- **FileNotFoundError**: Image file not found
