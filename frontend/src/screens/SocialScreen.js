// Pantalla Social — feed público de outfits con likes y compartir
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, FlatList, Modal, TextInput, Image,
    StyleSheet, ActivityIndicator, StatusBar, RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFeed, toggleLike, shareOutfit, resetFeed } from '../store/socialSlice';
import { fetchOutfits } from '../store/outfitsSlice';
import { useTheme } from '../hooks/useTheme';

const SocialScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { feed, hasMore, isLoading, isRefreshing } = useSelector((state) => state.social);
    const { outfits } = useSelector((state) => state.outfits);
    const { user } = useSelector((state) => state.auth);
    const { theme } = useTheme();
    const c = theme.colors;

    const [showShareModal, setShowShareModal] = useState(false);
    const [caption, setCaption] = useState('');
    const [selectedOutfitId, setSelectedOutfitId] = useState(null);

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

    const renderPost = ({ item: post }) => {
        const author = post.author || {};
        const outfit = post.outfit || {};
        const garments = post.garments || [];
        const isMe = author.id === user?.id;

        return (
            <View style={[styles.postCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                {/* Cabecera del post */}
                <View style={styles.postHeader}>
                    <View style={[styles.avatar, { backgroundColor: c.primary + '20' }]}>
                        {author.avatarUrl ? (
                            <Image source={{ uri: author.avatarUrl }} style={styles.avatarImg} />
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
                </View>

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
                                    <Image source={{ uri: g.image_url }} style={styles.garmentImg} />
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
            <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={[styles.backBtn, { color: c.primary }]}>← Volver</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: c.text }]}>Social</Text>
                <TouchableOpacity onPress={openShareModal}>
                    <Text style={[styles.shareHeaderBtn, { color: c.primary }]}>+ Compartir</Text>
                </TouchableOpacity>
            </View>

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
                        <View style={styles.emptyBox}>
                            <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>🌐</Text>
                            <Text style={[styles.emptyTitle, { color: c.text }]}>Feed vacío</Text>
                            <Text style={[styles.emptyText, { color: c.textMuted }]}>
                                Sé el primero en compartir un outfit con la comunidad.
                            </Text>
                            <TouchableOpacity
                                style={[styles.emptyBtn, { backgroundColor: c.primary }]}
                                onPress={openShareModal}
                            >
                                <Text style={styles.emptyBtnText}>Compartir un Outfit</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null
                }
            />

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
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1,
    },
    backBtn: { fontSize: 16, fontWeight: '600' },
    headerTitle: { fontSize: 22, fontWeight: '800' },
    shareHeaderBtn: { fontSize: 14, fontWeight: '700' },
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

    emptyBox: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
    emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
    emptyBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
    emptyBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

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
});

export default SocialScreen;
