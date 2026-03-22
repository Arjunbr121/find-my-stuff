/**
 * Settings Screen
 * Provides app settings including data export/import and storage management
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useItemStore, useRoomStore } from '../stores';
import { storage } from '../storage';
import {
    exportToFile,
    shareExportFile,
    pickImportFile,
    parseImportData,
    getImportPreview,
} from '../utils/exportImport';
import {
    checkStorageSpace,
    formatBytes,
    getImageStorageUsage,
} from '../utils/storage';

export const SettingsScreen: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [storageInfo, setStorageInfo] = useState<{
        available: number;
        total: number;
        imageUsage: number;
    } | null>(null);

    const itemStore = useItemStore();
    const roomStore = useRoomStore();

    // Load storage info on mount
    useEffect(() => {
        loadStorageInfo();
    }, []);

    const loadStorageInfo = async () => {
        try {
            const spaceInfo = await checkStorageSpace();
            const imageUsage = await getImageStorageUsage();

            setStorageInfo({
                available: spaceInfo.available,
                total: spaceInfo.total,
                imageUsage,
            });
        } catch (error) {
            console.error('Failed to load storage info:', error);
        }
    };

    const handleExport = async () => {
        try {
            setLoading(true);

            // Show privacy warning
            Alert.alert(
                'Export Data',
                'This will export all your items and rooms to a JSON file. ' +
                'The file will not include images, only references to them. ' +
                'Keep the exported file secure as it contains your personal inventory data.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Export',
                        onPress: async () => {
                            try {
                                // Get data from storage
                                const data = await storage.exportData();

                                // Export to file
                                const fileUri = await exportToFile(data);

                                // Share the file
                                await shareExportFile(fileUri);

                                Alert.alert(
                                    'Success',
                                    `Exported ${data.items.length} items and ${data.rooms.length} rooms.`
                                );
                            } catch (error) {
                                Alert.alert(
                                    'Export Failed',
                                    error instanceof Error ? error.message : 'Unknown error'
                                );
                            } finally {
                                setLoading(false);
                            }
                        },
                    },
                ]
            );
        } catch (error) {
            Alert.alert(
                'Export Failed',
                error instanceof Error ? error.message : 'Unknown error'
            );
            setLoading(false);
        }
    };

    const handleImport = async () => {
        try {
            setLoading(true);

            // Pick file
            const fileData = await pickImportFile();

            if (!fileData) {
                setLoading(false);
                return; // User cancelled
            }

            // Parse and validate
            const importData = parseImportData(fileData.content);
            const preview = getImportPreview(importData);

            // Show preview and confirmation
            Alert.alert(
                'Import Data',
                `This will import:\n` +
                `• ${preview.itemCount} items\n` +
                `• ${preview.roomCount} rooms\n\n` +
                `Export date: ${new Date(preview.exportDate).toLocaleDateString()}\n\n` +
                `This will replace all existing data. Continue?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Import',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                // Import data to storage
                                await storage.importData({
                                    items: importData.items,
                                    rooms: importData.rooms,
                                });

                                // Reload stores
                                await roomStore.loadRooms();
                                await itemStore.loadItems();

                                Alert.alert(
                                    'Success',
                                    `Imported ${preview.itemCount} items and ${preview.roomCount} rooms.`
                                );
                            } catch (error) {
                                Alert.alert(
                                    'Import Failed',
                                    error instanceof Error ? error.message : 'Unknown error'
                                );
                            } finally {
                                setLoading(false);
                            }
                        },
                    },
                ]
            );
        } catch (error) {
            Alert.alert(
                'Import Failed',
                error instanceof Error ? error.message : 'Unknown error'
            );
            setLoading(false);
        }
    };

    const handleClearAll = () => {
        Alert.alert(
            'Clear All Data',
            'This will permanently delete all items and rooms. This action cannot be undone.\n\n' +
            'Consider exporting your data first.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);

                            // Clear storage
                            await storage.clearAll();

                            // Reload stores
                            await roomStore.loadRooms();
                            await itemStore.loadItems();

                            Alert.alert('Success', 'All data has been cleared.');
                        } catch (error) {
                            Alert.alert(
                                'Failed to Clear Data',
                                error instanceof Error ? error.message : 'Unknown error'
                            );
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Data Management</Text>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleExport}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>Export Data</Text>
                    <Text style={styles.buttonDescription}>
                        Save your items and rooms to a file
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleImport}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>Import Data</Text>
                    <Text style={styles.buttonDescription}>
                        Restore data from a backup file
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.dangerButton]}
                    onPress={handleClearAll}
                    disabled={loading}
                >
                    <Text style={[styles.buttonText, styles.dangerText]}>Clear All Data</Text>
                    <Text style={styles.buttonDescription}>
                        Delete all items and rooms
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Storage</Text>

                {storageInfo ? (
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Available Space:</Text>
                            <Text style={styles.infoValue}>
                                {formatBytes(storageInfo.available)}
                            </Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Total Space:</Text>
                            <Text style={styles.infoValue}>
                                {formatBytes(storageInfo.total)}
                            </Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Image Storage:</Text>
                            <Text style={styles.infoValue}>
                                {formatBytes(storageInfo.imageUsage)}
                            </Text>
                        </View>
                    </View>
                ) : (
                    <ActivityIndicator size="small" color="#007AFF" />
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Statistics</Text>

                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Total Items:</Text>
                        <Text style={styles.infoValue}>{itemStore.items.length}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Total Rooms:</Text>
                        <Text style={styles.infoValue}>{roomStore.rooms.length}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>

                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>App Name:</Text>
                        <Text style={styles.infoValue}>Find My Stuff</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Version:</Text>
                        <Text style={styles.infoValue}>1.0.0</Text>
                    </View>
                </View>
            </View>

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    section: {
        marginTop: 20,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    button: {
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    dangerButton: {
        borderColor: '#FF3B30',
        borderWidth: 1,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#007AFF',
        marginBottom: 4,
    },
    dangerText: {
        color: '#FF3B30',
    },
    buttonDescription: {
        fontSize: 14,
        color: '#666',
    },
    infoCard: {
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    infoLabel: {
        fontSize: 15,
        color: '#666',
    },
    infoValue: {
        fontSize: 15,
        fontWeight: '500',
        color: '#333',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
