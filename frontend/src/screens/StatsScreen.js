// Pantalla de Estadísticas — gráficos con componentes nativos (sin Victory)
import React, { useEffect } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView,
    StyleSheet, ActivityIndicator, StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllStats } from '../store/statsSlice';
import { useTheme } from '../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';
import StatCard from '../components/StatCard';

const CHART_COLORS = [
    '#6C5CE7', '#00CEC9', '#FDCB6E', '#E17055', '#74B9FF',
    '#A29BFE', '#55EFC4', '#FAB1A0', '#81ECEC', '#DFE6E9',
];

const COLOR_MAP = {
    negro: '#2D3436', blanco: '#D5D5D5', rojo: '#E74C3C',
    azul: '#3498DB', verde: '#2ECC71', amarillo: '#F1C40F',
    naranja: '#E67E22', rosa: '#E84393', morado: '#9B59B6',
    gris: '#95A5A6', 'marrón': '#8D6E63', beige: '#D7CCC8',
    'sin color': '#BDC3C7',
};

const BarChart = ({ data, colors, colorMap, horizontal }) => {
    const maxVal = Math.max(...data.map((d) => d.value), 1);
    if (horizontal) {
        return (
            <View style={{ width: '100%' }}>
                {data.map((item, idx) => (
                    <View key={item.label} style={styles.hBarRow}>
                        <Text style={[styles.hBarLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.label}
                        </Text>
                        <View style={[styles.hBarTrack, { backgroundColor: colors.surfaceVariant }]}>
                            <View
                                style={[
                                    styles.hBarFill,
                                    {
                                        width: `${(item.value / maxVal) * 100}%`,
                                        backgroundColor: colorMap
                                            ? (colorMap[item.label.toLowerCase()] || CHART_COLORS[idx % CHART_COLORS.length])
                                            : CHART_COLORS[idx % CHART_COLORS.length],
                                    },
                                ]}
                            />
                        </View>
                        <Text style={[styles.hBarValue, { color: colors.text }]}>{item.value}</Text>
                    </View>
                ))}
            </View>
        );
    }

    return (
        <View style={styles.vBarContainer}>
            <View style={styles.vBarChart}>
                {data.map((item, idx) => (
                    <View key={item.label} style={styles.vBarCol}>
                        <Text style={[styles.vBarValue, { color: colors.textSecondary }]}>{item.value}</Text>
                        <View style={[styles.vBarTrack, { backgroundColor: colors.surfaceVariant }]}>
                            <View
                                style={[
                                    styles.vBarFill,
                                    {
                                        height: `${(item.value / maxVal) * 100}%`,
                                        backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                                    },
                                ]}
                            />
                        </View>
                        <Text style={[styles.vBarLabel, { color: colors.textMuted }]} numberOfLines={1}>
                            {item.label}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

const DonutChart = ({ data, colors }) => {
    const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
    return (
        <View style={{ width: '100%' }}>
            {data.map((item, idx) => {
                const pct = ((item.value / total) * 100).toFixed(0);
                const barColor = COLOR_MAP[item.label.toLowerCase()] || CHART_COLORS[idx % CHART_COLORS.length];
                return (
                    <View key={item.label} style={styles.donutRow}>
                        <View style={[styles.donutDot, { backgroundColor: barColor }]} />
                        <Text style={[styles.donutLabel, { color: colors.text }]}>{item.label}</Text>
                        <View style={[styles.donutTrack, { backgroundColor: colors.surfaceVariant }]}>
                            <View style={[styles.donutFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                        </View>
                        <Text style={[styles.donutPct, { color: colors.textSecondary }]}>{pct}%</Text>
                    </View>
                );
            })}
        </View>
    );
};

const StatsScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const {
        resumen, categorias, colores, temporadas,
        topOutfits, actividad, topPrendas, isLoading, error,
    } = useSelector((state) => state.stats);
    const { theme } = useTheme();
    const c = theme.colors;

    useEffect(() => {
        dispatch(fetchAllStats());
    }, [dispatch]);

    if (isLoading && !resumen) {
        return (
            <View style={[styles.container, styles.center, { backgroundColor: c.background }]}>
                <StatusBar barStyle={c.statusBar} />
                <ActivityIndicator size="large" color={c.primary} />
                <Text style={[styles.loadingText, { color: c.textMuted }]}>Cargando estadísticas...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, styles.center, { backgroundColor: c.background }]}>
                <StatusBar barStyle={c.statusBar} />
                <Text style={{ fontSize: 40, marginBottom: 12 }}><Ionicons name="sad-outline" size={40} color={c.textMuted} /></Text>
                <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
                <TouchableOpacity
                    style={[styles.retryBtn, { backgroundColor: c.primary }]}
                    onPress={() => dispatch(fetchAllStats())}
                >
                    <Text style={styles.retryBtnText}>Reintentar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const overview = resumen || {};

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <StatusBar barStyle={c.statusBar} />

            {/* Header */}
            <ScreenHeader
                title="Estadísticas"
                onBack={() => navigation.goBack()}
                rightAction={
                    <TouchableOpacity onPress={() => dispatch(fetchAllStats())} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="refresh" size={20} color={c.primary} />
                    </TouchableOpacity>
                }
            />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Tarjetas resumen */}
                <View style={styles.overviewGrid}>
                    <StatCard icon="shirt-outline" label="Prendas" value={overview.total_prendas ?? 0} color="#6C5CE7" />
                    <StatCard icon="albums-outline" label="Outfits" value={overview.total_outfits ?? 0} color="#00CEC9" />
                    <StatCard icon="calendar-outline" label="Planificados" value={overview.outfits_planificados ?? 0} color="#FDCB6E" />
                    <StatCard icon="star" label="Favoritos" value={(parseInt(overview.prendas_favoritas || 0) + parseInt(overview.favorite_outfits || 0))} color="#E17055" />
                </View>

                {/* Prendas por categoría */}
                {categorias.length > 0 && (
                    <View style={[styles.chartCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                        <Text style={[styles.chartTitle, { color: c.text }]}>Prendas por Categoría</Text>
                        <BarChart data={categorias} colors={c} />
                    </View>
                )}

                {/* Distribución de colores */}
                {colores.length > 0 && (
                    <View style={[styles.chartCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                        <Text style={[styles.chartTitle, { color: c.text }]}>Distribución de Colores</Text>
                        <DonutChart data={colores} colors={c} />
                    </View>
                )}

                {/* Prendas por temporada */}
                {temporadas.length > 0 && (
                    <View style={[styles.chartCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                        <Text style={[styles.chartTitle, { color: c.text }]}>Prendas por Temporada</Text>
                        <BarChart data={temporadas} colors={c} horizontal />
                    </View>
                )}

                {/* Top outfits planificados */}
                {topOutfits.length > 0 && (
                    <View style={[styles.chartCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                        <Text style={[styles.chartTitle, { color: c.text }]}>Top Outfits Planificados</Text>
                        <BarChart data={topOutfits} colors={c} horizontal />
                    </View>
                )}

                {/* Actividad mensual */}
                {actividad.length > 0 && (
                    <View style={[styles.chartCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                        <Text style={[styles.chartTitle, { color: c.text }]}>Actividad Mensual</Text>
                        <BarChart data={actividad} colors={c} />
                    </View>
                )}

                {/* Prendas más versátiles */}
                {topPrendas.length > 0 && (
                    <View style={[styles.chartCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                        <Text style={[styles.chartTitle, { color: c.text }]}>Prendas Más Versátiles</Text>
                        <Text style={[styles.chartSubtitle, { color: c.textMuted }]}>
                            Aparecen en más outfits
                        </Text>
                        {topPrendas.map((item, idx) => (
                            <View key={item.label} style={styles.rankRow}>
                                <View style={[styles.rankBadge, { backgroundColor: CHART_COLORS[idx] + '20' }]}>
                                    <Text style={[styles.rankNumber, { color: CHART_COLORS[idx] }]}>#{idx + 1}</Text>
                                </View>
                                <Text style={[styles.rankName, { color: c.text }]} numberOfLines={1}>{item.label}</Text>
                                <View style={[styles.rankBarWrapper, { backgroundColor: c.surfaceVariant }]}>
                                    <View
                                        style={[
                                            styles.rankBar,
                                            {
                                                backgroundColor: CHART_COLORS[idx],
                                                width: `${(item.value / (topPrendas[0]?.value || 1)) * 100}%`,
                                            },
                                        ]}
                                    />
                                </View>
                                <Text style={[styles.rankValue, { color: c.textSecondary }]}>{item.value}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Mensaje vacío */}
                {categorias.length === 0 && colores.length === 0 && (
                    <View style={[styles.emptyCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                        <Ionicons name="bar-chart-outline" size={48} color={c.textMuted} style={{ textAlign: 'center', marginBottom: 12 }} />
                        <Text style={[styles.emptyTitle, { color: c.text }]}>Sin datos todavía</Text>
                        <Text style={[styles.emptyText, { color: c.textMuted }]}>
                            Añade prendas y crea outfits para ver tus estadísticas aquí.
                        </Text>
                    </View>
                )}

                <View style={{ height: 32 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
    loadingText: { marginTop: 12, fontSize: 15 },
    errorText: { fontSize: 16, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
    retryBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
    retryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

    overviewGrid: {
        flexDirection: 'row', gap: 8, marginBottom: 8,
    },

    chartCard: {
        borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, overflow: 'hidden',
    },
    chartTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
    chartSubtitle: { fontSize: 13, marginBottom: 8 },

    // Barras verticales
    vBarContainer: { width: '100%' },
    vBarChart: { flexDirection: 'row', alignItems: 'flex-end', height: 160, gap: 6 },
    vBarCol: { flex: 1, alignItems: 'center' },
    vBarValue: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
    vBarTrack: { width: '80%', height: 120, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
    vBarFill: { width: '100%', borderRadius: 6, minHeight: 4 },
    vBarLabel: { fontSize: 10, marginTop: 6, textAlign: 'center' },

    // Barras horizontales
    hBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    hBarLabel: { width: 80, fontSize: 12, fontWeight: '500' },
    hBarTrack: { flex: 1, height: 20, borderRadius: 10, overflow: 'hidden', marginHorizontal: 8 },
    hBarFill: { height: '100%', borderRadius: 10, minWidth: 4 },
    hBarValue: { width: 28, fontSize: 13, fontWeight: '700', textAlign: 'right' },

    // Donut/color distribution
    donutRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    donutDot: { width: 14, height: 14, borderRadius: 7, marginRight: 8 },
    donutLabel: { width: 75, fontSize: 13, fontWeight: '500' },
    donutTrack: { flex: 1, height: 14, borderRadius: 7, overflow: 'hidden', marginHorizontal: 8 },
    donutFill: { height: '100%', borderRadius: 7, minWidth: 4 },
    donutPct: { width: 36, fontSize: 13, fontWeight: '700', textAlign: 'right' },

    // Ranking
    rankRow: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingVertical: 8 },
    rankBadge: {
        width: 32, height: 32, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center', marginRight: 10,
    },
    rankNumber: { fontSize: 13, fontWeight: '800' },
    rankName: { flex: 1, fontSize: 14, fontWeight: '600', marginRight: 8 },
    rankBarWrapper: { width: 80, height: 8, borderRadius: 4, overflow: 'hidden', marginRight: 8 },
    rankBar: { height: '100%', borderRadius: 4 },
    rankValue: { fontSize: 14, fontWeight: '700', width: 28, textAlign: 'right' },

    emptyCard: { borderRadius: 16, borderWidth: 1, padding: 32, marginTop: 20 },
    emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
    emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});

export default StatsScreen;
