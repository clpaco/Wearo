// Pantalla principal — placeholder post-login con toggle de tema
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../store/authSlice';
import { useTheme } from '../hooks/useTheme';

const HomeScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { theme, isDark, toggleTheme } = useTheme();
    const c = theme.colors;

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <StatusBar barStyle={c.statusBar} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
                <View>
                    <Text style={[styles.greeting, { color: c.textSecondary }]}>¡Hola! 👋</Text>
                    <Text style={[styles.userName, { color: c.text }]}>
                        {user?.fullName || 'Usuario'}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.themeToggle, { backgroundColor: c.surfaceVariant }]}
                    onPress={toggleTheme}
                    activeOpacity={0.7}
                >
                    <Text style={{ fontSize: 22 }}>{isDark ? '☀️' : '🌙'}</Text>
                </TouchableOpacity>
            </View>

            {/* Contenido */}
            <View style={styles.content}>
                <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 16 }}>🧥</Text>
                    <Text style={[styles.cardTitle, { color: c.text }]}>
                        ¡Bienvenido a OutfitVault!
                    </Text>
                    <Text style={[styles.cardText, { color: c.textSecondary }]}>
                        Tu armario digital está listo. Añade prendas, crea outfits y planifica tu estilo.
                    </Text>
                </View>

                {/* Secciones */}
                <View style={styles.sectionGrid}>
                    {[
                        { icon: '👕', label: 'Armario', color: '#6C5CE7', screen: 'Wardrobe', ready: true },
                        { icon: '👔', label: 'Outfits', color: '#00CEC9', screen: null, ready: false },
                        { icon: '📅', label: 'Calendario', color: '#FDCB6E', screen: null, ready: false },
                        { icon: '📊', label: 'Estadísticas', color: '#E17055', screen: null, ready: false },
                    ].map((item) => (
                        <TouchableOpacity
                            key={item.label}
                            style={[styles.sectionCard, { backgroundColor: c.surface, borderColor: c.border }]}
                            onPress={() => item.ready && navigation.navigate(item.screen)}
                            activeOpacity={item.ready ? 0.7 : 1}
                        >
                            <View style={[styles.iconCircle, { backgroundColor: item.color + '20' }]}>
                                <Text style={{ fontSize: 24 }}>{item.icon}</Text>
                            </View>
                            <Text style={[styles.sectionLabel, { color: c.text }]}>{item.label}</Text>
                            <Text style={[styles.sectionStatus, { color: item.ready ? c.success : c.textMuted }]}>
                                {item.ready ? '✓ Disponible' : 'Próximamente'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Botón cerrar sesión */}
            <TouchableOpacity
                style={[styles.logoutBtn, { borderColor: c.error }]}
                onPress={() => dispatch(logoutUser())}
                activeOpacity={0.7}
            >
                <Text style={[styles.logoutText, { color: c.error }]}>Cerrar Sesión</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 56,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    greeting: {
        fontSize: 14,
        fontWeight: '500',
    },
    userName: {
        fontSize: 22,
        fontWeight: '800',
    },
    themeToggle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 20,
    },
    card: {
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
    },
    cardText: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    sectionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    sectionCard: {
        width: '48%',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        marginBottom: 12,
        alignItems: 'center',
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    sectionLabel: {
        fontSize: 15,
        fontWeight: '700',
    },
    sectionStatus: {
        fontSize: 12,
        marginTop: 2,
    },
    logoutBtn: {
        marginHorizontal: 24,
        marginBottom: 32,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: 'center',
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
    },
});

export default HomeScreen;
