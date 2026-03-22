/**
 * ThemeContext.tsx
 * Light / dark mode — app-wide theme provider.
 *
 * Usage:
 *   const { colors, isDark, toggleTheme } = useTheme();
 *   const colors = useColors();  // shorthand
 */

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Storage key ──────────────────────────────────────────────────────────────
const THEME_KEY = 'app_theme_preference'; // 'light' | 'dark' | 'system'

// ─── Colour palettes ──────────────────────────────────────────────────────────
export const LIGHT_COLORS = {
    background:          '#F5F6FA',
    surface:             '#FFFFFF',
    surfaceSecond:       '#F0F0F6',
    textPrimary:         '#1A1A2E',
    textSecondary:       '#6B7280',
    textHint:            '#B0B7C3',
    textInverse:         '#FFFFFF',
    border:              '#E8E8EE',
    borderStrong:        '#D1D5DB',
    blue:                '#007AFF',
    teal:                '#4ECDC4',
    green:               '#34C759',
    orange:              '#FF9500',
    red:                 '#FF3B30',
    purple:              '#AF52DE',
    navBackground:       '#FFFFFF',
    navBorder:           '#E8E8EE',
    headerBg:            '#FFFFFF',
    statusBar:           'dark-content'  as 'dark-content' | 'light-content',
    cardShadow:          '#000000',
    cardShadowOpacity:   0.06,
    inputBackground:     '#F5F6FA',
    inputBorder:         '#E8E8EE',
    overlay:             'rgba(0,0,0,0.45)',
    overlayLight:        'rgba(0,0,0,0.15)',
};

export const DARK_COLORS: typeof LIGHT_COLORS = {
    background:          '#0D0D14',
    surface:             '#1C1C2E',
    surfaceSecond:       '#252536',
    textPrimary:         '#F2F2F7',
    textSecondary:       '#9898A8',
    textHint:            '#5A5A6E',
    textInverse:         '#1A1A2E',
    border:              '#2C2C3E',
    borderStrong:        '#3C3C4E',
    blue:                '#0A84FF',
    teal:                '#5DDAD6',
    green:               '#30D158',
    orange:              '#FF9F0A',
    red:                 '#FF453A',
    purple:              '#BF5AF2',
    navBackground:       '#1C1C2E',
    navBorder:           '#2C2C3E',
    headerBg:            '#1C1C2E',
    statusBar:           'light-content' as 'dark-content' | 'light-content',
    cardShadow:          '#000000',
    cardShadowOpacity:   0.3,
    inputBackground:     '#252536',
    inputBorder:         '#2C2C3E',
    overlay:             'rgba(0,0,0,0.7)',
    overlayLight:        'rgba(0,0,0,0.35)',
};

export type ThemeColors = typeof LIGHT_COLORS;
export type ThemeMode   = 'light' | 'dark' | 'system';

// ─── Context type ─────────────────────────────────────────────────────────────
interface ThemeContextValue {
    theme:       'light' | 'dark';
    preference:  ThemeMode;
    colors:      ThemeColors;
    isDark:      boolean;
    toggleTheme: () => void;
    setTheme:    (mode: ThemeMode) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const ThemeContext = createContext<ThemeContextValue>({
    theme:       'light',
    preference:  'system',
    colors:      LIGHT_COLORS,
    isDark:      false,
    toggleTheme: () => {},
    setTheme:    () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemScheme                    = useColorScheme();
    const [preference, setPreferenceState] = useState<ThemeMode>('system');
    const [loaded,     setLoaded]          = useState(false);

    // Load saved preference once on mount
    useEffect(() => {
        AsyncStorage.getItem(THEME_KEY)
            .then(saved => {
                if (saved === 'light' || saved === 'dark' || saved === 'system') {
                    setPreferenceState(saved);
                }
            })
            .catch(() => {})
            .finally(() => setLoaded(true));
    }, []);

    // Resolve active theme
    const theme: 'light' | 'dark' = preference === 'system'
        ? (systemScheme === 'dark' ? 'dark' : 'light')
        : preference;

    const isDark  = theme === 'dark';
    const colors  = isDark ? DARK_COLORS : LIGHT_COLORS;

    const setTheme = useCallback(async (mode: ThemeMode) => {
        setPreferenceState(mode);
        try { await AsyncStorage.setItem(THEME_KEY, mode); } catch {}
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme(isDark ? 'light' : 'dark');
    }, [isDark, setTheme]);

    // Memoize context value so consumers don't re-render unnecessarily
    const value = useMemo<ThemeContextValue>(() => ({
        theme,
        preference,
        colors,
        isDark,
        toggleTheme,
        setTheme,
    }), [theme, preference, colors, isDark, toggleTheme, setTheme]);

    // Don't render children until preference has loaded from AsyncStorage
    // This prevents a flash of the wrong theme on startup
    if (!loaded) return null;

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Full theme context */
export const useTheme = (): ThemeContextValue => useContext(ThemeContext);

/** Shorthand — just the colour tokens */
export const useColors = (): ThemeColors => useContext(ThemeContext).colors;