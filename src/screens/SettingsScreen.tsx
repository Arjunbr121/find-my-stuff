import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Alert, ActivityIndicator, Switch, SafeAreaView,
    StatusBar, Platform, Linking, Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import type { RootNavigationProp } from '../types/navigation';
import { useItemStore, useRoomStore } from '../stores';
import { storage } from '../storage';
import { exportToFile, shareExportFile, pickImportFile, parseImportData, getImportPreview } from '../utils/exportImport';
import { checkStorageSpace, formatBytes, getImageStorageUsage } from '../utils/storage';
import type { UserProfile } from './EditProfileScreen';

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
const NAV_H    = 64;

const STORAGE_KEY_PROFILE = 'user_profile';

// ─── SettingRow ───────────────────────────────────────────────────────────────
const SettingRow: React.FC<{
    icon: string;
    iconBg?: string;
    label: string;
    sublabel?: string;
    onPress?: () => void;
    rightEl?: React.ReactNode;
    danger?: boolean;
    disabled?: boolean;
    showChevron?: boolean;
    badge?: string;
}> = ({ icon, iconBg, label, sublabel, onPress, rightEl, danger, disabled, showChevron = true, badge }) => (
    <TouchableOpacity
        style={[styles.row, disabled && { opacity: 0.45 }]}
        onPress={onPress}
        disabled={disabled || !onPress}
        activeOpacity={onPress ? 0.7 : 1}
    >
        <View style={[styles.rowIconWrap, { backgroundColor: iconBg ?? BG }]}>
            <Text style={styles.rowIcon}>{icon}</Text>
        </View>
        <View style={styles.rowContent}>
            <Text style={[styles.rowLabel, danger && { color: ERROR }]}>{label}</Text>
            {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
        </View>
        {badge ? (
            <View style={styles.rowBadge}>
                <Text style={styles.rowBadgeText}>{badge}</Text>
            </View>
        ) : null}
        {rightEl ?? (showChevron && onPress ? <Text style={styles.chevron}>›</Text> : null)}
    </TouchableOpacity>
);

// ─── Section ──────────────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.card}>{children}</View>
    </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const SettingsScreen: React.FC = () => {
    const navigation = useNavigation<RootNavigationProp>();

    const [loading,       setLoading]       = useState(false);
    const [darkMode,      setDarkMode]      = useState(false);
    const [notifications, setNotifications] = useState(true);
    const [storageInfo,   setStorageInfo]   = useState<{ available: number; total: number; imageUsage: number } | null>(null);
    const [profile,       setProfile]       = useState<UserProfile>({
        name:         'Alex Johnson',
        email:        'alex.j@example.com',
        avatarEmoji:  '👤',
        avatarUri:    '',
    });

    const itemStore = useItemStore();
    const roomStore = useRoomStore();

    // ── Load profile on every focus (so edits reflect immediately on back) ──
    useFocusEffect(
        useCallback(() => {
            loadProfile();
        }, [])
    );

    useEffect(() => { loadStorageInfo(); }, []);

    const loadProfile = async () => {
        try {
            const raw = await SecureStore.getItemAsync(STORAGE_KEY_PROFILE);
            if (raw) {
                const p: UserProfile = JSON.parse(raw);
                setProfile({
                    name:        p.name        || 'Alex Johnson',
                    email:       p.email       || 'alex.j@example.com',
                    avatarEmoji: p.avatarEmoji || '👤',
                    avatarUri:   p.avatarUri   || '',
                });
            }
        } catch { /* use defaults */ }
    };

    const loadStorageInfo = async () => {
        try {
            const spaceInfo  = await checkStorageSpace();
            const imageUsage = await getImageStorageUsage();
            setStorageInfo({ available: spaceInfo.available, total: spaceInfo.total, imageUsage });
        } catch { /* silent */ }
    };

    const handleExport = async () => {
        Alert.alert(
            'Export Data',
            'This exports all items and rooms to a CSV/JSON file. Images are not included.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Export',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const data    = await storage.exportData();
                            const fileUri = await exportToFile(data);
                            await shareExportFile(fileUri);
                            Alert.alert('✅ Success', `Exported ${data.items.length} items and ${data.rooms.length} rooms.`);
                        } catch (e: any) {
                            Alert.alert('Export Failed', e?.message ?? 'Unknown error');
                        } finally { setLoading(false); }
                    },
                },
            ]
        );
    };

    const handleImport = async () => {
        try {
            setLoading(true);
            const fileData = await pickImportFile();
            if (!fileData) { setLoading(false); return; }
            const importData = parseImportData(fileData.content);
            const preview    = getImportPreview(importData);
            Alert.alert(
                'Import Data',
                `Import ${preview.itemCount} items and ${preview.roomCount} rooms?\n\nThis replaces all existing data.`,
                [
                    { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
                    {
                        text: 'Import', style: 'destructive',
                        onPress: async () => {
                            try {
                                await storage.importData({ items: importData.items, rooms: importData.rooms });
                                await roomStore.loadRooms();
                                await itemStore.loadItems();
                                Alert.alert('✅ Success', `Imported ${preview.itemCount} items and ${preview.roomCount} rooms.`);
                            } catch (e: any) {
                                Alert.alert('Import Failed', e?.message ?? 'Unknown error');
                            } finally { setLoading(false); }
                        },
                    },
                ]
            );
        } catch (e: any) {
            Alert.alert('Import Failed', e?.message ?? 'Unknown error');
            setLoading(false);
        }
    };

    const usedPct = storageInfo
        ? Math.min(100, Math.round(((storageInfo.total - storageInfo.available) / storageInfo.total) * 100))
        : 0;

    // Avatar initials fallback
    const initials = profile.name
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: 34 }} />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Profile card ── */}
                <TouchableOpacity
                    style={styles.profileCard}
                    onPress={() => navigation.navigate('EditProfile' as any)}
                    activeOpacity={0.8}
                >
                    {/* Avatar */}
                    <View style={styles.avatarOuter}>
                        {profile.avatarUri ? (
                            <Image source={{ uri: profile.avatarUri }} style={styles.avatarImage} />
                        ) : profile.avatarEmoji && profile.avatarEmoji !== '👤' ? (
                            <View style={styles.avatarEmojiBg}>
                                <Text style={styles.avatarEmojiText}>{profile.avatarEmoji}</Text>
                            </View>
                        ) : (
                            <View style={styles.avatarInitialsBg}>
                                <Text style={styles.avatarInitialsText}>{initials}</Text>
                            </View>
                        )}
                        <View style={styles.avatarOnlineDot} />
                    </View>

                    {/* Info */}
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName} numberOfLines={1}>{profile.name}</Text>
                        <Text style={styles.profileEmail} numberOfLines={1}>{profile.email}</Text>
                        <View style={styles.profileEditHint}>
                            <Text style={styles.profileEditHintText}>Tap to edit profile</Text>
                        </View>
                    </View>

                    <Text style={styles.profileChevron}>›</Text>
                </TouchableOpacity>

                {/* ── Account ── */}
                <Section title="ACCOUNT">
                    <SettingRow
                        icon="🔒"
                        iconBg="#EEF4FF"
                        label="Change Password"
                        sublabel="Update or set app lock password"
                        onPress={() => navigation.navigate('ChangePassword' as any)}
                    />
                </Section>

                {/* ── Inventory Management ── */}
                <Section title="INVENTORY MANAGEMENT">
                    <SettingRow
                        icon="📂"
                        iconBg="#EEF4FF"
                        label="Manage Categories"
                        sublabel="Add, edit or remove categories"
                        onPress={() => navigation.navigate('ManageCategories' as any)}
                    />
                    <View style={styles.rowDivider} />
                    <SettingRow
                        icon="⬆️"
                        iconBg="#F0FFF4"
                        label="Export Data"
                        sublabel="Save backup as CSV/JSON"
                        onPress={handleExport}
                        disabled={loading}
                    />
                    <View style={styles.rowDivider} />
                    <SettingRow
                        icon="⬇️"
                        iconBg="#F0F4FF"
                        label="Import Data"
                        sublabel="Restore from a backup file"
                        onPress={handleImport}
                        disabled={loading}
                    />
                    <View style={styles.rowDivider} />
                    <SettingRow
                        icon="🗑️"
                        iconBg="#FFF0EF"
                        label="Clear All Inventory"
                        sublabel="Permanently delete all data"
                        onPress={() => navigation.navigate('ClearInventory' as any)}
                        disabled={loading}
                        danger
                    />
                </Section>

                {/* ── App Preferences ── */}
                {/* <Section title="APP PREFERENCES"> */}
                    {/* <SettingRow
                        icon="🌙"
                        iconBg="#F0EEFF"
                        label="Dark Mode"
                        sublabel="Switch to dark theme"
                        showChevron={false}
                        rightEl={
                            <Switch
                                value={darkMode}
                                onValueChange={setDarkMode}
                                trackColor={{ false: '#D1D5DB', true: BLUE }}
                                thumbColor="#fff"
                                ios_backgroundColor="#D1D5DB"
                            />
                        }
                    /> */}
                    {/* ── Notifications (coming soon — commented out) ──
                    <View style={styles.rowDivider} />
                    <SettingRow
                        icon="🔔"
                        iconBg="#FFF4E5"
                        label="Notifications"
                        sublabel="Maintenance & expirations"
                        showChevron={false}
                        rightEl={
                            <Switch
                                value={notifications}
                                onValueChange={setNotifications}
                                trackColor={{ false: '#D1D5DB', true: BLUE }}
                                thumbColor="#fff"
                                ios_backgroundColor="#D1D5DB"
                            />
                        }
                    />
                    ── */}
                {/* </Section> */}

                {/* ── Storage ── */}
                <Section title="STORAGE">
                    {storageInfo ? (
                        <>
                            {/* Device storage bar */}
                            <View style={styles.storageRow}>
                                <View style={styles.storageHeaderRow}>
                                    <Text style={styles.storageTitle}>Device Storage</Text>
                                    <Text style={[
                                        styles.storagePct,
                                        usedPct > 80 && { color: ERROR },
                                        usedPct > 60 && usedPct <= 80 && { color: '#FF9500' },
                                    ]}>{usedPct}% used</Text>
                                </View>
                                <View style={styles.storageBarTrack}>
                                    <View style={[
                                        styles.storageBarFill,
                                        { width: `${usedPct}%` as any },
                                        usedPct > 80 && { backgroundColor: ERROR },
                                        usedPct > 60 && usedPct <= 80 && { backgroundColor: '#FF9500' },
                                    ]} />
                                </View>
                                <View style={styles.storageBarLabels}>
                                    <Text style={styles.storageUsed}>
                                        {formatBytes(storageInfo.total - storageInfo.available)} used
                                    </Text>
                                    <Text style={styles.storageFree}>
                                        {formatBytes(storageInfo.total)} total
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.rowDivider} />

                            {/* App usage breakdown */}
                            <View style={styles.storageAppRow}>
                                <Text style={styles.storageTitle}>App Usage</Text>
                            </View>

                            {/* App image bar */}
                            <View style={styles.storageAppBarRow}>
                                <View style={styles.storageAppBarIconWrap}>
                                    <Text style={styles.storageAppBarIcon}>🖼️</Text>
                                </View>
                                <View style={styles.storageAppBarContent}>
                                    <View style={styles.storageAppBarHeaderRow}>
                                        <Text style={styles.storageAppBarLabel}>Photos</Text>
                                        <Text style={styles.storageAppBarValue}>{formatBytes(storageInfo.imageUsage)}</Text>
                                    </View>
                                    <View style={styles.storageBarTrack}>
                                        <View style={[
                                            styles.storageBarFill,
                                            { width: storageInfo.total > 0 ? `${Math.min(100, Math.round((storageInfo.imageUsage / storageInfo.total) * 100))}%` as any : '0%' },
                                            { backgroundColor: '#FF9500' },
                                        ]} />
                                    </View>
                                </View>
                            </View>

                            <View style={[styles.rowDivider, { marginLeft: 14 }]} />

                            {/* Stats grid */}
                            <View style={styles.statsGrid}>
                                {[
                                    { value: String(itemStore.items.length),              label: 'Items',  color: BLUE },
                                    { value: String(roomStore.rooms.length),              label: 'Rooms',  color: '#34C759' },
                                    { value: formatBytes(storageInfo.imageUsage),         label: 'Photos', color: '#FF9500' },
                                    { value: formatBytes(storageInfo.available),          label: 'Free',   color: '#B0B7C3' },
                                ].map((s, idx, arr) => (
                                    <React.Fragment key={s.label}>
                                        <View style={styles.statCell}>
                                            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                                            <Text style={styles.statLabel}>{s.label}</Text>
                                        </View>
                                        {idx < arr.length - 1 && <View style={styles.statDivider} />}
                                    </React.Fragment>
                                ))}
                            </View>
                        </>
                    ) : (
                        <View style={styles.storageLoading}>
                            <ActivityIndicator size="small" color={BLUE} />
                            <Text style={styles.storageLoadingText}>Reading storage…</Text>
                        </View>
                    )}
                </Section>

                {/* ── Help & Support ── */}
                <Section title="HELP & SUPPORT">
                    <SettingRow
                        icon="ℹ️"
                        iconBg="#EEF4FF"
                        label='About "Find My Stuff"'
                        onPress={() => navigation.navigate('About' as any)}
                    />
                    <View style={styles.rowDivider} />
                    <SettingRow
                        icon="❓"
                        iconBg="#EEF4FF"
                        label="Frequently Asked Questions"
                        onPress={() => navigation.navigate('FAQ' as any)}
                    />
                    <View style={styles.rowDivider} />
                    <SettingRow
                        icon="💬"
                        iconBg="#EEF4FF"
                        label="Contact Support"
                        sublabel="support@findmystuff.app"
                        onPress={() => Linking.openURL(
                            'mailto:support@findmystuff.app?subject=Support Request - Find My Stuff&body=Hi, I need help with...'
                        )}
                    />
                </Section>

                {/* ── Footer ── */}
                <View style={styles.footer}>
                    <View style={styles.footerAppIcon}>
                        <Text style={styles.footerAppEmoji}>📋</Text>
                    </View>
                    <Text style={styles.footerAppName}>Find My Stuff</Text>
                    <Text style={styles.footerVersion}>Version 1.0.0 (2026)</Text>
                    <Text style={styles.footerTagline}>
                        Made with <Text style={{ color: ERROR }}>♥</Text> in Bengaluru, for organised homes 🇮🇳
                    </Text>
                </View>

                <View style={{ height: 32 }} />
            </ScrollView>

            {/* ── Loading overlay ── */}
            {loading && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingCard}>
                        <ActivityIndicator size="large" color={BLUE} />
                        <Text style={styles.loadingText}>Please wait…</Text>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 13,
        backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
    },
    backBtn:     { width: 34, height: 34, borderRadius: 10, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
    backArrow:   { fontSize: 20, color: TEXT_PRI, fontWeight: '600' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT_PRI, letterSpacing: -0.3 },

    scroll:        { flex: 1, backgroundColor: BG },
    scrollContent: { paddingTop: 16, paddingBottom: 16 },

    // ── Profile card ──
    profileCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: CARD, marginHorizontal: 16, borderRadius: 18,
        padding: 16, marginBottom: 4, gap: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    },
    avatarOuter:        { position: 'relative' },
    avatarImage:        { width: 56, height: 56, borderRadius: 28 },
    avatarEmojiBg:      { width: 56, height: 56, borderRadius: 28, backgroundColor: BLUE + '15', justifyContent: 'center', alignItems: 'center' },
    avatarEmojiText:    { fontSize: 30 },
    avatarInitialsBg:   { width: 56, height: 56, borderRadius: 28, backgroundColor: BLUE, justifyContent: 'center', alignItems: 'center' },
    avatarInitialsText: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
    avatarOnlineDot:    { position: 'absolute', bottom: 1, right: 1, width: 13, height: 13, borderRadius: 7, backgroundColor: GREEN, borderWidth: 2, borderColor: CARD },
    profileInfo:        { flex: 1, gap: 1 },
    profileName:        { fontSize: 16, fontWeight: '700', color: TEXT_PRI, letterSpacing: -0.2 },
    profileEmail:       { fontSize: 12, color: TEXT_SEC },
    profileEditHint:    { marginTop: 4 },
    profileEditHintText:{ fontSize: 11, color: BLUE, fontWeight: '600' },
    profileChevron:     { fontSize: 22, color: TEXT_HNT },

    // ── Sections ──
    section:      { marginHorizontal: 16, marginTop: 20 },
    sectionTitle: { fontSize: 11, fontWeight: '700', color: TEXT_SEC, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
    card:         { backgroundColor: CARD, borderRadius: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, overflow: 'hidden' },

    // ── Rows ──
    row:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 12 },
    rowIconWrap:  { width: 36, height: 36, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
    rowIcon:      { fontSize: 18 },
    rowContent:   { flex: 1 },
    rowLabel:     { fontSize: 15, fontWeight: '500', color: TEXT_PRI },
    rowSublabel:  { fontSize: 11, color: TEXT_HNT, marginTop: 1 },
    chevron:      { fontSize: 20, color: TEXT_HNT, fontWeight: '300' },
    rowDivider:   { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginLeft: 62 },
    rowBadge:     { backgroundColor: BLUE + '15', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
    rowBadgeText: { fontSize: 11, fontWeight: '700', color: BLUE },

    // ── Storage ──
    storageRow:           { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10 },
    storageHeaderRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    storageTitle:         { fontSize: 12, fontWeight: '700', color: TEXT_PRI },
    storagePct:           { fontSize: 12, fontWeight: '700', color: BLUE },
    storageBarTrack:      { height: 7, borderRadius: 4, backgroundColor: BG, overflow: 'hidden', marginBottom: 6 },
    storageBarFill:       { height: '100%', backgroundColor: BLUE, borderRadius: 4 },
    storageBarLabels:     { flexDirection: 'row', justifyContent: 'space-between' },
    storageUsed:          { fontSize: 11, color: TEXT_SEC, fontWeight: '500' },
    storageFree:          { fontSize: 11, color: TEXT_HNT },
    storageAppRow:        { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
    storageAppBarRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 12, gap: 10 },
    storageAppBarIconWrap:{ width: 34, height: 34, borderRadius: 9, backgroundColor: '#FFF4E5', justifyContent: 'center', alignItems: 'center' },
    storageAppBarIcon:    { fontSize: 18 },
    storageAppBarContent: { flex: 1 },
    storageAppBarHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    storageAppBarLabel:   { fontSize: 13, fontWeight: '500', color: TEXT_PRI },
    storageAppBarValue:   { fontSize: 12, fontWeight: '600', color: '#FF9500' },
    storageLoading:       { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 18, justifyContent: 'center' },
    storageLoadingText:   { fontSize: 13, color: TEXT_SEC },
    statsGrid:        { flexDirection: 'row', paddingVertical: 14 },
    statCell:         { flex: 1, alignItems: 'center' },
    statDivider:      { width: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginVertical: 4 },
    statValue:        { fontSize: 20, fontWeight: '800', marginBottom: 2, letterSpacing: -0.3 },
    statLabel:        { fontSize: 11, color: TEXT_SEC, fontWeight: '500' },

    // ── Footer ──
    footer:         { alignItems: 'center', paddingVertical: 28, gap: 6 },
    footerAppIcon:  { width: 52, height: 52, borderRadius: 14, backgroundColor: BLUE + '12', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    footerAppEmoji: { fontSize: 28 },
    footerAppName:  { fontSize: 15, fontWeight: '800', color: TEXT_PRI, letterSpacing: -0.3 },
    footerVersion:  { fontSize: 12, color: TEXT_HNT },
    footerTagline:  { fontSize: 12, color: TEXT_SEC, textAlign: 'center' },

    // ── Loading ──
    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
    loadingCard:    { backgroundColor: CARD, borderRadius: 16, padding: 28, alignItems: 'center', gap: 12 },
    loadingText:    { fontSize: 14, color: TEXT_SEC, fontWeight: '500' },
});