import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    Text,
    RefreshControl,
    ActivityIndicator,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    StatusBar,
    Image,
    Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootNavigationProp } from '../types/navigation';
import { SearchBar } from '../components/SearchBar';
import { ItemCard } from '../components/ItemCard';
import { useItemStore, useRoomStore } from '../stores';
import { ICON_MAP } from '../components/RoomCard';

// ─── Types ────────────────────────────────────────────────────────────────────
type FilterType = 'all' | 'recent' | 'favorites';

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Quick filter pill button */
const FilterPill: React.FC<{
    label: string;
    icon: string;
    active: boolean;
    onPress: () => void;
}> = ({ label, icon, active, onPress }) => {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;
 
    const handlePress = () => {
        Animated.sequence([
            Animated.spring(scaleAnim, { toValue: 0.92, useNativeDriver: true, tension: 200, friction: 10 }),
            Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, tension: 200, friction: 10 }),
        ]).start();
        onPress();
    };
 
    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={handlePress}
                activeOpacity={0.85}
            >
                <Text style={[styles.filterPillIcon, active && styles.filterPillIconActive]}>{icon}</Text>
                <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>{label}</Text>
                {active && <View style={styles.filterPillDot} />}
            </TouchableOpacity>
        </Animated.View>
    );
};

/** Room card for "Browse by Location" grid */
const RoomCard: React.FC<{
    room: any;
    itemCount: number;
    onPress: () => void;
}> = ({ room, itemCount, onPress }) => (
    <TouchableOpacity
        style={[
            styles.roomCard,
            { backgroundColor: `${room.color}22` } // Use a more stable hex with alpha, fallback if color is missing
        ]}
        onPress={onPress}
        activeOpacity={0.85}
    >
        <View
            style={[
                styles.roomCardIcon,
                { backgroundColor: room.color ? `${room.color}33` : '#e0e0ea' }
            ]}
        >
            <Text style={styles.roomCardEmoji}>
                {(ICON_MAP[room.icon] || '🏠')}
            </Text>
        </View>
        <Text style={styles.roomCardName} numberOfLines={1}>
            {room.name || 'Unnamed Room'}
        </Text>
        <Text style={styles.roomCardCount}>
            {typeof itemCount === 'number' ? `${itemCount} item${itemCount === 1 ? '' : 's'}` : '0 items'}
        </Text>
    </TouchableOpacity>
);

