// Slice de Outfits — Redux Toolkit
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as outfitsSvc from '../services/outfits.service';

// Thunk: Obtener outfits
export const fetchOutfits = createAsyncThunk(
    'outfits/fetchAll',
    async (filters = {}, { rejectWithValue }) => {
        try {
            const data = await outfitsSvc.getOutfits(filters);
            return data.outfits;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al cargar outfits');
        }
    }
);

// Thunk: Crear outfit
export const addOutfit = createAsyncThunk(
    'outfits/add',
    async (outfitData, { rejectWithValue }) => {
        try {
            const data = await outfitsSvc.createOutfit(outfitData);
            return data.outfit;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al crear outfit');
        }
    }
);

// Thunk: Actualizar outfit
export const editOutfit = createAsyncThunk(
    'outfits/edit',
    async ({ id, outfitData }, { rejectWithValue }) => {
        try {
            const data = await outfitsSvc.updateOutfit(id, outfitData);
            return data.outfit;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al actualizar');
        }
    }
);

// Thunk: Eliminar outfit
export const removeOutfit = createAsyncThunk(
    'outfits/remove',
    async (id, { rejectWithValue }) => {
        try {
            await outfitsSvc.deleteOutfit(id);
            return id;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al eliminar');
        }
    }
);

const outfitsSlice = createSlice({
    name: 'outfits',
    initialState: {
        outfits: [],
        isLoading: false,
        error: null,
    },
    reducers: {
        clearOutfitsError: (state) => { state.error = null; },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchOutfits.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchOutfits.fulfilled, (state, action) => { state.isLoading = false; state.outfits = action.payload; })
            .addCase(fetchOutfits.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })
            .addCase(addOutfit.fulfilled, (state, action) => { state.outfits.unshift(action.payload); })
            .addCase(editOutfit.fulfilled, (state, action) => {
                const idx = state.outfits.findIndex((o) => o.id === action.payload.id);
                if (idx !== -1) state.outfits[idx] = action.payload;
            })
            .addCase(removeOutfit.fulfilled, (state, action) => {
                state.outfits = state.outfits.filter((o) => o.id !== action.payload);
            });
    },
});

export const { clearOutfitsError } = outfitsSlice.actions;
export default outfitsSlice.reducer;
