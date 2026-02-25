// Pantalla de Calendario — multi-outfit/prendas por dia, auto-worn, solo hoy editable
import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, FlatList, Modal, Image,
    StyleSheet, ActivityIndicator, StatusBar, ScrollView, Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMonthEntries, addCalendarEntry, removeCalendarEntry, setSelectedDate } from '../store/calendarSlice';
import { fetchOutfits } from '../store/outfitsSlice';
import { fetchGarments } from '../store/wardrobeSlice';
import { useTheme } from '../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { IMAGE_BASE_URL } from '../services/api';
import ScreenHeader from '../components/ScreenHeader';

const DAYS_ES = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
const MONTHS_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const CalendarScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { entries, selectedDate, isLoading } = useSelector((state) => state.calendar);
    const { outfits } = useSelector((state) => state.outfits);
    const { garments } = useSelector((state) => state.wardrobe);
    const { theme } = useTheme();
    const c = theme.colors;

    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [showPicker, setShowPicker] = useState(false);
    const [pickerTab, setPickerTab] = useState('outfits'); // 'outfits' | 'garments'
    const [selectedGarmentIds, setSelectedGarmentIds] = useState([]);

    const today = new Date().toISOString().split('T')[0];
    const isToday = selectedDate === today;

    // Cargar entradas del mes
    useEffect(() => {
        const start = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
        const end = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${lastDay}`;
        dispatch(fetchMonthEntries({ startDate: start, endDate: end }));
    }, [dispatch, currentMonth, currentYear]);

    // Cargar outfits y prendas
    useEffect(() => {
        dispatch(fetchOutfits());
        dispatch(fetchGarments());
    }, [dispatch]);

    // Navegar entre meses
    const changeMonth = (dir) => {
        let m = currentMonth + dir;
        let y = currentYear;
        if (m < 0) { m = 11; y--; }
        if (m > 11) { m = 0; y++; }
        setCurrentMonth(m);
        setCurrentYear(y);
    };

    // Entradas del dia seleccionado
    const dayEntries = entries.filter((e) => {
        const eDate = typeof e.date === 'string' ? e.date.split('T')[0] : String(e.date);
        return eDate === selectedDate;
    });

    // Contar entradas por fecha para los dots
    const entriesByDate = {};
    entries.forEach((e) => {
        const d = typeof e.date === 'string' ? e.date.split('T')[0] : String(e.date);
        entriesByDate[d] = (entriesByDate[d] || 0) + 1;
    });

    // Generar dias del calendario
    const generateCalendarDays = () => {
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const adjustedFirst = firstDay === 0 ? 6 : firstDay - 1;
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const days = [];

        for (let i = 0; i < adjustedFirst; i++) {
            days.push({ key: `empty-${i}`, empty: true });
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const count = entriesByDate[dateStr] || 0;
            days.push({ key: dateStr, day: d, date: dateStr, count });
        }

        return days;
    };

    // Abrir picker
    const openPicker = () => {
        setPickerTab('outfits');
        setSelectedGarmentIds([]);
        setShowPicker(true);
    };

    // Asignar outfit
    const handleAssignOutfit = (outfitId) => {
        dispatch(addCalendarEntry({ date: today, outfitId }));
        setShowPicker(false);
    };

    // Asignar prendas sueltas
    const handleAssignGarments = () => {
        if (selectedGarmentIds.length === 0) return;
        dispatch(addCalendarEntry({ date: today, garmentIds: selectedGarmentIds }));
        setShowPicker(false);
        setSelectedGarmentIds([]);
    };

    // Toggle garment selection
    const toggleGarment = (id) => {
        setSelectedGarmentIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    // Eliminar entrada
    const handleRemoveEntry = (entryId) => {
        Alert.alert(
            'Eliminar entrada',
            'Se eliminara esta entrada del calendario.',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Eliminar', style: 'destructive', onPress: () => dispatch(removeCalendarEntry(entryId)) },
            ]
        );
    };

    // Nombre descriptivo de la entrada
    const entryLabel = (entry) => {
        if (entry.outfit_name) return entry.outfit_name;
        if (entry.outfit_id) return `Outfit #${entry.outfit_id}`;
        const gIds = entry.garment_ids || [];
        if (gIds.length > 0) {
            const gs = Array.isArray(entry.garments) ? entry.garments : [];
            if (gs.length > 0) return gs.map((g) => g.name).join(', ');
            return `${gIds.length} prenda${gIds.length !== 1 ? 's' : ''}`;
        }
        return 'Entrada';
    };

    const calendarDays = generateCalendarDays();

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <StatusBar barStyle={c.statusBar} />

            <ScreenHeader title="Calendario" />

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Navegacion del mes */}
                <View style={styles.monthNav}>
                    <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthBtn}>
                        <Ionicons name="chevron-back" size={20} color={c.primary} />
                    </TouchableOpacity>
                    <Text style={[styles.monthLabel, { color: c.text }]}>
                        {MONTHS_ES[currentMonth]} {currentYear}
                    </Text>
                    <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthBtn}>
                        <Ionicons name="chevron-forward" size={20} color={c.primary} />
                    </TouchableOpacity>
                </View>

                {/* Encabezado de dias */}
                <View style={styles.daysHeader}>
                    {DAYS_ES.map((d) => (
                        <Text key={d} style={[styles.dayLabel, { color: c.textMuted }]}>{d}</Text>
                    ))}
                </View>

                {/* Grid */}
                {isLoading ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="large" color={c.primary} />
                    </View>
                ) : (
                    <View style={styles.calendarGrid}>
                        {calendarDays.map((item) => {
                            if (item.empty) {
                                return <View key={item.key} style={styles.dayCell} />;
                            }
                            const isDayToday = item.date === today;
                            const isSelected = item.date === selectedDate;
                            const hasEntries = item.count > 0;

                            return (
                                <TouchableOpacity
                                    key={item.key}
                                    style={[
                                        styles.dayCell,
                                        isDayToday && [styles.todayCell, { borderColor: c.primary }],
                                        isSelected && [styles.selectedCell, { backgroundColor: c.primary }],
                                    ]}
                                    onPress={() => dispatch(setSelectedDate(item.date))}
                                >
                                    <Text style={[
                                        styles.dayNumber,
                                        { color: isSelected ? '#FFF' : c.text },
                                        isDayToday && !isSelected && { color: c.primary, fontWeight: '800' },
                                    ]}>
                                        {item.day}
                                    </Text>
                                    {hasEntries && (
                                        <View style={styles.dotsRow}>
                                            {Array.from({ length: Math.min(item.count, 3) }).map((_, i) => (
                                                <View key={i} style={[styles.dot, { backgroundColor: isSelected ? '#FFF' : c.accent }]} />
                                            ))}
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* Detalle del dia seleccionado */}
                <View style={[styles.dayDetail, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <View style={styles.dayDetailHeader}>
                        <Text style={[styles.detailDate, { color: c.text }]}>
                            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', {
                                weekday: 'long', day: 'numeric', month: 'long',
                            })}
                        </Text>
                        {isToday && (
                            <View style={[styles.todayBadge, { backgroundColor: c.primary + '15' }]}>
                                <Text style={[styles.todayBadgeText, { color: c.primary }]}>Hoy</Text>
                            </View>
                        )}
                    </View>

                    {/* Lista de entradas del dia */}
                    {dayEntries.length > 0 ? (
                        <View>
                            {dayEntries.map((entry) => {
                                const entryGarments = Array.isArray(entry.garments) ? entry.garments : [];
                                const isOutfit = !!entry.outfit_id;

                                return (
                                    <View key={entry.id} style={[styles.entryCard, { backgroundColor: c.surfaceVariant, borderColor: c.border }]}>
                                        <View style={styles.entryHeader}>
                                            <View style={[styles.entryIcon, { backgroundColor: c.primary + '15' }]}>
                                                <Ionicons
                                                    name={isOutfit ? 'albums-outline' : 'shirt-outline'}
                                                    size={18}
                                                    color={c.primary}
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.entryType, { color: c.textMuted }]}>
                                                    {isOutfit ? 'Outfit' : 'Prendas sueltas'}
                                                </Text>
                                                <Text style={[styles.entryName, { color: c.text }]} numberOfLines={2}>
                                                    {entryLabel(entry)}
                                                </Text>
                                            </View>
                                            <View style={[styles.wornBadge, { backgroundColor: (c.success || '#27AE60') + '15' }]}>
                                                <Ionicons name="checkmark-circle" size={14} color={c.success || '#27AE60'} />
                                                <Text style={[styles.wornBadgeText, { color: c.success || '#27AE60' }]}>Usado</Text>
                                            </View>
                                        </View>

                                        {/* Mini garment preview */}
                                        {entryGarments.length > 0 && (
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.garmentPreview}>
                                                {entryGarments.map((g) => (
                                                    <View key={g.id} style={[styles.garmentMini, { backgroundColor: c.background, borderColor: c.border }]}>
                                                        {g.image_url ? (
                                                            <Image
                                                                source={{ uri: `${IMAGE_BASE_URL}${g.image_url}` }}
                                                                style={styles.garmentMiniImg}
                                                            />
                                                        ) : (
                                                            <View style={styles.garmentMiniPlaceholder}>
                                                                <Ionicons name="shirt-outline" size={16} color={c.textMuted} />
                                                            </View>
                                                        )}
                                                        <Text style={[styles.garmentMiniName, { color: c.text }]} numberOfLines={1}>
                                                            {g.name}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </ScrollView>
                                        )}

                                        {/* Boton eliminar solo hoy */}
                                        {isToday && (
                                            <TouchableOpacity
                                                style={[styles.removeEntryBtn, { borderColor: c.error }]}
                                                onPress={() => handleRemoveEntry(entry.id)}
                                            >
                                                <Ionicons name="trash-outline" size={14} color={c.error} />
                                                <Text style={[styles.removeEntryText, { color: c.error }]}>Quitar</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    ) : (
                        <Text style={[styles.noEntryText, { color: c.textMuted }]}>
                            {isToday ? 'No has registrado nada hoy' : 'Sin registros este dia'}
                        </Text>
                    )}

                    {/* Boton anadir — solo hoy */}
                    {isToday && (
                        <TouchableOpacity
                            style={[styles.addBtn, { backgroundColor: c.primary }]}
                            onPress={openPicker}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="add" size={20} color="#FFF" />
                            <Text style={styles.addBtnText}>
                                {dayEntries.length > 0 ? 'Anadir otro' : 'Registrar lo que llevas hoy'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>

            {/* Modal: Picker de outfit / prendas */}
            <Modal visible={showPicker} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: c.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: c.text }]}>Que llevas hoy?</Text>
                            <TouchableOpacity onPress={() => setShowPicker(false)}>
                                <Ionicons name="close" size={22} color={c.primary} />
                            </TouchableOpacity>
                        </View>

                        {/* Tabs: Outfits / Prendas */}
                        <View style={[styles.pickerTabs, { borderBottomColor: c.border }]}>
                            <TouchableOpacity
                                style={[styles.pickerTab, pickerTab === 'outfits' && { borderBottomColor: c.primary }]}
                                onPress={() => setPickerTab('outfits')}
                            >
                                <Ionicons name="albums-outline" size={16} color={pickerTab === 'outfits' ? c.primary : c.textMuted} />
                                <Text style={[styles.pickerTabText, { color: pickerTab === 'outfits' ? c.primary : c.textMuted }]}>
                                    Outfits
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.pickerTab, pickerTab === 'garments' && { borderBottomColor: c.primary }]}
                                onPress={() => setPickerTab('garments')}
                            >
                                <Ionicons name="shirt-outline" size={16} color={pickerTab === 'garments' ? c.primary : c.textMuted} />
                                <Text style={[styles.pickerTabText, { color: pickerTab === 'garments' ? c.primary : c.textMuted }]}>
                                    Prendas sueltas
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Outfits list */}
                        {pickerTab === 'outfits' && (
                            <FlatList
                                data={outfits}
                                keyExtractor={(item) => item.id.toString()}
                                style={{ maxHeight: 350 }}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[styles.outfitOption, { borderBottomColor: c.border }]}
                                        onPress={() => handleAssignOutfit(item.id)}
                                    >
                                        <Ionicons name="albums-outline" size={20} color={c.primary} style={{ marginRight: 10 }} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.optionName, { color: c.text }]}>{item.name}</Text>
                                            <Text style={[styles.optionMeta, { color: c.textMuted }]}>
                                                {item.occasion || 'Sin ocasion'} · {item.garments?.length || 0} prendas
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <Text style={[styles.emptyPicker, { color: c.textMuted }]}>
                                        No tienes outfits. Ve a Outfits para crear uno.
                                    </Text>
                                }
                            />
                        )}

                        {/* Garments multi-select */}
                        {pickerTab === 'garments' && (
                            <View style={{ flex: 1 }}>
                                <FlatList
                                    data={garments}
                                    keyExtractor={(item) => item.id.toString()}
                                    style={{ maxHeight: 300 }}
                                    renderItem={({ item }) => {
                                        const isSelected = selectedGarmentIds.includes(item.id);
                                        return (
                                            <TouchableOpacity
                                                style={[
                                                    styles.garmentOption,
                                                    { borderBottomColor: c.border },
                                                    isSelected && { backgroundColor: c.primary + '10' },
                                                ]}
                                                onPress={() => toggleGarment(item.id)}
                                            >
                                                <View style={[styles.garmentOptionImg, { backgroundColor: c.surfaceVariant, borderColor: c.border }]}>
                                                    {item.image_url ? (
                                                        <Image
                                                            source={{ uri: `${IMAGE_BASE_URL}${item.image_url}` }}
                                                            style={styles.garmentOptionImgInner}
                                                        />
                                                    ) : (
                                                        <Ionicons name="shirt-outline" size={20} color={c.textMuted} />
                                                    )}
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.optionName, { color: c.text }]}>{item.name}</Text>
                                                    <Text style={[styles.optionMeta, { color: c.textMuted }]}>
                                                        {item.category || 'Sin categoria'}{item.color ? ` · ${item.color}` : ''}
                                                    </Text>
                                                </View>
                                                <Ionicons
                                                    name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                                                    size={22}
                                                    color={isSelected ? c.primary : c.textMuted}
                                                />
                                            </TouchableOpacity>
                                        );
                                    }}
                                    ListEmptyComponent={
                                        <Text style={[styles.emptyPicker, { color: c.textMuted }]}>
                                            No tienes prendas. Ve a Armario para anadir.
                                        </Text>
                                    }
                                />
                                {selectedGarmentIds.length > 0 && (
                                    <TouchableOpacity
                                        style={[styles.confirmGarmentsBtn, { backgroundColor: c.primary }]}
                                        onPress={handleAssignGarments}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="checkmark" size={18} color="#FFF" />
                                        <Text style={styles.confirmGarmentsBtnText}>
                                            Anadir {selectedGarmentIds.length} prenda{selectedGarmentIds.length !== 1 ? 's' : ''}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    monthNav: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 16,
    },
    monthBtn: { padding: 8 },
    monthLabel: { fontSize: 20, fontWeight: '700' },
    daysHeader: {
        flexDirection: 'row', paddingHorizontal: 8,
    },
    dayLabel: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '600', marginBottom: 8 },
    loadingBox: { height: 280, justifyContent: 'center', alignItems: 'center' },
    calendarGrid: {
        flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8,
    },
    dayCell: {
        width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center',
        borderRadius: 12,
    },
    todayCell: { borderWidth: 2 },
    selectedCell: { borderRadius: 12 },
    dayNumber: { fontSize: 15, fontWeight: '600' },
    dotsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
    dot: { width: 5, height: 5, borderRadius: 2.5 },

    // Day detail
    dayDetail: {
        margin: 16, borderRadius: 16, borderWidth: 1, padding: 20,
    },
    dayDetailHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
    },
    detailDate: { fontSize: 17, fontWeight: '700', textTransform: 'capitalize' },
    todayBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
    todayBadgeText: { fontSize: 12, fontWeight: '700' },
    noEntryText: { fontSize: 15, textAlign: 'center', paddingVertical: 16 },

    // Entry card
    entryCard: {
        borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10,
    },
    entryHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
    },
    entryIcon: {
        width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
    },
    entryType: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    entryName: { fontSize: 15, fontWeight: '700', marginTop: 1 },
    wornBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    },
    wornBadgeText: { fontSize: 11, fontWeight: '700' },

    // Garment preview
    garmentPreview: { marginTop: 10 },
    garmentMini: {
        width: 64, marginRight: 8, borderRadius: 8, borderWidth: 1, overflow: 'hidden',
    },
    garmentMiniImg: { width: 64, height: 64 },
    garmentMiniPlaceholder: { width: 64, height: 64, justifyContent: 'center', alignItems: 'center' },
    garmentMiniName: { fontSize: 10, fontWeight: '600', textAlign: 'center', paddingHorizontal: 2, paddingVertical: 3 },

    // Remove entry
    removeEntryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
        marginTop: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
    },
    removeEntryText: { fontSize: 13, fontWeight: '600' },

    // Add button
    addBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        marginTop: 8, paddingVertical: 14, borderRadius: 12,
        shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
    },
    addBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', padding: 20 },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
    },
    modalTitle: { fontSize: 20, fontWeight: '700' },

    // Picker tabs
    pickerTabs: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 8 },
    pickerTab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent',
    },
    pickerTabText: { fontSize: 14, fontWeight: '700' },

    // Outfit option
    outfitOption: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 0.5,
    },
    optionName: { fontSize: 15, fontWeight: '600' },
    optionMeta: { fontSize: 12, marginTop: 2 },
    emptyPicker: { textAlign: 'center', padding: 32, fontSize: 14 },

    // Garment option
    garmentOption: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4,
        borderBottomWidth: 0.5, borderRadius: 8,
    },
    garmentOptionImg: {
        width: 44, height: 44, borderRadius: 10, borderWidth: 1,
        justifyContent: 'center', alignItems: 'center', marginRight: 10, overflow: 'hidden',
    },
    garmentOptionImgInner: { width: 44, height: 44 },

    // Confirm garments button
    confirmGarmentsBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        marginTop: 12, paddingVertical: 14, borderRadius: 12,
    },
    confirmGarmentsBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});

export default CalendarScreen;
