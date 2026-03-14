import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    FlatList,
    Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import type {
    RoomDetailScreenNavigationProp,
    RoomDetailScreenRouteProp,
    RootNavigationProp,
} from '../types/navigation';
import { ItemCard } from '../components/ItemCard';
import { createRoomStore } from '../stores/roomStore';
import { createItemStore } from '../stores/itemStore';

/**
 * Icon mapping for room types
 */
const ICON_MAP: Record<string, string> = {
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
 * RoomDetailScreen - Displays full details of a single room
 * 
 * Features:
 * - Room information (name, icon, color, description)
 * - List of items in this room
 * - Item count display
 * - Edit button (placeholder for future implementation)
 * - Delete button with item count check
 * - Loading state while fetching room
 * - Error handling for missing rooms
 * - Navigation to item details
 */
export default function RoomDetailScreen() {
    const navigation = useNavigation<RoomDetailScreenNavigationProp>();
    const route = useRoute<RoomDetailScreenRouteProp>();
    const { roomId } = route.params;

    const [deleting, setDeleting] = useState(false);

    // Get stores (placeholder - will be properly wired in App.tsx)
    const roomStore = createRoomStore();
    const itemStore = createItemStore();

    // Load data on mount
    useEffect(() => {
        roomStore.loadRooms();
        itemStore.loadItems();
    }, []);

    // Find the room and its items
    const room = roomStore.rooms.find((r) => r.id === roomId);
    const roomItems = itemStore.items.filter((item) => item.roomId === roomId);

    // Handle edit button press
    const handleEdit = () => {
        Alert.alert(
            'Edit Room',
            'Edit functionality will be available in a future update.',
            [{ text: 'OK' }]
        );
    };

    // Handle delete button press
    const handleDelete = () => {
        if (!room) return;

        // Check if room has items
        if (roomItems.length > 0) {
            Alert.alert(
                'Cannot Delete Room',
                `This room contains ${roomItems.length} ${roomItems.length === 1 ? 'item' : 'items'}. Please reassign or delete the items first.`,
                [{ text: 'OK' }]
            );
            return;
        }

        Alert.alert(
            'Delete Room',
            'Are you sure you want to delete this room? This action cannot be undone.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: confirmDelete,
                },
            ]
        );
    };

    // Confirm delete action
    const confirmDelete = async () => {
        if (!room) return;

        // Trigger haptic feedback on deletion
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        setDeleting(true);
        try {
            await roomStore.deleteRoom(room.id);
            navigation.goBack();
        } catch (error: any) {
            Alert.alert(
                'Error',
                error.message || 'Failed to delete room. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setDeleting(false);
        }
    };

    // Handle item press - navigate to detail screen
    const handleItemPress = (item: any) => {
        const nav = navigation as unknown as RootNavigationProp;
        nav.navigate('ItemDetail', { itemId: item.id });
    };

    // Format date
    const formatDate = (timestamp: number): string => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    // Loading state
    if (roomStore.loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#4ECDC4" />
                <Text style={styles.loadingText}>Loading room...</Text>
            </View>
        );
    }

    // Room not found
    if (!room) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorIcon}>❌</Text>
                <Text style={styles.errorTitle}>Room Not Found</Text>
                <Text style={styles.errorMessage}>
                    This room may have been deleted or doesn't exist.
                </Text>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const icon = ICON_MAP[room.icon] || '📍';

    // Render item card
    const renderItem = ({ item }: { item: any }) => {
        return (
            <ItemCard
                item={item}
                room={room}
                onPress={handleItemPress}
            />
        );
    };

    return (
        <View style={styles.container}>
            {/* Room Header */}
            <View style={[styles.header, { backgroundColor: room.color + '20' }]}>
                <View style={[styles.iconContainer, { backgroundColor: room.color + '40' }]}>
                    <Text style={styles.icon}>{icon}</Text>
                </View>
                <Text style={styles.roomName}>{room.name}</Text>
                {room.description && (
                    <Text style={styles.description}>{room.description}</Text>
                )}
                <View style={styles.metaInfo}>
                    <Text style={styles.metaText}>
                        Created {formatDate(room.createdAt)}
                    </Text>
                    <Text style={styles.metaText}>
                        {roomItems.length} {roomItems.length === 1 ? 'item' : 'items'}
                    </Text>
                </View>
            </View>

            {/* Items List */}
            <View style={styles.itemsSection}>
                <Text style={styles.sectionTitle}>Items in this room</Text>
                {roomItems.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>📦</Text>
                        <Text style={styles.emptyText}>No items in this room yet</Text>
                    </View>
                ) : (
                    <FlatList
                        data={roomItems}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.itemsList}
                    />
                )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={[styles.button, styles.editButton]}
                    onPress={handleEdit}
                    disabled={deleting}
                >
                    <Text style={styles.editButtonText}>✏️ Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.deleteButton]}
                    onPress={handleDelete}
                    disabled={deleting}
                >
                    {deleting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        backgroundColor: '#f8f9fa',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666',
    },
    errorIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    errorMessage: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
    },
    backButton: {
        backgroundColor: '#4ECDC4',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    header: {
        padding: 24,
        alignItems: 'center',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    icon: {
        fontSize: 40,
    },
    roomName: {
        fontSize: 28,
        fontWeight: '700',
        color: '#333',
        marginBottom: 8,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 16,
    },
    metaInfo: {
        flexDirection: 'row',
        gap: 16,
    },
    metaText: {
        fontSize: 14,
        color: '#666',
    },
    itemsSection: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 16,
        marginTop: -16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    itemsList: {
        paddingBottom: 16,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 48,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
    },
    actionButtons: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#ddd',
    },
    button: {
        flex: 1,
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    editButton: {
        backgroundColor: '#4ECDC4',
    },
    editButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    deleteButton: {
        backgroundColor: '#ff4444',
    },
    deleteButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});
