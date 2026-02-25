// Configuración del Redux Store
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import wardrobeReducer from './wardrobeSlice';
import outfitsReducer from './outfitsSlice';
import calendarReducer from './calendarSlice';
import statsReducer from './statsSlice';
import socialReducer from './socialSlice';
import profileReducer from './profileSlice';
import aiReducer from './aiSlice';
import messagesReducer from './messagesSlice';

const store = configureStore({
    reducer: {
        auth: authReducer,
        wardrobe: wardrobeReducer,
        outfits: outfitsReducer,
        calendar: calendarReducer,
        stats: statsReducer,
        social: socialReducer,
        profile: profileReducer,
        ai: aiReducer,
        messages: messagesReducer,
    },
});

export default store;

