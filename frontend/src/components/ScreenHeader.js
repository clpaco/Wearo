// Componente ScreenHeader reutilizable
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

const ScreenHeader = ({ title, subtitle, onBack, rightAction }) => {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: theme.colors.surface,
                    paddingTop: insets.top + 8,
                    borderBottomColor: theme.colors.border,
                    ...theme.colors.shadowSm,
                },
            ]}
        >
            <View style={styles.row}>
                {/* Botón back */}
                <View style={styles.leftSlot}>
                    {onBack && (
                        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Título */}
                <View style={styles.centerSlot}>
                    <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
                        {title}
                    </Text>
                    {subtitle && (
                        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                            {subtitle}
                        </Text>
                    )}
                </View>

                {/* Acción derecha */}
                <View style={styles.rightSlot}>
                    {rightAction || null}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 44,
    },
    leftSlot: {
        width: 40,
        alignItems: 'flex-start',
    },
    centerSlot: {
        flex: 1,
        alignItems: 'center',
    },
    rightSlot: {
        width: 40,
        alignItems: 'flex-end',
    },
    backBtn: {
        padding: 4,
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    subtitle: {
        fontSize: 12,
        marginTop: 1,
    },
});

export default ScreenHeader;
