// Servicio de outfits — peticiones al backend
import api from './api';
import { Platform } from 'react-native';

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

// Crear un outfit (con cover image opcional)
export const createOutfit = async (outfitData) => {
    if (outfitData.coverImageUri) {
        const formData = new FormData();
        formData.append('name', outfitData.name);
        if (outfitData.occasion) formData.append('occasion', outfitData.occasion);
        if (outfitData.season) formData.append('season', outfitData.season);
        if (outfitData.notes) formData.append('notes', outfitData.notes);
        formData.append('garmentIds', JSON.stringify(outfitData.garmentIds));

        const isWeb = Platform.OS === 'web';
        if (isWeb) {
            const response = await fetch(outfitData.coverImageUri);
            const blob = await response.blob();
            formData.append('coverImage', blob, `cover_${Date.now()}.jpg`);
        } else {
            formData.append('coverImage', {
                uri: outfitData.coverImageUri,
                name: `cover_${Date.now()}.jpg`,
                type: 'image/jpeg',
            });
        }

        const { data } = await api.post('/outfits', formData, {
            headers: isWeb ? {} : { 'Content-Type': 'multipart/form-data' },
            timeout: 30000,
        });
        return data;
    }

    const { data } = await api.post('/outfits', outfitData);
    return data;
};

// Actualizar un outfit (con cover image opcional)
export const updateOutfit = async (id, outfitData) => {
    if (outfitData.coverImageUri) {
        const formData = new FormData();
        if (outfitData.name) formData.append('name', outfitData.name);
        if (outfitData.occasion) formData.append('occasion', outfitData.occasion);
        if (outfitData.season) formData.append('season', outfitData.season);
        if (outfitData.notes) formData.append('notes', outfitData.notes);
        if (outfitData.isFavorite !== undefined) formData.append('isFavorite', outfitData.isFavorite);
        if (outfitData.garmentIds) formData.append('garmentIds', JSON.stringify(outfitData.garmentIds));

        const isWeb = Platform.OS === 'web';
        if (isWeb) {
            const response = await fetch(outfitData.coverImageUri);
            const blob = await response.blob();
            formData.append('coverImage', blob, `cover_${Date.now()}.jpg`);
        } else {
            formData.append('coverImage', {
                uri: outfitData.coverImageUri,
                name: `cover_${Date.now()}.jpg`,
                type: 'image/jpeg',
            });
        }

        const { data } = await api.put(`/outfits/${id}`, formData, {
            headers: isWeb ? {} : { 'Content-Type': 'multipart/form-data' },
            timeout: 30000,
        });
        return data;
    }

    const { data } = await api.put(`/outfits/${id}`, outfitData);
    return data;
};

// Eliminar un outfit
export const deleteOutfit = async (id) => {
    const { data } = await api.delete(`/outfits/${id}`);
    return data;
};

// Toggle favorito de un outfit
export const toggleFavorite = async (id, isFavorite) => {
    const { data } = await api.put(`/outfits/${id}`, { isFavorite });
    return data;
};
