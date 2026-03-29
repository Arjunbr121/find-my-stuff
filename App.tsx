/**
 * Main App Component
 * Initializes storage, repositories, stores, and navigation
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import 'react-native-get-random-values';
import SecureStore from './src/utils/secureStorage';

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

// Default room seeding
import { seedDefaultRooms } from './src/utils/seedRooms';

// Lock screen
import LockScreen from './src/screens/LockScreen';

// ─── SecureStore keys ─────────────────────────────────────────────────────────
const KEY_LOCK     = 'app_lock_enabled';
const KEY_PASSWORD = 'app_password';

// ─── Global singletons ────────────────────────────────────────────────────────
let storageInstance:   IStorage | null = null;
let itemStoreInstance: ReturnType<typeof createItemStore> | null = null;
let roomStoreInstance: ReturnType<typeof createRoomStore> | null = null;

export function getStorage(): IStorage {
  if (!storageInstance) throw new Error('Storage not initialized.');
  return storageInstance;
}

export function useItemStore() {
  if (!itemStoreInstance) throw new Error('Item store not initialized.');
  return itemStoreInstance();
}

export function useRoomStore() {
  if (!roomStoreInstance) throw new Error('Room store not initialized.');
  return roomStoreInstance();
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [locked,  setLocked]  = useState(false); // ← lock gate

  useEffect(() => {
    initializeApp();
  }, []);

  async function initializeApp() {
    try {
      // Step 1: Initialize storage
      console.log('Initializing storage...');
      storageInstance = await initializeStorage();

      // Step 2: Check database health
      console.log('Checking database health...');
      const isHealthy = await checkAndRecoverDatabase(storageInstance);
      if (!isHealthy) {
        throw new Error('Database is corrupted and could not be recovered');
      }

      // Step 3: Create repositories
      console.log('Creating repositories...');
      const itemRepository = createItemRepository(storageInstance);
      const roomRepository = createRoomRepository(storageInstance);

      // Step 4: Create stores
      console.log('Creating stores...');
      roomStoreInstance = createRoomStore(
        roomRepository,
        () => itemStoreInstance?.getState().items || []
      );
      itemStoreInstance = createItemStore(
        itemRepository,
        () => roomStoreInstance?.getState().rooms || []
      );

      // Step 5: Seed default rooms (first launch only)
      console.log('Seeding default rooms...');
      await seedDefaultRooms(roomRepository);
      // Step 6: Load initial data
      console.log('Loading initial data...');
      await roomStoreInstance.getState().loadRooms();
      await itemStoreInstance.getState().loadItems();

      // Step 6: Check if app lock is enabled
      console.log('Checking lock state...');
      const lockEnabled = await SecureStore.getItemAsync(KEY_LOCK);
      const hasPassword = await SecureStore.getItemAsync(KEY_PASSWORD);
      if (lockEnabled === 'true' && hasPassword) {
        setLocked(true); // show lock screen before app
      }

      console.log('App initialized successfully');
      setIsReady(true);
    } catch (err) {
      console.error('Failed to initialize app:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (!isReady && !error) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingIconWrap}>
          <Text style={styles.loadingIcon}>🗂️</Text>
        </View>
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 24 }} />
        <Text style={styles.loadingTitle}>Find My Stuff</Text>
        <Text style={styles.loadingText}>Setting things up…</Text>
      </View>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorTitle}>Failed to Start</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Text style={styles.errorHint}>
          Try restarting the app. If the problem persists, you may need to clear app data.
        </Text>
      </View>
    );
  }

  // ── Lock screen ──────────────────────────────────────────────────────────
  // Shown BEFORE the main app if lock is enabled
  if (locked) {
    return (
      <SafeAreaProvider>
          <LockScreen onUnlock={() => setLocked(false)} />
      </SafeAreaProvider>
    );
  }

  // ── Main app ─────────────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        {Platform.OS === 'web' ? (
          <View style={{ flex: 1, display: 'flex' as any, flexDirection: 'column', height: '100vh' as any, overflow: 'hidden' as any }}>
            <Navigation />
            <StatusBar style="auto" />
          </View>
        ) : (
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
            <Navigation />
            <StatusBar style="auto" />
          </SafeAreaView>
        )}
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Loading
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F5F6FA',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingIconWrap: {
    width: 80, height: 80, borderRadius: 22,
    backgroundColor: '#007AFF15',
    justifyContent: 'center', alignItems: 'center',
  },
  loadingIcon:  { fontSize: 40 },
  loadingTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.4, marginTop: 8 },
  loadingText:  { fontSize: 14, color: '#6B7280' },

  // Error
  errorContainer: {
    flex: 1,
    backgroundColor: '#F5F6FA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  errorEmoji:   { fontSize: 48, marginBottom: 8 },
  errorTitle:   { fontSize: 22, fontWeight: '800', color: '#FF3B30', letterSpacing: -0.3 },
  errorMessage: { fontSize: 15, color: '#333', textAlign: 'center' },
  errorHint:    { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
});