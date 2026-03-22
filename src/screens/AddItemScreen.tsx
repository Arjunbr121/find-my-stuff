import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Image,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import type { AddItemScreenNavigationProp } from '../types/navigation';
import { useItemStore, useRoomStore } from '../stores';
import { ensureCameraPermission, ensureMediaLibraryPermission } from '../utils/permissions';

/**
 * AddItemScreen - Form screen for adding new items
 * 
 * Features:
 * - Text input for item name
 * - Room picker dropdown
 * - Text input for specific location
 * - Camera button to take photo
 * - Image picker button to select from library
 * - Image preview
 * - Form validation with error messages
 * - Save button with loading state
 * - Camera permission handling
 */
export default function AddItemScreen() {
    const navigation = useNavigation<AddItemScreenNavigationProp>();

    // Form state
    const [name, setName] = useState('');
    const [roomId, setRoomId] = useState('');
    const [specificLocation, setSpecificLocation] = useState('');
    const [imageUri, setImageUri] = useState('');
    const [saving, setSaving] = useState(false);

    // Validation errors
    const [errors, setErrors] = useState<{
        name?: string;
        roomId?: string;
        specificLocation?: string;
        imageUri?: string;
    }>({});

    const itemStore = useItemStore();
    const roomStore = useRoomStore();

    // Load rooms on mount
    useEffect(() => {
        roomStore.loadRooms();
    }, []);

    // Validate form
    const validateForm = (): boolean => {
        const newErrors: typeof errors = {};

        if (!name.trim()) {
            newErrors.name = 'Item name is required';
        } else if (name.trim().length > 100) {
            newErrors.name = 'Item name must be 100 characters or less';
        }

        if (!roomId) {
            newErrors.roomId = 'Please select a room';
        }

        if (!specificLocation.trim()) {
            newErrors.specificLocation = 'Specific location is required';
        } else if (specificLocation.trim().length > 200) {
            newErrors.specificLocation = 'Location must be 200 characters or less';
        }

        if (!imageUri) {
            newErrors.imageUri = 'Please add a photo';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle camera button press
    const handleTakePhoto = async () => {
        // Request camera permission with fallback to image picker
        const hasPermission = await ensureCameraPermission(handlePickImage);

        if (!hasPermission) {
            return;
        }

        try {
            // Launch camera
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setImageUri(result.assets[0].uri);
                // Clear image error if it was set
                if (errors.imageUri) {
                    setErrors({ ...errors, imageUri: undefined });
                }
            }
        } catch (error) {
            console.error('Error taking photo:', error);
            Alert.alert(
                'Camera Error',
                'Failed to take photo. Please try again or use the photo library.',
                [{ text: 'OK' }]
            );
        }
    };

    // Handle image picker button press
    const handlePickImage = async () => {
        // Request media library permission
        const hasPermission = await ensureMediaLibraryPermission();

        if (!hasPermission) {
            return;
        }

        try {
            // Launch image picker
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setImageUri(result.assets[0].uri);
                // Clear image error if it was set
                if (errors.imageUri) {
                    setErrors({ ...errors, imageUri: undefined });
                }
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert(
                'Image Picker Error',
                'Failed to select photo. Please try again.',
                [{ text: 'OK' }]
            );
        }
    };

    // Handle save button press
    const handleSave = async () => {
        if (!validateForm()) {
            return;
        }

        setSaving(true);
        try {
            await itemStore.addItem({
                name: name.trim(),
                roomId,
                specificLocation: specificLocation.trim(),
                imageUri,
            });

            // Navigate back on success
            navigation.goBack();
        } catch (error: any) {
            Alert.alert(
                'Error',
                error.message || 'Failed to save item. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setSaving(false);
        }
    };

    // Handle cancel button press
    const handleCancel = () => {
        navigation.goBack();
    };

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Item Name Input */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Item Name *</Text>
                    <TextInput
                        style={[styles.input, errors.name && styles.inputError]}
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g., Winter Jacket"
                        placeholderTextColor="#999"
                        maxLength={100}
                    />
                    {errors.name && (
                        <Text style={styles.errorText}>{errors.name}</Text>
                    )}
                </View>

                {/* Room Picker */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Room *</Text>
                    <View style={styles.pickerContainer}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.roomList}
                        >
                            {roomStore.rooms.map((room) => (
                                <TouchableOpacity
                                    key={room.id}
                                    style={[
                                        styles.roomOption,
                                        roomId === room.id && styles.roomOptionSelected,
                                        { borderColor: room.color },
                                    ]}
                                    onPress={() => setRoomId(room.id)}
                                >
                                    <Text style={styles.roomOptionText}>
                                        {room.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                    {errors.roomId && (
                        <Text style={styles.errorText}>{errors.roomId}</Text>
                    )}
                </View>

                {/* Specific Location Input */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Specific Location *</Text>
                    <TextInput
                        style={[
                            styles.input,
                            styles.textArea,
                            errors.specificLocation && styles.inputError,
                        ]}
                        value={specificLocation}
                        onChangeText={setSpecificLocation}
                        placeholder="e.g., Top shelf, left side"
                        placeholderTextColor="#999"
                        multiline
                        numberOfLines={3}
                        maxLength={200}
                    />
                    {errors.specificLocation && (
                        <Text style={styles.errorText}>{errors.specificLocation}</Text>
                    )}
                </View>

                {/* Image Section */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Photo *</Text>

                    {imageUri ? (
                        <View style={styles.imagePreviewContainer}>
                            <Image
                                source={{ uri: imageUri }}
                                style={styles.imagePreview}
                            />
                            <TouchableOpacity
                                style={styles.removeImageButton}
                                onPress={() => setImageUri('')}
                            >
                                <Text style={styles.removeImageText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.imageButtons}>
                            <TouchableOpacity
                                style={styles.imageButton}
                                onPress={handleTakePhoto}
                            >
                                <Text style={styles.imageButtonIcon}>📷</Text>
                                <Text style={styles.imageButtonText}>Take Photo</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.imageButton}
                                onPress={handlePickImage}
                            >
                                <Text style={styles.imageButtonIcon}>🖼️</Text>
                                <Text style={styles.imageButtonText}>Choose Photo</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {errors.imageUri && (
                        <Text style={styles.errorText}>{errors.imageUri}</Text>
                    )}
                </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={handleCancel}
                    disabled={saving}
                >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.saveButton]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Item</Text>
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
    scrollContent: {
        padding: 16,
    },
    formGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#333',
    },
    inputError: {
        borderColor: '#ff4444',
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    errorText: {
        color: '#ff4444',
        fontSize: 14,
        marginTop: 4,
    },
    pickerContainer: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 8,
    },
    roomList: {
        paddingHorizontal: 4,
    },
    roomOption: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#ddd',
        marginHorizontal: 4,
        backgroundColor: '#fff',
    },
    roomOptionSelected: {
        backgroundColor: '#f0f9ff',
    },
    roomOptionText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    imageButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    imageButton: {
        flex: 1,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#4ECDC4',
        borderRadius: 8,
        borderStyle: 'dashed',
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageButtonIcon: {
        fontSize: 32,
        marginBottom: 8,
    },
    imageButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#4ECDC4',
    },
    imagePreviewContainer: {
        position: 'relative',
        alignSelf: 'center',
    },
    imagePreview: {
        width: 200,
        height: 200,
        borderRadius: 8,
    },
    removeImageButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#ff4444',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeImageText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
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
    cancelButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    saveButton: {
        backgroundColor: '#4ECDC4',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});
