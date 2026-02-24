// Pantalla Social — feed público de outfits con likes y compartir (Instagram-style)
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View, Text, TouchableOpacity, FlatList, Modal, TextInput, Image,
    StyleSheet, ActivityIndicator, StatusBar, RefreshControl,
    KeyboardAvoidingView, Platform, Alert, Dimensions, Animated,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFeed, toggleLike, shareOutfit, unshareOutfit, resetFeed, fetchComments, addComment, removeComment } from '../store/socialSlice';
import { fetchOutfits } from '../store/outfitsSlice';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { IMAGE_BASE_URL } from '../services/api';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GARMENT_SIZE = Math.floor((SCREEN_WIDTH - 6) / 3);

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

    // Comments state
    const [commentsPostId, setCommentsPostId] = useState(null);
    const [showComments, setShowComments] = useState(false);
    const [commentInput, setCommentInput] = useState('');
    const commentInputRef = useRef(null);
    const likeAnims = useRef({});

    const getLikeAnim = (postId) => {
        if (!likeAnims.current[postId]) {
            likeAnims.current[postId] = new Animated.Value(1);
        }
        return likeAnims.current[postId];
    };

    const openComments = (postId) => {
        setCommentsPostId(postId);
        setCommentInput('');
        setShowComments(true);
        dispatch(fetchComments(postId));
    };

    const handleSendComment = () => {
        const text = commentInput.trim();
        if (!text || !commentsPostId) return;
        setCommentInput('');
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
        dispatch(fetchFeed({ limit: 20, offset: 0 }));
    }, [dispatch]);

    const onRefresh = useCallback(() => {
        dispatch(fetchFeed({ limit: 20, offset: 0 }));
    }, [dispatch]);

    const loadMore = () => {
        if (!isLoading && hasMore) {
            dispatch(fetchFeed({ limit: 20, offset: feed.length }));
        }
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
        setShowShareModal(true);
    };

    const handleShare = () => {
        if (!selectedOutfitId) return;
        dispatch(shareOutfit({ outfitId: selectedOutfitId, caption }));
        setShowShareModal(false);
        setCaption('');
        setSelectedOutfitId(null);
    };

    // Find current post for comments modal (F2)
    const commentsPost = commentsPostId ? feed.find((p) => p.id === commentsPostId) : null;

    const renderPost = ({ item: post }) => {
        const author = post.author || {};
        const outfit = post.outfit || {};
        const garments = post.garments || [];
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
                            <Text style={[styles.timeAgo, { color: c.textMuted }]}>
                                {getTimeAgo(post.created_at)}
                            </Text>
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

                {/* Outfit info bar */}
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

                {/* F1: Larger garment mosaic — Instagram-style grid */}
                {garments.length > 0 && (
                    <View style={styles.garmentGrid}>
                        {garments.slice(0, 6).map((g, idx) => (
                            <View key={g.id || idx} style={[styles.garmentThumb, { backgroundColor: c.surfaceVariant, borderColor: c.border }]}>
                                {g.image_url ? (
                                    <Image source={{ uri: `${IMAGE_BASE_URL}${g.image_url}` }} style={styles.garmentImg} resizeMode="cover" />
                                ) : (
                                    <View style={styles.garmentPlaceholder}>
                                        <Ionicons name="shirt-outline" size={28} color={c.textMuted} />
                                        <Text style={[styles.garmentMiniName, { color: c.textMuted }]} numberOfLines={1}>
                                            {g.name}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        ))}
                        {garments.length > 6 && (
                            <View style={[styles.garmentThumb, styles.moreOverlay, { backgroundColor: c.surfaceVariant }]}>
                                <Text style={[styles.moreText, { color: c.textSecondary }]}>+{garments.length - 6}</Text>
                            </View>
                        )}
                    </View>
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
                        <Text style={[styles.likesCount, { color: c.text }]}>
                            {post.like_count} Me gusta
                        </Text>
                    )}
                </View>

                {/* Caption below actions, Instagram-style: bold author + caption */}
                {post.caption ? (
                    <View style={styles.captionRow}>
                        <Text style={[styles.captionAuthor, { color: c.text }]}>{author.fullName || 'Usuario'}</Text>
                        <Text style={[styles.captionText, { color: c.text }]}>{' '}{post.caption}</Text>
                    </View>
                ) : null}

                {/* "View comments" link */}
                {(post.comment_count || 0) > 0 && (
                    <TouchableOpacity onPress={() => openComments(post.id)} style={styles.viewCommentsBtn}>
                        <Text style={[styles.viewCommentsText, { color: c.textMuted }]}>
                            Ver {post.comment_count} comentario{post.comment_count !== 1 ? 's' : ''}
                        </Text>
                    </TouchableOpacity>
                )}

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
                rightAction={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('UserProfile', { userId: user?.id })}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="person-outline" size={22} color={c.text} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={openShareModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: c.primary }}>+ Compartir</Text>
                        </TouchableOpacity>
                    </View>
                }
            />

            {/* Feed */}
            <FlatList
                data={feed}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderPost}
                contentContainerStyle={styles.feedContent}
                showsVerticalScrollIndicator={false}
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
                            icon="globe-outline"
                            title="Feed vacío"
                            description="Sé el primero en compartir un outfit con la comunidad."
                            action={{ label: 'Compartir un Outfit', onPress: openShareModal }}
                        />
                    ) : null
                }
            />

            {/* Modal: Comentarios (F2 enhancements) */}
            <Modal visible={showComments} animationType="slide" transparent onRequestClose={() => setShowComments(false)}>
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={[styles.modalContent, { backgroundColor: c.surface, maxHeight: '75%' }]}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: c.text }]}>Comentarios</Text>
                            <TouchableOpacity onPress={() => setShowComments(false)}>
                                <Ionicons name="close" size={22} color={c.primary} />
                            </TouchableOpacity>
                        </View>

                        {/* F2: Post info at top of comments modal */}
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
                                        <Text style={[styles.commentAuthor, { color: c.text }]}>
                                            {commentsPost.author?.fullName || 'Usuario'}
                                        </Text>
                                        <Text style={[styles.commentsOutfitName, { color: c.primary }]}>
                                            {commentsPost.outfit?.name || 'Outfit'}
                                        </Text>
                                    </View>
                                </View>
                                {commentsPost.caption ? (
                                    <Text style={[styles.commentsCaption, { color: c.textSecondary }]}>
                                        {commentsPost.caption}
                                    </Text>
                                ) : null}
                            </View>
                        )}

                        {/* Lista de comentarios */}
                        {commentsLoading ? (
                            <ActivityIndicator style={{ paddingVertical: 32 }} color={c.primary} />
                        ) : (
                            <FlatList
                                data={commentsPostId ? (comments[commentsPostId] || []) : []}
                                keyExtractor={(item) => item.id.toString()}
                                style={{ flex: 1 }}
                                contentContainerStyle={{ paddingVertical: 8 }}
                                ListEmptyComponent={
                                    <Text style={[styles.emptyPicker, { color: c.textMuted }]}>
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

                        {/* Input enviar */}
                        <View style={[styles.commentInputBar, { borderTopColor: c.border }]}>
                            <TextInput
                                ref={commentInputRef}
                                style={[styles.commentInput, { color: c.text, backgroundColor: c.surfaceVariant, borderColor: c.border }]}
                                placeholder="Escribe un comentario..."
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

                        {/* Botón compartir — dispatch includes caption */}
                        <TouchableOpacity
                            style={[
                                styles.shareBtn,
                                { backgroundColor: selectedOutfitId ? c.primary : c.border },
                            ]}
                            onPress={handleShare}
                            disabled={!selectedOutfitId}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.shareBtnText}>
                                {selectedOutfitId ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons name="paper-plane-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
                                        <Text style={styles.shareBtnText}>Compartir al Feed</Text>
                                    </View>
                                ) : 'Selecciona un outfit'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    feedContent: { paddingTop: 8, paddingBottom: 32 },

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

    // Larger garment grid — 3 columns, fills width
    garmentGrid: {
        flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 1, paddingVertical: 2, gap: 2,
    },
    garmentThumb: {
        width: GARMENT_SIZE, height: GARMENT_SIZE, borderRadius: 2, borderWidth: 0.5, overflow: 'hidden',
    },
    garmentImg: { width: '100%', height: '100%' },
    garmentPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 6 },
    garmentMiniName: { fontSize: 10, textAlign: 'center', marginTop: 3 },
    moreOverlay: { justifyContent: 'center', alignItems: 'center' },
    moreText: { fontSize: 18, fontWeight: '700' },

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
    shareBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

    // Comentarios
    commentRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 0.5 },
    commentAvatar: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginRight: 10, overflow: 'hidden' },
    commentAvatarImg: { width: 34, height: 34, borderRadius: 17 },
    commentAvatarText: { fontSize: 14, fontWeight: '700' },
    commentMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
    commentAuthor: { fontSize: 13, fontWeight: '700' },
    commentTime: { fontSize: 11 },
    commentText: { fontSize: 14, lineHeight: 19 },
    commentInputBar: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, gap: 8, paddingBottom: 4 },
    commentInput: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14 },
    commentSendBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
});

export default SocialScreen;
