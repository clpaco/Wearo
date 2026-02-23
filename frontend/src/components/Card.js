// Componente Card reutilizable
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

const Card = ({ children, style, onPress, padding = 16 }) => {
    const { theme } = useTheme();

    const cardStyle = [
        styles.card,
        {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            padding,
            ...theme.colors.shadowMd,
        },
        style,
    ];

    if (onPress) {
        return (
            <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.75}>
                {children}
            </TouchableOpacity>
        );
    }

    return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        borderWidth: 1,
    },
});

export default Card;
