import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import type {
    ItemDetailScreenNavigationProp,
    ItemDetailScreenRouteProp,
} from '../types/navigation';
import { useItemStore, useRoomStore } from '../stores';

/**
 * ItemDetailScreen - Displays full details of a single item
 * 
 * Features:
 * - Full-size image display
 * - Item name, room, specific location
 * - Creation and update timestamps
 * - Edit button (placeholder for future implementation)
 * - Delete button with confirmation dialog
 * - Loading state while fetching item
 * - Error handling for missing items
 */
export default function ItemDetailScreen() {
    const navigation = useNavigation<ItemDetailScreenNavigationProp>();
    const route = useRoute<ItemDetailScreenRouteProp>();
    const { itemId } = route.params;

    const [deleting, setDeleting] = useState(false);

    const itemStore = useItemStore();
    const roomStore = useRoomStore();

    // Load data on mount
    useEffect(() => {
        itemStore.loadItems();
        roomStore.loadRooms();
    }, []);

    // Find the item
    const item = itemStore.items.find((i) => i.id === itemId);
    const room = item ? roomStore.getRoomById(item.roomId) : undefined;

    // Handle edit button press
    const handleEdit = () => {
        Alert.alert(
            'Edit Item',
            'Edit functionality will be available in a future update.',
            [{ text: 'OK' }]
        );
    };

    // Handle delete button press
    const handleDelete = () => {
        Alert.alert(
            'Delete Item',
            'Are you sure you want to delete this item? This action cannot be undone.',
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
        if (!item) return;

        // Trigger haptic feedback on deletion
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        setDeleting(true);
        try {
            await itemStore.deleteItem(item.id);
            navigation.goBack();
        } catch (error: any) {
            Alert.alert(
                'Error',
                error.message || 'Failed to delete item. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setDeleting(false);
        }
    };

    // Format timestamp
    const formatDate = (timestamp: number): string => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Loading state
    if (itemStore.loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#4ECDC4" />
                <Text style={styles.loadingText}>Loading item...</Text>
            </View>
        );
    }

    // Item not found
    if (!item || !room) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorIcon}>❌</Text>
                <Text style={styles.errorTitle}>Item Not Found</Text>
                <Text style={styles.errorMessage}>
                    This item may have been deleted or doesn't exist.
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

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollView}>
                {/* Full-size Image */}
                <Image
                    source={{ uri: item.imageUri }}
                    style={styles.image}
                    resizeMode="cover"
                />

                {/* Item Details */}
                <View style={styles.content}>
                    {/* Item Name */}
                    <Text style={styles.itemName}>{item.name}</Text>

                    {/* Room Badge */}
                    <View style={[styles.roomBadge, { backgroundColor: room.color + '20' }]}>
                        <View style={[styles.roomDot, { backgroundColor: room.color }]} />
                        <Text style={[styles.roomName, { color: room.color }]}>
                            {room.name}
                        </Text>
                    </View>

                    {/* Specific Location */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Location</Text>
                        <Text style={styles.sectionValue}>{item.specificLocation}</Text>
                    </View>

                    {/* Timestamps */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Added</Text>
                        <Text style={styles.sectionValue}>
                            {formatDate(item.createdAt)}
                        </Text>
                    </View>

                    {item.updatedAt !== item.createdAt && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Last Updated</Text>
                            <Text style={styles.sectionValue}>
                                {formatDate(item.updatedAt)}
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>

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
    scrollView: {
        flex: 1,
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
    image: {
        width: '100%',
        height: 300,
        backgroundColor: '#f0f0f0',
    },
    content: {
        padding: 16,
    },
    itemName: {
        fontSize: 28,
        fontWeight: '700',
        color: '#333',
        marginBottom: 12,
    },
    roomBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginBottom: 24,
    },
    roomDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    roomName: {
        fontSize: 16,
        fontWeight: '600',
    },
    section: {
        marginBottom: 20,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionValue: {
        fontSize: 16,
        color: '#333',
        lineHeight: 24,
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
