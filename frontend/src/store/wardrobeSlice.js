// Slice del Armario — Redux Toolkit
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as garmentsSvc from '../services/garments.service';

// Thunk: Obtener prendas
export const fetchGarments = createAsyncThunk(
    'wardrobe/fetchAll',
    async (filters = {}, { rejectWithValue }) => {
        try {
            const data = await garmentsSvc.getGarments(filters);
            return data.prendas;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al cargar prendas');
        }
    }
);

// Thunk: Crear prenda
export const addGarment = createAsyncThunk(
    'wardrobe/add',
    async ({ garmentData, imageUri }, { rejectWithValue }) => {
        try {
            const data = await garmentsSvc.createGarment(garmentData, imageUri);
            return data.prenda;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al añadir prenda');
        }
    }
);

// Thunk: Actualizar prenda
export const editGarment = createAsyncThunk(
    'wardrobe/edit',
    async ({ id, garmentData, imageUri }, { rejectWithValue }) => {
        try {
            const data = await garmentsSvc.updateGarment(id, garmentData, imageUri);
            return data.prenda;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al actualizar');
        }
    }
);

// Thunk: Eliminar prenda
export const removeGarment = createAsyncThunk(
    'wardrobe/remove',
    async (id, { rejectWithValue }) => {
        try {
            await garmentsSvc.deleteGarment(id);
            return id;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al eliminar');
        }
    }
);

const wardrobeSlice = createSlice({
    name: 'wardrobe',
    initialState: {
        garments: [],
        isLoading: false,
        error: null,
        activeFilter: null, // categoría activa
    },
    reducers: {
        setFilter: (state, action) => {
            state.activeFilter = action.payload;
        },
        clearWardrobeError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch
            .addCase(fetchGarments.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchGarments.fulfilled, (state, action) => {
                state.isLoading = false;
                state.garments = action.payload;
            })
            .addCase(fetchGarments.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Add
            .addCase(addGarment.fulfilled, (state, action) => {
                state.garments.unshift(action.payload);
            })
            // Edit
            .addCase(editGarment.fulfilled, (state, action) => {
                const idx = state.garments.findIndex((g) => g.id === action.payload.id);
                if (idx !== -1) state.garments[idx] = action.payload;
            })
            // Remove
            .addCase(removeGarment.fulfilled, (state, action) => {
                state.garments = state.garments.filter((g) => g.id !== action.payload);
            });
    },
});

export const { setFilter, clearWardrobeError } = wardrobeSlice.actions;
export default wardrobeSlice.reducer;
