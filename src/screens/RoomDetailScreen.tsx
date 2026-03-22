import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Alert,
    ActivityIndicator, FlatList, Platform, SafeAreaView,
    StatusBar, Modal, TextInput, KeyboardAvoidingView,
    Animated, ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import type {
    RoomDetailScreenNavigationProp,
    RoomDetailScreenRouteProp,
    RootNavigationProp,
} from '../types/navigation';
import { ItemCard } from '../components/ItemCard';
import { useItemStore, useRoomStore } from '../stores';
import { ROOM_ICONS, ROOM_COLORS } from '../types/models';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const BLUE     = '#007AFF';
const BG       = '#F5F6FA';
const CARD     = '#FFFFFF';
const BORDER   = '#E8E8EE';
const ERROR    = '#FF3B30';
const TEXT_PRI = '#1A1A2E';
const TEXT_SEC = '#6B7280';
const TEXT_HNT = '#B0B7C3';

// ─── Icon / colour fallbacks ──────────────────────────────────────────────────
const ICON_MAP: Record<string, string> = {
    kitchen: '🍳', bedroom: '🛏️', 'living-room': '🛋️',
    bathroom: '🚿', garage: '🚗', office: '💼',
    hallway: '🚪', closet: '👔', basement: '⬇️',
    attic: '⬆️', storage: '📦', outdoor: '🌳',
};

const FALLBACK_ICONS   = Object.keys(ICON_MAP);
const FALLBACK_COLORS  = [
    '#007AFF','#34C759','#FF9500','#FF3B30',
    '#5856D6','#636366','#4ECDC4','#FF6B9D',
];

// ─── Stat chip ────────────────────────────────────────────────────────────────
const StatChip: React.FC<{ icon: string; value: string; label: string; color: string }> = ({
    icon, value, label, color,
}) => (
    <View style={[chipS.chip, { backgroundColor: color + '12' }]}>
        <Text style={chipS.icon}>{icon}</Text>
        <Text style={[chipS.value, { color }]}>{value}</Text>
        <Text style={chipS.label}>{label}</Text>
    </View>
);
const chipS = StyleSheet.create({
    chip:  { flex: 1, alignItems: 'center', borderRadius: 14, paddingVertical: 12, gap: 2 },
    icon:  { fontSize: 20, marginBottom: 2 },
    value: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
    label: { fontSize: 11, fontWeight: '600', color: TEXT_SEC },
});

// ─── Edit Bottom Sheet ────────────────────────────────────────────────────────
interface EditSheetProps {
    visible: boolean;
    room: any;
    onSave: (updates: Partial<any>) => Promise<void>;
    onClose: () => void;
}

