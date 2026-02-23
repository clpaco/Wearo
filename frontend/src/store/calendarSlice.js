// Slice del Calendario — Redux Toolkit
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

// Thunk: Asignar outfit a fecha
export const assignOutfitToDate = createAsyncThunk(
    'calendar/assign',
    async ({ date, outfitId, notes }, { rejectWithValue }) => {
        try {
            const data = await calendarSvc.assignOutfit(date, outfitId, notes);
            return data.entrada;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al asignar outfit');
        }
    }
);

// Thunk: Eliminar entrada
export const removeEntry = createAsyncThunk(
    'calendar/remove',
    async (date, { rejectWithValue }) => {
        try {
            await calendarSvc.removeEntry(date);
            return date;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al eliminar');
        }
    }
);

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
                state.entries = action.payload;
            })
            .addCase(fetchMonthEntries.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(assignOutfitToDate.fulfilled, (state, action) => {
                const idx = state.entries.findIndex((e) => e.date === action.payload.date);
                if (idx !== -1) {
                    state.entries[idx] = action.payload;
                } else {
                    state.entries.push(action.payload);
                }
            })
            .addCase(removeEntry.fulfilled, (state, action) => {
                state.entries = state.entries.filter((e) => {
                    const entryDate = typeof e.date === 'string' ? e.date.split('T')[0] : e.date;
                    return entryDate !== action.payload;
                });
            });
    },
});

export const { setSelectedDate } = calendarSlice.actions;
export default calendarSlice.reducer;
