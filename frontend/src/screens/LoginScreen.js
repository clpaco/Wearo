// Pantalla de Login — diseño moderno con soporte claro/oscuro
import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform,
    ActivityIndicator, Alert, StatusBar, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, clearError } from '../store/authSlice';
import { useTheme } from '../hooks/useTheme';

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const dispatch = useDispatch();
    const { isLoading, error } = useSelector((state) => state.auth);
    const { theme } = useTheme();
    const c = theme.colors;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, []);

    const handleLogin = () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Error', 'Introduce email y contraseña');
            return;
        }
        dispatch(loginUser({ email: email.trim().toLowerCase(), password }));
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: c.background }]}>
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle={c.statusBar} />

            <Animated.View style={{ opacity: fadeAnim }}>
            {/* Header */}
            <View style={styles.header}>
                <View style={[styles.logoCircle, { backgroundColor: c.primary + '20' }]}>
                    <Ionicons name="shirt-outline" size={40} color={c.primary} />
                </View>
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
                    <View style={[styles.inputRow, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}>
                        <Ionicons name="mail-outline" size={18} color={c.textMuted} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: c.inputText }]}
                            placeholder="tu@email.com"
                            placeholderTextColor={c.placeholder}
                            value={email}
                            onChangeText={(text) => { setEmail(text); dispatch(clearError()); }}
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
                            placeholder="Tu contraseña"
                            placeholderTextColor={c.placeholder}
                            value={password}
                            onChangeText={(text) => { setPassword(text); dispatch(clearError()); }}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            style={styles.eyeBtn}
                            onPress={() => setShowPassword(!showPassword)}
                        >
                            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={c.textSecondary} />
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
                        <View style={styles.buttonContent}>
                            <Ionicons name="log-in-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                            <Text style={styles.buttonText}>Entrar</Text>
                        </View>
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
            </Animated.View>
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
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
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
    eyeBtn: {
        paddingHorizontal: 14,
        justifyContent: 'center',
        alignSelf: 'stretch',
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

export default LoginScreen;
