// Slice IA — Redux Toolkit
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as aiSvc from '../services/ai.service';

// Thunk: recomendación por clima
export const fetchWeatherRecommendation = createAsyncThunk(
    'ai/weatherRecommend',
    async (city, { rejectWithValue }) => {
        try {
            const data = await aiSvc.getWeatherRecommendation(city);
            return data.recommendation;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al obtener recomendación');
        }
    }
);

// Thunk: enviar mensaje de chat
export const sendMessage = createAsyncThunk(
    'ai/sendMessage',
    async ({ messages, city }, { rejectWithValue }) => {
        try {
            const options = city ? { city } : {};
            const data = await aiSvc.sendChatMessage(messages, options);
            return data.reply;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error en el chat');
        }
    }
);

// Thunk: recomendaciones de compra
export const fetchShoppingRecs = createAsyncThunk(
    'ai/shoppingRecs',
    async (_, { rejectWithValue }) => {
        try {
            const data = await aiSvc.getShoppingRecs();
            return data.recommendations;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al obtener sugerencias');
        }
    }
);

const aiSlice = createSlice({
    name: 'ai',
    initialState: {
        weatherRec: null,
        chatMessages: [],
        shoppingRecs: [],
        isLoading: false,
        isShoppingLoading: false,
        error: null,
    },
    reducers: {
        clearChat: (state) => {
            state.chatMessages = [];
            state.error = null;
        },
        clearWeatherRec: (state) => {
            state.weatherRec = null;
        },
        clearShoppingRecs: (state) => {
            state.shoppingRecs = [];
        },
        clearAiError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Weather recommendation
            .addCase(fetchWeatherRecommendation.pending, (state) => {
                state.isLoading = true;
                state.weatherRec = null;
                state.error = null;
            })
            .addCase(fetchWeatherRecommendation.fulfilled, (state, action) => {
                state.isLoading = false;
                state.weatherRec = action.payload;
            })
            .addCase(fetchWeatherRecommendation.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Chat
            .addCase(sendMessage.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(sendMessage.fulfilled, (state, action) => {
                state.isLoading = false;
                state.chatMessages = [
                    ...state.chatMessages,
                    { role: 'assistant', content: action.payload },
                ];
            })
            .addCase(sendMessage.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
                state.chatMessages = [
                    ...state.chatMessages,
                    { role: 'assistant', content: 'Lo siento, hubo un error. Inténtalo de nuevo.' },
                ];
            })
            // Shopping recs
            .addCase(fetchShoppingRecs.pending, (state) => {
                state.isShoppingLoading = true;
                state.shoppingRecs = [];
                state.error = null;
            })
            .addCase(fetchShoppingRecs.fulfilled, (state, action) => {
                state.isShoppingLoading = false;
                state.shoppingRecs = action.payload;
            })
            .addCase(fetchShoppingRecs.rejected, (state, action) => {
                state.isShoppingLoading = false;
                state.error = action.payload;
            });
    },
});

export const { clearChat, clearWeatherRec, clearShoppingRecs, clearAiError } = aiSlice.actions;
export default aiSlice.reducer;
