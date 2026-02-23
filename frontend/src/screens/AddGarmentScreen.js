// Pantalla para añadir/editar prenda con captura de foto
import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, Image,
    StyleSheet, ScrollView, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch } from 'react-redux';
import { addGarment, editGarment } from '../store/wardrobeSlice';
import { useTheme } from '../hooks/useTheme';

const CATEGORIES = [
    'camisetas', 'pantalones', 'zapatos', 'chaquetas',
    'accesorios', 'vestidos', 'otro',
];

const SEASONS = ['primavera', 'verano', 'otoño', 'invierno', 'todo el año'];

const COLORS = [
    { name: 'negro', hex: '#1A1A2E' },
    { name: 'blanco', hex: '#F5F5F7' },
    { name: 'gris', hex: '#6B7280' },
    { name: 'rojo', hex: '#E17055' },
    { name: 'azul', hex: '#74B9FF' },
    { name: 'verde', hex: '#00B894' },
    { name: 'amarillo', hex: '#FDCB6E' },
    { name: 'rosa', hex: '#FD79A8' },
    { name: 'morado', hex: '#6C5CE7' },
    { name: 'marrón', hex: '#B8860B' },
    { name: 'beige', hex: '#D6C4A8' },
    { name: 'naranja', hex: '#E67E22' },
];

