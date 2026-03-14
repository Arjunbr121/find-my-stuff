# Find My Stuff

A cross-platform mobile application built with React Native and Expo that helps users track the physical location of their belongings.

## Features

- 📸 Photograph items with camera or photo library
- 🏠 Organize items by rooms
- 🔍 Fast fuzzy search across items, locations, and rooms
- 💾 Offline-first with local storage (SQLite for mobile, IndexedDB for web)
- 📱 Cross-platform: iOS, Android, and Web
- ⚡ Optimized for 10,000+ items

## Tech Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript (strict mode)
- **State Management**: Zustand
- **Navigation**: React Navigation
- **Storage**: expo-sqlite (mobile), idb (web)
- **Camera**: expo-camera, expo-image-picker
- **File System**: expo-file-system

## Project Structure

```
src/
├── components/     # Reusable UI components
├── screens/        # Main application screens
├── stores/         # Zustand state management
├── repositories/   # Business logic layer
├── storage/        # Platform-specific storage
├── types/          # TypeScript definitions
└── utils/          # Utility functions
```

## Getting Started

### Prerequisites

- Node.js 18+ (Note: Node 20+ recommended for optimal compatibility)
- npm or yarn
- Expo CLI

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on specific platform
npm run ios
npm run android
npm run web
```

## Development Status

This project is currently in development. See `.kiro/specs/find-my-stuff/tasks.md` for the implementation plan.

## Architecture

The application follows a layered architecture:

1. **UI Layer**: React Native components and screens
2. **State Management**: Zustand stores for global state
3. **Repository Layer**: Business logic and data validation
4. **Storage Layer**: Platform-specific persistence (SQLite/IndexedDB)

## License

Private project
