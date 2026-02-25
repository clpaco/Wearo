// Slice de Mensajes Directos
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as msgSvc from '../services/messages.service';

// Thunk: Obtener conversaciones
export const fetchConversations = createAsyncThunk(
    'messages/fetchConversations',
    async (_, { rejectWithValue }) => {
        try {
            const data = await msgSvc.getConversations();
            return data.conversations;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al cargar conversaciones');
        }
    }
);

// Thunk: Obtener conteo de no leídos
export const fetchUnreadCount = createAsyncThunk(
    'messages/fetchUnreadCount',
    async (_, { rejectWithValue }) => {
        try {
            const data = await msgSvc.getUnreadCount();
            return data.unreadCount;
        } catch (err) {
            return rejectWithValue(0);
        }
    }
);

// Thunk: Buscar usuarios para chatear
export const searchUsers = createAsyncThunk(
    'messages/searchUsers',
    async (query, { rejectWithValue }) => {
        try {
            const data = await msgSvc.searchUsers(query);
            return data.users;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al buscar');
        }
    }
);

// Thunk: Iniciar conversación con un usuario
export const startConversation = createAsyncThunk(
    'messages/startConversation',
    async (userId, { rejectWithValue }) => {
        try {
            const data = await msgSvc.startConversation(userId);
            return data.conversation;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al iniciar conversación');
        }
    }
);

// Thunk: Obtener mensajes de una conversación
export const fetchMessages = createAsyncThunk(
    'messages/fetchMessages',
    async ({ conversationId, before = null }, { rejectWithValue }) => {
        try {
            const data = await msgSvc.getMessages(conversationId, { before });
            return { conversationId, messages: data.messages, hasMore: data.hasMore };
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al cargar mensajes');
        }
    }
);

// Thunk: Enviar mensaje de texto
export const sendMessage = createAsyncThunk(
    'messages/sendMessage',
    async ({ conversationId, text }, { rejectWithValue }) => {
        try {
            const data = await msgSvc.sendMessage(conversationId, text);
            return { conversationId, message: data.message };
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al enviar mensaje');
        }
    }
);

// Thunk: Enviar mensaje con media (foto/audio)
export const sendMediaMessage = createAsyncThunk(
    'messages/sendMediaMessage',
    async ({ conversationId, mediaUri, mediaType }, { rejectWithValue }) => {
        try {
            const data = await msgSvc.sendMediaMessage(conversationId, mediaUri, mediaType);
            return { conversationId, message: data.message };
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al enviar media');
        }
    }
);

// Thunk: Marcar como leídos
export const markAsRead = createAsyncThunk(
    'messages/markAsRead',
    async (conversationId, { rejectWithValue }) => {
        try {
            await msgSvc.markAsRead(conversationId);
            return conversationId;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error');
        }
    }
);

const messagesSlice = createSlice({
    name: 'messages',
    initialState: {
        conversations: [],
        chatMessages: {}, // { [conversationId]: Message[] }
        chatHasMore: {},  // { [conversationId]: boolean }
        searchResults: [],
        isSearching: false,
        unreadCount: 0,
        isLoading: false,
        isChatLoading: false,
        isSending: false,
        error: null,
    },
    reducers: {
        clearMessages: (state) => {
            state.conversations = [];
            state.chatMessages = {};
            state.chatHasMore = {};
            state.unreadCount = 0;
        },
        clearSearchResults: (state) => {
            state.searchResults = [];
        },
    },
    extraReducers: (builder) => {
        builder
            // Conversaciones
            .addCase(fetchConversations.pending, (state) => { state.isLoading = true; })
            .addCase(fetchConversations.fulfilled, (state, action) => {
                state.isLoading = false;
                state.conversations = action.payload;
            })
            .addCase(fetchConversations.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Unread count
            .addCase(fetchUnreadCount.fulfilled, (state, action) => {
                state.unreadCount = action.payload;
            })
            // Search users
            .addCase(searchUsers.pending, (state) => { state.isSearching = true; })
            .addCase(searchUsers.fulfilled, (state, action) => {
                state.isSearching = false;
                state.searchResults = action.payload;
            })
            .addCase(searchUsers.rejected, (state) => { state.isSearching = false; })
            // Start conversation
            .addCase(startConversation.fulfilled, (state, action) => {
                const conv = action.payload;
                const exists = state.conversations.find((c) => c.id === conv.id);
                if (!exists) {
                    state.conversations.unshift(conv);
                }
            })
            // Mensajes
            .addCase(fetchMessages.pending, (state) => { state.isChatLoading = true; })
            .addCase(fetchMessages.fulfilled, (state, action) => {
                state.isChatLoading = false;
                const { conversationId, messages, hasMore } = action.payload;
                const existing = state.chatMessages[conversationId] || [];
                // Si hay before, prepend; si no, reemplazar
                if (existing.length > 0 && messages.length > 0 && messages[messages.length - 1].id < existing[0].id) {
                    state.chatMessages[conversationId] = [...messages, ...existing];
                } else {
                    state.chatMessages[conversationId] = messages;
                }
                state.chatHasMore[conversationId] = hasMore;
            })
            .addCase(fetchMessages.rejected, (state) => { state.isChatLoading = false; })
            // Enviar texto
            .addCase(sendMessage.pending, (state) => { state.isSending = true; })
            .addCase(sendMessage.fulfilled, (state, action) => {
                state.isSending = false;
                const { conversationId, message } = action.payload;
                if (!state.chatMessages[conversationId]) {
                    state.chatMessages[conversationId] = [];
                }
                state.chatMessages[conversationId].push(message);
                const conv = state.conversations.find((c) => c.id === conversationId);
                if (conv) {
                    conv.last_message_text = message.text;
                    conv.last_message_at = message.created_at;
                }
            })
            .addCase(sendMessage.rejected, (state) => { state.isSending = false; })
            // Enviar media
            .addCase(sendMediaMessage.pending, (state) => { state.isSending = true; })
            .addCase(sendMediaMessage.fulfilled, (state, action) => {
                state.isSending = false;
                const { conversationId, message } = action.payload;
                if (!state.chatMessages[conversationId]) {
                    state.chatMessages[conversationId] = [];
                }
                state.chatMessages[conversationId].push(message);
                const conv = state.conversations.find((c) => c.id === conversationId);
                if (conv) {
                    conv.last_message_text = message.media_type === 'image' ? '📷 Foto' : '🎤 Audio';
                    conv.last_message_at = message.created_at;
                }
            })
            .addCase(sendMediaMessage.rejected, (state) => { state.isSending = false; })
            // Marcar leídos
            .addCase(markAsRead.fulfilled, (state, action) => {
                const convId = action.payload;
                const conv = state.conversations.find((c) => c.id === convId);
                if (conv) {
                    state.unreadCount = Math.max(0, state.unreadCount - (conv.unread_count || 0));
                    conv.unread_count = 0;
                }
            });
    },
});

export const { clearMessages, clearSearchResults } = messagesSlice.actions;
export default messagesSlice.reducer;
