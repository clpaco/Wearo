// Contexto de tema — modo claro/oscuro
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Paleta de colores moderna
const lightTheme = {
    mode: 'light',
    colors: {
        // Fondos
        background: '#F5F5F7',
        surface: '#FFFFFF',
        surfaceVariant: '#F0F0F3',
        card: '#FFFFFF',

        // Textos
        text: '#1A1A2E',
        textSecondary: '#6B7280',
        textMuted: '#9CA3AF',

        // Marca
        primary: '#6C5CE7',
        primaryDark: '#5A4BD1',
        primaryLight: '#A29BFE',
        accent: '#00CEC9',

        // Estado
        success: '#00B894',
        warning: '#FDCB6E',
        error: '#E17055',
        info: '#74B9FF',

        // Bordes y sombras
        border: '#E5E7EB',
        shadow: 'rgba(0, 0, 0, 0.08)',
        overlay: 'rgba(0, 0, 0, 0.3)',

        // Inputs
        inputBg: '#F9FAFB',
        inputBorder: '#D1D5DB',
        inputText: '#1A1A2E',
        placeholder: '#9CA3AF',

        // Barra de estado
        statusBar: 'dark-content',
    },
};

const darkTheme = {
    mode: 'dark',
    colors: {
        // Fondos
        background: '#0F0F1A',
        surface: '#1A1A2E',
        surfaceVariant: '#16213E',
        card: '#1A1A2E',

        // Textos
        text: '#F5F5F7',
        textSecondary: '#9CA3AF',
        textMuted: '#6B7280',

        // Marca
        primary: '#A29BFE',
        primaryDark: '#6C5CE7',
        primaryLight: '#DCD6FF',
        accent: '#55EFC4',

        // Estado
        success: '#55EFC4',
        warning: '#FFEAA7',
        error: '#FF7675',
        info: '#74B9FF',

        // Bordes y sombras
        border: '#2D2D44',
        shadow: 'rgba(0, 0, 0, 0.3)',
        overlay: 'rgba(0, 0, 0, 0.6)',

        // Inputs
        inputBg: '#16213E',
        inputBorder: '#2D2D44',
        inputText: '#F5F5F7',
        placeholder: '#6B7280',

        // Barra de estado
        statusBar: 'light-content',
    },
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [isDark, setIsDark] = useState(false);
    const theme = isDark ? darkTheme : lightTheme;

    // Cargar preferencia guardada
    useEffect(() => {
        const loadTheme = async () => {
            try {
                const saved = await AsyncStorage.getItem('theme_mode');
                if (saved === 'dark') setIsDark(true);
            } catch (e) {
                console.log('Error cargando tema:', e);
            }
        };
        loadTheme();
    }, []);

    // Cambiar tema y guardar preferencia
    const toggleTheme = async () => {
        const newMode = !isDark;
        setIsDark(newMode);
        try {
            await AsyncStorage.setItem('theme_mode', newMode ? 'dark' : 'light');
        } catch (e) {
            console.log('Error guardando tema:', e);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme debe usarse dentro de ThemeProvider');
    }
    return context;
};

export { lightTheme, darkTheme };
