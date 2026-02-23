// Instancia base de Axios con interceptors
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Cambia esta URL cuando despliegues el backend
const BASE_URL = 'http://10.0.2.2:3000/api/v1'; // Android emulator
// const BASE_URL = 'http://localhost:3000/api/v1'; // iOS / Web

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor de request — añadir token automáticamente
api.interceptors.request.use(
    async (config) => {
        const token = await SecureStore.getItemAsync('accessToken');
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
                const refreshToken = await SecureStore.getItemAsync('refreshToken');
                if (!refreshToken) throw new Error('Sin refresh token');

                const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
                    refreshToken,
                });

                // Guardar nuevo access token
                await SecureStore.setItemAsync('accessToken', data.accessToken);

                // Reintentar petición original con nuevo token
                originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Si el refresh falla, limpiar sesión
                await SecureStore.deleteItemAsync('accessToken');
                await SecureStore.deleteItemAsync('refreshToken');
                await SecureStore.deleteItemAsync('user');
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
