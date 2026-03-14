# Screens

This directory contains all screen components for the Find My Stuff application.

## Implemented Screens

### HomeScreen
Main screen displaying all items with search functionality.
- Search bar for filtering items
- Virtualized list for performance (handles 10,000+ items)
- Pull-to-refresh functionality
- Floating action button to add items
- Empty state handling

### RoomsScreen
Grid view displaying all rooms.
- Room cards with icon, name, and item count
- Floating action button to add rooms
- Empty state handling

### AddItemScreen
Form screen for adding new items.
- Text inputs for name and specific location
- Room picker (horizontal scroll)
- Camera and image picker buttons (placeholders)
- Image preview
- Form validation with error messages
- Save/Cancel actions

### ItemDetailScreen
Detailed view of a single item.
- Full-size image display
- Item details (name, room, location, timestamps)
- Edit button (placeholder)
- Delete button with confirmation
- Error handling for missing items

### AddRoomScreen
Form screen for adding new rooms.
- Text input for room name
- Icon picker (12 predefined icons)
- Color picker (8 predefined colors)
- Optional description field
- Live preview of room card
- Form validation with uniqueness check

### RoomDetailScreen
Detailed view of a single room.
- Room header with icon, name, description
- List of items in the room
- Item count display
- Edit button (placeholder)
- Delete button with item count check
- Error handling for missing rooms

## Pending Implementation

### SettingsScreen
App settings and data management (Task 15).
- Storage usage display
- Export/import data options
- Clear all data option
- App version and about information

## Usage

All screens are exported from `index.ts`:

```typescript
import {
    HomeScreen,
    RoomsScreen,
    AddItemScreen,
    ItemDetailScreen,
    AddRoomScreen,
    RoomDetailScreen,
} from '../screens';
```

## Notes

- All screens use placeholder store hooks (createItemStore, createRoomStore)
- Stores will be properly wired in App.tsx (Task 16)
- Camera and image picker functionality are placeholders (will be implemented with expo-camera and expo-image-picker)
- Edit functionality is placeholder (will be implemented in future tasks)
