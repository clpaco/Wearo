// Componente StatCard reutilizable
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

const StatCard = ({ value, label, icon, color, style }) => {
    const { theme } = useTheme();

    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: color ? `${color}18` : theme.colors.surfaceVariant,
                    borderColor: color ? `${color}30` : theme.colors.border,
                    ...theme.colors.shadowSm,
                },
                style,
            ]}
        >
            {icon && <Text style={styles.icon}>{icon}</Text>}
            <Text style={[styles.value, { color: color || theme.colors.primary }]}>
                {value ?? '–'}
            </Text>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                {label}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 14,
        alignItems: 'center',
        flex: 1,
    },
    icon: {
        fontSize: 22,
        marginBottom: 6,
    },
    value: {
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    label: {
        fontSize: 11,
        textAlign: 'center',
        marginTop: 4,
        lineHeight: 15,
    },
});

export default StatCard;
