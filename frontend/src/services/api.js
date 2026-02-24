// Instancia base de Axios con interceptors
import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// En web (PC) usa localhost; en móvil usa la IP de la red local
const BASE_HOST = Platform.OS === 'web' ? 'http://localhost:3000' : 'http://172.20.10.2:3000';
const BASE_URL = `${BASE_HOST}/api/v1`;
export const IMAGE_BASE_URL = BASE_HOST;

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 30000, // 30s para dar margen a las llamadas de IA (Gemini puede tardar)
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor de request — añadir token automáticamente
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor de response — refresh automático si token expirado
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Si el token expiró y no hemos reintentado aún
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = await AsyncStorage.getItem('refreshToken');
                if (!refreshToken) throw new Error('Sin refresh token');

                const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
                    refreshToken,
                });

                // Guardar nuevo access token
                await AsyncStorage.setItem('accessToken', data.accessToken);

                // Reintentar petición original con nuevo token
                originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Si el refresh falla, limpiar sesión
                await AsyncStorage.removeItem('accessToken');
                await AsyncStorage.removeItem('refreshToken');
                await AsyncStorage.removeItem('user');
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
