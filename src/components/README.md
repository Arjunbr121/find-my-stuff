# Components

Reusable UI components for the Find My Stuff application.

## Available Components

### ItemCard
Displays a single item with its image, name, room, and location.

**Props:**
- `item: Item` - The item to display
- `room: Room` - The room the item belongs to
- `onPress: (item: Item) => void` - Handler for press events
- `onLongPress?: (item: Item) => void` - Optional handler for long press events

**Features:**
- Image thumbnail with loading state
- Item name and specific location
- Room badge with color accent
- Relative timestamp display
- Error handling for missing images

### RoomCard
Displays a room with its icon, name, and item count.

**Props:**
- `room: Room` - The room to display
- `itemCount: number` - Number of items in the room
- `onPress: (room: Room) => void` - Handler for press events

**Features:**
- Room icon display (emoji-based)
- Room name and optional description
- Item count badge
- Color accent from room settings
- Touch feedback

### SearchBar
Search input with debouncing and clear functionality.

**Props:**
- `value: string` - Current search value
- `onChangeText: (text: string) => void` - Handler for text changes
- `placeholder?: string` - Placeholder text (default: "Search...")
- `autoFocus?: boolean` - Auto-focus on mount (default: false)

**Features:**
- Search icon on the left
- Clear button when text is present
- 300ms debounced input
- Auto-focus support

### FloatingButton
Floating Action Button (FAB) for primary actions.

**Props:**
- `onPress: () => void` - Handler for press events
- `icon: string` - Icon to display (emoji or icon font)
- `label?: string` - Optional accessibility label

**Features:**
- Circular button positioned at bottom-right
- Shadow and elevation for depth
- Smooth press animation
- Accessibility support

## Usage Example

```typescript
import { ItemCard, RoomCard, SearchBar, FloatingButton } from './components';

// ItemCard usage
<ItemCard
  item={item}
  room={room}
  onPress={(item) => console.log('Pressed:', item.name)}
  onLongPress={(item) => console.log('Long pressed:', item.name)}
/>

// RoomCard usage
<RoomCard
  room={room}
  itemCount={5}
  onPress={(room) => console.log('Pressed:', room.name)}
/>

// SearchBar usage
<SearchBar
  value={searchQuery}
  onChangeText={setSearchQuery}
  placeholder="Search items..."
  autoFocus={true}
/>

// FloatingButton usage
<FloatingButton
  onPress={() => navigation.navigate('AddItem')}
  icon="+"
  label="Add new item"
/>
```
