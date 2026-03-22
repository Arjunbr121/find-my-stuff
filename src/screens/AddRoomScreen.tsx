import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    Platform,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AddRoomScreenNavigationProp } from '../types/navigation';
import { ROOM_ICONS, ROOM_COLORS } from '../types/models';
import { useRoomStore } from '../stores';

// ─── Colour tokens ────────────────────────────────────────────────────────────
const BLUE       = '#007AFF';
const BG         = '#F5F6FA';
const CARD       = '#FFFFFF';
const BORDER     = '#E8E8EE';
const ERROR      = '#FF3B30';
const TEXT_PRI   = '#1A1A2E';
const TEXT_SEC   = '#6B7280';
const TEXT_HINT  = '#B0B7C3';

// ─── Icon map ─────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, string> = {
    kitchen:      '🍳',
    bedroom:      '🛏️',
    'living-room':'🛋️',
    bathroom:     '🚿',
    garage:       '🚗',
    office:       '💼',
    hallway:      '🚪',
    closet:       '👔',
    basement:     '⬇️',
    attic:        '⬆️',
    storage:      '📦',
    outdoor:      '🌳',
};

// Fallback if ROOM_ICONS isn't populated yet — show at least these
const FALLBACK_ICONS = Object.keys(ICON_MAP);
const FALLBACK_COLORS = [
    '#007AFF', '#34C759', '#FF9500', '#FF3B30',
    '#5856D6', '#636366', '#4ECDC4', '#FF6B9D',
];

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AddRoomScreen() {
    const navigation = useNavigation<AddRoomScreenNavigationProp>();

    const icons  = (ROOM_ICONS?.length  ? ROOM_ICONS  : FALLBACK_ICONS)  as string[];
    const colors = (ROOM_COLORS?.length ? ROOM_COLORS : FALLBACK_COLORS) as string[];

    const [name,        setName]        = useState('');
    const [icon,        setIcon]        = useState<string>(icons[0]);
    const [color,       setColor]       = useState<string>(colors[0]);
    const [description, setDescription] = useState('');
    const [saving,      setSaving]      = useState(false);
    const [touched,     setTouched]     = useState<Record<string, boolean>>({});
    const [errors,      setErrors]      = useState<{ name?: string; description?: string }>({});

    const roomStore = useRoomStore();

    const validateForm = (): boolean => {
        const e: typeof errors = {};
        if (!name.trim())                       e.name = 'Room name is required';
        else if (name.trim().length > 50)       e.name = 'Max 50 characters';
        if (description.trim().length > 200)    e.description = 'Max 200 characters';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        setTouched({ name: true, description: true });
        if (!validateForm()) return;
        setSaving(true);
        try {
            await roomStore.addRoom({
                name: name.trim(),
                icon,
                color,
                description: description.trim() || undefined,
            });
            navigation.goBack();
        } catch (error: any) {
            if (error.message?.includes('unique') || error.message?.includes('exists')) {
                setErrors({ name: 'A room with this name already exists' });
            } else {
                Alert.alert('Error', error.message || 'Failed to save room. Please try again.');
            }
        } finally {
            setSaving(false);
        }
    };

    const selectedEmoji = ICON_MAP[icon] ?? '📍';

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add New Room</Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.cancelLink}>Cancel</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* ── Icon preview banner ── */}
                <View style={[styles.previewBanner, { backgroundColor: color + '22' }]}>
                    <View style={[styles.previewIconCircle, { backgroundColor: color + '33' }]}>
                        <Text style={styles.previewEmoji}>{selectedEmoji}</Text>
                    </View>
                    {name.trim() ? (
                        <Text style={[styles.previewRoomName, { color }]}>{name.trim()}</Text>
                    ) : null}
                </View>

                {/* ── Room Details ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Room Details</Text>

                    {/* Name */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Room Name</Text>
                        <TextInput
                            style={[styles.input, errors.name && touched.name && styles.inputError]}
                            value={name}
                            onChangeText={v => { setName(v); if (errors.name) setErrors(e => ({ ...e, name: undefined })); }}
                            onBlur={() => setTouched(t => ({ ...t, name: true }))}
                            placeholder="e.g., Attic, Basement, Shed"
                            placeholderTextColor={TEXT_HINT}
                            maxLength={50}
                        />
                        {errors.name && touched.name && (
                            <Text style={styles.errorText}>⚠ {errors.name}</Text>
                        )}
                    </View>

                    {/* Description */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Description (Optional)</Text>
                        <TextInput
                            style={[
                                styles.input,
                                styles.textArea,
                                errors.description && touched.description && styles.inputError,
                            ]}
                            value={description}
                            onChangeText={v => { setDescription(v); if (errors.description) setErrors(e => ({ ...e, description: undefined })); }}
                            onBlur={() => setTouched(t => ({ ...t, description: true }))}
                            placeholder="Briefly describe what's stored here"
                            placeholderTextColor={TEXT_HINT}
                            multiline
                            numberOfLines={3}
                            maxLength={200}
                            textAlignVertical="top"
                        />
                        {errors.description && touched.description && (
                            <Text style={styles.errorText}>⚠ {errors.description}</Text>
                        )}
                    </View>
                </View>

                {/* ── Visual Identity ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Visual Identity</Text>

                    {/* Icon grid */}
                    <View style={styles.iconGrid}>
                        {icons.map(iconKey => {
                            const isSelected = icon === iconKey;
                            return (
                                <TouchableOpacity
                                    key={iconKey}
                                    style={[
                                        styles.iconOption,
                                        isSelected && { backgroundColor: color, borderColor: color },
                                    ]}
                                    onPress={() => setIcon(iconKey)}
                                    activeOpacity={0.75}
                                >
                                    <Text style={styles.iconEmoji}>
                                        {ICON_MAP[iconKey] ?? '📍'}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Color swatches */}
                    <View style={styles.colorRow}>
                        {colors.map(c => {
                            const isSelected = color === c;
                            return (
                                <TouchableOpacity
                                    key={c}
                                    style={[
                                        styles.colorSwatch,
                                        { backgroundColor: c },
                                        isSelected && styles.colorSwatchSelected,
                                    ]}
                                    onPress={() => setColor(c)}
                                    activeOpacity={0.8}
                                >
                                    {isSelected && (
                                        <Text style={styles.colorCheck}>✓</Text>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* spacer for footer */}
                <View style={{ height: 110 }} />
            </ScrollView>

            {/* ── Footer ── */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.createBtn, { backgroundColor: color }, saving && styles.createBtnDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.85}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Text style={styles.createBtnIcon}>＋</Text>
                            <Text style={styles.createBtnText}>Create Room</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },

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
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: BG,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeIcon: {
        fontSize: 14,
        color: TEXT_SEC,
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: TEXT_PRI,
        letterSpacing: -0.3,
    },
    cancelLink: {
        fontSize: 15,
        color: BLUE,
        fontWeight: '500',
    },

    // Scroll
    scroll: {
        flex: 1,
        backgroundColor: BG,
    },
    scrollContent: {
        paddingBottom: 24,
    },

    // Preview banner
    previewBanner: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 36,
        marginBottom: 4,
        gap: 10,
    },
    previewIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewEmoji: {
        fontSize: 40,
    },
    previewRoomName: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.2,
    },

    // Sections
    section: {
        backgroundColor: CARD,
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 16,
        padding: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: TEXT_PRI,
        letterSpacing: -0.3,
        marginBottom: 16,
    },

    // Fields
    fieldGroup: {
        marginBottom: 16,
    },
    fieldLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: TEXT_SEC,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    input: {
        backgroundColor: BG,
        borderWidth: 1.5,
        borderColor: BORDER,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 13,
        fontSize: 15,
        color: TEXT_PRI,
    },
    inputError: {
        borderColor: ERROR,
    },
    textArea: {
        minHeight: 80,
        paddingTop: 13,
    },
    errorText: {
        color: ERROR,
        fontSize: 12,
        marginTop: 5,
        fontWeight: '500',
    },

    // Icon grid
    iconGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
    },
    iconOption: {
        width: 58,
        height: 58,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: BORDER,
        backgroundColor: BG,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconEmoji: {
        fontSize: 26,
    },

    // Color swatches
    colorRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    colorSwatch: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 0,
    },
    colorSwatchSelected: {
        borderWidth: 3,
        borderColor: TEXT_PRI,
    },
    colorCheck: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '800',
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: Platform.OS === 'ios' ? 32 : 20,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: BORDER,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 8,
    },
    createBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        paddingVertical: 16,
        gap: 8,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    createBtnDisabled: {
        opacity: 0.6,
    },
    createBtnIcon: {
        fontSize: 20,
        color: '#fff',
        fontWeight: '300',
        lineHeight: 22,
    },
    createBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: -0.2,
    },
});