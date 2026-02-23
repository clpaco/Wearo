// Pantalla de Estadísticas — gráficos con Victory Native
import React, { useEffect } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView,
    StyleSheet, ActivityIndicator, StatusBar, Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllStats } from '../store/statsSlice';
import { useTheme } from '../hooks/useTheme';
import {
    VictoryBar, VictoryPie, VictoryLine, VictoryChart,
    VictoryAxis, VictoryTheme, VictoryLabel, VictoryGroup,
} from 'victory-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 48;

const CHART_COLORS = [
    '#6C5CE7', '#00CEC9', '#FDCB6E', '#E17055', '#74B9FF',
    '#A29BFE', '#55EFC4', '#FAB1A0', '#81ECEC', '#DFE6E9',
];

const COLOR_MAP = {
    negro: '#2D3436', blanco: '#FEFEFE', rojo: '#E74C3C',
    azul: '#3498DB', verde: '#2ECC71', amarillo: '#F1C40F',
    naranja: '#E67E22', rosa: '#E84393', morado: '#9B59B6',
    gris: '#95A5A6', marrón: '#8D6E63', beige: '#D7CCC8',
    'sin color': '#BDC3C7',
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
                <Text style={{ fontSize: 40, marginBottom: 12 }}>😞</Text>
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
            <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={[styles.backBtn, { color: c.primary }]}>← Volver</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: c.text }]}>Estadísticas</Text>
                <TouchableOpacity onPress={() => dispatch(fetchAllStats())}>
                    <Text style={[styles.refreshBtn, { color: c.primary }]}>↻</Text>
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Tarjetas resumen */}
                <View style={styles.overviewGrid}>
                    {[
                        { icon: '👕', label: 'Prendas', value: overview.total_garments || 0, color: '#6C5CE7' },
                        { icon: '👔', label: 'Outfits', value: overview.total_outfits || 0, color: '#00CEC9' },
                        { icon: '📅', label: 'Planificados', value: overview.total_planned || 0, color: '#FDCB6E' },
                        { icon: '⭐', label: 'Favoritos', value: (parseInt(overview.favorite_garments || 0) + parseInt(overview.favorite_outfits || 0)), color: '#E17055' },
                    ].map((item) => (
                        <View key={item.label} style={[styles.overviewCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                            <View style={[styles.overviewIcon, { backgroundColor: item.color + '15' }]}>
                                <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                            </View>
                            <Text style={[styles.overviewValue, { color: c.text }]}>{item.value}</Text>
                            <Text style={[styles.overviewLabel, { color: c.textMuted }]}>{item.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Gráfico: Prendas por categoría */}
                {categorias.length > 0 && (
                    <View style={[styles.chartCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                        <Text style={[styles.chartTitle, { color: c.text }]}>Prendas por Categoría</Text>
                        <VictoryChart
                            width={CHART_WIDTH}
                            height={220}
                            domainPadding={{ x: 20 }}
                            theme={VictoryTheme.material}
                            padding={{ top: 20, bottom: 50, left: 50, right: 20 }}
                        >
                            <VictoryAxis
                                tickLabelComponent={<VictoryLabel angle={-35} textAnchor="end" style={{ fontSize: 10, fill: c.textMuted }} />}
                            />
                            <VictoryAxis dependentAxis tickFormat={(t) => Math.round(t)} style={{ tickLabels: { fontSize: 10, fill: c.textMuted } }} />
                            <VictoryBar
                                data={categorias}
                                x="label"
                                y="value"
                                cornerRadius={{ top: 4 }}
                                style={{
                                    data: {
                                        fill: ({ index }) => CHART_COLORS[index % CHART_COLORS.length],
                                    },
                                }}
                                animate={{ duration: 500 }}
                            />
                        </VictoryChart>
                    </View>
                )}

                {/* Gráfico: Distribución de colores (dona) */}
                {colores.length > 0 && (
                    <View style={[styles.chartCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                        <Text style={[styles.chartTitle, { color: c.text }]}>Distribución de Colores</Text>
                        <VictoryPie
                            data={colores}
                            x="label"
                            y="value"
                            width={CHART_WIDTH}
                            height={260}
                            innerRadius={55}
                            padAngle={2}
                            labelRadius={({ innerRadius }) => innerRadius + 40}
                            style={{
                                labels: { fontSize: 10, fill: c.text },
                                data: {
                                    fill: ({ datum }) => COLOR_MAP[datum.label.toLowerCase()] || CHART_COLORS[colores.indexOf(datum) % CHART_COLORS.length],
                                },
                            }}
                            animate={{ duration: 500 }}
                        />
                    </View>
                )}

                {/* Gráfico: Distribución por temporada */}
                {temporadas.length > 0 && (
                    <View style={[styles.chartCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                        <Text style={[styles.chartTitle, { color: c.text }]}>Prendas por Temporada</Text>
                        <VictoryChart
                            width={CHART_WIDTH}
                            height={200}
                            domainPadding={{ x: 30 }}
                            theme={VictoryTheme.material}
                            padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
                        >
                            <VictoryAxis style={{ tickLabels: { fontSize: 11, fill: c.textMuted } }} />
                            <VictoryAxis dependentAxis tickFormat={(t) => Math.round(t)} style={{ tickLabels: { fontSize: 10, fill: c.textMuted } }} />
                            <VictoryBar
                                data={temporadas}
                                x="label"
                                y="value"
                                cornerRadius={{ top: 4 }}
                                style={{
                                    data: {
                                        fill: ({ index }) => ['#6C5CE7', '#00CEC9', '#FDCB6E', '#E17055'][index % 4],
                                    },
                                }}
                                animate={{ duration: 500 }}
                            />
                        </VictoryChart>
                    </View>
                )}

                {/* Gráfico: Top outfits planificados */}
                {topOutfits.length > 0 && (
                    <View style={[styles.chartCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                        <Text style={[styles.chartTitle, { color: c.text }]}>Top Outfits Planificados</Text>
                        <VictoryChart
                            width={CHART_WIDTH}
                            height={Math.max(180, topOutfits.length * 40)}
                            domainPadding={{ y: 15 }}
                            theme={VictoryTheme.material}
                            padding={{ top: 10, bottom: 30, left: 100, right: 40 }}
                            horizontal
                        >
                            <VictoryAxis style={{ tickLabels: { fontSize: 10, fill: c.textMuted } }} />
                            <VictoryAxis dependentAxis tickFormat={(t) => Math.round(t)} style={{ tickLabels: { fontSize: 10, fill: c.textMuted } }} />
                            <VictoryBar
                                data={topOutfits}
                                x="label"
                                y="value"
                                cornerRadius={{ top: 4 }}
                                style={{ data: { fill: '#00CEC9' } }}
                                animate={{ duration: 500 }}
                            />
                        </VictoryChart>
                    </View>
                )}

                {/* Gráfico: Actividad mensual */}
                {actividad.length > 0 && (
                    <View style={[styles.chartCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                        <Text style={[styles.chartTitle, { color: c.text }]}>Actividad Mensual</Text>
                        <VictoryChart
                            width={CHART_WIDTH}
                            height={200}
                            theme={VictoryTheme.material}
                            padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
                        >
                            <VictoryAxis style={{ tickLabels: { fontSize: 11, fill: c.textMuted } }} />
                            <VictoryAxis dependentAxis tickFormat={(t) => Math.round(t)} style={{ tickLabels: { fontSize: 10, fill: c.textMuted } }} />
                            <VictoryGroup>
                                <VictoryLine
                                    data={actividad}
                                    x="label"
                                    y="value"
                                    style={{ data: { stroke: '#6C5CE7', strokeWidth: 3 } }}
                                    animate={{ duration: 500 }}
                                />
                                <VictoryBar
                                    data={actividad}
                                    x="label"
                                    y="value"
                                    cornerRadius={{ top: 4 }}
                                    barWidth={20}
                                    style={{ data: { fill: '#6C5CE730' } }}
                                />
                            </VictoryGroup>
                        </VictoryChart>
                    </View>
                )}

                {/* Gráfico: Prendas más versátiles */}
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
                                <View style={styles.rankBarWrapper}>
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
                        <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>📊</Text>
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
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1,
    },
    backBtn: { fontSize: 16, fontWeight: '600' },
    headerTitle: { fontSize: 22, fontWeight: '800' },
    refreshBtn: { fontSize: 24, fontWeight: '700' },
    scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
    loadingText: { marginTop: 12, fontSize: 15 },
    errorText: { fontSize: 16, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
    retryBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
    retryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

    overviewGrid: {
        flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8,
    },
    overviewCard: {
        width: '48%', borderRadius: 16, padding: 16, borderWidth: 1,
        marginBottom: 12, alignItems: 'center',
    },
    overviewIcon: {
        width: 40, height: 40, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center', marginBottom: 8,
    },
    overviewValue: { fontSize: 28, fontWeight: '800' },
    overviewLabel: { fontSize: 13, fontWeight: '500', marginTop: 2 },

    chartCard: {
        borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16,
        alignItems: 'center', overflow: 'hidden',
    },
    chartTitle: { fontSize: 17, fontWeight: '700', alignSelf: 'flex-start', marginBottom: 4 },
    chartSubtitle: { fontSize: 13, alignSelf: 'flex-start', marginBottom: 8 },

    rankRow: {
        flexDirection: 'row', alignItems: 'center', width: '100%',
        paddingVertical: 8,
    },
    rankBadge: {
        width: 32, height: 32, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center', marginRight: 10,
    },
    rankNumber: { fontSize: 13, fontWeight: '800' },
    rankName: { flex: 1, fontSize: 14, fontWeight: '600', marginRight: 8 },
    rankBarWrapper: {
        width: 80, height: 8, borderRadius: 4,
        backgroundColor: '#E5E7EB', overflow: 'hidden', marginRight: 8,
    },
    rankBar: { height: '100%', borderRadius: 4 },
    rankValue: { fontSize: 14, fontWeight: '700', width: 28, textAlign: 'right' },

    emptyCard: {
        borderRadius: 16, borderWidth: 1, padding: 32, marginTop: 20,
    },
    emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
    emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});

export default StatsScreen;
