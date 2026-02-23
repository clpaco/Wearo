// Configuración del Redux Store
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import wardrobeReducer from './wardrobeSlice';
import outfitsReducer from './outfitsSlice';
import calendarReducer from './calendarSlice';

const store = configureStore({
    reducer: {
        auth: authReducer,
        wardrobe: wardrobeReducer,
        outfits: outfitsReducer,
        calendar: calendarReducer,
    },
});

export default store;

