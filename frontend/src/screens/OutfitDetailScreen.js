// Pantalla de detalle de outfit — con edición inline
import React, { useState } from 'react';
import {
    View, Text, Image, TouchableOpacity, TextInput,
    StyleSheet, Alert, StatusBar, ScrollView, ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { removeOutfit, editOutfit } from '../store/outfitsSlice';
import { fetchGarments } from '../store/wardrobeSlice';
import { useTheme } from '../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { IMAGE_BASE_URL } from '../services/api';
import ScreenHeader from '../components/ScreenHeader';
import * as ImagePicker from 'expo-image-picker';

const OCCASIONS = ['casual', 'trabajo', 'formal', 'deporte', 'fiesta', 'otro'];

const OutfitDetailScreen = ({ navigation, route }) => {
    const { outfit } = route.params;
    const initialGarments = outfit.garments || [];
    const dispatch = useDispatch();
    const { theme } = useTheme();
    const c = theme.colors;

    // Modo edición
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Campos editables
    const [name, setName] = useState(outfit.name || '');
    const [occasion, setOccasion] = useState(outfit.occasion || '');
    const [notes, setNotes] = useState(outfit.notes || '');
    const [selectedIds, setSelectedIds] = useState(initialGarments.map((g) => g.id));
    const [coverImageUri, setCoverImageUri] = useState(null);
    const [existingCover, setExistingCover] = useState(outfit.cover_image || null);

    // Prendas disponibles
    const { garments: allGarments } = useSelector((s) => s.wardrobe);

    const startEditing = () => {
        dispatch(fetchGarments());
        setEditing(true);
    };

    const cancelEditing = () => {
        setName(outfit.name || '');
        setOccasion(outfit.occasion || '');
        setNotes(outfit.notes || '');
        setSelectedIds(initialGarments.map((g) => g.id));
        setCoverImageUri(null);
        setExistingCover(outfit.cover_image || null);
        setEditing(false);
    };

    const toggleGarment = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const pickCoverImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
        });
        if (!result.canceled && result.assets?.[0]) {
            setCoverImageUri(result.assets[0].uri);
        }
    };

    const removeCover = () => {
        setCoverImageUri(null);
        setExistingCover(null);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'El nombre es obligatorio');
            return;
        }
        if (selectedIds.length === 0) {
            Alert.alert('Error', 'Selecciona al menos una prenda');
            return;
        }

        setSaving(true);
        try {
            const outfitData = {
                name: name.trim(),
                occasion: occasion || undefined,
                notes: notes.trim() || undefined,
                garmentIds: selectedIds,
            };
            if (coverImageUri) {
                outfitData.coverImageUri = coverImageUri;
            }

            const result = await dispatch(editOutfit({ id: outfit.id, outfitData })).unwrap();
            navigation.setParams({ outfit: result });
            setExistingCover(result.cover_image || null);
            setCoverImageUri(null);
            setEditing(false);
        } catch (err) {
            Alert.alert('Error', err || 'No se pudo guardar');
        } finally {
            setSaving(false);
        }
    };

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

    const displayCoverUri = coverImageUri || (existingCover ? `${IMAGE_BASE_URL}${existingCover}` : null);

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <StatusBar barStyle={c.statusBar} />

            <ScreenHeader
                title={editing ? 'Editar Outfit' : outfit.name}
                onBack={() => {
                    if (editing) { cancelEditing(); } else { navigation.goBack(); }
                }}
                rightAction={
                    !editing ? (
                        <TouchableOpacity
                            style={[styles.editBtn, { backgroundColor: c.primary }]}
                            onPress={startEditing}
                        >
                            <Ionicons name="create-outline" size={18} color="#FFF" />
                        </TouchableOpacity>
                    ) : null
                }
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* ── COVER IMAGE ── */}
                {editing ? (
                    <View style={styles.coverSection}>
                        {displayCoverUri ? (
                            <View style={styles.coverPreviewWrap}>
                                <Image source={{ uri: displayCoverUri }} style={styles.coverPreview} resizeMode="cover" />
                                <TouchableOpacity style={styles.coverRemoveBtn} onPress={removeCover}>
                                    <Ionicons name="close-circle" size={28} color="#FFF" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.coverChangeBtn} onPress={pickCoverImage}>
                                    <Ionicons name="camera" size={20} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={[styles.coverPickerBtn, { backgroundColor: c.surfaceVariant, borderColor: c.border }]}
                                onPress={pickCoverImage}
                            >
                                <Ionicons name="camera-outline" size={28} color={c.primary} />
                                <Text style={[styles.coverPickerText, { color: c.primary }]}>Foto de portada</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : displayCoverUri ? (
                    <Image source={{ uri: displayCoverUri }} style={styles.coverDisplay} resizeMode="cover" />
                ) : null}

                {/* ── NOMBRE ── */}
                {editing ? (
                    <View style={styles.fieldRow}>
                        <TextInput
                            style={[styles.nameInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.inputText }]}
                            placeholder="Nombre del outfit *"
                            placeholderTextColor={c.placeholder}
                            value={name}
                            onChangeText={setName}
                        />
                    </View>
                ) : null}

                {/* ── OCASIÓN ── */}
                {editing ? (
                    <View style={styles.occasionRow}>
                        {OCCASIONS.map((occ) => (
                            <TouchableOpacity
                                key={occ}
                                style={[
                                    styles.occasionChip,
                                    { backgroundColor: occasion === occ ? c.primary : c.surface, borderColor: occasion === occ ? c.primary : c.border },
                                ]}
                                onPress={() => setOccasion(occasion === occ ? '' : occ)}
                            >
                                <Text style={[styles.occasionText, { color: occasion === occ ? '#FFF' : c.textSecondary }]}>
                                    {occ.charAt(0).toUpperCase() + occ.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    <View style={[styles.infoCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: c.textSecondary }]}>Ocasión</Text>
                            <Text style={[styles.infoValue, { color: c.text }]}>{outfit.occasion || '—'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: c.textSecondary }]}>Temporada</Text>
                            <Text style={[styles.infoValue, { color: c.text }]}>{outfit.season || '—'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: c.textSecondary }]}>Veces usado</Text>
                            <Text style={[styles.infoValue, { color: c.text }]}>{outfit.times_worn || 0}</Text>
                        </View>
                        {outfit.notes ? (
                            <View style={[styles.notesBox, { backgroundColor: c.surfaceVariant }]}>
                                <Text style={[styles.notesText, { color: c.textSecondary }]}>{outfit.notes}</Text>
                            </View>
                        ) : null}
                    </View>
                )}

                {/* ── NOTAS (solo en edición) ── */}
                {editing ? (
                    <View style={styles.fieldRow}>
                        <TextInput
                            style={[styles.nameInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.inputText, minHeight: 60 }]}
                            placeholder="Notas (opcional)"
                            placeholderTextColor={c.placeholder}
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                        />
                    </View>
                ) : null}

                {/* ── PRENDAS ── */}
                <Text style={[styles.sectionTitle, { color: c.text }]}>
                    Prendas ({editing ? selectedIds.length : initialGarments.length})
                </Text>

                {editing ? (
                    <View style={styles.garmentGrid}>
                        {allGarments.map((g) => {
                            const isSelected = selectedIds.includes(g.id);
                            return (
                                <TouchableOpacity
                                    key={g.id}
                                    style={[
                                        styles.garmentGridCard,
                                        { backgroundColor: c.surface, borderColor: isSelected ? c.primary : c.border },
                                        isSelected && { borderWidth: 2.5 },
                                    ]}
                                    onPress={() => toggleGarment(g.id)}
                                    activeOpacity={0.8}
                                >
                                    {g.image_url ? (
                                        <Image source={{ uri: `${IMAGE_BASE_URL}${g.image_url}` }} style={styles.garmentGridImg} />
                                    ) : (
                                        <View style={[styles.garmentGridPlaceholder, { backgroundColor: c.surfaceVariant }]}>
                                            <Ionicons name="shirt-outline" size={22} color={c.textMuted} />
                                        </View>
                                    )}
                                    <Text style={[styles.garmentGridName, { color: c.text }]} numberOfLines={1}>{g.name}</Text>
                                    {isSelected && (
                                        <View style={[styles.checkBadge, { backgroundColor: c.primary }]}>
                                            <Text style={styles.checkText}>✓</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ) : (
                    <View style={styles.garmentsList}>
                        {initialGarments.map((g) => (
                            <View
                                key={g.id}
                                style={[styles.garmentCard, { backgroundColor: c.surface, borderColor: c.border }]}
                            >
                                {g.image_url ? (
                                    <Image source={{ uri: `${IMAGE_BASE_URL}${g.image_url}` }} style={styles.garmentImg} />
                                ) : (
                                    <View style={[styles.garmentPlaceholder, { backgroundColor: c.surfaceVariant }]}>
                                        <Ionicons name="shirt-outline" size={28} color={c.textMuted} />
                                    </View>
                                )}
                                <View style={styles.garmentInfo}>
                                    <Text style={[styles.garmentName, { color: c.text }]}>{g.name}</Text>
                                    <Text style={[styles.garmentCat, { color: c.primary }]}>{g.category}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* ── ACCIONES ── */}
                <View style={styles.actions}>
                    {editing ? (
                        <View style={{ gap: 10 }}>
                            <TouchableOpacity
                                style={[styles.saveBtn, { backgroundColor: selectedIds.length > 0 ? c.primary : c.border }]}
                                onPress={handleSave}
                                disabled={saving || selectedIds.length === 0}
                                activeOpacity={0.8}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.saveBtnText}>Guardar cambios</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.cancelBtn, { borderColor: c.border }]}
                                onPress={cancelEditing}
                            >
                                <Text style={[styles.cancelBtnText, { color: c.textSecondary }]}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={[styles.deleteBtn, { borderColor: c.error }]}
                            onPress={handleDelete}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Ionicons name="trash-outline" size={16} color={c.error} />
                                <Text style={[styles.deleteBtnText, { color: c.error }]}>Eliminar Outfit</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    editBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 16, paddingBottom: 40 },

    // Cover image
    coverSection: { marginBottom: 12 },
    coverPreviewWrap: { position: 'relative', borderRadius: 14, overflow: 'hidden' },
    coverPreview: { width: '100%', height: 200, borderRadius: 14 },
    coverDisplay: { width: '100%', height: 200, borderRadius: 14, marginBottom: 16 },
    coverRemoveBtn: {
        position: 'absolute', top: 8, right: 8,
        backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 14,
    },
    coverChangeBtn: {
        position: 'absolute', top: 8, left: 8,
        backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 14, padding: 4,
    },
    coverPickerBtn: {
        alignItems: 'center', justifyContent: 'center',
        height: 100, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', gap: 4,
    },
    coverPickerText: { fontSize: 14, fontWeight: '700' },

    // Campos editables
    fieldRow: { marginBottom: 12 },
    nameInput: {
        borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    },
    occasionRow: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16,
    },
    occasionChip: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1,
    },
    occasionText: { fontSize: 13, fontWeight: '600' },

    // Info (modo lectura)
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

    // Garment grid (modo edición)
    garmentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    garmentGridCard: {
        width: '31%', borderRadius: 12, borderWidth: 1, overflow: 'hidden',
    },
    garmentGridImg: { width: '100%', height: 80 },
    garmentGridPlaceholder: { width: '100%', height: 80, justifyContent: 'center', alignItems: 'center' },
    garmentGridName: { fontSize: 11, fontWeight: '600', padding: 5 },
    checkBadge: {
        position: 'absolute', top: 4, right: 4, width: 22, height: 22,
        borderRadius: 11, justifyContent: 'center', alignItems: 'center',
    },
    checkText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

    // Garment list (modo lectura)
    garmentsList: { gap: 10 },
    garmentCard: {
        flexDirection: 'row', borderRadius: 12, borderWidth: 1, overflow: 'hidden', alignItems: 'center',
    },
    garmentImg: { width: 70, height: 70 },
    garmentPlaceholder: { width: 70, height: 70, justifyContent: 'center', alignItems: 'center' },
    garmentInfo: { flex: 1, paddingHorizontal: 12 },
    garmentName: { fontSize: 16, fontWeight: '700' },
    garmentCat: { fontSize: 13, fontWeight: '600', marginTop: 2, textTransform: 'capitalize' },

    // Botones
    actions: { marginTop: 28 },
    saveBtn: {
        paddingVertical: 16, borderRadius: 12, alignItems: 'center',
        shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    saveBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
    cancelBtn: {
        paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, alignItems: 'center',
    },
    cancelBtnText: { fontSize: 16, fontWeight: '600' },
    deleteBtn: {
        paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, alignItems: 'center',
    },
    deleteBtnText: { fontSize: 16, fontWeight: '700' },
});

export default OutfitDetailScreen;
