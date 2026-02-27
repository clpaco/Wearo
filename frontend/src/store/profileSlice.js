// Slice de Perfil — Redux Toolkit
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as profileSvc from '../services/profile.service';

// ── Thunks ────────────────────────────────────────────────────────────────────

export const fetchMyProfile = createAsyncThunk(
    'profile/fetchMe',
    async (_, { rejectWithValue }) => {
        try {
            const data = await profileSvc.getMyProfile();
            return data.profile;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al cargar perfil');
        }
    }
);

export const fetchUserProfile = createAsyncThunk(
    'profile/fetchUser',
    async (userId, { rejectWithValue }) => {
        try {
            const data = await profileSvc.getUserProfile(userId);
            return data.profile;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al cargar perfil');
        }
    }
);

export const fetchUserPosts = createAsyncThunk(
    'profile/fetchUserPosts',
    async ({ userId, offset = 0 }, { rejectWithValue }) => {
        try {
            const data = await profileSvc.getUserPosts(userId, 20, offset);
            return { posts: data.posts, hasMore: data.hasMore, offset };
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al cargar posts');
        }
    }
);

export const updateMyProfile = createAsyncThunk(
    'profile/updateMe',
    async (fields, { rejectWithValue }) => {
        try {
            const data = await profileSvc.updateMyProfile(fields);
            return data.profile;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al actualizar perfil');
        }
    }
);

export const uploadAvatar = createAsyncThunk(
    'profile/uploadAvatar',
    async (formData, { rejectWithValue }) => {
        try {
            const data = await profileSvc.uploadAvatar(formData);
            return data.profile;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al subir avatar');
        }
    }
);

export const toggleFollow = createAsyncThunk(
    'profile/toggleFollow',
    async ({ userId, isFollowing, hasPendingRequest }, { rejectWithValue }) => {
        try {
            const data = (isFollowing || hasPendingRequest)
                ? await profileSvc.unfollowUser(userId)
                : await profileSvc.followUser(userId);
            return {
                userId,
                is_following: data.is_following,
                has_pending_request: data.has_pending_request || false,
                follower_count: data.follower_count,
            };
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al seguir');
        }
    }
);

export const toggleVisibility = createAsyncThunk(
    'profile/toggleVisibility',
    async (isPublic, { rejectWithValue }) => {
        try {
            const data = await profileSvc.updateMyProfile({ isPublic });
            return data.profile;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al cambiar visibilidad');
        }
    }
);

export const fetchFollowers = createAsyncThunk(
    'profile/fetchFollowers',
    async (userId, { rejectWithValue }) => {
        try {
            const data = await profileSvc.getFollowers(userId);
            return data.users;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al cargar seguidores');
        }
    }
);

export const fetchFollowing = createAsyncThunk(
    'profile/fetchFollowing',
    async (userId, { rejectWithValue }) => {
        try {
            const data = await profileSvc.getFollowing(userId);
            return data.users;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al cargar seguidos');
        }
    }
);

// ── Solicitudes de seguimiento ──────────────────────────────────────────────

export const fetchFollowRequests = createAsyncThunk(
    'profile/fetchFollowRequests',
    async (_, { rejectWithValue }) => {
        try {
            const data = await profileSvc.getFollowRequests();
            return data.requests;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al cargar solicitudes');
        }
    }
);

export const acceptRequest = createAsyncThunk(
    'profile/acceptRequest',
    async (requestId, { rejectWithValue }) => {
        try {
            await profileSvc.acceptFollowRequest(requestId);
            return requestId;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al aceptar solicitud');
        }
    }
);

