// Pantalla de Login — diseño moderno con soporte claro/oscuro
import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform,
    ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, clearError } from '../store/authSlice';
import { useTheme } from '../hooks/useTheme';

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const dispatch = useDispatch();
    const { isLoading, error } = useSelector((state) => state.auth);
    const { theme } = useTheme();
    const c = theme.colors;

    const handleLogin = () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Error', 'Introduce email y contraseña');
            return;
        }
        dispatch(loginUser({ email: email.trim().toLowerCase(), password }));
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: c.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle={c.statusBar} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.logo, { color: c.primary }]}>🧥</Text>
                <Text style={[styles.title, { color: c.text }]}>OutfitVault</Text>
                <Text style={[styles.subtitle, { color: c.textSecondary }]}>
                    Tu armario inteligente
                </Text>
            </View>

            {/* Formulario */}
            <View style={[styles.form, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[styles.formTitle, { color: c.text }]}>Iniciar Sesión</Text>

                {error && (
                    <View style={[styles.errorBox, { backgroundColor: c.error + '15' }]}>
                        <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
                    </View>
                )}

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: c.textSecondary }]}>Email</Text>
                    <TextInput
                        style={[styles.input, {
                            backgroundColor: c.inputBg,
                            borderColor: c.inputBorder,
                            color: c.inputText,
                        }]}
                        placeholder="tu@email.com"
                        placeholderTextColor={c.placeholder}
                        value={email}
                        onChangeText={(text) => { setEmail(text); dispatch(clearError()); }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: c.textSecondary }]}>Contraseña</Text>
                    <View style={styles.passwordRow}>
                        <TextInput
                            style={[styles.input, styles.passwordInput, {
                                backgroundColor: c.inputBg,
                                borderColor: c.inputBorder,
                                color: c.inputText,
                            }]}
                            placeholder="••••••••"
                            placeholderTextColor={c.placeholder}
                            value={password}
                            onChangeText={(text) => { setPassword(text); dispatch(clearError()); }}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            style={[styles.eyeBtn, { borderColor: c.inputBorder }]}
                            onPress={() => setShowPassword(!showPassword)}
                        >
                            <Text style={{ fontSize: 18 }}>{showPassword ? '🙈' : '👁️'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: c.primary }]}
                    onPress={handleLogin}
                    disabled={isLoading}
                    activeOpacity={0.8}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.buttonText}>Entrar</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.linkRow}
                    onPress={() => navigation.navigate('Register')}
                >
                    <Text style={[styles.linkText, { color: c.textSecondary }]}>
                        ¿No tienes cuenta?{' '}
                    </Text>
                    <Text style={[styles.linkBold, { color: c.primary }]}>Regístrate</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logo: {
        fontSize: 56,
        marginBottom: 8,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
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
    formTitle: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 20,
        textAlign: 'center',
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
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
    },
    passwordRow: {
        flexDirection: 'row',
    },
    passwordInput: {
        flex: 1,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
    },
    eyeBtn: {
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
        paddingHorizontal: 14,
        justifyContent: 'center',
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

export default LoginScreen;
