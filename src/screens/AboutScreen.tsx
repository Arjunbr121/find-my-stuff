import React from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, SafeAreaView, StatusBar, Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootNavigationProp } from '../types/navigation';

const BLUE     = '#007AFF';
const BG       = '#F5F6FA';
const CARD     = '#FFFFFF';
const BORDER   = '#E8E8EE';
const ERROR    = '#FF3B30';
const TEXT_PRI = '#1A1A2E';
const TEXT_SEC = '#6B7280';
const TEXT_HNT = '#B0B7C3';

const FEATURES = [
    { icon: '📦', title: 'Track Everything',      desc: 'Add items with photos and pin them to exact locations.' },
    { icon: '🏠', title: 'Organised by Room',      desc: 'Group your belongings by room for instant context.' },
    { icon: '🔍', title: 'Instant Search',         desc: 'Find any item in seconds with fuzzy search.' },
    { icon: '🏷️', title: 'Smart Categories',       desc: 'Tag items so you can filter across every room.' },
    { icon: '🔒', title: 'Private & Secure',       desc: 'Everything stays on your device. Nothing is uploaded.' },
];

export default function AboutScreen() {
    const navigation = useNavigation<RootNavigationProp>();

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>About</Text>
                <View style={{ width: 34 }} />
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}>

                {/* Hero */}
                <View style={styles.hero}>
                    <View style={styles.appIconWrap}>
                        <Text style={styles.appIcon}>📋</Text>
                    </View>
                    <Text style={styles.appName}>Find My Stuff</Text>
                    <Text style={styles.appTagline}>Your personal home inventory, always at hand.</Text>
                    <View style={styles.versionBadge}>
                        <Text style={styles.versionText}>Version 2.4.0 (2023)</Text>
                    </View>
                </View>

                {/* What is this app */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>What is Find My Stuff?</Text>
                    <Text style={styles.cardBody}>
                        Find My Stuff helps you keep track of everything you own — from passports to power tools.
                        Add items with photos, pin them to a room and a specific spot, then find them instantly
                        whenever you need them.{'\n\n'}
                        Everything is stored privately on your device. No account required, no cloud sync,
                        no data collection.
                    </Text>
                </View>

                {/* Features */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>FEATURES</Text>
                    <View style={styles.featureCard}>
                        {FEATURES.map((f, idx) => (
                            <View key={f.title}>
                                <View style={styles.featureRow}>
                                    <View style={styles.featureIconWrap}>
                                        <Text style={styles.featureIcon}>{f.icon}</Text>
                                    </View>
                                    <View style={styles.featureContent}>
                                        <Text style={styles.featureTitle}>{f.title}</Text>
                                        <Text style={styles.featureDesc}>{f.desc}</Text>
                                    </View>
                                </View>
                                {idx < FEATURES.length - 1 && <View style={styles.divider} />}
                            </View>
                        ))}
                    </View>
                </View>

                {/* App info */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>APP INFO</Text>
                    <View style={styles.infoCard}>
                        {[
                            { label: 'Version',    value: '2.4.0' },
                            { label: 'Build',      value: '2023' },
                            { label: 'Platform',   value: 'iOS & Android' },
                            { label: 'Storage',    value: 'Local device only' },
                            { label: 'Data policy',value: 'No data collected' },
                        ].map(({ label, value }, idx, arr) => (
                            <View key={label}>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>{label}</Text>
                                    <Text style={styles.infoValue}>{value}</Text>
                                </View>
                                {idx < arr.length - 1 && <View style={styles.divider} />}
                            </View>
                        ))}
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Made with <Text style={{ color: ERROR }}>♥</Text> for organised homes
                    </Text>
                    <TouchableOpacity onPress={() => Linking.openURL('mailto:support@findmystuff.app')}>
                        <Text style={styles.footerLink}>support@findmystuff.app</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 32 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 13,
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
    },
    backBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
    backArrow: { fontSize: 20, color: TEXT_PRI, fontWeight: '600' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT_PRI, letterSpacing: -0.3 },

    scroll: { flex: 1, backgroundColor: BG },
    scrollContent: { padding: 16, gap: 14 },

    // Hero
    hero: { alignItems: 'center', paddingVertical: 28, gap: 10 },
    appIconWrap: {
        width: 84, height: 84, borderRadius: 22,
        backgroundColor: BLUE + '15', justifyContent: 'center', alignItems: 'center',
        marginBottom: 4,
    },
    appIcon: { fontSize: 44 },
    appName: { fontSize: 26, fontWeight: '800', color: TEXT_PRI, letterSpacing: -0.5 },
    appTagline: { fontSize: 14, color: TEXT_SEC, textAlign: 'center' },
    versionBadge: {
        backgroundColor: CARD, borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 6,
        borderWidth: 1.5, borderColor: BORDER,
    },
    versionText: { fontSize: 12, color: TEXT_HNT, fontWeight: '600' },

    // What is this app
    card: {
        backgroundColor: CARD, borderRadius: 16, padding: 18,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    cardTitle: { fontSize: 16, fontWeight: '700', color: TEXT_PRI, marginBottom: 10, letterSpacing: -0.2 },
    cardBody: { fontSize: 14, color: TEXT_SEC, lineHeight: 22 },

    // Sections
    section: { gap: 8 },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: TEXT_SEC, letterSpacing: 0.8, textTransform: 'uppercase' },

    // Features
    featureCard: {
        backgroundColor: CARD, borderRadius: 16, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    featureRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
    featureIconWrap: {
        width: 40, height: 40, borderRadius: 11,
        backgroundColor: BLUE + '12', justifyContent: 'center', alignItems: 'center',
    },
    featureIcon: { fontSize: 20 },
    featureContent: { flex: 1 },
    featureTitle: { fontSize: 14, fontWeight: '700', color: TEXT_PRI, marginBottom: 2 },
    featureDesc: { fontSize: 12, color: TEXT_SEC, lineHeight: 18 },

    // Info card
    infoCard: {
        backgroundColor: CARD, borderRadius: 16, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
    infoLabel: { fontSize: 14, color: TEXT_SEC },
    infoValue: { fontSize: 14, fontWeight: '600', color: TEXT_PRI },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginHorizontal: 16 },

    // Footer
    footer: { alignItems: 'center', paddingVertical: 16, gap: 6 },
    footerText: { fontSize: 13, color: TEXT_SEC },
    footerLink: { fontSize: 13, color: BLUE, fontWeight: '500' },
});





