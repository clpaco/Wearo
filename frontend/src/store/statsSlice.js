// Slice de Estadísticas — Redux Toolkit
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as statsSvc from '../services/stats.service';

export const fetchAllStats = createAsyncThunk(
    'stats/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            return await statsSvc.getAllStats();
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al cargar estadísticas');
        }
    }
);

const statsSlice = createSlice({
    name: 'stats',
    initialState: {
        resumen: null,
        categorias: [],
        colores: [],
        temporadas: [],
        topOutfits: [],
        actividad: [],
        topPrendas: [],
        isLoading: false,
        error: null,
    },
    reducers: {
        clearStatsError: (state) => { state.error = null; },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAllStats.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchAllStats.fulfilled, (state, action) => {
                state.isLoading = false;
                state.resumen = action.payload.resumen;
                state.categorias = action.payload.categorias;
                state.colores = action.payload.colores;
                state.temporadas = action.payload.temporadas;
                state.topOutfits = action.payload.topOutfits;
                state.actividad = action.payload.actividad;
                state.topPrendas = action.payload.topPrendas;
            })
            .addCase(fetchAllStats.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });
    },
});

export const { clearStatsError } = statsSlice.actions;
export default statsSlice.reducer;
