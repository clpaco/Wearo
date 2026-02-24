// Slice Social — Redux Toolkit
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as socialSvc from '../services/social.service';

// Thunk: Obtener feed público
export const fetchFeed = createAsyncThunk(
    'social/fetchFeed',
    async ({ limit = 20, offset = 0 } = {}, { rejectWithValue }) => {
        try {
            const data = await socialSvc.getFeed(limit, offset);
            return { posts: data.posts, hasMore: data.hasMore, offset };
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al cargar el feed');
        }
    }
);

// Thunk: Compartir outfit
export const shareOutfit = createAsyncThunk(
    'social/share',
    async ({ outfitId, caption }, { rejectWithValue }) => {
        try {
            const data = await socialSvc.shareOutfit(outfitId, caption);
            return data.post;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al compartir');
        }
    }
);

// Thunk: Retirar del feed
export const unshareOutfit = createAsyncThunk(
    'social/unshare',
    async (sharedId, { rejectWithValue }) => {
        try {
            await socialSvc.unshareOutfit(sharedId);
            return sharedId;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al retirar');
        }
    }
);

// Thunk: Toggle like
export const toggleLike = createAsyncThunk(
    'social/toggleLike',
    async ({ sharedId, isLiked }, { rejectWithValue }) => {
        try {
            const data = isLiked
                ? await socialSvc.unlikePost(sharedId)
                : await socialSvc.likePost(sharedId);
            return { sharedId, likeCount: data.likeCount, likedByMe: data.likedByMe };
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error con el like');
        }
    }
);

// Thunk: Obtener comentarios de un post
export const fetchComments = createAsyncThunk(
    'social/fetchComments',
    async (postId, { rejectWithValue }) => {
        try {
            const data = await socialSvc.getComments(postId);
            return { postId, comments: data.comments };
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al cargar comentarios');
        }
    }
);

// Thunk: Añadir comentario
export const addComment = createAsyncThunk(
    'social/addComment',
    async ({ postId, text }, { rejectWithValue }) => {
        try {
            const data = await socialSvc.postComment(postId, text);
            return { postId, comment: data.comment };
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al comentar');
        }
    }
);

// Thunk: Eliminar comentario
export const removeComment = createAsyncThunk(
    'social/removeComment',
    async ({ postId, commentId }, { rejectWithValue }) => {
        try {
            await socialSvc.deleteComment(postId, commentId);
            return { postId, commentId };
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al eliminar comentario');
        }
    }
);

const socialSlice = createSlice({
    name: 'social',
    initialState: {
        feed: [],
        hasMore: true,
        isLoading: false,
        isRefreshing: false,
        error: null,
        comments: {}, // postId → array de comentarios
        commentsLoading: false,
    },
    reducers: {
        clearSocialError: (state) => { state.error = null; },
        resetFeed: (state) => { state.feed = []; state.hasMore = true; },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchFeed.pending, (state, action) => {
                if (action.meta.arg?.offset === 0 || !action.meta.arg?.offset) {
                    state.isRefreshing = true;
                }
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchFeed.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isRefreshing = false;
                state.hasMore = action.payload.hasMore;
                if (action.payload.offset === 0 || !action.payload.offset) {
                    state.feed = action.payload.posts;
                } else {
                    state.feed = [...state.feed, ...action.payload.posts];
                }
            })
            .addCase(fetchFeed.rejected, (state, action) => {
                state.isLoading = false;
                state.isRefreshing = false;
                state.error = action.payload;
            })
            .addCase(shareOutfit.fulfilled, (state, action) => {
                if (action.payload) {
                    state.feed.unshift(action.payload);
                }
            })
            .addCase(unshareOutfit.fulfilled, (state, action) => {
                state.feed = state.feed.filter((p) => p.id !== action.payload);
            })
            .addCase(toggleLike.fulfilled, (state, action) => {
                const post = state.feed.find((p) => p.id === action.payload.sharedId);
                if (post) {
                    post.like_count = action.payload.likeCount;
                    post.liked_by_me = action.payload.likedByMe;
                }
            })
            // Comentarios
            .addCase(fetchComments.pending, (state) => {
                state.commentsLoading = true;
            })
            .addCase(fetchComments.fulfilled, (state, action) => {
                state.commentsLoading = false;
                state.comments[action.payload.postId] = action.payload.comments;
            })
            .addCase(fetchComments.rejected, (state) => {
                state.commentsLoading = false;
            })
            .addCase(addComment.fulfilled, (state, action) => {
                const { postId, comment } = action.payload;
                if (!state.comments[postId]) state.comments[postId] = [];
                state.comments[postId] = [...state.comments[postId], comment];
                // Incrementar contador en el feed
                const post = state.feed.find((p) => p.id === postId);
                if (post) post.comment_count = (post.comment_count || 0) + 1;
            })
            .addCase(removeComment.fulfilled, (state, action) => {
                const { postId, commentId } = action.payload;
                if (state.comments[postId]) {
                    state.comments[postId] = state.comments[postId].filter((c) => c.id !== commentId);
                }
                const post = state.feed.find((p) => p.id === postId);
                if (post && post.comment_count > 0) post.comment_count -= 1;
            });
    },
});

export const { clearSocialError, resetFeed } = socialSlice.actions;
export default socialSlice.reducer;
