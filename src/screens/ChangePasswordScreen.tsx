import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, SafeAreaView, StatusBar, Alert,
    ActivityIndicator, Switch, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
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

const KEY_PASSWORD   = 'app_password';
const KEY_LOCK       = 'app_lock_enabled';
const KEY_BIOMETRIC  = 'app_biometric_enabled';

// ─── Password field with show/hide ───────────────────────────────────────────
const PasswordInput: React.FC<{
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    error?: string;
    onBlur?: () => void;
}> = ({ label, value, onChange, placeholder, error, onBlur }) => {
    const [show, setShow] = useState(false);
    return (
        <View style={pwStyles.wrap}>
            <Text style={pwStyles.label}>{label}</Text>
            <View style={[pwStyles.inputWrap, !!error && pwStyles.inputWrapError]}>
                <TextInput
                    style={pwStyles.input}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={placeholder ?? '••••••••'}
                    placeholderTextColor={TEXT_HNT}
                    secureTextEntry={!show}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setShow(s => !s)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={pwStyles.eyeIcon}>{show ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
            </View>
            {error && <Text style={pwStyles.error}>⚠ {error}</Text>}
        </View>
    );
};

const pwStyles = StyleSheet.create({
    wrap: { marginBottom: 16 },
    label: { fontSize: 11, fontWeight: '700', color: TEXT_SEC, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
    inputWrap: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: BG, borderWidth: 1.5, borderColor: BORDER,
        borderRadius: 10, paddingHorizontal: 14,
    },
    inputWrapError: { borderColor: ERROR },
    input: { flex: 1, fontSize: 15, color: TEXT_PRI, paddingVertical: 12 },
    eyeIcon: { fontSize: 18, paddingLeft: 8 },
    error: { color: ERROR, fontSize: 12, marginTop: 5, fontWeight: '500' },
});

// ─── Strength meter ───────────────────────────────────────────────────────────
const StrengthMeter: React.FC<{ password: string }> = ({ password }) => {
    const getStrength = (): { score: number; label: string; color: string } => {
        if (!password) return { score: 0, label: '', color: BORDER };
        let score = 0;
        if (password.length >= 8)  score++;
        if (password.length >= 12) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        if (score <= 1) return { score, label: 'Weak',   color: ERROR };
        if (score <= 3) return { score, label: 'Fair',   color: '#FF9500' };
        if (score <= 4) return { score, label: 'Good',   color: BLUE };
        return             { score, label: 'Strong', color: GREEN };
    };

    const { score, label, color } = getStrength();
    if (!password) return null;

    return (
        <View style={smStyles.wrap}>
            <View style={smStyles.bars}>
                {[1,2,3,4,5].map(i => (
                    <View key={i} style={[smStyles.bar, { backgroundColor: i <= score ? color : BORDER }]} />
                ))}
            </View>
            <Text style={[smStyles.label, { color }]}>{label}</Text>
        </View>
    );
};

const smStyles = StyleSheet.create({
    wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
    bars: { flexDirection: 'row', gap: 4, flex: 1 },
    bar: { flex: 1, height: 4, borderRadius: 2 },
    label: { fontSize: 12, fontWeight: '700', minWidth: 48, textAlign: 'right' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ChangePasswordScreen() {
    const navigation = useNavigation<RootNavigationProp>();

    const [currentPw,    setCurrentPw]    = useState('');
    const [newPw,        setNewPw]        = useState('');
    const [confirmPw,    setConfirmPw]    = useState('');
    const [saving,       setSaving]       = useState(false);
    const [touched,      setTouched]      = useState<Record<string, boolean>>({});
    const [errors,       setErrors]       = useState<Record<string, string>>({});

    const [lockEnabled,      setLockEnabled]      = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [biometricAvail,   setBiometricAvail]   = useState(false);
    const [hasPassword,      setHasPassword]      = useState(false);

    useEffect(() => { loadSettings(); }, []);

    const loadSettings = async () => {
        try {
            const [pw, lock, bio] = await Promise.all([
                SecureStore.getItemAsync(KEY_PASSWORD),
                SecureStore.getItemAsync(KEY_LOCK),
                SecureStore.getItemAsync(KEY_BIOMETRIC),
            ]);
            setHasPassword(!!pw);
            setLockEnabled(lock === 'true');
            setBiometricEnabled(bio === 'true');

            // Check if device supports biometrics
            const compatible = await LocalAuthentication.hasHardwareAsync();
            const enrolled   = await LocalAuthentication.isEnrolledAsync();
            setBiometricAvail(compatible && enrolled);
        } catch { /* use defaults */ }
    };

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (hasPassword && !currentPw)          e.currentPw  = 'Enter your current password';
        if (!newPw)                              e.newPw      = 'Enter a new password';
        else if (newPw.length < 6)               e.newPw      = 'Password must be at least 6 characters';
        if (!confirmPw)                          e.confirmPw  = 'Confirm your new password';
        else if (newPw !== confirmPw)            e.confirmPw  = 'Passwords do not match';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSavePassword = async () => {
        setTouched({ currentPw: true, newPw: true, confirmPw: true });
        if (!validate()) return;
        setSaving(true);
        try {
            // Verify current password if one exists
            if (hasPassword) {
                const stored = await SecureStore.getItemAsync(KEY_PASSWORD);
                if (stored !== currentPw) {
                    setErrors(e => ({ ...e, currentPw: 'Incorrect current password' }));
                    setSaving(false);
                    return;
                }
            }
            await SecureStore.setItemAsync(KEY_PASSWORD, newPw);
            setHasPassword(true);
            setCurrentPw(''); setNewPw(''); setConfirmPw('');
            setTouched({});
            Alert.alert('✅ Password Updated', 'Your password has been saved securely on this device.');
        } catch {
            Alert.alert('Error', 'Failed to save password. Please try again.');
        } finally { setSaving(false); }
    };

    const handleToggleLock = async (value: boolean) => {
        if (value && !hasPassword) {
            Alert.alert('Set a Password First', 'Please create a password before enabling app lock.');
            return;
        }
        if (value) {
            // Confirm with biometric or password before enabling
            const auth = await tryAuthenticate();
            if (!auth) return;
        }
        setLockEnabled(value);
        await SecureStore.setItemAsync(KEY_LOCK, value.toString());
    };

    const handleToggleBiometric = async (value: boolean) => {
        if (value) {
            if (!biometricAvail) {
                Alert.alert('Not Available', 'No biometrics enrolled on this device. Set up Face ID or fingerprint in your device settings.');
                return;
            }
            // Prompt biometric to confirm enabling
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Confirm your identity to enable biometric unlock',
                fallbackLabel: 'Use Password',
            });
            if (!result.success) return;
        }
        setBiometricEnabled(value);
        await SecureStore.setItemAsync(KEY_BIOMETRIC, value.toString());
    };

    const tryAuthenticate = async (): Promise<boolean> => {
        if (biometricEnabled && biometricAvail) {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Confirm your identity',
                fallbackLabel: 'Use Password',
            });
            return result.success;
        }
        return true; // fallback: allow without biometric
    };

    const handleRemovePassword = () => {
        Alert.alert(
            'Remove Password',
            'This will disable app lock and remove your stored password.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove', style: 'destructive',
                    onPress: async () => {
                        await SecureStore.deleteItemAsync(KEY_PASSWORD);
                        await SecureStore.setItemAsync(KEY_LOCK,      'false');
                        await SecureStore.setItemAsync(KEY_BIOMETRIC, 'false');
                        setHasPassword(false);
                        setLockEnabled(false);
                        setBiometricEnabled(false);
                    },
                },
            ]
        );
    };

    const biometricType = Platform.OS === 'ios' ? 'Face ID' : 'Fingerprint';

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Password & Security</Text>
                <View style={{ width: 34 }} />
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                {/* Status banner */}
                <View style={[styles.statusBanner, { backgroundColor: hasPassword ? GREEN + '15' : '#FF950015' }]}>
                    <Text style={styles.statusIcon}>{hasPassword ? '🔒' : '🔓'}</Text>
                    <View>
                        <Text style={[styles.statusTitle, { color: hasPassword ? GREEN : '#FF9500' }]}>
                            {hasPassword ? 'Password Protected' : 'No Password Set'}
                        </Text>
                        <Text style={styles.statusSub}>
                            {hasPassword
                                ? 'Your app is secured with a local password'
                                : 'Set a password to lock your inventory'}
                        </Text>
                    </View>
                </View>

                {/* Change / Set Password */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{hasPassword ? 'CHANGE PASSWORD' : 'SET PASSWORD'}</Text>
                    <View style={styles.card}>
                        {hasPassword && (
                            <PasswordInput
                                label="Current Password"
                                value={currentPw}
                                onChange={v => { setCurrentPw(v); setErrors(e => ({ ...e, currentPw: undefined as any })); }}
                                onBlur={() => setTouched(t => ({ ...t, currentPw: true }))}
                                error={touched.currentPw ? errors.currentPw : undefined}
                            />
                        )}
                        <PasswordInput
                            label="New Password"
                            value={newPw}
                            onChange={v => { setNewPw(v); setErrors(e => ({ ...e, newPw: undefined as any })); }}
                            onBlur={() => setTouched(t => ({ ...t, newPw: true }))}
                            placeholder="Min. 6 characters"
                            error={touched.newPw ? errors.newPw : undefined}
                        />
                        <StrengthMeter password={newPw} />
                        <View style={{ marginTop: 12 }}>
                            <PasswordInput
                                label="Confirm New Password"
                                value={confirmPw}
                                onChange={v => { setConfirmPw(v); setErrors(e => ({ ...e, confirmPw: undefined as any })); }}
                                onBlur={() => setTouched(t => ({ ...t, confirmPw: true }))}
                                error={touched.confirmPw ? errors.confirmPw : undefined}
                            />
                        </View>

                        {/* Password rules */}
                        <View style={styles.rulesList}>
                            {[
                                { rule: 'At least 6 characters',         met: newPw.length >= 6 },
                                { rule: 'Contains uppercase letter',      met: /[A-Z]/.test(newPw) },
                                { rule: 'Contains a number',             met: /[0-9]/.test(newPw) },
                                { rule: 'Contains a special character',  met: /[^A-Za-z0-9]/.test(newPw) },
                            ].map(({ rule, met }) => (
                                <View key={rule} style={styles.ruleRow}>
                                    <Text style={[styles.ruleIcon, { color: met ? GREEN : TEXT_HNT }]}>
                                        {met ? '✓' : '○'}
                                    </Text>
                                    <Text style={[styles.ruleText, met && { color: GREEN }]}>{rule}</Text>
                                </View>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                            onPress={handleSavePassword}
                            disabled={saving}
                        >
                            {saving
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={styles.saveBtnText}>
                                    {hasPassword ? 'Update Password' : 'Set Password'}
                                  </Text>
                            }
                        </TouchableOpacity>

                        {hasPassword && (
                            <TouchableOpacity style={styles.removeBtn} onPress={handleRemovePassword}>
                                <Text style={styles.removeBtnText}>Remove Password</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* App Lock */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>APP LOCK</Text>
                    <View style={styles.card}>
                        <View style={styles.toggleRow}>
                            <View style={styles.toggleLeft}>
                                <View style={[styles.toggleIcon, { backgroundColor: BLUE + '15' }]}>
                                    <Text>🔐</Text>
                                </View>
                                <View>
                                    <Text style={styles.toggleLabel}>Lock App on Close</Text>
                                    <Text style={styles.toggleSub}>Require password when reopening</Text>
                                </View>
                            </View>
                            <Switch
                                value={lockEnabled}
                                onValueChange={handleToggleLock}
                                trackColor={{ false: '#D1D5DB', true: BLUE }}
                                thumbColor="#fff"
                                ios_backgroundColor="#D1D5DB"
                            />
                        </View>

                        <View style={styles.rowDivider} />

                        <View style={styles.toggleRow}>
                            <View style={styles.toggleLeft}>
                                <View style={[styles.toggleIcon, { backgroundColor: GREEN + '15', opacity: biometricAvail ? 1 : 0.5 }]}>
                                    <Text>{Platform.OS === 'ios' ? '🧑' : '👆'}</Text>
                                </View>
                                <View style={{ opacity: biometricAvail ? 1 : 0.5 }}>
                                    <Text style={styles.toggleLabel}>{biometricType}</Text>
                                    <Text style={styles.toggleSub}>
                                        {biometricAvail
                                            ? `Unlock with ${biometricType}`
                                            : `${biometricType} not available on this device`}
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={biometricEnabled}
                                onValueChange={handleToggleBiometric}
                                disabled={!biometricAvail}
                                trackColor={{ false: '#D1D5DB', true: GREEN }}
                                thumbColor="#fff"
                                ios_backgroundColor="#D1D5DB"
                            />
                        </View>
                    </View>
                </View>

                {/* Info note */}
                <View style={styles.infoNote}>
                    <Text style={styles.infoNoteIcon}>ℹ️</Text>
                    <Text style={styles.infoNoteText}>
                        Your password is stored securely on this device only and never sent to any server.
                        If you forget your password, you will need to reinstall the app.
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 13,
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
    },
    backBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
    backArrow: { fontSize: 20, color: TEXT_PRI, fontWeight: '600' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT_PRI, letterSpacing: -0.3 },

    scroll: { flex: 1, backgroundColor: BG },
    scrollContent: { padding: 16, gap: 14 },

    // Status banner
    statusBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderRadius: 14, padding: 16,
    },
    statusIcon: { fontSize: 28 },
    statusTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
    statusSub: { fontSize: 12, color: TEXT_SEC },

    // Sections
    section: { gap: 8 },
    sectionTitle: { fontSize: 11, fontWeight: '700', color: TEXT_SEC, letterSpacing: 0.8, textTransform: 'uppercase' },
    card: {
        backgroundColor: CARD, borderRadius: 16, padding: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },

    // Password rules
    rulesList: { gap: 6, marginTop: 4, marginBottom: 16 },
    ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    ruleIcon: { fontSize: 13, fontWeight: '700', width: 16 },
    ruleText: { fontSize: 12, color: TEXT_SEC },

    // Save button
    saveBtn: {
        backgroundColor: BLUE, borderRadius: 12,
        paddingVertical: 14, alignItems: 'center',
        shadowColor: BLUE, shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
    },
    saveBtnDisabled: { opacity: 0.6, shadowOpacity: 0 },
    saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    removeBtn: { alignItems: 'center', marginTop: 12, paddingVertical: 6 },
    removeBtnText: { fontSize: 13, color: ERROR, fontWeight: '500' },

    // Toggle rows
    toggleRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingVertical: 4,
    },
    toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    toggleIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    toggleLabel: { fontSize: 15, fontWeight: '600', color: TEXT_PRI, marginBottom: 2 },
    toggleSub: { fontSize: 12, color: TEXT_SEC },
    rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginVertical: 12 },

    // Info note
    infoNote: {
        flexDirection: 'row', gap: 10,
        backgroundColor: BLUE + '0D', borderRadius: 12,
        padding: 12, borderWidth: 1.5, borderColor: BLUE + '25',
    },
    infoNoteIcon: { fontSize: 15 },
    infoNoteText: { flex: 1, fontSize: 12, color: BLUE, lineHeight: 18, fontWeight: '400' },
});