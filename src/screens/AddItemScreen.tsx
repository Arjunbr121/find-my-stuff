import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, Image, Alert, ActivityIndicator, Platform,
    Animated, SafeAreaView, StatusBar, Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import type { AddItemScreenNavigationProp } from '../types/navigation';
import { useItemStore, useRoomStore } from '../stores';
import { ensureCameraPermission, ensureMediaLibraryPermission } from '../utils/permissions';
import type { Category } from './ManageCategoriesScreen';
import type { ItemLocation } from '../types/models';
import ScreenWrapper from '../components/ScreenWrapper';
import { detectObjects, buildLocationSummary, type DetectedObject } from '../utils/objectDetection';
import DetectionWebView, { type DetectionWebViewHandle } from '../components/DetectionWebView';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const BLUE     = '#007AFF';
const TEAL     = '#4ECDC4';
const ERROR    = '#FF3B30';
const BG       = '#F5F6FA';
const CARD     = '#FFFFFF';
const BORDER   = '#E8E8EE';
const TEXT_PRI = '#1A1A2E';
const TEXT_SEC = '#6B7280';
const TEXT_HNT = '#B0B7C3';

// ─── Default categories ───────────────────────────────────────────────────────
const DEFAULT_CATEGORIES: Category[] = [
    { id: 'electronics', name: 'Electronics', icon: '💻', color: '#007AFF' },
    { id: 'clothing',    name: 'Clothing',    icon: '👕', color: '#FF9500' },
    { id: 'tools',       name: 'Tools',       icon: '🔧', color: '#636366' },
    { id: 'documents',   name: 'Documents',   icon: '📄', color: '#34C759' },
    { id: 'furniture',   name: 'Furniture',   icon: '🪑', color: '#AF52DE' },
    { id: 'kitchen',     name: 'Kitchen',     icon: '🍳', color: '#FF6B9D' },
    { id: 'sports',      name: 'Sports',      icon: '⚽', color: '#FF3B30' },
    { id: 'books',       name: 'Books',       icon: '📚', color: '#5856D6' },
];

// ─── Reusable inline dropdown ─────────────────────────────────────────────────
interface DropdownOption { id: string; label: string; sublabel?: string; color: string; icon?: string; }

