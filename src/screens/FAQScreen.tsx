import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput,
    TouchableOpacity, SafeAreaView, StatusBar,
    Animated, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootNavigationProp } from '../types/navigation';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BLUE     = '#007AFF';
const BG       = '#F5F6FA';
const CARD     = '#FFFFFF';
const BORDER   = '#E8E8EE';
const TEXT_PRI = '#1A1A2E';
const TEXT_SEC = '#6B7280';
const TEXT_HNT = '#B0B7C3';

interface FAQItem    { q: string; a: string; }
interface FAQSection { title: string; icon: string; items: FAQItem[]; }

const FAQ_DATA: FAQSection[] = [
    {
        title: 'Getting Started', icon: '🚀',
        items: [
            { q: 'How do I add my first item?',     a: "Tap the blue + button on the home screen. Fill in the item name, select a room, add a specific location (e.g. 'Top drawer'), and optionally take a photo. Tap Save Item and it's added instantly." },
            { q: 'Do I need to create an account?', a: "No account needed! Find My Stuff works entirely offline. All your data is stored locally on your device — no sign-up, no cloud, no subscription." },
            { q: 'How do I create rooms?',          a: "Go to the Rooms tab and tap + Add Room. Give it a name, pick an icon and a colour, then tap Create Room. You can add as many rooms as you need." },
        ],
    },
    {
        title: 'Finding Items', icon: '🔍',
        items: [
            { q: 'How do I search for an item?',            a: "Use the search bar at the top of the Home screen. It searches item names, locations, and room names using fuzzy matching — so partial or misspelled words still find results." },
            { q: 'Can I filter items by room or category?', a: "Yes! On the Home screen tap Browse by Location to see items grouped by room. Use Quick Filters (All / Recent / Favourites) to narrow results further." },
            { q: 'What are categories?',                    a: "Categories are tags like Electronics, Clothing, or Tools. They let you find all items of a certain type across every room. Manage them in Settings → Manage Categories." },
        ],
    },
    {
        title: 'Photos & Images', icon: '📷',
        items: [
            { q: 'Do I have to add a photo?',          a: "Photos are optional but recommended. A photo of the exact drawer or shelf makes it much easier to find things without second-guessing." },
            { q: 'Where are my photos stored?',        a: "Photos are stored locally inside the app's private storage. They are never uploaded to any server." },
            { q: 'Can I change a photo after saving?', a: "Yes. Open the item, tap Edit, then tap the photo to replace it with a new one from your camera or photo library." },
        ],
    },
    {
        title: 'Data & Privacy', icon: '🔒',
        items: [
            { q: 'Is my data private?',               a: "Completely. Everything stays on your device. No data is collected, there is no cloud sync, and no analytics are sent anywhere." },
            { q: 'How do I back up my data?',         a: "Go to Settings → Export Data (CSV/JSON) to save a backup file or share it to iCloud / Google Drive." },
            { q: 'What if I delete the app?',         a: "All data will be lost since it's stored locally. Always export a backup before uninstalling." },
        ],
    },
    {
        title: 'Security', icon: '🛡️',
        items: [
            { q: 'Can I lock the app with a password?', a: "Yes! Go to Settings → Change Password to set a password, then enable App Lock. You can also use Face ID or Fingerprint to unlock." },
            { q: 'What if I forget my password?',       a: "Your password is stored only on your device and cannot be recovered remotely. If you forget it, you will need to reinstall the app. Export your data first!" },
        ],
    },
];

// ─── Accordion item ───────────────────────────────────────────────────────────
const AccordionItem: React.FC<{ item: FAQItem; isLast: boolean }> = ({ item, isLast }) => {
    const [open, setOpen] = useState(false);
    const rotateAnim = useRef(new Animated.Value(0)).current;

    const toggle = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        Animated.spring(rotateAnim, { toValue: open ? 0 : 1, useNativeDriver: true, tension: 120, friction: 8 }).start();
        setOpen(o => !o);
    };

    const chevron = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

    return (
        <View>
            <TouchableOpacity style={accStyles.trigger} onPress={toggle} activeOpacity={0.7}>
                <View style={accStyles.qRow}>
                    <View style={[accStyles.dot, open && accStyles.dotActive]} />
                    <Text style={[accStyles.question, open && accStyles.questionActive]}>{item.q}</Text>
                </View>
                <Animated.Text style={[accStyles.chevron, open && accStyles.chevronActive, { transform: [{ rotate: chevron }] }]}>▾</Animated.Text>
            </TouchableOpacity>
            {open && (
                <View style={accStyles.answerWrap}>
                    <Text style={accStyles.answer}>{item.a}</Text>
                </View>
            )}
            {!isLast && <View style={accStyles.divider} />}
        </View>
    );
};

