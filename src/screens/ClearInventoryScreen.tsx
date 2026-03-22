import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Modal,
    TextInput,
    ActivityIndicator,
    Animated,
    Alert,
    Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootNavigationProp } from '../types/navigation';
import { useItemStore, useRoomStore } from '../stores';
import { storage } from '../storage';
import { exportToFile, shareExportFile } from '../utils/exportImport';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const BLUE      = '#007AFF';
const BG        = '#F5F6FA';
const CARD      = '#FFFFFF';
const BORDER    = '#E8E8EE';
const ERROR     = '#FF3B30';
const ORANGE    = '#FF9500';
const GREEN     = '#34C759';
const TEXT_PRI  = '#1A1A2E';
const TEXT_SEC  = '#6B7280';
const TEXT_HNT  = '#B0B7C3';

// ─── Types ────────────────────────────────────────────────────────────────────
type ClearMode = 'items' | 'rooms' | 'everything';

interface ClearOption {
    mode: ClearMode;
    icon: string;
    iconBg: string;
    iconColor: string;
    title: string;
    subtitle: string;
    warning: string;
    confirmWord: string;
    requiresConfirm: boolean;
}

const CLEAR_OPTIONS: ClearOption[] = [
    {
        mode: 'items',
        icon: '📦',
        iconBg: '#FFF4E5',
        iconColor: ORANGE,
        title: 'Clear All Items',
        subtitle: 'Removes every item from all rooms. Rooms stay intact.',
        warning: 'All item data and photos will be permanently deleted.',
        confirmWord: 'CLEAR',
        requiresConfirm: false,
    },
    {
        mode: 'rooms',
        icon: '🏠',
        iconBg: '#EEF4FF',
        iconColor: BLUE,
        title: 'Clear All Rooms',
        subtitle: 'Removes all rooms. Only works if rooms have no items.',
        warning: 'You must clear items first before removing rooms.',
        confirmWord: 'CLEAR',
        requiresConfirm: false,
    },
    {
        mode: 'everything',
        icon: '🗑️',
        iconBg: '#FFF0EF',
        iconColor: ERROR,
        title: 'Clear Everything',
        subtitle: 'Wipes all items AND rooms. A complete factory reset.',
        warning: 'This is irreversible. Export your data first to keep a backup.',
        confirmWord: 'DELETE',
        requiresConfirm: true,
    },
];