/** Bottom nav tab button */
const NavTab: React.FC<{
    icon: string;
    label: string;
    active: boolean;
    onPress: () => void;
}> = ({ icon, label, active, onPress }) => (
    <TouchableOpacity style={styles.navTab} onPress={onPress} activeOpacity={0.7}>
        <Text style={[styles.navTabIcon, active && styles.navTabIconActive]}>{icon}</Text>
        <Text style={[styles.navTabLabel, active && styles.navTabLabelActive]}>{label}</Text>
    </TouchableOpacity>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

/**
 * HomeScreen - Redesigned main screen matching the "Find My Stuff" UI
 *
 * Sections:
 * - Header with app title and profile icon
 * - Search bar
 * - Quick filters (All Items / Recent / Favorites)
 * - Recently Added horizontal scroll
 * - Browse by Location 2-column grid
 * - Bottom navigation bar
 */
export default function HomeScreen() {
    const navigation = useNavigation<RootNavigationProp>();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'home' | 'rooms' | 'scan' | 'settings'>('home');

    const itemStore = useItemStore();
    const roomStore = useRoomStore();

    // Load data on mount
    useEffect(() => {
        itemStore.loadItems();
        roomStore.loadRooms();
    }, []);

    // Handle end reached for pagination
    const handleEndReached = useCallback(() => {
        if (itemStore.hasMore && !itemStore.loading) {
            itemStore.loadMoreItems();
        }
    }, [itemStore.hasMore, itemStore.loading, itemStore.loadMoreItems]);

    // Filter items based on search query and active filter
    const filteredItems = useMemo(() => {
        let items = searchQuery.trim()
            ? itemStore.searchItems(searchQuery)
            : itemStore.items;

        if (activeFilter === 'recent') {
            const oneDayAgo = Date.now() - 86400000 * 7;
            items = items.filter(i => i.updatedAt >= oneDayAgo);
        } else if (activeFilter === 'favorites') {
            items = items.filter(i => (i as any).isFavorite);
        }

        return items;
    }, [searchQuery, activeFilter, itemStore.items]);

    // Recently added — top 10 sorted by updatedAt
    const recentItems = useMemo(() => {
        return [...itemStore.items]
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .slice(0, 10);
    }, [itemStore.items]);

    // Handle pull-to-refresh
    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await Promise.all([itemStore.loadItems(), roomStore.loadRooms()]);
        } finally {
            setRefreshing(false);
        }
    };

    const handleItemPress = useCallback((item: any) => {
        navigation.navigate('ItemDetail', { itemId: item.id });
    }, [navigation]);

    const handleAddItem = useCallback(() => {
        navigation.navigate('AddItem');
    }, [navigation]);

    const handleRoomPress = useCallback((roomId: string) => {
        navigation.navigate('RoomDetail', { roomId });
    }, [navigation]);

    const handleTabPress = useCallback((tab: typeof activeTab) => {
        setActiveTab(tab);
        if (tab === 'rooms') navigation.navigate('MainTabs');
        if (tab === 'settings') navigation.navigate('MainTabs');
    }, [navigation]);

    // ── Render helpers ──────────────────────────────────────────────────────

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
                    <Text style={styles.emptyMessage}>Try a different search term</Text>
                </View>
            );
        }
        if (itemStore.items.length === 0) {
            return (
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyIcon}>📦</Text>
                    <Text style={styles.emptyTitle}>No items yet</Text>
                    <Text style={styles.emptyMessage}>Tap the + button to add your first item</Text>
                </View>
            );
        }
        return null;
    };

    const renderItem = useCallback(({ item }: { item: any }) => {
        const room = roomStore.getRoomById(item.roomId);
        if (!room) return null;
        return <ItemCard item={item} room={room} onPress={handleItemPress} />;
    }, [roomStore, handleItemPress]);

    const renderFooter = useCallback(() => {
        if (!itemStore?.loading || itemStore?.items?.length === 0) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#4ECDC4" />
                <Text style={styles.footerText}>Loading more items...</Text>
            </View>
        );
    }, [itemStore?.loading, itemStore?.items?.length]);


    

    // ── List header — everything above the item list ────────────────────────
    const ListHeader = useMemo(() => (
        <View>
            {/* ── Quick Filters ── */}
            <View style={styles.sectionRow}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filtersScroll}
                    decelerationRate="fast"
                >
                    <FilterPill icon="📦" label="All Items"    active={activeFilter === 'all'}       onPress={() => setActiveFilter('all')} />
                    <FilterPill icon="⏱"  label="Recent"       active={activeFilter === 'recent'}    onPress={() => setActiveFilter('recent')} />
                    <FilterPill icon="★"  label="Favourites"   active={activeFilter === 'favorites'} onPress={() => setActiveFilter('favorites')} />
                </ScrollView>
                <View style={styles.filterSummary}>
                    <Text style={styles.filterSummaryText}>
                        {activeFilter === 'all'
                            ? `${filteredItems.length} item${filteredItems.length !== 1 ? 's' : ''} total`
                            : activeFilter === 'recent'
                            ? `${filteredItems.length} from last 7 days`
                            : `${filteredItems.length} favourite${filteredItems.length !== 1 ? 's' : ''}`
                        }
                    </Text>
                </View>
            </View>

            {/* ── Recently Added ── */}
            {recentItems.length > 0 && !searchQuery.trim() && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recently Added</Text>
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.recentScroll}
                    >
                        {recentItems.map(item => {
                            const room = roomStore.getRoomById(item.roomId);

                            console.log("room",room);
                            
                            if (!room) return null;                            
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.recentCard}
                                    onPress={() => handleItemPress(item)}
                                    activeOpacity={0.75}
                                >
                                    <View style={styles.recentImagePlaceholder}>
                                        <Text style={styles.recentImageEmoji}>{ '📷'}</Text>
                                    </View>
                                    <View style={styles.recentCardContent}>
                                        <Text style={styles.recentItemName} numberOfLines={1}>
                                            {item.name}
                                        </Text>
                                        <Text style={styles.recentItemRoom} numberOfLines={1}>
                                            📍 {room.name}
                                            {item.specificLocation ? ` · ${item.specificLocation}` : ''}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* ── Browse by Location ── */}
            {roomStore.rooms.length > 0 && !searchQuery.trim() && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Browse by Location</Text>
                    </View>
                    <View style={styles.roomGrid}>
                        {roomStore.rooms.map(room => (
                            <RoomCard
                                key={room.id}
                                room={room}
                                itemCount={roomStore.getItemCount(room.id)}
                                onPress={() => handleRoomPress(room.id)}
                            />
                        ))}

                    </View>

                    {/* Add Room card */}
                    <TouchableOpacity
                            style={[styles.addRoomCard,{width:'90%' ,alignSelf:'center', marginTop:10 }]}
                            onPress={() => navigation.navigate('AddRoom')}
                            activeOpacity={0.75}
                        >
                            <View style={styles.addRoomIcon}>
                                <Text style={styles.addRoomPlus}>+</Text>
                            </View>
                            <Text style={styles.addRoomLabel}>Add Room</Text>
                        </TouchableOpacity>
                </View>
            )}

            {/* ── All Items heading (only shown when not in search mode) ── */}
            {!searchQuery.trim() && filteredItems.length > 0 && (
                <View style={[styles.sectionHeader, { paddingHorizontal: 16, marginTop: 8 }]}>
                    <Text style={styles.sectionTitle}>All Items</Text>
                    <Text style={styles.itemCount}>{filteredItems.length}</Text>
                </View>
            )}
        </View>
    ), [activeFilter, recentItems, searchQuery, roomStore.rooms, filteredItems.length]);

    console.log("filteredItems",filteredItems);
    

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            <View style={styles.container}>
                {/* ── Header ── */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.appIconWrapper}>
                            <Text style={styles.appIcon}>📋</Text>
                        </View>
                        <Text style={styles.appTitle}>Find My Stuff</Text>
                    </View>
                    <TouchableOpacity style={styles.profileButton}
                    onPress={() => navigation.navigate('EditProfile' as any)}>
                        <Text style={styles.profileIcon}>👤</Text>
                    </TouchableOpacity>
                </View>

                <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search items, rooms, or boxes..."
                />

                {/* ── Main scrollable content ── */}
                <FlatList
                    data={filteredItems}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    ListHeaderComponent={ListHeader}
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
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={true}
                    initialNumToRender={10}
                    showsVerticalScrollIndicator={false}
                />

                {/* ── Bottom Navigation Bar ── */}
                <TouchableOpacity
                        style={styles.fabInNav}
                        onPress={handleAddItem}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.fabInNavIcon}>+</Text>
                    </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const TEAL = '#4ECDC4';
