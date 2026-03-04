// Pantalla de Perfil — perfil propio y de otros usuarios con seguidores
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View, Text, Image, TouchableOpacity, FlatList,
    StyleSheet, ActivityIndicator, StatusBar, ScrollView,
    RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform, Dimensions, Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchMyProfile, fetchUserProfile, fetchUserPosts,
    toggleFollow, fetchFollowers, fetchFollowing, clearViewedProfile,
    toggleVisibility, fetchFollowRequests, acceptRequest, rejectRequest,
} from '../store/profileSlice';
import { fetchComments, addComment, removeComment, toggleLike } from '../store/socialSlice';
import { logoutUser } from '../store/authSlice';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { IMAGE_BASE_URL } from '../services/api';
import { startConversation, fetchConversations } from '../store/messagesSlice';
import { sendSharedPostMessage } from '../services/messages.service';
import { useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import GarmentCarousel from '../components/GarmentCarousel';
import { getLikers } from '../services/social.service';
import { toggleUser as adminToggleUser } from '../services/admin.service';
import { getMyStats as getAdminMyStats, submitSupportTicket } from '../services/admin.service';

const { width: SCREEN_W } = Dimensions.get('window');
const WEARO_LOGO = require('../../assets/logo.png');

const StatBadge = ({ label, value, onPress, colors }) => (
    <TouchableOpacity style={styles.statBadge} onPress={onPress} disabled={!onPress}>
        <Text style={[styles.statValue, { color: colors.text }]}>{value ?? 0}</Text>
        <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </TouchableOpacity>
);

const UserRow = ({ item, colors, onPress, isWearo }) => (
    <TouchableOpacity style={[styles.userRow, { borderBottomColor: colors.border }]} onPress={onPress}>
        <View style={[styles.rowAvatar, { backgroundColor: isWearo ? 'transparent' : (colors.primary + '20') }]}>
            {isWearo ? (
                <Image source={WEARO_LOGO} style={styles.rowAvatarImg} resizeMode="cover" />
            ) : item.avatar_url ? (
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
        followers, following, followRequests, isLoading, error: profileError,
    } = useSelector((s) => s.profile);
    const { comments, commentsLoading } = useSelector((s) => s.social);

    const { theme } = useTheme();
    const c = theme.colors;

    const targetId   = route?.params?.userId;
    const isWearo    = route?.params?.isWearo || false;
    const isOwnProfile = !targetId || String(targetId) === String(user?.id);
    const canEdit    = (!targetId && !isWearo) || (isOwnProfile && user?.role === 'admin');
    const profile    = isOwnProfile ? myProfile : viewedProfile;
    const isViewingAdmin = isWearo || (profile?.role === 'admin') || (isOwnProfile && user?.role === 'admin');

    const [listModal, setListModal] = useState(null);
    const [refreshing, setRefreshing]  = useState(false);
    const [likers, setLikers] = useState([]);
    const [showLikers, setShowLikers] = useState(false);
    const [showRequests, setShowRequests] = useState(false);

    // Post detail + comments
    const [selectedPost, setSelectedPost] = useState(null);

    // Standalone comments modal (like SocialScreen)
    const [commentsPostId, setCommentsPostId] = useState(null);
    const [showComments, setShowComments] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [expandedReplies, setExpandedReplies] = useState({});
    const commentsInputRef = useRef(null);
    const [commentsInput, setCommentsInput] = useState('');

    // Share via DM
    const [sharePostId, setSharePostId] = useState(null);
    const [showShareDM, setShowShareDM] = useState(false);
    const conversations = useSelector((s) => s.messages.conversations);

    // Admin stats
    const [adminStats, setAdminStats] = useState(null);

    // Contactar modal (soporte)
    const [showContactar, setShowContactar] = useState(false);
    const [contactMessage, setContactMessage] = useState('');
    const [sendingTicket, setSendingTicket] = useState(false);

    const load = useCallback(() => {
        dispatch(clearViewedProfile());
        if (isOwnProfile) {
            dispatch(fetchMyProfile());
        } else {
            dispatch(fetchUserProfile(targetId));
        }
        dispatch(fetchUserPosts({ userId: targetId || user?.id, offset: 0 }));
        // Fetch admin stats for own admin profile
        if (isOwnProfile && user?.role === 'admin') {
            getAdminMyStats().then(setAdminStats).catch(() => {});
        }
    }, [targetId, isOwnProfile, user?.id]);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    // Fetch comments for posts so inline previews work
    useEffect(() => {
        viewedPosts.forEach((post) => {
            if ((post.comment_count || 0) > 0 && !comments[post.id]) {
                dispatch(fetchComments(post.id));
            }
        });
    }, [viewedPosts, dispatch]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        Promise.all([
            isOwnProfile ? dispatch(fetchMyProfile()) : dispatch(fetchUserProfile(targetId)),
            dispatch(fetchUserPosts({ userId: targetId || user?.id, offset: 0 })),
        ]).finally(() => setRefreshing(false));
    }, [targetId, isOwnProfile, user?.id]);

    const handleFollow = () => {
        if (!profile) return;
        dispatch(toggleFollow({ userId: profile.id, isFollowing: profile.is_following, hasPendingRequest: profile.has_pending_request }));
    };

    const openRequests = () => {
        dispatch(fetchFollowRequests());
        setShowRequests(true);
    };

    const handleToggleVisibility = () => {
        if (!profile) return;
        const goingPublic = profile.is_public === false;
        Alert.alert(
            goingPublic ? 'Hacer perfil público' : 'Hacer perfil privado',
            goingPublic
                ? 'Tus publicaciones aparecerán en la pestaña Descubrir para todos los usuarios.'
                : 'Tus publicaciones solo serán visibles para tus seguidores.',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Confirmar', onPress: () => dispatch(toggleVisibility(goingPublic)) },
            ]
        );
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
        dispatch(fetchComments(post.id));
    };

    const handleOpenLikers = async (postId) => {
        try {
            const data = await getLikers(postId);
            setLikers(data.likers || []);
            setShowLikers(true);
        } catch {
            setLikers([]);
        }
    };

    // Standalone comments modal
    const openComments = (postId) => {
        setCommentsPostId(postId);
        setCommentsInput('');
        setReplyingTo(null);
        setExpandedReplies({});
        setShowComments(true);
        dispatch(fetchComments(postId));
    };

    const handleReplyTo = (comment) => {
        const name = comment.author?.fullName || 'Usuario';
        const parentId = comment.parent_id ? comment.parent_id : comment.id;
        setReplyingTo({ id: comment.id, fullName: name, parentId });
        setCommentsInput(`@${name} `);
        setTimeout(() => commentsInputRef.current?.focus(), 100);
    };

    const cancelReply = () => {
        setReplyingTo(null);
        setCommentsInput('');
    };

    const toggleRepliesExpand = (commentId) => {
        setExpandedReplies((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
    };

    const handleSendCommentModal = () => {
        const text = commentsInput.trim();
        if (!text || !commentsPostId) return;
        setCommentsInput('');
        const parentId = replyingTo?.parentId || null;
        setReplyingTo(null);
        dispatch(addComment({ postId: commentsPostId, text, parentId }));
    };

    const handleDeleteCommentModal = (commentId) => {
        if (!commentsPostId) return;
        dispatch(removeComment({ postId: commentsPostId, commentId }));
    };

    // Share via DM
    const handleOpenShareDM = (postId) => {
        setSharePostId(postId);
        dispatch(fetchConversations());
        setShowShareDM(true);
    };

    const handleShareToConversation = async (conversationId) => {
        try {
            await sendSharedPostMessage(conversationId, sharePostId);
            setShowShareDM(false);
            setSharePostId(null);
            Alert.alert('Enviado', 'Publicacion compartida por DM.');
        } catch {
            Alert.alert('Error', 'No se pudo compartir');
        }
    };

    const handleSendTicket = async () => {
        const text = contactMessage.trim();
        if (!text) return;
        setSendingTicket(true);
        try {
            await submitSupportTicket(text);
            setShowContactar(false);
            setContactMessage('');
            Alert.alert('Enviado', 'Tu mensaje ha sido enviado al equipo de Wearo.');
        } catch {
            Alert.alert('Error', 'No se pudo enviar el mensaje');
        } finally {
            setSendingTicket(false);
        }
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

    const isAdmin = user?.role === 'admin';

    const handleAdminToggle = () => {
        if (!profile) return;
        const isDisabled = profile.disabled;
        Alert.alert(
            isDisabled ? 'Activar usuario' : 'Desactivar usuario',
            isDisabled
                ? `¿Activar la cuenta de ${profile.full_name || 'este usuario'}?`
                : `¿Desactivar la cuenta de ${profile.full_name || 'este usuario'}? No podrá iniciar sesión.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: isDisabled ? 'Activar' : 'Desactivar',
                    style: isDisabled ? 'default' : 'destructive',
                    onPress: async () => {
                        try {
                            await adminToggleUser(profile.id, !isDisabled);
                            Alert.alert('Hecho', isDisabled ? 'Usuario activado.' : 'Usuario desactivado.');
                            load();
                        } catch {
                            Alert.alert('Error', 'No se pudo actualizar.');
                        }
                    },
                },
            ]
        );
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
    const displayName = isViewingAdmin ? 'Wearo' : (profile?.full_name || 'Usuario');
    const modalList = listModal === 'followers' ? followers : following;

    const renderPost = ({ item: post }) => {
        const garments = post.garments || [];
        const outfit = post.outfit || {};
        const photos = post.photos || [];
        const postCommentsList = comments[post.id] || [];

        return (
            <View style={[styles.postCard, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
                {/* Outfit info bar - hide for admin announcements */}
                {outfit.id && (
                <View style={[styles.postOutfitBar, { backgroundColor: c.surfaceVariant }]}>
                    {outfit.cover_image ? (
                        <Image source={{ uri: `${IMAGE_BASE_URL}${outfit.cover_image}` }} style={styles.outfitBarThumb} />
                    ) : (
                        <Ionicons name="albums-outline" size={16} color={c.text} style={{ marginRight: 6 }} />
                    )}
                    <Text style={[styles.postOutfitName, { color: c.text }]} numberOfLines={1}>
                        {outfit.name || post.outfit_name || 'Outfit'}
                    </Text>
                    {outfit.occasion && (
                        <View style={[styles.postOccasionBadge, { backgroundColor: c.primary + '15' }]}>
                            <Text style={[styles.postOccasionText, { color: c.primary }]}>{outfit.occasion}</Text>
                        </View>
                    )}
                </View>
                )}

                {/* Garment carousel with photos */}
                {(garments.length > 0 || photos.length > 0) && (
                    <GarmentCarousel garments={garments} photos={photos} height={Math.round(SCREEN_W * 0.75)} hidePhotoLabel={isViewingAdmin} />
                )}

                {/* Actions bar: like + comment + shirt + share */}
                <View style={styles.postActionsBar}>
                    <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        onPress={() => {
                            dispatch(toggleLike({ sharedId: post.id, isLiked: post.liked_by_me }));
                        }}
                    >
                        <Ionicons
                            name={post.liked_by_me ? 'heart' : 'heart-outline'}
                            size={24}
                            color={post.liked_by_me ? c.error : c.text}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        onPress={() => openComments(post.id)}
                    >
                        <Ionicons name="chatbubble-outline" size={21} color={c.text} />
                    </TouchableOpacity>
                    {!isViewingAdmin && (
                    <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        onPress={() => openPostDetail(post)}
                    >
                        <Ionicons name="shirt-outline" size={21} color={c.text} />
                    </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        onPress={() => handleOpenShareDM(post.id)}
                    >
                        <Ionicons name="paper-plane-outline" size={21} color={c.text} />
                    </TouchableOpacity>
                    {!isViewingAdmin && garments.length > 0 && (
                    <Text style={[styles.postGarmentCount, { color: c.textMuted }]}>
                        {garments.length} prenda{garments.length !== 1 ? 's' : ''}
                    </Text>
                    )}
                </View>

                {/* Like count */}
                {(post.like_count || 0) > 0 && (
                    <TouchableOpacity onPress={() => handleOpenLikers(post.id)}>
                        <Text style={[styles.postLikeCount, { color: c.text }]}>
                            {post.like_count} Me gusta
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Caption */}
                {post.caption ? (
                    <Text style={[styles.postCaptionText, { color: c.text }]} numberOfLines={2}>
                        {post.caption}
                    </Text>
                ) : null}

                {/* Inline comments preview (top-level only) */}
                {postCommentsList.filter((cm) => !cm.parent_id).length > 0 && (
                    <View style={styles.postInlineComments}>
                        {postCommentsList.filter((cm) => !cm.parent_id).slice(0, 2).map((cm) => (
                            <View key={cm.id} style={styles.postInlineCommentRow}>
                                <Text style={[styles.postCommentAuthor, { color: c.text }]}>
                                    {cm.author?.fullName || 'Usuario'}
                                </Text>
                                <Text style={[styles.postCommentBody, { color: c.text }]}>
                                    {' '}{cm.text}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Time ago */}
                <Text style={[styles.postTimeAgo, { color: c.textMuted }]}>
                    {getTimeAgo(post.created_at)}
                </Text>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <StatusBar barStyle={c.statusBar} />
            <ScreenHeader
                title={isOwnProfile ? 'Mi Perfil' : (isViewingAdmin ? 'Wearo' : (profile?.full_name || 'Perfil'))}
                onBack={!isOwnProfile ? () => navigation.goBack() : undefined}
                leftAction={
                    canEdit ? (
                        <TouchableOpacity
                            onPress={() => navigation.navigate('EditProfile')}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="create-outline" size={26} color={c.primary} />
                        </TouchableOpacity>
                    ) : null
                }
                rightAction={
                    canEdit ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                            {user?.role === 'admin' && (
                                <TouchableOpacity
                                    onPress={() => navigation.navigate('Admin')}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Ionicons name="shield-checkmark-outline" size={24} color={c.primary} />
                                </TouchableOpacity>
                            )}
                            {(myProfile?.pending_requests_count > 0) && (
                                <TouchableOpacity
                                    onPress={openRequests}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    style={{ position: 'relative' }}
                                >
                                    <Ionicons name="person-add-outline" size={22} color={c.primary} />
                                    <View style={{
                                        position: 'absolute', top: -6, right: -8,
                                        backgroundColor: c.error, borderRadius: 9, minWidth: 18, height: 18,
                                        justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
                                    }}>
                                        <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>
                                            {myProfile.pending_requests_count}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Messages')}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Ionicons name="chatbubbles-outline" size={24} color={c.text} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => dispatch(logoutUser())}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Ionicons name="log-out-outline" size={24} color={c.error} />
                            </TouchableOpacity>
                        </View>
                    ) : null
                }
            />

            {/* Disabled/not found user */}
            {!isOwnProfile && !profile && !isLoading && profileError ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
                    <Ionicons name="person-remove-outline" size={56} color={c.textMuted} />
                    <Text style={{ color: c.text, fontSize: 18, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>
                        Cuenta desactivada
                    </Text>
                    <Text style={{ color: c.textMuted, fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
                        Esta cuenta ya no está disponible.
                    </Text>
                    <TouchableOpacity
                        style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: c.primary, borderRadius: 12 }}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>Volver</Text>
                    </TouchableOpacity>
                </View>
            ) : (
            <>
            <FlatList
                data={viewedPosts}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.feedContent}
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
                            <View style={[styles.avatarWrap, { backgroundColor: isViewingAdmin ? 'transparent' : (c.primary + '20'), borderColor: isViewingAdmin ? c.primary : (c.primary + '40') }]}>
                                {isViewingAdmin ? (
                                    <Image source={WEARO_LOGO} style={styles.avatar} resizeMode="cover" />
                                ) : avatarUri ? (
                                    <Image source={{ uri: avatarUri }} style={styles.avatar} />
                                ) : (
                                    <Text style={[styles.avatarInitial, { color: c.primary }]}>
                                        {displayName[0].toUpperCase()}
                                    </Text>
                                )}
                            </View>
                            <Text style={[styles.displayName, { color: c.text }]}>{displayName}</Text>
                            {isViewingAdmin ? (
                                <>
                                    {isOwnProfile && user?.role === 'admin' && profile?.admin_real_name && (
                                        <Text style={[styles.username, { color: c.text, fontWeight: '700', fontSize: 15 }]}>
                                            {profile.admin_real_name}
                                        </Text>
                                    )}
                                    <Text style={[styles.username, { color: c.textMuted }]}>Cuenta oficial de la aplicación</Text>
                                    {isOwnProfile && user?.role === 'admin' && profile?.admin_tag && (
                                        <Text style={[styles.username, { color: c.primary, fontWeight: '700', marginTop: 2 }]}>
                                            {profile.admin_tag}
                                        </Text>
                                    )}
                                </>
                            ) : profile?.username ? (
                                <Text style={[styles.username, { color: c.textMuted }]}>@{profile.username}</Text>
                            ) : null}
                            {!isViewingAdmin && profile?.bio ? (
                                <Text style={[styles.bio, { color: c.textSecondary }]}>{profile.bio}</Text>
                            ) : null}

                            {/* Visibilidad público/privado */}
                            {isOwnProfile && profile && !isViewingAdmin && (
                                <TouchableOpacity
                                    style={[styles.visibilityToggle, { backgroundColor: c.surfaceVariant, borderColor: c.border }]}
                                    onPress={handleToggleVisibility}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={profile.is_public !== false ? 'globe-outline' : 'lock-closed-outline'}
                                        size={16}
                                        color={profile.is_public !== false ? c.primary : c.textMuted}
                                    />
                                    <Text style={[styles.visibilityText, { color: profile.is_public !== false ? c.primary : c.textMuted }]}>
                                        {profile.is_public !== false ? 'Perfil público' : 'Perfil privado'}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={14} color={c.textMuted} />
                                </TouchableOpacity>
                            )}

                            {!isOwnProfile && profile && !isViewingAdmin && (
                                <View style={styles.profileActions}>
                                    <TouchableOpacity
                                        style={[
                                            styles.followBtn,
                                            { backgroundColor: (profile.is_following || profile.has_pending_request) ? 'transparent' : c.primary,
                                              borderColor: profile.has_pending_request ? c.textMuted : c.primary },
                                        ]}
                                        onPress={handleFollow}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[
                                            styles.followBtnText,
                                            { color: profile.is_following ? c.primary : profile.has_pending_request ? c.textMuted : '#FFF' },
                                        ]}>
                                            {profile.is_following ? 'Siguiendo' : profile.has_pending_request ? 'Solicitado' : 'Seguir'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.messageBtn, { backgroundColor: c.surfaceVariant, borderColor: c.border }]}
                                        onPress={async () => {
                                            const result = await dispatch(startConversation(profile.id));
                                            if (result.payload?.id) {
                                                navigation.navigate('Chat', {
                                                    conversationId: result.payload.id,
                                                    otherUser: {
                                                        id: profile.id,
                                                        fullName: profile.full_name,
                                                        avatarUrl: profile.avatar_url,
                                                    },
                                                });
                                            }
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="chatbubble-outline" size={16} color={c.text} />
                                        <Text style={[styles.messageBtnText, { color: c.text }]}>Mensaje</Text>
                                    </TouchableOpacity>
                                    {isAdmin && (
                                        <TouchableOpacity
                                            style={[styles.messageBtn, {
                                                backgroundColor: profile.disabled ? ((c.success || '#27AE60') + '15') : (c.error + '15'),
                                                borderColor: profile.disabled ? (c.success || '#27AE60') : c.error,
                                            }]}
                                            onPress={handleAdminToggle}
                                            activeOpacity={0.8}
                                        >
                                            <Ionicons
                                                name={profile.disabled ? 'checkmark-circle-outline' : 'ban-outline'}
                                                size={16}
                                                color={profile.disabled ? (c.success || '#27AE60') : c.error}
                                            />
                                            <Text style={[styles.messageBtnText, { color: profile.disabled ? (c.success || '#27AE60') : c.error }]}>
                                                {profile.disabled ? 'Activar' : 'Desactivar'}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}

                            {/* Acciones en perfil Wearo para no-admins */}
                            {!isOwnProfile && isViewingAdmin && user?.role !== 'admin' && (
                                <View style={styles.profileActions}>
                                    <TouchableOpacity
                                        style={[
                                            styles.followBtn,
                                            { backgroundColor: profile?.is_following ? 'transparent' : c.primary,
                                              borderColor: c.primary },
                                        ]}
                                        onPress={handleFollow}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[
                                            styles.followBtnText,
                                            { color: profile?.is_following ? c.primary : '#FFF' },
                                        ]}>
                                            {profile?.is_following ? 'Siguiendo' : 'Seguir'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.messageBtn, { backgroundColor: c.surfaceVariant, borderColor: c.border }]}
                                        onPress={() => { setContactMessage(''); setShowContactar(true); }}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="mail-outline" size={16} color={c.text} />
                                        <Text style={[styles.messageBtnText, { color: c.text }]}>Contactar</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {/* Estadísticas */}
                        {isViewingAdmin ? (
                            <View style={[styles.statsRow, { borderTopColor: c.border, borderBottomColor: c.border }]}>
                                <StatBadge label="Anuncios" value={adminStats?.wearoPosts ?? profile?.post_count ?? 0} colors={c} />
                                <View style={[styles.statDivider, { backgroundColor: c.border }]} />
                                <StatBadge label="Seguidores" value={profile?.follower_count ?? 0} colors={c} onPress={openFollowers} />
                                <View style={[styles.statDivider, { backgroundColor: c.border }]} />
                                <StatBadge label="Siguiendo" value={profile?.following_count ?? 0} colors={c} onPress={openFollowing} />
                                {isAdmin && (
                                    <>
                                        <View style={[styles.statDivider, { backgroundColor: c.border }]} />
                                        <StatBadge label="Bloqueados" value={adminStats?.disabledUsers ?? 0} colors={c} onPress={() => navigation.navigate('Admin')} />
                                        <View style={[styles.statDivider, { backgroundColor: c.border }]} />
                                        <StatBadge label="Eliminados" value={adminStats?.deletedUserPosts ?? 0} colors={c} onPress={() => navigation.navigate('Admin')} />
                                        <View style={[styles.statDivider, { backgroundColor: c.border }]} />
                                        <StatBadge label="Resueltas" value={adminStats?.resolvedTickets ?? 0} colors={c} onPress={() => navigation.navigate('Admin')} />
                                    </>
                                )}
                            </View>
                        ) : (
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
                        )}

                        <Text style={[styles.sectionTitle, { color: c.textSecondary, borderBottomColor: c.border }]}>
                            {isViewingAdmin ? 'Anuncios' : 'Publicaciones'}
                        </Text>

                        {/* Perfil privado: bloquear acceso si no lo sigues */}
                        {!isOwnProfile && profile && profile.is_public === false && !profile.is_following && (
                            <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32 }}>
                                <Ionicons name="lock-closed-outline" size={48} color={c.textMuted} />
                                <Text style={{ color: c.text, fontSize: 16, fontWeight: '700', marginTop: 12, textAlign: 'center' }}>
                                    Esta cuenta es privada
                                </Text>
                                <Text style={{ color: c.textMuted, fontSize: 14, marginTop: 6, textAlign: 'center' }}>
                                    Sigue a este usuario para ver sus publicaciones.
                                </Text>
                            </View>
                        )}
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
                                    isWearo={item.full_name === 'Wearo'}
                                    onPress={() => {
                                        setListModal(null);
                                        if (item.full_name === 'Wearo') {
                                            navigation.push('UserProfile', { userId: item.id, isWearo: true });
                                        } else {
                                            navigation.push('UserProfile', { userId: item.id });
                                        }
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

            {/* Modal detalle de post — estilo Instagram (igual que SocialScreen) */}
            <Modal visible={!!selectedPost} animationType="slide" transparent onRequestClose={() => setSelectedPost(null)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.postDetailBox, { backgroundColor: c.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: c.text }]}>Publicacion</Text>
                            <TouchableOpacity onPress={() => setSelectedPost(null)}>
                                <Ionicons name="close" size={22} color={c.primary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {selectedPost && (() => {
                                const post = selectedPost;
                                const author = post.author || { fullName: profile?.full_name, avatarUrl: profile?.avatar_url, id: profile?.id };
                                const outfit = post.outfit || {};
                                const postGarments = post.garments || [];
                                const photos = post.photos || [];

                                return (
                                    <View>
                                        {/* Author header */}
                                        <View style={styles.detailPostHeader}>
                                            <View style={styles.detailPostHeaderUser}>
                                                <View style={[styles.detailPostAvatar, { backgroundColor: c.primary + '20' }]}>
                                                    {(author.avatarUrl || author.avatar_url) ? (
                                                        <Image source={{ uri: `${IMAGE_BASE_URL}${author.avatarUrl || author.avatar_url}` }} style={styles.detailPostAvatarImg} />
                                                    ) : (
                                                        <Text style={[styles.detailPostAvatarText, { color: c.primary }]}>
                                                            {(author.fullName || author.full_name || '?')[0].toUpperCase()}
                                                        </Text>
                                                    )}
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.detailPostAuthorName, { color: c.text }]}>
                                                        {author.fullName || author.full_name || 'Usuario'}
                                                    </Text>
                                                    <Text style={[styles.detailPostTimeAgo, { color: c.textMuted }]}>
                                                        {getTimeAgo(post.created_at)}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        {/* Outfit info */}
                                        <View style={[styles.detailOutfitBox, { backgroundColor: c.surfaceVariant, borderColor: c.border }]}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                {outfit.cover_image ? (
                                                    <Image source={{ uri: `${IMAGE_BASE_URL}${outfit.cover_image}` }} style={styles.outfitBarThumb} />
                                                ) : (
                                                    <Ionicons name="albums-outline" size={16} color={c.text} style={{ marginRight: 6 }} />
                                                )}
                                                <Text style={[styles.postOutfitName, { color: c.text }]}>{outfit.name || post.outfit_name || 'Outfit'}</Text>
                                            </View>
                                            {outfit.occasion && (
                                                <View style={[styles.postOccasionBadge, { backgroundColor: c.primary + '15' }]}>
                                                    <Text style={[styles.postOccasionText, { color: c.primary }]}>{outfit.occasion}</Text>
                                                </View>
                                            )}
                                        </View>

                                        {/* Garment carousel */}
                                        {(postGarments.length > 0 || photos.length > 0) && (
                                            <GarmentCarousel garments={postGarments} photos={photos} height={Math.round(SCREEN_W * 0.7)} />
                                        )}

                                        {/* Actions */}
                                        <View style={styles.postActionsBar}>
                                            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={handlePostLike}>
                                                <Ionicons name={post.liked_by_me ? 'heart' : 'heart-outline'} size={26} color={post.liked_by_me ? c.error : c.text} />
                                            </TouchableOpacity>
                                            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => { setSelectedPost(null); setTimeout(() => openComments(post.id), 300); }}>
                                                <Ionicons name="chatbubble-outline" size={23} color={c.text} />
                                            </TouchableOpacity>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                <Ionicons name="shirt-outline" size={21} color={c.text} />
                                            </View>
                                            {outfit.season && (
                                                <View style={[styles.detailSeasonTag, { backgroundColor: c.accent + '15' }]}>
                                                    <Text style={[styles.detailSeasonText, { color: c.accent }]}>{outfit.season}</Text>
                                                </View>
                                            )}
                                        </View>

                                        {/* Counts */}
                                        {(post.like_count || 0) > 0 && (
                                            <TouchableOpacity onPress={() => handleOpenLikers(post.id)}>
                                                <Text style={[styles.postLikeCount, { color: c.text }]}>
                                                    {post.like_count} Me gusta
                                                </Text>
                                            </TouchableOpacity>
                                        )}

                                        {/* Caption */}
                                        {post.caption ? (
                                            <View style={styles.detailCaptionRow}>
                                                <Text style={[styles.detailCaptionAuthor, { color: c.text }]}>{author.fullName || author.full_name || 'Usuario'}</Text>
                                                <Text style={[styles.detailCaptionText, { color: c.text }]}>{' '}{post.caption}</Text>
                                            </View>
                                        ) : null}

                                        {/* Garment count */}
                                        <Text style={[styles.detailGarmentCountText, { color: c.textMuted }]}>
                                            {postGarments.length} prenda{postGarments.length !== 1 ? 's' : ''}
                                        </Text>
                                    </View>
                                );
                            })()}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Modal: Likers */}
            <Modal visible={showLikers} animationType="slide" transparent onRequestClose={() => setShowLikers(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalBox, { backgroundColor: c.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: c.text }]}>Les gusta</Text>
                            <TouchableOpacity onPress={() => setShowLikers(false)}>
                                <Ionicons name="close" size={22} color={c.primary} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={likers}
                            keyExtractor={(item, i) => `liker-${item.user?.id || i}`}
                            ListEmptyComponent={
                                <Text style={[styles.noPosts, { color: c.textMuted }]}>Nadie ha dado like aun.</Text>
                            }
                            renderItem={({ item }) => {
                                const u = item.user || {};
                                return (
                                    <TouchableOpacity
                                        style={[styles.userRow, { borderBottomColor: c.border }]}
                                        onPress={() => {
                                            setShowLikers(false);
                                            if (String(u.id) === String(user?.id)) return;
                                            navigation.navigate('UserProfile', { userId: u.id });
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.rowAvatar, { backgroundColor: c.primary + '20' }]}>
                                            {u.avatarUrl ? (
                                                <Image source={{ uri: `${IMAGE_BASE_URL}${u.avatarUrl}` }} style={styles.rowAvatarImg} />
                                            ) : (
                                                <Text style={[styles.rowAvatarText, { color: c.primary }]}>
                                                    {(u.fullName || '?')[0].toUpperCase()}
                                                </Text>
                                            )}
                                        </View>
                                        <Text style={[styles.rowName, { color: c.text }]}>{u.fullName || 'Usuario'}</Text>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>
                </View>
            </Modal>

            {/* Modal: Solicitudes de seguimiento */}
            <Modal visible={showRequests} animationType="slide" transparent onRequestClose={() => setShowRequests(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalBox, { backgroundColor: c.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: c.text }]}>Solicitudes</Text>
                            <TouchableOpacity onPress={() => setShowRequests(false)}>
                                <Ionicons name="close" size={22} color={c.primary} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={followRequests}
                            keyExtractor={(item) => item.id.toString()}
                            ListEmptyComponent={
                                <Text style={[styles.noPosts, { color: c.textMuted }]}>No tienes solicitudes pendientes.</Text>
                            }
                            renderItem={({ item: req }) => {
                                const u = req.requester || {};
                                return (
                                    <View style={[styles.userRow, { borderBottomColor: c.border }]}>
                                        <TouchableOpacity
                                            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                                            onPress={() => {
                                                setShowRequests(false);
                                                navigation.push('UserProfile', { userId: u.id });
                                            }}
                                        >
                                            <View style={[styles.rowAvatar, { backgroundColor: c.primary + '20' }]}>
                                                {u.avatarUrl ? (
                                                    <Image source={{ uri: `${IMAGE_BASE_URL}${u.avatarUrl}` }} style={styles.rowAvatarImg} />
                                                ) : (
                                                    <Text style={[styles.rowAvatarText, { color: c.primary }]}>
                                                        {(u.fullName || '?')[0].toUpperCase()}
                                                    </Text>
                                                )}
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.rowName, { color: c.text }]} numberOfLines={1}>{u.fullName || 'Usuario'}</Text>
                                                {u.username ? <Text style={{ color: c.textMuted, fontSize: 12 }}>@{u.username}</Text> : null}
                                            </View>
                                        </TouchableOpacity>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            <TouchableOpacity
                                                style={{ backgroundColor: c.primary, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16 }}
                                                onPress={() => dispatch(acceptRequest(req.id))}
                                            >
                                                <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Aceptar</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={{ backgroundColor: c.surfaceVariant, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: c.border }}
                                                onPress={() => dispatch(rejectRequest(req.id))}
                                            >
                                                <Text style={{ color: c.text, fontSize: 13, fontWeight: '600' }}>Rechazar</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            }}
                        />
                    </View>
                </View>
            </Modal>

            {/* Modal: Comentarios con respuestas anidadas */}
            <Modal visible={showComments} animationType="slide" transparent onRequestClose={() => { setShowComments(false); setReplyingTo(null); }}>
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={[styles.commentsModal, { backgroundColor: c.surface }]}>
                        {/* Drag handle */}
                        <View style={styles.dragHandle}>
                            <View style={[styles.dragBar, { backgroundColor: c.border }]} />
                        </View>

                        {/* Header */}
                        <View style={styles.commentsHeaderRow}>
                            <Text style={[styles.commentsTitle, { color: c.text }]}>Comentarios</Text>
                            <TouchableOpacity onPress={() => { setShowComments(false); setReplyingTo(null); }}>
                                <Ionicons name="close-circle" size={26} color={c.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Comments list — nested */}
                        {commentsLoading ? (
                            <ActivityIndicator style={{ paddingVertical: 32 }} color={c.primary} />
                        ) : (
                            <FlatList
                                data={commentsPostId ? (comments[commentsPostId] || []).filter((cm) => !cm.parent_id) : []}
                                keyExtractor={(item) => item.id.toString()}
                                style={{ flex: 1 }}
                                contentContainerStyle={{ paddingVertical: 4 }}
                                ListEmptyComponent={
                                    <View style={styles.emptyCommentsWrap}>
                                        <Ionicons name="chatbubble-outline" size={40} color={c.textMuted} style={{ marginBottom: 8 }} />
                                        <Text style={[styles.emptyCommentsTitle, { color: c.text }]}>Sin comentarios</Text>
                                        <Text style={[styles.emptyCommentsSubtext, { color: c.textMuted }]}>
                                            Se el primero en comentar.
                                        </Text>
                                    </View>
                                }
                                renderItem={({ item: comment }) => {
                                    const isOwn = comment.author?.id === user?.id;
                                    const allComments = commentsPostId ? (comments[commentsPostId] || []) : [];
                                    const replies = allComments.filter((cm) => cm.parent_id === comment.id);
                                    const isExpanded = expandedReplies[comment.id];
                                    return (
                                        <View>
                                            {/* Top-level comment */}
                                            <View style={[styles.nestedCommentCard, { backgroundColor: c.background }]}>
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
                                                        <Text style={[styles.nestedCommentAuthor, { color: c.text }]}>
                                                            {comment.author?.fullName || 'Usuario'}
                                                        </Text>
                                                        <Text style={[styles.commentTime, { color: c.textMuted }]}>
                                                            {getTimeAgo(comment.created_at)}
                                                        </Text>
                                                    </View>
                                                    <Text style={[styles.nestedCommentText, { color: c.text }]}>
                                                        {comment.text}
                                                    </Text>
                                                    <View style={styles.nestedCommentActions}>
                                                        <TouchableOpacity
                                                            onPress={() => handleReplyTo(comment)}
                                                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                                            style={styles.nestedReplyBtn}
                                                        >
                                                            <Ionicons name="arrow-undo-outline" size={14} color={c.textMuted} />
                                                            <Text style={[styles.nestedReplyBtnText, { color: c.textMuted }]}>Responder</Text>
                                                        </TouchableOpacity>
                                                        {isOwn && (
                                                            <TouchableOpacity
                                                                onPress={() => handleDeleteCommentModal(comment.id)}
                                                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                                                style={styles.nestedReplyBtn}
                                                            >
                                                                <Ionicons name="trash-outline" size={14} color={c.error} />
                                                                <Text style={[styles.nestedReplyBtnText, { color: c.error }]}>Eliminar</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                </View>
                                            </View>

                                            {/* "Ver respuestas" toggle */}
                                            {replies.length > 0 && !isExpanded && (
                                                <TouchableOpacity
                                                    style={styles.viewRepliesBtn}
                                                    onPress={() => toggleRepliesExpand(comment.id)}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={[styles.replyLine, { backgroundColor: c.border }]} />
                                                    <Text style={[styles.viewRepliesText, { color: c.primary }]}>
                                                        Ver {replies.length} respuesta{replies.length !== 1 ? 's' : ''}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}

                                            {/* Expanded replies */}
                                            {isExpanded && replies.map((reply) => {
                                                const isReplyOwn = reply.author?.id === user?.id;
                                                return (
                                                    <View key={reply.id} style={[styles.nestedCommentCard, styles.nestedReplyCard, { backgroundColor: c.background }]}>
                                                        <View style={[styles.nestedReplyAvatar, { backgroundColor: c.primary + '20' }]}>
                                                            {reply.author?.avatarUrl ? (
                                                                <Image source={{ uri: `${IMAGE_BASE_URL}${reply.author.avatarUrl}` }} style={styles.nestedReplyAvatarImg} />
                                                            ) : (
                                                                <Text style={[styles.commentAvatarText, { color: c.primary, fontSize: 11 }]}>
                                                                    {(reply.author?.fullName || '?')[0].toUpperCase()}
                                                                </Text>
                                                            )}
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <View style={styles.commentMeta}>
                                                                <Text style={[styles.nestedCommentAuthor, { color: c.text, fontSize: 13 }]}>
                                                                    {reply.author?.fullName || 'Usuario'}
                                                                </Text>
                                                                <Text style={[styles.commentTime, { color: c.textMuted }]}>
                                                                    {getTimeAgo(reply.created_at)}
                                                                </Text>
                                                            </View>
                                                            <Text style={[styles.nestedCommentText, { color: c.text, fontSize: 13 }]}>
                                                                {reply.text}
                                                            </Text>
                                                            <View style={styles.nestedCommentActions}>
                                                                <TouchableOpacity
                                                                    onPress={() => handleReplyTo(reply)}
                                                                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                                                    style={styles.nestedReplyBtn}
                                                                >
                                                                    <Ionicons name="arrow-undo-outline" size={13} color={c.textMuted} />
                                                                    <Text style={[styles.nestedReplyBtnText, { color: c.textMuted }]}>Responder</Text>
                                                                </TouchableOpacity>
                                                                {isReplyOwn && (
                                                                    <TouchableOpacity
                                                                        onPress={() => handleDeleteCommentModal(reply.id)}
                                                                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                                                        style={styles.nestedReplyBtn}
                                                                    >
                                                                        <Ionicons name="trash-outline" size={13} color={c.error} />
                                                                        <Text style={[styles.nestedReplyBtnText, { color: c.error }]}>Eliminar</Text>
                                                                    </TouchableOpacity>
                                                                )}
                                                            </View>
                                                        </View>
                                                    </View>
                                                );
                                            })}

                                            {/* Hide replies */}
                                            {isExpanded && replies.length > 0 && (
                                                <TouchableOpacity
                                                    style={styles.viewRepliesBtn}
                                                    onPress={() => toggleRepliesExpand(comment.id)}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={[styles.replyLine, { backgroundColor: c.border }]} />
                                                    <Text style={[styles.viewRepliesText, { color: c.textMuted }]}>
                                                        Ocultar respuestas
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    );
                                }}
                            />
                        )}

                        {/* Reply indicator */}
                        {replyingTo && (
                            <View style={[styles.replyIndicator, { backgroundColor: c.surfaceVariant, borderTopColor: c.border }]}>
                                <Text style={[styles.replyIndicatorText, { color: c.textSecondary }]}>
                                    Respondiendo a <Text style={{ fontWeight: '700', color: c.primary }}>{replyingTo.fullName}</Text>
                                </Text>
                                <TouchableOpacity onPress={cancelReply} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <Ionicons name="close" size={18} color={c.textMuted} />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Input */}
                        <View style={[styles.commentInputBar, { borderTopColor: replyingTo ? 'transparent' : c.border }]}>
                            <TextInput
                                ref={commentsInputRef}
                                style={[styles.commentInput, { color: c.text, backgroundColor: c.surfaceVariant, borderColor: c.border }]}
                                placeholder={replyingTo ? `Responder a ${replyingTo.fullName}...` : 'Escribe un comentario...'}
                                placeholderTextColor={c.textMuted}
                                value={commentsInput}
                                onChangeText={setCommentsInput}
                                maxLength={500}
                                returnKeyType="send"
                                onSubmitEditing={handleSendCommentModal}
                            />
                            <TouchableOpacity
                                style={[styles.commentSendBtn, { backgroundColor: commentsInput.trim() ? c.primary : c.border }]}
                                onPress={handleSendCommentModal}
                                disabled={!commentsInput.trim()}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="arrow-up" size={18} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Modal: Compartir publicacion por DM */}
            <Modal visible={showShareDM} animationType="slide" transparent onRequestClose={() => setShowShareDM(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalBox, { backgroundColor: c.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: c.text }]}>Enviar a...</Text>
                            <TouchableOpacity onPress={() => setShowShareDM(false)}>
                                <Ionicons name="close" size={22} color={c.primary} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={conversations}
                            keyExtractor={(item) => item.id.toString()}
                            ListEmptyComponent={
                                <Text style={[styles.noPosts, { color: c.textMuted }]}>
                                    No tienes conversaciones. Busca a alguien en Mensajes primero.
                                </Text>
                            }
                            renderItem={({ item: conv }) => {
                                const other = conv.other_user || {};
                                return (
                                    <TouchableOpacity
                                        style={[styles.userRow, { borderBottomColor: c.border }]}
                                        onPress={() => handleShareToConversation(conv.id)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.rowAvatar, { backgroundColor: c.primary + '20' }]}>
                                            {other.avatarUrl ? (
                                                <Image source={{ uri: `${IMAGE_BASE_URL}${other.avatarUrl}` }} style={styles.rowAvatarImg} />
                                            ) : (
                                                <Text style={[styles.rowAvatarText, { color: c.primary }]}>
                                                    {(other.fullName || '?')[0].toUpperCase()}
                                                </Text>
                                            )}
                                        </View>
                                        <Text style={[styles.rowName, { color: c.text }]}>{other.fullName || 'Usuario'}</Text>
                                        <Ionicons name="paper-plane" size={18} color={c.primary} />
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>
                </View>
            </Modal>

            {/* Modal: Contactar Wearo (soporte) */}
            <Modal visible={showContactar} animationType="slide" transparent onRequestClose={() => setShowContactar(false)}>
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={[styles.modalBox, { backgroundColor: c.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: c.text }]}>Contactar con Wearo</Text>
                            <TouchableOpacity onPress={() => setShowContactar(false)}>
                                <Ionicons name="close" size={22} color={c.primary} />
                            </TouchableOpacity>
                        </View>
                        <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
                            <Text style={{ color: c.textMuted, fontSize: 14, marginBottom: 12, lineHeight: 20 }}>
                                Escribe tu duda, error o sugerencia y nuestro equipo te responderá.
                            </Text>
                            <TextInput
                                style={{
                                    borderWidth: 1, borderColor: c.border, borderRadius: 12,
                                    padding: 14, fontSize: 15, color: c.text,
                                    backgroundColor: c.surfaceVariant, minHeight: 120,
                                    textAlignVertical: 'top',
                                }}
                                placeholder="Describe tu consulta..."
                                placeholderTextColor={c.textMuted}
                                value={contactMessage}
                                onChangeText={setContactMessage}
                                multiline
                                maxLength={1000}
                            />
                            <TouchableOpacity
                                style={{
                                    backgroundColor: contactMessage.trim() ? c.primary : c.border,
                                    borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 14,
                                }}
                                onPress={handleSendTicket}
                                disabled={!contactMessage.trim() || sendingTicket}
                                activeOpacity={0.8}
                            >
                                {sendingTicket ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Enviar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
            </>
            )}
        </View>
    );
};

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
    username: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
    bio: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 12 },

    visibilityToggle: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
        marginBottom: 12,
    },
    visibilityText: { fontSize: 13, fontWeight: '600' },

    followBtn: {
        paddingHorizontal: 32, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5,
    },
    followBtnText: { fontSize: 15, fontWeight: '700' },
    profileActions: {
        flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4,
    },
    messageBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1,
    },
    messageBtnText: { fontSize: 15, fontWeight: '600' },

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

    feedContent: { paddingBottom: 32 },
    noPosts: { textAlign: 'center', marginTop: 40, fontSize: 14 },

    // Feed-style post cards
    postCard: {
        borderBottomWidth: 0.5, marginBottom: 4,
    },
    postOutfitBar: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
    },
    postOutfitName: { fontSize: 14, fontWeight: '700', flex: 1 },
    outfitBarThumb: { width: 28, height: 28, borderRadius: 6, marginRight: 8 },
    postOccasionBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
    postOccasionText: { fontSize: 11, fontWeight: '600' },
    postActionsBar: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4, gap: 16,
    },
    postGarmentCount: { fontSize: 13, marginLeft: 'auto' },
    postLikeCount: { fontSize: 14, fontWeight: '700', paddingHorizontal: 14, paddingTop: 4 },
    postCaptionText: { fontSize: 14, lineHeight: 20, paddingHorizontal: 14, paddingTop: 4 },
    postInlineComments: { paddingHorizontal: 14, paddingTop: 4 },
    postInlineCommentRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 2 },
    postCommentAuthor: { fontSize: 13, fontWeight: '700' },
    postCommentBody: { fontSize: 13, lineHeight: 18, flexShrink: 1 },
    postTimeAgo: { fontSize: 12, paddingHorizontal: 14, paddingTop: 2, paddingBottom: 12 },

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
        maxHeight: '90%', paddingTop: 4,
    },
    detailPostHeader: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
    },
    detailPostHeaderUser: {
        flexDirection: 'row', alignItems: 'center', flex: 1,
    },
    detailPostAvatar: {
        width: 38, height: 38, borderRadius: 19,
        justifyContent: 'center', alignItems: 'center', marginRight: 10, overflow: 'hidden',
    },
    detailPostAvatarImg: { width: 38, height: 38, borderRadius: 19 },
    detailPostAvatarText: { fontSize: 16, fontWeight: '800' },
    detailPostAuthorName: { fontSize: 14, fontWeight: '700' },
    detailPostTimeAgo: { fontSize: 12, marginTop: 1 },
    detailOutfitBox: {
        marginHorizontal: 14, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4,
    },
    detailCaptionRow: {
        flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, paddingTop: 4,
    },
    detailCaptionAuthor: { fontSize: 14, fontWeight: '700' },
    detailCaptionText: { fontSize: 14, lineHeight: 20, flexShrink: 1 },
    detailGarmentCountText: { fontSize: 13, paddingHorizontal: 14, paddingTop: 2, paddingBottom: 12 },
    detailSeasonTag: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
    detailSeasonText: { fontSize: 12, fontWeight: '600' },
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

    // Standalone comments modal
    commentsModal: {
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        height: '85%', paddingHorizontal: 16, paddingBottom: 8,
    },
    dragHandle: { alignItems: 'center', paddingVertical: 10 },
    dragBar: { width: 40, height: 4, borderRadius: 2 },
    commentsHeaderRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12,
    },
    commentsTitle: { fontSize: 18, fontWeight: '800' },
    emptyCommentsWrap: { alignItems: 'center', paddingVertical: 40 },
    emptyCommentsTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
    emptyCommentsSubtext: { fontSize: 14 },
    replyIndicator: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: 1,
    },
    replyIndicatorText: { fontSize: 13 },

    // Nested comments
    nestedCommentCard: {
        flexDirection: 'row', alignItems: 'flex-start',
        paddingVertical: 12, paddingHorizontal: 10, marginVertical: 2,
        borderRadius: 12,
    },
    nestedCommentAuthor: { fontSize: 14, fontWeight: '800' },
    nestedCommentText: { fontSize: 14, lineHeight: 20, marginTop: 2 },
    nestedCommentActions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 6 },
    nestedReplyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    nestedReplyBtnText: { fontSize: 12, fontWeight: '600' },
    nestedReplyCard: { marginLeft: 44, paddingVertical: 8 },
    nestedReplyAvatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 8, overflow: 'hidden' },
    nestedReplyAvatarImg: { width: 28, height: 28, borderRadius: 14 },
    viewRepliesBtn: { flexDirection: 'row', alignItems: 'center', marginLeft: 54, paddingVertical: 6, gap: 8 },
    replyLine: { width: 24, height: 1 },
    viewRepliesText: { fontSize: 13, fontWeight: '600' },
});

export default ProfileScreen;
