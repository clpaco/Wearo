// Pantalla de Chat — mensajes individuales con soporte de fotos y audio
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, FlatList, Image,
    StyleSheet, StatusBar, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard, Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMessages, sendMessage, sendMediaMessage, markAsRead } from '../store/messagesSlice';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { IMAGE_BASE_URL } from '../services/api';
import * as ImagePicker from 'expo-image-picker';

const ChatScreen = ({ route, navigation }) => {
    const { conversationId, otherUser } = route.params;
    const dispatch = useDispatch();
    const { chatMessages, chatHasMore, isChatLoading, isSending } = useSelector((s) => s.messages);
    const currentUser = useSelector((s) => s.auth.user);
    const { theme } = useTheme();
    const c = theme.colors;

    const [input, setInput] = useState('');
    const [showAttach, setShowAttach] = useState(false);
    const flatListRef = useRef(null);
    const messages = chatMessages[conversationId] || [];

    useEffect(() => {
        dispatch(fetchMessages({ conversationId }));
        dispatch(markAsRead(conversationId));
    }, [dispatch, conversationId]);

    // Auto-scroll al último mensaje
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
        }
    }, [messages.length]);

    const handleSend = useCallback(() => {
        const text = input.trim();
        if (!text || isSending) return;
        setInput('');
        dispatch(sendMessage({ conversationId, text }));
    }, [input, isSending, conversationId, dispatch]);

    const handlePickImage = async () => {
        setShowAttach(false);
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos para enviar imagenes.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
        });
        if (!result.canceled && result.assets?.[0]) {
            dispatch(sendMediaMessage({
                conversationId,
                mediaUri: result.assets[0].uri,
                mediaType: 'image',
            }));
        }
    };

    const handleTakePhoto = async () => {
        setShowAttach(false);
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permiso necesario', 'Necesitamos acceso a la camara.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            quality: 0.7,
        });
        if (!result.canceled && result.assets?.[0]) {
            dispatch(sendMediaMessage({
                conversationId,
                mediaUri: result.assets[0].uri,
                mediaType: 'image',
            }));
        }
    };

    const loadOlder = () => {
        if (!isChatLoading && chatHasMore[conversationId] && messages.length > 0) {
            dispatch(fetchMessages({ conversationId, before: messages[0].id }));
        }
    };

    const getTimeLabel = (dateStr) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now - d) / 86400000);
        const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        if (diffDays === 0) return time;
        if (diffDays === 1) return `Ayer ${time}`;
        return `${d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} ${time}`;
    };

    const renderMessage = ({ item: msg, index }) => {
        const isMe = msg.sender_id === currentUser?.id;
        const sender = msg.sender || {};

        // Mostrar timestamp si hay gap > 30 min respecto al anterior
        let showTime = false;
        if (index === 0) {
            showTime = true;
        } else {
            const prev = messages[index - 1];
            const gap = new Date(msg.created_at) - new Date(prev.created_at);
            if (gap > 30 * 60 * 1000) showTime = true;
        }

        const hasMedia = msg.media_url && msg.media_type;

        return (
            <View>
                {showTime && (
                    <Text style={[styles.timeLabel, { color: c.textMuted }]}>
                        {getTimeLabel(msg.created_at)}
                    </Text>
                )}
                <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
                    {!isMe && (
                        <View style={[styles.msgAvatar, { backgroundColor: c.primary + '20' }]}>
                            {sender.avatarUrl ? (
                                <Image source={{ uri: `${IMAGE_BASE_URL}${sender.avatarUrl}` }} style={styles.msgAvatarImg} />
                            ) : (
                                <Text style={[styles.msgAvatarText, { color: c.primary }]}>
                                    {(sender.fullName || otherUser?.fullName || '?')[0].toUpperCase()}
                                </Text>
                            )}
                        </View>
                    )}
                    <View
                        style={[
                            styles.bubble,
                            hasMedia && styles.mediaBubble,
                            isMe
                                ? [styles.bubbleMe, { backgroundColor: c.primary }]
                                : [styles.bubbleOther, { backgroundColor: c.surfaceVariant, borderColor: c.border }],
                        ]}
                    >
                        {hasMedia && msg.media_type === 'image' && (
                            <Image
                                source={{ uri: `${IMAGE_BASE_URL}${msg.media_url}` }}
                                style={styles.mediaImage}
                                resizeMode="cover"
                            />
                        )}
                        {hasMedia && msg.media_type === 'audio' && (
                            <View style={styles.audioRow}>
                                <Ionicons name="mic" size={20} color={isMe ? '#FFF' : c.primary} />
                                <Text style={[styles.audioText, { color: isMe ? '#FFF' : c.text }]}>Mensaje de voz</Text>
                            </View>
                        )}
                        {msg.text && !(hasMedia && msg.media_type === 'image' && !msg.text.trim()) && (
                            <Text style={[styles.bubbleText, { color: isMe ? '#FFF' : c.text }]}>
                                {msg.text}
                            </Text>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <StatusBar barStyle={c.statusBar} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="arrow-back" size={22} color={c.text} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.headerUser}
                    onPress={() => navigation.navigate('UserProfile', { userId: otherUser?.id })}
                    activeOpacity={0.7}
                >
                    <View style={[styles.headerAvatar, { backgroundColor: c.primary + '20' }]}>
                        {otherUser?.avatarUrl ? (
                            <Image source={{ uri: `${IMAGE_BASE_URL}${otherUser.avatarUrl}` }} style={styles.headerAvatarImg} />
                        ) : (
                            <Text style={[styles.headerAvatarText, { color: c.primary }]}>
                                {(otherUser?.fullName || '?')[0].toUpperCase()}
                            </Text>
                        )}
                    </View>
                    <Text style={[styles.headerName, { color: c.text }]} numberOfLines={1}>
                        {otherUser?.fullName || 'Usuario'}
                    </Text>
                </TouchableOpacity>

                <View style={{ width: 22 }} />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {/* Messages */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.msgList}
                    showsVerticalScrollIndicator={false}
                    keyboardDismissMode="on-drag"
                    keyboardShouldPersistTaps="handled"
                    onTouchStart={() => { Keyboard.dismiss(); setShowAttach(false); }}
                    onStartReached={loadOlder}
                    ListHeaderComponent={
                        isChatLoading && messages.length > 0 ? (
                            <ActivityIndicator style={{ paddingVertical: 12 }} color={c.primary} />
                        ) : null
                    }
                    ListEmptyComponent={
                        isChatLoading ? (
                            <ActivityIndicator style={{ paddingVertical: 40 }} color={c.primary} />
                        ) : (
                            <View style={styles.emptyChat}>
                                <View style={[styles.emptyChatAvatar, { backgroundColor: c.primary + '20' }]}>
                                    {otherUser?.avatarUrl ? (
                                        <Image source={{ uri: `${IMAGE_BASE_URL}${otherUser.avatarUrl}` }} style={styles.emptyChatAvatarImg} />
                                    ) : (
                                        <Text style={[styles.emptyChatAvatarText, { color: c.primary }]}>
                                            {(otherUser?.fullName || '?')[0].toUpperCase()}
                                        </Text>
                                    )}
                                </View>
                                <Text style={[styles.emptyChatName, { color: c.text }]}>
                                    {otherUser?.fullName || 'Usuario'}
                                </Text>
                                <Text style={[styles.emptyChatHint, { color: c.textMuted }]}>
                                    Enviale tu primer mensaje.
                                </Text>
                            </View>
                        )
                    }
                />

                {/* Attach options */}
                {showAttach && (
                    <View style={[styles.attachBar, { backgroundColor: c.surface, borderTopColor: c.border }]}>
                        <TouchableOpacity style={[styles.attachOption, { backgroundColor: c.primary + '15' }]} onPress={handlePickImage}>
                            <Ionicons name="image-outline" size={24} color={c.primary} />
                            <Text style={[styles.attachLabel, { color: c.text }]}>Galeria</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.attachOption, { backgroundColor: c.primary + '15' }]} onPress={handleTakePhoto}>
                            <Ionicons name="camera-outline" size={24} color={c.primary} />
                            <Text style={[styles.attachLabel, { color: c.text }]}>Camara</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Input bar */}
                <View style={[styles.inputBar, { backgroundColor: c.surface, borderTopColor: c.border }]}>
                    <TouchableOpacity
                        onPress={() => setShowAttach(!showAttach)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name={showAttach ? 'close-circle' : 'add-circle-outline'} size={28} color={c.primary} />
                    </TouchableOpacity>
                    <TextInput
                        style={[styles.textInput, { color: c.text, backgroundColor: c.surfaceVariant, borderColor: c.border }]}
                        placeholder="Mensaje..."
                        placeholderTextColor={c.textMuted}
                        value={input}
                        onChangeText={setInput}
                        multiline
                        maxLength={1000}
                        returnKeyType="send"
                        onSubmitEditing={handleSend}
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, { backgroundColor: input.trim() && !isSending ? c.primary : c.border }]}
                        onPress={handleSend}
                        disabled={!input.trim() || isSending}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="send" size={18} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 14, paddingTop: 50, paddingBottom: 12, borderBottomWidth: 1,
    },
    headerUser: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 12 },
    headerAvatar: {
        width: 34, height: 34, borderRadius: 17,
        justifyContent: 'center', alignItems: 'center', marginRight: 10, overflow: 'hidden',
    },
    headerAvatarImg: { width: 34, height: 34, borderRadius: 17 },
    headerAvatarText: { fontSize: 14, fontWeight: '700' },
    headerName: { fontSize: 16, fontWeight: '700', flex: 1 },

    msgList: { padding: 12, paddingBottom: 4 },
    timeLabel: { textAlign: 'center', fontSize: 11, paddingVertical: 8, fontWeight: '600' },

    msgRow: { flexDirection: 'row', marginBottom: 6, alignItems: 'flex-end' },
    msgRowMe: { justifyContent: 'flex-end' },
    msgRowOther: { justifyContent: 'flex-start' },
    msgAvatar: {
        width: 28, height: 28, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center', marginRight: 6, overflow: 'hidden',
    },
    msgAvatarImg: { width: 28, height: 28, borderRadius: 14 },
    msgAvatarText: { fontSize: 12, fontWeight: '700' },

    bubble: { maxWidth: '75%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
    mediaBubble: { paddingHorizontal: 4, paddingTop: 4, paddingBottom: 6, overflow: 'hidden' },
    bubbleMe: { borderBottomRightRadius: 4 },
    bubbleOther: { borderWidth: 1, borderBottomLeftRadius: 4 },
    bubbleText: { fontSize: 15, lineHeight: 21, paddingHorizontal: 4 },

    mediaImage: { width: 220, height: 220, borderRadius: 16, marginBottom: 4 },
    audioRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 6 },
    audioText: { fontSize: 14, fontWeight: '600' },

    attachBar: {
        flexDirection: 'row', gap: 16, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1,
    },
    attachOption: {
        alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 20,
        borderRadius: 14, gap: 4,
    },
    attachLabel: { fontSize: 12, fontWeight: '600' },

    inputBar: {
        flexDirection: 'row', alignItems: 'flex-end',
        paddingHorizontal: 12, paddingVertical: 10,
        borderTopWidth: 1, gap: 8,
    },
    textInput: {
        flex: 1, borderWidth: 1, borderRadius: 22,
        paddingHorizontal: 16, paddingVertical: 10,
        fontSize: 15, maxHeight: 100,
    },
    sendBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

    emptyChat: { alignItems: 'center', paddingVertical: 60 },
    emptyChatAvatar: {
        width: 72, height: 72, borderRadius: 36,
        justifyContent: 'center', alignItems: 'center', marginBottom: 12, overflow: 'hidden',
    },
    emptyChatAvatarImg: { width: 72, height: 72, borderRadius: 36 },
    emptyChatAvatarText: { fontSize: 28, fontWeight: '800' },
    emptyChatName: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
    emptyChatHint: { fontSize: 14 },
});

export default ChatScreen;
