import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    SafeAreaView, StatusBar, Animated, Platform, ActivityIndicator,
} from 'react-native';
import SecureStore from '../utils/secureStorage';
import * as LocalAuthentication from 'expo-local-authentication';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const BLUE     = '#007AFF';
const ERROR    = '#FF3B30';
const TEXT_PRI = '#1A1A2E';
const TEXT_SEC = '#6B7280';
const TEXT_HNT = '#B0B7C3';
const BORDER   = '#E8E8EE';

const KEY_PASSWORD  = 'app_password';
const KEY_BIOMETRIC = 'app_biometric_enabled';

interface LockScreenProps {
    onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
    const [password,       setPassword]       = useState('');
    const [showPassword,   setShowPassword]   = useState(false);
    const [error,          setError]          = useState('');
    const [checking,       setChecking]       = useState(false);
    const [biometricAvail, setBiometricAvail] = useState(false);
    const [attempts,       setAttempts]       = useState(0);

    const shakeAnim  = useRef(new Animated.Value(0)).current;
    const fadeAnim   = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        checkBiometricAndPrompt();
    }, []);

    const checkBiometricAndPrompt = async () => {
        try {
            const bioEnabled = await SecureStore.getItemAsync(KEY_BIOMETRIC);
            const compatible = await LocalAuthentication.hasHardwareAsync();
            const enrolled   = await LocalAuthentication.isEnrolledAsync();
            const avail      = compatible && enrolled && bioEnabled === 'true';
            setBiometricAvail(avail);
            if (avail) {
                // Auto-trigger biometric on mount
                setTimeout(() => promptBiometric(), 300);
            }
        } catch { /* ignore */ }
    };

    const promptBiometric = async () => {
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Unlock Find My Stuff',
                fallbackLabel: 'Use Password',
                cancelLabel: 'Cancel',
            });
            if (result.success) {
                onUnlock();
            }
        } catch { /* ignore */ }
    };

    const shake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 12,  duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 8,   duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8,  duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
        ]).start();
    };

    const handleUnlock = async () => {
        if (!password.trim()) {
            setError('Enter your password');
            shake();
            return;
        }
        setChecking(true);
        try {
            const stored = await SecureStore.getItemAsync(KEY_PASSWORD);
            if (stored === password) {
                onUnlock();
            } else {
                const newAttempts = attempts + 1;
                setAttempts(newAttempts);
                setPassword('');
                shake();
                if (newAttempts >= 5) {
                    setError(`Too many attempts. Try again in a moment.`);
                } else {
                    setError(`Incorrect password. ${5 - newAttempts} attempt${5 - newAttempts !== 1 ? 's' : ''} remaining.`);
                }
            }
        } catch {
            setError('Something went wrong. Please try again.');
        } finally { setChecking(false); }
    };

    const biometricLabel = Platform.OS === 'ios' ? 'Face ID' : 'Fingerprint';

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
                {/* App icon + title */}
                <View style={styles.top}>
                    <View style={styles.appIconWrap}>
                        <Text style={styles.appIconEmoji}>🗂️</Text>
                    </View>
                    <Text style={styles.appName}>Find My Stuff</Text>
                    <Text style={styles.lockSubtitle}>Enter your password to continue</Text>
                </View>

                {/* Lock icon */}
                <View style={styles.lockIconWrap}>
                    <Text style={styles.lockIcon}>🔒</Text>
                </View>

                {/* Password input */}
                <Animated.View style={[styles.inputSection, { transform: [{ translateX: shakeAnim }] }]}>
                    <View style={[styles.inputWrap, !!error && styles.inputWrapError]}>
                        <TextInput
                            style={styles.input}
                            value={password}
                            onChangeText={v => { setPassword(v); setError(''); }}
                            placeholder="Password"
                            placeholderTextColor={TEXT_HNT}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                            autoCorrect={false}
                            onSubmitEditing={handleUnlock}
                            returnKeyType="go"
                        />
                        <TouchableOpacity onPress={() => setShowPassword(s => !s)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                        </TouchableOpacity>
                    </View>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                </Animated.View>

                {/* Unlock button */}
                <TouchableOpacity
                    style={[styles.unlockBtn, checking && styles.unlockBtnDisabled]}
                    onPress={handleUnlock}
                    disabled={checking}
                    activeOpacity={0.85}
                >
                    {checking
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.unlockBtnText}>Unlock</Text>
                    }
                </TouchableOpacity>

                {/* Biometric button */}
                {biometricAvail && (
                    <TouchableOpacity style={styles.biometricBtn} onPress={promptBiometric} activeOpacity={0.75}>
                        <Text style={styles.biometricIcon}>
                            {Platform.OS === 'ios' ? '🧑' : '👆'}
                        </Text>
                        <Text style={styles.biometricText}>Use {biometricLabel}</Text>
                    </TouchableOpacity>
                )}

                {/* Attempts warning */}
                {attempts >= 3 && (
                    <View style={styles.warningBanner}>
                        <Text style={styles.warningText}>
                            ⚠️ {5 - attempts} attempt{5 - attempts !== 1 ? 's' : ''} left before lockout
                        </Text>
                    </View>
                )}
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    container: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 32, gap: 16,
    },

    top: { alignItems: 'center', gap: 8, marginBottom: 8 },
    appIconWrap: {
        width: 64, height: 64, borderRadius: 18,
        backgroundColor: BLUE + '15', justifyContent: 'center', alignItems: 'center',
        marginBottom: 4,
    },
    appIconEmoji: { fontSize: 32 },
    appName: { fontSize: 22, fontWeight: '800', color: TEXT_PRI, letterSpacing: -0.4 },
    lockSubtitle: { fontSize: 14, color: TEXT_SEC, textAlign: 'center' },

    lockIconWrap: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: '#F0F4FF',
        justifyContent: 'center', alignItems: 'center',
    },
    lockIcon: { fontSize: 36 },

    inputSection: { width: '100%', gap: 8 },
    inputWrap: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F5F6FA', borderWidth: 1.5, borderColor: BORDER,
        borderRadius: 14, paddingHorizontal: 16,
    },
    inputWrapError: { borderColor: ERROR },
    input: { flex: 1, fontSize: 16, color: TEXT_PRI, paddingVertical: 14 },
    eyeIcon: { fontSize: 20, paddingLeft: 8 },
    errorText: { fontSize: 13, color: ERROR, fontWeight: '500', textAlign: 'center' },

    unlockBtn: {
        width: '100%', backgroundColor: BLUE,
        borderRadius: 14, paddingVertical: 16,
        alignItems: 'center',
        shadowColor: BLUE, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    unlockBtnDisabled: { opacity: 0.6 },
    unlockBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

    biometricBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 20, paddingVertical: 12,
        borderRadius: 12, borderWidth: 1.5, borderColor: BORDER,
    },
    biometricIcon: { fontSize: 20 },
    biometricText: { fontSize: 14, fontWeight: '600', color: TEXT_PRI },

    warningBanner: {
        backgroundColor: ERROR + '15', borderRadius: 10,
        paddingHorizontal: 16, paddingVertical: 10,
        borderWidth: 1, borderColor: ERROR + '30',
    },
    warningText: { fontSize: 13, color: ERROR, fontWeight: '500', textAlign: 'center' },
});