import React, { useEffect, useMemo, useCallback, useState } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    Text,
    ActivityIndicator,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    TextInput,
    Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootNavigationProp } from '../types/navigation';
import { useItemStore, useRoomStore } from '../stores';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const BLUE      = '#007AFF';
const BG        = '#F5F6FA';
const CARD      = '#FFFFFF';
const BORDER    = '#E8E8EE';
const TEXT_PRI  = '#1A1A2E';
const TEXT_SEC  = '#6B7280';
const TEXT_HINT = '#B0B7C3';
const NAV_H     = 64;

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 16 * 2 - 12) / 2; // 2 cols, 16px side padding, 12px gap

// ─── Icon map ─────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, string> = {
    kitchen:       '🍳',
    bedroom:       '🛏️',
    'living-room': '🛋️',
    bathroom:      '🚿',
    garage:        '🚗',
    office:        '💼',
    hallway:       '🚪',
    closet:        '👔',
    basement:      '⬇️',
    attic:         '⬆️',
    storage:       '📦',
    outdoor:       '🌳',
};

// ─── Inline RoomCard (2-col grid style) ───────────────────────────────────────
const RoomGridCard: React.FC<{
    room: any;
    itemCount: number;
    onPress: (room: any) => void;
}> = React.memo(({ room, itemCount, onPress }) => {
    const emoji = ICON_MAP[room.icon] ?? '📍';

    return (
        <TouchableOpacity
            style={[styles.roomCard, { width: CARD_W }]}
            onPress={() => onPress(room)}
            activeOpacity={0.75}
        >
            {/* Tinted icon area */}
            <View style={[styles.roomCardIconArea, { backgroundColor: room.color + '22' }]}>
                <View style={[styles.roomCardIconCircle, { backgroundColor: room.color + '33' }]}>
                    <Text style={styles.roomCardEmoji}>{emoji}</Text>
                </View>
            </View>

            {/* Label area */}
            <View style={styles.roomCardLabel}>
                <Text style={styles.roomCardName} numberOfLines={1}>{room.name}</Text>
                <Text style={styles.roomCardCount}>
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </Text>
            </View>
        </TouchableOpacity>
    );
});

