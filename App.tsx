/**
 * Main App Component
 * Initializes storage, repositories, stores, and navigation
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import 'react-native-get-random-values';

// Storage and repositories
import { initializeStorage, IStorage } from './src/storage';
import { createItemRepository } from './src/repositories/itemRepository';
import { createRoomRepository } from './src/repositories/roomRepository';

// Stores
import { createItemStore } from './src/stores/itemStore';
import { createRoomStore } from './src/stores/roomStore';

// Navigation
import Navigation from './src/navigation';

// Error boundary
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Database recovery
import { checkAndRecoverDatabase } from './src/utils/databaseRecovery';

// Global storage instance (will be initialized on app start)
let storageInstance: IStorage | null = null;

// Global store instances
let itemStoreInstance: ReturnType<typeof createItemStore> | null = null;
let roomStoreInstance: ReturnType<typeof createRoomStore> | null = null;

/**
 * Get storage instance (singleton)
 */
export function getStorage(): IStorage {
  if (!storageInstance) {
    throw new Error('Storage not initialized. Call initializeApp() first.');
  }
  return storageInstance;
}

/**
 * Get item store instance (singleton)
 */
export function useItemStore() {
  if (!itemStoreInstance) {
    throw new Error('Item store not initialized. Call initializeApp() first.');
  }
  return itemStoreInstance();
}

/**
 * Get room store instance (singleton)
 */
export function useRoomStore() {
  if (!roomStoreInstance) {
    throw new Error('Room store not initialized. Call initializeApp() first.');
  }
  return roomStoreInstance();
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  /**
   * Initialize app
   * 1. Initialize storage
   * 2. Check database health and recover if needed
   * 3. Create repositories
   * 4. Create stores
   * 5. Load initial data
   */
  async function initializeApp() {
    try {
      // Step 1: Initialize storage
      console.log('Initializing storage...');
      storageInstance = await initializeStorage();

      // Step 2: Check database health and recover if corrupted
      console.log('Checking database health...');
      const isHealthy = await checkAndRecoverDatabase(storageInstance);
      if (!isHealthy) {
        throw new Error('Database is corrupted and could not be recovered');
      }

      // Step 3: Create repositories
      console.log('Creating repositories...');
      const itemRepository = createItemRepository(storageInstance);
      const roomRepository = createRoomRepository(storageInstance);

      // Step 4: Create stores with circular dependencies
      console.log('Creating stores...');

      // Create room store first (items depend on rooms for search)
      roomStoreInstance = createRoomStore(
        roomRepository,
        () => itemStoreInstance?.getState().items || []
      );

      // Create item store (depends on rooms for search)
      itemStoreInstance = createItemStore(
        itemRepository,
        () => roomStoreInstance?.getState().rooms || []
      );

      // Step 5: Load initial data
      console.log('Loading initial data...');
      await roomStoreInstance.getState().loadRooms();
      await itemStoreInstance.getState().loadItems();

      console.log('App initialized successfully');
      setIsReady(true);
    } catch (err) {
      console.error('Failed to initialize app:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  // Show loading screen while initializing
  if (!isReady && !error) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Loading Find My Stuff...</Text>
      </View>
    );
  }

  // Show error screen if initialization failed
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Failed to Start</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Text style={styles.errorHint}>
          Try restarting the app. If the problem persists, you may need to clear app data.
        </Text>
      </View>
    );
  }

  // App is ready, show navigation
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
                <Navigation />
                <StatusBar style="auto" />
            </SafeAreaView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorHint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
