// Servicio de estadísticas — peticiones al backend
import api from './api';

// Obtener todas las estadísticas en una sola llamada
export const getAllStats = async () => {
    const { data } = await api.get('/stats');
    return data;
};

// Endpoints individuales
export const getOverview = async () => {
    const { data } = await api.get('/stats/overview');
    return data;
};

export const getByCategory = async () => {
    const { data } = await api.get('/stats/categories');
    return data;
};

export const getByColor = async () => {
    const { data } = await api.get('/stats/colors');
    return data;
};

export const getBySeason = async () => {
    const { data } = await api.get('/stats/seasons');
    return data;
};

export const getTopOutfits = async (limit = 5) => {
    const { data } = await api.get(`/stats/top-outfits?limit=${limit}`);
    return data;
};

export const getActivity = async () => {
    const { data } = await api.get('/stats/activity');
    return data;
};

export const getTopGarments = async (limit = 5) => {
    const { data } = await api.get(`/stats/top-garments?limit=${limit}`);
    return data;
};
