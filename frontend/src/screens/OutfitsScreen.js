// Pantalla de listado de Outfits
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, Image,
    StyleSheet, RefreshControl, ActivityIndicator, StatusBar,
    LayoutAnimation, UIManager, Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchOutfits, removeOutfit, toggleOutfitFavorite } from '../store/outfitsSlice';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { IMAGE_BASE_URL } from '../services/api';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';
import AIChatModal from '../components/AIChatModal';
import GarmentCarousel from '../components/GarmentCarousel';

// Habilitar LayoutAnimation en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CITY_KEY = 'userCity';

const OCCASIONS = [
    { key: null, label: 'Todas', icon: 'grid-outline' },
    { key: 'casual', label: 'Casual', icon: 'cafe-outline' },
    { key: 'trabajo', label: 'Trabajo', icon: 'briefcase-outline' },
    { key: 'formal', label: 'Formal', icon: 'diamond-outline' },
    { key: 'deporte', label: 'Deporte', icon: 'fitness-outline' },
    { key: 'fiesta', label: 'Fiesta', icon: 'musical-notes-outline' },
];

const SEASONS = [
    { key: null, label: 'Todas', icon: 'infinite-outline' },
    { key: 'primavera', label: 'Primavera', icon: 'flower-outline' },
    { key: 'verano', label: 'Verano', icon: 'sunny-outline' },
    { key: 'otoño', label: 'Otoño', icon: 'leaf-outline' },
    { key: 'invierno', label: 'Invierno', icon: 'snow-outline' },
];

const OutfitsScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { outfits, isLoading } = useSelector((state) => state.outfits);
    const { theme } = useTheme();
    const c = theme.colors;
    const [refreshing, setRefreshing] = useState(false);
    const [aiModalVisible, setAiModalVisible] = useState(false);
    const [aiModalMode, setAiModalMode] = useState('outfits');
    const [city, setCity] = useState(null);
    const [activeOccasion, setActiveOccasion] = useState(null);
    const [activeSeason, setActiveSeason] = useState(null);
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

    useEffect(() => {
        dispatch(fetchOutfits());
        AsyncStorage.getItem(CITY_KEY).then((v) => { if (v) setCity(v); });
    }, [dispatch]);

    const openAI = (mode) => {
        setAiModalMode(mode);
        setAiModalVisible(true);
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        dispatch(fetchOutfits()).finally(() => setRefreshing(false));
    }, [dispatch]);

    // Filtrar outfits por ocasión, temporada y favoritos (client-side)
    const filteredOutfits = useMemo(() => {
        let result = outfits;

        // Filtro por ocasión
        if (activeOccasion) {
            result = result.filter((o) => {
                if (!o.occasion) return false;
                return o.occasion.toLowerCase() === activeOccasion;
            });
        }

        // Filtro por temporada
        if (activeSeason) {
            result = result.filter((o) => {
                if (!o.season) return false;
                const s = o.season.toLowerCase();
                return s === activeSeason || s === 'todo el año' || s === 'todas';
            });
        }

        // Filtro por favoritos
        if (showFavoritesOnly) {
            result = result.filter((o) => o.is_favorite === true);
        }

        return result;
    }, [outfits, activeOccasion, activeSeason, showFavoritesOnly]);

    const renderOutfit = ({ item }) => {
        const garments = typeof item.garments === 'string' ? JSON.parse(item.garments) : item.garments;

        return (
            <View
                style={[styles.outfitCard, { backgroundColor: c.surface, borderColor: c.border }]}
            >
                {/* Carousel de prendas */}
                <GarmentCarousel garments={garments} height={180} />

                <TouchableOpacity
                    style={styles.outfitInfo}
                    onPress={() => navigation.navigate('OutfitDetail', { outfit: { ...item, garments } })}
                    activeOpacity={0.7}
                >
                    <View style={styles.outfitTitleRow}>
                        <Text style={[styles.outfitName, { color: c.text }]} numberOfLines={1}>
                            {item.name}
                        </Text>
                        <TouchableOpacity
                            onPress={(e) => {
                                e.stopPropagation?.();
                                dispatch(toggleOutfitFavorite({ id: item.id, isFavorite: !item.is_favorite }));
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons
                                name={item.is_favorite ? 'heart' : 'heart-outline'}
                                size={20}
                                color={item.is_favorite ? (c.error || '#E17055') : c.textMuted}
                            />
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.outfitMeta, { color: c.textSecondary }]}>
                        {garments.length} prenda{garments.length !== 1 ? 's' : ''}
                        {item.occasion ? ` · ${item.occasion}` : ''}
                    </Text>
                    {item.last_worn ? (
                        <Text style={[styles.wornCount, { color: c.textMuted }]}>
                            Usado: {new Date(String(item.last_worn).substring(0, 10) + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            {item.times_worn > 1 ? ` (${item.times_worn}x)` : ''}
                        </Text>
                    ) : item.times_worn > 0 ? (
                        <Text style={[styles.wornCount, { color: c.textMuted }]}>
                            Usado {item.times_worn}x
                        </Text>
                    ) : null}
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <StatusBar barStyle={c.statusBar} />

            {/* Header */}
            <ScreenHeader
                title="Mis Outfits"
                subtitle={`${filteredOutfits.length} outfit${filteredOutfits.length !== 1 ? 's' : ''}`}
                rightAction={
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={[
                                styles.favBtn,
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
                            onPress={() => navigation.navigate('CreateOutfit')}
                        >
                            <Text style={styles.addBtnText}>+</Text>
                        </TouchableOpacity>
                    </View>
                }
            />

            {/* Acciones IA */}
            <View style={styles.aiRow}>
                <TouchableOpacity
                    style={[styles.aiPill, { backgroundColor: c.primaryLight + '20', borderColor: c.primary + '40' }]}
                    onPress={() => openAI('outfits')}
                    activeOpacity={0.8}
                >
                    <Ionicons name="sparkles" size={16} color={c.primary} />
                    <Text style={[styles.aiPillText, { color: c.primary }]}>Chat IA</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.aiPill, { backgroundColor: c.accent + '15', borderColor: c.accent + '40' }]}
                    onPress={() => openAI('shopping')}
                    activeOpacity={0.8}
                >
                    <Ionicons name="bag-outline" size={16} color={c.accent} />
                    <Text style={[styles.aiPillText, { color: c.accent }]}>Qué me falta</Text>
                </TouchableOpacity>
            </View>

            {/* Filtros de ocasión */}
            <View style={styles.filtersRow}>
                <FlatList
                    data={OCCASIONS}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item.key || 'all-occasion'}
                    contentContainerStyle={styles.filtersContent}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[
                                styles.filterChip,
                                {
                                    backgroundColor: activeOccasion === item.key ? c.primary : c.surface,
                                    borderColor: activeOccasion === item.key ? c.primary : c.border,
                                },
                            ]}
                            onPress={() => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setActiveOccasion(item.key);
                            }}
                        >
                            <Ionicons name={item.icon} size={16} color={activeOccasion === item.key ? '#FFF' : c.textSecondary} style={{ marginRight: 4 }} />
                            <Text style={[
                                styles.filterLabel,
                                { color: activeOccasion === item.key ? '#FFF' : c.textSecondary },
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

            {/* Lista */}
            {isLoading && outfits.length === 0 ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={c.primary} />
                </View>
            ) : filteredOutfits.length === 0 ? (
                <EmptyState
                    icon="albums-outline"
                    title={outfits.length === 0 ? '¡Sin outfits aún!' : 'Sin resultados'}
                    description={
                        outfits.length === 0
                            ? 'Combina tus prendas para crear tu primer outfit'
                            : 'No hay outfits con los filtros seleccionados'
                    }
                    action={
                        outfits.length === 0
                            ? { label: '+ Crear Outfit', onPress: () => navigation.navigate('CreateOutfit') }
                            : undefined
                    }
                />
            ) : (
                <FlatList
                    data={filteredOutfits}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    renderItem={renderOutfit}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[c.primary]} />
                    }
                />
            )}

            <AIChatModal
                visible={aiModalVisible}
                mode={aiModalMode}
                city={city}
                onClose={() => setAiModalVisible(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    favBtn: {
        width: 36, height: 36, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center',
    },
    addBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 20, lineHeight: 22 },
    filtersRow: { marginTop: 8 },
    filtersContent: { paddingHorizontal: 16, gap: 8 },
    filterChip: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 20, borderWidth: 1, marginRight: 8,
    },
    filterLabel: { fontSize: 14, fontWeight: '600' },
    listContent: { padding: 16 },
    outfitCard: {
        borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    outfitInfo: { padding: 14 },
    outfitTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    outfitName: { fontSize: 18, fontWeight: '700', flex: 1, marginRight: 8 },
    outfitMeta: { fontSize: 14, marginTop: 4 },
    wornCount: { fontSize: 12, marginTop: 2 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
    aiRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
    aiPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 22, borderWidth: 1, gap: 6 },
    aiPillText: { fontSize: 14, fontWeight: '600' },
});

export default OutfitsScreen;
