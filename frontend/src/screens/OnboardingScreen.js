// Pantalla de Onboarding — cuestionario inicial tras registro
import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, StatusBar, ScrollView,
    TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { updateMyProfile } from '../store/profileSlice';

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

    const [step, setStep] = useState(0); // 0=username, 1=gender, 2=styles, 3=done
    const [username, setUsername] = useState('');
    const [gender, setGender] = useState(null);
    const [selectedStyles, setSelectedStyles] = useState([]);

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
});

export default OnboardingScreen;
