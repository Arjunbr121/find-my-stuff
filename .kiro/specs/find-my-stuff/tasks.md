# Implementation Plan: Find My Stuff

## Overview

This plan implements a cross-platform mobile application using React Native, Expo, and TypeScript. The architecture follows a layered approach: UI components → Hooks → Zustand stores → Repository layer → Storage abstraction (SQLite for mobile, IndexedDB for web). The implementation prioritizes offline-first functionality, type safety, and performance for handling 10,000+ items.

## Tasks

- [ ] 1. Set up project structure and dependencies
  - Initialize Expo project with TypeScript template
  - Install core dependencies (react-navigation, zustand, expo-sqlite, idb, uuid, date-fns)
  - Configure TypeScript with strict mode
  - Set up folder structure: src/{components, screens, stores, repositories, storage, types, utils}
  - Create .gitignore for node_modules, build artifacts, and local storage files
  - _Requirements: Architecture foundation_

- [ ] 2. Define core data models and types
  - [ ] 2.1 Create TypeScript interfaces for Item and Room models
    - Define Item type with id, name, imageUri, roomId, specificLocation, createdAt, updatedAt
    - Define Room type with id, name, icon, color, description, createdAt
    - Add validation rules as JSDoc comments
    - Export from src/types/models.ts
    - _Requirements: Data Models section_
  
  - [ ] 2.2 Create storage interface (IStorage)
    - Define IStorage interface with all CRUD operations for items and rooms
    - Include batch operations (clearAll, exportData, importData)
    - Add type definitions for query results and errors
    - Export from src/types/storage.ts
    - _Requirements: Storage Abstraction Layer_
  
  - [ ] 2.3 Create repository interfaces
    - Define ItemRepository interface with create, update, delete, getById, getAll, getByRoom, search, saveImage, deleteImage
    - Define RoomRepository interface with create, update, delete, getById, getAll, getItemCount
    - Export from src/types/repositories.ts
    - _Requirements: Repository Layer_

- [ ] 3. Implement utility functions
  - [ ] 3.1 Create UUID generation utility
    - Implement generateUUID() using uuid library
    - Add validation function isValidUUID()
    - Export from src/utils/uuid.ts
    - _Requirements: Data Models - ID generation_
  
  - [ ] 3.2 Create validation utilities
    - Implement validateItem() with all validation rules (name length, roomId format, etc.)
    - Implement validateRoom() with uniqueness check preparation
    - Add error types: ValidationError, NotFoundError, RoomNotEmptyError, StorageError
    - Export from src/utils/validation.ts
    - _Requirements: Data Models - Validation Rules_
  
  - [ ] 3.3 Create fuzzy search algorithm
    - Implement calculateMatchScore() function with exact, prefix, substring, and fuzzy matching
    - Implement fuzzySearch() function with multi-field scoring (name, location, room)
    - Add proper TypeScript types and JSDoc documentation
    - Export from src/utils/search.ts
    - _Requirements: Main Search Algorithm_
  
  - [ ]* 3.4 Write property test for fuzzy search
    - **Property 2: Search Completeness**
    - **Validates: Items containing query appear in results**
    - Use fast-check to generate random items and queries
    - Verify all matching items appear in results
    - Verify results are sorted by score descending

- [ ] 4. Implement storage layer
  - [ ] 4.1 Create web storage implementation (IndexedDB)
    - Implement WebStorage class implementing IStorage interface
    - Create database schema with items and rooms object stores
    - Add indexes for roomId, name (fulltext), specificLocation (fulltext)
    - Implement all CRUD operations using idb library
    - Add transaction support and error handling
    - Export from src/storage/webStorage.ts
    - _Requirements: Storage Abstraction Layer, Platform-specific storage_
  
  - [ ] 4.2 Create native storage implementation (SQLite)
    - Implement NativeStorage class implementing IStorage interface
    - Create SQL schema with items and rooms tables
    - Add indexes for performance (roomId, name, specificLocation)
    - Implement all CRUD operations using expo-sqlite
    - Add transaction support and error handling
    - Implement row-to-object mapping functions
    - Export from src/storage/nativeStorage.ts
    - _Requirements: Storage Abstraction Layer, Platform-specific storage_
  
  - [ ] 4.3 Create storage factory
    - Implement initializeStorage() function with platform detection
    - Add schema migration support (version checking)
    - Create health check functionality
    - Handle storage initialization errors
    - Export from src/storage/index.ts
    - _Requirements: Storage Initialization Algorithm_
  
  - [ ]* 4.4 Write unit tests for storage implementations
    - Test CRUD operations for both web and native storage
    - Test transaction rollback on errors
    - Test index creation and query performance
    - Mock platform-specific APIs

