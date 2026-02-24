// Pantalla de Perfil — perfil propio y de otros usuarios con seguidores
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View, Text, Image, TouchableOpacity, FlatList,
    StyleSheet, ActivityIndicator, StatusBar, ScrollView,
    RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchMyProfile, fetchUserProfile, fetchUserPosts,
    toggleFollow, fetchFollowers, fetchFollowing, clearViewedProfile,
} from '../store/profileSlice';
import { fetchComments, addComment, removeComment, toggleLike } from '../store/socialSlice';
import { logoutUser } from '../store/authSlice';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { IMAGE_BASE_URL } from '../services/api';
import ScreenHeader from '../components/ScreenHeader';

const StatBadge = ({ label, value, onPress, colors }) => (
    <TouchableOpacity style={styles.statBadge} onPress={onPress} disabled={!onPress}>
        <Text style={[styles.statValue, { color: colors.text }]}>{value ?? 0}</Text>
        <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </TouchableOpacity>
);

const UserRow = ({ item, colors, onPress }) => (
    <TouchableOpacity style={[styles.userRow, { borderBottomColor: colors.border }]} onPress={onPress}>
        <View style={[styles.rowAvatar, { backgroundColor: colors.primary + '20' }]}>
            {item.avatar_url ? (
                <Image source={{ uri: `${IMAGE_BASE_URL}${item.avatar_url}` }} style={styles.rowAvatarImg} />
            ) : (
                <Text style={[styles.rowAvatarText, { color: colors.primary }]}>
                    {(item.full_name || '?')[0].toUpperCase()}
                </Text>
            )}
        </View>
        <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>{item.full_name}</Text>
    </TouchableOpacity>
);

const getTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return days < 7 ? `${days}d` : `${Math.floor(days / 7)}sem`;
};

