// Pantalla de Registro — diseño moderno con soporte claro/oscuro
import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform,
    ActivityIndicator, ScrollView, StatusBar, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser, clearError } from '../store/authSlice';
import { useTheme } from '../hooks/useTheme';

const RegisterScreen = ({ navigation }) => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [localError, setLocalError] = useState('');
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const dispatch = useDispatch();
    const { isLoading, error } = useSelector((state) => state.auth);
    const { theme } = useTheme();
    const c = theme.colors;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, []);

    const handleRegister = () => {
        setLocalError('');

        if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
            setLocalError('Todos los campos son obligatorios');
            return;
        }

        if (password.length < 8) {
            setLocalError('La contraseña debe tener al menos 8 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            setLocalError('Las contraseñas no coinciden');
            return;
        }

        dispatch(registerUser({
            email: email.trim().toLowerCase(),
            password,
            fullName: fullName.trim(),
        }));
    };

    const displayError = localError || error;

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: c.background }]}>
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle={c.statusBar} />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <Animated.View style={{ opacity: fadeAnim }}>
                <View style={styles.header}>
                    <View style={[styles.logoCircle, { backgroundColor: c.primary + '20' }]}>
                        <Ionicons name="shirt-outline" size={36} color={c.primary} />
                    </View>
                    <Text style={[styles.title, { color: c.text }]}>Crear Cuenta</Text>
                    <Text style={[styles.subtitle, { color: c.textSecondary }]}>
                        Empieza a organizar tu armario
                    </Text>
                </View>

                {/* Formulario */}
                <View style={[styles.form, { backgroundColor: c.surface, borderColor: c.border }]}>
                    {displayError && (
                        <View style={[styles.errorBox, { backgroundColor: c.error + '15' }]}>
                            <Text style={[styles.errorText, { color: c.error }]}>{displayError}</Text>
                        </View>
                    )}

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: c.textSecondary }]}>Nombre completo</Text>
                        <View style={[styles.inputRow, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}>
                            <Ionicons name="person-outline" size={18} color={c.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: c.inputText }]}
                                placeholder="Tu nombre"
                                placeholderTextColor={c.placeholder}
                                value={fullName}
                                onChangeText={(text) => { setFullName(text); setLocalError(''); dispatch(clearError()); }}
                                autoCapitalize="words"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: c.textSecondary }]}>Email</Text>
                        <View style={[styles.inputRow, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}>
                            <Ionicons name="mail-outline" size={18} color={c.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: c.inputText }]}
                                placeholder="tu@email.com"
                                placeholderTextColor={c.placeholder}
                                value={email}
                                onChangeText={(text) => { setEmail(text); setLocalError(''); dispatch(clearError()); }}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: c.textSecondary }]}>Contraseña</Text>
                        <View style={[styles.inputRow, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}>
                            <Ionicons name="lock-closed-outline" size={18} color={c.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: c.inputText }]}
                                placeholder="Mínimo 8 caracteres"
                                placeholderTextColor={c.placeholder}
                                value={password}
                                onChangeText={(text) => { setPassword(text); setLocalError(''); }}
                                secureTextEntry
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: c.textSecondary }]}>Confirmar contraseña</Text>
                        <View style={[styles.inputRow, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}>
                            <Ionicons name="lock-closed-outline" size={18} color={c.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: c.inputText }]}
                                placeholder="Repite la contraseña"
                                placeholderTextColor={c.placeholder}
                                value={confirmPassword}
                                onChangeText={(text) => { setConfirmPassword(text); setLocalError(''); }}
                                secureTextEntry
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: c.primary }]}
                        onPress={handleRegister}
                        disabled={isLoading}
                        activeOpacity={0.8}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <View style={styles.buttonContent}>
                                <Ionicons name="person-add-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                                <Text style={styles.buttonText}>Crear Cuenta</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.linkRow}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text style={[styles.linkText, { color: c.textSecondary }]}>
                            ¿Ya tienes cuenta?{' '}
                        </Text>
                        <Text style={[styles.linkBold, { color: c.primary }]}>Inicia sesión</Text>
                    </TouchableOpacity>
                </View>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    logoCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        marginTop: 4,
    },
    form: {
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
    },
    errorBox: {
        padding: 12,
        borderRadius: 10,
        marginBottom: 16,
    },
    errorText: {
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '500',
    },
    inputGroup: {
        marginBottom: 14,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 6,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    inputIcon: {
        paddingLeft: 14,
    },
    input: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 14,
        fontSize: 16,
    },
    button: {
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#6C5CE7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
    linkRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    linkText: {
        fontSize: 15,
    },
    linkBold: {
        fontSize: 15,
        fontWeight: '700',
    },
});

export default RegisterScreen;
