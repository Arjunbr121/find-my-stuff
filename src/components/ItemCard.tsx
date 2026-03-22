import React, { useState } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { Item, Room } from '../types/models';

/**
 * Props for ItemCard component
 */
export interface ItemCardProps {
    item: Item;
    room: Room;
    onPress: (item: Item) => void;
    onLongPress?: (item: Item) => void;
}

/**
 * ItemCard component displays a single item with its image, name, room, and location
 * 
 * Features:
 * - Image thumbnail with loading state
 * - Item name and specific location
 * - Room badge with color accent
 * - Timestamp display
 * - Press and long press handlers
 * 
 * Memoized for performance with large lists
 */
export const ItemCard: React.FC<ItemCardProps> = React.memo(({
    item,
    room,
    onPress,
    onLongPress,
}) => {
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);

    const handlePress = () => {
        onPress(item);
    };

    const handleLongPress = () => {
        onLongPress?.(item);
    };

    const formatTimestamp = (timestamp: number): string => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    };

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={handlePress}
            onLongPress={handleLongPress}
            activeOpacity={0.7}
        >
            {/* Image Section */}
            <View style={styles.imageContainer}>
                {imageLoading && !imageError && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#666" />
                    </View>
                )}
                {imageError ? (
                    <View style={[styles.image, styles.errorContainer]}>
                        <Text style={styles.errorText}>📷</Text>
                    </View>
                ) : (
                    <Image
                        source={{ uri: item.thumbnailUri || item.imageUri }}
                        style={styles.image}
                        onLoadStart={() => setImageLoading(true)}
                        onLoadEnd={() => setImageLoading(false)}
                        onError={() => {setImageError(true);
                            setImageLoading(false);
                        }}
                    />
                )}
            </View>

            {/* Content Section */}
            <View style={styles.content}>
                {/* Item Name */}
                <Text style={styles.itemName} numberOfLines={1}>
                    {item.name}
                </Text>

                {/* Room Badge */}
                <View style={[styles.roomBadge, { backgroundColor: room.color + '20' }]}>
                    <View style={[styles.roomDot, { backgroundColor: room.color }]} />
                    <Text style={[styles.roomName, { color: room.color }]} numberOfLines={1}>
                        {room.name}
                    </Text>
                </View>

                {/* Specific Location */}
                <Text style={styles.location} numberOfLines={2}>
                    {item.specificLocation}
                </Text>

                {/* Timestamp */}
                <Text style={styles.timestamp}>
                    {formatTimestamp(item.updatedAt)}
                </Text>
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginHorizontal: 16,
        marginVertical: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    imageContainer: {
        width: 80,
        height: 80,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
    },
    errorText: {
        fontSize: 32,
    },
    content: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'space-between',
    },
    itemName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    roomBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 4,
    },
    roomDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 4,
    },
    roomName: {
        fontSize: 12,
        fontWeight: '500',
    },
    location: {
        fontSize: 13,
        color: '#666',
        marginBottom: 4,
    },
    timestamp: {
        fontSize: 11,
        color: '#999',
    },
});
