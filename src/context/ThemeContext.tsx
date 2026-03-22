/**
 * ThemeContext.tsx
 *
 * Provides app-wide light/dark theme support.
 *
 * Usage:
 *   1. Wrap your app in <ThemeProvider> in App.tsx
 *   2. In any component: const { theme, colors, isDark, toggleTheme } = useTheme();
 *   3. Use colors.background, colors.text, etc. instead of hardcoded hex values
 *
 * Priority order:
 *   - User manual override (stored in AsyncStorage) → highest priority
 *   - System preference (useColorScheme)           → fallback
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Storage key ──────────────────────────────────────────────────────────────
const THEME_KEY = 'app_theme_preference'; // 'light' | 'dark' | 'system'

// ─── Colour palettes ──────────────────────────────────────────────────────────
export const LIGHT_COLORS = {
    // Backgrounds
    background:     '#F5F6FA',
    surface:        '#FFFFFF',
    surfaceSecond:  '#F0F0F6',

    // Text
    textPrimary:    '#1A1A2E',
    textSecondary:  '#6B7280',
    textHint:       '#B0B7C3',
    textInverse:    '#FFFFFF',

    // Borders
    border:         '#E8E8EE',
    borderStrong:   '#D1D5DB',

    // Brand
    blue:           '#007AFF',
    teal:           '#4ECDC4',
    green:          '#34C759',
    orange:         '#FF9500',
    red:            '#FF3B30',
    purple:         '#AF52DE',

    // Nav / chrome
    navBackground:  '#FFFFFF',
    navBorder:      '#E8E8EE',
    headerBg:       '#FFFFFF',
    statusBar:      'dark-content' as 'dark-content' | 'light-content',

    // Cards / shadows
    cardShadow:     '#000000',
    cardShadowOpacity: 0.06,

    // Input
    inputBackground: '#F5F6FA',
    inputBorder:     '#E8E8EE',

    // Overlay
    overlay:        'rgba(0,0,0,0.45)',
    overlayLight:   'rgba(0,0,0,0.15)',
};

export const DARK_COLORS: typeof LIGHT_COLORS = {
    // Backgrounds
    background:     '#0D0D14',
    surface:        '#1C1C2E',
    surfaceSecond:  '#252536',

    // Text
    textPrimary:    '#F2F2F7',
    textSecondary:  '#9898A8',
    textHint:       '#5A5A6E',
    textInverse:    '#1A1A2E',

    // Borders
    border:         '#2C2C3E',
    borderStrong:   '#3C3C4E',

    // Brand (same, they work on both)
    blue:           '#0A84FF',
    teal:           '#5DDAD6',
    green:          '#30D158',
    orange:         '#FF9F0A',
    red:            '#FF453A',
    purple:         '#BF5AF2',

    // Nav / chrome
    navBackground:  '#1C1C2E',
    navBorder:      '#2C2C3E',
    headerBg:       '#1C1C2E',
    statusBar:      'light-content' as 'dark-content' | 'light-content',

    // Cards / shadows
    cardShadow:     '#000000',
    cardShadowOpacity: 0.3,

    // Input
    inputBackground: '#252536',
    inputBorder:     '#2C2C3E',

    // Overlay
    overlay:        'rgba(0,0,0,0.7)',
    overlayLight:   'rgba(0,0,0,0.35)',
};

export type ThemeColors = typeof LIGHT_COLORS;
export type ThemeMode = 'light' | 'dark' | 'system';

// ─── Context type ─────────────────────────────────────────────────────────────
interface ThemeContextValue {
    /** The resolved active theme: 'light' or 'dark' */
    theme:       'light' | 'dark';
    /** The user's preference: 'light', 'dark', or 'system' */
    preference:  ThemeMode;
    /** Colour tokens for the active theme */
    colors:      ThemeColors;
    /** Whether dark mode is currently active */
    isDark:      boolean;
    /** Toggle between light and dark (ignores system) */
    toggleTheme: () => void;
    /** Set a specific preference */
    setTheme:    (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemScheme = useColorScheme(); // 'light' | 'dark' | null
    const [preference, setPreference] = useState<ThemeMode>('system');

    // Load saved preference on mount
    useEffect(() => {
        AsyncStorage.getItem(THEME_KEY).then(saved => {
            if (saved === 'light' || saved === 'dark' || saved === 'system') {
                setPreference(saved);
            }
        }).catch(() => {});
    }, []);

    // Resolve active theme
    const theme: 'light' | 'dark' = preference === 'system'
        ? (systemScheme === 'dark' ? 'dark' : 'light')
        : preference;

    const isDark  = theme === 'dark';
    const colors  = isDark ? DARK_COLORS : LIGHT_COLORS;

    const setTheme = useCallback(async (mode: ThemeMode) => {
        setPreference(mode);
        try { await AsyncStorage.setItem(THEME_KEY, mode); } catch {}
    }, []);

    const toggleTheme = useCallback(() => {
        const next = isDark ? 'light' : 'dark';
        setTheme(next);
    }, [isDark, setTheme]);

    return (
        <ThemeContext.Provider value={{ theme, preference, colors, isDark, toggleTheme, setTheme }}>
            <StatusBar
                barStyle={colors.statusBar}
                backgroundColor={colors.headerBg}
            />
            {children}
        </ThemeContext.Provider>
    );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useTheme = (): ThemeContextValue => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
    return ctx;
};

/**
 * Convenience hook — returns just the color tokens.
 * Most components only need this.
 *
 * Usage:
 *   const colors = useColors();
 *   <View style={{ backgroundColor: colors.surface }}>
 */
export const useColors = (): ThemeColors => useTheme().colors;