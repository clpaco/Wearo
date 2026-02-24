// Pantalla de listado de Outfits
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, Image,
    StyleSheet, RefreshControl, ActivityIndicator, StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchOutfits, removeOutfit } from '../store/outfitsSlice';
import { useTheme } from '../hooks/useTheme';
import { IMAGE_BASE_URL } from '../services/api';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';
import AIChatModal from '../components/AIChatModal';

const CITY_KEY = 'userCity';

const OutfitsScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { outfits, isLoading } = useSelector((state) => state.outfits);
    const { theme } = useTheme();
    const c = theme.colors;
    const [refreshing, setRefreshing] = useState(false);
    const [aiModalVisible, setAiModalVisible] = useState(false);
    const [aiModalMode, setAiModalMode] = useState('outfits');
    const [city, setCity] = useState(null);

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

    const renderOutfit = ({ item }) => {
        const garments = typeof item.garments === 'string' ? JSON.parse(item.garments) : item.garments;

        return (
            <TouchableOpacity
                style={[styles.outfitCard, { backgroundColor: c.surface, borderColor: c.border }]}
                onPress={() => navigation.navigate('OutfitDetail', { outfit: { ...item, garments } })}
                activeOpacity={0.8}
            >
                {/* Mosaico de prendas */}
                <View style={styles.mosaic}>
                    {garments.slice(0, 4).map((g, i) => (
                        g.image_url ? (
                            <Image
                                key={g.id}
                                source={{ uri: `${IMAGE_BASE_URL}${g.image_url}` }}
                                style={[styles.mosaicImg, garments.length === 1 && styles.mosaicSingle]}
                            />
                        ) : (
                            <View key={g.id || i} style={[styles.mosaicPlaceholder, { backgroundColor: c.surfaceVariant }]}>
                                <Text style={{ fontSize: 20 }}>👕</Text>
                            </View>
                        )
                    ))}
                    {garments.length === 0 && (
                        <View style={[styles.mosaicPlaceholder, styles.mosaicSingle, { backgroundColor: c.surfaceVariant }]}>
                            <Text style={{ fontSize: 32 }}>👔</Text>
                        </View>
                    )}
                </View>

                <View style={styles.outfitInfo}>
                    <View style={styles.outfitTitleRow}>
                        <Text style={[styles.outfitName, { color: c.text }]} numberOfLines={1}>
                            {item.name}
                        </Text>
                        {item.is_favorite && <Text>❤️</Text>}
                    </View>
                    <Text style={[styles.outfitMeta, { color: c.textSecondary }]}>
                        {garments.length} prenda{garments.length !== 1 ? 's' : ''}
                        {item.occasion ? ` · ${item.occasion}` : ''}
                    </Text>
                    {item.times_worn > 0 && (
                        <Text style={[styles.wornCount, { color: c.textMuted }]}>
                            Usado {item.times_worn}x
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <StatusBar barStyle={c.statusBar} />

            {/* Header */}
            <ScreenHeader
                title="Mis Outfits"
                subtitle={`${outfits.length} outfit${outfits.length !== 1 ? 's' : ''}`}
                rightAction={
                    <TouchableOpacity
                        style={[styles.addBtn, { backgroundColor: c.primary }]}
                        onPress={() => navigation.navigate('CreateOutfit')}
                    >
                        <Text style={styles.addBtnText}>+</Text>
                    </TouchableOpacity>
                }
            />

            {/* Acciones IA */}
            <View style={styles.aiRow}>
                <TouchableOpacity
                    style={[styles.aiPill, { backgroundColor: c.primaryLight + '20', borderColor: c.primary + '40' }]}
                    onPress={() => openAI('outfits')}
                    activeOpacity={0.8}
                >
                    <Text style={{ fontSize: 15 }}>🤖</Text>
                    <Text style={[styles.aiPillText, { color: c.primary }]}>Chat IA</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.aiPill, { backgroundColor: c.accent + '15', borderColor: c.accent + '40' }]}
                    onPress={() => openAI('shopping')}
                    activeOpacity={0.8}
                >
                    <Text style={{ fontSize: 15 }}>🛍️</Text>
                    <Text style={[styles.aiPillText, { color: c.accent }]}>Qué me falta</Text>
                </TouchableOpacity>
            </View>

            {/* Lista */}
            {isLoading && outfits.length === 0 ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={c.primary} />
                </View>
            ) : outfits.length === 0 ? (
                <EmptyState
                    icon="👔"
                    title="¡Sin outfits aún!"
                    description="Combina tus prendas para crear tu primer outfit"
                    action={{ label: '+ Crear Outfit', onPress: () => navigation.navigate('CreateOutfit') }}
                />
            ) : (
                <FlatList
                    data={outfits}
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
    addBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 20, lineHeight: 22 },
    listContent: { padding: 16 },
    outfitCard: {
        borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    mosaic: {
        flexDirection: 'row', flexWrap: 'wrap', height: 160,
    },
    mosaicImg: { width: '50%', height: 80 },
    mosaicSingle: { width: '100%', height: 160 },
    mosaicPlaceholder: {
        width: '50%', height: 80, justifyContent: 'center', alignItems: 'center',
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