const BLUE = '#007AFF';
const NAV_HEIGHT = 64;

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    container: {
        flex: 1,
        backgroundColor: '#f5f6fa',
    },

    // ── Header ──
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#e8e8e8',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    appIconWrapper: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: BLUE + '18',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    appIcon: {
        fontSize: 18,
    },
    appTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a2e',
        letterSpacing: -0.3,
    },
    profileButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f0f0f5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileIcon: {
        fontSize: 18,
    },

    // ── Filters ──
    sectionRow: {
        backgroundColor: '#fff',
        paddingVertical: 4,
    },
    filtersScroll: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 8,
        flexDirection: 'row',
    },
    filterPill: {
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 20,
        display:"flex",
        flexDirection:"row",
        gap: 6,
        justifyContent:"flex-start",
        alignItems:"flex-start",
        backgroundColor: '#f0f0f5',
        marginRight: 8,
    },
    filterSummary: {
        paddingHorizontal: 16,
        paddingBottom: 6,
    },
    filterSummaryText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#B0B7C3',
        letterSpacing: 0.3,
    },
    filterPillActive: {
        backgroundColor: BLUE,
    },
    filterPillText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#666',
    },
    filterPillTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    filterPillIcon: {
        fontSize: 13,
        opacity: 0.55,
    },
    filterPillIconActive: {
        opacity: 1,
    },
    filterPillDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.55)',
        marginLeft: 2,
    },

    // ── Sections ──
    section: {
        marginTop: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a2e',
        letterSpacing: -0.2,
    },
    viewAll: {
        fontSize: 13,
        color: BLUE,
        fontWeight: '500',
    },
    itemCount: {
        fontSize: 13,
        color: '#999',
        fontWeight: '500',
    },

    // ── Recently Added ──
    recentScroll: {
        paddingHorizontal: 16,
        gap: 12,
        flexDirection: 'row',
    },
    recentCard: {
        width: 160,
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
        elevation: 2,
    },
    recentImagePlaceholder: {
        width: '100%',
        height: 90,
        backgroundColor: '#f0f0f5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    recentImageEmoji: {
        fontSize: 32,
        opacity: 0.4,
    },
    recentCardContent: {
        padding: 10,
    },
    recentItemName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1a1a2e',
        marginBottom: 3,
    },
    recentItemRoom: {
        fontSize: 11,
        color: '#888',
    },

    // ── Room Grid ──
    roomGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
        justifyContent: 'space-between',
        rowGap: 14,
        columnGap: 0,
    },
    roomCard: {
        width: '46%',
        marginHorizontal: '2%',
        marginBottom: 4,
        borderRadius: 14,
        padding: 14,
        minHeight: 90,
        justifyContent: 'space-between',
    },
    roomCardIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        display:"flex",
        // flexDirection:"row",
        justifyContent:"center",
        alignItems:"center",
        marginBottom: 8,
    },
    roomCardEmoji: {
        fontSize: 20,
    },
    roomCardName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 2,
    },
    roomCardCount: {
        fontSize: 12,
        color: '#888',
        fontWeight: '400',
    },
    addRoomCard: {
        width: '46%',
        marginHorizontal: '2%',
        marginBottom: 4,
        borderRadius: 14,
        padding: 14,
        minHeight: 90,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f5',
        borderWidth: 1.5,
        borderColor: '#ddd',
        borderStyle: 'dashed', 
    },
    addRoomIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#e0e0ea',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    addRoomPlus: {
        fontSize: 22,
        color: '#888',
        lineHeight: 26,
    },
    addRoomLabel: {
        fontSize: 13,
        color: '#888',
        fontWeight: '500',
    },

    // ── List ──
    list: {
        paddingBottom: NAV_HEIGHT + 16,
    },
    emptyList: {
        flexGrow: 1,
        paddingBottom: NAV_HEIGHT,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        marginTop: 60,
    },
    emptyIcon: {
        fontSize: 56,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    emptyMessage: {
        fontSize: 15,
        color: '#888',
        textAlign: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 15,
        color: '#888',
    },
    footerLoader: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    footerText: {
        marginTop: 8,
        fontSize: 13,
        color: '#888',
    },

    // ── Bottom Navigation ──
    bottomNav: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        height: NAV_HEIGHT,
        backgroundColor: '#fff',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#e8e8e8',
        paddingBottom: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 8,
    },
    navTab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 6,
    },
    navTabIcon: {
        fontSize: 20,
        opacity: 0.45,
        marginBottom: 2,
    },
    navTabIconActive: {
        opacity: 1,
    },
    navTabLabel: {
        fontSize: 9,
        fontWeight: '600',
        color: '#aaa',
        letterSpacing: 0.5,
    },
    navTabLabelActive: {
        color: BLUE,
    },
    scanButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 6,
        flex: 1,
    },
    scanIcon: {
        fontSize: 22,
        color: '#aaa',
        marginBottom: 2,
    },
    scanLabel: {
        fontSize: 9,
        fontWeight: '600',
        color: '#aaa',
        letterSpacing: 0.5,
    },
    fabInNav: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: BLUE,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        shadowColor: BLUE,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 6,
    },
    fabInNavIcon: {
        fontSize: 26,
        color: '#fff',
        lineHeight: 30,
        fontWeight: '300',
    },
});