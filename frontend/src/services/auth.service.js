// Servicio de autenticación con almacenamiento seguro
import api from './api';
import * as SecureStore from 'expo-secure-store';

// Iniciar sesión
export const login = async (email, password) => {
    try {
        const { data } = await api.post('/auth/login', { email, password });

        // Guardar tokens y usuario en SecureStore
        await SecureStore.setItemAsync('accessToken', data.accessToken);
        await SecureStore.setItemAsync('refreshToken', data.refreshToken);
        await SecureStore.setItemAsync('user', JSON.stringify(data.usuario));

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
        await SecureStore.setItemAsync('accessToken', data.accessToken);
        await SecureStore.setItemAsync('refreshToken', data.refreshToken);
        await SecureStore.setItemAsync('user', JSON.stringify(data.usuario));

        return data;
    } catch (error) {
        throw error.response?.data || { mensaje: 'Error de conexión' };
    }
};

// Cerrar sesión
export const logout = async () => {
    try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        await api.post('/auth/logout', { refreshToken });
    } catch (e) {
        // Ignorar errores de red al cerrar sesión
    } finally {
        // Siempre limpiar datos locales
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        await SecureStore.deleteItemAsync('user');
    }
};

// Restaurar sesión guardada
export const getStoredSession = async () => {
    const accessToken = await SecureStore.getItemAsync('accessToken');
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    const userJson = await SecureStore.getItemAsync('user');

    if (!accessToken || !userJson) return null;

    return {
        accessToken,
        refreshToken,
        user: JSON.parse(userJson),
    };
};
