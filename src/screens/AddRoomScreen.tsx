import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AddRoomScreenNavigationProp } from '../types/navigation';
import { ROOM_ICONS, ROOM_COLORS } from '../types/models';
import { createRoomStore } from '../stores/roomStore';

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
 * AddRoomScreen - Form screen for adding new rooms
 * 
 * Features:
 * - Text input for room name
 * - Icon picker with predefined options
 * - Color picker with predefined colors
 * - Optional description field
 * - Form validation with error messages
 * - Save button with loading state
 * - Room name uniqueness validation
 */
export default function AddRoomScreen() {
    const navigation = useNavigation<AddRoomScreenNavigationProp>();

    // Form state
    const [name, setName] = useState('');
    const [icon, setIcon] = useState<string>(ROOM_ICONS[0]);
    const [color, setColor] = useState<string>(ROOM_COLORS[0]);
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);

    // Validation errors
    const [errors, setErrors] = useState<{
        name?: string;
        description?: string;
    }>({});

    // Get store (placeholder - will be properly wired in App.tsx)
    const roomStore = createRoomStore();

    // Validate form
    const validateForm = (): boolean => {
        const newErrors: typeof errors = {};

        if (!name.trim()) {
            newErrors.name = 'Room name is required';
        } else if (name.trim().length > 50) {
            newErrors.name = 'Room name must be 50 characters or less';
        }

        if (description.trim().length > 200) {
            newErrors.description = 'Description must be 200 characters or less';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle save button press
    const handleSave = async () => {
        if (!validateForm()) {
            return;
        }

        setSaving(true);
        try {
            await roomStore.addRoom({
                name: name.trim(),
                icon,
                color,
                description: description.trim() || undefined,
            });

            // Navigate back on success
            navigation.goBack();
        } catch (error: any) {
            // Check for uniqueness error
            if (error.message?.includes('unique') || error.message?.includes('exists')) {
                setErrors({ name: 'A room with this name already exists' });
            } else {
                Alert.alert(
                    'Error',
                    error.message || 'Failed to save room. Please try again.',
                    [{ text: 'OK' }]
                );
            }
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
                {/* Room Name Input */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Room Name *</Text>
                    <TextInput
                        style={[styles.input, errors.name && styles.inputError]}
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g., Master Bedroom"
                        placeholderTextColor="#999"
                        maxLength={50}
                    />
                    {errors.name && (
                        <Text style={styles.errorText}>{errors.name}</Text>
                    )}
                </View>

                {/* Icon Picker */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Icon *</Text>
                    <View style={styles.iconGrid}>
                        {ROOM_ICONS.map((iconKey) => (
                            <TouchableOpacity
                                key={iconKey}
                                style={[
                                    styles.iconOption,
                                    icon === iconKey && styles.iconOptionSelected,
                                ]}
                                onPress={() => setIcon(iconKey)}
                            >
                                <Text style={styles.iconEmoji}>
                                    {ICON_MAP[iconKey] || '📍'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Color Picker */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Color *</Text>
                    <View style={styles.colorGrid}>
                        {ROOM_COLORS.map((colorOption) => (
                            <TouchableOpacity
                                key={colorOption}
                                style={[
                                    styles.colorOption,
                                    { backgroundColor: colorOption },
                                    color === colorOption && styles.colorOptionSelected,
                                ]}
                                onPress={() => setColor(colorOption)}
                            >
                                {color === colorOption && (
                                    <Text style={styles.checkmark}>✓</Text>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Description Input (Optional) */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Description (Optional)</Text>
                    <TextInput
                        style={[
                            styles.input,
                            styles.textArea,
                            errors.description && styles.inputError,
                        ]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="e.g., Main bedroom on second floor"
                        placeholderTextColor="#999"
                        multiline
                        numberOfLines={3}
                        maxLength={200}
                    />
                    {errors.description && (
                        <Text style={styles.errorText}>{errors.description}</Text>
                    )}
                </View>

                {/* Preview */}
                <View style={styles.previewSection}>
                    <Text style={styles.label}>Preview</Text>
                    <View style={[styles.preview, { borderLeftColor: color }]}>
                        <View style={[styles.previewIcon, { backgroundColor: color + '20' }]}>
                            <Text style={styles.previewIconEmoji}>
                                {ICON_MAP[icon] || '📍'}
                            </Text>
                        </View>
                        <View style={styles.previewContent}>
                            <Text style={styles.previewName}>
                                {name.trim() || 'Room Name'}
                            </Text>
                            {description.trim() && (
                                <Text style={styles.previewDescription}>
                                    {description.trim()}
                                </Text>
                            )}
                        </View>
                    </View>
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
                        <Text style={styles.saveButtonText}>Save Room</Text>
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
    iconGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    iconOption: {
        width: 60,
        height: 60,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#ddd',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconOptionSelected: {
        borderColor: '#4ECDC4',
        backgroundColor: '#f0f9ff',
    },
    iconEmoji: {
        fontSize: 32,
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    colorOption: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'transparent',
    },
    colorOptionSelected: {
        borderColor: '#333',
    },
    checkmark: {
        fontSize: 24,
        color: '#fff',
        fontWeight: 'bold',
    },
    previewSection: {
        marginTop: 8,
    },
    preview: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    previewIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    previewIconEmoji: {
        fontSize: 28,
    },
    previewContent: {
        flex: 1,
        justifyContent: 'center',
    },
    previewName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    previewDescription: {
        fontSize: 13,
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
