// Pantalla de detalle de outfit
import React from 'react';
import {
    View, Text, Image, TouchableOpacity, FlatList,
    StyleSheet, Alert, StatusBar, ScrollView,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { removeOutfit } from '../store/outfitsSlice';
import { useTheme } from '../hooks/useTheme';

const BASE_URL = 'http://10.0.2.2:3000';

const OutfitDetailScreen = ({ navigation, route }) => {
    const { outfit } = route.params;
    const garments = outfit.garments || [];
    const dispatch = useDispatch();
    const { theme } = useTheme();
    const c = theme.colors;

    const handleDelete = () => {
        Alert.alert(
            'Eliminar outfit',
            `¿Estás seguro de que quieres eliminar "${outfit.name}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar', style: 'destructive',
                    onPress: async () => {
                        await dispatch(removeOutfit(outfit.id));
                        navigation.goBack();
                    },
                },
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <StatusBar barStyle={c.statusBar} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={[styles.backBtn, { color: c.primary }]}>← Volver</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: c.text }]} numberOfLines={1}>
                    {outfit.name}
                </Text>
                <View style={{ width: 50 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Info */}
                <View style={[styles.infoCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: c.textSecondary }]}>Ocasión</Text>
                        <Text style={[styles.infoValue, { color: c.text }]}>
                            {outfit.occasion || '—'}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: c.textSecondary }]}>Temporada</Text>
                        <Text style={[styles.infoValue, { color: c.text }]}>
                            {outfit.season || '—'}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: c.textSecondary }]}>Veces usado</Text>
                        <Text style={[styles.infoValue, { color: c.text }]}>
                            {outfit.times_worn || 0}
                        </Text>
                    </View>
                    {outfit.notes && (
                        <View style={[styles.notesBox, { backgroundColor: c.surfaceVariant }]}>
                            <Text style={[styles.notesText, { color: c.textSecondary }]}>{outfit.notes}</Text>
                        </View>
                    )}
                </View>

                {/* Prendas del outfit */}
                <Text style={[styles.sectionTitle, { color: c.text }]}>
                    Prendas ({garments.length})
                </Text>

                <View style={styles.garmentsList}>
                    {garments.map((g) => (
                        <View
                            key={g.id}
                            style={[styles.garmentCard, { backgroundColor: c.surface, borderColor: c.border }]}
                        >
                            {g.image_url ? (
                                <Image source={{ uri: `${BASE_URL}${g.image_url}` }} style={styles.garmentImg} />
                            ) : (
                                <View style={[styles.garmentPlaceholder, { backgroundColor: c.surfaceVariant }]}>
                                    <Text style={{ fontSize: 28 }}>👕</Text>
                                </View>
                            )}
                            <View style={styles.garmentInfo}>
                                <Text style={[styles.garmentName, { color: c.text }]}>{g.name}</Text>
                                <Text style={[styles.garmentCat, { color: c.primary }]}>{g.category}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Acciones */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.deleteBtn, { borderColor: c.error }]}
                        onPress={handleDelete}
                    >
                        <Text style={[styles.deleteBtnText, { color: c.error }]}>🗑️ Eliminar Outfit</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
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
    headerTitle: { fontSize: 20, fontWeight: '700', flex: 1, textAlign: 'center' },
    scrollContent: { padding: 16, paddingBottom: 40 },
    infoCard: {
        borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20,
    },
    infoRow: {
        flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10,
        borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB20',
    },
    infoLabel: { fontSize: 15, fontWeight: '500' },
    infoValue: { fontSize: 15, fontWeight: '600', textTransform: 'capitalize' },
    notesBox: { marginTop: 12, padding: 12, borderRadius: 10 },
    notesText: { fontSize: 14, lineHeight: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
    garmentsList: { gap: 10 },
    garmentCard: {
        flexDirection: 'row', borderRadius: 12, borderWidth: 1, overflow: 'hidden', alignItems: 'center',
    },
    garmentImg: { width: 70, height: 70 },
    garmentPlaceholder: { width: 70, height: 70, justifyContent: 'center', alignItems: 'center' },
    garmentInfo: { flex: 1, paddingHorizontal: 12 },
    garmentName: { fontSize: 16, fontWeight: '700' },
    garmentCat: { fontSize: 13, fontWeight: '600', marginTop: 2, textTransform: 'capitalize' },
    actions: { marginTop: 28 },
    deleteBtn: {
        paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, alignItems: 'center',
    },
    deleteBtnText: { fontSize: 16, fontWeight: '700' },
});

export default OutfitDetailScreen;
