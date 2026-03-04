// Pantalla de Administracion — gestion de usuarios, contenido, soporte y stats
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, FlatList, StyleSheet,
    ActivityIndicator, Alert, StatusBar, ScrollView, RefreshControl,
    Image, Modal, Dimensions, TextInput, KeyboardAvoidingView, Platform, Pressable, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { useTheme } from '../hooks/useTheme';
import ScreenHeader from '../components/ScreenHeader';
import * as adminService from '../services/admin.service';
import { IMAGE_BASE_URL } from '../services/api';
import { startConversation } from '../store/messagesSlice';

const WEARO_LOGO = require('../../assets/logo.png');
const { width: SCREEN_W } = Dimensions.get('window');

const TABS = ['Usuarios', 'Contenido', 'Soporte', 'Stats'];

const AdminScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const c = theme.colors;
    const currentUser = useSelector((s) => s.auth.user);
    const dispatch = useDispatch();

    const [activeTab, setActiveTab] = useState('Usuarios');
    const [users, setUsers] = useState([]);
    const [posts, setPosts] = useState([]);
    const [userPosts, setUserPosts] = useState([]);
    const [deletedPosts, setDeletedPosts] = useState([]);
    const [contentSubTab, setContentSubTab] = useState('publicados');
    const [comments, setComments] = useState([]);
    const [stats, setStats] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedPost, setSelectedPost] = useState(null);

    // Create admin modal
    const [showCreateAdmin, setShowCreateAdmin] = useState(false);
    const [newAdminName, setNewAdminName] = useState('');
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [newAdminPass, setNewAdminPass] = useState('');
    const [creating, setCreating] = useState(false);

    // Mis acciones modal
    const [showActions, setShowActions] = useState(false);
    const [myActions, setMyActions] = useState(null);
    const [loadingActions, setLoadingActions] = useState(false);
    const [resolvedTickets, setResolvedTickets] = useState([]);

    const loadData = useCallback(async () => {
        try {
            if (activeTab === 'Usuarios') {
                const data = await adminService.getUsers();
                setUsers(data);
            } else if (activeTab === 'Contenido') {
                const [p, up, dp] = await Promise.all([
                    adminService.getPosts(),
                    adminService.getUserPosts(),
                    adminService.getDeletedPosts(),
                ]);
                setPosts(p);
                setUserPosts(up);
                setDeletedPosts(dp);
            } else if (activeTab === 'Soporte') {
                const t = await adminService.getSupportTickets();
                setTickets(t);
            } else {
                const data = await adminService.getStats();
                setStats(data);
            }
        } catch (err) {
            Alert.alert('Error', err.response?.data?.mensaje || 'Error cargando datos');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeTab]);

    useEffect(() => {
        setLoading(true);
        loadData();
    }, [activeTab, loadData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    // --- Handlers ---
    const handleToggleUser = (user) => {
        const action = user.disabled ? 'activar' : 'desactivar';
        Alert.alert(
            `${user.disabled ? 'Activar' : 'Desactivar'} usuario`,
            `Quieres ${action} a ${user.full_name}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: user.disabled ? 'Activar' : 'Desactivar',
                    style: user.disabled ? 'default' : 'destructive',
                    onPress: async () => {
                        try {
                            await adminService.toggleUser(user.id, !user.disabled);
                            setUsers((prev) =>
                                prev.map((u) => u.id === user.id ? { ...u, disabled: !u.disabled } : u)
                            );
                        } catch (err) {
                            Alert.alert('Error', err.response?.data?.mensaje || 'Error');
                        }
                    },
                },
            ]
        );
    };

    const handleDeletePost = (post) => {
        Alert.alert('Eliminar post', `Eliminar el post de ${post.author_name}?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar', style: 'destructive',
                onPress: async () => {
                    try {
                        await adminService.deletePost(post.id);
                        setPosts((prev) => prev.filter((p) => p.id !== post.id));
                        setUserPosts((prev) => prev.filter((p) => p.id !== post.id));
                        setDeletedPosts((prev) => [{ ...post, author_role: post.author_role || 'user' }, ...prev]);
                    } catch (err) {
                        Alert.alert('Error', 'Error eliminando post');
                    }
                },
            },
        ]);
    };

    const handleDeleteComment = (comment) => {
        Alert.alert('Eliminar comentario', `Eliminar comentario de ${comment.author_name}?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar', style: 'destructive',
                onPress: async () => {
                    try {
                        await adminService.deleteComment(comment.id);
                        setComments((prev) => prev.filter((cm) => cm.id !== comment.id));
                    } catch (err) {
                        Alert.alert('Error', 'Error eliminando comentario');
                    }
                },
            },
        ]);
    };

    const handleCreateAdmin = async () => {
        if (!newAdminName.trim() || !newAdminEmail.trim() || !newAdminPass.trim()) {
            Alert.alert('Error', 'Todos los campos son obligatorios');
            return;
        }
        if (newAdminPass.length < 8) {
            Alert.alert('Error', 'La contraseña debe tener al menos 8 caracteres');
            return;
        }
        setCreating(true);
        try {
            await adminService.createAdminUser(newAdminEmail.trim(), newAdminPass, newAdminName.trim());
            Alert.alert('Admin creado', `Se ha creado el admin ${newAdminName.trim()}`);
            setShowCreateAdmin(false);
            setNewAdminName('');
            setNewAdminEmail('');
            setNewAdminPass('');
            if (activeTab === 'Usuarios') loadData();
        } catch (err) {
            Alert.alert('Error', err.response?.data?.mensaje || 'Error creando admin');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteAdmin = (user) => {
        Alert.alert(
            'Eliminar admin',
            `¿Eliminar la cuenta de ${user.full_name}? Esta acción no se puede deshacer.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar', style: 'destructive',
                    onPress: async () => {
                        try {
                            await adminService.deleteAdminUser(user.id);
                            setUsers((prev) => prev.filter((u) => u.id !== user.id));
                            Alert.alert('Eliminado', 'Cuenta de admin eliminada');
                        } catch (err) {
                            Alert.alert('Error', err.response?.data?.mensaje || 'Error eliminando cuenta');
                        }
                    },
                },
            ]
        );
    };

    // Soporte handlers
    const handleAssignTicket = async (ticket) => {
        try {
            await adminService.assignTicket(ticket.id);
            setTickets((prev) =>
                prev.map((t) => t.id === ticket.id ? { ...t, status: 'in_progress', assigned_admin_id: currentUser?.id } : t)
            );
            // Open DM with the user
            const result = await dispatch(startConversation(ticket.requester?.id || ticket.user_id));
            if (result.payload?.id) {
                navigation.navigate('Chat', {
                    conversationId: result.payload.id,
                    otherUser: {
                        id: ticket.requester?.id || ticket.user_id,
                        fullName: ticket.requester?.fullName || 'Usuario',
                        avatarUrl: ticket.requester?.avatarUrl,
                    },
                });
            }
        } catch {
            Alert.alert('Error', 'No se pudo asignar el ticket');
        }
    };

    const handleResolveTicket = async (ticket) => {
        Alert.alert('Resolver ticket', 'Marcar este ticket como resuelto?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Resolver',
                onPress: async () => {
                    try {
                        await adminService.resolveTicket(ticket.id);
                        setTickets((prev) =>
                            prev.map((t) => t.id === ticket.id ? { ...t, status: 'resolved' } : t)
                        );
                    } catch {
                        Alert.alert('Error', 'No se pudo resolver el ticket');
                    }
                },
            },
        ]);
    };

    // Mis acciones
    const openMyActions = async () => {
        setShowActions(true);
        setLoadingActions(true);
        try {
            const [actions, resolved] = await Promise.all([
                adminService.getMyActions(),
                adminService.getSupportTickets('resolved'),
            ]);
            setMyActions(actions);
            // Filter resolved tickets assigned to current admin
            setResolvedTickets((resolved || []).filter((t) => t.assigned_admin_id === currentUser?.id));
        } catch {
            Alert.alert('Error', 'No se pudieron cargar las acciones');
        } finally {
            setLoadingActions(false);
        }
    };

    const handleRestorePost = async (postId) => {
        try {
            await adminService.restorePost(postId);
            setDeletedPosts((prev) => prev.filter((p) => p.id !== postId));
            setMyActions((prev) => prev ? {
                ...prev,
                deletedWearoPosts: (prev.deletedWearoPosts || []).filter((p) => p.id !== postId),
                deletedUserPosts: (prev.deletedUserPosts || []).filter((p) => p.id !== postId),
            } : prev);
            Alert.alert('Hecho', 'Post restaurado');
        } catch {
            Alert.alert('Error', 'No se pudo restaurar');
        }
    };

    const handleRestoreUser = async (userId) => {
        try {
            await adminService.restoreUser(userId);
            setMyActions((prev) => prev ? {
                ...prev,
                disabledUsers: prev.disabledUsers.filter((u) => u.id !== userId),
            } : prev);
            Alert.alert('Hecho', 'Usuario activado');
        } catch {
            Alert.alert('Error', 'No se pudo restaurar');
        }
    };

    // --- Renders ---
    const renderUserItem = ({ item }) => (
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.cardRow}>
                <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}
                    onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
                    activeOpacity={0.7}
                >
                    <View style={[styles.avatar, { backgroundColor: c.primary + '20' }]}>
                        <Text style={[styles.avatarText, { color: c.primary }]}>
                            {(item.full_name || '?')[0].toUpperCase()}
                        </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: c.text }]}>{item.full_name}</Text>
                        <Text style={[styles.cardSub, { color: c.textMuted }]}>{item.email}</Text>
                        <Text style={[styles.cardMeta, { color: c.textMuted }]}>
                            {item.role === 'admin'
                                ? `${item.post_count} posts`
                                : `${item.garment_count} prendas · ${item.outfit_count} outfits · ${item.post_count} posts`}
                        </Text>
                    </View>
                </TouchableOpacity>
                <View style={{ alignItems: 'flex-end' }}>
                    {item.role === 'admin' ? (
                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                            <View style={[styles.badge, { backgroundColor: c.primary + '20' }]}>
                                <Text style={[styles.badgeText, { color: c.primary }]}>Admin</Text>
                            </View>
                            {item.id !== currentUser?.id && (
                                <TouchableOpacity
                                    style={[styles.toggleBtn, { borderColor: c.error }]}
                                    onPress={() => handleDeleteAdmin(item)}
                                >
                                    <Ionicons name="trash-outline" size={14} color={c.error} />
                                    <Text style={[styles.toggleBtnText, { color: c.error }]}>Eliminar</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={[
                                styles.toggleBtn,
                                { borderColor: item.disabled ? (c.success || '#27AE60') : c.error },
                            ]}
                            onPress={() => handleToggleUser(item)}
                        >
                            <Ionicons
                                name={item.disabled ? 'checkmark-circle-outline' : 'ban-outline'}
                                size={16}
                                color={item.disabled ? (c.success || '#27AE60') : c.error}
                            />
                            <Text style={[
                                styles.toggleBtnText,
                                { color: item.disabled ? (c.success || '#27AE60') : c.error },
                            ]}>
                                {item.disabled ? 'Activar' : 'Desactivar'}
                            </Text>
                        </TouchableOpacity>
                    )}
                    {item.disabled && (
                        <Text style={[styles.disabledLabel, { color: c.error }]}>Desactivado</Text>
                    )}
                </View>
            </View>
        </View>
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

    const getPostThumb = (item) => {
        if (item.cover_image) return `${IMAGE_BASE_URL}${item.cover_image}`;
        if (item.first_garment_image) return `${IMAGE_BASE_URL}${item.first_garment_image}`;
        const photos = item.photos;
        if (Array.isArray(photos) && photos.length > 0) return `${IMAGE_BASE_URL}${photos[0]}`;
        return null;
    };

    const renderPostItem = ({ item }) => {
        const thumb = getPostThumb(item);
        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
                onPress={() => setSelectedPost(item)}
                activeOpacity={0.7}
            >
                <View style={styles.cardRow}>
                    {thumb ? (
                        <Image source={{ uri: thumb }} style={styles.postThumb} />
                    ) : (
                        <View style={[styles.postThumb, { backgroundColor: c.surfaceVariant || (c.primary + '10'), justifyContent: 'center', alignItems: 'center' }]}>
                            <Ionicons name="image-outline" size={22} color={c.textMuted} />
                        </View>
                    )}
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: c.text }]}>
                            {item.outfit_name || 'Sin nombre'}
                        </Text>
                        <Text style={[styles.cardSub, { color: c.textMuted }]}>
                            por {item.author_name}
                        </Text>
                        {item.caption ? (
                            <Text style={[styles.cardMeta, { color: c.textMuted }]} numberOfLines={1}>
                                "{item.caption}"
                            </Text>
                        ) : null}
                        <Text style={[styles.cardMeta, { color: c.textMuted }]}>
                            {getTimeAgo(item.created_at)}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.deleteBtn, { backgroundColor: c.error + '15' }]}
                        onPress={() => handleDeletePost(item)}
                    >
                        <Ionicons name="trash-outline" size={18} color={c.error} />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    const renderCommentItem = ({ item }) => (
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.cardRow}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: c.text }]}>{item.author_name}</Text>
                    <Text style={[styles.cardSub, { color: c.textMuted }]} numberOfLines={2}>
                        {item.text}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.deleteBtn, { backgroundColor: c.error + '15' }]}
                    onPress={() => handleDeleteComment(item)}
                >
                    <Ionicons name="trash-outline" size={18} color={c.error} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const getTicketStatusColor = (status) => {
        if (status === 'pending') return '#E17055';
        if (status === 'in_progress') return '#0984E3';
        return c.success || '#27AE60';
    };

    const getTicketStatusLabel = (status) => {
        if (status === 'pending') return 'Pendiente';
        if (status === 'in_progress') return 'En progreso';
        return 'Resuelto';
    };

    const renderTicketItem = ({ item }) => {
        const statusColor = getTicketStatusColor(item.status);
        return (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                            <View style={[styles.avatar, { backgroundColor: c.primary + '20', width: 36, height: 36, borderRadius: 18 }]}>
                                {item.requester?.avatarUrl ? (
                                    <Image source={{ uri: `${IMAGE_BASE_URL}${item.requester.avatarUrl}` }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                                ) : (
                                    <Text style={[styles.avatarText, { color: c.primary, fontSize: 14 }]}>
                                        {(item.requester?.fullName || '?')[0].toUpperCase()}
                                    </Text>
                                )}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.cardTitle, { color: c.text }]}>{item.requester?.fullName || 'Usuario'}</Text>
                                <Text style={[styles.cardMeta, { color: c.textMuted }]}>{getTimeAgo(item.created_at)}</Text>
                            </View>
                        </View>
                        <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
                            <Text style={[styles.badgeText, { color: statusColor }]}>{getTicketStatusLabel(item.status)}</Text>
                        </View>
                    </View>
                    <Text style={[{ color: c.text, fontSize: 14, lineHeight: 20 }]} numberOfLines={3}>
                        {item.message}
                    </Text>
                    {item.assigned_admin && (
                        <Text style={[styles.cardMeta, { color: c.textMuted }]}>
                            Asignado a: {item.assigned_admin.adminTag || item.assigned_admin.fullName}
                        </Text>
                    )}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                        {item.status === 'pending' && (
                            <TouchableOpacity
                                style={[styles.toggleBtn, { borderColor: c.primary, flex: 1, justifyContent: 'center' }]}
                                onPress={() => handleAssignTicket(item)}
                            >
                                <Ionicons name="chatbubble-outline" size={14} color={c.primary} />
                                <Text style={[styles.toggleBtnText, { color: c.primary }]}>Atender</Text>
                            </TouchableOpacity>
                        )}
                        {item.status === 'in_progress' && (
                            <>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, { borderColor: c.primary, flex: 1, justifyContent: 'center' }]}
                                    onPress={async () => {
                                        const result = await dispatch(startConversation(item.requester?.id || item.user_id));
                                        if (result.payload?.id) {
                                            navigation.navigate('Chat', {
                                                conversationId: result.payload.id,
                                                otherUser: {
                                                    id: item.requester?.id || item.user_id,
                                                    fullName: item.requester?.fullName || 'Usuario',
                                                    avatarUrl: item.requester?.avatarUrl,
                                                },
                                            });
                                        }
                                    }}
                                >
                                    <Ionicons name="chatbubble-outline" size={14} color={c.primary} />
                                    <Text style={[styles.toggleBtnText, { color: c.primary }]}>Chat</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, { borderColor: c.success || '#27AE60', flex: 1, justifyContent: 'center' }]}
                                    onPress={() => handleResolveTicket(item)}
                                >
                                    <Ionicons name="checkmark-circle-outline" size={14} color={c.success || '#27AE60'} />
                                    <Text style={[styles.toggleBtnText, { color: c.success || '#27AE60' }]}>Resolver</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    const StatCard = ({ icon, label, value, color }) => (
        <View style={[styles.statCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[styles.statIcon, { backgroundColor: (color || c.primary) + '15' }]}>
                <Ionicons name={icon} size={24} color={color || c.primary} />
            </View>
            <Text style={[styles.statValue, { color: c.text }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>{label}</Text>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <StatusBar barStyle={c.statusBar} />
            <ScreenHeader
                title="Panel Admin"
                showBack
                onBack={() => navigation.goBack()}
                rightAction={
                    <TouchableOpacity onPress={openMyActions} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="list-outline" size={24} color={c.primary} />
                    </TouchableOpacity>
                }
            />

            {/* Tabs */}
            <View style={[styles.tabs, { borderBottomColor: c.border }]}>
                {TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && { borderBottomColor: c.primary }]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[
                            styles.tabText,
                            { color: activeTab === tab ? c.primary : c.textMuted },
                        ]}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color={c.primary} />
                </View>
            ) : activeTab === 'Usuarios' ? (
                <FlatList
                    data={users}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderUserItem}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
                    ListHeaderComponent={
                        <TouchableOpacity
                            style={[styles.createAdminBtn, { backgroundColor: c.primary }]}
                            onPress={() => setShowCreateAdmin(true)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="person-add-outline" size={18} color="#FFF" />
                            <Text style={styles.createAdminBtnText}>Crear Admin</Text>
                        </TouchableOpacity>
                    }
                    ListEmptyComponent={
                        <Text style={[styles.empty, { color: c.textMuted }]}>No hay usuarios</Text>
                    }
                />
            ) : activeTab === 'Contenido' ? (
                <View style={{ flex: 1 }}>
                    {/* Sub-tabs: Publicados / Eliminados */}
                    <View style={[styles.subTabs, { borderBottomColor: c.border }]}>
                        <TouchableOpacity
                            style={[styles.subTab, contentSubTab === 'publicados' && { borderBottomColor: c.primary, borderBottomWidth: 2 }]}
                            onPress={() => setContentSubTab('publicados')}
                        >
                            <Text style={[styles.subTabText, { color: contentSubTab === 'publicados' ? c.primary : c.textMuted }]}>
                                Publicados ({posts.length + userPosts.length})
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.subTab, contentSubTab === 'eliminados' && { borderBottomColor: c.error, borderBottomWidth: 2 }]}
                            onPress={() => setContentSubTab('eliminados')}
                        >
                            <Text style={[styles.subTabText, { color: contentSubTab === 'eliminados' ? c.error : c.textMuted }]}>
                                Eliminados ({deletedPosts.length})
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {contentSubTab === 'publicados' ? (
                        <FlatList
                            data={[...posts.map((p) => ({ ...p, _section: 'wearo' })), ...userPosts.map((p) => ({ ...p, _section: 'users' }))]}
                            keyExtractor={(item) => `${item._section}-${item.id}`}
                            contentContainerStyle={styles.list}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
                            ListHeaderComponent={
                                <>
                                    <Text style={[styles.sectionTitle, { color: c.text }]}>
                                        Posts de Wearo ({posts.length})
                                    </Text>
                                    {posts.length === 0 && (
                                        <Text style={[styles.cardMeta, { color: c.textMuted, paddingHorizontal: 16, paddingBottom: 8 }]}>No hay anuncios</Text>
                                    )}
                                </>
                            }
                            renderItem={({ item, index }) => {
                                const isFirstUserPost = item._section === 'users' && (index === 0 || [...posts.map((p) => ({ ...p, _section: 'wearo' })), ...userPosts.map((p) => ({ ...p, _section: 'users' }))][index - 1]?._section === 'wearo');
                                return (
                                    <>
                                        {isFirstUserPost && (
                                            <Text style={[styles.sectionTitle, { color: c.text, marginTop: 8 }]}>
                                                Posts de usuarios ({userPosts.length})
                                            </Text>
                                        )}
                                        {renderPostItem({ item })}
                                    </>
                                );
                            }}
                            ListEmptyComponent={
                                <Text style={[styles.empty, { color: c.textMuted }]}>No hay publicaciones</Text>
                            }
                        />
                    ) : (
                        <FlatList
                            data={deletedPosts}
                            keyExtractor={(item) => `del-${item.id}`}
                            contentContainerStyle={styles.list}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
                            renderItem={({ item }) => {
                                const thumb = getPostThumb(item);
                                return (
                                    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                                        <View style={styles.cardRow}>
                                            {thumb ? (
                                                <Image source={{ uri: thumb }} style={styles.postThumb} />
                                            ) : (
                                                <View style={[styles.postThumb, { backgroundColor: c.surfaceVariant || (c.primary + '10'), justifyContent: 'center', alignItems: 'center' }]}>
                                                    <Ionicons name="image-outline" size={22} color={c.textMuted} />
                                                </View>
                                            )}
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.cardTitle, { color: c.text }]}>
                                                    {item.outfit_name || 'Sin nombre'}
                                                </Text>
                                                <Text style={[styles.cardSub, { color: c.textMuted }]}>
                                                    por {item.author_name}
                                                </Text>
                                                {item.caption ? (
                                                    <Text style={[styles.cardMeta, { color: c.textMuted }]} numberOfLines={1}>
                                                        "{item.caption}"
                                                    </Text>
                                                ) : null}
                                            </View>
                                            <TouchableOpacity
                                                style={[styles.toggleBtn, { borderColor: c.primary }]}
                                                onPress={() => handleRestorePost(item.id)}
                                            >
                                                <Ionicons name="refresh-outline" size={14} color={c.primary} />
                                                <Text style={[styles.toggleBtnText, { color: c.primary }]}>Restaurar</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            }}
                            ListEmptyComponent={
                                <Text style={[styles.empty, { color: c.textMuted }]}>No hay posts eliminados</Text>
                            }
                        />
                    )}
                </View>
            ) : activeTab === 'Soporte' ? (
                <FlatList
                    data={tickets}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
                    renderItem={renderTicketItem}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                            <Ionicons name="mail-open-outline" size={48} color={c.textMuted} />
                            <Text style={[styles.empty, { color: c.textMuted }]}>No hay tickets de soporte</Text>
                        </View>
                    }
                />
            ) : (
                <ScrollView
                    contentContainerStyle={styles.statsGrid}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
                >
                    {stats && (
                        <>
                            <StatCard icon="people" label="Usuarios" value={stats.totalUsers} color="#6C5CE7" />
                            <StatCard icon="shirt" label="Prendas" value={stats.totalGarments} color="#00B894" />
                            <StatCard icon="albums" label="Outfits" value={stats.totalOutfits} color="#0984E3" />
                            <StatCard icon="share-social" label="Posts" value={stats.totalPosts} color="#E17055" />
                            <StatCard icon="chatbubbles" label="Comentarios" value={stats.totalComments} color="#FDCB6E" />
                            <StatCard icon="mail" label="Mensajes" value={stats.totalMessages} color="#A29BFE" />
                        </>
                    )}
                </ScrollView>
            )}

            {/* Modal: Detalle de post */}
            <Modal visible={!!selectedPost} animationType="slide" transparent onRequestClose={() => setSelectedPost(null)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: c.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: c.text }]}>Publicación</Text>
                            <TouchableOpacity onPress={() => setSelectedPost(null)}>
                                <Ionicons name="close" size={22} color={c.primary} />
                            </TouchableOpacity>
                        </View>

                        {selectedPost && (
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                                {/* Author */}
                                <View style={styles.detailAuthorRow}>
                                    <View style={[styles.avatar, { backgroundColor: c.primary + '20' }]}>
                                        <Text style={[styles.avatarText, { color: c.primary }]}>
                                            {(selectedPost.author_name || '?')[0].toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.cardTitle, { color: c.text }]}>
                                            {selectedPost.author_name}
                                        </Text>
                                        <Text style={[styles.cardSub, { color: c.textMuted }]}>
                                            {selectedPost.author_email}
                                        </Text>
                                    </View>
                                    <Text style={[styles.cardMeta, { color: c.textMuted }]}>
                                        {getTimeAgo(selectedPost.created_at)}
                                    </Text>
                                </View>

                                {/* Outfit name */}
                                <View style={[styles.detailOutfitBadge, { backgroundColor: c.primary + '10', borderColor: c.primary + '30' }]}>
                                    <Ionicons name="albums-outline" size={16} color={c.primary} />
                                    <Text style={[styles.detailOutfitName, { color: c.primary }]}>
                                        {selectedPost.outfit_name || 'Anuncio'}
                                    </Text>
                                </View>

                                {/* Main image */}
                                {(() => {
                                    const thumb = getPostThumb(selectedPost);
                                    if (thumb) {
                                        return (
                                            <Image
                                                source={{ uri: thumb }}
                                                style={styles.detailImage}
                                                resizeMode="cover"
                                            />
                                        );
                                    }
                                    return (
                                        <View style={[styles.detailImage, { backgroundColor: c.surfaceVariant || (c.primary + '10'), justifyContent: 'center', alignItems: 'center' }]}>
                                            <Ionicons name="image-outline" size={48} color={c.textMuted} />
                                            <Text style={[{ color: c.textMuted, marginTop: 8, fontSize: 13 }]}>Sin imagen</Text>
                                        </View>
                                    );
                                })()}

                                {/* Photos gallery */}
                                {Array.isArray(selectedPost.photos) && selectedPost.photos.length > 1 && (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10, paddingHorizontal: 14 }} contentContainerStyle={{ gap: 8 }}>
                                        {selectedPost.photos.map((photo, idx) => (
                                            <Image
                                                key={idx}
                                                source={{ uri: `${IMAGE_BASE_URL}${photo}` }}
                                                style={styles.detailPhotoThumb}
                                            />
                                        ))}
                                    </ScrollView>
                                )}

                                {/* Caption */}
                                {selectedPost.caption ? (
                                    <View style={styles.detailCaptionBox}>
                                        <Text style={[styles.detailCaptionLabel, { color: c.textMuted }]}>Mensaje:</Text>
                                        <Text style={[styles.detailCaptionText, { color: c.text }]}>
                                            {selectedPost.caption}
                                        </Text>
                                    </View>
                                ) : null}

                                {/* Delete button */}
                                <TouchableOpacity
                                    style={[styles.detailDeleteBtn, { backgroundColor: c.error + '15', borderColor: c.error }]}
                                    onPress={() => {
                                        handleDeletePost(selectedPost);
                                        setSelectedPost(null);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="trash-outline" size={18} color={c.error} />
                                    <Text style={[styles.detailDeleteText, { color: c.error }]}>Eliminar publicación</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Modal: Crear Admin */}
            <Modal visible={showCreateAdmin} animationType="slide" transparent onRequestClose={() => setShowCreateAdmin(false)}>
                <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss} />
                    <View style={[styles.modalContent, { backgroundColor: c.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: c.text }]}>Nuevo Admin</Text>
                            <TouchableOpacity onPress={() => setShowCreateAdmin(false)}>
                                <Ionicons name="close" size={22} color={c.primary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.createLabel, { color: c.textSecondary }]}>Nombre completo</Text>
                        <TextInput
                            style={[styles.createInput, { backgroundColor: c.inputBg || c.surfaceVariant, borderColor: c.border, color: c.text }]}
                            placeholder="Nombre del admin"
                            placeholderTextColor={c.textMuted}
                            value={newAdminName}
                            onChangeText={setNewAdminName}
                            autoCapitalize="words"
                        />

                        <Text style={[styles.createLabel, { color: c.textSecondary }]}>Email</Text>
                        <TextInput
                            style={[styles.createInput, { backgroundColor: c.inputBg || c.surfaceVariant, borderColor: c.border, color: c.text }]}
                            placeholder="admin@wearo.com"
                            placeholderTextColor={c.textMuted}
                            value={newAdminEmail}
                            onChangeText={setNewAdminEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <Text style={[styles.createLabel, { color: c.textSecondary }]}>Contraseña</Text>
                        <TextInput
                            style={[styles.createInput, { backgroundColor: c.inputBg || c.surfaceVariant, borderColor: c.border, color: c.text }]}
                            placeholder="Min. 6 caracteres"
                            placeholderTextColor={c.textMuted}
                            value={newAdminPass}
                            onChangeText={setNewAdminPass}
                            secureTextEntry
                        />

                        <TouchableOpacity
                            style={[styles.createSubmitBtn, { backgroundColor: c.primary, opacity: creating ? 0.6 : 1 }]}
                            onPress={handleCreateAdmin}
                            disabled={creating}
                            activeOpacity={0.7}
                        >
                            {creating ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Ionicons name="shield-checkmark-outline" size={18} color="#FFF" />
                                    <Text style={styles.createSubmitText}>Crear Admin</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Modal: Mis Acciones */}
            <Modal visible={showActions} animationType="slide" transparent onRequestClose={() => setShowActions(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: c.surface, maxHeight: '90%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: c.text }]}>Mis Acciones</Text>
                            <TouchableOpacity onPress={() => setShowActions(false)}>
                                <Ionicons name="close" size={22} color={c.primary} />
                            </TouchableOpacity>
                        </View>

                        {loadingActions ? (
                            <ActivityIndicator style={{ paddingVertical: 40 }} color={c.primary} />
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                                {/* Usuarios bloqueados */}
                                <Text style={[styles.sectionTitle, { color: c.text, marginBottom: 8 }]}>
                                    Usuarios bloqueados ({myActions?.disabledUsers?.length || 0})
                                </Text>
                                {(myActions?.disabledUsers || []).length === 0 ? (
                                    <Text style={[styles.cardMeta, { color: c.textMuted, marginBottom: 16 }]}>No has bloqueado usuarios</Text>
                                ) : (
                                    (myActions.disabledUsers).map((u) => (
                                        <View key={u.id} style={[styles.card, { backgroundColor: c.background, borderColor: c.border }]}>
                                            <View style={styles.cardRow}>
                                                <View style={[styles.avatar, { backgroundColor: c.primary + '20', width: 36, height: 36, borderRadius: 18 }]}>
                                                    <Text style={[styles.avatarText, { color: c.primary, fontSize: 14 }]}>
                                                        {(u.full_name || '?')[0].toUpperCase()}
                                                    </Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.cardTitle, { color: c.text }]}>{u.full_name}</Text>
                                                    <Text style={[styles.cardMeta, { color: c.textMuted }]}>{u.email}</Text>
                                                </View>
                                                <TouchableOpacity
                                                    style={[styles.toggleBtn, { borderColor: c.success || '#27AE60' }]}
                                                    onPress={() => handleRestoreUser(u.id)}
                                                >
                                                    <Ionicons name="checkmark-circle-outline" size={14} color={c.success || '#27AE60'} />
                                                    <Text style={[styles.toggleBtnText, { color: c.success || '#27AE60' }]}>Activar</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))
                                )}

                                {/* Posts de Wearo eliminados */}
                                <Text style={[styles.sectionTitle, { color: c.text, marginTop: 16, marginBottom: 8 }]}>
                                    Posts de Wearo eliminados ({myActions?.deletedWearoPosts?.length || 0})
                                </Text>
                                {(myActions?.deletedWearoPosts || []).length === 0 ? (
                                    <Text style={[styles.cardMeta, { color: c.textMuted, marginBottom: 16 }]}>No has eliminado posts de Wearo</Text>
                                ) : (
                                    (myActions.deletedWearoPosts).map((p) => (
                                        <View key={p.id} style={[styles.card, { backgroundColor: c.background, borderColor: c.border }]}>
                                            <View style={styles.cardRow}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.cardTitle, { color: c.text }]}>{p.outfit_name || 'Sin nombre'}</Text>
                                                    {p.caption ? <Text style={[styles.cardMeta, { color: c.textMuted }]} numberOfLines={1}>"{p.caption}"</Text> : null}
                                                </View>
                                                <TouchableOpacity
                                                    style={[styles.toggleBtn, { borderColor: c.primary }]}
                                                    onPress={() => handleRestorePost(p.id)}
                                                >
                                                    <Ionicons name="refresh-outline" size={14} color={c.primary} />
                                                    <Text style={[styles.toggleBtnText, { color: c.primary }]}>Restaurar</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))
                                )}

                                {/* Posts de usuarios eliminados */}
                                <Text style={[styles.sectionTitle, { color: c.text, marginTop: 16, marginBottom: 8 }]}>
                                    Posts de usuarios eliminados ({myActions?.deletedUserPosts?.length || 0})
                                </Text>
                                {(myActions?.deletedUserPosts || []).length === 0 ? (
                                    <Text style={[styles.cardMeta, { color: c.textMuted, marginBottom: 16 }]}>No has eliminado posts de usuarios</Text>
                                ) : (
                                    (myActions.deletedUserPosts).map((p) => (
                                        <View key={p.id} style={[styles.card, { backgroundColor: c.background, borderColor: c.border }]}>
                                            <View style={styles.cardRow}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.cardTitle, { color: c.text }]}>{p.outfit_name || 'Sin nombre'}</Text>
                                                    <Text style={[styles.cardMeta, { color: c.textMuted }]}>por {p.author_name}</Text>
                                                    {p.caption ? <Text style={[styles.cardMeta, { color: c.textMuted }]} numberOfLines={1}>"{p.caption}"</Text> : null}
                                                </View>
                                                <TouchableOpacity
                                                    style={[styles.toggleBtn, { borderColor: c.primary }]}
                                                    onPress={() => handleRestorePost(p.id)}
                                                >
                                                    <Ionicons name="refresh-outline" size={14} color={c.primary} />
                                                    <Text style={[styles.toggleBtnText, { color: c.primary }]}>Restaurar</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))
                                )}

                                {/* Ayuda resuelta */}
                                <Text style={[styles.sectionTitle, { color: c.text, marginTop: 16, marginBottom: 8 }]}>
                                    Ayuda resuelta ({resolvedTickets.length})
                                </Text>
                                {resolvedTickets.length === 0 ? (
                                    <Text style={[styles.cardMeta, { color: c.textMuted }]}>No has resuelto tickets</Text>
                                ) : (
                                    resolvedTickets.map((t) => (
                                        <View key={t.id} style={[styles.card, { backgroundColor: c.background, borderColor: c.border }]}>
                                            <View style={styles.cardRow}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.cardTitle, { color: c.text }]}>{t.requester?.fullName || 'Usuario'}</Text>
                                                    <Text style={[styles.cardMeta, { color: c.textMuted }]} numberOfLines={2}>{t.message}</Text>
                                                </View>
                                                <TouchableOpacity
                                                    style={[styles.toggleBtn, { borderColor: c.primary }]}
                                                    onPress={async () => {
                                                        setShowActions(false);
                                                        const result = await dispatch(startConversation(t.requester?.id || t.user_id));
                                                        if (result.payload?.id) {
                                                            navigation.navigate('Chat', {
                                                                conversationId: result.payload.id,
                                                                otherUser: {
                                                                    id: t.requester?.id || t.user_id,
                                                                    fullName: t.requester?.fullName || 'Usuario',
                                                                    avatarUrl: t.requester?.avatarUrl,
                                                                },
                                                            });
                                                        }
                                                    }}
                                                >
                                                    <Ionicons name="chatbubble-outline" size={14} color={c.primary} />
                                                    <Text style={[styles.toggleBtnText, { color: c.primary }]}>Ver DM</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))
                                )}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    tabs: {
        flexDirection: 'row', borderBottomWidth: 1, marginHorizontal: 16,
    },
    tab: {
        flex: 1, alignItems: 'center', paddingVertical: 12,
        borderBottomWidth: 2, borderBottomColor: 'transparent',
    },
    tabText: { fontSize: 14, fontWeight: '700' },
    loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16 },
    empty: { textAlign: 'center', padding: 32, fontSize: 14 },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },

    // Card
    card: {
        borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10,
    },
    cardRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    avatar: {
        width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center',
    },
    avatarText: { fontSize: 18, fontWeight: '700' },
    cardTitle: { fontSize: 15, fontWeight: '700' },
    cardSub: { fontSize: 13, marginTop: 1 },
    cardMeta: { fontSize: 12, marginTop: 3 },

    // Badge
    badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
    badgeText: { fontSize: 11, fontWeight: '700' },

    // Toggle
    toggleBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
    },
    toggleBtnText: { fontSize: 12, fontWeight: '600' },
    disabledLabel: { fontSize: 11, fontWeight: '600', marginTop: 4 },

    // Delete
    deleteBtn: {
        width: 40, height: 40, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center',
    },

    // Stats
    statsGrid: {
        flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12,
    },
    statCard: {
        width: '47%', borderRadius: 16, borderWidth: 1, padding: 20, alignItems: 'center',
    },
    statIcon: {
        width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
        marginBottom: 12,
    },
    statValue: { fontSize: 28, fontWeight: '800' },
    statLabel: { fontSize: 13, fontWeight: '600', marginTop: 4 },

    // Post thumbnail
    postThumb: {
        width: 56, height: 56, borderRadius: 10, overflow: 'hidden',
    },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: {
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        maxHeight: '85%', padding: 20,
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: { fontSize: 20, fontWeight: '700' },

    // Detail post view
    detailAuthorRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14,
    },
    detailOutfitBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
        marginBottom: 12,
    },
    detailOutfitName: { fontSize: 14, fontWeight: '700' },
    detailImage: {
        width: '100%', height: SCREEN_W * 0.7, borderRadius: 14, overflow: 'hidden',
    },
    detailPhotoThumb: {
        width: 80, height: 80, borderRadius: 10,
    },
    detailCaptionBox: {
        marginTop: 14, paddingHorizontal: 4,
    },
    detailCaptionLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
    detailCaptionText: { fontSize: 15, lineHeight: 22 },
    detailDeleteBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        marginTop: 20, paddingVertical: 14, borderRadius: 12, borderWidth: 1,
    },
    detailDeleteText: { fontSize: 15, fontWeight: '700' },

    // Create admin
    createAdminBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 14, borderRadius: 12, marginBottom: 12,
    },
    createAdminBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
    createLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
    createInput: {
        paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
        fontSize: 15,
    },
    createSubmitBtn: {
        alignItems: 'center', justifyContent: 'center',
        paddingVertical: 14, borderRadius: 12, marginTop: 20,
    },
    createSubmitText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

    // Sub-tabs (Contenido: Publicados / Eliminados)
    subTabs: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 16 },
    subTab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    subTabText: { fontSize: 14, fontWeight: '600' },
});

export default AdminScreen;