const ProfileScreen = ({ navigation, route }) => {
    const dispatch = useDispatch();
    const { user }           = useSelector((s) => s.auth);
    const {
        myProfile, viewedProfile, viewedPosts, viewedHasMore,
        followers, following, isLoading,
    } = useSelector((s) => s.profile);
    const { comments, commentsLoading } = useSelector((s) => s.social);

    const { theme } = useTheme();
    const c = theme.colors;

    const targetId   = route?.params?.userId;
    const isOwnProfile = !targetId || String(targetId) === String(user?.id);
    const canEdit    = !targetId;
    const profile    = isOwnProfile ? myProfile : viewedProfile;

    const [listModal, setListModal] = useState(null);
    const [refreshing, setRefreshing]  = useState(false);

    // Post detail + comments
    const [selectedPost, setSelectedPost] = useState(null);
    const [commentInput, setCommentInput] = useState('');
    const commentInputRef = useRef(null);

    const load = useCallback(() => {
        if (isOwnProfile) {
            dispatch(fetchMyProfile());
        } else {
            dispatch(clearViewedProfile());
            dispatch(fetchUserProfile(targetId));
        }
        dispatch(fetchUserPosts({ userId: targetId || user?.id, offset: 0 }));
    }, [targetId, isOwnProfile, user?.id]);

    useEffect(() => { load(); }, [load]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        Promise.all([
            isOwnProfile ? dispatch(fetchMyProfile()) : dispatch(fetchUserProfile(targetId)),
            dispatch(fetchUserPosts({ userId: targetId || user?.id, offset: 0 })),
        ]).finally(() => setRefreshing(false));
    }, [targetId, isOwnProfile, user?.id]);

    const handleFollow = () => {
        if (!profile) return;
        dispatch(toggleFollow({ userId: profile.id, isFollowing: profile.is_following }));
    };

    const openFollowers = () => {
        dispatch(fetchFollowers(profile.id));
        setListModal('followers');
    };

    const openFollowing = () => {
        dispatch(fetchFollowing(profile.id));
        setListModal('following');
    };

    const loadMorePosts = () => {
        if (viewedHasMore) {
            dispatch(fetchUserPosts({ userId: targetId || user?.id, offset: viewedPosts.length }));
        }
    };

    const openPostDetail = (post) => {
        setSelectedPost(post);
        setCommentInput('');
        dispatch(fetchComments(post.id));
    };

    const handleSendComment = () => {
        const text = commentInput.trim();
        if (!text || !selectedPost) return;
        setCommentInput('');
        dispatch(addComment({ postId: selectedPost.id, text }));
    };

    const handleDeleteComment = (commentId) => {
        if (!selectedPost) return;
        dispatch(removeComment({ postId: selectedPost.id, commentId }));
    };

    const handlePostLike = () => {
        if (!selectedPost) return;
        dispatch(toggleLike({ sharedId: selectedPost.id, isLiked: selectedPost.liked_by_me }));
        setSelectedPost((prev) => prev ? {
            ...prev,
            liked_by_me: !prev.liked_by_me,
            like_count: prev.liked_by_me ? (prev.like_count || 1) - 1 : (prev.like_count || 0) + 1,
        } : null);
    };

    if (isLoading && !profile) {
        return (
            <View style={[styles.container, styles.center, { backgroundColor: c.background }]}>
                <StatusBar barStyle={c.statusBar} />
                <ActivityIndicator size="large" color={c.primary} />
            </View>
        );
    }

    const avatarUri = profile?.avatar_url ? `${IMAGE_BASE_URL}${profile.avatar_url}` : null;
    const displayName = profile?.full_name || 'Usuario';
    const modalList = listModal === 'followers' ? followers : following;

    const renderPost = ({ item: post }) => {
        const thumb = post.garments?.[0]?.image_url;
        return (
            <TouchableOpacity
                style={[styles.postThumb, { backgroundColor: c.surfaceVariant, borderColor: c.border }]}
                onPress={() => openPostDetail(post)}
                activeOpacity={0.8}
            >
                {thumb ? (
                    <Image source={{ uri: `${IMAGE_BASE_URL}${thumb}` }} style={styles.postThumbImg} />
                ) : (
                    <Ionicons name="albums-outline" size={26} color={c.textMuted} />
                )}
                <View style={[styles.postThumbOverlay, { backgroundColor: 'rgba(0,0,0,0.28)' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Ionicons name="heart" size={12} color="#FFF" />
                        <Text style={styles.postThumbLike}>{post.like_count}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const postComments = selectedPost ? (comments[selectedPost.id] || []) : [];

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <StatusBar barStyle={c.statusBar} />
            <ScreenHeader
                title={isOwnProfile ? 'Mi Perfil' : (profile?.full_name || 'Perfil')}
                onBack={!isOwnProfile ? () => navigation.goBack() : undefined}
                rightAction={
                    canEdit ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('EditProfile')}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Text style={{ fontSize: 14, fontWeight: '700', color: c.primary }}>Editar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => dispatch(logoutUser())}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Ionicons name="log-out-outline" size={22} color={c.error} />
                            </TouchableOpacity>
                        </View>
                    ) : null
                }
            />

            <FlatList
                data={viewedPosts}
                keyExtractor={(item) => item.id.toString()}
                numColumns={3}
                contentContainerStyle={styles.gridContent}
                columnWrapperStyle={styles.gridRow}
                renderItem={renderPost}
                onEndReached={loadMorePosts}
                onEndReachedThreshold={0.4}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
                ListEmptyComponent={
                    <Text style={[styles.noPosts, { color: c.textMuted }]}>Sin posts todavía</Text>
                }
                ListHeaderComponent={
                    <View>
                        {/* Avatar + info */}
                        <View style={styles.profileHeader}>
                            <View style={[styles.avatarWrap, { backgroundColor: c.primary + '20', borderColor: c.primary + '40' }]}>
                                {avatarUri ? (
                                    <Image source={{ uri: avatarUri }} style={styles.avatar} />
                                ) : (
                                    <Text style={[styles.avatarInitial, { color: c.primary }]}>
                                        {displayName[0].toUpperCase()}
                                    </Text>
                                )}
                            </View>
                            <Text style={[styles.displayName, { color: c.text }]}>{displayName}</Text>
                            {profile?.bio ? (
                                <Text style={[styles.bio, { color: c.textSecondary }]}>{profile.bio}</Text>
                            ) : null}

                            {!isOwnProfile && profile && (
                                <TouchableOpacity
                                    style={[
                                        styles.followBtn,
                                        { backgroundColor: profile.is_following ? 'transparent' : c.primary,
                                          borderColor: c.primary },
                                    ]}
                                    onPress={handleFollow}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[
                                        styles.followBtnText,
                                        { color: profile.is_following ? c.primary : '#FFF' },
                                    ]}>
                                        {profile.is_following ? 'Siguiendo' : 'Seguir'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Estadísticas */}
                        <View style={[styles.statsRow, { borderTopColor: c.border, borderBottomColor: c.border }]}>
                            <StatBadge label="Posts"     value={profile?.post_count}      colors={c} />
                            <View style={[styles.statDivider, { backgroundColor: c.border }]} />
                            <StatBadge label="Prendas"   value={profile?.garment_count}   colors={c} />
                            <View style={[styles.statDivider, { backgroundColor: c.border }]} />
                            <StatBadge label="Outfits"   value={profile?.outfit_count}    colors={c} />
                            <View style={[styles.statDivider, { backgroundColor: c.border }]} />
                            <StatBadge label="Seguidores" value={profile?.follower_count}  colors={c} onPress={openFollowers} />
                            <View style={[styles.statDivider, { backgroundColor: c.border }]} />
                            <StatBadge label="Siguiendo"  value={profile?.following_count} colors={c} onPress={openFollowing} />
                        </View>

                        <Text style={[styles.sectionTitle, { color: c.textSecondary, borderBottomColor: c.border }]}>
                            Publicaciones
                        </Text>
                    </View>
                }
            />

            {/* Modal lista seguidores / seguidos */}
            <Modal visible={!!listModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalBox, { backgroundColor: c.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: c.text }]}>
                                {listModal === 'followers' ? 'Seguidores' : 'Siguiendo'}
                            </Text>
                            <TouchableOpacity onPress={() => setListModal(null)}>
                                <Ionicons name="close" size={22} color={c.primary} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={modalList}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <UserRow
                                    item={item}
                                    colors={c}
                                    onPress={() => {
                                        setListModal(null);
                                        navigation.push('UserProfile', { userId: item.id });
                                    }}
                                />
                            )}
                            ListEmptyComponent={
                                <Text style={[styles.noPosts, { color: c.textMuted }]}>Ningún usuario aún</Text>
                            }
                        />
                    </View>
                </View>
            </Modal>

            {/* Modal detalle de post con comentarios */}
            <Modal visible={!!selectedPost} animationType="slide" transparent onRequestClose={() => setSelectedPost(null)}>
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={[styles.postDetailBox, { backgroundColor: c.surface }]}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <Ionicons name="albums-outline" size={18} color={c.text} style={{ marginRight: 6 }} />
                                    <Text style={[styles.modalTitle, { color: c.text }]} numberOfLines={1}>
                                        {selectedPost?.outfit?.name || selectedPost?.outfit_name || 'Outfit'}
                                    </Text>
                                </View>
                                {selectedPost?.caption ? (
                                    <Text style={[styles.postCaption, { color: c.textSecondary }]} numberOfLines={2}>
                                        {selectedPost.caption}
                                    </Text>
                                ) : null}
                            </View>
                            <TouchableOpacity onPress={() => setSelectedPost(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons name="close" size={22} color={c.primary} />
                            </TouchableOpacity>
                        </View>

                        {/* Garments grid */}
                        {(selectedPost?.garments || []).length > 0 && (
                            <View style={styles.detailGarmentGrid}>
                                {selectedPost.garments.map((g) => (
                                    <View key={g.id} style={[styles.detailGarmentThumb, { backgroundColor: c.surfaceVariant, borderColor: c.border }]}>
                                        {g.image_url ? (
                                            <Image source={{ uri: `${IMAGE_BASE_URL}${g.image_url}` }} style={styles.detailGarmentImg} resizeMode="cover" />
                                        ) : (
                                            <View style={styles.detailGarmentPlaceholder}>
                                                <Ionicons name="shirt-outline" size={24} color={c.textMuted} />
                                            </View>
                                        )}
                                        <Text style={[styles.detailGarmentName, { color: c.text }]} numberOfLines={1}>{g.name}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Actions bar: like + comment count + occasion */}
                        <View style={[styles.postStats, { borderBottomColor: c.border }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={handlePostLike}>
                                    <Ionicons
                                        name={selectedPost?.liked_by_me ? 'heart' : 'heart-outline'}
                                        size={22}
                                        color={selectedPost?.liked_by_me ? c.error : c.text}
                                    />
                                    <Text style={[styles.postStatText, { color: c.text, fontWeight: '700' }]}>{selectedPost?.like_count || 0}</Text>
                                </TouchableOpacity>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Ionicons name="chatbubble-outline" size={18} color={c.textMuted} />
                                    <Text style={[styles.postStatText, { color: c.textMuted }]}>{postComments.length}</Text>
                                </View>
                            </View>
                            {selectedPost?.outfit?.occasion && (
                                <View style={[styles.detailOccasionBadge, { backgroundColor: c.primary + '15' }]}>
                                    <Text style={[styles.detailOccasionText, { color: c.primary }]}>{selectedPost.outfit.occasion}</Text>
                                </View>
                            )}
                        </View>

                        {/* Comentarios */}
                        <Text style={[styles.commentsLabel, { color: c.textSecondary }]}>Comentarios</Text>
                        {commentsLoading ? (
                            <ActivityIndicator style={{ paddingVertical: 24 }} color={c.primary} />
                        ) : (
                            <FlatList
                                data={postComments}
                                keyExtractor={(item) => item.id.toString()}
                                style={styles.commentsList}
                                contentContainerStyle={{ paddingBottom: 8 }}
                                ListEmptyComponent={
                                    <Text style={[styles.noComments, { color: c.textMuted }]}>
                                        Sin comentarios aún. ¡Sé el primero!
                                    </Text>
                                }
                                renderItem={({ item: comment }) => {
                                    const isOwn = comment.author?.id === user?.id;
                                    return (
                                        <View style={[styles.commentRow, { borderBottomColor: c.border }]}>
                                            <View style={[styles.commentAvatar, { backgroundColor: c.primary + '20' }]}>
                                                {comment.author?.avatarUrl ? (
                                                    <Image source={{ uri: `${IMAGE_BASE_URL}${comment.author.avatarUrl}` }} style={styles.commentAvatarImg} />
                                                ) : (
                                                    <Text style={[styles.commentAvatarText, { color: c.primary }]}>
                                                        {(comment.author?.fullName || '?')[0].toUpperCase()}
                                                    </Text>
                                                )}
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <View style={styles.commentMeta}>
                                                    <Text style={[styles.commentAuthor, { color: c.text }]}>
                                                        {comment.author?.fullName || 'Usuario'}
                                                    </Text>
                                                    <Text style={[styles.commentTime, { color: c.textMuted }]}>
                                                        {getTimeAgo(comment.created_at)}
                                                    </Text>
                                                </View>
                                                <Text style={[styles.commentText, { color: c.textSecondary }]}>
                                                    {comment.text}
                                                </Text>
                                            </View>
                                            {isOwn && (
                                                <TouchableOpacity
                                                    onPress={() => handleDeleteComment(comment.id)}
                                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                    style={{ marginLeft: 8 }}
                                                >
                                                    <Ionicons name="trash-outline" size={16} color={c.error} />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    );
                                }}
                            />
                        )}

                        {/* Input comentario */}
                        <View style={[styles.commentInputBar, { borderTopColor: c.border }]}>
                            <TextInput
                                ref={commentInputRef}
                                style={[styles.commentInput, { color: c.text, backgroundColor: c.surfaceVariant, borderColor: c.border }]}
                                placeholder="Escribe un comentario…"
                                placeholderTextColor={c.textMuted}
                                value={commentInput}
                                onChangeText={setCommentInput}
                                maxLength={500}
                                returnKeyType="send"
                                onSubmitEditing={handleSendComment}
                            />
                            <TouchableOpacity
                                style={[styles.commentSendBtn, { backgroundColor: commentInput.trim() ? c.primary : c.border }]}
                                onPress={handleSendComment}
                                disabled={!commentInput.trim()}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="arrow-up" size={18} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

const THUMB_SIZE = '33%';

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { justifyContent: 'center', alignItems: 'center' },

    profileHeader: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
    avatarWrap: {
        width: 96, height: 96, borderRadius: 48, borderWidth: 2,
        justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 12,
    },
    avatar: { width: 96, height: 96, borderRadius: 48 },
    avatarInitial: { fontSize: 40, fontWeight: '800' },
    displayName: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
    bio: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 12 },

    followBtn: {
        paddingHorizontal: 32, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, marginTop: 4,
    },
    followBtnText: { fontSize: 15, fontWeight: '700' },

    statsRow: {
        flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 12,
    },
    statBadge: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 18, fontWeight: '800' },
    statLabel: { fontSize: 11, fontWeight: '500', marginTop: 2 },
    statDivider: { width: 1 },

    sectionTitle: {
        paddingHorizontal: 16, paddingVertical: 10, fontSize: 13, fontWeight: '600',
        borderBottomWidth: 0.5, textTransform: 'uppercase', letterSpacing: 0.5,
    },

    gridContent: { paddingBottom: 32 },
    gridRow: { gap: 2 },
    postThumb: {
        width: THUMB_SIZE, aspectRatio: 1, justifyContent: 'center', alignItems: 'center',
        borderWidth: 0.5, overflow: 'hidden',
    },
    postThumbImg: { width: '100%', height: '100%' },
    postThumbOverlay: {
        ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: 4,
    },
    postThumbLike: { color: '#FFF', fontSize: 11, fontWeight: '700' },
    noPosts: { textAlign: 'center', marginTop: 40, fontSize: 14 },

    // Seguidores modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', paddingBottom: 32 },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 20, paddingBottom: 12,
    },
    modalTitle: { fontSize: 18, fontWeight: '700' },
    modalClose: { fontSize: 22, fontWeight: '700' },
    userRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
    rowAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
    rowAvatarImg: { width: 44, height: 44, borderRadius: 22 },
    rowAvatarText: { fontSize: 18, fontWeight: '800' },
    rowName: { fontSize: 16, fontWeight: '600' },

    // Post detail modal
    postDetailBox: {
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        maxHeight: '85%', paddingTop: 4,
    },
    postCaption: { fontSize: 13, marginTop: 2 },
    postStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 0.5 },
    postStatText: { fontSize: 14 },

    // Detail garments grid
    detailGarmentGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
    detailGarmentThumb: { width: 90, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
    detailGarmentImg: { width: 90, height: 90 },
    detailGarmentPlaceholder: { width: 90, height: 90, justifyContent: 'center', alignItems: 'center' },
    detailGarmentName: { fontSize: 11, fontWeight: '500', paddingHorizontal: 6, paddingVertical: 4, textAlign: 'center' },
    detailOccasionBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
    detailOccasionText: { fontSize: 12, fontWeight: '600' },
    commentsLabel: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
    commentsList: { flex: 1 },
    noComments: { textAlign: 'center', padding: 24, fontSize: 14 },
    commentRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 0.5 },
    commentAvatar: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginRight: 10, overflow: 'hidden' },
    commentAvatarImg: { width: 34, height: 34, borderRadius: 17 },
    commentAvatarText: { fontSize: 14, fontWeight: '700' },
    commentMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
    commentAuthor: { fontSize: 13, fontWeight: '700' },
    commentTime: { fontSize: 11 },
    commentText: { fontSize: 14, lineHeight: 19 },
    commentInputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 16, borderTopWidth: 1, gap: 8 },
    commentInput: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14 },
    commentSendBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
});

export default ProfileScreen;
