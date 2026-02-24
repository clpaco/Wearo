// Pantalla para crear un outfit seleccionando prendas
import React, { useState, useEffect } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, Image, TextInput,
    StyleSheet, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchGarments } from '../store/wardrobeSlice';
import { addOutfit } from '../store/outfitsSlice';
import { useTheme } from '../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { IMAGE_BASE_URL } from '../services/api';
import ScreenHeader from '../components/ScreenHeader';

const OCCASIONS = ['casual', 'trabajo', 'formal', 'deporte', 'fiesta', 'otro'];

const CreateOutfitScreen = ({ navigation }) => {
    const [name, setName] = useState('');
    const [occasion, setOccasion] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const dispatch = useDispatch();
    const { garments } = useSelector((state) => state.wardrobe);
    const { theme } = useTheme();
    const c = theme.colors;

    useEffect(() => {
        dispatch(fetchGarments());
    }, [dispatch]);

    const toggleGarment = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const handleCreate = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Dale un nombre al outfit');
            return;
        }
        if (selectedIds.length === 0) {
            Alert.alert('Error', 'Selecciona al menos una prenda');
            return;
        }

        setIsSubmitting(true);
        try {
            await dispatch(addOutfit({
                name: name.trim(), occasion, notes: notes.trim(), garmentIds: selectedIds,
            })).unwrap();
            navigation.goBack();
        } catch (err) {
            Alert.alert('Error', err || 'No se pudo crear el outfit');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderGarment = ({ item }) => {
        const isSelected = selectedIds.includes(item.id);
        return (
            <TouchableOpacity
                style={[
                    styles.garmentCard,
                    { backgroundColor: c.surface, borderColor: isSelected ? c.primary : c.border },
                    isSelected && { borderWidth: 2.5 },
                ]}
                onPress={() => toggleGarment(item.id)}
                activeOpacity={0.8}
            >
                {item.image_url ? (
                    <Image source={{ uri: `${IMAGE_BASE_URL}${item.image_url}` }} style={styles.garmentImg} />
                ) : (
                    <View style={[styles.garmentPlaceholder, { backgroundColor: c.surfaceVariant }]}>
                        <Ionicons name="shirt-outline" size={24} color={c.textMuted} />
                    </View>
                )}
                <Text style={[styles.garmentName, { color: c.text }]} numberOfLines={1}>
                    {item.name}
                </Text>
                {isSelected && (
                    <View style={[styles.checkBadge, { backgroundColor: c.primary }]}>
                        <Text style={styles.checkText}>✓</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <StatusBar barStyle={c.statusBar} />

            {/* Header */}
            <ScreenHeader title="Crear Outfit" onBack={() => navigation.goBack()} />

            {/* Nombre */}
            <View style={styles.fieldRow}>
                <TextInput
                    style={[styles.nameInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.inputText }]}
                    placeholder="Nombre del outfit *"
                    placeholderTextColor={c.placeholder}
                    value={name}
                    onChangeText={setName}
                />
            </View>

            {/* Ocasión */}
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

            {/* Selección de prendas */}
            <Text style={[styles.sectionTitle, { color: c.text }]}>
                Selecciona prendas ({selectedIds.length})
            </Text>

            <FlatList
                data={garments}
                keyExtractor={(item) => item.id.toString()}
                numColumns={3}
                contentContainerStyle={styles.gridContent}
                columnWrapperStyle={styles.gridRow}
                renderItem={renderGarment}
                ListEmptyComponent={
                    <View style={styles.centered}>
                        <Text style={{ color: c.textMuted }}>No tienes prendas. Añade primero al armario.</Text>
                    </View>
                }
            />

            {/* Botón crear */}
            <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: selectedIds.length > 0 ? c.primary : c.border }]}
                onPress={handleCreate}
                disabled={isSubmitting || selectedIds.length === 0}
                activeOpacity={0.8}
            >
                {isSubmitting ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <Text style={styles.createBtnText}>
                        Crear Outfit ({selectedIds.length} prenda{selectedIds.length !== 1 ? 's' : ''})
                    </Text>
                )}
            </TouchableOpacity>
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
    headerTitle: { fontSize: 20, fontWeight: '700' },
    fieldRow: { paddingHorizontal: 16, paddingTop: 16 },
    nameInput: {
        borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    },
    occasionRow: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 12,
    },
    occasionChip: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1,
    },
    occasionText: { fontSize: 13, fontWeight: '600' },
    sectionTitle: { fontSize: 16, fontWeight: '700', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    gridContent: { paddingHorizontal: 12 },
    gridRow: { justifyContent: 'flex-start', gap: 8, marginBottom: 8 },
    garmentCard: {
        width: '31%', borderRadius: 12, borderWidth: 1, overflow: 'hidden',
    },
    garmentImg: { width: '100%', height: 90 },
    garmentPlaceholder: {
        width: '100%', height: 90, justifyContent: 'center', alignItems: 'center',
    },
    garmentName: { fontSize: 12, fontWeight: '600', padding: 6 },
    checkBadge: {
        position: 'absolute', top: 4, right: 4, width: 24, height: 24,
        borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    },
    checkText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
    centered: { padding: 32, alignItems: 'center' },
    createBtn: {
        marginHorizontal: 16, marginBottom: 32, paddingVertical: 16, borderRadius: 12, alignItems: 'center',
        shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    createBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});

export default CreateOutfitScreen;
