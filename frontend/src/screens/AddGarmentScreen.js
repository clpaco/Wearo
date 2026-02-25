// Pantalla para añadir/editar prenda con captura de foto
import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, Image,
    StyleSheet, ScrollView, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { addGarment, editGarment } from '../store/wardrobeSlice';
import { detectColor as detectColorSvc } from '../services/garments.service';
import { useTheme } from '../hooks/useTheme';
import ScreenHeader from '../components/ScreenHeader';

const CATEGORIES = [
    'camisetas', 'pantalones', 'zapatos', 'chaquetas', 'sudaderas',
    'accesorios', 'vestidos', 'otro',
];

const SEASONS = ['primavera', 'verano', 'otoño', 'invierno', 'todo el año'];

const COLORS = [
    { name: 'negro', hex: '#1A1A2E' },
    { name: 'blanco', hex: '#F5F5F7' },
    { name: 'gris', hex: '#6B7280' },
    { name: 'gris claro', hex: '#C0C0C0' },
    { name: 'rojo', hex: '#DC3545' },
    { name: 'azul', hex: '#007BFF' },
    { name: 'azul marino', hex: '#000080' },
    { name: 'azul claro', hex: '#87CEEB' },
    { name: 'verde', hex: '#28A745' },
    { name: 'verde oliva', hex: '#808000' },
    { name: 'amarillo', hex: '#FFC107' },
    { name: 'rosa', hex: '#E83E8C' },
    { name: 'morado', hex: '#6F42C1' },
    { name: 'marron', hex: '#795548' },
    { name: 'beige', hex: '#F5F5DC' },
    { name: 'naranja', hex: '#FD7E14' },
    { name: 'coral', hex: '#FF7F50' },
    { name: 'turquesa', hex: '#00CED1' },
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
    const [isDetectingColor, setIsDetectingColor] = useState(false);
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [customCategory, setCustomCategory] = useState('');

    const dispatch = useDispatch();
    const { theme } = useTheme();
    const c = theme.colors;

    // Auto-detectar color de la imagen
    const autoDetectColor = async (uri) => {
        setIsDetectingColor(true);
        try {
            const data = await detectColorSvc(uri);
            if (data.suggestedColor) {
                setColor(data.suggestedColor);
            }
        } catch (err) {
            // Silenciar error - el usuario puede elegir manualmente
            console.log('Auto-detect color failed:', err.message);
        } finally {
            setIsDetectingColor(false);
        }
    };

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
            const uri = result.assets[0].uri;
            setImageUri(uri);
            autoDetectColor(uri);
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
            const uri = result.assets[0].uri;
            setImageUri(uri);
            autoDetectColor(uri);
        }
    };

    // Confirmar categoría personalizada
    const handleCustomCategorySubmit = () => {
        const trimmed = customCategory.trim().toLowerCase();
        if (trimmed) {
            setCategory(trimmed);
            setShowCustomInput(false);
            setCustomCategory('');
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

    // Determinar si la categoría actual es personalizada (no está en CATEGORIES)
    const isCustomCategory = category && !CATEGORIES.includes(category);

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <StatusBar barStyle={c.statusBar} />

            {/* Header */}
            <ScreenHeader
                title={isEditing ? 'Editar Prenda' : 'Nueva Prenda'}
                onBack={() => navigation.goBack()}
            />

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
                            <Ionicons name="camera-outline" size={48} color={c.textMuted} />
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
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="camera" size={16} color="#FFF" /><Text style={styles.imgBtnText}>Cámara</Text></View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.imgBtn, { backgroundColor: c.accent }]}
                            onPress={pickImage}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="image-outline" size={16} color="#FFF" /><Text style={styles.imgBtnText}>Galería</Text></View>
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
                                onPress={() => {
                                    setCategory(cat);
                                    setShowCustomInput(false);
                                    setCustomCategory('');
                                }}
                            >
                                <Text style={[
                                    styles.chipText,
                                    { color: category === cat ? '#FFF' : c.textSecondary },
                                ]}>
                                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}

                        {/* Chip de categoría personalizada activa */}
                        {isCustomCategory && !showCustomInput && (
                            <TouchableOpacity
                                style={[
                                    styles.chip,
                                    { backgroundColor: c.primary, borderColor: c.primary },
                                ]}
                                onPress={() => {}}
                            >
                                <Text style={[styles.chipText, { color: '#FFF' }]}>
                                    {category.charAt(0).toUpperCase() + category.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Botón + Crear */}
                        {!showCustomInput && (
                            <TouchableOpacity
                                style={[
                                    styles.chip,
                                    { backgroundColor: c.surface, borderColor: c.border, borderStyle: 'dashed' },
                                ]}
                                onPress={() => setShowCustomInput(true)}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Ionicons name="add" size={16} color={c.primary} />
                                    <Text style={[styles.chipText, { color: c.primary }]}>Crear</Text>
                                </View>
                            </TouchableOpacity>
                        )}

                        {/* Input inline para categoría personalizada */}
                        {showCustomInput && (
                            <View style={[styles.customCategoryRow, { backgroundColor: c.inputBg, borderColor: c.primary }]}>
                                <TextInput
                                    style={[styles.customCategoryInput, { color: c.inputText }]}
                                    placeholder="Nueva categoría..."
                                    placeholderTextColor={c.placeholder}
                                    value={customCategory}
                                    onChangeText={setCustomCategory}
                                    autoFocus
                                    returnKeyType="done"
                                    onSubmitEditing={handleCustomCategorySubmit}
                                />
                                <TouchableOpacity onPress={handleCustomCategorySubmit} style={styles.customCategoryConfirm}>
                                    <Ionicons name="checkmark-circle" size={24} color={c.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => { setShowCustomInput(false); setCustomCategory(''); }}
                                    style={styles.customCategoryCancel}
                                >
                                    <Ionicons name="close-circle" size={24} color={c.textMuted} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>

                {/* Color */}
                <View style={styles.field}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[styles.label, { color: c.textSecondary, marginBottom: 0 }]}>Color</Text>
                        {isDetectingColor && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <ActivityIndicator size="small" color={c.primary} />
                                <Text style={{ fontSize: 12, color: c.textMuted }}>Detectando...</Text>
                            </View>
                        )}
                    </View>

                    {/* Paleta circular */}
                    <View style={styles.circularPalette}>
                        {/* Centro: color seleccionado */}
                        <View style={[
                            styles.paletteCenter,
                            {
                                backgroundColor: color
                                    ? (COLORS.find((cc) => cc.name === color)?.hex || c.surfaceVariant)
                                    : c.surfaceVariant,
                                borderColor: c.border,
                            },
                        ]}>
                            {color ? (
                                <Text style={[styles.paletteCenterText, {
                                    color: ['negro', 'azul marino', 'morado', 'marron', 'verde oliva'].includes(color) ? '#FFF' : '#222',
                                }]}>
                                    {color}
                                </Text>
                            ) : (
                                <Ionicons name="color-palette-outline" size={20} color={c.textMuted} />
                            )}
                        </View>

                        {/* Circulos de color en anillo */}
                        {COLORS.map((c2, i) => {
                            const angle = (i / COLORS.length) * 2 * Math.PI - Math.PI / 2;
                            const radius = 90;
                            const x = Math.cos(angle) * radius;
                            const y = Math.sin(angle) * radius;
                            const isSelected = color === c2.name;

                            return (
                                <TouchableOpacity
                                    key={c2.name}
                                    style={[
                                        styles.paletteCircle,
                                        {
                                            backgroundColor: c2.hex,
                                            borderColor: isSelected ? c.primary : '#D1D5DB',
                                            transform: [{ translateX: x }, { translateY: y }],
                                        },
                                        isSelected && styles.colorSelected,
                                    ]}
                                    onPress={() => setColor(color === c2.name ? '' : c2.name)}
                                />
                            );
                        })}
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
    customCategoryRow: {
        flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
        borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, gap: 6,
        width: '100%',
    },
    customCategoryInput: {
        flex: 1, fontSize: 14, fontWeight: '600', paddingVertical: 4,
    },
    customCategoryConfirm: { padding: 2 },
    customCategoryCancel: { padding: 2 },
    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    circularPalette: {
        width: 220, height: 220, alignSelf: 'center', marginVertical: 12,
        justifyContent: 'center', alignItems: 'center',
    },
    paletteCenter: {
        width: 60, height: 60, borderRadius: 30, borderWidth: 2,
        justifyContent: 'center', alignItems: 'center', zIndex: 10,
    },
    paletteCenterText: { fontSize: 10, fontWeight: '700', textAlign: 'center', textTransform: 'capitalize' },
    paletteCircle: {
        position: 'absolute', width: 30, height: 30, borderRadius: 15, borderWidth: 3,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2, shadowRadius: 2, elevation: 2,
    },
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
