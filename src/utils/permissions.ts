/**
 * Permission utility functions
 * Helpers for requesting and handling app permissions
 */

import { Alert, Linking, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

/**
 * Request camera permission with user-friendly explanation
 * 
 * @returns Permission status
 */
export async function requestCameraPermission(): Promise<PermissionStatus> {
    try {
        const { status } = await Camera.requestCameraPermissionsAsync();

        if (status === 'granted') {
            return 'granted';
        } else if (status === 'denied') {
            return 'denied';
        }

        return 'undetermined';
    } catch (error) {
        console.error('Error requesting camera permission:', error);
        return 'denied';
    }
}

/**
 * Request media library permission
 * 
 * @returns Permission status
 */
export async function requestMediaLibraryPermission(): Promise<PermissionStatus> {
    try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status === 'granted') {
            return 'granted';
        } else if (status === 'denied') {
            return 'denied';
        }

        return 'undetermined';
    } catch (error) {
        console.error('Error requesting media library permission:', error);
        return 'denied';
    }
}

/**
 * Check if camera permission is granted
 * 
 * @returns True if granted, false otherwise
 */
export async function hasCameraPermission(): Promise<boolean> {
    try {
        const { status } = await Camera.getCameraPermissionsAsync();
        return status === 'granted';
    } catch (error) {
        console.error('Error checking camera permission:', error);
        return false;
    }
}

/**
 * Check if media library permission is granted
 * 
 * @returns True if granted, false otherwise
 */
export async function hasMediaLibraryPermission(): Promise<boolean> {
    try {
        const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
        return status === 'granted';
    } catch (error) {
        console.error('Error checking media library permission:', error);
        return false;
    }
}

/**
 * Show alert for camera permission denied with option to open settings
 * 
 * @param onFallback - Callback to use image picker as fallback
 */
export function showCameraPermissionDeniedAlert(onFallback?: () => void): void {
    Alert.alert(
        'Camera Access Required',
        'Camera access is needed to take photos of your items. You can grant permission in Settings or use the photo library instead.',
        [
            {
                text: 'Use Photo Library',
                onPress: onFallback,
                style: 'default',
            },
            {
                text: 'Open Settings',
                onPress: () => {
                    if (Platform.OS === 'ios') {
                        Linking.openURL('app-settings:');
                    } else {
                        Linking.openSettings();
                    }
                },
            },
            {
                text: 'Cancel',
                style: 'cancel',
            },
        ]
    );
}

/**
 * Show alert for media library permission denied with option to open settings
 */
export function showMediaLibraryPermissionDeniedAlert(): void {
    Alert.alert(
        'Photo Library Access Required',
        'Photo library access is needed to select photos. Please grant permission in Settings.',
        [
            {
                text: 'Open Settings',
                onPress: () => {
                    if (Platform.OS === 'ios') {
                        Linking.openURL('app-settings:');
                    } else {
                        Linking.openSettings();
                    }
                },
            },
            {
                text: 'Cancel',
                style: 'cancel',
            },
        ]
    );
}

/**
 * Request camera permission with proper error handling and user guidance
 * 
 * @param onFallback - Callback to use image picker as fallback
 * @returns True if permission granted, false otherwise
 */
export async function ensureCameraPermission(onFallback?: () => void): Promise<boolean> {
    // Check if already granted
    const hasPermission = await hasCameraPermission();
    if (hasPermission) {
        return true;
    }

    // Request permission
    const status = await requestCameraPermission();

    if (status === 'granted') {
        return true;
    }

    // Permission denied - show alert
    showCameraPermissionDeniedAlert(onFallback);
    return false;
}

/**
 * Request media library permission with proper error handling and user guidance
 * 
 * @returns True if permission granted, false otherwise
 */
export async function ensureMediaLibraryPermission(): Promise<boolean> {
    // Check if already granted
    const hasPermission = await hasMediaLibraryPermission();
    if (hasPermission) {
        return true;
    }

    // Request permission
    const status = await requestMediaLibraryPermission();

    if (status === 'granted') {
        return true;
    }

    // Permission denied - show alert
    showMediaLibraryPermissionDeniedAlert();
    return false;
}
