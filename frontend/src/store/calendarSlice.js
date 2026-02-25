// Slice del Calendario — multi-entry, auto-worn, solo hoy editable
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as calendarSvc from '../services/calendar.service';

// Thunk: Obtener entradas del mes
export const fetchMonthEntries = createAsyncThunk(
    'calendar/fetchMonth',
    async ({ startDate, endDate }, { rejectWithValue }) => {
        try {
            const data = await calendarSvc.getCalendarRange(startDate, endDate);
            return data.entradas;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al cargar calendario');
        }
    }
);

// Thunk: Añadir entrada (outfit o prendas sueltas)
export const addCalendarEntry = createAsyncThunk(
    'calendar/addEntry',
    async ({ date, outfitId, garmentIds, notes }, { rejectWithValue }) => {
        try {
            const data = await calendarSvc.addEntry(date, { outfitId, garmentIds, notes });
            return data.entrada;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al añadir entrada');
        }
    }
);

// Thunk: Eliminar entrada por ID
export const removeCalendarEntry = createAsyncThunk(
    'calendar/removeEntry',
    async (entryId, { rejectWithValue }) => {
        try {
            const data = await calendarSvc.removeEntry(entryId);
            return data.entryId;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al eliminar entrada');
        }
    }
);

// Helper: ensure garments is always a parsed array
const parseEntryGarments = (entry) => {
    if (!entry) return entry;
    if (typeof entry.garments === 'string') {
        try { entry.garments = JSON.parse(entry.garments); } catch { entry.garments = []; }
    }
    if (!Array.isArray(entry.garments)) entry.garments = [];
    return entry;
};

const calendarSlice = createSlice({
    name: 'calendar',
    initialState: {
        entries: [],
        selectedDate: new Date().toISOString().split('T')[0],
        isLoading: false,
        error: null,
    },
    reducers: {
        setSelectedDate: (state, action) => { state.selectedDate = action.payload; },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMonthEntries.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchMonthEntries.fulfilled, (state, action) => {
                state.isLoading = false;
                state.entries = (action.payload || []).map(parseEntryGarments);
            })
            .addCase(fetchMonthEntries.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Añadir entrada
            .addCase(addCalendarEntry.fulfilled, (state, action) => {
                state.entries.push(parseEntryGarments(action.payload));
            })
            // Eliminar entrada por ID
            .addCase(removeCalendarEntry.fulfilled, (state, action) => {
                state.entries = state.entries.filter((e) => e.id !== action.payload);
            });
    },
});

export const { setSelectedDate } = calendarSlice.actions;
export default calendarSlice.reducer;
