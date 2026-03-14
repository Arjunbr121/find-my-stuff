import React, { useEffect, useState } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Text,
} from 'react-native';

/**
 * Props for SearchBar component
 */
export interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    autoFocus?: boolean;
}

/**
 * SearchBar component with search icon and clear button
 * 
 * Features:
 * - Search icon on the left
 * - Clear button (X) when text is present
 * - Debounced input (300ms delay)
 * - Auto-focus support
 * - Proper styling and accessibility
 */
export const SearchBar: React.FC<SearchBarProps> = ({
    value,
    onChangeText,
    placeholder = 'Search...',
    autoFocus = false,
}) => {
    const [internalValue, setInternalValue] = useState(value);

    // Debounce the input changes
    useEffect(() => {
        const timer = setTimeout(() => {
            onChangeText(internalValue);
        }, 300);

        return () => clearTimeout(timer);
    }, [internalValue, onChangeText]);

    // Sync external value changes
    useEffect(() => {
        setInternalValue(value);
    }, [value]);

    const handleClear = () => {
        setInternalValue('');
        onChangeText('');
    };

    return (
        <View style={styles.container}>
            {/* Search Icon */}
            <View style={styles.iconContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
            </View>

            {/* Text Input */}
            <TextInput
                style={styles.input}
                value={internalValue}
                onChangeText={setInternalValue}
                placeholder={placeholder}
                placeholderTextColor="#999"
                autoFocus={autoFocus}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
            />

            {/* Clear Button */}
            {internalValue.length > 0 && (
                <TouchableOpacity
                    style={styles.clearButton}
                    onPress={handleClear}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Text style={styles.clearIcon}>✕</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginHorizontal: 16,
        marginVertical: 8,
    },
    iconContainer: {
        marginRight: 8,
    },
    searchIcon: {
        fontSize: 18,
        opacity: 0.6,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        paddingVertical: 4,
    },
    clearButton: {
        padding: 4,
        marginLeft: 8,
    },
    clearIcon: {
        fontSize: 18,
        color: '#999',
        fontWeight: '600',
    },
});
