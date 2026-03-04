// Servicio IA frontend — llama a los endpoints del backend
import api from './api';
import { Platform } from 'react-native';

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

// Transcribir audio a texto (Whisper via Groq)
export const transcribeAudio = async (audioUri) => {
    const formData = new FormData();
    const isWeb = Platform.OS === 'web';
    const ext = isWeb ? 'webm' : 'm4a';
    const mime = isWeb ? 'audio/webm' : 'audio/mp4';

    if (isWeb) {
        const resp = await fetch(audioUri);
        const blob = await resp.blob();
        formData.append('audio', blob, `voice.${ext}`);
    } else {
        formData.append('audio', { uri: audioUri, name: `voice.${ext}`, type: mime });
    }

    const { data } = await api.post('/ai/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
    });
    return data.text;
};