- [ ] 5. Checkpoint - Verify storage layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement repository layer
  - [x] 6.1 Create item repository
    - Implement ItemRepository with all interface methods
    - Add ID generation and timestamp management in create()
    - Implement saveImage() using expo-file-system (copy to permanent location)
    - Implement deleteImage() with file existence check
    - Add validation before all operations
    - Handle errors with proper error types
    - Export from src/repositories/itemRepository.ts
    - _Requirements: Repository Layer, Image Save Algorithm_
  
  - [x] 6.2 Create room repository
    - Implement RoomRepository with all interface methods
    - Add ID generation and timestamp management
    - Implement deleteRoom() with item count check (prevent deletion if items exist)
    - Add room name uniqueness validation
    - Handle errors with proper error types
    - Export from src/repositories/roomRepository.ts
    - _Requirements: Repository Layer, Room Deletion Algorithm_
  
  - [ ]* 6.3 Write property test for data integrity
    - **Property 1: Data Integrity**
    - **Validates: All items reference valid rooms**
    - Generate random items and rooms
    - Verify every item.roomId exists in rooms
    - Test repository prevents invalid roomId insertion
  
  - [ ]* 6.4 Write property test for timestamp consistency
    - **Property 4: Timestamp Consistency**
    - **Validates: updatedAt >= createdAt for all items**
    - Generate random items with various timestamps
    - Verify timestamp ordering after create and update operations
  
  - [ ]* 6.5 Write unit tests for repositories
    - Test item creation with image save
    - Test room deletion blocked when items exist
    - Test validation errors
    - Test image cleanup on item deletion

- [x] 7. Implement state management with Zustand
  - [x] 7.1 Create item store
    - Implement useItemStore with Zustand
    - Add state: items array, loading, error
    - Implement loadItems() action calling itemRepository.getAll()
    - Implement addItem() action with optimistic update
    - Implement updateItem() and deleteItem() actions
    - Implement searchItems() using fuzzySearch utility
    - Implement getItemsByRoom() filter function
    - Export from src/stores/itemStore.ts
    - _Requirements: State Management Layer_
  
  - [x] 7.2 Create room store
    - Implement useRoomStore with Zustand
    - Add state: rooms array, loading, error
    - Implement loadRooms() action calling roomRepository.getAll()
    - Implement addRoom(), updateRoom(), deleteRoom() actions
    - Implement getRoomById() selector
    - Implement getItemCount() using itemStore
    - Export from src/stores/roomStore.ts
    - _Requirements: State Management Layer_
  
  - [ ]* 7.3 Write unit tests for stores
    - Test store actions update state correctly
    - Test error handling and loading states
    - Test selectors return correct data
    - Mock repository layer

- [x] 8. Create reusable UI components
  - [x] 8.1 Create ItemCard component
    - Implement ItemCard with props: item, room, onPress, onLongPress
    - Render image thumbnail using expo-image with caching
    - Display item name, room badge, specific location, timestamp
    - Add loading state for image
    - Style with proper spacing and typography
    - Export from src/components/ItemCard.tsx
    - _Requirements: UI Components_
  
  - [x] 8.2 Create RoomCard component
    - Implement RoomCard with props: room, itemCount, onPress
    - Display room icon, name, item count, color accent
    - Add proper touch feedback
    - Export from src/components/RoomCard.tsx
    - _Requirements: UI Components_
  
  - [x] 8.3 Create SearchBar component
    - Implement SearchBar with props: value, onChangeText, placeholder, autoFocus
    - Add search icon and clear button
    - Implement debounced input (300ms delay)
    - Style with proper input styling
    - Export from src/components/SearchBar.tsx
    - _Requirements: UI Components, Debounced Search_
  
  - [x] 8.4 Create FloatingButton component
    - Implement FloatingButton with props: onPress, icon, label
    - Style as circular FAB positioned at bottom-right
    - Add haptic feedback on press
    - Export from src/components/FloatingButton.tsx
    - _Requirements: UI Components_
  
  - [ ]* 8.5 Write component tests
    - Test ItemCard renders all fields correctly
    - Test SearchBar debounces input
    - Test RoomCard displays item count
    - Test FloatingButton triggers onPress
    - Use React Native Testing Library

- [x] 9. Implement navigation structure
  - [x] 9.1 Set up React Navigation
    - Install and configure @react-navigation/native
    - Create bottom tab navigator with Home, Rooms, Settings tabs
    - Create stack navigator for item and room detail screens
    - Configure navigation types for TypeScript
    - Export from src/navigation/index.tsx
    - _Requirements: Navigation Layer_
  
  - [x] 9.2 Create navigation types
    - Define RootStackParamList with all screen params
    - Define BottomTabParamList
    - Export navigation prop types
    - Export from src/types/navigation.ts
    - _Requirements: TypeScript type safety_

