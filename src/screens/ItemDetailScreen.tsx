import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View, Text, Image, StyleSheet, ScrollView, TouchableOpacity,
    Alert, ActivityIndicator, Platform, SafeAreaView, StatusBar,
    Share, Modal, TextInput, KeyboardAvoidingView, Animated, FlatList, Linking,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import type {
    ItemDetailScreenNavigationProp,
    ItemDetailScreenRouteProp,
} from '../types/navigation';
import { useItemStore, useRoomStore } from '../stores';
import { ensureCameraPermission, ensureMediaLibraryPermission } from '../utils/permissions';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const BLUE     = '#007AFF';
const TEAL     = '#4ECDC4';
const BG       = '#F5F6FA';
const CARD     = '#FFFFFF';
const BORDER   = '#E8E8EE';
const ERROR    = '#FF3B30';
const GREEN    = '#34C759';
const TEXT_PRI = '#1A1A2E';
const TEXT_SEC = '#6B7280';
const TEXT_HNT = '#B0B7C3';

// ─── Icon map ─────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, string> = {
    kitchen: '🍳', bedroom: '🛏️', 'living-room': '🛋️',
    bathroom: '🚿', garage: '🚗', office: '💼',
    hallway: '🚪', closet: '👔', basement: '⬇️',
    attic: '⬆️', storage: '📦', outdoor: '🌳',
};

// ─── Default categories ───────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
    { id: 'electronics', name: 'Electronics', icon: '💻', color: '#007AFF' },
    { id: 'clothing',    name: 'Clothing',    icon: '👕', color: '#FF9500' },
    { id: 'tools',       name: 'Tools',       icon: '🔧', color: '#636366' },
    { id: 'documents',   name: 'Documents',   icon: '📄', color: '#34C759' },
    { id: 'furniture',   name: 'Furniture',   icon: '🪑', color: '#AF52DE' },
    { id: 'kitchen',     name: 'Kitchen',     icon: '🍳', color: '#FF6B9D' },
    { id: 'sports',      name: 'Sports',      icon: '⚽', color: '#FF3B30' },
    { id: 'books',       name: 'Books',       icon: '📚', color: '#5856D6' },
];

