// Servicio de outfits — peticiones al backend
import api from './api';

// Obtener todos los outfits
export const getOutfits = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.occasion) params.append('occasion', filters.occasion);
    if (filters.season) params.append('season', filters.season);
    if (filters.favorite) params.append('favorite', 'true');

    const { data } = await api.get(`/outfits?${params.toString()}`);
    return data;
};

// Obtener un outfit por ID
export const getOutfitById = async (id) => {
    const { data } = await api.get(`/outfits/${id}`);
    return data;
};

// Crear un outfit
export const createOutfit = async (outfitData) => {
    const { data } = await api.post('/outfits', outfitData);
    return data;
};

// Actualizar un outfit
export const updateOutfit = async (id, outfitData) => {
    const { data } = await api.put(`/outfits/${id}`, outfitData);
    return data;
};

// Eliminar un outfit
export const deleteOutfit = async (id) => {
    const { data } = await api.delete(`/outfits/${id}`);
    return data;
};
