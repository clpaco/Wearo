// Configuración del Redux Store
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import wardrobeReducer from './wardrobeSlice';

const store = configureStore({
    reducer: {
        auth: authReducer,
        wardrobe: wardrobeReducer,
    },
});

export default store;
