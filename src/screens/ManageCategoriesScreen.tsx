import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Modal,
    TextInput,
    ActivityIndicator,
    Alert,
    Animated,
    Platform,
    FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootNavigationProp } from '../types/navigation';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const BLUE     = '#007AFF';
const BG       = '#F5F6FA';
const CARD     = '#FFFFFF';
const BORDER   = '#E8E8EE';
const ERROR    = '#FF3B30';
const GREEN    = '#34C759';
const TEXT_PRI = '#1A1A2E';
const TEXT_SEC = '#6B7280';
const TEXT_HNT = '#B0B7C3';

// ─── Category type ────────────────────────────────────────────────────────────
export interface Category {
    id: string;
    name: string;
    icon: string;
    color: string;
    isDefault?: boolean;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────
const DEFAULT_CATEGORIES: Category[] = [
    { id: 'electronics',  name: 'Electronics',  icon: '💻', color: '#007AFF', isDefault: true },
    { id: 'clothing',     name: 'Clothing',     icon: '👕', color: '#FF9500', isDefault: true },
    { id: 'tools',        name: 'Tools',        icon: '🔧', color: '#636366', isDefault: true },
    { id: 'documents',    name: 'Documents',    icon: '📄', color: '#34C759', isDefault: true },
    { id: 'furniture',    name: 'Furniture',    icon: '🪑', color: '#AF52DE', isDefault: true },
    { id: 'kitchen',      name: 'Kitchen',      icon: '🍳', color: '#FF6B9D', isDefault: true },
    { id: 'sports',       name: 'Sports',       icon: '⚽', color: '#FF3B30', isDefault: true },
    { id: 'books',        name: 'Books',        icon: '📚', color: '#5856D6', isDefault: true },
];

const ICON_OPTIONS = [
    '💻','📱','🎮','📷','🎧','🔋','💡','📺',
    '👕','👗','👟','🧥','👔','🎒','👜','🧣',
    '🔧','🪛','🔨','⚙️','🪚','🔩','🪝','🧰',
    '📄','📁','📚','📖','🗂️','📝','🗒️','📌',
    '🪑','🛋️','🛏️','🚿','🪴','🖼️','🪞','🪟',
    '🍳','☕','🍽️','🥄','🫙','🧴','🧹','🧺',
    '⚽','🏀','🎾','🏋️','🧘','🚴','🏊','⛷️',
    '🌳','🌸','🐾','🎵','🎨','✈️','🚗','⭐',
];

const COLOR_OPTIONS = [
    '#007AFF','#34C759','#FF9500','#FF3B30',
    '#5856D6','#AF52DE','#FF6B9D','#636366',
    '#4ECDC4','#FFD60A','#30B0C7','#FF6B35',
];

// ─── Category Row ─────────────────────────────────────────────────────────────
const CategoryRow: React.FC<{
    category: Category;
    itemCount: number;
    onEdit: (c: Category) => void;
    onDelete: (c: Category) => void;
}> = ({ category, itemCount, onEdit, onDelete }) => {
    const slideAnim = useRef(new Animated.Value(0)).current;
    const [swiped, setSwiped] = useState(false);

    const handleLongPress = () => {
        if (category.isDefault) return;
        setSwiped(true);
        Animated.spring(slideAnim, {
            toValue: -80, useNativeDriver: true, tension: 100, friction: 10,
        }).start();
    };

    const handleReset = () => {
        setSwiped(false);
        Animated.spring(slideAnim, {
            toValue: 0, useNativeDriver: true, tension: 100, friction: 10,
        }).start();
    };

    return (
        <View style={rowStyles.wrapper}>
            {/* Delete action behind the row */}
            {!category.isDefault && (
                <TouchableOpacity
                    style={rowStyles.deleteAction}
                    onPress={() => { handleReset(); onDelete(category); }}
                >
                    <Text style={rowStyles.deleteActionIcon}>🗑️</Text>
                    <Text style={rowStyles.deleteActionText}>Delete</Text>
                </TouchableOpacity>
            )}

            <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
                <TouchableOpacity
                    style={rowStyles.row}
                    onPress={swiped ? handleReset : () => onEdit(category)}
                    onLongPress={handleLongPress}
                    activeOpacity={0.75}
                >
                    <View style={[rowStyles.iconWrap, { backgroundColor: category.color + '20' }]}>
                        <Text style={rowStyles.icon}>{category.icon}</Text>
                    </View>
                    <View style={rowStyles.content}>
                        <View style={rowStyles.nameRow}>
                            <Text style={rowStyles.name}>{category.name}</Text>
                            {category.isDefault && (
                                <View style={rowStyles.defaultBadge}>
                                    <Text style={rowStyles.defaultBadgeText}>DEFAULT</Text>
                                </View>
                            )}
                        </View>
                        <Text style={rowStyles.count}>
                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </Text>
                    </View>
                    <View style={[rowStyles.colorDot, { backgroundColor: category.color }]} />
                    {!category.isDefault && (
                        <Text style={rowStyles.editHint}>✏️</Text>
                    )}
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

const rowStyles = StyleSheet.create({
    wrapper: { position: 'relative', marginBottom: 2, overflow: 'hidden', borderRadius: 14 },
    deleteAction: {
        position: 'absolute', right: 0, top: 0, bottom: 0,
        width: 80, backgroundColor: ERROR,
        justifyContent: 'center', alignItems: 'center', gap: 4,
    },
    deleteActionIcon: { fontSize: 18 },
    deleteActionText: { fontSize: 11, fontWeight: '700', color: '#fff' },
    row: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: CARD, padding: 14, gap: 12,
    },
    iconWrap: {
        width: 44, height: 44, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
    },
    icon: { fontSize: 22 },
    content: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    name: { fontSize: 15, fontWeight: '600', color: TEXT_PRI },
    defaultBadge: {
        backgroundColor: BG, borderRadius: 4,
        paddingHorizontal: 6, paddingVertical: 2,
    },
    defaultBadgeText: { fontSize: 9, fontWeight: '700', color: TEXT_HNT, letterSpacing: 0.5 },
    count: { fontSize: 12, color: TEXT_SEC },
    colorDot: { width: 10, height: 10, borderRadius: 5 },
    editHint: { fontSize: 14, marginLeft: 4 },
});

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
const CategoryModal: React.FC<{
    visible: boolean;
    editing: Category | null;
    onSave: (name: string, icon: string, color: string) => void;
    onCancel: () => void;
    saving: boolean;
}> = ({ visible, editing, onSave, onCancel, saving }) => {
    const [name,  setName]  = useState(editing?.name  ?? '');
    const [icon,  setIcon]  = useState(editing?.icon  ?? ICON_OPTIONS[0]);
    const [color, setColor] = useState(editing?.color ?? COLOR_OPTIONS[0]);

    React.useEffect(() => {
        if (visible) {
            setName(editing?.name   ?? '');
            setIcon(editing?.icon   ?? ICON_OPTIONS[0]);
            setColor(editing?.color ?? COLOR_OPTIONS[0]);
        }
    }, [visible, editing]);

    const canSave = name.trim().length > 0;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
            <View style={mStyles.overlay}>
                <View style={mStyles.sheet}>
                    {/* Handle */}
                    <View style={mStyles.handle} />

                    {/* Preview */}
                    <View style={[mStyles.preview, { backgroundColor: color + '18' }]}>
                        <View style={[mStyles.previewIcon, { backgroundColor: color + '30' }]}>
                            <Text style={mStyles.previewEmoji}>{icon}</Text>
                        </View>
                        <Text style={[mStyles.previewName, { color }]}>
                            {name.trim() || 'Category Name'}
                        </Text>
                    </View>

                    {/* Name input */}
                    <View style={mStyles.field}>
                        <Text style={mStyles.fieldLabel}>CATEGORY NAME</Text>
                        <TextInput
                            style={mStyles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g., Electronics"
                            placeholderTextColor={TEXT_HNT}
                            maxLength={30}
                            autoFocus
                        />
                    </View>

                    {/* Icon picker */}
                    <View style={mStyles.field}>
                        <Text style={mStyles.fieldLabel}>ICON</Text>
                        <FlatList
                            data={ICON_OPTIONS}
                            numColumns={8}
                            keyExtractor={i => i}
                            scrollEnabled={false}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        mStyles.iconOption,
                                        item === icon && { backgroundColor: color, borderColor: color },
                                    ]}
                                    onPress={() => setIcon(item)}
                                >
                                    <Text style={mStyles.iconEmoji}>{item}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>

                    {/* Color picker */}
                    <View style={mStyles.field}>
                        <Text style={mStyles.fieldLabel}>COLOR</Text>
                        <View style={mStyles.colorRow}>
                            {COLOR_OPTIONS.map(c => (
                                <TouchableOpacity
                                    key={c}
                                    style={[
                                        mStyles.colorSwatch,
                                        { backgroundColor: c },
                                        c === color && mStyles.colorSwatchSelected,
                                    ]}
                                    onPress={() => setColor(c)}
                                >
                                    {c === color && <Text style={mStyles.colorCheck}>✓</Text>}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Actions */}
                    <View style={mStyles.actions}>
                        <TouchableOpacity style={mStyles.cancelBtn} onPress={onCancel} disabled={saving}>
                            <Text style={mStyles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[mStyles.saveBtn, { backgroundColor: color }, !canSave && mStyles.saveBtnDisabled]}
                            onPress={() => canSave && onSave(name.trim(), icon, color)}
                            disabled={saving || !canSave}
                        >
                            {saving
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={mStyles.saveBtnText}>{editing ? 'Save Changes' : 'Add Category'}</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const mStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: CARD,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24, gap: 16,
    },
    handle: {
        width: 36, height: 4, borderRadius: 2,
        backgroundColor: BORDER, alignSelf: 'center', marginBottom: 4,
    },
    preview: {
        alignItems: 'center', borderRadius: 16,
        paddingVertical: 20, gap: 8,
    },
    previewIcon: {
        width: 60, height: 60, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center',
    },
    previewEmoji: { fontSize: 30 },
    previewName: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
    field: { gap: 8 },
    fieldLabel: {
        fontSize: 11, fontWeight: '700', color: TEXT_SEC,
        letterSpacing: 0.8, textTransform: 'uppercase',
    },
    input: {
        backgroundColor: BG, borderWidth: 1.5, borderColor: BORDER,
        borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
        fontSize: 15, color: TEXT_PRI,
    },
    iconOption: {
        flex: 1, aspectRatio: 1, margin: 3, borderRadius: 10,
        borderWidth: 1.5, borderColor: BORDER,
        backgroundColor: BG, justifyContent: 'center', alignItems: 'center',
    },
    iconEmoji: { fontSize: 20 },
    colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    colorSwatch: {
        width: 34, height: 34, borderRadius: 17,
        justifyContent: 'center', alignItems: 'center',
    },
    colorSwatchSelected: { borderWidth: 3, borderColor: TEXT_PRI },
    colorCheck: { fontSize: 14, color: '#fff', fontWeight: '800' },
    actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    cancelBtn: {
        flex: 1, paddingVertical: 14, borderRadius: 12,
        borderWidth: 1.5, borderColor: BORDER, alignItems: 'center',
    },
    cancelText: { fontSize: 15, fontWeight: '600', color: TEXT_SEC },
    saveBtn: {
        flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
        shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
    },
    saveBtnDisabled: { opacity: 0.45, shadowOpacity: 0 },
    saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ManageCategoriesScreen() {
    const navigation = useNavigation<RootNavigationProp>();

    const [categories,   setCategories]   = useState<Category[]>(DEFAULT_CATEGORIES);
    const [modalVisible, setModalVisible] = useState(false);
    const [editing,      setEditing]      = useState<Category | null>(null);
    const [saving,       setSaving]       = useState(false);
    const [search,       setSearch]       = useState('');

    // Mock item counts — replace with real store data
    const itemCounts: Record<string, number> = useMemo(() => ({
        electronics: 12, clothing: 8, tools: 5, documents: 3,
        furniture: 7, kitchen: 14, sports: 4, books: 9,
    }), []);

    const filtered = useMemo(() => {
        if (!search.trim()) return categories;
        return categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    }, [categories, search]);

    const totalItems = useMemo(() =>
        Object.values(itemCounts).reduce((a, b) => a + b, 0), [itemCounts]);

    const handleAdd = () => {
        setEditing(null);
        setModalVisible(true);
    };

    const handleEdit = (cat: Category) => {
        if (cat.isDefault) return;
        setEditing(cat);
        setModalVisible(true);
    };

    const handleSave = async (name: string, icon: string, color: string) => {
        setSaving(true);
        try {
            // Simulate async save
            await new Promise(r => setTimeout(r, 400));

            if (editing) {
                setCategories(prev =>
                    prev.map(c => c.id === editing.id ? { ...c, name, icon, color } : c)
                );
            } else {
                const newCat: Category = {
                    id: Date.now().toString(),
                    name, icon, color,
                };
                setCategories(prev => [...prev, newCat]);
            }
            setModalVisible(false);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (cat: Category) => {
        const count = itemCounts[cat.id] ?? 0;
        Alert.alert(
            `Delete "${cat.name}"?`,
            count > 0
                ? `This category has ${count} item${count !== 1 ? 's' : ''} assigned to it. Items will become uncategorised.`
                : 'This category will be permanently removed.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive',
                    onPress: () => setCategories(prev => prev.filter(c => c.id !== cat.id)),
                },
            ]
        );
    };

    const customCount   = categories.filter(c => !c.isDefault).length;
    const defaultCount  = categories.filter(c =>  c.isDefault).length;

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Manage Categories</Text>
                <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
                    <Text style={styles.addBtnText}>＋ Add</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── Stats bar ── */}
                <View style={styles.statsBar}>
                    <View style={styles.statCell}>
                        <Text style={styles.statValue}>{categories.length}</Text>
                        <Text style={styles.statLabel}>Total</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statCell}>
                        <Text style={styles.statValue}>{customCount}</Text>
                        <Text style={styles.statLabel}>Custom</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statCell}>
                        <Text style={styles.statValue}>{totalItems}</Text>
                        <Text style={styles.statLabel}>Items Tagged</Text>
                    </View>
                </View>

                {/* ── Info banner ── */}
                <View style={styles.infoBanner}>
                    <Text style={styles.infoIcon}>💡</Text>
                    <Text style={styles.infoText}>
                        Categories help you filter items across all rooms. Long-press a custom category to delete it.
                    </Text>
                </View>

                {/* ── Search ── */}
                <View style={styles.searchBar}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search categories..."
                        placeholderTextColor={TEXT_HNT}
                        autoCorrect={false}
                        autoCapitalize="none"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Text style={styles.searchClear}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── Default categories ── */}
                {filtered.some(c => c.isDefault) && (
                    <View style={styles.group}>
                        <Text style={styles.groupLabel}>DEFAULT CATEGORIES</Text>
                        <View style={styles.groupCard}>
                            {filtered.filter(c => c.isDefault).map((cat, idx, arr) => (
                                <View key={cat.id}>
                                    <CategoryRow
                                        category={cat}
                                        itemCount={itemCounts[cat.id] ?? 0}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                    />
                                    {idx < arr.length - 1 && <View style={styles.divider} />}
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* ── Custom categories ── */}
                {filtered.some(c => !c.isDefault) && (
                    <View style={styles.group}>
                        <Text style={styles.groupLabel}>YOUR CATEGORIES</Text>
                        <View style={styles.groupCard}>
                            {filtered.filter(c => !c.isDefault).map((cat, idx, arr) => (
                                <View key={cat.id}>
                                    <CategoryRow
                                        category={cat}
                                        itemCount={itemCounts[cat.id] ?? 0}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                    />
                                    {idx < arr.length - 1 && <View style={styles.divider} />}
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* ── Empty search state ── */}
                {filtered.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>🔍</Text>
                        <Text style={styles.emptyTitle}>No categories found</Text>
                        <Text style={styles.emptyMsg}>Try a different search term</Text>
                    </View>
                )}

                {/* ── Add category CTA ── */}
                <TouchableOpacity style={styles.addCard} onPress={handleAdd} activeOpacity={0.75}>
                    <View style={styles.addCardIcon}>
                        <Text style={styles.addCardPlus}>＋</Text>
                    </View>
                    <View>
                        <Text style={styles.addCardTitle}>Create New Category</Text>
                        <Text style={styles.addCardSub}>Add a custom tag for your items</Text>
                    </View>
                </TouchableOpacity>

                <View style={{ height: 32 }} />
            </ScrollView>

            {/* ── Add / Edit Modal ── */}
            <CategoryModal
                visible={modalVisible}
                editing={editing}
                onSave={handleSave}
                onCancel={() => setModalVisible(false)}
                saving={saving}
            />
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 13,
        backgroundColor: '#fff',
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
    },
    backBtn: {
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: BG, justifyContent: 'center', alignItems: 'center',
    },
    backArrow: { fontSize: 20, color: TEXT_PRI, fontWeight: '600' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT_PRI, letterSpacing: -0.3 },
    addBtn: {
        paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: 8, backgroundColor: BLUE + '12',
    },
    addBtnText: { fontSize: 13, fontWeight: '700', color: BLUE },

    scroll: { flex: 1, backgroundColor: BG },
    scrollContent: { padding: 16, gap: 12 },

    // Stats
    statsBar: {
        flexDirection: 'row', backgroundColor: CARD, borderRadius: 14,
        paddingVertical: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    statCell: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: '800', color: TEXT_PRI, marginBottom: 2 },
    statLabel: { fontSize: 11, fontWeight: '600', color: TEXT_SEC },
    statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginVertical: 4 },

    // Info banner
    infoBanner: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        backgroundColor: BLUE + '10', borderRadius: 12,
        padding: 12, borderWidth: 1.5, borderColor: BLUE + '25',
    },
    infoIcon: { fontSize: 15 },
    infoText: { flex: 1, fontSize: 12, color: BLUE, lineHeight: 18, fontWeight: '500' },

    // Search
    searchBar: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: CARD, borderRadius: 12,
        paddingHorizontal: 12, paddingVertical: 10,
        borderWidth: 1.5, borderColor: BORDER, gap: 8,
    },
    searchIcon: { fontSize: 15, opacity: 0.5 },
    searchInput: { flex: 1, fontSize: 15, color: TEXT_PRI },
    searchClear: { fontSize: 13, color: TEXT_HNT, fontWeight: '600' },

    // Groups
    group: { gap: 8 },
    groupLabel: {
        fontSize: 11, fontWeight: '700', color: TEXT_SEC,
        letterSpacing: 0.8, textTransform: 'uppercase',
    },
    groupCard: {
        backgroundColor: CARD, borderRadius: 14, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginLeft: 70 },

    // Empty
    emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
    emptyIcon: { fontSize: 40 },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: TEXT_PRI },
    emptyMsg: { fontSize: 13, color: TEXT_SEC },

    // Add CTA card
    addCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: CARD, borderRadius: 14, padding: 16,
        borderWidth: 1.5, borderColor: BLUE + '30', borderStyle: 'dashed',
    },
    addCardIcon: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: BLUE + '12',
        justifyContent: 'center', alignItems: 'center',
    },
    addCardPlus: { fontSize: 22, color: BLUE, fontWeight: '300' },
    addCardTitle: { fontSize: 14, fontWeight: '700', color: BLUE, marginBottom: 2 },
    addCardSub: { fontSize: 12, color: TEXT_SEC },
});