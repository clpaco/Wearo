// Servicio de prendas — peticiones al backend
import api from './api';

// Obtener todas las prendas (con filtros opcionales)
export const getGarments = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.color) params.append('color', filters.color);
    if (filters.season) params.append('season', filters.season);
    if (filters.favorite) params.append('favorite', 'true');

    const { data } = await api.get(`/garments?${params.toString()}`);
    return data;
};

// Obtener una prenda por ID
export const getGarmentById = async (id) => {
    const { data } = await api.get(`/garments/${id}`);
    return data;
};

// Crear una prenda (con imagen opcional)
export const createGarment = async (garmentData, imageUri) => {
    const formData = new FormData();
    formData.append('name', garmentData.name);
    formData.append('category', garmentData.category);
    if (garmentData.color) formData.append('color', garmentData.color);
    if (garmentData.brand) formData.append('brand', garmentData.brand);
    if (garmentData.season) formData.append('season', garmentData.season);
    if (garmentData.notes) formData.append('notes', garmentData.notes);

    if (imageUri) {
        const filename = imageUri.split('/').pop();
        const ext = filename.split('.').pop();
        formData.append('image', {
            uri: imageUri,
            name: filename,
            type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        });
    }

    const { data } = await api.post('/garments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
};

// Actualizar una prenda
export const updateGarment = async (id, garmentData, imageUri) => {
    const formData = new FormData();
    if (garmentData.name) formData.append('name', garmentData.name);
    if (garmentData.category) formData.append('category', garmentData.category);
    if (garmentData.color) formData.append('color', garmentData.color);
    if (garmentData.brand) formData.append('brand', garmentData.brand);
    if (garmentData.season) formData.append('season', garmentData.season);
    if (garmentData.notes !== undefined) formData.append('notes', garmentData.notes);
    if (garmentData.isFavorite !== undefined) formData.append('isFavorite', garmentData.isFavorite);

    if (imageUri) {
        const filename = imageUri.split('/').pop();
        const ext = filename.split('.').pop();
        formData.append('image', {
            uri: imageUri,
            name: filename,
            type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        });
    }

    const { data } = await api.put(`/garments/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
};

// Eliminar una prenda
export const deleteGarment = async (id) => {
    const { data } = await api.delete(`/garments/${id}`);
    return data;
};

// Toggle favorito de una prenda
export const toggleFavorite = async (id, isFavorite) => {
    const formData = new FormData();
    formData.append('isFavorite', String(isFavorite));
    const { data } = await api.put(`/garments/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
};

// Obtener categorías del usuario
export const getCategories = async () => {
    const { data } = await api.get('/garments/categories');
    return data;
};

// Detectar color dominante de una imagen
export const detectColor = async (imageUri) => {
    const formData = new FormData();
    const filename = imageUri.split('/').pop();
    const ext = filename.split('.').pop();
    formData.append('image', {
        uri: imageUri,
        name: filename,
        type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    });
    const { data } = await api.post('/garments/detect-color', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
};
