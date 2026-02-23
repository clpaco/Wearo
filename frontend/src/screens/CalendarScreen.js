// Pantalla de Calendario — vista mensual con asignación de outfits
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, FlatList, Modal,
    StyleSheet, ActivityIndicator, StatusBar, ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMonthEntries, assignOutfitToDate, removeEntry, setSelectedDate } from '../store/calendarSlice';
import { fetchOutfits } from '../store/outfitsSlice';
import { useTheme } from '../hooks/useTheme';
import ScreenHeader from '../components/ScreenHeader';

const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const CalendarScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { entries, selectedDate, isLoading } = useSelector((state) => state.calendar);
    const { outfits } = useSelector((state) => state.outfits);
    const { theme } = useTheme();
    const c = theme.colors;

    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [showPicker, setShowPicker] = useState(false);

    // Cargar entradas del mes
    useEffect(() => {
        const start = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
        const end = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${lastDay}`;
        dispatch(fetchMonthEntries({ startDate: start, endDate: end }));
    }, [dispatch, currentMonth, currentYear]);

    // Cargar outfits para el selector
    useEffect(() => {
        dispatch(fetchOutfits());
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

    // Generar días del calendario
    const generateCalendarDays = () => {
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const adjustedFirst = firstDay === 0 ? 6 : firstDay - 1; // Lunes = 0
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const days = [];

        // Espacios vacíos
        for (let i = 0; i < adjustedFirst; i++) {
            days.push({ key: `empty-${i}`, empty: true });
        }

        // Días del mes
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const entry = entries.find((e) => {
                const eDate = typeof e.date === 'string' ? e.date.split('T')[0] : e.date;
                return eDate === dateStr;
            });
            days.push({ key: dateStr, day: d, date: dateStr, entry });
        }

        return days;
    };

    // Asignar outfit a fecha seleccionada
    const handleAssign = (outfitId) => {
        dispatch(assignOutfitToDate({ date: selectedDate, outfitId }));
        setShowPicker(false);
    };

    const handleRemove = () => {
        dispatch(removeEntry(selectedDate));
    };

    const selectedEntry = entries.find((e) => {
        const eDate = typeof e.date === 'string' ? e.date.split('T')[0] : e.date;
        return eDate === selectedDate;
    });

    const calendarDays = generateCalendarDays();
    const today = new Date().toISOString().split('T')[0];

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <StatusBar barStyle={c.statusBar} />

            {/* Header */}
            <ScreenHeader title="Calendario" />

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Navegación del mes */}
                <View style={styles.monthNav}>
                    <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthBtn}>
                        <Text style={[styles.monthArrow, { color: c.primary }]}>◀</Text>
                    </TouchableOpacity>
                    <Text style={[styles.monthLabel, { color: c.text }]}>
                        {MONTHS_ES[currentMonth]} {currentYear}
                    </Text>
                    <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthBtn}>
                        <Text style={[styles.monthArrow, { color: c.primary }]}>▶</Text>
                    </TouchableOpacity>
                </View>

                {/* Encabezado de días */}
                <View style={styles.daysHeader}>
                    {DAYS_ES.map((d) => (
                        <Text key={d} style={[styles.dayLabel, { color: c.textMuted }]}>{d}</Text>
                    ))}
                </View>

                {/* Grid del calendario */}
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
                            const isToday = item.date === today;
                            const isSelected = item.date === selectedDate;
                            const hasOutfit = !!item.entry?.outfit_id;

                            return (
                                <TouchableOpacity
                                    key={item.key}
                                    style={[
                                        styles.dayCell,
                                        isToday && [styles.todayCell, { borderColor: c.primary }],
                                        isSelected && [styles.selectedCell, { backgroundColor: c.primary }],
                                    ]}
                                    onPress={() => dispatch(setSelectedDate(item.date))}
                                >
                                    <Text style={[
                                        styles.dayNumber,
                                        { color: isSelected ? '#FFF' : c.text },
                                        isToday && !isSelected && { color: c.primary, fontWeight: '800' },
                                    ]}>
                                        {item.day}
                                    </Text>
                                    {hasOutfit && (
                                        <View style={[styles.dot, { backgroundColor: isSelected ? '#FFF' : c.accent }]} />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* Detalle del día seleccionado */}
                <View style={[styles.dayDetail, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <Text style={[styles.detailDate, { color: c.text }]}>
                        {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', {
                            weekday: 'long', day: 'numeric', month: 'long',
                        })}
                    </Text>

                    {selectedEntry ? (
                        <View>
                            <View style={[styles.outfitBadge, { backgroundColor: c.primary + '15' }]}>
                                <Text style={{ fontSize: 20, marginRight: 8 }}>👔</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.outfitLabel, { color: c.primary }]}>Outfit planificado</Text>
                                    <Text style={[styles.outfitName, { color: c.text }]}>
                                        {selectedEntry.outfit_name || `Outfit #${selectedEntry.outfit_id}`}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={[styles.removeBtn, { borderColor: c.error }]}
                                onPress={handleRemove}
                            >
                                <Text style={[styles.removeBtnText, { color: c.error }]}>Quitar outfit</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View>
                            <Text style={[styles.noOutfitText, { color: c.textMuted }]}>
                                Sin outfit asignado
                            </Text>
                            <TouchableOpacity
                                style={[styles.assignBtn, { backgroundColor: c.primary }]}
                                onPress={() => setShowPicker(true)}
                            >
                                <Text style={styles.assignBtnText}>+ Asignar Outfit</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Modal selector de outfits */}
            <Modal visible={showPicker} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: c.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: c.text }]}>Seleccionar Outfit</Text>
                            <TouchableOpacity onPress={() => setShowPicker(false)}>
                                <Text style={[styles.modalClose, { color: c.primary }]}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={outfits}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.outfitOption, { borderBottomColor: c.border }]}
                                    onPress={() => handleAssign(item.id)}
                                >
                                    <Text style={{ fontSize: 20, marginRight: 10 }}>👔</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.optionName, { color: c.text }]}>{item.name}</Text>
                                        <Text style={[styles.optionMeta, { color: c.textMuted }]}>
                                            {item.occasion || 'Sin ocasión'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <Text style={[styles.emptyPicker, { color: c.textMuted }]}>
                                    No tienes outfits. Crea uno primero.
                                </Text>
                            }
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1,
    },
    backBtn: { fontSize: 16, fontWeight: '600' },
    headerTitle: { fontSize: 22, fontWeight: '800' },
    monthNav: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 16,
    },
    monthBtn: { padding: 8 },
    monthArrow: { fontSize: 18, fontWeight: '700' },
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
    dot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
    dayDetail: {
        margin: 16, borderRadius: 16, borderWidth: 1, padding: 20,
    },
    detailDate: { fontSize: 17, fontWeight: '700', textTransform: 'capitalize', marginBottom: 12 },
    outfitBadge: {
        flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 12,
    },
    outfitLabel: { fontSize: 13, fontWeight: '600' },
    outfitName: { fontSize: 17, fontWeight: '700', marginTop: 2 },
    removeBtn: { paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
    removeBtnText: { fontSize: 14, fontWeight: '600' },
    noOutfitText: { fontSize: 15, marginBottom: 12, textAlign: 'center' },
    assignBtn: {
        paddingVertical: 14, borderRadius: 12, alignItems: 'center',
        shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
    },
    assignBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '60%', padding: 20,
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
    },
    modalTitle: { fontSize: 20, fontWeight: '700' },
    modalClose: { fontSize: 22, fontWeight: '700' },
    outfitOption: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 0.5,
    },
    optionName: { fontSize: 16, fontWeight: '600' },
    optionMeta: { fontSize: 13, marginTop: 2 },
    emptyPicker: { textAlign: 'center', padding: 32, fontSize: 15 },
});

export default CalendarScreen;
