// Pantalla del Armario — listado de prendas con filtros y diseño moderno
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, Image,
    StyleSheet, RefreshControl, ActivityIndicator, StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchGarments, removeGarment, setFilter } from '../store/wardrobeSlice';
import { useTheme } from '../hooks/useTheme';

const CATEGORIES = [
    { key: null, label: 'Todas', icon: '👗' },
    { key: 'camisetas', label: 'Camisetas', icon: '👕' },
    { key: 'pantalones', label: 'Pantalones', icon: '👖' },
    { key: 'zapatos', label: 'Zapatos', icon: '👟' },
    { key: 'chaquetas', label: 'Chaquetas', icon: '🧥' },
    { key: 'accesorios', label: 'Accesorios', icon: '🎒' },
    { key: 'vestidos', label: 'Vestidos', icon: '👗' },
    { key: 'otro', label: 'Otro', icon: '🏷️' },
];

const BASE_URL = 'http://10.0.2.2:3000'; // Android emulator

const WardrobeScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { garments, isLoading, activeFilter } = useSelector((state) => state.wardrobe);
    const { theme, isDark, toggleTheme } = useTheme();
    const c = theme.colors;
    const [refreshing, setRefreshing] = useState(false);

    // Cargar prendas al montar
    useEffect(() => {
        dispatch(fetchGarments(activeFilter ? { category: activeFilter } : {}));
    }, [dispatch, activeFilter]);

    // Pull-to-refresh
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        dispatch(fetchGarments(activeFilter ? { category: activeFilter } : {}))
            .finally(() => setRefreshing(false));
    }, [dispatch, activeFilter]);

    // Filtrar por categoría
    const handleFilter = (key) => {
        dispatch(setFilter(key));
    };

    // Eliminar prenda
    const handleDelete = (id) => {
        dispatch(removeGarment(id));
    };

    // Renderizar tarjeta de prenda
    const renderGarment = ({ item }) => (
        <TouchableOpacity
            style={[styles.garmentCard, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => navigation.navigate('GarmentDetail', { garment: item })}
            activeOpacity={0.8}
        >
            {item.image_url ? (
                <Image
                    source={{ uri: `${BASE_URL}${item.image_url}` }}
                    style={styles.garmentImage}
                    resizeMode="cover"
                />
            ) : (
                <View style={[styles.garmentImagePlaceholder, { backgroundColor: c.surfaceVariant }]}>
                    <Text style={{ fontSize: 36 }}>👕</Text>
                </View>
            )}
            <View style={styles.garmentInfo}>
                <Text style={[styles.garmentName, { color: c.text }]} numberOfLines={1}>
                    {item.name}
                </Text>
                <Text style={[styles.garmentCategory, { color: c.primary }]}>
                    {item.category}
                </Text>
                {item.brand && (
                    <Text style={[styles.garmentBrand, { color: c.textMuted }]}>{item.brand}</Text>
                )}
            </View>
            {item.is_favorite && (
                <View style={styles.favBadge}>
                    <Text>❤️</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <StatusBar barStyle={c.statusBar} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
                <View>
                    <Text style={[styles.headerTitle, { color: c.text }]}>Mi Armario</Text>
                    <Text style={[styles.headerSubtitle, { color: c.textSecondary }]}>
                        {garments.length} prenda{garments.length !== 1 ? 's' : ''}
                    </Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={[styles.themeBtn, { backgroundColor: c.surfaceVariant }]}
                        onPress={toggleTheme}
                    >
                        <Text style={{ fontSize: 18 }}>{isDark ? '☀️' : '🌙'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.addBtn, { backgroundColor: c.primary }]}
                        onPress={() => navigation.navigate('AddGarment')}
                    >
                        <Text style={styles.addBtnText}>+ Añadir</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Filtros de categoría */}
            <View style={styles.filtersRow}>
                <FlatList
                    data={CATEGORIES}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item.key || 'all'}
                    contentContainerStyle={styles.filtersContent}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[
                                styles.filterChip,
                                {
                                    backgroundColor: activeFilter === item.key ? c.primary : c.surface,
                                    borderColor: activeFilter === item.key ? c.primary : c.border,
                                },
                            ]}
                            onPress={() => handleFilter(item.key)}
                        >
                            <Text style={{ fontSize: 16, marginRight: 4 }}>{item.icon}</Text>
                            <Text style={[
                                styles.filterLabel,
                                { color: activeFilter === item.key ? '#FFF' : c.textSecondary },
                            ]}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* Lista de prendas */}
            {isLoading && garments.length === 0 ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={c.primary} />
                </View>
            ) : garments.length === 0 ? (
                <View style={styles.centered}>
                    <Text style={{ fontSize: 64, marginBottom: 16 }}>👕</Text>
                    <Text style={[styles.emptyTitle, { color: c.text }]}>
                        ¡Tu armario está vacío!
                    </Text>
                    <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                        Pulsa "+ Añadir" para agregar tu primera prenda
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={garments}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={2}
                    contentContainerStyle={styles.gridContent}
                    columnWrapperStyle={styles.gridRow}
                    renderItem={renderGarment}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[c.primary]} />
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    headerTitle: { fontSize: 26, fontWeight: '800' },
    headerSubtitle: { fontSize: 14, marginTop: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    themeBtn: {
        width: 40, height: 40, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center',
    },
    addBtn: {
        paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
        shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
    },
    addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    filtersRow: { marginTop: 12 },
    filtersContent: { paddingHorizontal: 16, gap: 8 },
    filterChip: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 20, borderWidth: 1, marginRight: 8,
    },
    filterLabel: { fontSize: 14, fontWeight: '600' },
    gridContent: { padding: 12 },
    gridRow: { justifyContent: 'space-between', marginBottom: 12 },
    garmentCard: {
        width: '48%', borderRadius: 16, borderWidth: 1, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    garmentImage: { width: '100%', height: 160 },
    garmentImagePlaceholder: {
        width: '100%', height: 160, justifyContent: 'center', alignItems: 'center',
    },
    garmentInfo: { padding: 12 },
    garmentName: { fontSize: 16, fontWeight: '700' },
    garmentCategory: { fontSize: 13, fontWeight: '600', marginTop: 2, textTransform: 'capitalize' },
    garmentBrand: { fontSize: 12, marginTop: 2 },
    favBadge: { position: 'absolute', top: 8, right: 8 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
    emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
    emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});

export default WardrobeScreen;
