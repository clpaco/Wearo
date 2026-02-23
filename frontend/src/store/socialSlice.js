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

const socialSlice = createSlice({
    name: 'social',
    initialState: {
        feed: [],
        hasMore: true,
        isLoading: false,
        isRefreshing: false,
        error: null,
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
            });
    },
});

export const { clearSocialError, resetFeed } = socialSlice.actions;
export default socialSlice.reducer;