const InlineDropdown: React.FC<{
    options: DropdownOption[];
    selectedId: string;
    onSelect: (id: string) => void;
    placeholder: string;
    accentColor?: string;
    hasError?: boolean;
    zIndex?: number;
}> = ({ options, selectedId, onSelect, placeholder, accentColor = BLUE, hasError, zIndex = 100 }) => {
    const [open, setOpen] = useState(false);
    const rot = useRef(new Animated.Value(0)).current;
    const selected = options.find(o => o.id === selectedId);

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
        <View style={[ddS.wrapper, { zIndex }]}>
            <TouchableOpacity
                style={[ddS.trigger, open && { borderColor: accentColor, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 }, hasError && { borderColor: ERROR }]}
                onPress={toggle} activeOpacity={0.8}
            >
                {selected ? (
                    <View style={ddS.selectedRow}>
                        {selected.icon ? (
                            <View style={[ddS.iconPill, { backgroundColor: selected.color + '20' }]}>
                                <Text style={ddS.iconEmoji}>{selected.icon}</Text>
                            </View>
                        ) : (
                            <View style={[ddS.colorDot, { backgroundColor: selected.color }]} />
                        )}
                        <Text style={ddS.selectedText}>{selected.label}</Text>
                    </View>
                ) : (
                    <Text style={ddS.placeholder}>{placeholder}</Text>
                )}
                <Animated.Text style={[ddS.chevron, { transform: [{ rotate: chevron }] }]}>▾</Animated.Text>
            </TouchableOpacity>

            {open && (
                <View style={[ddS.list, { borderColor: accentColor }]}>
                    {options.map((opt, idx) => (
                        <TouchableOpacity
                            key={opt.id}
                            style={[ddS.option, idx < options.length - 1 && ddS.optionBorder, opt.id === selectedId && { backgroundColor: accentColor + '0C' }]}
                            onPress={() => pick(opt.id)} activeOpacity={0.7}
                        >
                            {opt.icon ? (
                                <View style={[ddS.iconPill, { backgroundColor: opt.color + '20' }]}>
                                    <Text style={ddS.iconEmoji}>{opt.icon}</Text>
                                </View>
                            ) : (
                                <View style={[ddS.colorDot, { backgroundColor: opt.color }]} />
                            )}
                            <View style={ddS.optionContent}>
                                <Text style={[ddS.optionText, opt.id === selectedId && { color: opt.color, fontWeight: '600' }]}>
                                    {opt.label}
                                </Text>
                                {opt.sublabel ? <Text style={ddS.optionSub}>{opt.sublabel}</Text> : null}
                            </View>
                            {opt.id === selectedId && <Text style={[ddS.check, { color: opt.color }]}>✓</Text>}
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
};

const ddS = StyleSheet.create({
    wrapper:      { },
    trigger:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: CARD, borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14 },
    selectedRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
    colorDot:     { width: 10, height: 10, borderRadius: 5 },
    iconPill:     { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    iconEmoji:    { fontSize: 15 },
    selectedText: { fontSize: 15, color: TEXT_PRI, fontWeight: '500' },
    placeholder:  { fontSize: 15, color: TEXT_HNT },
    chevron:      { fontSize: 16, color: TEXT_SEC },
    list:         { backgroundColor: CARD, borderWidth: 1.5, borderTopWidth: 0, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
    option:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
    optionBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
    optionContent:{ flex: 1 },
    optionText:   { fontSize: 15, color: TEXT_PRI },
    optionSub:    { fontSize: 11, color: TEXT_HNT, marginTop: 1 },
    check:        { fontSize: 14, fontWeight: '700' },
});

// ─── Field label ──────────────────────────────────────────────────────────────
const FieldLabel: React.FC<{ label: string; optional?: boolean }> = ({ label, optional }) => (
    <View style={fieldS.row}>
        <Text style={fieldS.label}>{label}</Text>
        {optional && (
            <View style={fieldS.badge}>
                <Text style={fieldS.badgeText}>OPTIONAL</Text>
            </View>
        )}
    </View>
);
const fieldS = StyleSheet.create({
    row:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    label:     { fontSize: 11, fontWeight: '700', color: TEXT_SEC, letterSpacing: 0.8, textTransform: 'uppercase' },
    badge:     { backgroundColor: BG, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: BORDER },
    badgeText: { fontSize: 9, fontWeight: '700', color: TEXT_HNT, letterSpacing: 0.5 },
});

// ─── Step indicator ───────────────────────────────────────────────────────────
const STEPS = ['Details', 'Location', 'Photo'];
const StepIndicator: React.FC<{ current: number }> = ({ current }) => (
    <View style={stepS.row}>
        {STEPS.map((s, i) => (
            <React.Fragment key={s}>
                <View style={stepS.stepWrap}>
                    <View style={[stepS.dot, i < current && stepS.dotDone, i === current && stepS.dotActive]}>
                        {i < current
                            ? <Text style={stepS.dotCheckText}>✓</Text>
                            : <Text style={[stepS.dotNum, i === current && stepS.dotNumActive]}>{i + 1}</Text>
                        }
                    </View>
                    <Text style={[stepS.label, i === current && stepS.labelActive]}>{s}</Text>
                </View>
                {i < STEPS.length - 1 && (
                    <View style={[stepS.line, i < current && stepS.lineDone]} />
                )}
            </React.Fragment>
        ))}
    </View>
);
const stepS = StyleSheet.create({
    row:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: CARD, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
    stepWrap:     { alignItems: 'center', gap: 4 },
    dot:          { width: 28, height: 28, borderRadius: 14, backgroundColor: BG, borderWidth: 2, borderColor: BORDER, justifyContent: 'center', alignItems: 'center' },
    dotActive:    { borderColor: BLUE, backgroundColor: BLUE + '12' },
    dotDone:      { borderColor: BLUE, backgroundColor: BLUE },
    dotNum:       { fontSize: 12, fontWeight: '700', color: TEXT_HNT },
    dotNumActive: { color: BLUE },
    dotCheckText: { fontSize: 12, color: '#fff', fontWeight: '700' },
    label:        { fontSize: 10, fontWeight: '600', color: TEXT_HNT },
    labelActive:  { color: BLUE },
    line:         { flex: 1, height: 2, backgroundColor: BORDER, marginBottom: 14, marginHorizontal: 4 },
    lineDone:     { backgroundColor: BLUE },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AddItemScreen() {
    const navigation = useNavigation<AddItemScreenNavigationProp>();

    const detectionRef = useRef<DetectionWebViewHandle>(null);

    const [name,             setName]             = useState('');
    const [roomId,           setRoomId]           = useState('');
    const [categoryId,       setCategoryId]       = useState('');
    const [specificLocation, setSpecificLocation] = useState('');
    const [imageUri,         setImageUri]         = useState('');
    const [capturedLocation, setCapturedLocation] = useState<ItemLocation | null>(null);
    const [detecting,        setDetecting]        = useState(false);
    const [detectedObjects,  setDetectedObjects]  = useState<DetectedObject[]>([]);
    const [aiSummary,        setAiSummary]        = useState<string>('');
    const [saving,           setSaving]           = useState(false);
    const [touched,          setTouched]          = useState<Record<string, boolean>>({});
    const [errors,           setErrors]           = useState<Record<string, string>>({});

    const itemStore = useItemStore();
    const roomStore = useRoomStore();

    useEffect(() => { roomStore.loadRooms(); }, []);

    // Current step (0 = Details, 1 = Location, 2 = Photo)
    const currentStep = !name.trim() || !roomId ? 0 : !specificLocation.trim() ? 1 : 2;

    const validateForm = (): boolean => {
        const e: Record<string, string> = {};
        if (!name.trim())             e.name             = 'Item name is required';
        else if (name.trim().length > 100) e.name        = 'Max 100 characters';
        if (!roomId)                  e.roomId           = 'Please select a room';
        if (!specificLocation.trim()) e.specificLocation = 'Specific location is required';
        if (!imageUri)                e.imageUri         = 'Please add a photo';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const captureLocation = async (): Promise<ItemLocation | null> => {
        if (Platform.OS === 'web') {
            // Use browser Geolocation API on web
            return new Promise((resolve) => {
                if (!navigator.geolocation) { resolve(null); return; }
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve({
                        latitude:  pos.coords.latitude,
                        longitude: pos.coords.longitude,
                        accuracy:  pos.coords.accuracy ?? undefined,
                    }),
                    () => resolve(null),
                    { timeout: 8000 }
                );
            });
        }
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return null;
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            return {
                latitude:  pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy:  pos.coords.accuracy ?? undefined,
            };
        } catch {
            return null;
        }
    };

    const handleTakePhoto = async () => {
        const ok = await ensureCameraPermission(handlePickImage);
        if (!ok) return;
        try {
            const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
            if (!r.canceled && r.assets?.length) {
                setImageUri(r.assets[0].uri);
                setErrors(e => ({ ...e, imageUri: '' }));
                const loc = await captureLocation();
                setCapturedLocation(loc);
            }
        } catch { Alert.alert('Camera Error', 'Failed to take photo. Please try again.'); }
    };

    const handlePickImage = async () => {
        const ok = await ensureMediaLibraryPermission();
        if (!ok) return;
        try {
            const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
            if (!r.canceled && r.assets?.length) {
                setImageUri(r.assets[0].uri);
                setErrors(e => ({ ...e, imageUri: '' }));
                const loc = await captureLocation();
                setCapturedLocation(loc);
            }
        } catch { Alert.alert('Image Picker Error', 'Failed to select photo.'); }
    };

    const handleDetect = async () => {
        if (!imageUri) return;
        if (!detectionRef.current?.isReady()) {
            Alert.alert('Not ready', 'Detection engine is still loading. Please wait a moment and try again.');
            return;
        }
        setDetecting(true);
        setDetectedObjects([]);
        setAiSummary('');
        try {
            // Convert URI to base64 data URI for the WebView
            let dataUri = imageUri;
            if (!imageUri.startsWith('data:')) {
                const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');
                const resized = await manipulateAsync(imageUri, [{ resize: { width: 300 } }], {
                    compress: 0.7, format: SaveFormat.JPEG, base64: true,
                });
                dataUri = `data:image/jpeg;base64,${resized.base64}`;
            }

            const results = await detectionRef.current.detect(dataUri);
            setDetectedObjects(results);
            const room = roomStore.rooms.find(r => r.id === roomId);
            const summary = buildLocationSummary(results, room?.name ?? 'the room', specificLocation || 'this location');
            setAiSummary(summary);
        } catch (e: any) {
            Alert.alert('Detection Failed', e?.message ?? 'Could not analyse image.');
        } finally {
            setDetecting(false);
        }
    };

    const handleSave = async () => {
        setTouched({ name: true, roomId: true, specificLocation: true, imageUri: true });
        if (!validateForm()) return;
        setSaving(true);
        try {
            await itemStore.addItem({
                name: name.trim(), roomId,
                categoryId: categoryId || undefined,
                specificLocation: specificLocation.trim(), imageUri,
                location: capturedLocation ?? undefined,
                detectedObjects: detectedObjects.length ? detectedObjects.map(d => d.label) : undefined,
                aiSummary: aiSummary || undefined,
            } as any);
            navigation.goBack();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to save item.');
        } finally { setSaving(false); }
    };

    // Room options for dropdown
    const roomOptions: DropdownOption[] = roomStore.rooms.map(r => ({
        id: r.id, label: r.name, color: r.color,
    }));

    // Category options for dropdown
    const catOptions: DropdownOption[] = DEFAULT_CATEGORIES.map(c => ({
        id: c.id, label: c.name, color: c.color, icon: c.icon,
    }));

    const isFormComplete = name.trim() && roomId && specificLocation.trim() && imageUri;

    return (
        <ScreenWrapper style={{ backgroundColor: '#fff' }}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            {/* Hidden detection engine — loads TF.js + COCO-SSD in background */}
            <DetectionWebView ref={detectionRef} />

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add New Item</Text>
                <View style={{ width: 34 }} />
            </View>

            {/* ── Step indicator ── */}
            <StepIndicator current={currentStep} />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* ── Hero ── */}
                <View style={styles.hero}>
                    <Text style={styles.heroTitle}>Item Details</Text>
                    <Text style={styles.heroSubtitle}>Where exactly did you tuck it away?</Text>
                </View>

                {/* ── Card: Name + Room + Category ── */}
                <View style={styles.formCard}>
                    {/* Name */}
                    <View style={styles.fieldGroup}>
                        <FieldLabel label="Item Name" />
                        <TextInput
                            style={[styles.input, errors.name && touched.name && styles.inputError]}
                            value={name}
                            onChangeText={v => { setName(v); setErrors(e => ({ ...e, name: '' })); }}
                            onBlur={() => setTouched(t => ({ ...t, name: true }))}
                            placeholder="e.g., Passport, Sony Headphones…"
                            placeholderTextColor={TEXT_HNT}
                            maxLength={100}
                        />
                        {errors.name && touched.name ? <Text style={styles.errorText}>⚠ {errors.name}</Text> : null}
                    </View>

                    <View style={styles.cardDivider} />

                    {/* Room */}
                    <View style={[styles.fieldGroup, { zIndex: 100 }]}>
                        <FieldLabel label="Room" />
                        <InlineDropdown
                            options={roomOptions}
                            selectedId={roomId}
                            onSelect={id => { setRoomId(id); setErrors(e => ({ ...e, roomId: '' })); }}
                            placeholder="Select Room"
                            zIndex={100}
                            hasError={!!(errors.roomId && touched.roomId)}
                        />
                        {errors.roomId && touched.roomId ? <Text style={styles.errorText}>⚠ {errors.roomId}</Text> : null}
                    </View>

                    <View style={styles.cardDivider} />

                    {/* Category */}
                    <View style={[styles.fieldGroup, { zIndex: 90 }]}>
                        <FieldLabel label="Category" optional />
                        <InlineDropdown
                            options={catOptions}
                            selectedId={categoryId}
                            onSelect={setCategoryId}
                            placeholder="Select a category (optional)"
                            accentColor={DEFAULT_CATEGORIES.find(c => c.id === categoryId)?.color ?? BLUE}
                            zIndex={90}
                        />
                        {categoryId ? (
                            <TouchableOpacity onPress={() => setCategoryId('')} style={styles.clearBtn}>
                                <Text style={styles.clearBtnText}>✕ Clear category</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>

                {/* ── Card: Specific Location ── */}
                <View style={styles.formCard}>
                    <View style={styles.fieldGroup}>
                        <FieldLabel label="Specific Location" />
                        <TextInput
                            style={[styles.input, styles.textArea, errors.specificLocation && touched.specificLocation && styles.inputError]}
                            value={specificLocation}
                            onChangeText={v => { setSpecificLocation(v); setErrors(e => ({ ...e, specificLocation: '' })); }}
                            onBlur={() => setTouched(t => ({ ...t, specificLocation: true }))}
                            placeholder="e.g., Top drawer of desk, Behind the TV…"
                            placeholderTextColor={TEXT_HNT}
                            multiline
                            numberOfLines={3}
                            maxLength={200}
                            textAlignVertical="top"
                        />
                        {errors.specificLocation && touched.specificLocation ? <Text style={styles.errorText}>⚠ {errors.specificLocation}</Text> : null}

                        {/* Character count */}
                        <Text style={styles.charCount}>{specificLocation.length}/200</Text>
                    </View>
                </View>

                {/* ── Card: Photo ── */}
                <View style={styles.formCard}>
                    <FieldLabel label="Photo" />

                    {imageUri ? (
                        <View style={styles.imgPreviewWrap}>
                            <Image source={{ uri: imageUri }} style={styles.imgPreview} />
                            <View style={styles.imgOverlay}>
                                <TouchableOpacity style={styles.imgOverlayBtn} onPress={handlePickImage}>
                                    <Text style={styles.imgOverlayIcon}>🔄</Text>
                                    <Text style={styles.imgOverlayText}>Change</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.imgOverlayBtn, { backgroundColor: ERROR + 'CC' }]} onPress={() => { setImageUri(''); setCapturedLocation(null); }}>
                                    <Text style={styles.imgOverlayIcon}>🗑️</Text>
                                    <Text style={styles.imgOverlayText}>Remove</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.photoBtns}>
                            <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto} activeOpacity={0.75}>
                                <View style={styles.photoBtnIconWrap}>
                                    <Text style={styles.photoBtnEmoji}>📷</Text>
                                </View>
                                <Text style={styles.photoBtnLabel}>Take Photo</Text>
                                <Text style={styles.photoBtnSub}>Use camera</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.photoBtn} onPress={handlePickImage} activeOpacity={0.75}>
                                <View style={styles.photoBtnIconWrap}>
                                    <Text style={styles.photoBtnEmoji}>🖼️</Text>
                                </View>
                                <Text style={styles.photoBtnLabel}>Library</Text>
                                <Text style={styles.photoBtnSub}>Choose file</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {errors.imageUri && touched.imageUri ? <Text style={[styles.errorText, { marginTop: 8 }]}>⚠ {errors.imageUri}</Text> : null}

                    {/* ── Location capture row ── */}
                    <View style={styles.locationRow}>
                        {capturedLocation ? (
                            /* Location captured — show coords + tap to open maps */
                            <TouchableOpacity
                                style={styles.locationCaptured}
                                activeOpacity={0.75}
                                onPress={() => {
                                    const { latitude, longitude } = capturedLocation;
                                    const url = Platform.select({
                                        ios:     `maps://maps.apple.com/?ll=${latitude},${longitude}`,
                                        android: `geo:${latitude},${longitude}?q=${latitude},${longitude}`,
                                        default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
                                    })!;
                                    Linking.openURL(url);
                                }}
                            >
                                <Text style={styles.locationCapturedIcon}>📍</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.locationCapturedTitle}>Location pinned  ·  tap to preview</Text>
                                    <Text style={styles.locationCapturedCoords}>
                                        {capturedLocation.latitude.toFixed(5)}, {capturedLocation.longitude.toFixed(5)}
                                        {capturedLocation.accuracy ? `  ±${Math.round(capturedLocation.accuracy)}m` : ''}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setCapturedLocation(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <Text style={styles.locationClearBtn}>✕</Text>
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ) : (
                            /* No location yet — show pin button */
                            <TouchableOpacity
                                style={styles.locationPinBtn}
                                activeOpacity={0.8}
                                onPress={async () => {
                                    const loc = await captureLocation();
                                    if (loc) {
                                        setCapturedLocation(loc);
                                    } else {
                                        Alert.alert(
                                            'Location unavailable',
                                            'Could not get your location. Make sure location permission is granted in Settings.',
                                        );
                                    }
                                }}
                            >
                                <Text style={styles.locationPinIcon}>📍</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.locationPinTitle}>Pin My Location</Text>
                                    <Text style={styles.locationPinSub}>Save GPS so you can navigate back later</Text>
                                </View>
                                <Text style={styles.locationPinChevron}>›</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* ── AI Detect button ── */}
                    {imageUri && (
                        <TouchableOpacity
                            style={[styles.detectBtn, detecting && styles.detectBtnDisabled]}
                            onPress={handleDetect}
                            disabled={detecting}
                            activeOpacity={0.8}
                        >
                            {detecting ? (
                                <>
                                    <ActivityIndicator size="small" color={TEAL} />
                                    <Text style={styles.detectBtnText}>Analysing…</Text>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.detectBtnIcon}>🔍</Text>
                                    <Text style={styles.detectBtnText}>
                                        {detectedObjects.length ? 'Re-analyse Photo' : 'Detect Objects in Photo'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    {/* ── Detection results ── */}
                    {detectedObjects.length > 0 && (
                        <View style={styles.detectionResults}>
                            <Text style={styles.detectionTitle}>🧠 Detected nearby</Text>
                            <View style={styles.detectionTags}>
                                {detectedObjects.map((obj, i) => (
                                    <View key={i} style={styles.detectionTag}>
                                        <Text style={styles.detectionTagText}>
                                            {obj.label}  {Math.round(obj.score * 100)}%
                                        </Text>
                                    </View>
                                ))}
                            </View>
                            {aiSummary ? (
                                <View style={styles.aiSummaryBox}>
                                    <Text style={styles.aiSummaryText}>💬 {aiSummary}</Text>
                                </View>
                            ) : null}
                        </View>
                    )}
                </View>

                {/* ── Tip banner ── */}
                {!imageUri && (
                    <View style={styles.tipCard}>
                        <Text style={styles.tipIcon}>💡</Text>
                        <Text style={styles.tipText}>
                            A photo of the exact spot makes it much easier to find later — even months from now!
                        </Text>
                    </View>
                )}

                {/* ── Summary preview (when all fields filled) ── */}
                {isFormComplete && (
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryTitle}>✅ Ready to save</Text>
                        <Text style={styles.summaryText}>
                            <Text style={{ fontWeight: '700', color: TEXT_PRI }}>{name}</Text>
                            {' will be saved in '}
                            <Text style={{ fontWeight: '700', color: TEXT_PRI }}>
                                {roomStore.rooms.find(r => r.id === roomId)?.name}
                            </Text>
                            {' → '}
                            <Text style={{ fontWeight: '700', color: TEXT_PRI }}>{specificLocation}</Text>
                        </Text>
                    </View>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* ── Footer ── */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.saveBtn, (!isFormComplete || saving) && styles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={saving || !isFormComplete}
                    activeOpacity={0.85}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Text style={styles.saveBtnIcon}>💾</Text>
                            <Text style={styles.saveBtnText}>Save Item</Text>
                        </>
                    )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelLink} onPress={() => navigation.goBack()} disabled={saving}>
                    <Text style={styles.cancelLinkText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
    backBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
    backArrow: { fontSize: 20, color: TEXT_PRI, fontWeight: '600' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT_PRI, letterSpacing: -0.3 },

    // Scroll
    scroll:        { flex: 1, backgroundColor: BG },
    scrollContent: { padding: 16, gap: 12 },

    // Hero
    hero:         { paddingVertical: 8 },
    heroTitle:    { fontSize: 24, fontWeight: '800', color: TEXT_PRI, letterSpacing: -0.5, marginBottom: 4 },
    heroSubtitle: { fontSize: 14, color: BLUE, fontWeight: '500' },

    // Form cards
    formCard: { backgroundColor: CARD, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, gap: 4 },
    fieldGroup: { gap: 0 },
    cardDivider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginVertical: 14 },

    // Inputs
    input:      { backgroundColor: BG, borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: TEXT_PRI },
    inputError: { borderColor: ERROR },
    textArea:   { minHeight: 88, paddingTop: 13 },
    errorText:  { color: ERROR, fontSize: 12, marginTop: 5, fontWeight: '500' },
    charCount:  { fontSize: 11, color: TEXT_HNT, textAlign: 'right', marginTop: 4 },

    // Clear btn
    clearBtn:     { marginTop: 6, alignSelf: 'flex-start' },
    clearBtnText: { fontSize: 12, color: TEXT_SEC, fontWeight: '500' },

    // Photo
    photoBtns: { flexDirection: 'row', gap: 12 },
    photoBtn: { flex: 1, backgroundColor: BG, borderWidth: 1.5, borderColor: TEAL, borderRadius: 14, borderStyle: 'dashed', paddingVertical: 18, alignItems: 'center', gap: 6 },
    photoBtnIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: TEAL + '18', justifyContent: 'center', alignItems: 'center' },
    photoBtnEmoji: { fontSize: 24 },
    photoBtnLabel: { fontSize: 13, fontWeight: '700', color: TEXT_PRI },
    photoBtnSub:   { fontSize: 11, color: TEXT_HNT },

    // Image preview
    imgPreviewWrap: { position: 'relative', borderRadius: 14, overflow: 'hidden', alignSelf: 'center' },
    imgPreview:     { width: 200, height: 200, borderRadius: 14 },
    imgOverlay:     { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 8, padding: 10, backgroundColor: 'rgba(0,0,0,0.35)' },
    imgOverlayBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, paddingVertical: 6 },
    imgOverlayIcon: { fontSize: 14 },
    imgOverlayText: { fontSize: 12, color: '#fff', fontWeight: '600' },

    // Tip card
    tipCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: BLUE + '0D', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: BLUE + '25' },
    tipIcon: { fontSize: 16 },
    tipText: { flex: 1, fontSize: 13, color: BLUE, lineHeight: 19 },

    // Summary
    summaryCard: { backgroundColor: '#F0FFF4', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: '#34C75940' },
    summaryTitle: { fontSize: 13, fontWeight: '700', color: '#34C759', marginBottom: 4 },
    summaryText:  { fontSize: 13, color: TEXT_SEC, lineHeight: 19 },

    // Location
    locationRow:             { marginTop: 12 },
    locationPinBtn:          { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: BG },
    locationPinIcon:         { fontSize: 18 },
    locationPinTitle:        { fontSize: 13, fontWeight: '600', color: TEXT_PRI },
    locationPinSub:          { fontSize: 11, color: TEXT_HNT, marginTop: 1 },
    locationPinChevron:      { fontSize: 20, color: TEXT_HNT },
    locationCaptured:        { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: '#34C75960', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#F0FFF4' },
    locationCapturedIcon:    { fontSize: 18 },
    locationCapturedTitle:   { fontSize: 12, fontWeight: '700', color: '#34C759', marginBottom: 2 },
    locationCapturedCoords:  { fontSize: 11, color: '#6B7280' },
    locationClearBtn:        { fontSize: 14, color: '#B0B7C3', fontWeight: '600', paddingLeft: 4 },

    // Detect button
    detectBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, borderColor: TEAL, backgroundColor: TEAL + '10' },
    detectBtnDisabled: { opacity: 0.6 },
    detectBtnIcon:     { fontSize: 15 },
    detectBtnText:     { fontSize: 13, fontWeight: '700', color: TEAL },

    // Detection results
    detectionResults:  { marginTop: 12, backgroundColor: '#F0FFFE', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: TEAL + '40' },
    detectionTitle:    { fontSize: 12, fontWeight: '700', color: TEAL, marginBottom: 8 },
    detectionTags:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    detectionTag:      { backgroundColor: TEAL + '18', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    detectionTagText:  { fontSize: 12, color: TEAL, fontWeight: '600' },
    aiSummaryBox:      { marginTop: 10, backgroundColor: '#fff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: TEAL + '30' },
    aiSummaryText:     { fontSize: 12, color: '#444', lineHeight: 18 },

    // Footer
    footer: { backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 14, paddingBottom: Platform.OS === 'ios' ? 32 : 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 8, gap: 10 },
    saveBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: BLUE, borderRadius: 14, paddingVertical: 16, gap: 8, shadowColor: BLUE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    saveBtnDisabled: { backgroundColor: '#B0B7C3', shadowOpacity: 0, elevation: 0 },
    saveBtnIcon:     { fontSize: 18 },
    saveBtnText:     { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: -0.2 },
    cancelLink:      { alignItems: 'center', paddingVertical: 6 },
    cancelLinkText:  { fontSize: 15, color: TEXT_SEC, fontWeight: '500' },
});