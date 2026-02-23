// Pantalla de Perfil — perfil propio y de otros usuarios con seguidores
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, Image, TouchableOpacity, FlatList,
    StyleSheet, ActivityIndicator, StatusBar, ScrollView,
    RefreshControl, Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchMyProfile, fetchUserProfile, fetchUserPosts,
    toggleFollow, fetchFollowers, fetchFollowing, clearViewedProfile,
} from '../store/profileSlice';
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

const ProfileScreen = ({ navigation, route }) => {
    const dispatch = useDispatch();
    const { user }           = useSelector((s) => s.auth);
    const {
        myProfile, viewedProfile, viewedPosts, viewedHasMore,
        followers, following, isLoading,
    } = useSelector((s) => s.profile);

    const { theme } = useTheme();
    const c = theme.colors;

    // targetId: undefined → mi perfil; si viene por params → perfil ajeno
    const targetId   = route?.params?.userId;
    const isOwnProfile = !targetId || String(targetId) === String(user?.id);
    const profile    = isOwnProfile ? myProfile : viewedProfile;

    const [listModal, setListModal] = useState(null); // 'followers' | 'following' | null
    const [refreshing, setRefreshing]  = useState(false);

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
            <View style={[styles.postThumb, { backgroundColor: c.surfaceVariant, borderColor: c.border }]}>
                {thumb ? (
                    <Image source={{ uri: `${IMAGE_BASE_URL}${thumb}` }} style={styles.postThumbImg} />
                ) : (
                    <Text style={{ fontSize: 26 }}>👔</Text>
                )}
                <View style={[styles.postThumbOverlay, { backgroundColor: 'rgba(0,0,0,0.28)' }]}>
                    <Text style={styles.postThumbLike}>❤ {post.like_count}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <StatusBar barStyle={c.statusBar} />
            <ScreenHeader
                title={isOwnProfile ? 'Mi Perfil' : (profile?.full_name || 'Perfil')}
                onBack={!isOwnProfile ? () => navigation.goBack() : undefined}
                rightAction={
                    isOwnProfile ? (
                        <TouchableOpacity
                            onPress={() => navigation.navigate('EditProfile')}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '700', color: c.primary }}>Editar</Text>
                        </TouchableOpacity>
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

                            {/* Botón follow solo para perfiles ajenos */}
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
                                <Text style={[styles.modalClose, { color: c.primary }]}>✕</Text>
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

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', paddingBottom: 32 },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 20, paddingBottom: 12,
    },
    modalTitle: { fontSize: 20, fontWeight: '700' },
    modalClose: { fontSize: 22, fontWeight: '700' },
    userRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
    rowAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
    rowAvatarImg: { width: 44, height: 44, borderRadius: 22 },
    rowAvatarText: { fontSize: 18, fontWeight: '800' },
    rowName: { fontSize: 16, fontWeight: '600' },
});

export default ProfileScreen;
