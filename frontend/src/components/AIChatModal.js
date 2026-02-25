// AIChatModal — Chat IA de outfits y recomendador de compras (Gemini)
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, FlatList,
    StyleSheet, Modal, KeyboardAvoidingView, Platform,
    ActivityIndicator, StatusBar, Animated, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import {
    sendMessage, fetchShoppingRecs,
    clearChat, clearShoppingRecs, clearAiError,
} from '../store/aiSlice';
import { useTheme } from '../hooks/useTheme';

// Icono Ionicons por categoría de prenda para el modo shopping
const categoryIcon = (cat) => {
    const map = {
        'camisa': 'shirt-outline', 'camiseta': 'shirt-outline', 'pantalón': 'cut-outline', 'pantalones': 'cut-outline',
        'vestido': 'flower-outline', 'falda': 'flower-outline', 'chaqueta': 'snow-outline', 'abrigo': 'snow-outline',
        'zapatos': 'footsteps-outline', 'zapatillas': 'footsteps-outline', 'botas': 'footsteps-outline', 'accesorio': 'diamond-outline',
        'bolso': 'bag-outline', 'sombrero': 'hat-outline', 'cinturón': 'ribbon-outline', 'jersey': 'shirt-outline',
    };
    const lower = (cat || '').toLowerCase();
    for (const [key, icon] of Object.entries(map)) {
        if (lower.includes(key)) return icon;
    }
    return 'bag-outline';
};

// Color de fondo por categoría para las tarjetas de producto
const categoryColor = (cat) => {
    const map = {
        'camisa': '#E3F2FD', 'camiseta': '#E3F2FD', 'pantalón': '#FFF3E0', 'pantalones': '#FFF3E0',
        'vestido': '#FCE4EC', 'falda': '#FCE4EC', 'chaqueta': '#E8EAF6', 'abrigo': '#E8EAF6',
        'zapatos': '#E0F2F1', 'zapatillas': '#E0F2F1', 'botas': '#E0F2F1', 'accesorio': '#FFF9C4',
        'bolso': '#F3E5F5', 'jersey': '#E3F2FD', 'sudadera': '#E8EAF6',
    };
    const lower = (cat || '').toLowerCase();
    for (const [key, color] of Object.entries(map)) {
        if (lower.includes(key)) return color;
    }
    return '#F5F5F5';
};

// Animated wrapper for AI messages with fade-in
const AnimatedMessage = ({ children, isUser }) => {
    const fadeAnim = useRef(new Animated.Value(isUser ? 1 : 0)).current;
    useEffect(() => {
        if (!isUser) {
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        }
    }, []);
    return <Animated.View style={{ opacity: fadeAnim }}>{children}</Animated.View>;
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
            <AnimatedMessage isUser={isUser}>
            <View
                key={index}
                style={[
                    styles.msgRow,
                    isUser ? styles.msgRowUser : styles.msgRowAI,
                ]}
            >
                {!isUser && (
                    <View style={[styles.aiAvatar, { backgroundColor: c.primary + '20' }]}>
                        <Ionicons name="sparkles" size={16} color={c.primary} />
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
            </AnimatedMessage>
        );
    };

    // ── Render tarjeta de producto (modo shopping) ─────────────────────────────
    const renderShoppingCard = ({ item }) => {
        const isError = item.category === 'error' || item.category === 'info';
        const bgColor = categoryColor(item.category);
        const iconName = categoryIcon(item.category);

        const handleOpenLink = () => {
            if (item.searchUrl) Linking.openURL(item.searchUrl).catch(() => {});
        };

        if (isError) {
            return (
                <View style={[styles.shopCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <Ionicons name="alert-circle-outline" size={24} color={c.error} />
                    <Text style={[styles.shopDesc, { color: c.textSecondary, flex: 1, marginLeft: 10 }]}>{item.description}</Text>
                </View>
            );
        }

        return (
            <TouchableOpacity
                style={[styles.productCard, { backgroundColor: c.surface, borderColor: c.border }]}
                onPress={handleOpenLink}
                activeOpacity={item.searchUrl ? 0.7 : 1}
            >
                {/* Imagen/icono del producto */}
                <View style={[styles.productImgWrap, { backgroundColor: bgColor }]}>
                    <Ionicons name={iconName} size={40} color={c.primary} />
                </View>

                {/* Info del producto */}
                <View style={styles.productInfo}>
                    <Text style={[styles.productName, { color: c.text }]} numberOfLines={2}>{item.name}</Text>
                    <Text style={[styles.productDesc, { color: c.textSecondary }]} numberOfLines={2}>{item.description}</Text>
                    <Text style={[styles.productReason, { color: c.primary }]} numberOfLines={1}>
                        <Ionicons name="bulb-outline" size={11} color={c.primary} /> {item.reason}
                    </Text>

                    {/* Botón ver en tiendas */}
                    {item.searchUrl ? (
                        <View style={[styles.shopLinkBtn, { backgroundColor: c.primary }]}>
                            <Ionicons name="cart-outline" size={14} color="#FFF" />
                            <Text style={styles.shopLinkText}>Ver en tiendas</Text>
                        </View>
                    ) : null}
                </View>
            </TouchableOpacity>
        );
    };

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
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name={isOutfits ? 'sparkles' : 'bag-outline'} size={16} color={c.text} />
                            <Text style={[styles.headerTitle, { color: c.text }]}>
                                {isOutfits ? 'StyleAI — Chat de outfits' : 'Qué me falta comprar'}
                            </Text>
                        </View>
                        <Text style={[styles.headerSub, { color: c.textSecondary }]}>
                            {isOutfits ? 'Pregunta sobre tu armario' : 'Sugerencias personalizadas con Gemini AI'}
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
                                <Ionicons name="sparkles" size={44} color={c.primary} style={{ textAlign: 'center', marginBottom: 12 }} />
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
                                    <Ionicons name="sparkles" size={16} color={c.primary} />
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
                                <Ionicons name="bag-outline" size={44} color={c.textSecondary} style={{ marginBottom: 12 }} />
                                <Text style={[{ color: c.textSecondary, textAlign: 'center' }]}>
                                    No se pudieron obtener sugerencias.{'\n'}Verifica que GEMINI_API_KEY está configurada.
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
    shopCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },

    productCard: {
        borderWidth: 1, borderRadius: 16, marginBottom: 14, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    productImgWrap: {
        width: '100%', height: 100, justifyContent: 'center', alignItems: 'center',
    },
    productInfo: { padding: 14, gap: 4 },
    productName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    productDesc: { fontSize: 13, lineHeight: 18, marginBottom: 2 },
    productReason: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
    shopLinkBtn: {
        flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6, marginTop: 4,
    },
    shopLinkText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

    centeredLoad: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    loadingText: { marginTop: 16, fontSize: 14, textAlign: 'center' },
    retryBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
});

export default AIChatModal;
