// Pantalla de Conversaciones — lista de DMs con barra de búsqueda
import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
    View, Text, TouchableOpacity, FlatList, Image, TextInput,
    StyleSheet, StatusBar, RefreshControl, ActivityIndicator, Keyboard,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchConversations, fetchUnreadCount,
    searchUsers, startConversation, clearSearchResults,
} from '../store/messagesSlice';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { IMAGE_BASE_URL } from '../services/api';
import ScreenHeader from '../components/ScreenHeader';

const MessagesScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { conversations, isLoading, searchResults, isSearching } = useSelector((s) => s.messages);
    const { theme } = useTheme();
    const c = theme.colors;

    const [searchQuery, setSearchQuery] = useState('');
    const searchTimeout = useRef(null);

    useEffect(() => {
        dispatch(fetchConversations());
        dispatch(fetchUnreadCount());
    }, [dispatch]);

    const onRefresh = useCallback(() => {
        dispatch(fetchConversations());
        dispatch(fetchUnreadCount());
    }, [dispatch]);

    const handleSearchChange = (text) => {
        setSearchQuery(text);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (text.trim().length >= 2) {
            searchTimeout.current = setTimeout(() => {
                dispatch(searchUsers(text.trim()));
            }, 400);
        } else {
            dispatch(clearSearchResults());
        }
    };

    const handleSelectUser = async (user) => {
        Keyboard.dismiss();
        setSearchQuery('');
        dispatch(clearSearchResults());
        try {
            const result = await dispatch(startConversation(user.id)).unwrap();
            navigation.navigate('Chat', {
                conversationId: result.id,
                otherUser: result.other_user || user,
            });
        } catch {}
    };

    const getTimeAgo = (dateStr) => {
        if (!dateStr) return '';
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

    const renderSearchResult = ({ item: user }) => (
        <TouchableOpacity
            style={[styles.convRow, { borderBottomColor: c.border }]}
            onPress={() => handleSelectUser(user)}
            activeOpacity={0.7}
        >
            <View style={[styles.avatar, { backgroundColor: c.primary + '20' }]}>
                {user.avatarUrl ? (
                    <Image source={{ uri: `${IMAGE_BASE_URL}${user.avatarUrl}` }} style={styles.avatarImg} />
                ) : (
                    <Text style={[styles.avatarText, { color: c.primary }]}>
                        {(user.fullName || '?')[0].toUpperCase()}
                    </Text>
                )}
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.convName, { color: c.text }]} numberOfLines={1}>
                    {user.fullName || 'Usuario'}
                </Text>
                {user.username && (
                    <Text style={[styles.searchUsername, { color: c.textMuted }]}>@{user.username}</Text>
                )}
            </View>
            <Ionicons name="chatbubble-outline" size={18} color={c.textMuted} />
        </TouchableOpacity>
    );

    const renderConversation = ({ item: conv }) => {
        const other = conv.other_user || {};
        const hasUnread = (conv.unread_count || 0) > 0;

        return (
            <TouchableOpacity
                style={[styles.convRow, { borderBottomColor: c.border }]}
                onPress={() => navigation.navigate('Chat', {
                    conversationId: conv.id,
                    otherUser: other,
                })}
                activeOpacity={0.7}
            >
                <View style={[styles.avatar, { backgroundColor: c.primary + '20' }]}>
                    {other.avatarUrl ? (
                        <Image source={{ uri: `${IMAGE_BASE_URL}${other.avatarUrl}` }} style={styles.avatarImg} />
                    ) : (
                        <Text style={[styles.avatarText, { color: c.primary }]}>
                            {(other.fullName || '?')[0].toUpperCase()}
                        </Text>
                    )}
                </View>

                <View style={{ flex: 1 }}>
                    <View style={styles.convTop}>
                        <Text style={[styles.convName, { color: c.text }, hasUnread && styles.convNameBold]} numberOfLines={1}>
                            {other.fullName || 'Usuario'}
                        </Text>
                        <Text style={[styles.convTime, { color: hasUnread ? c.primary : c.textMuted }]}>
                            {getTimeAgo(conv.last_message_at)}
                        </Text>
                    </View>
                    <View style={styles.convBottom}>
                        <Text
                            style={[
                                styles.convLastMsg,
                                { color: hasUnread ? c.text : c.textMuted },
                                hasUnread && { fontWeight: '600' },
                            ]}
                            numberOfLines={1}
                        >
                            {conv.last_message_text || 'Sin mensajes'}
                        </Text>
                        {hasUnread && (
                            <View style={[styles.unreadBadge, { backgroundColor: c.primary }]}>
                                <Text style={styles.unreadText}>{conv.unread_count}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const showingSearch = searchQuery.trim().length >= 2;

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <StatusBar barStyle={c.statusBar} />
            <ScreenHeader
                title="Mensajes"
                leftAction={
                    <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="arrow-back" size={22} color={c.text} />
                    </TouchableOpacity>
                }
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
            {/* Barra de búsqueda */}
            <View style={[styles.searchBar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
                <View style={[styles.searchInput, { backgroundColor: c.surfaceVariant, borderColor: c.border }]}>
                    <Ionicons name="search" size={18} color={c.textMuted} />
                    <TextInput
                        style={[styles.searchText, { color: c.text }]}
                        placeholder="Buscar personas..."
                        placeholderTextColor={c.textMuted}
                        value={searchQuery}
                        onChangeText={handleSearchChange}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearchQuery(''); dispatch(clearSearchResults()); }}>
                            <Ionicons name="close-circle" size={18} color={c.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {showingSearch ? (
                <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderSearchResult}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                        isSearching ? (
                            <ActivityIndicator style={{ paddingVertical: 40 }} color={c.primary} />
                        ) : (
                            <View style={styles.emptyWrap}>
                                <Text style={[styles.emptyText, { color: c.textMuted }]}>
                                    No se encontraron usuarios
                                </Text>
                            </View>
                        )
                    }
                />
            ) : (
                <FlatList
                    data={conversations}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderConversation}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={
                        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={c.primary} />
                    }
                    ListEmptyComponent={
                        !isLoading ? (
                            <View style={styles.emptyWrap}>
                                <Ionicons name="chatbubbles-outline" size={52} color={c.textMuted} style={{ marginBottom: 12 }} />
                                <Text style={[styles.emptyTitle, { color: c.text }]}>Sin conversaciones</Text>
                                <Text style={[styles.emptyText, { color: c.textMuted }]}>
                                    Busca un usuario arriba o entra al perfil de alguien para enviarle un mensaje.
                                </Text>
                            </View>
                        ) : (
                            <ActivityIndicator style={{ paddingVertical: 40 }} color={c.primary} />
                        )
                    }
                />
            )}
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    listContent: { paddingBottom: 32 },
    searchBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 0.5 },
    searchInput: {
        flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12,
        paddingHorizontal: 12, paddingVertical: 8, gap: 8,
    },
    searchText: { flex: 1, fontSize: 15, paddingVertical: 0 },
    searchUsername: { fontSize: 13, marginTop: 2 },
    convRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5,
    },
    avatar: {
        width: 52, height: 52, borderRadius: 26,
        justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden',
    },
    avatarImg: { width: 52, height: 52, borderRadius: 26 },
    avatarText: { fontSize: 20, fontWeight: '800' },
    convTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    convName: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
    convNameBold: { fontWeight: '800' },
    convTime: { fontSize: 12 },
    convBottom: { flexDirection: 'row', alignItems: 'center' },
    convLastMsg: { fontSize: 14, flex: 1, marginRight: 8 },
    unreadBadge: {
        minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6,
        justifyContent: 'center', alignItems: 'center',
    },
    unreadText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
    emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
    emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});

export default MessagesScreen;
