// Servicio IA frontend — llama a los endpoints del backend
import api from './api';

// Obtener recomendación de outfit basada en el clima actual
export const getWeatherRecommendation = async (city) => {
    const { data } = await api.post('/ai/weather-recommend', { city });
    return data; // { recommendation: { outfitName, reason }, weather }
};

// Enviar mensaje al chat de outfits (Gemini)
// messages: [{role: 'user'|'assistant', content: string}]
export const sendChatMessage = async (messages, options = {}) => {
    const { data } = await api.post('/ai/chat', { messages, ...options });
    return data; // { reply: string }
};

// Obtener recomendaciones de prendas para comprar (Gemini)
export const getShoppingRecs = async (query = '') => {
    const { data } = await api.post('/ai/shopping', query ? { query } : {});
    return data; // { recommendations: [{name, description, reason, category, estimatedPrice, imageUrl, searchUrl}] }
};