const EditRoomSheet: React.FC<EditSheetProps> = ({ visible, room, onSave, onClose }) => {
    const slideAnim = useRef(new Animated.Value(700)).current;

    const icons  = (ROOM_ICONS?.length  ? ROOM_ICONS  : FALLBACK_ICONS)  as string[];
    const colors = (ROOM_COLORS?.length ? ROOM_COLORS : FALLBACK_COLORS) as string[];

    const [name,        setName]        = useState('');
    const [icon,        setIcon]        = useState('');
    const [color,       setColor]       = useState('');
    const [description, setDescription] = useState('');
    const [saving,      setSaving]      = useState(false);

    useEffect(() => {
        if (visible && room) {
            setName(room.name ?? '');
            setIcon(room.icon ?? icons[0]);
            setColor(room.color ?? colors[0]);
            setDescription(room.description ?? '');
        }
    }, [visible, room]);

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: visible ? 0 : 700,
            useNativeDriver: true, tension: 80, friction: 14,
        }).start();
    }, [visible]);

    const handleSave = async () => {
        if (!name.trim()) { Alert.alert('Validation', 'Room name is required.'); return; }
        setSaving(true);
        try {
            await onSave({ name: name.trim(), icon, color, description: description.trim() || undefined });
            onClose();
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to save changes.');
        } finally { setSaving(false); }
    };

    if (!visible && (slideAnim as any)._value >= 690) return null;

    const selectedEmoji = ICON_MAP[icon] ?? '📍';

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <TouchableOpacity style={sheetS.backdrop} activeOpacity={1} onPress={onClose} />

            <Animated.View style={[sheetS.sheet, { transform: [{ translateY: slideAnim }] }]}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    {/* Handle */}
                    <View style={sheetS.handle} />

                    {/* Header */}
                    <View style={sheetS.header}>
                        <TouchableOpacity onPress={onClose} style={sheetS.headerBtn}>
                            <Text style={sheetS.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={sheetS.title}>Edit Room</Text>
                        <TouchableOpacity onPress={handleSave} disabled={saving} style={sheetS.headerBtn}>
                            {saving
                                ? <ActivityIndicator size="small" color={BLUE} />
                                : <Text style={sheetS.saveText}>Save</Text>
                            }
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={sheetS.scroll}
                        contentContainerStyle={sheetS.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Live preview */}
                        <View style={[sheetS.preview, { backgroundColor: color + '20' }]}>
                            <View style={[sheetS.previewIconWrap, { backgroundColor: color + '35' }]}>
                                <Text style={sheetS.previewEmoji}>{selectedEmoji}</Text>
                            </View>
                            <Text style={[sheetS.previewName, { color }]}>
                                {name.trim() || 'Room Name'}
                            </Text>
                        </View>

                        {/* Room name */}
                        <View style={sheetS.field}>
                            <Text style={sheetS.fieldLabel}>ROOM NAME</Text>
                            <TextInput
                                style={sheetS.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="e.g., Master Bedroom"
                                placeholderTextColor={TEXT_HNT}
                                maxLength={50}
                            />
                        </View>

                        {/* Description */}
                        <View style={sheetS.field}>
                            <View style={sheetS.labelRow}>
                                <Text style={sheetS.fieldLabel}>DESCRIPTION</Text>
                                <View style={sheetS.optBadge}>
                                    <Text style={sheetS.optText}>OPTIONAL</Text>
                                </View>
                            </View>
                            <TextInput
                                style={[sheetS.input, sheetS.textArea]}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Briefly describe what's stored here"
                                placeholderTextColor={TEXT_HNT}
                                multiline
                                numberOfLines={2}
                                maxLength={200}
                                textAlignVertical="top"
                            />
                        </View>

                        {/* Icon picker */}
                        <View style={sheetS.field}>
                            <Text style={sheetS.fieldLabel}>ICON</Text>
                            <View style={sheetS.iconGrid}>
                                {icons.map(iconKey => {
                                    const isSelected = icon === iconKey;
                                    return (
                                        <TouchableOpacity
                                            key={iconKey}
                                            style={[
                                                sheetS.iconOption,
                                                isSelected && { backgroundColor: color, borderColor: color },
                                            ]}
                                            onPress={() => setIcon(iconKey)}
                                            activeOpacity={0.75}
                                        >
                                            <Text style={sheetS.iconEmoji}>{ICON_MAP[iconKey] ?? '📍'}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Color picker */}
                        <View style={sheetS.field}>
                            <Text style={sheetS.fieldLabel}>COLOR</Text>
                            <View style={sheetS.colorRow}>
                                {colors.map(c => {
                                    const isSelected = color === c;
                                    return (
                                        <TouchableOpacity
                                            key={c}
                                            style={[
                                                sheetS.colorSwatch,
                                                { backgroundColor: c },
                                                isSelected && sheetS.colorSwatchSelected,
                                            ]}
                                            onPress={() => setColor(c)}
                                            activeOpacity={0.8}
                                        >
                                            {isSelected && <Text style={sheetS.colorCheck}>✓</Text>}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </KeyboardAvoidingView>
            </Animated.View>
        </Modal>
    );
};

const sheetS = StyleSheet.create({
    backdrop:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet:      { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 16 },
    handle:     { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
    header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
    headerBtn:  { paddingHorizontal: 4, paddingVertical: 4, minWidth: 60 },
    title:      { fontSize: 16, fontWeight: '700', color: TEXT_PRI },
    cancelText: { fontSize: 15, color: TEXT_SEC, fontWeight: '500' },
    saveText:   { fontSize: 15, color: BLUE, fontWeight: '700', textAlign: 'right' },

    scroll:        { },
    scrollContent: { padding: 16, gap: 16 },

    // Preview
    preview:         { alignItems: 'center', borderRadius: 16, paddingVertical: 20, gap: 8 },
    previewIconWrap: { width: 64, height: 64, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    previewEmoji:    { fontSize: 32 },
    previewName:     { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },

    // Fields
    field:       { gap: 8 },
    fieldLabel:  { fontSize: 11, fontWeight: '700', color: TEXT_SEC, letterSpacing: 0.8, textTransform: 'uppercase' },
    labelRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
    optBadge:    { backgroundColor: BG, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: BORDER },
    optText:     { fontSize: 9, fontWeight: '700', color: TEXT_HNT, letterSpacing: 0.5 },
    input:       { backgroundColor: BG, borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: TEXT_PRI },
    textArea:    { minHeight: 72, paddingTop: 13 },

    // Icons
    iconGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    iconOption:  { width: 54, height: 54, borderRadius: 14, borderWidth: 2, borderColor: BORDER, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
    iconEmoji:   { fontSize: 24 },

    // Colors
    colorRow:            { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    colorSwatch:         { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    colorSwatchSelected: { borderWidth: 3, borderColor: TEXT_PRI },
    colorCheck:          { fontSize: 16, color: '#fff', fontWeight: '800' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function RoomDetailScreen() {
    const navigation = useNavigation<RoomDetailScreenNavigationProp>();
    const route      = useRoute<RoomDetailScreenRouteProp>();
    const { roomId } = route.params;

    const [deleting,    setDeleting]    = useState(false);
    const [editVisible, setEditVisible] = useState(false);

    const roomStore = useRoomStore();
    const itemStore = useItemStore();

    useEffect(() => {
        roomStore.loadRooms();
        itemStore.loadItems();
    }, []);

    const room      = roomStore.rooms.find(r => r.id === roomId);
    const roomItems = itemStore.items.filter(i => i.roomId === roomId);

    const formatDate = (ts: number) =>
        new Date(ts).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

    // ── All hooks declared before any early return (Rules of Hooks) ─────────
    const handleSaveEdit = useCallback(async (updates: Partial<any>) => {
        if (!room) return;
        await roomStore.updateRoom(room.id, updates);
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, [room?.id]);

    const handleAddItem = useCallback(() => {
        const nav = navigation as unknown as RootNavigationProp;
        nav.navigate('AddItem');
    }, [navigation]);

    const handleItemPress = useCallback((item: any) => {
        const nav = navigation as unknown as RootNavigationProp;
        nav.navigate('ItemDetail', { itemId: item.id });
    }, [navigation]);

    const confirmDelete = useCallback(async () => {
        if (!room) return;
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setDeleting(true);
        try {
            await roomStore.deleteRoom(room.id);
            navigation.goBack();
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete room.');
        } finally { setDeleting(false); }
    }, [room?.id]);

    const handleDelete = useCallback(() => {
        if (!room) return;
        if (roomItems.length > 0) {
            Alert.alert(
                'Cannot Delete Room',
                `This room has ${roomItems.length} item${roomItems.length !== 1 ? 's' : ''}. Please move or delete them first.`,
                [{ text: 'OK' }]
            );
            return;
        }
        Alert.alert(
            'Delete Room',
            `Delete "${room.name}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: confirmDelete },
            ]
        );
    }, [room?.id, roomItems.length]);

    const renderItem = useCallback(({ item }: { item: any }) => (
        <ItemCard item={item} room={room!} onPress={handleItemPress} />
    ), [room?.id]);

    // ── Loading ──────────────────────────────────────────────────────────────
    if (roomStore.loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={BLUE} />
                    <Text style={styles.loadingText}>Loading room...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // ── Not found ────────────────────────────────────────────────────────────
    if (!room) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.center}>
                    <Text style={styles.errorEmoji}>❌</Text>
                    <Text style={styles.errorTitle}>Room Not Found</Text>
                    <Text style={styles.errorMsg}>This room may have been deleted.</Text>
                    <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.goBack()}>
                        <Text style={styles.goBackText}>← Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const emoji = ICON_MAP[room.icon] ?? '📍';



    // ── List header ──────────────────────────────────────────────────────────
    const ListHeader = (
        <View>
            {/* Hero */}
            <View style={[styles.hero, { backgroundColor: room.color + '18' }]}>
                {/* Nav buttons */}
                <View style={styles.heroNav}>
                    <TouchableOpacity style={styles.heroBtn} onPress={() => navigation.goBack()}>
                        <Text style={styles.heroBtnText}>←</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.heroBtn} onPress={() => setEditVisible(true)}>
                        <Text style={styles.heroBtnText}>✏️</Text>
                    </TouchableOpacity>
                </View>

                {/* Icon */}
                <View style={[styles.heroIconWrap, { backgroundColor: room.color + '30' }]}>
                    <Text style={styles.heroEmoji}>{emoji}</Text>
                </View>
                <Text style={styles.heroName}>{room.name}</Text>
                {room.description ? <Text style={styles.heroDesc}>{room.description}</Text> : null}
                <Text style={styles.heroCreated}>Created {formatDate(room.createdAt)}</Text>

                {/* Colour accent bar */}
                <View style={[styles.heroAccentBar, { backgroundColor: room.color }]} />
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
                <StatChip icon="📦" value={String(roomItems.length)} label="Items"  color={room.color} />
                <View style={styles.statsDivider} />
                <StatChip
                    icon={roomItems.length > 0 ? '✅' : '📭'}
                    value={roomItems.length > 0 ? 'Active' : 'Empty'}
                    label="Status"
                    color={roomItems.length > 0 ? '#34C759' : TEXT_HNT}
                />
                <View style={styles.statsDivider} />
                <StatChip icon="📅" value={formatDate(room.createdAt).split(' ')[2]} label="Since" color={BLUE} />
            </View>

            {/* Section header */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                    Items
                    <Text style={styles.sectionCount}>  {roomItems.length}</Text>
                </Text>
                <TouchableOpacity style={styles.addItemBtn} onPress={handleAddItem} activeOpacity={0.75}>
                    <Text style={styles.addItemBtnText}>＋ Add Item</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // ── Empty items ──────────────────────────────────────────────────────────
    const EmptyItems = (
        <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: room.color + '15' }]}>
                <Text style={styles.emptyEmoji}>{emoji}</Text>
            </View>
            <Text style={styles.emptyTitle}>No items yet</Text>
            <Text style={styles.emptyMsg}>
                Tap <Text style={{ color: BLUE, fontWeight: '700' }}>+ Add Item</Text> to start tracking things in {room.name}
            </Text>
            <TouchableOpacity
                style={[styles.emptyAddBtn, { backgroundColor: room.color }]}
                onPress={handleAddItem}
            >
                <Text style={styles.emptyAddBtnText}>＋ Add First Item</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            <FlatList
                data={roomItems}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                ListHeaderComponent={ListHeader}
                ListEmptyComponent={EmptyItems}
                contentContainerStyle={roomItems.length === 0 ? styles.emptyList : styles.list}
                showsVerticalScrollIndicator={false}
            />

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.editBtn, { backgroundColor: room.color }]}
                    onPress={() => setEditVisible(true)}
                    disabled={deleting}
                    activeOpacity={0.85}
                >
                    <Text style={styles.editBtnText}>✏️  Edit Room</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.deleteBtn, deleting && styles.deleteBtnDisabled]}
                    onPress={handleDelete}
                    disabled={deleting}
                    activeOpacity={0.85}
                >
                    {deleting
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={styles.deleteBtnIcon}>🗑️</Text>
                    }
                </TouchableOpacity>
            </View>

            {/* Edit Bottom Sheet */}
            <EditRoomSheet
                visible={editVisible}
                room={room}
                onSave={handleSaveEdit}
                onClose={() => setEditVisible(false)}
            />
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: CARD },

    // Hero
    hero:          { alignItems: 'center', paddingTop: 60, paddingBottom: 28, paddingHorizontal: 20, position: 'relative' },
    heroNav:       { position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
    heroBtn:       { width: 38, height: 38, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.75)', justifyContent: 'center', alignItems: 'center' },
    heroBtnText:   { fontSize: 18, color: TEXT_PRI, fontWeight: '600' },
    heroIconWrap:  { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    heroEmoji:     { fontSize: 40 },
    heroName:      { fontSize: 26, fontWeight: '800', color: TEXT_PRI, letterSpacing: -0.5, marginBottom: 6 },
    heroDesc:      { fontSize: 14, color: TEXT_SEC, textAlign: 'center', marginBottom: 8 },
    heroCreated:   { fontSize: 12, color: TEXT_HNT, fontWeight: '500' },
    heroAccentBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3 },

    // Stats
    statsRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, marginHorizontal: 16, marginTop: 14, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    statsDivider: { width: StyleSheet.hairlineWidth, height: 40, backgroundColor: BORDER },

    // Section header
    sectionHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
    sectionTitle:   { fontSize: 17, fontWeight: '800', color: TEXT_PRI, letterSpacing: -0.3 },
    sectionCount:   { fontSize: 15, fontWeight: '600', color: TEXT_HNT },
    addItemBtn:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: BLUE + '12' },
    addItemBtnText: { fontSize: 13, fontWeight: '700', color: BLUE },

    // List
    list:      { paddingBottom: 100 },
    emptyList: { flexGrow: 1, paddingBottom: 100 },

    // Empty state
    emptyState:      { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 10 },
    emptyIconWrap:   { width: 72, height: 72, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    emptyEmoji:      { fontSize: 36 },
    emptyTitle:      { fontSize: 18, fontWeight: '700', color: TEXT_PRI },
    emptyMsg:        { fontSize: 14, color: TEXT_SEC, textAlign: 'center', lineHeight: 20 },
    emptyAddBtn:     { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 },
    emptyAddBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

    // Footer
    footer:           { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 14, paddingBottom: Platform.OS === 'ios' ? 28 : 16, backgroundColor: CARD, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 8 },
    editBtn:          { flex: 1, borderRadius: 14, paddingVertical: 15, alignItems: 'center', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
    editBtnText:      { fontSize: 15, fontWeight: '700', color: '#fff' },
    deleteBtn:        { width: 52, backgroundColor: ERROR, borderRadius: 14, justifyContent: 'center', alignItems: 'center', shadowColor: ERROR, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
    deleteBtnDisabled:{ opacity: 0.6, shadowOpacity: 0 },
    deleteBtnIcon:    { fontSize: 20 },

    // Center states
    center:      { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 10 },
    loadingText: { fontSize: 15, color: TEXT_SEC, marginTop: 8 },
    errorEmoji:  { fontSize: 48, marginBottom: 8 },
    errorTitle:  { fontSize: 20, fontWeight: '700', color: TEXT_PRI },
    errorMsg:    { fontSize: 14, color: TEXT_SEC, textAlign: 'center' },
    goBackBtn:   { backgroundColor: BLUE, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
    goBackText:  { fontSize: 15, fontWeight: '600', color: '#fff' },
});