const accStyles = StyleSheet.create({
    trigger: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
    qRow: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: TEXT_HNT, marginTop: 7 },
    dotActive: { backgroundColor: BLUE },
    question: { flex: 1, fontSize: 14, fontWeight: '600', color: TEXT_PRI, lineHeight: 20 },
    questionActive: { color: BLUE },
    chevron: { fontSize: 16, color: TEXT_HNT },
    chevronActive: { color: BLUE },
    answerWrap: { paddingHorizontal: 32, paddingBottom: 14 },
    answer: { fontSize: 13, color: TEXT_SEC, lineHeight: 21 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginHorizontal: 16 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function FAQScreen() {
    const navigation = useNavigation<RootNavigationProp>();
    const [search, setSearch] = useState('');

    const filtered: FAQSection[] = FAQ_DATA
        .map(s => ({
            ...s,
            items: s.items.filter(
                item =>
                    item.q.toLowerCase().includes(search.toLowerCase()) ||
                    item.a.toLowerCase().includes(search.toLowerCase())
            ),
        }))
        .filter(s => s.items.length > 0);

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>FAQ</Text>
                <View style={{ width: 34 }} />
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                <View style={styles.hero}>
                    <Text style={styles.heroIcon}>❓</Text>
                    <Text style={styles.heroTitle}>Frequently Asked Questions</Text>
                    <Text style={styles.heroSub}>Tap any question to expand the answer</Text>
                </View>

                <View style={styles.searchBar}>
                    <Text style={styles.searchIconText}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search questions..."
                        placeholderTextColor={TEXT_HNT}
                        autoCorrect={false}
                        autoCapitalize="none"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Text style={styles.clearText}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {filtered.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>🔍</Text>
                        <Text style={styles.emptyTitle}>No results found</Text>
                        <Text style={styles.emptySub}>Try different keywords</Text>
                    </View>
                ) : (
                    filtered.map(section => (
                        <View key={section.title} style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionIcon}>{section.icon}</Text>
                                <Text style={styles.sectionTitle}>{section.title}</Text>
                                <View style={styles.countBadge}>
                                    <Text style={styles.countText}>{section.items.length}</Text>
                                </View>
                            </View>
                            <View style={styles.sectionCard}>
                                {section.items.map((item, idx) => (
                                    <AccordionItem key={item.q} item={item} isLast={idx === section.items.length - 1} />
                                ))}
                            </View>
                        </View>
                    ))
                )}

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

    hero: { alignItems: 'center', paddingVertical: 20, gap: 8 },
    heroIcon: { fontSize: 40 },
    heroTitle: { fontSize: 20, fontWeight: '800', color: TEXT_PRI, letterSpacing: -0.4, textAlign: 'center' },
    heroSub: { fontSize: 13, color: TEXT_SEC },

    searchBar: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: CARD, borderRadius: 12,
        paddingHorizontal: 12, paddingVertical: 10,
        borderWidth: 1.5, borderColor: BORDER, gap: 8,
    },
    searchIconText: { fontSize: 15, opacity: 0.5 },
    searchInput: { flex: 1, fontSize: 15, color: TEXT_PRI },
    clearText: { fontSize: 13, color: TEXT_HNT, fontWeight: '600' },

    section: { gap: 8 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionIcon: { fontSize: 16 },
    sectionTitle: { flex: 1, fontSize: 12, fontWeight: '700', color: TEXT_SEC, letterSpacing: 0.5, textTransform: 'uppercase' },
    countBadge: { backgroundColor: BLUE + '15', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
    countText: { fontSize: 11, fontWeight: '700', color: BLUE },
    sectionCard: {
        backgroundColor: CARD, borderRadius: 16, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },

    emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10 },
    emptyIcon: { fontSize: 40 },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: TEXT_PRI },
    emptySub: { fontSize: 13, color: TEXT_SEC },
});