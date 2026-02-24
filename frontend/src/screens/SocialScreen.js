// Pantalla Social — feed público de outfits con likes y compartir
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View, Text, TouchableOpacity, FlatList, Modal, TextInput, Image,
    StyleSheet, ActivityIndicator, StatusBar, RefreshControl,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFeed, toggleLike, shareOutfit, resetFeed, fetchComments, addComment, removeComment } from '../store/socialSlice';
import { fetchOutfits } from '../store/outfitsSlice';
import { useTheme } from '../hooks/useTheme';
import { IMAGE_BASE_URL } from '../services/api';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';

const SocialScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { feed, hasMore, isLoading, isRefreshing, comments, commentsLoading } = useSelector((state) => state.social);
    const { outfits } = useSelector((state) => state.outfits);
    const { user } = useSelector((state) => state.auth);
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
        dispatch(toggleLike({ sharedId: post.id, isLiked: post.liked_by_me }));
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

    const renderPost = ({ item: post }) => {
        const author = post.author || {};
        const outfit = post.outfit || {};
        const garments = post.garments || [];
        const isMe = author.id === user?.id;

        return (
            <View style={[styles.postCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                {/* Cabecera del post — toca para ir al perfil */}
                <TouchableOpacity
                    style={styles.postHeader}
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
                            {author.fullName || 'Usuario'} {isMe && '(tú)'}
                        </Text>
                        <Text style={[styles.timeAgo, { color: c.textMuted }]}>
                            {getTimeAgo(post.created_at)}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Caption */}
                {post.caption ? (
                    <Text style={[styles.caption, { color: c.text }]}>{post.caption}</Text>
                ) : null}

                {/* Outfit info */}
                <View style={[styles.outfitBox, { backgroundColor: c.surfaceVariant, borderColor: c.border }]}>
                    <Text style={[styles.outfitName, { color: c.text }]}>
                        👔 {outfit.name || 'Outfit'}
                    </Text>
                    {outfit.occasion && (
                        <View style={[styles.occasionBadge, { backgroundColor: c.primary + '15' }]}>
                            <Text style={[styles.occasionText, { color: c.primary }]}>{outfit.occasion}</Text>
                        </View>
                    )}
                </View>

                {/* Mosaico de prendas */}
                {garments.length > 0 && (
                    <View style={styles.garmentGrid}>
                        {garments.slice(0, 4).map((g, idx) => (
                            <View key={g.id || idx} style={[styles.garmentThumb, { backgroundColor: c.surfaceVariant, borderColor: c.border }]}>
                                {g.image_url ? (
                                    <Image source={{ uri: `${IMAGE_BASE_URL}${g.image_url}` }} style={styles.garmentImg} />
                                ) : (
                                    <View style={styles.garmentPlaceholder}>
                                        <Text style={{ fontSize: 18 }}>👕</Text>
                                        <Text style={[styles.garmentMiniName, { color: c.textMuted }]} numberOfLines={1}>
                                            {g.name}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        ))}
                        {garments.length > 4 && (
                            <View style={[styles.garmentThumb, styles.moreOverlay, { backgroundColor: c.surfaceVariant }]}>
                                <Text style={[styles.moreText, { color: c.textSecondary }]}>+{garments.length - 4}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Barra de acciones */}
                <View style={[styles.actionsBar, { borderTopColor: c.border }]}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(post)} activeOpacity={0.6}>
                        <Text style={{ fontSize: 20 }}>{post.liked_by_me ? '❤️' : '🤍'}</Text>
                        <Text style={[styles.actionCount, { color: post.liked_by_me ? c.error : c.textMuted }]}>
                            {post.like_count || 0}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => openComments(post.id)} activeOpacity={0.6}>
                        <Text style={{ fontSize: 18 }}>💬</Text>
                        <Text style={[styles.actionCount, { color: c.textMuted }]}>
                            {post.comment_count || 0}
                        </Text>
                    </TouchableOpacity>
                    <View style={styles.actionBtn}>
                        <Text style={{ fontSize: 16 }}>👁️</Text>
                        <Text style={[styles.actionLabel, { color: c.textMuted }]}>
                            {garments.length} prenda{garments.length !== 1 ? 's' : ''}
                        </Text>
                    </View>
                    {outfit.season && (
                        <View style={[styles.seasonTag, { backgroundColor: c.accent + '15' }]}>
                            <Text style={[styles.seasonTagText, { color: c.accent }]}>{outfit.season}</Text>
                        </View>
                    )}
                </View>
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
                            <Text style={{ fontSize: 20 }}>👤</Text>
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
                            icon="🌐"
                            title="Feed vacío"
                            description="Sé el primero en compartir un outfit con la comunidad."
                            action={{ label: 'Compartir un Outfit', onPress: openShareModal }}
                        />
                    ) : null
                }
            />

            {/* Modal: Comentarios */}
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
                                <Text style={[styles.modalClose, { color: c.primary }]}>✕</Text>
                            </TouchableOpacity>
                        </View>

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
                                                    <Text style={{ fontSize: 14 }}>🗑️</Text>
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
                                <Text style={{ color: '#FFF', fontSize: 15 }}>↑</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Modal: Compartir outfit */}
            <Modal visible={showShareModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: c.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: c.text }]}>Compartir Outfit</Text>
                            <TouchableOpacity onPress={() => setShowShareModal(false)}>
                                <Text style={[styles.modalClose, { color: c.primary }]}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Input de caption */}
                        <TextInput
                            style={[styles.captionInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.inputText }]}
                            placeholder="Escribe un comentario..."
                            placeholderTextColor={c.placeholder}
                            value={caption}
                            onChangeText={setCaption}
                            multiline
                            maxLength={280}
                        />
                        <Text style={[styles.charCount, { color: c.textMuted }]}>{caption.length}/280</Text>

                        {/* Lista de outfits para seleccionar */}
                        <Text style={[styles.selectLabel, { color: c.textSecondary }]}>Selecciona un outfit:</Text>
                        <FlatList
                            data={outfits}
                            keyExtractor={(item) => item.id.toString()}
                            style={{ maxHeight: 280 }}
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
                                        <Text style={{ fontSize: 20, marginRight: 10 }}>
                                            {isSelected ? '✅' : '👔'}
                                        </Text>
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
                            <Text style={styles.shareBtnText}>
                                {selectedOutfitId ? '🚀 Compartir al Feed' : 'Selecciona un outfit'}
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
    feedContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },

    postCard: {
        borderRadius: 18, borderWidth: 1, marginBottom: 16, overflow: 'hidden',
    },
    postHeader: {
        flexDirection: 'row', alignItems: 'center', padding: 14, paddingBottom: 8,
    },
    avatar: {
        width: 42, height: 42, borderRadius: 21,
        justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden',
    },
    avatarImg: { width: 42, height: 42, borderRadius: 21 },
    avatarText: { fontSize: 18, fontWeight: '800' },
    authorName: { fontSize: 15, fontWeight: '700' },
    timeAgo: { fontSize: 12, marginTop: 1 },
    caption: { fontSize: 15, lineHeight: 21, paddingHorizontal: 14, marginBottom: 10 },

    outfitBox: {
        marginHorizontal: 14, borderRadius: 12, padding: 12, borderWidth: 1,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    outfitName: { fontSize: 16, fontWeight: '700', flex: 1 },
    occasionBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    occasionText: { fontSize: 12, fontWeight: '600' },

    garmentGrid: {
        flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 6,
    },
    garmentThumb: {
        width: 72, height: 72, borderRadius: 10, borderWidth: 1, overflow: 'hidden',
    },
    garmentImg: { width: '100%', height: '100%' },
    garmentPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 4 },
    garmentMiniName: { fontSize: 9, textAlign: 'center', marginTop: 2 },
    moreOverlay: { justifyContent: 'center', alignItems: 'center' },
    moreText: { fontSize: 16, fontWeight: '700' },

    actionsBar: {
        flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 0.5, gap: 16,
    },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    actionCount: { fontSize: 14, fontWeight: '700' },
    actionLabel: { fontSize: 13 },
    seasonTag: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
    seasonTagText: { fontSize: 12, fontWeight: '600' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 20, fontWeight: '700' },
    modalClose: { fontSize: 22, fontWeight: '700' },
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