const AddGarmentScreen = ({ navigation, route }) => {
    const existing = route.params?.garment;
    const isEditing = !!existing;

    const [name, setName] = useState(existing?.name || '');
    const [category, setCategory] = useState(existing?.category || '');
    const [color, setColor] = useState(existing?.color || '');
    const [brand, setBrand] = useState(existing?.brand || '');
    const [season, setSeason] = useState(existing?.season || '');
    const [notes, setNotes] = useState(existing?.notes || '');
    const [imageUri, setImageUri] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const dispatch = useDispatch();
    const { theme } = useTheme();
    const c = theme.colors;

    // Elegir imagen de la galería
    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería de fotos');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [3, 4],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    // Tomar foto con la cámara
    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permiso necesario', 'Necesitamos acceso a tu cámara');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [3, 4],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    // Guardar prenda
    const handleSubmit = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'El nombre es obligatorio');
            return;
        }
        if (!category) {
            Alert.alert('Error', 'Selecciona una categoría');
            return;
        }

        setIsSubmitting(true);
        try {
            const garmentData = {
                name: name.trim(), category, color, brand: brand.trim(), season, notes: notes.trim(),
            };

            if (isEditing) {
                await dispatch(editGarment({ id: existing.id, garmentData, imageUri })).unwrap();
            } else {
                await dispatch(addGarment({ garmentData, imageUri })).unwrap();
            }

            navigation.goBack();
        } catch (err) {
            Alert.alert('Error', err || 'No se pudo guardar la prenda');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <StatusBar barStyle={c.statusBar} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={[styles.backBtn, { color: c.primary }]}>← Volver</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: c.text }]}>
                    {isEditing ? 'Editar Prenda' : 'Nueva Prenda'}
                </Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Imagen */}
                <View style={styles.imageSection}>
                    {imageUri || existing?.image_url ? (
                        <Image
                            source={{ uri: imageUri || `http://10.0.2.2:3000${existing.image_url}` }}
                            style={styles.previewImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[styles.imagePlaceholder, { backgroundColor: c.surfaceVariant, borderColor: c.border }]}>
                            <Text style={{ fontSize: 48 }}>📷</Text>
                            <Text style={[styles.placeholderText, { color: c.textMuted }]}>
                                Añadir foto
                            </Text>
                        </View>
                    )}
                    <View style={styles.imageButtons}>
                        <TouchableOpacity
                            style={[styles.imgBtn, { backgroundColor: c.primary }]}
                            onPress={takePhoto}
                        >
                            <Text style={styles.imgBtnText}>📸 Cámara</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.imgBtn, { backgroundColor: c.accent }]}
                            onPress={pickImage}
                        >
                            <Text style={styles.imgBtnText}>🖼️ Galería</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Nombre */}
                <View style={styles.field}>
                    <Text style={[styles.label, { color: c.textSecondary }]}>Nombre *</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.inputText }]}
                        placeholder="Ej: Camiseta Blanca Nike"
                        placeholderTextColor={c.placeholder}
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                {/* Categoría */}
                <View style={styles.field}>
                    <Text style={[styles.label, { color: c.textSecondary }]}>Categoría *</Text>
                    <View style={styles.chipGrid}>
                        {CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat}
                                style={[
                                    styles.chip,
                                    {
                                        backgroundColor: category === cat ? c.primary : c.surface,
                                        borderColor: category === cat ? c.primary : c.border,
                                    },
                                ]}
                                onPress={() => setCategory(cat)}
                            >
                                <Text style={[
                                    styles.chipText,
                                    { color: category === cat ? '#FFF' : c.textSecondary },
                                ]}>
                                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Color */}
                <View style={styles.field}>
                    <Text style={[styles.label, { color: c.textSecondary }]}>Color</Text>
                    <View style={styles.colorGrid}>
                        {COLORS.map((c2) => (
                            <TouchableOpacity
                                key={c2.name}
                                style={[
                                    styles.colorCircle,
                                    { backgroundColor: c2.hex, borderColor: color === c2.name ? c.primary : 'transparent' },
                                    color === c2.name && styles.colorSelected,
                                ]}
                                onPress={() => setColor(color === c2.name ? '' : c2.name)}
                            />
                        ))}
                    </View>
                    {color ? (
                        <Text style={[styles.colorLabel, { color: c.textMuted }]}>
                            Seleccionado: {color}
                        </Text>
                    ) : null}
                </View>

                {/* Marca */}
                <View style={styles.field}>
                    <Text style={[styles.label, { color: c.textSecondary }]}>Marca</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.inputText }]}
                        placeholder="Ej: Nike, Zara..."
                        placeholderTextColor={c.placeholder}
                        value={brand}
                        onChangeText={setBrand}
                    />
                </View>

                {/* Temporada */}
                <View style={styles.field}>
                    <Text style={[styles.label, { color: c.textSecondary }]}>Temporada</Text>
                    <View style={styles.chipGrid}>
                        {SEASONS.map((s) => (
                            <TouchableOpacity
                                key={s}
                                style={[
                                    styles.chip,
                                    {
                                        backgroundColor: season === s ? c.primary : c.surface,
                                        borderColor: season === s ? c.primary : c.border,
                                    },
                                ]}
                                onPress={() => setSeason(season === s ? '' : s)}
                            >
                                <Text style={[
                                    styles.chipText,
                                    { color: season === s ? '#FFF' : c.textSecondary },
                                ]}>
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Notas */}
                <View style={styles.field}>
                    <Text style={[styles.label, { color: c.textSecondary }]}>Notas</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.inputText }]}
                        placeholder="Notas adicionales..."
                        placeholderTextColor={c.placeholder}
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        numberOfLines={3}
                    />
                </View>

                {/* Botón guardar */}
                <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: c.primary }]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.submitText}>
                            {isEditing ? 'Guardar Cambios' : 'Añadir Prenda'}
                        </Text>
                    )}
                </TouchableOpacity>
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
    headerTitle: { fontSize: 20, fontWeight: '700' },
    scrollContent: { padding: 20, paddingBottom: 40 },
    imageSection: { alignItems: 'center', marginBottom: 24 },
    previewImage: { width: 200, height: 260, borderRadius: 16 },
    imagePlaceholder: {
        width: 200, height: 260, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed',
        justifyContent: 'center', alignItems: 'center',
    },
    placeholderText: { fontSize: 14, marginTop: 8 },
    imageButtons: { flexDirection: 'row', gap: 12, marginTop: 12 },
    imgBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
    imgBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
    field: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    input: {
        borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
    },
    chipText: { fontSize: 14, fontWeight: '600' },
    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    colorCircle: {
        width: 36, height: 36, borderRadius: 18, borderWidth: 3,
    },
    colorSelected: {
        shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4, shadowRadius: 4, elevation: 3,
    },
    colorLabel: { fontSize: 13, marginTop: 6, textTransform: 'capitalize' },
    submitBtn: {
        borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8,
        shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    submitText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
});

export default AddGarmentScreen;
