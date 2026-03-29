/**
 * ScreenWrapper — replaces SafeAreaView in screens.
 * On web: uses a plain View with 100vh height so inner ScrollViews/FlatLists can scroll.
 * On native: delegates to SafeAreaView as normal.
 */

import React from 'react';
import { Platform, SafeAreaView, View, StyleSheet, ViewStyle } from 'react-native';

interface Props {
    children: React.ReactNode;
    style?: ViewStyle | ViewStyle[];
}

export default function ScreenWrapper({ children, style }: Props) {
    if (Platform.OS === 'web') {
        return (
            <View style={[styles.webRoot, style]}>
                {children}
            </View>
        );
    }
    return (
        <SafeAreaView style={[styles.native, style]}>
            {children}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    webRoot: {
        flex: 1,
        // On web, flex:1 alone doesn't give a height — we need the full viewport height.
        // Cast through any because RN's types don't expose web-only CSS values.
        ...(Platform.OS === 'web' ? { height: '100vh' as any, overflow: 'hidden' as any } : {}),
        backgroundColor: '#fff',
    },
    native: {
        flex: 1,
        backgroundColor: '#fff',
    },
});
