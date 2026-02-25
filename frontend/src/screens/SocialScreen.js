// Pantalla Social — feed público de outfits con likes y compartir (Instagram-style)
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View, Text, TouchableOpacity, FlatList, Modal, TextInput, Image, ScrollView,
    StyleSheet, ActivityIndicator, StatusBar, RefreshControl,
    KeyboardAvoidingView, Platform, Alert, Dimensions, Animated, Keyboard,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFeed, toggleLike, shareOutfit, unshareOutfit, resetFeed, fetchComments, addComment, removeComment } from '../store/socialSlice';
import { fetchOutfits } from '../store/outfitsSlice';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../hooks/useTheme';
import { IMAGE_BASE_URL } from '../services/api';
import { searchSocial, getLikers } from '../services/social.service';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';
import GarmentCarousel from '../components/GarmentCarousel';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SocialScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { feed, hasMore, isLoading, isRefreshing, comments, commentsLoading } = useSelector((state) => state.social);
    const { outfits } = useSelector((state) => state.outfits);
    const { user } = useSelector((state) => state.auth);
    const currentUserId = useSelector((s) => s.auth.user?.id);
    const { theme } = useTheme();
    const c = theme.colors;

    const [showShareModal, setShowShareModal] = useState(false);
    const [caption, setCaption] = useState('');
    const [selectedOutfitId, setSelectedOutfitId] = useState(null);
    const [sharePhotos, setSharePhotos] = useState([]);
    const [feedMode, setFeedMode] = useState('discover'); // 'discover' | 'following'
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({ posts: [], users: [] });
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Comments state
    const [commentsPostId, setCommentsPostId] = useState(null);
    const [showComments, setShowComments] = useState(false);
    const [commentInput, setCommentInput] = useState('');
    const [replyingTo, setReplyingTo] = useState(null); // { id, fullName }
    const commentInputRef = useRef(null);
    // Post detail state
    const [selectedPost, setSelectedPost] = useState(null);
    const likeAnims = useRef({});
    // Likers modal
    const [likersData, setLikersData] = useState([]);
    const [showLikers, setShowLikers] = useState(false);

    const getLikeAnim = (postId) => {
        if (!likeAnims.current[postId]) {
            likeAnims.current[postId] = new Animated.Value(1);
        }
        return likeAnims.current[postId];
    };

    const openComments = (postId) => {
        setCommentsPostId(postId);
        setCommentInput('');
        setReplyingTo(null);
        setShowComments(true);
        dispatch(fetchComments(postId));
    };

    const handleReplyTo = (comment) => {
        const name = comment.author?.fullName || 'Usuario';
        setReplyingTo({ id: comment.id, fullName: name });
        setCommentInput(`@${name} `);
        setTimeout(() => commentInputRef.current?.focus(), 100);
    };

    const cancelReply = () => {
        setReplyingTo(null);
        setCommentInput('');
    };

    const handleSendComment = () => {
        const text = commentInput.trim();
        if (!text || !commentsPostId) return;
        setCommentInput('');
        setReplyingTo(null);
        dispatch(addComment({ postId: commentsPostId, text }));
    };

    const handleDeleteComment = (commentId) => {
        dispatch(removeComment({ postId: commentsPostId, commentId }));
    };

    const getTimeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Ahora';
        if (mins < 60) return `${mins}m`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h`;
        const days = Math.floor(hrs / 24);
        if (days < 7) return `${days}d`;
        return `${Math.floor(days / 7)}sem`;
    };

    useEffect(() => {
        dispatch(resetFeed());
        dispatch(fetchFeed({ limit: 20, offset: 0, mode: feedMode }));
    }, [dispatch, feedMode]);

    // Auto-fetch comments for all posts in the feed
    useEffect(() => {
        feed.forEach((post) => {
            if ((post.comment_count || 0) > 0 && !comments[post.id]) {
                dispatch(fetchComments(post.id));
            }
        });
    }, [feed, dispatch]);

    const onRefresh = useCallback(() => {
        dispatch(fetchFeed({ limit: 20, offset: 0, mode: feedMode }));
    }, [dispatch, feedMode]);

    const loadMore = () => {
        if (!isLoading && hasMore) {
            dispatch(fetchFeed({ limit: 20, offset: feed.length, mode: feedMode }));
        }
    };

    const switchTab = (mode) => {
        if (mode === feedMode) return;
        setFeedMode(mode);
    };

    const handleLike = (post) => {
        const anim = getLikeAnim(post.id);
        Animated.sequence([
            Animated.spring(anim, { toValue: 1.3, useNativeDriver: true, speed: 50, bounciness: 12 }),
            Animated.spring(anim, { toValue: 1.0, useNativeDriver: true, speed: 50, bounciness: 12 }),
        ]).start();
        dispatch(toggleLike({ sharedId: post.id, isLiked: post.liked_by_me }));
    };

    const handleDeletePost = (post) => {
        Alert.alert(
            'Eliminar publicación',
            '¿Seguro que quieres retirar este outfit del feed?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Eliminar', style: 'destructive', onPress: () => dispatch(unshareOutfit(post.id)) },
            ]
        );
    };

    const openShareModal = () => {
        dispatch(fetchOutfits());
        setCaption('');
        setSelectedOutfitId(null);
        setSharePhotos([]);
        setShowShareModal(true);
    };

    const handleShare = () => {
        if (!selectedOutfitId) return;
        dispatch(shareOutfit({ outfitId: selectedOutfitId, caption, photos: sharePhotos }));
        setShowShareModal(false);
        setCaption('');
        setSelectedOutfitId(null);
        setSharePhotos([]);
    };

    const pickSharePhotos = async () => {
        if (sharePhotos.length >= 5) {
            Alert.alert('Limite', 'Puedes subir un maximo de 5 fotos.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: 5 - sharePhotos.length,
            quality: 0.8,
        });
        if (!result.canceled && result.assets?.length > 0) {
            setSharePhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 5));
        }
    };

    const removeSharePhoto = (idx) => {
        setSharePhotos((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleSearch = async () => {
        const q = searchQuery.trim();
        if (!q || q.length < 2 || isSearching) return;
        setIsSearching(true);
        setHasSearched(true);
        try {
            const data = await searchSocial(q);
            setSearchResults({ posts: data.posts || [], users: data.users || [] });
        } catch {
            setSearchResults({ posts: [], users: [] });
        } finally {
            setIsSearching(false);
        }
    };

    const openSearch = () => {
        setSearchQuery('');
        setSearchResults({ posts: [], users: [] });
        setHasSearched(false);
        setShowSearch(true);
    };

    const handleOpenLikers = async (postId) => {
        try {
            const data = await getLikers(postId);
            setLikersData(data.likers || []);
            setShowLikers(true);
        } catch {
            setLikersData([]);
        }
    };

    // Find current post for comments modal (F2)
    const commentsPost = commentsPostId ? feed.find((p) => p.id === commentsPostId) : null;

    const renderPost = ({ item: post }) => {
        const author = post.author || {};
        const outfit = post.outfit || {};
        const garments = post.garments || [];
        const photos = post.photos || [];
        const isMe = post.user_id === currentUserId || author.id === currentUserId;

        return (
            <View style={[styles.postCard, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
                {/* F1: Instagram-style header — avatar + name + "..." menu */}
                <View style={styles.postHeader}>
                    <TouchableOpacity
                        style={styles.postHeaderUser}
                        onPress={() => navigation.navigate('UserProfile', { userId: author.id })}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.avatar, { backgroundColor: c.primary + '20' }]}>
                            {author.avatarUrl ? (
                                <Image source={{ uri: `${IMAGE_BASE_URL}${author.avatarUrl}` }} style={styles.avatarImg} />
                            ) : (
                                <Text style={[styles.avatarText, { color: c.primary }]}>
                                    {(author.fullName || '?')[0].toUpperCase()}
                                </Text>
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.authorName, { color: c.text }]}>
                                {author.fullName || 'Usuario'}
                            </Text>
                            {author.username ? (
                                <Text style={[styles.timeAgo, { color: c.textMuted }]}>
                                    @{author.username} · {getTimeAgo(post.created_at)}
                                </Text>
                            ) : (
                                <Text style={[styles.timeAgo, { color: c.textMuted }]}>
                                    {getTimeAgo(post.created_at)}
                                </Text>
                            )}
                        </View>
                    </TouchableOpacity>
                    {isMe && (
                        <TouchableOpacity
                            onPress={() => handleDeletePost(post)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={styles.menuBtn}
                        >
                            <Ionicons name="ellipsis-horizontal" size={22} color={c.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Outfit info bar — tappable to see detail */}
                <TouchableOpacity
                    style={[styles.outfitBox, { backgroundColor: c.surfaceVariant, borderColor: c.border }]}
                    onPress={() => setSelectedPost(post)}
                    activeOpacity={0.7}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Ionicons name="albums-outline" size={16} color={c.text} style={{ marginRight: 6 }} />
                        <Text style={[styles.outfitName, { color: c.text }]}>{outfit.name || 'Outfit'}</Text>
                    </View>
                    {outfit.occasion && (
                        <View style={[styles.occasionBadge, { backgroundColor: c.primary + '15' }]}>
                            <Text style={[styles.occasionText, { color: c.primary }]}>{outfit.occasion}</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* User-uploaded photos */}
                {photos.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.postPhotosRow} contentContainerStyle={styles.postPhotosContent}>
                        {photos.map((photoUrl, idx) => (
                            <Image
                                key={idx}
                                source={{ uri: `${IMAGE_BASE_URL}${photoUrl}` }}
                                style={styles.postPhoto}
                                resizeMode="cover"
                            />
                        ))}
                    </ScrollView>
                )}

                {/* Garment carousel — full-width auto-sliding + swipeable */}
                {garments.length > 0 && (
                    <GarmentCarousel garments={garments} height={Math.round(SCREEN_WIDTH * 0.85)} />
                )}

                {/* F1: Instagram-style action bar — icons only */}
                <View style={styles.actionsBar}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(post)} activeOpacity={0.6}>
                        <Animated.View style={{ transform: [{ scale: getLikeAnim(post.id) }] }}>
                            <Ionicons name={post.liked_by_me ? 'heart' : 'heart-outline'} size={26} color={post.liked_by_me ? c.error : c.text} />
                        </Animated.View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => openComments(post.id)} activeOpacity={0.6}>
                        <Ionicons name="chatbubble-outline" size={23} color={c.text} />
                    </TouchableOpacity>
                    <View style={styles.actionBtn}>
                        <Ionicons name="shirt-outline" size={21} color={c.text} />
                    </View>
                    {outfit.season && (
                        <View style={[styles.seasonTag, { backgroundColor: c.accent + '15' }]}>
                            <Text style={[styles.seasonTagText, { color: c.accent }]}>{outfit.season}</Text>
                        </View>
                    )}
                </View>

                {/* F1: Counts row below icons, like Instagram */}
                <View style={styles.countsRow}>
                    {(post.like_count || 0) > 0 && (
                        <TouchableOpacity onPress={() => handleOpenLikers(post.id)}>
                            <Text style={[styles.likesCount, { color: c.text }]}>
                                {post.like_count} Me gusta
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Caption below actions, Instagram-style: bold author + caption */}
                {post.caption ? (
                    <View style={styles.captionRow}>
                        <Text style={[styles.captionAuthor, { color: c.text }]}>{author.fullName || 'Usuario'}</Text>
                        <Text style={[styles.captionText, { color: c.text }]}>{' '}{post.caption}</Text>
                    </View>
                ) : null}

                {/* Inline comments */}
                {(comments[post.id] || []).length > 0 && (
                    <View style={styles.inlineComments}>
                        {(comments[post.id] || []).map((comment) => (
                            <View key={comment.id} style={styles.inlineCommentRow}>
                                <Text style={[styles.inlineCommentAuthor, { color: c.text }]}>
                                    {comment.author?.fullName || 'Usuario'}
                                </Text>
                                <Text style={[styles.inlineCommentText, { color: c.text }]}>
                                    {' '}{comment.text}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Add comment link */}
                <TouchableOpacity onPress={() => openComments(post.id)} style={styles.viewCommentsBtn}>
                    <Text style={[styles.viewCommentsText, { color: c.textMuted }]}>
                        Añadir un comentario...
                    </Text>
                </TouchableOpacity>

                {/* Garment count */}
                <Text style={[styles.garmentCountText, { color: c.textMuted }]}>
                    {garments.length} prenda{garments.length !== 1 ? 's' : ''}
                </Text>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <StatusBar barStyle={c.statusBar} />

            {/* Header */}
            <ScreenHeader
                title="Social"
                leftAction={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                        <TouchableOpacity onPress={openSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="search-outline" size={22} color={c.text} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => navigation.navigate('Messages')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="chatbubbles-outline" size={22} color={c.text} />
                        </TouchableOpacity>
                    </View>
                }
                rightAction={
                    <TouchableOpacity
                        style={[styles.shareHeaderBtn, { backgroundColor: c.primary }]}
                        onPress={openShareModal}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="add" size={16} color="#FFF" />
                        <Text style={styles.shareHeaderBtnText}>Compartir</Text>
                    </TouchableOpacity>
                }
            />

            {/* Tabs: Siguiendo / Descubrir */}
            <View style={[styles.tabBar, { borderBottomColor: c.border }]}>
                <TouchableOpacity
                    style={[styles.tabBtn, feedMode === 'following' && styles.tabBtnActive, feedMode === 'following' && { borderBottomColor: c.primary }]}
                    onPress={() => switchTab('following')}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.tabText, { color: feedMode === 'following' ? c.primary : c.textMuted }]}>Siguiendo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabBtn, feedMode === 'discover' && styles.tabBtnActive, feedMode === 'discover' && { borderBottomColor: c.primary }]}
                    onPress={() => switchTab('discover')}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.tabText, { color: feedMode === 'discover' ? c.primary : c.textMuted }]}>Descubrir</Text>
                </TouchableOpacity>
            </View>

            {/* Feed */}
            <FlatList
                data={feed}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderPost}
                contentContainerStyle={styles.feedContent}
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={c.primary} />
                }
                onEndReached={loadMore}
                onEndReachedThreshold={0.3}
                ListFooterComponent={
                    isLoading && !isRefreshing ? (
                        <ActivityIndicator style={{ paddingVertical: 20 }} color={c.primary} />
                    ) : null
                }
                ListEmptyComponent={
                    !isLoading ? (
                        <EmptyState
                            icon={feedMode === 'following' ? 'people-outline' : 'globe-outline'}
                            title={feedMode === 'following' ? 'Sin publicaciones' : 'Feed vacío'}
                            description={feedMode === 'following'
                                ? 'Sigue a otros usuarios para ver sus outfits aquí.'
                                : 'Sé el primero en compartir un outfit con la comunidad.'}
                            action={feedMode === 'discover' ? { label: 'Compartir un Outfit', onPress: openShareModal } : undefined}
                        />
                    ) : null
                }
            />

            {/* Modal: Detalle de post (feed-style card) */}
            <Modal visible={!!selectedPost} animationType="slide" transparent onRequestClose={() => setSelectedPost(null)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: c.surface, maxHeight: '90%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: c.text }]}>Publicación</Text>
                            <TouchableOpacity onPress={() => setSelectedPost(null)}>
                                <Ionicons name="close" size={22} color={c.primary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {selectedPost && (() => {
                                const post = selectedPost;
                                const author = post.author || {};
                                const outfit = post.outfit || {};
                                const postGarments = post.garments || [];
                                const photos = post.photos || [];

                                return (
                                    <View>
                                        {/* Author header */}
                                        <View style={styles.postHeader}>
                                            <View style={styles.postHeaderUser}>
                                                <View style={[styles.avatar, { backgroundColor: c.primary + '20' }]}>
                                                    {author.avatarUrl ? (
                                                        <Image source={{ uri: `${IMAGE_BASE_URL}${author.avatarUrl}` }} style={styles.avatarImg} />
                                                    ) : (
                                                        <Text style={[styles.avatarText, { color: c.primary }]}>
                                                            {(author.fullName || '?')[0].toUpperCase()}
                                                        </Text>
                                                    )}
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.authorName, { color: c.text }]}>
                                                        {author.fullName || 'Usuario'}
                                                    </Text>
                                                    <Text style={[styles.timeAgo, { color: c.textMuted }]}>
                                                        {getTimeAgo(post.created_at)}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        {/* Outfit info */}
                                        <View style={[styles.outfitBox, { backgroundColor: c.surfaceVariant, borderColor: c.border }]}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                <Ionicons name="albums-outline" size={16} color={c.text} style={{ marginRight: 6 }} />
                                                <Text style={[styles.outfitName, { color: c.text }]}>{outfit.name || 'Outfit'}</Text>
                                            </View>
                                            {outfit.occasion && (
                                                <View style={[styles.occasionBadge, { backgroundColor: c.primary + '15' }]}>
                                                    <Text style={[styles.occasionText, { color: c.primary }]}>{outfit.occasion}</Text>
                                                </View>
                                            )}
                                        </View>

                                        {/* Photos */}
                                        {photos.length > 0 && (
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.postPhotosRow} contentContainerStyle={styles.postPhotosContent}>
                                                {photos.map((photoUrl, idx) => (
                                                    <Image
                                                        key={idx}
                                                        source={{ uri: `${IMAGE_BASE_URL}${photoUrl}` }}
                                                        style={styles.postPhoto}
                                                        resizeMode="cover"
                                                    />
                                                ))}
                                            </ScrollView>
                                        )}

                                        {/* Garment carousel */}
                                        {postGarments.length > 0 && (
                                            <GarmentCarousel garments={postGarments} height={Math.round(SCREEN_WIDTH * 0.7)} />
                                        )}

                                        {/* Actions */}
                                        <View style={styles.actionsBar}>
                                            <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(post)} activeOpacity={0.6}>
                                                <Ionicons name={post.liked_by_me ? 'heart' : 'heart-outline'} size={26} color={post.liked_by_me ? c.error : c.text} />
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.actionBtn} onPress={() => { setSelectedPost(null); setTimeout(() => openComments(post.id), 300); }} activeOpacity={0.6}>
                                                <Ionicons name="chatbubble-outline" size={23} color={c.text} />
                                            </TouchableOpacity>
                                            <View style={styles.actionBtn}>
                                                <Ionicons name="shirt-outline" size={21} color={c.text} />
                                            </View>
                                            {outfit.season && (
                                                <View style={[styles.seasonTag, { backgroundColor: c.accent + '15' }]}>
                                                    <Text style={[styles.seasonTagText, { color: c.accent }]}>{outfit.season}</Text>
                                                </View>
                                            )}
                                        </View>

                                        {/* Counts */}
                                        <View style={styles.countsRow}>
                                            {(post.like_count || 0) > 0 && (
                                                <TouchableOpacity onPress={() => handleOpenLikers(post.id)}>
                                                    <Text style={[styles.likesCount, { color: c.text }]}>
                                                        {post.like_count} Me gusta
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>

                                        {/* Caption */}
                                        {post.caption ? (
                                            <View style={styles.captionRow}>
                                                <Text style={[styles.captionAuthor, { color: c.text }]}>{author.fullName || 'Usuario'}</Text>
                                                <Text style={[styles.captionText, { color: c.text }]}>{' '}{post.caption}</Text>
                                            </View>
                                        ) : null}

                                        {/* Garment count */}
                                        <Text style={[styles.garmentCountText, { color: c.textMuted }]}>
                                            {postGarments.length} prenda{postGarments.length !== 1 ? 's' : ''}
                                        </Text>
                                    </View>
                                );
                            })()}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Modal: Comentarios — improved layout + reply */}
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

                        {/* Post info */}
                        {commentsPost && (
                            <View style={[styles.commentsPostInfo, { borderBottomColor: c.border }]}>
                                <View style={styles.commentsPostHeader}>
                                    <View style={[styles.commentAvatar, { backgroundColor: c.primary + '20' }]}>
                                        {commentsPost.author?.avatarUrl ? (
                                            <Image source={{ uri: `${IMAGE_BASE_URL}${commentsPost.author.avatarUrl}` }} style={styles.commentAvatarImg} />
                                        ) : (
                                            <Text style={[styles.commentAvatarText, { color: c.primary }]}>
                                                {(commentsPost.author?.fullName || '?')[0].toUpperCase()}
                                            </Text>
                                        )}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.commentAuthorBold, { color: c.text }]}>
                                            {commentsPost.author?.fullName || 'Usuario'}
                                        </Text>
                                        {commentsPost.caption ? (
                                            <Text style={[styles.commentTextBody, { color: c.text }]} numberOfLines={2}>
                                                {commentsPost.caption}
                                            </Text>
                                        ) : (
                                            <Text style={[styles.commentsOutfitName, { color: c.primary }]}>
                                                {commentsPost.outfit?.name || 'Outfit'}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Comments list */}
                        {commentsLoading ? (
                            <ActivityIndicator style={{ paddingVertical: 32 }} color={c.primary} />
                        ) : (
                            <FlatList
                                data={commentsPostId ? (comments[commentsPostId] || []) : []}
                                keyExtractor={(item) => item.id.toString()}
                                style={{ flex: 1 }}
                                contentContainerStyle={{ paddingVertical: 4 }}
                                ListEmptyComponent={
                                    <View style={styles.emptyCommentsWrap}>
                                        <Ionicons name="chatbubble-outline" size={40} color={c.textMuted} style={{ marginBottom: 8 }} />
                                        <Text style={[styles.emptyCommentsTitle, { color: c.text }]}>Sin comentarios</Text>
                                        <Text style={[styles.emptyCommentsText, { color: c.textMuted }]}>
                                            Sé el primero en comentar.
                                        </Text>
                                    </View>
                                }
                                renderItem={({ item: comment }) => {
                                    const isOwn = comment.author?.id === user?.id;
                                    return (
                                        <View style={[styles.commentCard, { backgroundColor: c.background }]}>
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
                                                    <Text style={[styles.commentAuthorBold, { color: c.text }]}>
                                                        {comment.author?.fullName || 'Usuario'}
                                                    </Text>
                                                    <Text style={[styles.commentTime, { color: c.textMuted }]}>
                                                        {getTimeAgo(comment.created_at)}
                                                    </Text>
                                                </View>
                                                <Text style={[styles.commentTextBody, { color: c.text }]}>
                                                    {comment.text}
                                                </Text>
                                                <View style={styles.commentActions}>
                                                    <TouchableOpacity
                                                        onPress={() => handleReplyTo(comment)}
                                                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                                        style={styles.commentReplyBtn}
                                                    >
                                                        <Ionicons name="arrow-undo-outline" size={14} color={c.textMuted} />
                                                        <Text style={[styles.commentReplyText, { color: c.textMuted }]}>Responder</Text>
                                                    </TouchableOpacity>
                                                    {isOwn && (
                                                        <TouchableOpacity
                                                            onPress={() => handleDeleteComment(comment.id)}
                                                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                                            style={styles.commentReplyBtn}
                                                        >
                                                            <Ionicons name="trash-outline" size={14} color={c.error} />
                                                            <Text style={[styles.commentReplyText, { color: c.error }]}>Eliminar</Text>
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            </View>
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
                                ref={commentInputRef}
                                style={[styles.commentInput, { color: c.text, backgroundColor: c.surfaceVariant, borderColor: c.border }]}
                                placeholder={replyingTo ? `Responder a ${replyingTo.fullName}...` : 'Escribe un comentario...'}
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

            {/* Modal: Compartir outfit (F3 enhancements) */}
            <Modal visible={showShareModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: c.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: c.text }]}>Compartir Outfit</Text>
                            <TouchableOpacity onPress={() => setShowShareModal(false)}>
                                <Ionicons name="close" size={22} color={c.primary} />
                            </TouchableOpacity>
                        </View>

                        {/* F3: Select outfit first */}
                        <Text style={[styles.selectLabel, { color: c.textSecondary }]}>Selecciona un outfit:</Text>
                        <FlatList
                            data={outfits}
                            keyExtractor={(item) => item.id.toString()}
                            style={{ maxHeight: 220 }}
                            renderItem={({ item }) => {
                                const isSelected = selectedOutfitId === item.id;
                                return (
                                    <TouchableOpacity
                                        style={[
                                            styles.outfitOption,
                                            { borderBottomColor: c.border },
                                            isSelected && { backgroundColor: c.primary + '10' },
                                        ]}
                                        onPress={() => setSelectedOutfitId(item.id)}
                                    >
                                        <Ionicons name={isSelected ? 'checkmark-circle' : 'albums-outline'} size={22} color={isSelected ? c.primary : c.textMuted} style={{ marginRight: 10 }} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.optionName, { color: c.text }]}>{item.name}</Text>
                                            <Text style={[styles.optionMeta, { color: c.textMuted }]}>
                                                {item.occasion || 'Sin ocasión'} · {item.garments?.length || 0} prendas
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={
                                <Text style={[styles.emptyPicker, { color: c.textMuted }]}>
                                    No tienes outfits. Crea uno primero.
                                </Text>
                            }
                        />

                        {/* F3: Caption TextInput before the share button */}
                        <Text style={[styles.selectLabel, { color: c.textSecondary, marginTop: 12 }]}>Escribe un mensaje (opcional):</Text>
                        <TextInput
                            style={[styles.captionInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.inputText }]}
                            placeholder="¿Qué quieres decir sobre este outfit?"
                            placeholderTextColor={c.placeholder}
                            value={caption}
                            onChangeText={setCaption}
                            multiline
                            maxLength={280}
                        />
                        <Text style={[styles.charCount, { color: c.textMuted }]}>{caption.length}/280</Text>

                        {/* Photo picker */}
                        <Text style={[styles.selectLabel, { color: c.textSecondary }]}>Fotos (opcional, max 5):</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoPickerRow} contentContainerStyle={styles.photoPickerContent}>
                            {sharePhotos.map((uri, idx) => (
                                <View key={idx} style={styles.photoThumbWrap}>
                                    <Image source={{ uri }} style={styles.photoThumb} />
                                    <TouchableOpacity style={styles.photoRemoveBtn} onPress={() => removeSharePhoto(idx)}>
                                        <Ionicons name="close-circle" size={20} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {sharePhotos.length < 5 && (
                                <TouchableOpacity style={[styles.photoAddBtn, { borderColor: c.border, backgroundColor: c.surfaceVariant }]} onPress={pickSharePhotos}>
                                    <Ionicons name="camera-outline" size={24} color={c.textMuted} />
                                    <Text style={[styles.photoAddText, { color: c.textMuted }]}>Añadir</Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>

                        {/* Botón compartir */}
                        <TouchableOpacity
                            style={[
                                styles.shareBtn,
                                { backgroundColor: selectedOutfitId ? c.primary : c.border },
                            ]}
                            onPress={handleShare}
                            disabled={!selectedOutfitId}
                            activeOpacity={0.7}
                        >
                            {selectedOutfitId ? (
                                <View style={styles.shareBtnInner}>
                                    <Ionicons name="paper-plane-outline" size={16} color="#FFF" />
                                    <Text style={styles.shareBtnText}>Compartir al Feed</Text>
                                </View>
                            ) : (
                                <Text style={styles.shareBtnText}>Selecciona un outfit</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal: Búsqueda */}
            <Modal visible={showSearch} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSearch(false)}>
                <View style={[styles.searchRoot, { backgroundColor: c.background }]}>
                    {/* Barra de búsqueda */}
                    <View style={[styles.searchBar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
                        <TouchableOpacity onPress={() => setShowSearch(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="arrow-back" size={22} color={c.text} />
                        </TouchableOpacity>
                        <TextInput
                            style={[styles.searchInput, { color: c.text, backgroundColor: c.surfaceVariant, borderColor: c.border }]}
                            placeholder="Buscar personas, outfits, prendas..."
                            placeholderTextColor={c.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus
                            maxLength={100}
                            returnKeyType="search"
                            onSubmitEditing={handleSearch}
                        />
                        <TouchableOpacity
                            style={[styles.searchBtn, { backgroundColor: searchQuery.trim().length >= 2 && !isSearching ? c.primary : c.border }]}
                            onPress={handleSearch}
                            disabled={searchQuery.trim().length < 2 || isSearching}
                        >
                            <Ionicons name="search" size={18} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Resultados */}
                    {isSearching ? (
                        <View style={styles.searchCentered}>
                            <ActivityIndicator size="large" color={c.primary} />
                            <Text style={[styles.searchInfoText, { color: c.textSecondary }]}>Buscando...</Text>
                        </View>
                    ) : hasSearched ? (
                        <FlatList
                            data={[
                                ...(searchResults.users.length > 0 ? [{ type: 'usersHeader' }] : []),
                                ...searchResults.users.map((u) => ({ type: 'user', ...u })),
                                ...(searchResults.posts.length > 0 ? [{ type: 'postsHeader' }] : []),
                                ...searchResults.posts.map((p) => ({ type: 'post', ...p })),
                                ...(searchResults.users.length === 0 && searchResults.posts.length === 0 ? [{ type: 'empty' }] : []),
                            ]}
                            keyExtractor={(item, i) => `${item.type}-${item.id || i}`}
                            contentContainerStyle={{ paddingBottom: 32 }}
                            renderItem={({ item }) => {
                                if (item.type === 'usersHeader') {
                                    return (
                                        <Text style={[styles.searchSectionTitle, { color: c.textSecondary }]}>Personas</Text>
                                    );
                                }
                                if (item.type === 'postsHeader') {
                                    return (
                                        <Text style={[styles.searchSectionTitle, { color: c.textSecondary }]}>Publicaciones</Text>
                                    );
                                }
                                if (item.type === 'empty') {
                                    return (
                                        <View style={styles.searchCentered}>
                                            <Ionicons name="search-outline" size={48} color={c.textMuted} style={{ marginBottom: 12 }} />
                                            <Text style={[styles.searchEmptyTitle, { color: c.text }]}>No hay resultados</Text>
                                            <Text style={[styles.searchInfoText, { color: c.textSecondary }]}>
                                                Prueba con otros terminos o explora el feed Descubrir.
                                            </Text>
                                        </View>
                                    );
                                }
                                if (item.type === 'user') {
                                    return (
                                        <TouchableOpacity
                                            style={[styles.searchUserRow, { borderBottomColor: c.border }]}
                                            onPress={() => {
                                                setShowSearch(false);
                                                navigation.navigate('UserProfile', { userId: item.id });
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[styles.avatar, { backgroundColor: c.primary + '20' }]}>
                                                {item.avatarUrl ? (
                                                    <Image source={{ uri: `${IMAGE_BASE_URL}${item.avatarUrl}` }} style={styles.avatarImg} />
                                                ) : (
                                                    <Text style={[styles.avatarText, { color: c.primary }]}>
                                                        {(item.fullName || '?')[0].toUpperCase()}
                                                    </Text>
                                                )}
                                            </View>
                                            <Text style={[styles.searchUserName, { color: c.text }]}>{item.fullName}</Text>
                                            <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
                                        </TouchableOpacity>
                                    );
                                }
                                if (item.type === 'post') {
                                    const postGarments = item.garments || [];
                                    const firstImg = postGarments.find((g) => g.image_url);
                                    return (
                                        <TouchableOpacity
                                            style={[styles.searchPostRow, { borderBottomColor: c.border }]}
                                            onPress={() => {
                                                setShowSearch(false);
                                                setSelectedPost(item);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            {firstImg ? (
                                                <Image
                                                    source={{ uri: `${IMAGE_BASE_URL}${firstImg.image_url}` }}
                                                    style={styles.searchPostThumb}
                                                />
                                            ) : (
                                                <View style={[styles.searchPostThumb, { backgroundColor: c.surfaceVariant, justifyContent: 'center', alignItems: 'center' }]}>
                                                    <Ionicons name="shirt-outline" size={20} color={c.textMuted} />
                                                </View>
                                            )}
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.searchPostName, { color: c.text }]} numberOfLines={1}>
                                                    {item.outfit?.name || 'Outfit'}
                                                </Text>
                                                <Text style={[styles.searchPostMeta, { color: c.textSecondary }]} numberOfLines={1}>
                                                    {item.author?.fullName} {item.outfit?.occasion ? `· ${item.outfit.occasion}` : ''}
                                                </Text>
                                                {item.caption ? (
                                                    <Text style={[styles.searchPostCaption, { color: c.textMuted }]} numberOfLines={1}>
                                                        {item.caption}
                                                    </Text>
                                                ) : null}
                                            </View>
                                            <View style={{ alignItems: 'center' }}>
                                                <Ionicons name="heart" size={14} color={c.error} />
                                                <Text style={[{ fontSize: 11, color: c.textMuted }]}>{item.like_count || 0}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                }
                                return null;
                            }}
                        />
                    ) : (
                        <View style={styles.searchCentered}>
                            <Ionicons name="search-outline" size={48} color={c.textMuted} style={{ marginBottom: 12 }} />
                            <Text style={[styles.searchInfoText, { color: c.textSecondary }]}>
                                Busca personas por nombre o publicaciones por outfit, prenda, ocasion...
                            </Text>
                        </View>
                    )}
                </View>
            </Modal>

            {/* Modal: Likers — quién dio like */}
            <Modal visible={showLikers} animationType="slide" transparent onRequestClose={() => setShowLikers(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: c.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: c.text }]}>Les gusta</Text>
                            <TouchableOpacity onPress={() => setShowLikers(false)}>
                                <Ionicons name="close" size={22} color={c.primary} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={likersData}
                            keyExtractor={(item, i) => `liker-${item.user?.id || i}`}
                            ListEmptyComponent={
                                <Text style={[{ textAlign: 'center', padding: 32, color: c.textMuted, fontSize: 14 }]}>
                                    Nadie ha dado like aún.
                                </Text>
                            }
                            renderItem={({ item }) => {
                                const u = item.user || {};
                                return (
                                    <TouchableOpacity
                                        style={[styles.searchUserRow, { borderBottomColor: c.border }]}
                                        onPress={() => {
                                            setShowLikers(false);
                                            navigation.navigate('UserProfile', { userId: u.id });
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.avatar, { backgroundColor: c.primary + '20' }]}>
                                            {u.avatarUrl ? (
                                                <Image source={{ uri: `${IMAGE_BASE_URL}${u.avatarUrl}` }} style={styles.avatarImg} />
                                            ) : (
                                                <Text style={[styles.avatarText, { color: c.primary }]}>
                                                    {(u.fullName || '?')[0].toUpperCase()}
                                                </Text>
                                            )}
                                        </View>
                                        <Text style={[styles.searchUserName, { color: c.text }]}>{u.fullName || 'Usuario'}</Text>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    feedContent: { paddingTop: 8, paddingBottom: 32 },

    // Tab bar
    tabBar: {
        flexDirection: 'row', borderBottomWidth: 1,
    },
    tabBtn: {
        flex: 1, alignItems: 'center', paddingVertical: 12,
        borderBottomWidth: 2, borderBottomColor: 'transparent',
    },
    tabBtnActive: {},
    tabText: { fontSize: 15, fontWeight: '700' },

    // Instagram-style card: flat, no border radius, divider at bottom
    postCard: {
        borderRadius: 0, borderWidth: 0, borderBottomWidth: 0.5, marginBottom: 4,
    },
    // Header row: avatar + name on left, "..." on right
    postHeader: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
    },
    postHeaderUser: {
        flexDirection: 'row', alignItems: 'center', flex: 1,
    },
    avatar: {
        width: 38, height: 38, borderRadius: 19,
        justifyContent: 'center', alignItems: 'center', marginRight: 10, overflow: 'hidden',
    },
    avatarImg: { width: 38, height: 38, borderRadius: 19 },
    avatarText: { fontSize: 16, fontWeight: '800' },
    authorName: { fontSize: 14, fontWeight: '700' },
    timeAgo: { fontSize: 12, marginTop: 1 },
    menuBtn: { padding: 6 },

    // Outfit info
    outfitBox: {
        marginHorizontal: 14, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4,
    },
    outfitName: { fontSize: 14, fontWeight: '700', flex: 1 },
    occasionBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
    occasionText: { fontSize: 11, fontWeight: '600' },

    // Outfit detail modal garment cards
    detailGarmentCard: { flex: 1, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
    detailGarmentImg: { width: '100%', height: 130 },
    detailGarmentPlaceholder: { width: '100%', height: 130, justifyContent: 'center', alignItems: 'center' },

    // Instagram-style actions bar — icons only, horizontal
    actionsBar: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 2, gap: 16,
    },
    actionBtn: { padding: 2 },
    actionCount: { fontSize: 14, fontWeight: '700' },
    actionLabel: { fontSize: 13 },

    // Counts row below icons
    countsRow: {
        paddingHorizontal: 14, paddingTop: 4,
    },
    likesCount: { fontSize: 14, fontWeight: '700' },

    // Caption row: bold author + caption text
    captionRow: {
        flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, paddingTop: 4,
    },
    captionAuthor: { fontSize: 14, fontWeight: '700' },
    captionText: { fontSize: 14, lineHeight: 20, flexShrink: 1 },

    // View comments link
    viewCommentsBtn: { paddingHorizontal: 14, paddingTop: 4 },
    viewCommentsText: { fontSize: 14 },

    // Inline comments in feed
    inlineComments: { paddingHorizontal: 14, paddingTop: 4 },
    inlineCommentRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 2 },
    inlineCommentAuthor: { fontSize: 13, fontWeight: '700' },
    inlineCommentText: { fontSize: 13, lineHeight: 18, flexShrink: 1 },

    // Garment count text
    garmentCountText: { fontSize: 13, paddingHorizontal: 14, paddingTop: 2, paddingBottom: 12 },

    seasonTag: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
    seasonTagText: { fontSize: 12, fontWeight: '600' },

    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 20, fontWeight: '700' },
    modalClose: { fontSize: 22, fontWeight: '700' },

    // F2: Comments modal post info
    commentsPostInfo: { borderBottomWidth: 1, paddingBottom: 12, marginBottom: 8 },
    commentsPostHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    commentsOutfitName: { fontSize: 13, fontWeight: '600', marginTop: 2 },
    commentsCaption: { fontSize: 14, lineHeight: 19, marginLeft: 44 },

    // Share modal
    captionInput: {
        borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 15,
        minHeight: 60, textAlignVertical: 'top', marginBottom: 4,
    },
    charCount: { fontSize: 12, textAlign: 'right', marginBottom: 12 },
    selectLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    outfitOption: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5,
        paddingHorizontal: 4, borderRadius: 8,
    },
    optionName: { fontSize: 15, fontWeight: '600' },
    optionMeta: { fontSize: 12, marginTop: 2 },
    emptyPicker: { textAlign: 'center', padding: 32, fontSize: 14 },
    shareBtn: {
        marginTop: 16, paddingVertical: 16, borderRadius: 14, alignItems: 'center',
        shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2, shadowRadius: 6, elevation: 3,
    },
    shareBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    shareBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

    // Header share button
    shareHeaderBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18,
    },
    shareHeaderBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

    // Search modal
    searchRoot: { flex: 1 },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 14, paddingTop: 50, paddingBottom: 12, borderBottomWidth: 1,
    },
    searchInput: {
        flex: 1, borderWidth: 1, borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 9, fontSize: 14,
    },
    searchBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
    searchCentered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    searchInfoText: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
    searchEmptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
    searchSectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    searchUserRow: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, gap: 12,
    },
    searchUserName: { fontSize: 15, fontWeight: '600', flex: 1 },
    searchPostRow: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 0.5, gap: 12,
    },
    searchPostThumb: { width: 52, height: 52, borderRadius: 10, overflow: 'hidden' },
    searchPostName: { fontSize: 15, fontWeight: '700' },
    searchPostMeta: { fontSize: 12, marginTop: 2 },
    searchPostCaption: { fontSize: 12, marginTop: 2, fontStyle: 'italic' },

    // Comentarios — improved layout
    commentsModal: {
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        maxHeight: '85%', paddingHorizontal: 16, paddingBottom: 8,
    },
    dragHandle: { alignItems: 'center', paddingVertical: 10 },
    dragBar: { width: 40, height: 4, borderRadius: 2 },
    commentsHeaderRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12,
    },
    commentsTitle: { fontSize: 18, fontWeight: '800' },
    commentCard: {
        flexDirection: 'row', alignItems: 'flex-start',
        paddingVertical: 12, paddingHorizontal: 10, marginVertical: 2,
        borderRadius: 12,
    },
    commentRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 0.5 },
    commentAvatar: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginRight: 10, overflow: 'hidden' },
    commentAvatarImg: { width: 34, height: 34, borderRadius: 17 },
    commentAvatarText: { fontSize: 14, fontWeight: '700' },
    commentMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
    commentAuthor: { fontSize: 13, fontWeight: '700' },
    commentAuthorBold: { fontSize: 14, fontWeight: '800' },
    commentTime: { fontSize: 11 },
    commentText: { fontSize: 14, lineHeight: 19 },
    commentTextBody: { fontSize: 14, lineHeight: 20, marginTop: 2 },
    commentActions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 6 },
    commentReplyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    commentReplyText: { fontSize: 12, fontWeight: '600' },
    replyIndicator: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: 1,
    },
    replyIndicatorText: { fontSize: 13 },
    emptyCommentsWrap: { alignItems: 'center', paddingVertical: 40 },
    emptyCommentsTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
    emptyCommentsText: { fontSize: 14 },
    commentInputBar: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, gap: 8, paddingBottom: 4 },
    commentInput: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14 },
    commentSendBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },

    // Post photos (user-uploaded)
    postPhotosRow: { marginTop: 4 },
    postPhotosContent: { paddingHorizontal: 14, gap: 8 },
    postPhoto: { width: SCREEN_WIDTH * 0.65, height: SCREEN_WIDTH * 0.5, borderRadius: 12 },

    // Share modal photo picker
    photoPickerRow: { marginBottom: 8 },
    photoPickerContent: { gap: 8 },
    photoThumbWrap: { position: 'relative' },
    photoThumb: { width: 72, height: 72, borderRadius: 10 },
    photoRemoveBtn: { position: 'absolute', top: -6, right: -6, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10 },
    photoAddBtn: {
        width: 72, height: 72, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed',
        justifyContent: 'center', alignItems: 'center', gap: 2,
    },
    photoAddText: { fontSize: 10, fontWeight: '600' },
});

export default SocialScreen;
