import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    Text,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootNavigationProp } from '../types/navigation';
import { SearchBar } from '../components/SearchBar';
import { ItemCard } from '../components/ItemCard';
import { FloatingButton } from '../components/FloatingButton';
import { createItemStore } from '../stores/itemStore';
import { createRoomStore } from '../stores/roomStore';

/**
 * HomeScreen - Main screen displaying all items with search functionality
 * 
 * Features:
 * - Search bar at top for filtering items
 * - Virtualized list for performance with 10,000+ items
 * - Pull-to-refresh functionality
 * - Floating action button to add new items
 * - Empty state when no items exist
 * - Loading state during initial load
 */
export default function HomeScreen() {
    const navigation = useNavigation<RootNavigationProp>();
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    // Get stores (placeholder - will be properly wired in App.tsx)
    const itemStore = createItemStore();
    const roomStore = createRoomStore();

    // Load items on mount
    useEffect(() => {
        itemStore.loadItems();
        roomStore.loadRooms();
    }, []);

    // Handle end reached for pagination
    const handleEndReached = useCallback(() => {
        if (itemStore.hasMore && !itemStore.loading) {
            itemStore.loadMoreItems();
        }
    }, [itemStore]);

    // Filter items based on search query
    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) {
            return itemStore.items;
        }
        return itemStore.searchItems(searchQuery);
    }, [searchQuery, itemStore.items]);

    // Handle pull-to-refresh
    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                itemStore.loadItems(),
                roomStore.loadRooms(),
            ]);
        } finally {
            setRefreshing(false);
        }
    };

    // Handle item press - navigate to detail screen
    const handleItemPress = useCallback((item: any) => {
        navigation.navigate('ItemDetail', { itemId: item.id });
    }, [navigation]);

    // Handle add item button press
    const handleAddItem = useCallback(() => {
        navigation.navigate('AddItem');
    }, [navigation]);

    // Render empty state
    const renderEmptyState = () => {
        if (itemStore.loading) {
            return (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#4ECDC4" />
                    <Text style={styles.loadingText}>Loading items...</Text>
                </View>
            );
        }

        if (searchQuery.trim() && filteredItems.length === 0) {
            return (
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyIcon}>🔍</Text>
                    <Text style={styles.emptyTitle}>No items found</Text>
                    <Text style={styles.emptyMessage}>
                        Try a different search term
                    </Text>
                </View>
            );
        }

        if (itemStore.items.length === 0) {
            return (
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyIcon}>📦</Text>
                    <Text style={styles.emptyTitle}>No items yet</Text>
                    <Text style={styles.emptyMessage}>
                        Tap the + button to add your first item
                    </Text>
                </View>
            );
        }

        return null;
    };

    // Render item card
    const renderItem = useCallback(({ item }: { item: any }) => {
        const room = roomStore.getRoomById(item.roomId);
        if (!room) return null;

        return (
            <ItemCard
                item={item}
                room={room}
                onPress={handleItemPress}
            />
        );
    }, [roomStore, handleItemPress]);

    // Render footer loading indicator
    const renderFooter = useCallback(() => {
        if (!itemStore.loading || itemStore.items.length === 0) return null;

        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#4ECDC4" />
                <Text style={styles.footerText}>Loading more items...</Text>
            </View>
        );
    }, [itemStore.loading, itemStore.items.length]);

    return (
        <View style={styles.container}>
            {/* Search Bar */}
            <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search items..."
            />

            {/* Items List */}
            <FlatList
                data={filteredItems}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={
                    filteredItems.length === 0 ? styles.emptyList : styles.list
                }
                ListEmptyComponent={renderEmptyState}
                ListFooterComponent={renderFooter}
                onEndReached={handleEndReached}
                onEndReachedThreshold={0.5}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor="#4ECDC4"
                        colors={['#4ECDC4']}
                    />
                }
                // Performance optimizations for large lists
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={true}
                initialNumToRender={10}
            />

            {/* Floating Add Button */}
            <FloatingButton
                onPress={handleAddItem}
                icon="+"
                label="Add item"
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
    footerLoader: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    footerText: {
        marginTop: 8,
        fontSize: 14,
        color: '#666',
    },
});