// ─── Detail row ───────────────────────────────────────────────────────────────
const DetailRow: React.FC<{
    icon: string; iconBg: string; label: string; value: string;
}> = ({ icon, iconBg, label, value }) => (
    <View style={rowStyles.row}>
        <View style={[rowStyles.iconWrap, { backgroundColor: iconBg }]}>
            <Text style={rowStyles.icon}>{icon}</Text>
        </View>
        <View style={rowStyles.content}>
            <Text style={rowStyles.label}>{label}</Text>
            <Text style={rowStyles.value}>{value}</Text>
        </View>
    </View>
);
const rowStyles = StyleSheet.create({
    row:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
    iconWrap:{ width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    icon:    { fontSize: 18 },
    content: { flex: 1 },
    label:   { fontSize: 11, fontWeight: '700', color: TEXT_HNT, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
    value:   { fontSize: 15, color: TEXT_PRI, fontWeight: '500' },
});

// ─── Room dropdown (inline) ───────────────────────────────────────────────────
const RoomPicker: React.FC<{
    rooms: any[]; selectedId: string; onSelect: (id: string) => void;
}> = ({ rooms, selectedId, onSelect }) => {
    const [open, setOpen] = useState(false);
    const rot = useRef(new Animated.Value(0)).current;
    const selected = rooms.find(r => r.id === selectedId);

    const toggle = () => {
        Animated.spring(rot, { toValue: open ? 0 : 1, useNativeDriver: true, tension: 120, friction: 8 }).start();
        setOpen(o => !o);
    };
    const pick = (id: string) => {
        onSelect(id);
        Animated.spring(rot, { toValue: 0, useNativeDriver: true, tension: 120, friction: 8 }).start();
        setOpen(false);
    };
    const chevron = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

    return (
        <View style={dp.wrapper}>
            <TouchableOpacity style={[dp.trigger, open && dp.triggerOpen]} onPress={toggle} activeOpacity={0.8}>
                {selected ? (
                    <View style={dp.row}>
                        <View style={[dp.dot, { backgroundColor: selected.color }]} />
                        <Text style={dp.selText}>{selected.name}</Text>
                    </View>
                ) : <Text style={dp.placeholder}>Select Room</Text>}
                <Animated.Text style={[dp.chevron, { transform: [{ rotate: chevron }] }]}>▾</Animated.Text>
            </TouchableOpacity>
            {open && (
                <View style={dp.list}>
                    {rooms.map((r, idx) => (
                        <TouchableOpacity key={r.id}
                            style={[dp.option, idx < rooms.length - 1 && dp.optBorder, r.id === selectedId && dp.optActive]}
                            onPress={() => pick(r.id)} activeOpacity={0.7}>
                            <View style={[dp.dot, { backgroundColor: r.color }]} />
                            <Text style={[dp.optText, r.id === selectedId && dp.optTextActive]}>{r.name}</Text>
                            {r.id === selectedId && <Text style={dp.check}>✓</Text>}
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
};
const dp = StyleSheet.create({
    wrapper:      { zIndex: 100 },
    trigger:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: BG, borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
    triggerOpen:  { borderColor: BLUE, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 },
    row:          { flexDirection: 'row', alignItems: 'center' },
    dot:          { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    selText:      { fontSize: 15, color: TEXT_PRI, fontWeight: '500' },
    placeholder:  { fontSize: 15, color: TEXT_HNT },
    chevron:      { fontSize: 16, color: TEXT_SEC },
    list:         { backgroundColor: CARD, borderWidth: 1.5, borderColor: BLUE, borderTopWidth: 0, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, overflow: 'hidden' },
    option:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13 },
    optBorder:    { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
    optActive:    { backgroundColor: BLUE + '0D' },
    optText:      { flex: 1, fontSize: 15, color: TEXT_PRI },
    optTextActive:{ color: BLUE, fontWeight: '600' },
    check:        { fontSize: 14, color: BLUE, fontWeight: '700' },
});

// ─── Category picker (inline) ─────────────────────────────────────────────────
const CategoryPicker: React.FC<{
    selectedId: string; onSelect: (id: string) => void;
}> = ({ selectedId, onSelect }) => {
    const [open, setOpen] = useState(false);
    const rot = useRef(new Animated.Value(0)).current;
    const selected = DEFAULT_CATEGORIES.find(c => c.id === selectedId);

    const toggle = () => {
        Animated.spring(rot, { toValue: open ? 0 : 1, useNativeDriver: true, tension: 120, friction: 8 }).start();
        setOpen(o => !o);
    };
    const pick = (id: string) => {
        onSelect(id === selectedId ? '' : id);
        Animated.spring(rot, { toValue: 0, useNativeDriver: true, tension: 120, friction: 8 }).start();
        setOpen(false);
    };
    const chevron = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

    return (
        <View style={cp.wrapper}>
            <TouchableOpacity style={[cp.trigger, open && cp.triggerOpen]} onPress={toggle} activeOpacity={0.8}>
                {selected ? (
                    <View style={cp.row}>
                        <View style={[cp.pill, { backgroundColor: selected.color + '20' }]}>
                            <Text style={cp.pillEmoji}>{selected.icon}</Text>
                        </View>
                        <Text style={cp.selText}>{selected.name}</Text>
                    </View>
                ) : <Text style={cp.placeholder}>Select category (optional)</Text>}
                <Animated.Text style={[cp.chevron, { transform: [{ rotate: chevron }] }]}>▾</Animated.Text>
            </TouchableOpacity>
            {open && (
                <View style={cp.list}>
                    {DEFAULT_CATEGORIES.map((c, idx) => (
                        <TouchableOpacity key={c.id}
                            style={[cp.option, idx < DEFAULT_CATEGORIES.length - 1 && cp.optBorder, c.id === selectedId && cp.optActive]}
                            onPress={() => pick(c.id)} activeOpacity={0.7}>
                            <View style={[cp.pill, { backgroundColor: c.color + '20' }]}>
                                <Text style={cp.pillEmoji}>{c.icon}</Text>
                            </View>
                            <Text style={[cp.optText, c.id === selectedId && { color: c.color, fontWeight: '600' }]}>{c.name}</Text>
                            {c.id === selectedId && <Text style={[cp.check, { color: c.color }]}>✓</Text>}
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
};
const cp = StyleSheet.create({
    wrapper:      { zIndex: 90 },
    trigger:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: BG, borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
    triggerOpen:  { borderColor: BLUE, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 },
    row:          { flexDirection: 'row', alignItems: 'center', gap: 10 },
    pill:         { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    pillEmoji:    { fontSize: 16 },
    selText:      { fontSize: 15, color: TEXT_PRI, fontWeight: '500' },
    placeholder:  { fontSize: 15, color: TEXT_HNT },
    chevron:      { fontSize: 16, color: TEXT_SEC },
    list:         { backgroundColor: CARD, borderWidth: 1.5, borderColor: BLUE, borderTopWidth: 0, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, overflow: 'hidden' },
    option:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, gap: 10 },
    optBorder:    { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
    optActive:    { backgroundColor: BLUE + '08' },
    optText:      { flex: 1, fontSize: 15, color: TEXT_PRI },
    check:        { fontSize: 14, fontWeight: '700' },
});

// ─── Edit Bottom Sheet ────────────────────────────────────────────────────────
interface EditSheetProps {
    visible: boolean;
    item: any;
    rooms: any[];
    onSave: (updates: Partial<any>) => Promise<void>;
    onClose: () => void;
}

const EditBottomSheet: React.FC<EditSheetProps> = ({ visible, item, rooms, onSave, onClose }) => {
    const slideAnim = useRef(new Animated.Value(600)).current;

    const [name,     setName]     = useState('');
    const [roomId,   setRoomId]   = useState('');
    const [location, setLocation] = useState('');
    const [catId,    setCatId]    = useState('');
    const [imageUri, setImageUri] = useState('');
    const [saving,   setSaving]   = useState(false);
    const [imgError, setImgError] = useState(false);

    // Sync item into local state whenever sheet opens
    useEffect(() => {
        if (visible && item) {
            setName(item.name ?? '');
            setRoomId(item.roomId ?? '');
            setLocation(item.specificLocation ?? '');
            setCatId((item as any).categoryId ?? '');
            setImageUri(item.imageUri ?? '');
            setImgError(false);
        }
    }, [visible, item]);

    // Slide in / out
    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: visible ? 0 : 600,
            useNativeDriver: true, tension: 80, friction: 14,
        }).start();
    }, [visible]);

    const handleTakePhoto = async () => {
        const ok = await ensureCameraPermission(handlePickPhoto);
        if (!ok) return;
        const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1,1], quality: 0.8 });
        if (!r.canceled && r.assets?.length) { setImageUri(r.assets[0].uri); setImgError(false); }
    };

    const handlePickPhoto = async () => {
        const ok = await ensureMediaLibraryPermission();
        if (!ok) return;
        const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1,1], quality: 0.8 });
        if (!r.canceled && r.assets?.length) { setImageUri(r.assets[0].uri); setImgError(false); }
    };

    const handleSave = async () => {
        if (!name.trim())     { Alert.alert('Validation', 'Item name is required.'); return; }
        if (!roomId)          { Alert.alert('Validation', 'Please select a room.');  return; }
        if (!location.trim()) { Alert.alert('Validation', 'Specific location is required.'); return; }
        setSaving(true);
        try {
            await onSave({
                name: name.trim(),
                roomId,
                specificLocation: location.trim(),
                categoryId: catId || undefined,
                imageUri,
            } as any);
            onClose();
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to save changes.');
        } finally { setSaving(false); }
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            {/* Dim backdrop */}
            <TouchableOpacity style={sheetStyles.backdrop} activeOpacity={1} onPress={onClose} />

            <Animated.View style={[sheetStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    {/* Handle */}
                    <View style={sheetStyles.handle} />

                    {/* Header */}
                    <View style={sheetStyles.header}>
                        <TouchableOpacity onPress={onClose} style={sheetStyles.cancelBtn}>
                            <Text style={sheetStyles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={sheetStyles.title}>Edit Item</Text>
                        <TouchableOpacity onPress={handleSave} disabled={saving} style={sheetStyles.saveBtn}>
                            {saving
                                ? <ActivityIndicator size="small" color={BLUE} />
                                : <Text style={sheetStyles.saveText}>Save</Text>
                            }
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={sheetStyles.scroll}
                        contentContainerStyle={sheetStyles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* ── Photo ── */}
                        <View style={sheetStyles.field}>
                            <Text style={sheetStyles.fieldLabel}>PHOTO</Text>
                            {imageUri && !imgError ? (
                                <View style={sheetStyles.imgPreviewWrap}>
                                    <Image
                                        source={{ uri: imageUri }}
                                        style={sheetStyles.imgPreview}
                                        onError={() => setImgError(true)}
                                    />
                                    <TouchableOpacity style={sheetStyles.imgRemove} onPress={() => setImageUri('')}>
                                        <Text style={sheetStyles.imgRemoveText}>✕</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={sheetStyles.imgChange} onPress={handlePickPhoto}>
                                        <Text style={sheetStyles.imgChangeText}>Change Photo</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={sheetStyles.photoBtns}>
                                    <TouchableOpacity style={sheetStyles.photoBtn} onPress={handleTakePhoto}>
                                        <Text style={sheetStyles.photoBtnIcon}>📷</Text>
                                        <Text style={sheetStyles.photoBtnText}>Camera</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={sheetStyles.photoBtn} onPress={handlePickPhoto}>
                                        <Text style={sheetStyles.photoBtnIcon}>🖼️</Text>
                                        <Text style={sheetStyles.photoBtnText}>Library</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {/* ── Name ── */}
                        <View style={sheetStyles.field}>
                            <Text style={sheetStyles.fieldLabel}>ITEM NAME</Text>
                            <TextInput
                                style={sheetStyles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="e.g., Passport"
                                placeholderTextColor={TEXT_HNT}
                                maxLength={100}
                            />
                        </View>

                        {/* ── Room ── */}
                        <View style={[sheetStyles.field, { zIndex: 100 }]}>
                            <Text style={sheetStyles.fieldLabel}>ROOM</Text>
                            <RoomPicker rooms={rooms} selectedId={roomId} onSelect={setRoomId} />
                        </View>

                        {/* ── Location ── */}
                        <View style={sheetStyles.field}>
                            <Text style={sheetStyles.fieldLabel}>SPECIFIC LOCATION</Text>
                            <TextInput
                                style={[sheetStyles.input, sheetStyles.textArea]}
                                value={location}
                                onChangeText={setLocation}
                                placeholder="e.g., Top drawer of desk"
                                placeholderTextColor={TEXT_HNT}
                                multiline
                                numberOfLines={3}
                                maxLength={200}
                                textAlignVertical="top"
                            />
                        </View>

                        {/* ── Category ── */}
                        <View style={[sheetStyles.field, { zIndex: 90 }]}>
                            <View style={sheetStyles.labelRow}>
                                <Text style={sheetStyles.fieldLabel}>CATEGORY</Text>
                                <View style={sheetStyles.optBadge}>
                                    <Text style={sheetStyles.optBadgeText}>OPTIONAL</Text>
                                </View>
                            </View>
                            <CategoryPicker selectedId={catId} onSelect={setCatId} />
                            {catId ? (
                                <TouchableOpacity onPress={() => setCatId('')} style={{ marginTop: 6 }}>
                                    <Text style={{ fontSize: 12, color: TEXT_SEC }}>✕ Clear category</Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </KeyboardAvoidingView>
            </Animated.View>
        </Modal>
    );
};

const sheetStyles = StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: CARD,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        maxHeight: '92%',
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15, shadowRadius: 16, elevation: 16,
    },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
    title:  { fontSize: 16, fontWeight: '700', color: TEXT_PRI },
    cancelBtn: { paddingHorizontal: 4, paddingVertical: 4 },
    cancelText: { fontSize: 15, color: TEXT_SEC, fontWeight: '500' },
    saveBtn: { paddingHorizontal: 4, paddingVertical: 4 },
    saveText: { fontSize: 15, color: BLUE, fontWeight: '700' },

    scroll: { },
    scrollContent: { padding: 16, gap: 16 },

    field: { gap: 8 },
    fieldLabel: { fontSize: 11, fontWeight: '700', color: TEXT_SEC, letterSpacing: 0.8, textTransform: 'uppercase' },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    optBadge: { backgroundColor: BG, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: BORDER },
    optBadgeText: { fontSize: 9, fontWeight: '700', color: TEXT_HNT, letterSpacing: 0.5 },

    input: { backgroundColor: BG, borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: TEXT_PRI },
    textArea: { minHeight: 80, paddingTop: 13 },

    // Photo
    photoBtns: { flexDirection: 'row', gap: 12 },
    photoBtn: { flex: 1, backgroundColor: CARD, borderWidth: 1.5, borderColor: TEAL, borderRadius: 12, borderStyle: 'dashed', paddingVertical: 20, alignItems: 'center', gap: 6 },
    photoBtnIcon: { fontSize: 26 },
    photoBtnText: { fontSize: 13, fontWeight: '600', color: TEAL },
    imgPreviewWrap: { alignSelf: 'center', position: 'relative', gap: 8 },
    imgPreview: { width: 160, height: 160, borderRadius: 14 },
    imgRemove: { position: 'absolute', top: -8, right: -8, backgroundColor: ERROR, width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: CARD },
    imgRemoveText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    imgChange: { backgroundColor: BLUE + '15', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
    imgChangeText: { fontSize: 13, color: BLUE, fontWeight: '600' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ItemDetailScreen() {
    const navigation = useNavigation<ItemDetailScreenNavigationProp>();
    const route      = useRoute<ItemDetailScreenRouteProp>();
    const { itemId } = route.params;

    const [deleting,     setDeleting]     = useState(false);
    const [imageError,   setImageError]   = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    const [editVisible,  setEditVisible]  = useState(false);

    const itemStore = useItemStore();
    const roomStore = useRoomStore();

    useEffect(() => {
        itemStore.loadItems();
        roomStore.loadRooms();
    }, []);

    const item = itemStore.items.find(i => i.id === itemId);
    const room = item ? roomStore.getRoomById(item.roomId) : undefined;

    const formatDate = (ts: number) =>
        new Date(ts).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const timeAgo = (ts: number) => {
        const d = Date.now() - ts;
        const m = Math.floor(d / 60000), h = Math.floor(d / 3600000), days = Math.floor(d / 86400000);
        if (m < 1) return 'Just now';
        if (m < 60) return `${m}m ago`;
        if (h < 24) return `${h}h ago`;
        if (days < 7) return `${days}d ago`;
        return formatDate(ts);
    };

    const handleSaveEdit = useCallback(async (updates: Partial<any>) => {
        if (!item) return;
        await itemStore.updateItem(item.id, updates);
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, [item, itemStore]);

    const handleShare = async () => {
        if (!item || !room) return;
        try {
            await Share.share({ message: `📦 ${item.name}\n🏠 ${room.name}\n📍 ${item.specificLocation}\n\nShared from Find My Stuff` });
        } catch { /* ignore */ }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Item',
            `Delete "${item?.name}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: confirmDelete },
            ]
        );
    };

    const confirmDelete = async () => {
        if (!item) return;
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setDeleting(true);
        try {
            await itemStore.deleteItem(item.id);
            navigation.goBack();
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete item.');
        } finally { setDeleting(false); }
    };

    // ── Loading / not found ──────────────────────────────────────────────────
    if (itemStore.loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={BLUE} />
                    <Text style={styles.loadingText}>Loading item...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!item || !room) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.center}>
                    <Text style={styles.errorEmoji}>❌</Text>
                    <Text style={styles.errorTitle}>Item Not Found</Text>
                    <Text style={styles.errorMsg}>This item may have been deleted.</Text>
                    <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.goBack()}>
                        <Text style={styles.goBackText}>← Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const roomEmoji = ICON_MAP[room.icon] ?? '📍';
    const category  = DEFAULT_CATEGORIES.find(c => c.id === (item as any).categoryId);

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* ── Hero image ── */}
                <View style={styles.imageWrap}>
                    {!imageError ? (
                        <Image
                            source={{ uri: item.imageUri }}
                            style={styles.image}
                            resizeMode="cover"
                            onLoadStart={() => setImageLoading(true)}
                            onLoadEnd={()  => setImageLoading(false)}
                            onError={()    => { setImageLoading(false); setImageError(true); }}
                        />
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <Text style={styles.imagePlaceholderEmoji}>📷</Text>
                            <Text style={styles.imagePlaceholderText}>No photo available</Text>
                        </View>
                    )}
                    {imageLoading && !imageError && (
                        <View style={styles.imageLoader}>
                            <ActivityIndicator color="#fff" size="large" />
                        </View>
                    )}

                    {/* Floating nav */}
                    <View style={styles.floatingHeader}>
                        <TouchableOpacity style={styles.floatingBtn} onPress={() => navigation.goBack()}>
                            <Text style={styles.floatingBtnText}>←</Text>
                        </TouchableOpacity>
                        <View style={styles.floatingRight}>
                            <TouchableOpacity style={styles.floatingBtn} onPress={handleShare}>
                                <Text style={styles.floatingBtnText}>⬆</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.floatingBtn} onPress={() => setEditVisible(true)}>
                                <Text style={styles.floatingBtnText}>✏️</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Room + time overlay */}
                    <View style={styles.roomBadgeOverlay}>
                        <View style={[styles.roomBadge, { backgroundColor: room.color }]}>
                            <Text style={styles.roomBadgeEmoji}>{roomEmoji}</Text>
                            <Text style={styles.roomBadgeText}>{room.name}</Text>
                        </View>
                        <Text style={styles.timeAgo}>{timeAgo(item.updatedAt)}</Text>
                    </View>
                </View>

                {/* ── Content ── */}
                <View style={styles.content}>
                    <Text style={styles.itemName}>{item.name}</Text>

                    {/* Chips */}
                    <View style={styles.chips}>
                        <View style={[styles.chip, { backgroundColor: room.color + '18' }]}>
                            <View style={[styles.chipDot, { backgroundColor: room.color }]} />
                            <Text style={[styles.chipText, { color: room.color }]}>{room.name}</Text>
                        </View>
                        {category && (
                            <View style={[styles.chip, { backgroundColor: category.color + '15' }]}>
                                <Text style={styles.chipText}>{category.icon} {category.name}</Text>
                            </View>
                        )}
                    </View>

                    {/* Detail rows */}
                    <View style={styles.detailCard}>
                        <DetailRow icon="📍" iconBg="#FFF0EF" label="Specific Location" value={item.specificLocation} />
                        <View style={styles.rowDivider} />
                        <DetailRow icon={roomEmoji} iconBg={room.color + '18'} label="Room" value={room.name} />
                        {room.description ? (
                            <>
                                <View style={styles.rowDivider} />
                                <DetailRow icon="📝" iconBg="#F0F4FF" label="Room Description" value={room.description} />
                            </>
                        ) : null}
                        <View style={styles.rowDivider} />
                        <DetailRow icon="📅" iconBg="#F0FFF4" label="Added" value={formatDate(item.createdAt)} />
                        {item.updatedAt !== item.createdAt && (
                            <>
                                <View style={styles.rowDivider} />
                                <DetailRow icon="🔄" iconBg="#F5F0FF" label="Last Updated" value={formatDate(item.updatedAt)} />
                            </>
                        )}
                        {item.location && (
                            <>
                                <View style={styles.rowDivider} />
                                <DetailRow
                                    icon="📍"
                                    iconBg="#F0FFF4"
                                    label="GPS Location"
                                    value={`${item.location.latitude.toFixed(5)}, ${item.location.longitude.toFixed(5)}${item.location.accuracy ? `  ±${Math.round(item.location.accuracy)}m` : ''}`}
                                />
                            </>
                        )}
                    </View>

                    {/* ── Find This Item section — always visible ── */}
                    <View style={styles.findSection}>
                        <Text style={styles.findSectionTitle}>📌  Find This Item</Text>

                        {/* How to find it — always shown */}
                        <View style={styles.findRow}>
                            <View style={[styles.findRowIcon, { backgroundColor: room.color + '20' }]}>
                                <Text style={{ fontSize: 20 }}>{roomEmoji}</Text>
                            </View>
                            <View style={styles.findRowContent}>
                                <Text style={styles.findRowLabel}>Go to room</Text>
                                <Text style={styles.findRowValue}>{room.name}</Text>
                            </View>
                        </View>

                        <View style={styles.findConnector} />

                        <View style={styles.findRow}>
                            <View style={[styles.findRowIcon, { backgroundColor: '#FFF0EF' }]}>
                                <Text style={{ fontSize: 20 }}>📍</Text>
                            </View>
                            <View style={styles.findRowContent}>
                                <Text style={styles.findRowLabel}>Look at</Text>
                                <Text style={styles.findRowValue}>{item.specificLocation}</Text>
                            </View>
                        </View>

                        {/* GPS / Maps row */}
                        <View style={styles.findConnector} />

                        {item.location ? (
                            // Has GPS — show Open in Maps button
                            <TouchableOpacity
                                style={styles.mapsBtn}
                                activeOpacity={0.8}
                                onPress={() => {
                                    const { latitude, longitude } = item.location!;
                                    const label = encodeURIComponent(item.name);
                                    const url = Platform.select({
                                        ios:     `maps://maps.apple.com/?q=${label}&ll=${latitude},${longitude}`,
                                        android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`,
                                        default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
                                    })!;
                                    Linking.canOpenURL(url).then(ok =>
                                        Linking.openURL(ok ? url : `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`)
                                    );
                                }}
                            >
                                <View style={styles.mapsBtnIconWrap}>
                                    <Text style={styles.mapsBtnIcon}>🗺️</Text>
                                </View>
                                <View style={styles.mapsBtnContent}>
                                    <Text style={styles.mapsBtnTitle}>Navigate with Maps</Text>
                                    <Text style={styles.mapsBtnSub}>
                                        {item.location.latitude.toFixed(5)}, {item.location.longitude.toFixed(5)}
                                        {item.location.accuracy ? `  ±${Math.round(item.location.accuracy)}m` : ''}
                                    </Text>
                                </View>
                                <Text style={styles.mapsBtnChevron}>›</Text>
                            </TouchableOpacity>
                        ) : (
                            // No GPS — explain how to add it
                            <View style={styles.noGpsRow}>
                                <View style={styles.mapsBtnIconWrap}>
                                    <Text style={styles.mapsBtnIcon}>🌐</Text>
                                </View>
                                <View style={styles.mapsBtnContent}>
                                    <Text style={styles.noGpsTitle}>No GPS saved</Text>
                                    <Text style={styles.noGpsSub}>Edit this item and tap "Pin My Location" to enable navigation</Text>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* AI summary */}
                    {(item as any).aiSummary && (
                        <View style={[styles.tipCard, { backgroundColor: '#F0FFFE', borderColor: '#4ECDC440' }]}>
                            <Text style={styles.tipIcon}>🧠</Text>
                            <View style={styles.tipContent}>
                                <Text style={[styles.tipTitle, { color: '#4ECDC4' }]}>AI Summary</Text>
                                <Text style={styles.tipText}>{(item as any).aiSummary}</Text>
                                {(item as any).detectedObjects?.length > 0 && (
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                                        {(item as any).detectedObjects.map((label: string, i: number) => (
                                            <View key={i} style={{ backgroundColor: '#4ECDC418', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                                                <Text style={{ fontSize: 11, color: '#4ECDC4', fontWeight: '600' }}>{label}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    <View style={{ height: 100 }} />
                </View>
            </ScrollView>

            {/* ── Footer ── */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => setEditVisible(true)}
                    disabled={deleting}
                    activeOpacity={0.85}
                >
                    <Text style={styles.editBtnText}>✏️  Edit Item</Text>
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

            {/* ── Edit Bottom Sheet ── */}
            <EditBottomSheet
                visible={editVisible}
                item={item}
                rooms={roomStore.rooms}
                onSave={handleSaveEdit}
                onClose={() => setEditVisible(false)}
            />
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: CARD },
    scroll:   { flex: 1, backgroundColor: BG },

    imageWrap:             { width: '100%', height: 300, backgroundColor: '#1A1A2E', position: 'relative' },
    image:                 { width: '100%', height: '100%' },
    imagePlaceholder:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F0F5', gap: 10 },
    imagePlaceholderEmoji: { fontSize: 48, opacity: 0.3 },
    imagePlaceholderText:  { fontSize: 14, color: TEXT_HNT },
    imageLoader:           { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },

    floatingHeader: { position: 'absolute', top: Platform.OS === 'ios' ? 54 : 16, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    floatingRight:  { flexDirection: 'row', gap: 8 },
    floatingBtn:    { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
    floatingBtnText:{ fontSize: 17, color: '#fff' },

    roomBadgeOverlay: { position: 'absolute', bottom: 14, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    roomBadge:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    roomBadgeEmoji:   { fontSize: 14 },
    roomBadgeText:    { fontSize: 13, fontWeight: '700', color: '#fff' },
    timeAgo:          { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },

    content:  { padding: 16, gap: 14 },
    itemName: { fontSize: 26, fontWeight: '800', color: TEXT_PRI, letterSpacing: -0.5, marginBottom: 4 },

    chips:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: BG, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: BORDER },
    chipDot: { width: 8, height: 8, borderRadius: 4 },
    chipText:{ fontSize: 13, fontWeight: '500', color: TEXT_SEC },

    detailCard: { backgroundColor: CARD, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, overflow: 'hidden' },
    rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginHorizontal: 16 },

    tipCard:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: BLUE + '0D', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: BLUE + '25' },

    // Maps button
    mapsBtn:         { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#34C75912', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: '#34C75940' },
    mapsBtnIconWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#34C75918', justifyContent: 'center', alignItems: 'center' },
    mapsBtnIcon:     { fontSize: 22 },
    mapsBtnContent:  { flex: 1 },
    mapsBtnTitle:    { fontSize: 15, fontWeight: '700', color: '#34C759', marginBottom: 2 },
    mapsBtnSub:      { fontSize: 11, color: '#6B7280' },
    mapsBtnChevron:  { fontSize: 22, color: '#34C759', fontWeight: '300' },

    // Find This Item section
    findSection:      { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    findSectionTitle: { fontSize: 13, fontWeight: '700', color: '#1A1A2E', letterSpacing: 0.2, marginBottom: 14 },
    findRow:          { flexDirection: 'row', alignItems: 'center', gap: 12 },
    findRowIcon:      { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    findRowContent:   { flex: 1 },
    findRowLabel:     { fontSize: 11, fontWeight: '600', color: '#B0B7C3', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    findRowValue:     { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
    findConnector:    { width: 2, height: 16, backgroundColor: '#E8E8EE', marginLeft: 21, marginVertical: 4 },
    noGpsRow:         { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F5F6FA', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: '#E8E8EE' },
    noGpsTitle:       { fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 2 },
    noGpsSub:         { fontSize: 11, color: '#B0B7C3', lineHeight: 16 },
    tipIcon:    { fontSize: 20 },
    tipContent: { flex: 1 },
    tipTitle:   { fontSize: 13, fontWeight: '700', color: BLUE, marginBottom: 4 },
    tipText:    { fontSize: 13, color: TEXT_SEC, lineHeight: 19 },

    footer:          { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 14, paddingBottom: Platform.OS === 'ios' ? 28 : 16, backgroundColor: CARD, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 8 },
    editBtn:         { flex: 1, backgroundColor: BLUE, borderRadius: 14, paddingVertical: 15, alignItems: 'center', shadowColor: BLUE, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
    editBtnText:     { fontSize: 15, fontWeight: '700', color: '#fff' },
    deleteBtn:       { width: 52, backgroundColor: ERROR, borderRadius: 14, justifyContent: 'center', alignItems: 'center', shadowColor: ERROR, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
    deleteBtnDisabled:{ opacity: 0.6, shadowOpacity: 0 },
    deleteBtnIcon:   { fontSize: 20 },

    center:       { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 10 },
    loadingText:  { fontSize: 15, color: TEXT_SEC, marginTop: 8 },
    errorEmoji:   { fontSize: 48, marginBottom: 8 },
    errorTitle:   { fontSize: 20, fontWeight: '700', color: TEXT_PRI },
    errorMsg:     { fontSize: 14, color: TEXT_SEC, textAlign: 'center' },
    goBackBtn:    { backgroundColor: BLUE, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
    goBackText:   { fontSize: 15, fontWeight: '600', color: '#fff' },
});