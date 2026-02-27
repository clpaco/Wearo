// Pantalla del Armario — listado de prendas con filtros y diseño moderno
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, Image,
    StyleSheet, RefreshControl, ActivityIndicator, StatusBar,
    LayoutAnimation, UIManager, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { fetchGarments, removeGarment, setFilter, toggleGarmentFavorite } from '../store/wardrobeSlice';
import { useTheme } from '../hooks/useTheme';
import { IMAGE_BASE_URL } from '../services/api';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';

// Habilitar LayoutAnimation en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CATEGORIES = [
    { key: null, label: 'Todas', icon: 'shirt-outline' },
    { key: 'camisetas', label: 'Camisetas', icon: 'shirt-outline' },
    { key: 'pantalones', label: 'Pantalones', icon: 'cut-outline' },
    { key: 'zapatos', label: 'Zapatos', icon: 'footsteps-outline' },
    { key: 'chaquetas', label: 'Chaquetas', icon: 'snow-outline' },
    { key: 'sudaderas', label: 'Sudaderas', icon: 'body-outline' },
    { key: 'accesorios', label: 'Accesorios', icon: 'glasses-outline' },
    { key: 'vestidos', label: 'Vestidos', icon: 'flower-outline' },
    { key: 'otro', label: 'Otro', icon: 'pricetag-outline' },
];

const SEASONS = [
    { key: null, label: 'Todas', icon: 'infinite-outline' },
    { key: 'primavera', label: 'Primavera', icon: 'flower-outline' },
    { key: 'verano', label: 'Verano', icon: 'sunny-outline' },
    { key: 'otoño', label: 'Otoño', icon: 'leaf-outline' },
    { key: 'invierno', label: 'Invierno', icon: 'snow-outline' },
];

const WardrobeScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { garments, isLoading, activeFilter } = useSelector((state) => state.wardrobe);
    const { theme } = useTheme();
    const c = theme.colors;
    const [refreshing, setRefreshing] = useState(false);
    const [activeSeason, setActiveSeason] = useState(null);
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

    // Cargar prendas al montar
    useEffect(() => {
        dispatch(fetchGarments({}));
    }, [dispatch]);

    // Pull-to-refresh
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        dispatch(fetchGarments({}))
            .finally(() => setRefreshing(false));
    }, [dispatch]);

    // Filtrar por categoría
    const handleFilter = (key) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        dispatch(setFilter(key));
    };

    // Filtrar prendas por categoría, temporada y favoritos (client-side)
    const filteredGarments = useMemo(() => {
        let result = garments;

        // Filtro por categoría
        if (activeFilter) {
            result = result.filter((g) => g.category === activeFilter);
        }

        // Filtro por temporada
        if (activeSeason) {
            result = result.filter((g) => {
                if (!g.season) return false;
                const s = g.season.toLowerCase();
                return s === activeSeason || s === 'todo el año' || s === 'todas';
            });
        }

        // Filtro por favoritos
        if (showFavoritesOnly) {
            result = result.filter((g) => g.is_favorite === true);
        }

        return result;
    }, [garments, activeFilter, activeSeason, showFavoritesOnly]);

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
                    source={{ uri: `${IMAGE_BASE_URL}${item.image_url}` }}
                    style={styles.garmentImage}
                    resizeMode="cover"
                />
            ) : (
                <View style={[styles.garmentImagePlaceholder, { backgroundColor: c.surfaceVariant }]}>
                    <Ionicons name="shirt-outline" size={36} color={c.textMuted} />
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
                {item.last_worn ? (
                    <Text style={[styles.garmentLastWorn, { color: c.textMuted }]}>
                        Usado: {new Date(String(item.last_worn).substring(0, 10) + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </Text>
                ) : item.times_worn > 0 ? (
                    <Text style={[styles.garmentLastWorn, { color: c.textMuted }]}>Usado {item.times_worn}x</Text>
                ) : null}
            </View>
            <TouchableOpacity
                style={styles.favToggle}
                onPress={(e) => {
                    e.stopPropagation?.();
                    dispatch(toggleGarmentFavorite({ id: item.id, isFavorite: !item.is_favorite }));
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <Ionicons
                    name={item.is_favorite ? 'heart' : 'heart-outline'}
                    size={22}
                    color={item.is_favorite ? (c.error || '#E17055') : c.textMuted}
                />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <StatusBar barStyle={c.statusBar} />

            {/* Header */}
            <ScreenHeader
                title="Mi Armario"
                subtitle={`${filteredGarments.length} prenda${filteredGarments.length !== 1 ? 's' : ''}`}
                rightAction={
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={[
                                styles.themeBtn,
                                {
                                    backgroundColor: showFavoritesOnly
                                        ? (c.error || '#E17055') + '20'
                                        : c.surfaceVariant,
                                },
                            ]}
                            onPress={() => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setShowFavoritesOnly(!showFavoritesOnly);
                            }}
                        >
                            <Ionicons
                                name={showFavoritesOnly ? 'heart' : 'heart-outline'}
                                size={18}
                                color={showFavoritesOnly ? (c.error || '#E17055') : c.textSecondary}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.addBtn, { backgroundColor: c.primary }]}
                            onPress={() => navigation.navigate('AddGarment')}
                        >
                            <Text style={styles.addBtnText}>+</Text>
                        </TouchableOpacity>
                    </View>
                }
            />

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
                            <Ionicons name={item.icon} size={16} color={activeFilter === item.key ? '#FFF' : c.textSecondary} style={{ marginRight: 4 }} />
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

            {/* Filtros de temporada */}
            <View style={styles.filtersRow}>
                <FlatList
                    data={SEASONS}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item.key || 'all-season'}
                    contentContainerStyle={styles.filtersContent}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[
                                styles.filterChip,
                                {
                                    backgroundColor: activeSeason === item.key ? c.primary : c.surface,
                                    borderColor: activeSeason === item.key ? c.primary : c.border,
                                },
                            ]}
                            onPress={() => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setActiveSeason(item.key);
                            }}
                        >
                            <Ionicons name={item.icon} size={16} color={activeSeason === item.key ? '#FFF' : c.textSecondary} style={{ marginRight: 4 }} />
                            <Text style={[
                                styles.filterLabel,
                                { color: activeSeason === item.key ? '#FFF' : c.textSecondary },
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
            ) : filteredGarments.length === 0 ? (
                <EmptyState
                    icon="shirt-outline"
                    title={garments.length === 0 ? '¡Tu armario está vacío!' : 'Sin resultados'}
                    description={
                        garments.length === 0
                            ? 'Pulsa el botón + para agregar tu primera prenda'
                            : 'No hay prendas con los filtros seleccionados'
                    }
                    action={
                        garments.length === 0
                            ? { label: '+ Añadir prenda', onPress: () => navigation.navigate('AddGarment') }
                            : undefined
                    }
                />
            ) : (
                <FlatList
                    data={filteredGarments}
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
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
    filtersRow: { marginTop: 8 },
    filtersContent: { paddingHorizontal: 16, gap: 8 },
    filterChip: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 20, borderWidth: 1, marginRight: 8,
    },
    filterLabel: { fontSize: 14, fontWeight: '600' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
    garmentLastWorn: { fontSize: 11, marginTop: 2 },
    favBadge: { position: 'absolute', top: 8, right: 8 },
    favToggle: { position: 'absolute', top: 8, right: 8, padding: 4 },
});

export default WardrobeScreen;
