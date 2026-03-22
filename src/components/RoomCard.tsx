import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { Room } from '../types/models';

/**
 * Props for RoomCard component
 */
export interface RoomCardProps {
    room: Room;
    itemCount: number;
    onPress: (room: Room) => void;
}

/**
 * Icon mapping for room types
 * Using emoji icons for simplicity (can be replaced with icon library)
 */
export const ICON_MAP: Record<string, string> = {
    kitchen: '🍳',
    bedroom: '🛏️',
    'living-room': '🛋️',
    bathroom: '🚿',
    garage: '🚗',
    office: '💼',
    hallway: '🚪',
    closet: '👔',
    basement: '⬇️',
    attic: '⬆️',
    storage: '📦',
    outdoor: '🌳',
};

/**
 * RoomCard component displays a room with its icon, name, and item count
 * 
 * Features:
 * - Room icon display
 * - Room name
 * - Item count badge
 * - Color accent from room settings
 * - Touch feedback
 * 
 * Memoized for performance with large lists
 */
export const RoomCard: React.FC<RoomCardProps> = React.memo(({
    room,
    itemCount,
    onPress,
}) => {
    const handlePress = () => {
        onPress(room);
    };

    const icon = ICON_MAP[room.icon] || '📍';

    return (
        <TouchableOpacity
            style={[styles.container, { borderLeftColor: room.color }]}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            {/* Icon Section */}
            <View style={[styles.iconContainer, { backgroundColor: room.color + '20' }]}>
                <Text style={styles.icon}>{icon}</Text>
            </View>

            {/* Content Section */}
            <View style={styles.content}>
                <Text style={styles.roomName} numberOfLines={1}>
                    {room.name}
                </Text>

                {room.description && (
                    <Text style={styles.description} numberOfLines={1}>
                        {room.description}
                    </Text>
                )}

                {/* Item Count Badge */}
                <View style={styles.countContainer}>
                    <Text style={styles.countText}>
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </Text>
                </View>
            </View>

            {/* Color Accent */}
            <View style={[styles.colorAccent, { backgroundColor: room.color }]} />
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 6,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    icon: {
        fontSize: 28,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    roomName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    description: {
        fontSize: 13,
        color: '#666',
        marginBottom: 6,
    },
    countContainer: {
        alignSelf: 'flex-start',
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    countText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    colorAccent: {
        width: 4,
        height: '100%',
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
    },
});