export const rejectRequest = createAsyncThunk(
    'profile/rejectRequest',
    async (requestId, { rejectWithValue }) => {
        try {
            await profileSvc.rejectFollowRequest(requestId);
            return requestId;
        } catch (err) {
            return rejectWithValue(err.response?.data?.mensaje || 'Error al rechazar solicitud');
        }
    }
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const profileSlice = createSlice({
    name: 'profile',
    initialState: {
        myProfile: null,
        viewedProfile: null,
        viewedPosts: [],
        viewedHasMore: true,
        followers: [],
        following: [],
        followRequests: [],
        isLoading: false,
        isSaving: false,
        error: null,
    },
    reducers: {
        clearViewedProfile: (state) => {
            state.viewedProfile = null;
            state.viewedPosts = [];
            state.viewedHasMore = true;
        },
        clearProfileError: (state) => { state.error = null; },
    },
    extraReducers: (builder) => {
        builder
            // fetchMyProfile
            .addCase(fetchMyProfile.pending,   (state) => { state.isLoading = true; })
            .addCase(fetchMyProfile.fulfilled, (state, { payload }) => { state.isLoading = false; state.myProfile = payload; })
            .addCase(fetchMyProfile.rejected,  (state, { payload }) => { state.isLoading = false; state.error = payload; })

            // fetchUserProfile
            .addCase(fetchUserProfile.pending,   (state) => { state.isLoading = true; })
            .addCase(fetchUserProfile.fulfilled, (state, { payload }) => { state.isLoading = false; state.viewedProfile = payload; })
            .addCase(fetchUserProfile.rejected,  (state, { payload }) => { state.isLoading = false; state.error = payload; })

            // fetchUserPosts
            .addCase(fetchUserPosts.fulfilled, (state, { payload }) => {
                state.viewedHasMore = payload.hasMore;
                state.viewedPosts = payload.offset === 0
                    ? payload.posts
                    : [...state.viewedPosts, ...payload.posts];
            })

            // updateMyProfile / uploadAvatar
            .addCase(updateMyProfile.pending,   (state) => { state.isSaving = true; })
            .addCase(updateMyProfile.fulfilled, (state, { payload }) => { state.isSaving = false; state.myProfile = payload; })
            .addCase(updateMyProfile.rejected,  (state, { payload }) => { state.isSaving = false; state.error = payload; })

            .addCase(uploadAvatar.pending,   (state) => { state.isSaving = true; })
            .addCase(uploadAvatar.fulfilled, (state, { payload }) => { state.isSaving = false; state.myProfile = payload; })
            .addCase(uploadAvatar.rejected,  (state, { payload }) => { state.isSaving = false; state.error = payload; })

            // toggleFollow
            .addCase(toggleFollow.fulfilled, (state, { payload }) => {
                if (state.viewedProfile && String(state.viewedProfile.id) === String(payload.userId)) {
                    state.viewedProfile.is_following        = payload.is_following;
                    state.viewedProfile.has_pending_request = payload.has_pending_request;
                    if (payload.follower_count != null) {
                        state.viewedProfile.follower_count = payload.follower_count;
                    }
                }
            })

            // toggleVisibility
            .addCase(toggleVisibility.fulfilled, (state, { payload }) => {
                state.myProfile = { ...state.myProfile, ...payload };
            })

            // followers / following
            .addCase(fetchFollowers.fulfilled, (state, { payload }) => { state.followers = payload; })
            .addCase(fetchFollowing.fulfilled, (state, { payload }) => { state.following = payload; })

            // follow requests
            .addCase(fetchFollowRequests.fulfilled, (state, { payload }) => { state.followRequests = payload; })
            .addCase(acceptRequest.fulfilled, (state, { payload }) => {
                state.followRequests = state.followRequests.filter((r) => r.id !== payload);
                if (state.myProfile) {
                    state.myProfile.pending_requests_count = Math.max(0, (state.myProfile.pending_requests_count || 1) - 1);
                    state.myProfile.follower_count = (state.myProfile.follower_count || 0) + 1;
                }
            })
            .addCase(rejectRequest.fulfilled, (state, { payload }) => {
                state.followRequests = state.followRequests.filter((r) => r.id !== payload);
                if (state.myProfile) {
                    state.myProfile.pending_requests_count = Math.max(0, (state.myProfile.pending_requests_count || 1) - 1);
                }
            });
    },
});

export const { clearViewedProfile, clearProfileError } = profileSlice.actions;
export default profileSlice.reducer;
