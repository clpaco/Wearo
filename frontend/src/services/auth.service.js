// Servicio de autenticación con almacenamiento local
import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Iniciar sesión
export const login = async (email, password) => {
    try {
        const { data } = await api.post('/auth/login', { email, password });

        // Guardar tokens y usuario
        await AsyncStorage.setItem('accessToken', data.accessToken);
        await AsyncStorage.setItem('refreshToken', data.refreshToken);
        await AsyncStorage.setItem('user', JSON.stringify(data.usuario));

        return data;
    } catch (error) {
        throw error.response?.data || { mensaje: 'Error de conexión' };
    }
};

// Registrar nuevo usuario
export const register = async (email, password, fullName) => {
    try {
        const { data } = await api.post('/auth/register', { email, password, fullName });

        // Guardar tokens y usuario
        await AsyncStorage.setItem('accessToken', data.accessToken);
        await AsyncStorage.setItem('refreshToken', data.refreshToken);
        await AsyncStorage.setItem('user', JSON.stringify(data.usuario));

        return data;
    } catch (error) {
        throw error.response?.data || { mensaje: 'Error de conexión' };
    }
};

// Cerrar sesión
export const logout = async () => {
    try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        await api.post('/auth/logout', { refreshToken });
    } catch (e) {
        // Ignorar errores de red al cerrar sesión
    } finally {
        // Siempre limpiar datos locales
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('refreshToken');
        await AsyncStorage.removeItem('user');
    }
};

// Restaurar sesión guardada
export const getStoredSession = async () => {
    const accessToken = await AsyncStorage.getItem('accessToken');
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    const userJson = await AsyncStorage.getItem('user');

    if (!accessToken || !userJson) return null;

    return {
        accessToken,
        refreshToken,
        user: JSON.parse(userJson),
    };
};
