// Pantalla de Onboarding — cuestionario inicial tras registro
import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, StatusBar, ScrollView,
    TextInput, KeyboardAvoidingView, Platform, Alert, Image, ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../hooks/useTheme';
import { updateMyProfile, uploadAvatar } from '../store/profileSlice';

const GENDERS = [
    { key: 'hombre', label: 'Hombre', icon: 'man-outline' },
    { key: 'mujer', label: 'Mujer', icon: 'woman-outline' },
    { key: 'otro', label: 'Otro', icon: 'person-outline' },
];

const STYLES = [
    { key: 'casual', label: 'Casual', icon: 'shirt-outline' },
    { key: 'formal', label: 'Formal', icon: 'briefcase-outline' },
    { key: 'deportivo', label: 'Deportivo', icon: 'fitness-outline' },
    { key: 'streetwear', label: 'Streetwear', icon: 'flash-outline' },
    { key: 'elegante', label: 'Elegante', icon: 'diamond-outline' },
    { key: 'bohemio', label: 'Bohemio', icon: 'leaf-outline' },
    { key: 'minimalista', label: 'Minimalista', icon: 'remove-outline' },
    { key: 'vintage', label: 'Vintage', icon: 'time-outline' },
];

const OnboardingScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { theme } = useTheme();
    const c = theme.colors;
    const user = useSelector((s) => s.auth.user);
    const isAdmin = user?.role === 'admin';

    // Regular user state
    const [step, setStep] = useState(0);
    const [username, setUsername] = useState('');
    const [gender, setGender] = useState(null);
    const [selectedStyles, setSelectedStyles] = useState([]);

    // Admin state
    const [adminFullName, setAdminFullName] = useState(user?.fullName || user?.full_name || '');
    const [adminTag, setAdminTag] = useState('');
    const [avatarUri, setAvatarUri] = useState(null);
    const [saving, setSaving] = useState(false);

    const toggleStyle = (key) => {
        setSelectedStyles((prev) =>
            prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
        );
    };

    const handleFinish = async () => {
        if (!username.trim()) {
            Alert.alert('', 'Elige un nombre de usuario');
            setStep(0);
            return;
        }
        if (!gender) {
            Alert.alert('', 'Selecciona tu genero');
            setStep(1);
            return;
        }
        try {
            await dispatch(updateMyProfile({
                username: username.trim().toLowerCase().replace(/[^a-z0-9._]/g, ''),
                gender,
                stylePreferences: selectedStyles,
                onboardingDone: true,
            })).unwrap();
            navigation.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
        } catch (err) {
            Alert.alert('Error', typeof err === 'string' ? err : 'No se pudo guardar');
        }
    };

    const handleSkip = async () => {
        try {
            await dispatch(updateMyProfile({ onboardingDone: true })).unwrap();
            navigation.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
        } catch {
            navigation.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
        }
    };

    // --- Admin handlers ---
    const pickAvatar = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galeria');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });
        if (!result.canceled) {
            setAvatarUri(result.assets[0].uri);
        }
    };

    const handleAdminFinish = async () => {
        if (!adminFullName.trim()) {
            Alert.alert('', 'Escribe tu nombre');
            setStep(0);
            return;
        }
        setSaving(true);
        try {
            // Upload avatar if selected
            if (avatarUri) {
                const filename = avatarUri.split('/').pop();
                const ext = (filename.split('.').pop() || 'jpg').toLowerCase();
                const mimeTypes = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
                const formData = new FormData();
                formData.append('avatar', { uri: avatarUri, name: filename, type: mimeTypes[ext] || 'image/jpeg' });
                await dispatch(uploadAvatar(formData)).unwrap();
            }
            // Update profile
            await dispatch(updateMyProfile({
                fullName: adminFullName.trim(),
                adminTag: adminTag.trim() || undefined,
                onboardingDone: true,
            })).unwrap();
            navigation.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
        } catch (err) {
            Alert.alert('Error', typeof err === 'string' ? err : 'No se pudo guardar');
        } finally {
            setSaving(false);
        }
    };

    // --- Admin onboarding (2 steps) ---
    if (isAdmin) {
        return (
            <View style={[styles.container, { backgroundColor: c.background }]}>
                <StatusBar barStyle={c.statusBar} />
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                        {/* Progress — 2 dots */}
                        <View style={styles.progressRow}>
                            {[0, 1].map((i) => (
                                <View key={i} style={[styles.progressDot, { backgroundColor: i <= step ? c.primary : c.border }]} />
                            ))}
                        </View>

                        {/* Admin Step 0: Photo + Name */}
                        {step === 0 && (
                            <View style={styles.stepContainer}>
                                <Text style={[styles.title, { color: c.text }]}>Configura tu perfil de admin</Text>
                                <Text style={[styles.subtitle, { color: c.textMuted }]}>
                                    Elige una foto y confirma tu nombre
                                </Text>

                                {/* Avatar picker */}
                                <TouchableOpacity style={[styles.avatarPicker, { borderColor: c.border }]} onPress={pickAvatar} activeOpacity={0.7}>
                                    {avatarUri ? (
                                        <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                                    ) : (
                                        <View style={[styles.avatarPlaceholder, { backgroundColor: c.primary + '15' }]}>
                                            <Ionicons name="camera-outline" size={36} color={c.primary} />
                                            <Text style={[styles.avatarPlaceholderText, { color: c.primary }]}>Foto</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                {/* Full name input */}
                                <Text style={[styles.adminLabel, { color: c.textMuted }]}>Nombre completo</Text>
                                <View style={[styles.inputWrap, { backgroundColor: c.surfaceVariant, borderColor: c.border }]}>
                                    <TextInput
                                        style={[styles.input, { color: c.text }]}
                                        placeholder="Tu nombre"
                                        placeholderTextColor={c.textMuted}
                                        value={adminFullName}
                                        onChangeText={setAdminFullName}
                                        autoCapitalize="words"
                                        maxLength={60}
                                    />
                                </View>

                                <TouchableOpacity
                                    style={[styles.nextBtn, { backgroundColor: adminFullName.trim() ? c.primary : c.border }]}
                                    onPress={() => adminFullName.trim() && setStep(1)}
                                    disabled={!adminFullName.trim()}
                                >
                                    <Text style={styles.nextBtnText}>Siguiente</Text>
                                    <Ionicons name="arrow-forward" size={18} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Admin Step 1: Admin tag */}
                        {step === 1 && (
                            <View style={styles.stepContainer}>
                                <View style={[styles.iconCircle, { backgroundColor: c.primary + '15' }]}>
                                    <Ionicons name="shield-checkmark-outline" size={40} color={c.primary} />
                                </View>
                                <Text style={[styles.title, { color: c.text }]}>Tu apodo de admin</Text>
                                <Text style={[styles.subtitle, { color: c.textMuted }]}>
                                    Un nombre corto que te identifique como admin (opcional)
                                </Text>
                                <View style={[styles.inputWrap, { backgroundColor: c.surfaceVariant, borderColor: c.border }]}>
                                    <TextInput
                                        style={[styles.input, { color: c.text }]}
                                        placeholder="Ej: CEO, Soporte, Moda..."
                                        placeholderTextColor={c.textMuted}
                                        value={adminTag}
                                        onChangeText={setAdminTag}
                                        autoCapitalize="none"
                                        maxLength={50}
                                    />
                                </View>

                                <TouchableOpacity
                                    style={[styles.nextBtn, { backgroundColor: c.primary, opacity: saving ? 0.6 : 1 }]}
                                    onPress={handleAdminFinish}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <ActivityIndicator size="small" color="#FFF" />
                                    ) : (
                                        <>
                                            <Text style={styles.nextBtnText}>Empezar</Text>
                                            <Ionicons name="checkmark" size={18} color="#FFF" />
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Skip */}
                        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                            <Text style={[styles.skipText, { color: c.textMuted }]}>Saltar por ahora</Text>
                        </TouchableOpacity>

                        {/* Back */}
                        {step > 0 && (
                            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)}>
                                <Ionicons name="arrow-back" size={16} color={c.textMuted} />
                                <Text style={[styles.backText, { color: c.textMuted }]}>Atras</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        );
    }

    // --- Regular user onboarding (3 steps) ---
    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <StatusBar barStyle={c.statusBar} />
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    {/* Progress */}
                    <View style={styles.progressRow}>
                        {[0, 1, 2].map((i) => (
                            <View key={i} style={[styles.progressDot, { backgroundColor: i <= step ? c.primary : c.border }]} />
                        ))}
                    </View>

                    {/* Step 0: Username */}
                    {step === 0 && (
                        <View style={styles.stepContainer}>
                            <View style={[styles.iconCircle, { backgroundColor: c.primary + '15' }]}>
                                <Ionicons name="at-outline" size={40} color={c.primary} />
                            </View>
                            <Text style={[styles.title, { color: c.text }]}>Elige tu nombre de usuario</Text>
                            <Text style={[styles.subtitle, { color: c.textMuted }]}>
                                Otros usuarios podran encontrarte con este nombre
                            </Text>
                            <View style={[styles.inputWrap, { backgroundColor: c.surfaceVariant, borderColor: c.border }]}>
                                <Text style={[styles.atSign, { color: c.textMuted }]}>@</Text>
                                <TextInput
                                    style={[styles.input, { color: c.text }]}
                                    placeholder="tu_usuario"
                                    placeholderTextColor={c.textMuted}
                                    value={username}
                                    onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    maxLength={30}
                                />
                            </View>
                            <TouchableOpacity
                                style={[styles.nextBtn, { backgroundColor: username.trim() ? c.primary : c.border }]}
                                onPress={() => username.trim() && setStep(1)}
                                disabled={!username.trim()}
                            >
                                <Text style={styles.nextBtnText}>Siguiente</Text>
                                <Ionicons name="arrow-forward" size={18} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Step 1: Gender */}
                    {step === 1 && (
                        <View style={styles.stepContainer}>
                            <View style={[styles.iconCircle, { backgroundColor: c.primary + '15' }]}>
                                <Ionicons name="people-outline" size={40} color={c.primary} />
                            </View>
                            <Text style={[styles.title, { color: c.text }]}>Cual es tu genero?</Text>
                            <Text style={[styles.subtitle, { color: c.textMuted }]}>
                                Te mostraremos recomendaciones mas adecuadas para ti
                            </Text>
                            <View style={styles.optionsGrid}>
                                {GENDERS.map((g) => (
                                    <TouchableOpacity
                                        key={g.key}
                                        style={[
                                            styles.optionCard,
                                            { backgroundColor: c.surface, borderColor: gender === g.key ? c.primary : c.border },
                                            gender === g.key && { borderWidth: 2 },
                                        ]}
                                        onPress={() => setGender(g.key)}
                                    >
                                        <Ionicons name={g.icon} size={32} color={gender === g.key ? c.primary : c.textMuted} />
                                        <Text style={[styles.optionLabel, { color: gender === g.key ? c.primary : c.text }]}>
                                            {g.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TouchableOpacity
                                style={[styles.nextBtn, { backgroundColor: gender ? c.primary : c.border }]}
                                onPress={() => gender && setStep(2)}
                                disabled={!gender}
                            >
                                <Text style={styles.nextBtnText}>Siguiente</Text>
                                <Ionicons name="arrow-forward" size={18} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Step 2: Style preferences */}
                    {step === 2 && (
                        <View style={styles.stepContainer}>
                            <View style={[styles.iconCircle, { backgroundColor: c.primary + '15' }]}>
                                <Ionicons name="color-palette-outline" size={40} color={c.primary} />
                            </View>
                            <Text style={[styles.title, { color: c.text }]}>Que estilos te gustan?</Text>
                            <Text style={[styles.subtitle, { color: c.textMuted }]}>
                                Selecciona los que mas te representen (puedes elegir varios)
                            </Text>
                            <View style={styles.stylesGrid}>
                                {STYLES.map((s) => {
                                    const selected = selectedStyles.includes(s.key);
                                    return (
                                        <TouchableOpacity
                                            key={s.key}
                                            style={[
                                                styles.styleChip,
                                                { backgroundColor: selected ? c.primary : c.surface, borderColor: selected ? c.primary : c.border },
                                            ]}
                                            onPress={() => toggleStyle(s.key)}
                                        >
                                            <Ionicons name={s.icon} size={18} color={selected ? '#FFF' : c.textMuted} />
                                            <Text style={[styles.styleChipText, { color: selected ? '#FFF' : c.text }]}>
                                                {s.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            <TouchableOpacity
                                style={[styles.nextBtn, { backgroundColor: c.primary }]}
                                onPress={handleFinish}
                            >
                                <Text style={styles.nextBtnText}>Empezar</Text>
                                <Ionicons name="checkmark" size={18} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Skip */}
                    <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                        <Text style={[styles.skipText, { color: c.textMuted }]}>Saltar por ahora</Text>
                    </TouchableOpacity>

                    {/* Back */}
                    {step > 0 && (
                        <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)}>
                            <Ionicons name="arrow-back" size={16} color={c.textMuted} />
                            <Text style={[styles.backText, { color: c.textMuted }]}>Atras</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40 },
    progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 40 },
    progressDot: { width: 10, height: 10, borderRadius: 5 },

    stepContainer: { alignItems: 'center' },
    iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 28, lineHeight: 22, paddingHorizontal: 10 },

    inputWrap: {
        flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14,
        paddingHorizontal: 16, marginBottom: 24, width: '100%',
    },
    atSign: { fontSize: 18, fontWeight: '700', marginRight: 4 },
    input: { flex: 1, fontSize: 17, paddingVertical: 14 },

    optionsGrid: { flexDirection: 'row', gap: 12, marginBottom: 28, flexWrap: 'wrap', justifyContent: 'center' },
    optionCard: {
        width: 100, height: 100, borderRadius: 16, borderWidth: 1,
        justifyContent: 'center', alignItems: 'center', gap: 6,
    },
    optionLabel: { fontSize: 14, fontWeight: '600' },

    stylesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28, justifyContent: 'center' },
    styleChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1,
        paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24,
    },
    styleChipText: { fontSize: 14, fontWeight: '600' },

    nextBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 16, paddingHorizontal: 32, borderRadius: 14, width: '100%',
    },
    nextBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

    skipBtn: { alignItems: 'center', marginTop: 20 },
    skipText: { fontSize: 14 },

    backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 12 },
    backText: { fontSize: 14 },

    // Admin avatar picker
    avatarPicker: {
        width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderStyle: 'dashed',
        overflow: 'hidden', marginBottom: 24,
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarPlaceholder: {
        width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center',
    },
    avatarPlaceholderText: { fontSize: 13, fontWeight: '600', marginTop: 2 },
    adminLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, alignSelf: 'flex-start' },
});

export default OnboardingScreen;
