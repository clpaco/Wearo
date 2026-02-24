// AIChatModal — Chat IA de outfits (Gemini) y recomendador de compras (Perplexity)
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, FlatList,
    StyleSheet, Modal, KeyboardAvoidingView, Platform,
    ActivityIndicator, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import {
    sendMessage, fetchShoppingRecs,
    clearChat, clearShoppingRecs, clearAiError,
} from '../store/aiSlice';
import { useTheme } from '../hooks/useTheme';

// Emoji por categoría de prenda para el modo shopping
const categoryEmoji = (cat) => {
    const map = {
        'camisa': '👘', 'camiseta': '👕', 'pantalón': '👖', 'pantalones': '👖',
        'vestido': '👗', 'falda': '👗', 'chaqueta': '🧥', 'abrigo': '🧥',
        'zapatos': '👟', 'zapatillas': '👟', 'botas': '👢', 'accesorio': '💍',
        'bolso': '👜', 'sombrero': '🎩', 'cinturón': '🪢', 'jersey': '🧶',
    };
    const lower = (cat || '').toLowerCase();
    for (const [key, emoji] of Object.entries(map)) {
        if (lower.includes(key)) return emoji;
    }
    return '🛍️';
};

const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
};

const AIChatModal = ({ visible, mode = 'outfits', onClose, city }) => {
    const dispatch = useDispatch();
    const { theme } = useTheme();
    const c = theme.colors;

    const { chatMessages, shoppingRecs, isLoading, isShoppingLoading, error } = useSelector((s) => s.ai);
    const [input, setInput] = useState('');
    const flatListRef = useRef(null);
    const isOutfits = mode === 'outfits';

    // Cargar recomendaciones de compra al abrir en modo shopping
    useEffect(() => {
        if (visible && !isOutfits && shoppingRecs.length === 0) {
            dispatch(fetchShoppingRecs());
        }
    }, [visible, isOutfits]);

    // Scroll al último mensaje
    useEffect(() => {
        if (chatMessages.length > 0 && flatListRef.current) {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [chatMessages]);

    const handleSend = useCallback(() => {
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;
        setInput('');

        const newMessages = [
            ...chatMessages,
            { role: 'user', content: trimmed },
        ];
        dispatch(sendMessage({ messages: newMessages, city }));
    }, [input, chatMessages, isLoading, dispatch, city]);

    const handleClose = () => {
        setInput('');
        dispatch(clearAiError());
        onClose();
    };

    const handleClear = () => {
        dispatch(clearChat());
        dispatch(clearShoppingRecs());
    };

    // ── Render mensaje (modo outfits) ────────────────────────────────────────
    const renderMessage = ({ item, index }) => {
        const isUser = item.role === 'user';
        return (
            <View
                key={index}
                style={[
                    styles.msgRow,
                    isUser ? styles.msgRowUser : styles.msgRowAI,
                ]}
            >
                {!isUser && (
                    <View style={[styles.aiAvatar, { backgroundColor: c.primary + '20' }]}>
                        <Text style={{ fontSize: 14 }}>🤖</Text>
                    </View>
                )}
                <View
                    style={[
                        styles.bubble,
                        isUser
                            ? [styles.bubbleUser, { backgroundColor: c.primary }]
                            : [styles.bubbleAI, { backgroundColor: c.surface, borderColor: c.border }],
                    ]}
                >
                    <Text style={[styles.msgText, { color: isUser ? '#FFF' : c.text }]}>
                        {item.content}
                    </Text>
                </View>
            </View>
        );
    };

    // ── Render tarjeta de compra (modo shopping) ─────────────────────────────
    const renderShoppingCard = ({ item }) => (
        <View style={[styles.shopCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={styles.shopEmoji}>{categoryEmoji(item.category)}</Text>
            <View style={{ flex: 1 }}>
                <Text style={[styles.shopName, { color: c.text }]}>{item.name}</Text>
                <Text style={[styles.shopDesc, { color: c.textSecondary }]} numberOfLines={2}>
                    {item.description}
                </Text>
                <Text style={[styles.shopReason, { color: c.primary }]}>
                    {item.reason}
                </Text>
            </View>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
            <KeyboardAvoidingView
                style={[styles.root, { backgroundColor: c.background }]}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <StatusBar barStyle={c.statusBar} />

                {/* Header */}
                <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
                    <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <Ionicons name="close" size={24} color={c.text} />
                    </TouchableOpacity>
                    <View style={{ flex: 1, marginHorizontal: 12 }}>
                        <Text style={[styles.headerTitle, { color: c.text }]}>
                            {isOutfits ? '🤖 StyleAI — Chat de outfits' : '🛍️ Qué me falta comprar'}
                        </Text>
                        <Text style={[styles.headerSub, { color: c.textSecondary }]}>
                            {isOutfits ? 'Pregunta sobre tu armario' : 'Sugerencias personalizadas de Perplexity AI'}
                        </Text>
                    </View>
                    {isOutfits && chatMessages.length > 0 && (
                        <TouchableOpacity onPress={handleClear} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                            <Ionicons name="trash-outline" size={20} color={c.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Contenido */}
                {isOutfits ? (
                    <>
                        {/* Mensaje de bienvenida si no hay chat */}
                        {chatMessages.length === 0 && !isLoading && (
                            <View style={styles.welcomeWrap}>
                                <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>🤖</Text>
                                <Text style={[styles.welcomeTitle, { color: c.text }]}>StyleAI listo</Text>
                                <Text style={[styles.welcomeText, { color: c.textSecondary }]}>
                                    Puedo ayudarte a elegir qué ponerte. Prueba con:
                                </Text>
                                {['¿Qué me pongo para una boda?', '¿Qué outfit es bueno para el trabajo?', 'Tengo una cita esta noche, ¿qué combino?'].map((s) => (
                                    <TouchableOpacity
                                        key={s}
                                        style={[styles.suggestion, { backgroundColor: c.primaryLight + '20', borderColor: c.primary + '40' }]}
                                        onPress={() => setInput(s)}
                                    >
                                        <Text style={[styles.suggestionText, { color: c.primary }]}>{s}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Lista de mensajes */}
                        {chatMessages.length > 0 && (
                            <FlatList
                                ref={flatListRef}
                                data={chatMessages}
                                renderItem={renderMessage}
                                keyExtractor={(_, i) => i.toString()}
                                contentContainerStyle={styles.msgList}
                                showsVerticalScrollIndicator={false}
                            />
                        )}

                        {/* Indicador escritura */}
                        {isLoading && (
                            <View style={styles.typingRow}>
                                <View style={[styles.aiAvatar, { backgroundColor: c.primary + '20' }]}>
                                    <Text style={{ fontSize: 14 }}>🤖</Text>
                                </View>
                                <View style={[styles.typingBubble, { backgroundColor: c.surface, borderColor: c.border }]}>
                                    <ActivityIndicator size="small" color={c.primary} />
                                    <Text style={[styles.typingText, { color: c.textSecondary }]}>StyleAI está escribiendo…</Text>
                                </View>
                            </View>
                        )}

                        {/* Input */}
                        <View style={[styles.inputBar, { backgroundColor: c.surface, borderTopColor: c.border }]}>
                            <TextInput
                                style={[styles.textInput, { color: c.text, backgroundColor: c.surfaceVariant, borderColor: c.border }]}
                                placeholder="Pregunta sobre tu armario…"
                                placeholderTextColor={c.textMuted}
                                value={input}
                                onChangeText={setInput}
                                multiline
                                maxLength={500}
                                onSubmitEditing={handleSend}
                                returnKeyType="send"
                            />
                            <TouchableOpacity
                                style={[styles.sendBtn, { backgroundColor: input.trim() && !isLoading ? c.primary : c.border }]}
                                onPress={handleSend}
                                disabled={!input.trim() || isLoading}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="send" size={18} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </>
                ) : (
                    /* Modo shopping */
                    <>
                        {isShoppingLoading ? (
                            <View style={styles.centeredLoad}>
                                <ActivityIndicator size="large" color={c.primary} />
                                <Text style={[styles.loadingText, { color: c.textSecondary }]}>
                                    Analizando tu armario…
                                </Text>
                            </View>
                        ) : shoppingRecs.length > 0 ? (
                            <FlatList
                                data={shoppingRecs}
                                renderItem={renderShoppingCard}
                                keyExtractor={(_, i) => i.toString()}
                                contentContainerStyle={styles.shopList}
                                showsVerticalScrollIndicator={false}
                                ListHeaderComponent={
                                    <Text style={[styles.shopHeader, { color: c.textSecondary }]}>
                                        Basándome en tu armario actual, estas prendas completarían tus outfits:
                                    </Text>
                                }
                            />
                        ) : (
                            <View style={styles.centeredLoad}>
                                <Text style={{ fontSize: 40, marginBottom: 12 }}>🛍️</Text>
                                <Text style={[{ color: c.textSecondary, textAlign: 'center' }]}>
                                    No se pudieron obtener sugerencias.{'\n'}Verifica tu clave de Perplexity API.
                                </Text>
                                <TouchableOpacity
                                    style={[styles.retryBtn, { backgroundColor: c.primary }]}
                                    onPress={() => dispatch(fetchShoppingRecs())}
                                >
                                    <Text style={{ color: '#FFF', fontWeight: '700' }}>Reintentar</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                )}
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14,
        borderBottomWidth: 1,
    },
    headerTitle: { fontSize: 15, fontWeight: '700' },
    headerSub: { fontSize: 12, marginTop: 1 },

    welcomeWrap: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
    welcomeTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
    welcomeText: { fontSize: 14, textAlign: 'center', marginBottom: 16 },
    suggestion: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 8 },
    suggestionText: { fontSize: 14, fontWeight: '500' },

    msgList: { padding: 12, paddingBottom: 4 },
    msgRow: { flexDirection: 'row', marginBottom: 12 },
    msgRowUser: { justifyContent: 'flex-end' },
    msgRowAI: { justifyContent: 'flex-start', alignItems: 'flex-end' },
    aiAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
    bubbleUser: { borderBottomRightRadius: 4 },
    bubbleAI: { borderWidth: 1, borderBottomLeftRadius: 4 },
    msgText: { fontSize: 14, lineHeight: 20 },

    typingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6 },
    typingBubble: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
    typingText: { fontSize: 13 },

    inputBar: {
        flexDirection: 'row', alignItems: 'flex-end',
        paddingHorizontal: 12, paddingVertical: 10,
        borderTopWidth: 1, gap: 8,
    },
    textInput: {
        flex: 1, borderWidth: 1, borderRadius: 20,
        paddingHorizontal: 16, paddingVertical: 10,
        fontSize: 14, maxHeight: 100,
    },
    sendBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

    shopList: { padding: 16 },
    shopHeader: { fontSize: 13, marginBottom: 16, lineHeight: 18 },
    shopCard: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12, gap: 12 },
    shopEmoji: { fontSize: 32, marginTop: 2 },
    shopName: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    shopDesc: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
    shopReason: { fontSize: 12, fontWeight: '600' },

    centeredLoad: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    loadingText: { marginTop: 16, fontSize: 14, textAlign: 'center' },
    retryBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
});

export default AIChatModal;
