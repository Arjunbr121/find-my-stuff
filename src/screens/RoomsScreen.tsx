import React, { useEffect, useMemo, useCallback } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    Text,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootNavigationProp } from '../types/navigation';
import { RoomCard } from '../components/RoomCard';
import { FloatingButton } from '../components/FloatingButton';
import { createRoomStore } from '../stores/roomStore';
import { createItemStore } from '../stores/itemStore';

/**
 * RoomsScreen - Displays all rooms in a grid layout
 * 
 * Features:
 * - Grid of room cards
 * - Item count for each room
 * - Floating action button to add new rooms
 * - Empty state when no rooms exist
 * - Loading state during initial load
 * - Navigation to room detail on card press
 */
export default function RoomsScreen() {
    const navigation = useNavigation<RootNavigationProp>();

    // Get stores (placeholder - will be properly wired in App.tsx)
    const roomStore = createRoomStore();
    const itemStore = createItemStore();

    // Load data on mount
    useEffect(() => {
        roomStore.loadRooms();
        itemStore.loadItems();
    }, []);

    // Handle room press - navigate to detail screen
    const handleRoomPress = useCallback((room: any) => {
        navigation.navigate('RoomDetail', { roomId: room.id });
    }, [navigation]);

    // Handle add room button press
    const handleAddRoom = useCallback(() => {
        navigation.navigate('AddRoom');
    }, [navigation]);

    // Memoize item counts by room for performance
    const itemCountsByRoom = useMemo(() => {
        const counts: Record<string, number> = {};
        itemStore.items.forEach((item) => {
            counts[item.roomId] = (counts[item.roomId] || 0) + 1;
        });
        return counts;
    }, [itemStore.items]);

    // Get item count for a room
    const getItemCount = useCallback((roomId: string): number => {
        return itemCountsByRoom[roomId] || 0;
    }, [itemCountsByRoom]);

    // Render empty state
    const renderEmptyState = () => {
        if (roomStore.loading) {
            return (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#4ECDC4" />
                    <Text style={styles.loadingText}>Loading rooms...</Text>
                </View>
            );
        }

        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyIcon}>🏠</Text>
                <Text style={styles.emptyTitle}>No rooms yet</Text>
                <Text style={styles.emptyMessage}>
                    Tap the + button to create your first room
                </Text>
            </View>
        );
    };

    // Render room card
    const renderItem = useCallback(({ item }: { item: any }) => {
        return (
            <RoomCard
                room={item}
                itemCount={getItemCount(item.id)}
                onPress={handleRoomPress}
            />
        );
    }, [getItemCount, handleRoomPress]);

    return (
        <View style={styles.container}>
            {/* Rooms List */}
            <FlatList
                data={roomStore.rooms}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={
                    roomStore.rooms.length === 0 ? styles.emptyList : styles.list
                }
                ListEmptyComponent={renderEmptyState}
            />

            {/* Floating Add Button */}
            <FloatingButton
                onPress={handleAddRoom}
                icon="+"
                label="Add room"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    list: {
        paddingVertical: 8,
    },
    emptyList: {
        flexGrow: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    emptyMessage: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666',
    },
});