- [x] 10. Implement main screens
  - [x] 10.1 Create HomeScreen
    - Implement HomeScreen with search bar at top
    - Load items using useItemStore on mount
    - Implement FlatList with virtualization (maxToRenderPerBatch=10, windowSize=5)
    - Render ItemCard for each item
    - Add FloatingButton for "Add Item" navigation
    - Implement pull-to-refresh
    - Handle empty state with helpful message
    - Export from src/screens/HomeScreen.tsx
    - _Requirements: Main Application Workflow, Performance - Virtualized Lists_
  
  - [x] 10.2 Create AddItemScreen
    - Implement form with inputs: name, room picker, specific location
    - Add camera button using expo-camera
    - Add image picker button using expo-image-picker
    - Request camera permissions with proper error handling
    - Display selected image preview
    - Implement save button calling itemStore.addItem()
    - Add form validation with error messages
    - Navigate back on success
    - Export from src/screens/AddItemScreen.tsx
    - _Requirements: Main Application Workflow, Camera Permission Handling_
  
  - [x] 10.3 Create ItemDetailScreen
    - Display full-size image using expo-image
    - Show all item details (name, room, location, timestamps)
    - Add edit and delete buttons
    - Implement delete confirmation dialog
    - Navigate back after delete
    - Export from src/screens/ItemDetailScreen.tsx
    - _Requirements: UI Layer_
  
  - [x] 10.4 Create RoomsScreen
    - Load rooms using useRoomStore on mount
    - Display grid of RoomCard components
    - Show item count for each room
    - Add FloatingButton for "Add Room"
    - Handle empty state
    - Export from src/screens/RoomsScreen.tsx
    - _Requirements: UI Layer_
  
  - [x] 10.5 Create AddRoomScreen
    - Implement form with inputs: name, icon picker, color picker
    - Display predefined icon options (kitchen, bedroom, living-room, etc.)
    - Display predefined color options
    - Add optional description field
    - Implement save button calling roomStore.addRoom()
    - Handle room name uniqueness errors
    - Navigate back on success
    - Export from src/screens/AddRoomScreen.tsx
    - _Requirements: Room Model, Room Name Uniqueness_
  
  - [x] 10.6 Create RoomDetailScreen
    - Display room information (name, icon, color, description)
    - Show list of items in this room using itemStore.getItemsByRoom()
    - Add edit and delete buttons
    - Implement delete with item count check (show error if items exist)
    - Export from src/screens/RoomDetailScreen.tsx
    - _Requirements: Room Deletion Algorithm_
  
  - [ ]* 10.7 Write integration tests for screens
    - Test home screen loads and displays items
    - Test add item flow end-to-end
    - Test search functionality
    - Test room creation and deletion
    - Use Detox for E2E testing

- [ ] 11. Checkpoint - Verify core functionality
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement error handling and edge cases
  - [x] 12.1 Add global error boundary
    - Create ErrorBoundary component
    - Display user-friendly error screen
    - Add "Retry" and "Report" buttons
    - Log errors for debugging
    - Export from src/components/ErrorBoundary.tsx
    - _Requirements: Error Handling_
  
  - [x] 12.2 Implement storage full handling
    - Check available storage before image save
    - Catch ENOSPC errors
    - Show user-friendly alert with storage info
    - Provide guidance to free up space
    - _Requirements: Error Scenario 1 - Storage Full_
  
  - [x] 12.3 Implement permission handling
    - Request camera permission with explanation
    - Handle permission denied gracefully
    - Provide "Open Settings" option
    - Fallback to image picker if camera denied
    - _Requirements: Error Scenario 3 - Camera Permission Denied_
  
  - [x] 12.4 Add database corruption recovery
    - Implement health check on app start
    - Detect corrupted database
    - Offer automatic repair or reset
    - Provide export before reset option
    - _Requirements: Error Scenario 4 - Database Corruption_

- [x] 13. Implement data export/import
  - [x] 13.1 Create export functionality
    - Implement exportData() in storage layer
    - Generate JSON file with items and rooms
    - Use expo-file-system to save to user-accessible location
    - Show success message with file location
    - Add privacy warning before export
    - _Requirements: Storage Interface - Batch Operations_
  
  - [x] 13.2 Create import functionality
    - Implement importData() in storage layer
    - Parse and validate JSON file
    - Show preview of data to be imported
    - Implement merge strategy (replace or append)
    - Handle import errors gracefully
    - _Requirements: Storage Interface - Batch Operations_
  
  - [ ]* 13.3 Write tests for export/import
    - Test export generates valid JSON
    - Test import restores data correctly
    - Test import validation rejects invalid data
    - Test merge strategies work correctly

