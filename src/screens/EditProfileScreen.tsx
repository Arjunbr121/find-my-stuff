import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, SafeAreaView, StatusBar, Alert,
    ActivityIndicator, Platform, Image, Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import type { RootNavigationProp } from '../types/navigation';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const BLUE     = '#007AFF';
const BG       = '#F5F6FA';
const CARD     = '#FFFFFF';
const BORDER   = '#E8E8EE';
const ERROR    = '#FF3B30';
const GREEN    = '#34C759';
const TEXT_PRI = '#1A1A2E';
const TEXT_SEC = '#6B7280';
const TEXT_HNT = '#B0B7C3';

// ─── Storage ──────────────────────────────────────────────────────────────────
/**
 * Key used to store user profile in expo-secure-store.
 * Shape: UserProfile { name, email, avatarUri?, avatarEmoji? }
 */
export const STORAGE_KEY_PROFILE = 'user_profile';

export interface UserProfile {
    name:          string;
    email:         string;
    avatarUri?:    string;
    avatarEmoji?:  string;
}

// ─── Avatar emojis ────────────────────────────────────────────────────────────
const AVATAR_EMOJIS = [
    '👤','😊','😎','🧑','👩','👨',
    '🧔','👱','🧕','🎅','🦸','🧙',
    '🧑‍💻','👩‍🎤','🧑‍🚀','🦊',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const FieldLabel: React.FC<{ label: string }> = ({ label }) => (
    <Text style={fS.label}>{label}</Text>
);
const fS = StyleSheet.create({
    label: { fontSize: 11, fontWeight: '700', color: TEXT_SEC, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function EditProfileScreen() {
    const navigation = useNavigation<RootNavigationProp>();

    const [name,            setName]            = useState('Alex Johnson');
    const [email,           setEmail]           = useState('alex.j@example.com');
    const [avatarUri,       setAvatarUri]       = useState('');
    const [avatarEmoji,     setAvatarEmoji]     = useState('👤');
    const [saving,          setSaving]          = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [touched,         setTouched]         = useState<Record<string, boolean>>({});
    const [errors,          setErrors]          = useState<{ name?: string; email?: string }>({});
    const [saved,           setSaved]           = useState(false);

    // Animate avatar ring on emoji picker open
    const ringAnim   = useRef(new Animated.Value(1)).current;
    const emojiAnim  = useRef(new Animated.Value(0)).current;

    useEffect(() => { loadProfile(); }, []);

    useEffect(() => {
        Animated.spring(emojiAnim, {
            toValue: showEmojiPicker ? 1 : 0,
            useNativeDriver: true, tension: 100, friction: 10,
        }).start();
    }, [showEmojiPicker]);

    const loadProfile = async () => {
        try {
            const raw = await SecureStore.getItemAsync(STORAGE_KEY_PROFILE);
            if (raw) {
                const p: UserProfile = JSON.parse(raw);
                setName(p.name       ?? 'Alex Johnson');
                setEmail(p.email     ?? '');
                setAvatarUri(p.avatarUri   ?? '');
                setAvatarEmoji(p.avatarEmoji ?? '👤');
            }
        } catch { /* use defaults */ }
    };

    const validate = (): boolean => {
        const e: typeof errors = {};
        if (!name.trim())                             e.name  = 'Name is required';
        if (!email.trim())                            e.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(email.trim())) e.email = 'Enter a valid email address';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        setTouched({ name: true, email: true });
        if (!validate()) return;
        setSaving(true);
        try {
            const profile: UserProfile = {
                name: name.trim(), email: email.trim(),
                avatarUri, avatarEmoji,
            };
            await SecureStore.setItemAsync(STORAGE_KEY_PROFILE, JSON.stringify(profile));
            setSaved(true);
            setTimeout(() => {
                setSaved(false);
                navigation.goBack();
            }, 800);
        } catch {
            Alert.alert('Error', 'Failed to save profile. Please try again.');
        } finally { setSaving(false); }
    };

    const handlePickAvatar = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Allow photo access to set a profile picture.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
        });
        if (!result.canceled && result.assets?.length) {
            setAvatarUri(result.assets[0].uri);
            setShowEmojiPicker(false);
        }
    };

    const handleTakePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Allow camera access to take a profile photo.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true, aspect: [1, 1], quality: 0.8,
        });
        if (!result.canceled && result.assets?.length) {
            setAvatarUri(result.assets[0].uri);
            setShowEmojiPicker(false);
        }
    };

    const pulseAvatar = () => {
        Animated.sequence([
            Animated.spring(ringAnim, { toValue: 1.08, useNativeDriver: true, tension: 200, friction: 6 }),
            Animated.spring(ringAnim, { toValue: 1,    useNativeDriver: true, tension: 200, friction: 6 }),
        ]).start();
    };

    const emojiGridHeight = emojiAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 220] });
    const emojiOpacity    = emojiAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
                    {saving ? (
                        <ActivityIndicator size="small" color={BLUE} />
                    ) : saved ? (
                        <Text style={styles.savedText}>✓ Saved</Text>
                    ) : (
                        <Text style={styles.saveText}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* ── Avatar hero ── */}
                <View style={styles.avatarHero}>
                    {/* Glowing ring */}
                    <Animated.View style={[styles.avatarRing, { transform: [{ scale: ringAnim }] }]}>
                        <TouchableOpacity
                            style={styles.avatarTouchable}
                            onPress={() => { pulseAvatar(); setShowEmojiPicker(s => !s); }}
                            activeOpacity={0.9}
                        >
                            {avatarUri ? (
                                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                            ) : (
                                <View style={styles.avatarEmojiBg}>
                                    <Text style={styles.avatarEmojiText}>{avatarEmoji}</Text>
                                </View>
                            )}
                            {/* Camera badge */}
                            <View style={styles.cameraBadge}>
                                <Text style={styles.cameraBadgeIcon}>✏️</Text>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Name preview */}
                    <Text style={styles.avatarName}>{name.trim() || 'Your Name'}</Text>
                    <Text style={styles.avatarEmail}>{email.trim() || 'your@email.com'}</Text>

                    {/* Action buttons */}
                    <View style={styles.avatarActions}>
                        <TouchableOpacity style={styles.avatarActionBtn} onPress={handleTakePhoto} activeOpacity={0.75}>
                            <Text style={styles.avatarActionIcon}>📷</Text>
                            <Text style={styles.avatarActionText}>Camera</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.avatarActionBtn} onPress={handlePickAvatar} activeOpacity={0.75}>
                            <Text style={styles.avatarActionIcon}>🖼️</Text>
                            <Text style={styles.avatarActionText}>Library</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.avatarActionBtn, showEmojiPicker && styles.avatarActionBtnActive]}
                            onPress={() => setShowEmojiPicker(s => !s)}
                            activeOpacity={0.75}
                        >
                            <Text style={styles.avatarActionIcon}>😊</Text>
                            <Text style={[styles.avatarActionText, showEmojiPicker && { color: BLUE }]}>Emoji</Text>
                        </TouchableOpacity>
                        {(avatarUri || avatarEmoji !== '👤') && (
                            <TouchableOpacity
                                style={[styles.avatarActionBtn, { borderColor: ERROR + '40' }]}
                                onPress={() => { setAvatarUri(''); setAvatarEmoji('👤'); }}
                                activeOpacity={0.75}
                            >
                                <Text style={styles.avatarActionIcon}>🗑️</Text>
                                <Text style={[styles.avatarActionText, { color: ERROR }]}>Remove</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Emoji picker — animated */}
                    <Animated.View style={[styles.emojiGrid, { maxHeight: emojiGridHeight, opacity: emojiOpacity, overflow: 'hidden' }]}>
                        {AVATAR_EMOJIS.map(e => (
                            <TouchableOpacity
                                key={e}
                                style={[styles.emojiOption, avatarEmoji === e && !avatarUri && styles.emojiOptionSelected]}
                                onPress={() => { setAvatarEmoji(e); setAvatarUri(''); setShowEmojiPicker(false); }}
                                activeOpacity={0.75}
                            >
                                <Text style={styles.emojiOptionText}>{e}</Text>
                            </TouchableOpacity>
                        ))}
                    </Animated.View>
                </View>

                {/* ── Profile info card ── */}
                <View style={styles.sectionLabel}>
                    <Text style={styles.sectionLabelText}>PROFILE INFORMATION</Text>
                </View>

                <View style={styles.card}>
                    {/* Full name */}
                    <View style={styles.fieldGroup}>
                        <FieldLabel label="Full Name" />
                        <View style={[styles.inputWrap, errors.name && touched.name && styles.inputWrapError]}>
                            <Text style={styles.inputLeadIcon}>👤</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={v => { setName(v); setErrors(e => ({ ...e, name: undefined })); }}
                                onBlur={() => setTouched(t => ({ ...t, name: true }))}
                                placeholder="Your full name"
                                placeholderTextColor={TEXT_HNT}
                            />
                            {name.trim() && <Text style={styles.inputCheckmark}>✓</Text>}
                        </View>
                        {errors.name && touched.name && <Text style={styles.errorText}>⚠ {errors.name}</Text>}
                    </View>

                    <View style={styles.cardDivider} />

                    {/* Email */}
                    <View style={styles.fieldGroup}>
                        <FieldLabel label="Email Address" />
                        <View style={[styles.inputWrap, errors.email && touched.email && styles.inputWrapError]}>
                            <Text style={styles.inputLeadIcon}>✉️</Text>
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={v => { setEmail(v); setErrors(e => ({ ...e, email: undefined })); }}
                                onBlur={() => setTouched(t => ({ ...t, email: true }))}
                                placeholder="your@email.com"
                                placeholderTextColor={TEXT_HNT}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            {/\S+@\S+\.\S+/.test(email) && <Text style={styles.inputCheckmark}>✓</Text>}
                        </View>
                        {errors.email && touched.email && <Text style={styles.errorText}>⚠ {errors.email}</Text>}
                    </View>
                </View>

                {/* ── Security shortcut ── */}
                <View style={styles.sectionLabel}>
                    <Text style={styles.sectionLabelText}>SECURITY</Text>
                </View>

                <TouchableOpacity
                    style={styles.securityCard}
                    onPress={() => (navigation as any).navigate('ChangePassword')}
                    activeOpacity={0.75}
                >
                    <View style={styles.securityIconWrap}>
                        <Text style={styles.securityIcon}>🔒</Text>
                    </View>
                    <View style={styles.securityContent}>
                        <Text style={styles.securityTitle}>Password & Security</Text>
                        <Text style={styles.securitySub}>Change password · Biometric unlock</Text>
                    </View>
                    <View style={styles.chevronWrap}>
                        <Text style={styles.chevron}>›</Text>
                    </View>
                </TouchableOpacity>

                {/* ── Account info note ── */}
                <View style={styles.noteCard}>
                    <Text style={styles.noteIcon}>ℹ️</Text>
                    <Text style={styles.noteText}>
                        Your profile is stored securely on this device only.
                        The key <Text style={{ fontWeight: '700', color: TEXT_PRI }}>"user_profile"</Text> is
                        saved via <Text style={{ fontWeight: '700', color: TEXT_PRI }}>expo-secure-store</Text>.
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* ── Save footer ── */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.footerSaveBtn, saving && styles.footerSaveBtnDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.85}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : saved ? (
                        <>
                            <Text style={styles.footerSaveBtnIcon}>✅</Text>
                            <Text style={styles.footerSaveBtnText}>Profile Saved!</Text>
                        </>
                    ) : (
                        <>
                            <Text style={styles.footerSaveBtnIcon}>💾</Text>
                            <Text style={styles.footerSaveBtnText}>Save Profile</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },

    // Header
    header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
    backBtn:     { width: 34, height: 34, borderRadius: 10, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
    backArrow:   { fontSize: 20, color: TEXT_PRI, fontWeight: '600' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT_PRI, letterSpacing: -0.3 },
    saveBtn:     { paddingHorizontal: 4 },
    saveText:    { fontSize: 16, fontWeight: '700', color: BLUE },
    savedText:   { fontSize: 15, fontWeight: '700', color: GREEN },

    scroll:        { flex: 1, backgroundColor: BG },
    scrollContent: { padding: 16, gap: 12 },

    // Avatar hero
    avatarHero:    { alignItems: 'center', paddingVertical: 24, gap: 12, backgroundColor: CARD, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    avatarRing:    { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: BLUE + '30', padding: 3 },
    avatarTouchable: { width: '100%', height: '100%', position: 'relative' },
    avatarImage:   { width: '100%', height: '100%', borderRadius: 50 },
    avatarEmojiBg: { width: '100%', height: '100%', borderRadius: 50, backgroundColor: BLUE + '15', justifyContent: 'center', alignItems: 'center' },
    avatarEmojiText: { fontSize: 44 },
    cameraBadge:   { position: 'absolute', bottom: -2, right: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: BLUE, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
    cameraBadgeIcon: { fontSize: 11 },
    avatarName:    { fontSize: 20, fontWeight: '800', color: TEXT_PRI, letterSpacing: -0.3 },
    avatarEmail:   { fontSize: 13, color: TEXT_SEC },

    // Avatar action buttons
    avatarActions:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
    avatarActionBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: BG, borderWidth: 1.5, borderColor: BORDER },
    avatarActionBtnActive: { borderColor: BLUE, backgroundColor: BLUE + '10' },
    avatarActionIcon:   { fontSize: 14 },
    avatarActionText:   { fontSize: 12, fontWeight: '600', color: TEXT_SEC },

    // Emoji grid
    emojiGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%', justifyContent: 'center', paddingTop: 4 },
    emojiOption:       { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
    emojiOptionSelected: { backgroundColor: BLUE + '20', borderWidth: 2, borderColor: BLUE },
    emojiOptionText:   { fontSize: 26 },

    // Section labels
    sectionLabel:     { paddingTop: 4 },
    sectionLabelText: { fontSize: 11, fontWeight: '700', color: TEXT_SEC, letterSpacing: 0.8, textTransform: 'uppercase' },

    // Card
    card:        { backgroundColor: CARD, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, overflow: 'hidden' },
    fieldGroup:  { padding: 16 },
    cardDivider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginHorizontal: 16 },

    // Input with leading icon + checkmark
    inputWrap:      { flexDirection: 'row', alignItems: 'center', backgroundColor: BG, borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 12 },
    inputWrapError: { borderColor: ERROR },
    inputLeadIcon:  { fontSize: 16, marginRight: 8 },
    input:          { flex: 1, fontSize: 15, color: TEXT_PRI, paddingVertical: 13 },
    inputCheckmark: { fontSize: 14, color: GREEN, fontWeight: '700', marginLeft: 6 },
    errorText:      { color: ERROR, fontSize: 12, marginTop: 5, fontWeight: '500' },

    // Security card
    securityCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    securityIconWrap:{ width: 44, height: 44, borderRadius: 12, backgroundColor: BLUE + '12', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    securityIcon:    { fontSize: 22 },
    securityContent: { flex: 1 },
    securityTitle:   { fontSize: 15, fontWeight: '600', color: TEXT_PRI, marginBottom: 2 },
    securitySub:     { fontSize: 12, color: TEXT_SEC },
    chevronWrap:     { width: 28, height: 28, borderRadius: 8, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
    chevron:         { fontSize: 18, color: TEXT_HNT, fontWeight: '600' },

    // Note card
    noteCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: BLUE + '0D', borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: BLUE + '25' },
    noteIcon: { fontSize: 15 },
    noteText: { flex: 1, fontSize: 12, color: BLUE, lineHeight: 18 },

    // Footer
    footer:               { backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 14, paddingBottom: Platform.OS === 'ios' ? 32 : 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 8 },
    footerSaveBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: BLUE, borderRadius: 14, paddingVertical: 16, gap: 8, shadowColor: BLUE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    footerSaveBtnDisabled:{ opacity: 0.6, shadowOpacity: 0 },
    footerSaveBtnIcon:    { fontSize: 18 },
    footerSaveBtnText:    { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: -0.2 },
});