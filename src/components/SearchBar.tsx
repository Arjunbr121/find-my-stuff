import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Text,
    Animated,
    Platform,
} from 'react-native';

const BLUE   = '#007AFF';
const BG     = '#F5F6FA';
const BORDER = '#E8E8EE';
const TEXT   = '#1A1A2E';
const HINT   = '#B0B7C3';
const SEC    = '#6B7280';

export interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    autoFocus?: boolean;
}

/**
 * Revamped SearchBar — bordered card style, animated focus ring,
 * voice icon when empty, animated ✕ clear button.
 */
export const SearchBar: React.FC<SearchBarProps> = ({
    value,
    onChangeText,
    placeholder = 'Search...',
    autoFocus = false,
}) => {
    const [internalValue, setInternalValue] = useState(value);
    const [focused,       setFocused]       = useState(false);

    const borderAnim = useRef(new Animated.Value(0)).current;
    const clearAnim  = useRef(new Animated.Value(0)).current;

    // Debounce
    useEffect(() => {
        const t = setTimeout(() => onChangeText(internalValue), 300);
        return () => clearTimeout(t);
    }, [internalValue]);

    // Sync external value
    useEffect(() => { setInternalValue(value); }, [value]);

    // Animate focus border
    useEffect(() => {
        Animated.spring(borderAnim, {
            toValue: focused ? 1 : 0,
            useNativeDriver: false, tension: 120, friction: 8,
        }).start();
    }, [focused]);

    // Animate clear button
    useEffect(() => {
        Animated.spring(clearAnim, {
            toValue: internalValue.length > 0 ? 1 : 0,
            useNativeDriver: true, tension: 120, friction: 8,
        }).start();
    }, [internalValue.length > 0]);

    const handleClear = () => {
        setInternalValue('');
        onChangeText('');
    };

    const borderColor = borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#E8E8EE', BLUE],
    });

    const shadowOpacity = borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.12],
    });

    return (
        <Animated.View style={[
            styles.container,
            { borderColor, shadowOpacity },
        ]}>
            {/* Search icon */}
            <View style={styles.leadingIcon}>
                <Text style={[styles.searchEmoji, focused && styles.searchEmojiActive]}>🔍</Text>
            </View>

            {/* Input */}
            <TextInput
                style={styles.input}
                value={internalValue}
                onChangeText={setInternalValue}
                placeholder={placeholder}
                placeholderTextColor={HINT}
                autoFocus={autoFocus}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />

            {/* Right actions */}
            <View style={styles.trailing}>
                {/* Clear button — animates in */}
                <Animated.View style={{
                    opacity: clearAnim,
                    transform: [{ scale: clearAnim }],
                }}>
                    <TouchableOpacity
                        style={styles.clearBtn}
                        onPress={handleClear}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Text style={styles.clearIcon}>✕</Text>
                    </TouchableOpacity>
                </Animated.View>

            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 14,
        borderWidth: 1.5,
        marginHorizontal: 16,
        marginVertical: 10,
        paddingHorizontal: 4,
        paddingVertical: Platform.OS === 'ios' ? 2 : 0,
        shadowColor: BLUE,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 2,
    },
    leadingIcon: {
        paddingHorizontal: 10,
        paddingVertical: 10,
    },
    searchEmoji: {
        fontSize: 17,
        opacity: 0.45,
    },
    searchEmojiActive: {
        opacity: 1,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: TEXT,
        paddingVertical: 10,
        paddingRight: 4,
    },
    trailing: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 8,
        gap: 2,
    },
    clearBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#E8E8EE',
        justifyContent: 'center',
        alignItems: 'center',
    },
    clearIcon: {
        fontSize: 11,
        color: SEC,
        fontWeight: '700',
    },
    divider: {
        width: 1,
        height: 18,
        backgroundColor: '#E8E8EE',
        marginHorizontal: 6,
    },
    micBtn: {
        paddingHorizontal: 2,
        paddingVertical: 4,
    },
    micIcon: {
        fontSize: 17,
        opacity: 0.5,
    },
});