- [x] 14. Add performance optimizations
  - [x] 14.1 Implement image optimization
    - Create thumbnail generation for list views (200x200)
    - Store thumbnails separately from full images
    - Use expo-image with caching configuration
    - Lazy load images in FlatList
    - _Requirements: Performance - Image Optimization_
  
  - [x] 14.2 Add memoization to expensive operations
    - Memoize fuzzySearch results with useMemo
    - Memoize filtered/sorted lists
    - Add React.memo to ItemCard and RoomCard
    - _Requirements: Performance - Memoized Selectors_
  
  - [x] 14.3 Implement batch loading for large datasets
    - Add pagination to storage queries (1000 items per batch)
    - Implement progressive loading in stores
    - Show loading indicator during batch loads
    - _Requirements: Performance - Batch Operations_

- [x] 15. Create settings screen
  - [x] 15.1 Implement SettingsScreen
    - Add storage usage display
    - Add export/import data options
    - Add clear all data option with confirmation
    - Add app version and about information
    - Add theme toggle (light/dark mode) preparation
    - Export from src/screens/SettingsScreen.tsx
    - _Requirements: UI Layer_
  
  - [ ]* 15.2 Write tests for settings
    - Test storage usage calculation
    - Test clear data confirmation flow
    - Test export/import triggers

- [x] 16. Implement App.tsx and initialization
  - [x] 16.1 Create main App component
    - Initialize storage on app start using initializeStorage()
    - Load initial data (items and rooms) into stores
    - Set up navigation container
    - Add ErrorBoundary wrapper
    - Handle loading state during initialization
    - Show splash screen until ready
    - _Requirements: Main Application Workflow_
  
  - [x] 16.2 Configure app.json for Expo
    - Set app name, slug, version
    - Configure iOS and Android specific settings
    - Set permissions (camera, file system)
    - Configure splash screen and icon
    - _Requirements: Dependencies and Platform Configuration_

- [ ] 17. Add property-based tests for correctness properties
  - [ ]* 17.1 Write property test for room name uniqueness
    - **Property 5: Room Name Uniqueness**
    - **Validates: No two rooms have the same name**
    - Generate random rooms
    - Verify all room names are unique
    - Test case-insensitive uniqueness
  
  - [ ]* 17.2 Write property test for search result ordering
    - **Property 6: Search Result Ordering**
    - **Validates: Results sorted by score descending**
    - Generate random items and queries
    - Verify search results are properly ordered
    - Test stable sort for equal scores
  
  - [ ]* 17.3 Write property test for image persistence
    - **Property 3: Image Persistence**
    - **Validates: All item images exist on file system**
    - Generate random items
    - Verify all imageUri paths point to existing files
    - Test cleanup on item deletion

- [x] 18. Final integration and polish
  - [x] 18.1 Add loading states and skeletons
    - Create skeleton loaders for ItemCard and RoomCard
    - Show skeletons during initial load
    - Add smooth transitions when data loads
    - _Requirements: User Experience_
  
  - [x] 18.2 Add haptic feedback
    - Add haptic feedback on button presses
    - Add haptic feedback on item deletion
    - Use expo-haptics for cross-platform support
    - _Requirements: User Experience_
  
  - [x] 18.3 Implement empty states
    - Create EmptyState component with icon and message
    - Add empty state for no items
    - Add empty state for no rooms
    - Add empty state for no search results
    - _Requirements: User Experience_
  
  - [x] 18.4 Add pull-to-refresh
    - Implement pull-to-refresh on HomeScreen
    - Implement pull-to-refresh on RoomsScreen
    - Reload data from storage on refresh
    - _Requirements: User Experience_

- [ ] 19. Final checkpoint - Complete testing
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 20. Build and deployment preparation
  - [ ] 20.1 Configure EAS Build
    - Install eas-cli
    - Run eas build:configure
    - Set up build profiles for development, preview, production
    - Configure app signing
    - _Requirements: Build & Deployment_
  
  - [ ] 20.2 Test on physical devices
    - Test on iOS device (iPhone)
    - Test on Android device
    - Test on web browser
    - Verify all features work across platforms
    - Check performance with 1000+ items
    - _Requirements: Platform Compatibility_
  
  - [ ] 20.3 Create production builds
    - Run production build for iOS
    - Run production build for Android
    - Run production build for web
    - Verify bundle sizes are acceptable (<20MB)
    - _Requirements: Build & Deployment_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The implementation uses TypeScript throughout for type safety
- Storage layer abstracts platform differences (SQLite vs IndexedDB)
- All property tests validate correctness properties from the design document
- Performance optimizations target 10,000+ items with 60 FPS scrolling
- Offline-first architecture means no network dependencies
- Each checkpoint ensures incremental validation before proceeding
