// Componente EmptyState reutilizable
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

const EmptyState = ({ icon = '📭', title, description, action }) => {
    const { theme } = useTheme();

    return (
        <View style={styles.container}>
            <Text style={styles.icon}>{icon}</Text>
            <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
            {description && (
                <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
                    {description}
                </Text>
            )}
            {action && (
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={action.onPress}
                    activeOpacity={0.8}
                >
                    <Text style={styles.actionText}>{action.label}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingVertical: 48,
    },
    icon: {
        fontSize: 56,
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    actionBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
    },
    actionText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 15,
    },
});

export default EmptyState;