// ─── Confirm Modal ────────────────────────────────────────────────────────────
const ConfirmModal: React.FC<{
    visible: boolean;
    option: ClearOption | null;
    itemCount: number;
    roomCount: number;
    onConfirm: () => void;
    onCancel: () => void;
    loading: boolean;
}> = ({ visible, option, itemCount, roomCount, onConfirm, onCancel, loading }) => {
    const [typed, setTyped] = useState('');
    const shakeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!visible) setTyped('');
    }, [visible]);

    if (!option) return null;

    const countText = option.mode === 'items'
        ? `${itemCount} item${itemCount !== 1 ? 's' : ''}`
        : option.mode === 'rooms'
        ? `${roomCount} room${roomCount !== 1 ? 's' : ''}`
        : `${itemCount} item${itemCount !== 1 ? 's' : ''} and ${roomCount} room${roomCount !== 1 ? 's' : ''}`;

    const canProceed = !option.requiresConfirm || typed === option.confirmWord;

    const handleAttempt = () => {
        if (!canProceed) {
            Animated.sequence([
                Animated.timing(shakeAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 6,  duration: 60, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 0,  duration: 60, useNativeDriver: true }),
            ]).start();
            return;
        }
        onConfirm();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <View style={modalStyles.overlay}>
                <View style={modalStyles.sheet}>
                    {/* Icon */}
                    <View style={[modalStyles.iconWrap, { backgroundColor: option.iconBg }]}>
                        <Text style={modalStyles.icon}>{option.icon}</Text>
                    </View>

                    <Text style={modalStyles.title}>{option.title}</Text>

                    {/* Count badge */}
                    <View style={modalStyles.countBadge}>
                        <Text style={modalStyles.countText}>This will delete {countText}</Text>
                    </View>

                    {/* Warning box */}
                    <View style={[modalStyles.warningBox, { borderColor: option.iconColor + '40', backgroundColor: option.iconBg }]}>
                        <Text style={modalStyles.warningIcon}>⚠️</Text>
                        <Text style={[modalStyles.warningText, { color: option.iconColor }]}>{option.warning}</Text>
                    </View>

                    {/* Type to confirm */}
                    {option.requiresConfirm && (
                        <View style={modalStyles.confirmInputWrap}>
                            <Text style={modalStyles.confirmLabel}>
                                Type <Text style={{ fontWeight: '800', color: ERROR }}>{option.confirmWord}</Text> to confirm
                            </Text>
                            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                                <TextInput
                                    style={[
                                        modalStyles.confirmInput,
                                        typed === option.confirmWord && modalStyles.confirmInputValid,
                                    ]}
                                    value={typed}
                                    onChangeText={setTyped}
                                    placeholder={option.confirmWord}
                                    placeholderTextColor={TEXT_HNT}
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                />
                            </Animated.View>
                        </View>
                    )}

                    {/* Actions */}
                    <View style={modalStyles.actions}>
                        <TouchableOpacity style={modalStyles.cancelBtn} onPress={onCancel} disabled={loading}>
                            <Text style={modalStyles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                modalStyles.confirmBtn,
                                { backgroundColor: option.iconColor },
                                !canProceed && modalStyles.confirmBtnDisabled,
                            ]}
                            onPress={handleAttempt}
                            disabled={loading}
                        >
                            {loading
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={modalStyles.confirmBtnText}>
                                    {option.mode === 'everything' ? 'Delete Everything' : option.title}
                                  </Text>
                            }
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const modalStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: CARD,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 28,
        alignItems: 'center',
        gap: 14,
    },
    iconWrap: {
        width: 64, height: 64, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 4,
    },
    icon: { fontSize: 32 },
    title: { fontSize: 20, fontWeight: '800', color: TEXT_PRI, letterSpacing: -0.4 },
    countBadge: {
        backgroundColor: BG, borderRadius: 8,
        paddingHorizontal: 14, paddingVertical: 7,
    },
    countText: { fontSize: 13, fontWeight: '600', color: TEXT_SEC },
    warningBox: {
        flexDirection: 'row', alignItems: 'flex-start',
        borderWidth: 1.5, borderRadius: 12,
        padding: 12, gap: 8, width: '100%',
    },
    warningIcon: { fontSize: 15, marginTop: 1 },
    warningText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '500' },
    confirmInputWrap: { width: '100%', gap: 8 },
    confirmLabel: { fontSize: 13, color: TEXT_SEC, textAlign: 'center' },
    confirmInput: {
        backgroundColor: BG, borderWidth: 1.5, borderColor: BORDER,
        borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
        fontSize: 16, fontWeight: '700', letterSpacing: 2,
        color: TEXT_PRI, textAlign: 'center',
    },
    confirmInputValid: { borderColor: GREEN, backgroundColor: GREEN + '10' },
    actions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
    cancelBtn: {
        flex: 1, paddingVertical: 14, borderRadius: 12,
        borderWidth: 1.5, borderColor: BORDER, alignItems: 'center',
    },
    cancelText: { fontSize: 15, fontWeight: '600', color: TEXT_SEC },
    confirmBtn: {
        flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
        shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
    },
    confirmBtnDisabled: { opacity: 0.45, shadowOpacity: 0 },
    confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ClearInventoryScreen() {
    const navigation = useNavigation<RootNavigationProp>();
    const itemStore  = useItemStore();
    const roomStore  = useRoomStore();

    const [selectedOption, setSelectedOption] = useState<ClearOption | null>(null);
    const [loading,        setLoading]         = useState(false);
    const [exportLoading,  setExportLoading]   = useState(false);
    const [done,           setDone]            = useState<ClearMode | null>(null);

    const handleExportFirst = async () => {
        try {
            setExportLoading(true);
            const data    = await storage.exportData();
            const fileUri = await exportToFile(data);
            await shareExportFile(fileUri);
        } catch (e: any) {
            Alert.alert('Export Failed', e?.message ?? 'Unknown error');
        } finally {
            setExportLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!selectedOption) return;
        setLoading(true);
        try {
            switch (selectedOption.mode) {
                case 'items':
                    // Delete all items one by one via store, or use storage directly
                    for (const item of itemStore.items) {
                        await itemStore.deleteItem(item.id);
                    }
                    break;
                case 'rooms':
                    if (itemStore.items.length > 0) {
                        Alert.alert('Cannot Clear Rooms', 'Please clear all items first before removing rooms.');
                        setLoading(false);
                        setSelectedOption(null);
                        return;
                    }
                    for (const room of roomStore.rooms) {
                        await roomStore.deleteRoom(room.id);
                    }
                    break;
                case 'everything':
                    await storage.clearAll();
                    await roomStore.loadRooms();
                    await itemStore.loadItems();
                    break;
            }
            setDone(selectedOption.mode);
            setSelectedOption(null);
        } catch (e: any) {
            Alert.alert('Failed', e?.message ?? 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const itemCount = itemStore.items.length;
    const roomCount = roomStore.rooms.length;

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Clear Inventory</Text>
                <View style={{ width: 34 }} />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Hero ── */}
                <View style={styles.hero}>
                    <View style={styles.heroIconWrap}>
                        <Text style={styles.heroIcon}>🗑️</Text>
                    </View>
                    <Text style={styles.heroTitle}>Clear Your Inventory</Text>
                    <Text style={styles.heroSubtitle}>
                        Choose what to remove. This action cannot be undone — export your data first if you need a backup.
                    </Text>
                </View>

                {/* ── Stats bar ── */}
                <View style={styles.statsBar}>
                    <View style={styles.statCell}>
                        <Text style={styles.statValue}>{itemCount}</Text>
                        <Text style={styles.statLabel}>Items</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statCell}>
                        <Text style={styles.statValue}>{roomCount}</Text>
                        <Text style={styles.statLabel}>Rooms</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statCell}>
                        <Text style={styles.statValue}>{itemCount + roomCount}</Text>
                        <Text style={styles.statLabel}>Total</Text>
                    </View>
                </View>

                {/* ── Export first banner ── */}
                <TouchableOpacity
                    style={styles.exportBanner}
                    onPress={handleExportFirst}
                    disabled={exportLoading}
                    activeOpacity={0.8}
                >
                    <View style={styles.exportBannerLeft}>
                        <Text style={styles.exportBannerIcon}>💾</Text>
                        <View>
                            <Text style={styles.exportBannerTitle}>Export Before Clearing</Text>
                            <Text style={styles.exportBannerSub}>Save a backup of all your data</Text>
                        </View>
                    </View>
                    {exportLoading
                        ? <ActivityIndicator size="small" color={BLUE} />
                        : <Text style={styles.exportBannerArrow}>→</Text>
                    }
                </TouchableOpacity>

                {/* ── Success banner ── */}
                {done && (
                    <View style={styles.successBanner}>
                        <Text style={styles.successIcon}>✅</Text>
                        <Text style={styles.successText}>
                            {done === 'items'      ? 'All items cleared successfully.'
                           : done === 'rooms'      ? 'All rooms cleared successfully.'
                           : 'Everything cleared. Fresh start!'}
                        </Text>
                    </View>
                )}

                {/* ── Clear options ── */}
                <Text style={styles.optionsLabel}>SELECT WHAT TO CLEAR</Text>

                {CLEAR_OPTIONS.map(option => {
                    const isDisabled =
                        (option.mode === 'items' && itemCount === 0) ||
                        (option.mode === 'rooms' && roomCount === 0) ||
                        (option.mode === 'everything' && itemCount === 0 && roomCount === 0);

                    return (
                        <TouchableOpacity
                            key={option.mode}
                            style={[styles.optionCard, isDisabled && styles.optionCardDisabled]}
                            onPress={() => !isDisabled && setSelectedOption(option)}
                            activeOpacity={isDisabled ? 1 : 0.75}
                            disabled={isDisabled}
                        >
                            <View style={[styles.optionIconWrap, { backgroundColor: option.iconBg }]}>
                                <Text style={styles.optionIcon}>{option.icon}</Text>
                            </View>
                            <View style={styles.optionContent}>
                                <Text style={[styles.optionTitle, { color: option.iconColor }, isDisabled && { color: TEXT_HNT }]}>
                                    {option.title}
                                </Text>
                                <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                            </View>
                            <Text style={[styles.optionChevron, { color: option.iconColor }, isDisabled && { color: TEXT_HNT }]}>›</Text>
                        </TouchableOpacity>
                    );
                })}

                {/* ── Bottom note ── */}
                <View style={styles.note}>
                    <Text style={styles.noteText}>
                        💡 Clearing items does not delete room configurations. You can re-add items to existing rooms afterwards.
                    </Text>
                </View>
            </ScrollView>

            {/* ── Confirm Modal ── */}
            <ConfirmModal
                visible={!!selectedOption}
                option={selectedOption}
                itemCount={itemCount}
                roomCount={roomCount}
                onConfirm={handleConfirm}
                onCancel={() => setSelectedOption(null)}
                loading={loading}
            />
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 13,
        backgroundColor: '#fff',
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
    },
    backBtn: {
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: BG, justifyContent: 'center', alignItems: 'center',
    },
    backArrow: { fontSize: 20, color: TEXT_PRI, fontWeight: '600' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT_PRI, letterSpacing: -0.3 },

    scroll: { flex: 1, backgroundColor: BG },
    scrollContent: { padding: 16, gap: 12 },

    // Hero
    hero: { alignItems: 'center', paddingVertical: 24, gap: 10 },
    heroIconWrap: {
        width: 72, height: 72, borderRadius: 22,
        backgroundColor: ERROR + '15', justifyContent: 'center', alignItems: 'center',
        marginBottom: 4,
    },
    heroIcon: { fontSize: 36 },
    heroTitle: { fontSize: 22, fontWeight: '800', color: TEXT_PRI, letterSpacing: -0.4 },
    heroSubtitle: { fontSize: 14, color: TEXT_SEC, textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 },

    // Stats bar
    statsBar: {
        flexDirection: 'row', backgroundColor: CARD,
        borderRadius: 14, paddingVertical: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    statCell: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: '800', color: TEXT_PRI, marginBottom: 2 },
    statLabel: { fontSize: 11, fontWeight: '600', color: TEXT_SEC },
    statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginVertical: 4 },

    // Export banner
    exportBanner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: BLUE + '10', borderRadius: 14,
        paddingHorizontal: 16, paddingVertical: 14,
        borderWidth: 1.5, borderColor: BLUE + '30',
    },
    exportBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    exportBannerIcon: { fontSize: 24 },
    exportBannerTitle: { fontSize: 14, fontWeight: '700', color: BLUE, marginBottom: 2 },
    exportBannerSub: { fontSize: 12, color: BLUE + 'AA' },
    exportBannerArrow: { fontSize: 20, color: BLUE, fontWeight: '600' },

    // Success banner
    successBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: GREEN + '15', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 12,
        borderWidth: 1.5, borderColor: GREEN + '40',
    },
    successIcon: { fontSize: 18 },
    successText: { flex: 1, fontSize: 13, fontWeight: '600', color: GREEN },

    // Options
    optionsLabel: {
        fontSize: 11, fontWeight: '700', color: TEXT_SEC,
        letterSpacing: 0.8, marginTop: 4, marginBottom: 4,
    },
    optionCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: CARD, borderRadius: 14, padding: 16, gap: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
        marginBottom: 2,
    },
    optionCardDisabled: { opacity: 0.45 },
    optionIconWrap: {
        width: 46, height: 46, borderRadius: 13,
        justifyContent: 'center', alignItems: 'center',
    },
    optionIcon: { fontSize: 22 },
    optionContent: { flex: 1 },
    optionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
    optionSubtitle: { fontSize: 12, color: TEXT_SEC, lineHeight: 17 },
    optionChevron: { fontSize: 22, fontWeight: '300' },

    // Note
    note: {
        backgroundColor: CARD, borderRadius: 12,
        padding: 14, marginTop: 4,
    },
    noteText: { fontSize: 12, color: TEXT_SEC, lineHeight: 18 },
});