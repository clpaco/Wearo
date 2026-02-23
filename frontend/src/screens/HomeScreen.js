// HomeScreen — Dashboard principal
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Image,
    StyleSheet, StatusBar, RefreshControl, FlatList,
    Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../store/authSlice';
import { fetchAllStats } from '../store/statsSlice';
import { fetchGarments } from '../store/wardrobeSlice';
import { fetchMonthEntries } from '../store/calendarSlice';
import { useTheme } from '../hooks/useTheme';
import { getWeatherByCity } from '../services/calendar.service';
import { IMAGE_BASE_URL } from '../services/api';
import Card from '../components/Card';
import StatCard from '../components/StatCard';

const CITY_KEY = 'userCity';

const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 20) return 'Buenas tardes';
    return 'Buenas noches';
};

const formatDate = () => {
    const d = new Date();
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
};

const weatherEmoji = (temp) => {
    if (temp == null) return '🌡️';
    if (temp > 25) return '☀️';
    if (temp > 15) return '⛅';
    if (temp > 5)  return '🌥️';
    return '❄️';
};

const HomeScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { theme, isDark, toggleTheme } = useTheme();
    const c = theme.colors;
    const insets = useSafeAreaInsets();

    const { user } = useSelector((s) => s.auth);
    const { resumen } = useSelector((s) => s.stats);
    const { garments } = useSelector((s) => s.wardrobe);
    const { entries } = useSelector((s) => s.calendar);

    const [weather, setWeather] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [city, setCity] = useState(null);
    const [cityInput, setCityInput] = useState('');
    const [showCityModal, setShowCityModal] = useState(false);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayEntry = entries.find((e) => {
        const d = typeof e.date === 'string' ? e.date.split('T')[0] : e.date;
        return d === todayStr;
    });

    // Cargar ciudad guardada al montar
    useEffect(() => {
        AsyncStorage.getItem(CITY_KEY).then((stored) => {
            if (stored) {
                setCity(stored);
            } else {
                setShowCityModal(true);
            }
        });
    }, []);

    // Obtener clima cuando cambia la ciudad
    useEffect(() => {
        if (!city) return;
        getWeatherByCity(city)
            .then(setWeather)
            .catch(() => setWeather(null));
    }, [city]);

    const loadData = useCallback(async () => {
        dispatch(fetchAllStats());
        dispatch(fetchGarments({}));
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
        const last = new Date(y, m + 1, 0).getDate();
        const end = `${y}-${String(m + 1).padStart(2, '0')}-${last}`;
        dispatch(fetchMonthEntries({ startDate: start, endDate: end }));
        if (city) {
            getWeatherByCity(city).then(setWeather).catch(() => setWeather(null));
        }
    }, [dispatch, city]);

    useEffect(() => { loadData(); }, [loadData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const saveCity = async () => {
        const trimmed = cityInput.trim();
        if (!trimmed) return;
        await AsyncStorage.setItem(CITY_KEY, trimmed);
        setCity(trimmed);
        setCityInput('');
        setShowCityModal(false);
    };

    const recentGarments = garments.slice(0, 6);

    return (
        <View style={[styles.root, { backgroundColor: c.background }]}>
            <StatusBar barStyle={c.statusBar} backgroundColor={c.surface} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: c.surface, paddingTop: insets.top + 8, borderBottomColor: c.border, ...c.shadowSm }]}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.greeting, { color: c.textSecondary }]}>{greeting()} · {formatDate()}</Text>
                    <Text style={[styles.userName, { color: c.text }]} numberOfLines={1}>
                        {user?.fullName || 'Usuario'}
                    </Text>
                </View>
                <TouchableOpacity onPress={toggleTheme} style={[styles.themeBtn, { backgroundColor: c.surfaceVariant }]}>
                    <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={c.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
            >
                {/* Clima */}
                <Card style={[styles.weatherCard, { backgroundColor: c.primary }]} padding={16}>
                    <View style={styles.weatherRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.weatherTemp}>
                                {weather?.temp != null ? `${Math.round(weather.temp)}°C` : '–°C'}
                            </Text>
                            <Text style={styles.weatherDesc}>
                                {weather?.description || 'Clima no disponible'}
                            </Text>
                            <TouchableOpacity style={styles.cityRow} onPress={() => { setCityInput(city || ''); setShowCityModal(true); }}>
                                <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.8)" />
                                <Text style={styles.cityText}>{weather?.city || city || 'Toca para configurar'}</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.weatherEmoji}>
                            {weatherEmoji(weather?.temp)}
                        </Text>
                    </View>
                </Card>

                {/* Quick Stats */}
                <Text style={[styles.sectionTitle, { color: c.text }]}>Resumen</Text>
                <View style={styles.statsRow}>
                    <StatCard value={resumen?.total_prendas ?? garments.length} label="Prendas" icon="👕" color={c.primary} />
                    <View style={{ width: 10 }} />
                    <StatCard value={resumen?.total_outfits} label="Outfits" icon="👔" color={c.accent} />
                    <View style={{ width: 10 }} />
                    <StatCard value={resumen?.prendas_favoritas} label="Favoritos" icon="❤️" color={c.error} />
                    <View style={{ width: 10 }} />
                    <StatCard value={resumen?.outfits_planificados} label="Planificados" icon="📅" color={c.warning} />
                </View>

                {/* Outfit del día */}
                <Text style={[styles.sectionTitle, { color: c.text }]}>Outfit del día</Text>
                <Card padding={16}>
                    {todayEntry?.outfit ? (
                        <View style={styles.todayRow}>
                            <View style={[styles.todayIcon, { backgroundColor: c.primaryLight + '30' }]}>
                                <Text style={{ fontSize: 28 }}>👔</Text>
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[styles.todayName, { color: c.text }]}>{todayEntry.outfit.nombre}</Text>
                                {todayEntry.outfit.ocasion ? (
                                    <Text style={[styles.todayOcc, { color: c.textSecondary }]}>{todayEntry.outfit.ocasion}</Text>
                                ) : null}
                            </View>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Calendario')}
                                style={[styles.arrowBtn, { backgroundColor: c.primaryLight + '30' }]}
                            >
                                <Ionicons name="chevron-forward" size={18} color={c.primary} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.todayRow}>
                            <Text style={{ fontSize: 28 }}>📅</Text>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[styles.noOutfitText, { color: c.textSecondary }]}>Sin outfit planificado hoy</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Calendario')}>
                                    <Text style={[styles.linkText, { color: c.primary }]}>Planificar →</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </Card>

                {/* Prendas recientes */}
                <Text style={[styles.sectionTitle, { color: c.text }]}>Prendas recientes</Text>
                {recentGarments.length > 0 ? (
                    <FlatList
                        horizontal
                        data={recentGarments}
                        keyExtractor={(item) => String(item.id)}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingRight: 8 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.garmentCard, { backgroundColor: c.surface, borderColor: c.border, ...c.shadowSm }]}
                                onPress={() => navigation.navigate('Armario', { screen: 'GarmentDetail', params: { garment: item } })}
                                activeOpacity={0.8}
                            >
                                {item.image_url ? (
                                    <Image source={{ uri: `${IMAGE_BASE_URL}${item.image_url}` }} style={styles.garmentImg} />
                                ) : (
                                    <View style={[styles.garmentImg, { backgroundColor: c.surfaceVariant, justifyContent: 'center', alignItems: 'center' }]}>
                                        <Text style={{ fontSize: 24 }}>👕</Text>
                                    </View>
                                )}
                                <Text style={[styles.garmentName, { color: c.text }]} numberOfLines={1}>{item.name}</Text>
                            </TouchableOpacity>
                        )}
                    />
                ) : (
                    <Card padding={14}>
                        <Text style={[{ color: c.textSecondary, textAlign: 'center', fontSize: 14 }]}>
                            Aún no tienes prendas. ¡Empieza añadiendo una!
                        </Text>
                    </Card>
                )}

                {/* Accesos rápidos */}
                <Text style={[styles.sectionTitle, { color: c.text }]}>Accesos rápidos</Text>
                <View style={styles.quickRow}>
                    <Card style={{ flex: 1 }} padding={14} onPress={() => navigation.navigate('Stats')}>
                        <Text style={{ fontSize: 24, textAlign: 'center' }}>📊</Text>
                        <Text style={[styles.quickLabel, { color: c.text }]}>Estadísticas</Text>
                    </Card>
                    <View style={{ width: 12 }} />
                    <Card style={{ flex: 1 }} padding={14} onPress={() => navigation.navigate('Outfits', { screen: 'CreateOutfit' })}>
                        <Text style={{ fontSize: 24, textAlign: 'center' }}>✨</Text>
                        <Text style={[styles.quickLabel, { color: c.text }]}>Nuevo outfit</Text>
                    </Card>
                </View>

                {/* Logout */}
                <TouchableOpacity
                    style={[styles.logoutBtn, { borderColor: c.error + '60' }]}
                    onPress={() => dispatch(logoutUser())}
                    activeOpacity={0.8}
                >
                    <Ionicons name="log-out-outline" size={18} color={c.error} style={{ marginRight: 8 }} />
                    <Text style={[styles.logoutText, { color: c.error }]}>Cerrar sesión</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Modal ciudad */}
            <Modal visible={showCityModal} transparent animationType="fade">
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={[styles.modalBox, { backgroundColor: c.surface }]}>
                        <Text style={[styles.modalTitle, { color: c.text }]}>¿En qué ciudad vives?</Text>
                        <Text style={[styles.modalSub, { color: c.textSecondary }]}>
                            Introduce tu ciudad para ver el tiempo en el inicio.
                        </Text>
                        <TextInput
                            style={[styles.cityInput, { color: c.text, borderColor: c.border, backgroundColor: c.surfaceVariant }]}
                            placeholder="Ej: Madrid, Barcelona, Buenos Aires…"
                            placeholderTextColor={c.textMuted}
                            value={cityInput}
                            onChangeText={setCityInput}
                            onSubmitEditing={saveCity}
                            returnKeyType="done"
                            autoFocus
                        />
                        <TouchableOpacity
                            style={[styles.modalBtn, { backgroundColor: cityInput.trim() ? c.primary : c.border }]}
                            onPress={saveCity}
                            disabled={!cityInput.trim()}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.modalBtnText}>Guardar</Text>
                        </TouchableOpacity>
                        {city ? (
                            <TouchableOpacity onPress={() => setShowCityModal(false)} style={{ marginTop: 12 }}>
                                <Text style={[styles.modalCancel, { color: c.textMuted }]}>Cancelar</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: 20,
        paddingBottom: 14,
        borderBottomWidth: 1,
    },
    greeting: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
    userName: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
    themeBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },

    weatherCard: { marginBottom: 20, borderWidth: 0 },
    weatherRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    weatherTemp: { fontSize: 36, fontWeight: '700', color: '#FFF', letterSpacing: -1 },
    weatherDesc: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 2, textTransform: 'capitalize' },
    weatherEmoji: { fontSize: 48 },
    cityRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
    cityText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },

    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, marginTop: 4 },

    statsRow: { flexDirection: 'row', marginBottom: 20 },

    todayRow: { flexDirection: 'row', alignItems: 'center' },
    todayIcon: { width: 56, height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    todayName: { fontSize: 16, fontWeight: '600' },
    todayOcc: { fontSize: 13, marginTop: 2, textTransform: 'capitalize' },
    arrowBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    noOutfitText: { fontSize: 14, marginBottom: 4 },
    linkText: { fontSize: 14, fontWeight: '600' },

    garmentCard: { width: 100, borderRadius: 14, borderWidth: 1, marginRight: 10, overflow: 'hidden', marginBottom: 4 },
    garmentImg: { width: 100, height: 100 },
    garmentName: { fontSize: 12, fontWeight: '500', padding: 8, paddingTop: 6 },

    quickRow: { flexDirection: 'row', marginBottom: 24 },
    quickLabel: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 6 },

    logoutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
    logoutText: { fontSize: 15, fontWeight: '600' },

    // Modal ciudad
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalBox: { width: '100%', borderRadius: 20, padding: 24 },
    modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
    modalSub: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
    cityInput: {
        borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
        fontSize: 16, marginBottom: 16,
    },
    modalBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    modalBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    modalCancel: { textAlign: 'center', fontSize: 14 },
});

export default HomeScreen;
