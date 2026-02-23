// Pantalla de detalle de prenda
import React from 'react';
import {
    View, Text, Image, TouchableOpacity,
    StyleSheet, ScrollView, Alert, StatusBar,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { removeGarment } from '../store/wardrobeSlice';
import { useTheme } from '../hooks/useTheme';
import { IMAGE_BASE_URL } from '../services/api';

const GarmentDetailScreen = ({ navigation, route }) => {
    const { garment } = route.params;
    const dispatch = useDispatch();
    const { theme } = useTheme();
    const c = theme.colors;

    const handleDelete = () => {
        Alert.alert(
            'Eliminar prenda',
            `¿Estás seguro de que quieres eliminar "${garment.name}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        await dispatch(removeGarment(garment.id));
                        navigation.goBack();
                    },
                },
            ]
        );
    };

    const InfoRow = ({ label, value }) => {
        if (!value) return null;
        return (
            <View style={[styles.infoRow, { borderBottomColor: c.border }]}>
                <Text style={[styles.infoLabel, { color: c.textSecondary }]}>{label}</Text>
                <Text style={[styles.infoValue, { color: c.text }]}>{value}</Text>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <StatusBar barStyle={c.statusBar} />

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Imagen */}
                {garment.image_url ? (
                    <Image
                        source={{ uri: `${IMAGE_BASE_URL}${garment.image_url}` }}
                        style={styles.heroImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.heroPlaceholder, { backgroundColor: c.surfaceVariant }]}>
                        <Text style={{ fontSize: 80 }}>👕</Text>
                    </View>
                )}

                {/* Back button overlay */}
                <TouchableOpacity
                    style={[styles.backOverlay, { backgroundColor: c.overlay }]}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>

                {/* Detalles */}
                <View style={[styles.detailsCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.name, { color: c.text }]}>{garment.name}</Text>
                        {garment.is_favorite && <Text style={{ fontSize: 24 }}>❤️</Text>}
                    </View>
                    <Text style={[styles.category, { color: c.primary }]}>
                        {garment.category?.charAt(0).toUpperCase() + garment.category?.slice(1)}
                    </Text>

                    <View style={styles.infoSection}>
                        <InfoRow label="Color" value={garment.color} />
                        <InfoRow label="Marca" value={garment.brand} />
                        <InfoRow label="Temporada" value={garment.season} />
                        <InfoRow label="Veces usado" value={garment.times_worn?.toString()} />
                        <InfoRow label="Notas" value={garment.notes} />
                    </View>

                    {/* Acciones */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.editBtn, { backgroundColor: c.primary }]}
                            onPress={() => navigation.navigate('AddGarment', { garment })}
                        >
                            <Text style={styles.editBtnText}>✏️ Editar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.deleteBtn, { borderColor: c.error }]}
                            onPress={handleDelete}
                        >
                            <Text style={[styles.deleteBtnText, { color: c.error }]}>🗑️ Eliminar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    heroImage: { width: '100%', height: 380 },
    heroPlaceholder: {
        width: '100%', height: 380, justifyContent: 'center', alignItems: 'center',
    },
    backOverlay: {
        position: 'absolute', top: 48, left: 16,
        width: 40, height: 40, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center',
    },
    backText: { color: '#FFF', fontSize: 22, fontWeight: '700' },
    detailsCard: {
        marginTop: -24, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, borderWidth: 1, minHeight: 300,
    },
    titleRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    name: { fontSize: 26, fontWeight: '800', flex: 1, marginRight: 8 },
    category: { fontSize: 16, fontWeight: '600', marginTop: 4, textTransform: 'capitalize' },
    infoSection: { marginTop: 24 },
    infoRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        paddingVertical: 12, borderBottomWidth: 1,
    },
    infoLabel: { fontSize: 15, fontWeight: '500' },
    infoValue: { fontSize: 15, fontWeight: '600', textTransform: 'capitalize' },
    actions: { flexDirection: 'row', gap: 12, marginTop: 28 },
    editBtn: {
        flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    },
    editBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    deleteBtn: {
        flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
        borderWidth: 1.5,
    },
    deleteBtnText: { fontSize: 16, fontWeight: '700' },
});

export default GarmentDetailScreen;
