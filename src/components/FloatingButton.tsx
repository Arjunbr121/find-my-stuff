import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Props for FloatingButton component
 */
export interface FloatingButtonProps {
    onPress: () => void;
    icon: string;
    label?: string;
}

/**
 * FloatingButton component - Floating Action Button (FAB)
 * 
 * Features:
 * - Circular button positioned at bottom-right
 * - Icon display (emoji or icon font)
 * - Optional label for accessibility
 * - Haptic feedback on press (platform-specific)
 * - Shadow and elevation for depth
 * - Smooth press animation
 */
export const FloatingButton: React.FC<FloatingButtonProps> = ({
    onPress,
    icon,
    label,
}) => {
    const handlePress = () => {
        // Trigger haptic feedback on mobile platforms
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        onPress();
    };

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={handlePress}
            activeOpacity={0.8}
            accessibilityLabel={label || 'Action button'}
            accessibilityRole="button"
        >
            <Text style={styles.icon}>{icon}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        ...Platform.select({
            web: {
                cursor: 'pointer',
            },
        }),
    },
    icon: {
        fontSize: 24,
        color: '#fff',
    },
});