// ─── Nav tab ──────────────────────────────────────────────────────────────────
const NavTab: React.FC<{
    icon: string; label: string; active: boolean; onPress: () => void;
}> = ({ icon, label, active, onPress }) => (
    <TouchableOpacity style={styles.navTab} onPress={onPress} activeOpacity={0.7}>
        <Text style={[styles.navTabIcon, active && styles.navTabIconActive]}>{icon}</Text>
        <Text style={[styles.navTabLabel, active && { color: BLUE }]}>{label}</Text>
    </TouchableOpacity>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function RoomsScreen() {
    const navigation = useNavigation<RootNavigationProp>();
    const [search, setSearch] = useState('');

    const roomStore = useRoomStore();
    const itemStore = useItemStore();

    useEffect(() => {
        roomStore.loadRooms();
        itemStore.loadItems();
    }, []);

    const handleRoomPress = useCallback((room: any) => {
        navigation.navigate('RoomDetail', { roomId: room.id });
    }, [navigation]);

    const handleAddRoom = useCallback(() => {
        navigation.navigate('AddRoom');
    }, [navigation]);

    // Item counts per room
    const itemCountsByRoom = useMemo(() => {
        const counts: Record<string, number> = {};
        itemStore.items.forEach(item => {
            counts[item.roomId] = (counts[item.roomId] || 0) + 1;
        });
        return counts;
    }, [itemStore.items]);

    // Filtered rooms
    const filteredRooms = useMemo(() => {
        if (!search.trim()) return roomStore.rooms;
        const q = search.toLowerCase();
        return roomStore.rooms.filter(r =>
            r.name.toLowerCase().includes(q) ||
            r.description?.toLowerCase().includes(q)
        );
    }, [search, roomStore.rooms]);

    // Pair rooms into rows for 2-col layout
    const roomPairs = useMemo(() => {
        const pairs: (any | null)[][] = [];
        for (let i = 0; i < filteredRooms.length; i += 2) {
            pairs.push([filteredRooms[i], filteredRooms[i + 1] ?? null]);
        }
        return pairs;
    }, [filteredRooms]);

    // ── Render ──────────────────────────────────────────────────────────────
    const renderRow = useCallback(({ item }: { item: (any | null)[] }) => (
        <View style={styles.gridRow}>
            <RoomGridCard
                room={item[0]}
                itemCount={itemCountsByRoom[item[0].id] ?? 0}
                onPress={handleRoomPress}
            />
            {item[1] ? (
                <RoomGridCard
                    room={item[1]}
                    itemCount={itemCountsByRoom[item[1].id] ?? 0}
                    onPress={handleRoomPress}
                />
            ) : (
                /* Ghost card to keep grid alignment */
                <View style={{ width: CARD_W }} />
            )}
        </View>
    ), [itemCountsByRoom, handleRoomPress]);

    const renderEmpty = () => {
        if (roomStore.loading) {
            return (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={BLUE} />
                    <Text style={styles.loadingText}>Loading rooms...</Text>
                </View>
            );
        }
        if (search.trim()) {
            return (
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyIcon}>🔍</Text>
                    <Text style={styles.emptyTitle}>No rooms found</Text>
                    <Text style={styles.emptyMsg}>Try a different search term</Text>
                </View>
            );
        }
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyIcon}>🏠</Text>
                <Text style={styles.emptyTitle}>No rooms yet</Text>
                <Text style={styles.emptyMsg}>
                    Tap <Text style={{ color: BLUE, fontWeight: '600' }}>+ Add Room</Text> to create your first room
                </Text>
            </View>
        );
    };

    const ListHeader = (
        <View>
            {/* Search bar */}
            <View style={styles.searchBar}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search items or rooms"
                    placeholderTextColor={TEXT_HINT}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Text style={styles.searchClear}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Section heading */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>All Locations</Text>
                <TouchableOpacity style={styles.addRoomBtn} onPress={handleAddRoom} activeOpacity={0.75}>
                    <Text style={styles.addRoomBtnText}>＋ Add Room</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Browse by Room</Text>
                <View style={{ width: 34 }} />
            </View>

            {/* ── Grid list ── */}
            <FlatList
                data={roomPairs}
                renderItem={renderRow}
                keyExtractor={(_, i) => String(i)}
                ListHeaderComponent={ListHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={
                    roomPairs.length === 0 ? styles.emptyList : styles.list
                }
                style={styles.flatList}
                showsVerticalScrollIndicator={false}
            />

        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 13,
        backgroundColor: '#fff',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: BORDER,
    },
    backBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: BG,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backArrow: { fontSize: 20, color: TEXT_PRI, fontWeight: '600' },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: TEXT_PRI,
        letterSpacing: -0.3,
    },
    moreBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: BG,
        justifyContent: 'center',
        alignItems: 'center',
    },
    moreIcon: { fontSize: 20, color: TEXT_SEC, fontWeight: '700' },

    // Flat list
    flatList: { flex: 1, backgroundColor: BG },
    list: { paddingBottom: NAV_H + 16 },
    emptyList: { flexGrow: 1, paddingBottom: NAV_H },

    // Search bar
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CARD,
        borderRadius: 12,
        marginHorizontal: 16,
        marginTop: 14,
        marginBottom: 4,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1.5,
        borderColor: BORDER,
        gap: 8,
    },
    searchIcon: { fontSize: 16, opacity: 0.5 },
    searchInput: { flex: 1, fontSize: 15, color: TEXT_PRI },
    searchClear: { fontSize: 14, color: TEXT_HINT, fontWeight: '600' },

    // Section header
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 12,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: TEXT_PRI,
        letterSpacing: -0.4,
    },
    addRoomBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: BLUE + '12',
    },
    addRoomBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: BLUE,
    },

    // Grid
    gridRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 12,
        marginBottom: 12,
    },

    // Room card
    roomCard: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: CARD,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    roomCardIconArea: {
        height: 110,
        justifyContent: 'center',
        alignItems: 'center',
    },
    roomCardIconCircle: {
        width: 60,
        height: 60,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    roomCardEmoji: { fontSize: 30 },
    roomCardLabel: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: CARD,
    },
    roomCardName: {
        fontSize: 14,
        fontWeight: '700',
        color: TEXT_PRI,
        marginBottom: 2,
    },
    roomCardCount: {
        fontSize: 12,
        color: TEXT_SEC,
    },

    // Empty / loading
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingTop: 60,
    },
    emptyIcon: { fontSize: 56, marginBottom: 16 },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: TEXT_PRI, marginBottom: 8 },
    emptyMsg: { fontSize: 14, color: TEXT_SEC, textAlign: 'center', lineHeight: 20 },
    loadingText: { marginTop: 12, fontSize: 15, color: TEXT_SEC },

    // Bottom nav
    bottomNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        height: NAV_H,
        backgroundColor: '#fff',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: BORDER,
        paddingBottom: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 8,
    },
    navTab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 6 },
    navTabIcon: { fontSize: 20, opacity: 0.4, marginBottom: 2 },
    navTabIconActive: { opacity: 1 },
    navTabLabel: { fontSize: 9, fontWeight: '600', color: '#aaa', letterSpacing: 0.5 },
});