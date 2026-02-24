// Slice de autenticación — Redux Toolkit
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as authService from '../services/auth.service';

// Thunk: Iniciar sesión
export const loginUser = createAsyncThunk(
    'auth/login',
    async ({ email, password }, { rejectWithValue }) => {
        try {
            const data = await authService.login(email, password);
            return data;
        } catch (err) {
            return rejectWithValue(err.mensaje || 'Error al iniciar sesión');
        }
    }
);

// Thunk: Registrar usuario
export const registerUser = createAsyncThunk(
    'auth/register',
    async ({ email, password, fullName }, { rejectWithValue }) => {
        try {
            const data = await authService.register(email, password, fullName);
            return data;
        } catch (err) {
            return rejectWithValue(err.mensaje || 'Error al registrarse');
        }
    }
);

// Thunk: Cerrar sesión
export const logoutUser = createAsyncThunk('auth/logout', async () => {
    await authService.logout();
});

// Thunk: Restaurar sesión guardada
export const restoreSession = createAsyncThunk('auth/restore', async (_, { rejectWithValue }) => {
    try {
        const session = await authService.getStoredSession();
        if (!session) return rejectWithValue('Sin sesión guardada');
        return session;
    } catch (err) {
        return rejectWithValue('Error restaurando sesión');
    }
});

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        isRestoringSession: true, // true mientras comprobamos AsyncStorage
        error: null,
    },
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Login
            .addCase(loginUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload.usuario;
                state.accessToken = action.payload.accessToken;
                state.refreshToken = action.payload.refreshToken;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Register
            .addCase(registerUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(registerUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload.usuario;
                state.accessToken = action.payload.accessToken;
                state.refreshToken = action.payload.refreshToken;
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Logout
            .addCase(logoutUser.fulfilled, (state) => {
                state.user = null;
                state.accessToken = null;
                state.refreshToken = null;
                state.isAuthenticated = false;
                state.error = null;
            })
            // Restore session
            .addCase(restoreSession.fulfilled, (state, action) => {
                state.isRestoringSession = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.accessToken = action.payload.accessToken;
                state.refreshToken = action.payload.refreshToken;
            })
            .addCase(restoreSession.rejected, (state) => {
                state.isRestoringSession = false;
            });
    },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
