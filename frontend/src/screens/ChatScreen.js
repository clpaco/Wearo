// Pantalla de Chat — mensajes individuales con fotos, audios y posts compartidos
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, FlatList, Image, ScrollView,
    StyleSheet, StatusBar, KeyboardAvoidingView, Platform, ActivityIndicator,
    Alert, Modal, Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMessages, sendMessage, sendMediaMessage, markAsRead, setChatMessages } from '../store/messagesSlice';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { IMAGE_BASE_URL } from '../services/api';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { getMessages as fetchMessagesAPI } from '../services/messages.service';
import GarmentCarousel from '../components/GarmentCarousel';

const WEARO_LOGO = require('../../assets/logo.png');
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Opciones de grabacion: AAC en M4A, compatible con todos los dispositivos
const RECORDING_OPTIONS = {
    isMeteringEnabled: true,
    android: {
        extension: '.m4a',
        outputFormat: 2,    // MPEG_4
        audioEncoder: 3,    // AAC
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 128000,
    },
    ios: {
        extension: '.m4a',
        outputFormat: 'aac ',   // kAudioFormatMPEG4AAC
        audioQuality: 96,       // HIGH
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 128000,
    },
    web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 128000,
    },
};

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
    const prevMsgCount = useRef(0);

    // Photo zoom
    const [zoomImage, setZoomImage] = useState(null);

    // Audio recording
    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState(null);
    const [recordDuration, setRecordDuration] = useState(0);
    const recordInterval = useRef(null);

    // Audio playback
    const [playingId, setPlayingId] = useState(null);
    const [sound, setSound] = useState(null);
    const [playProgress, setPlayProgress] = useState(0);
    const [playDuration, setPlayDuration] = useState(0);
    const [audioDurations, setAudioDurations] = useState({});

    // Shared post detail modal
    const [selectedPost, setSelectedPost] = useState(null);

    useEffect(() => {
        dispatch(fetchMessages({ conversationId }));
        dispatch(markAsRead(conversationId));
    }, [dispatch, conversationId]);

    // Polling: llamada directa a la API, solo toca Redux si hay mensajes nuevos
    const pollRef = useRef(null);
    const lastPollIdRef = useRef(null);
    const lastPollCountRef = useRef(0);
    useEffect(() => {
        pollRef.current = setInterval(async () => {
            try {
                const data = await fetchMessagesAPI(conversationId);
                const serverMsgs = data.messages || [];
                const serverLastId = serverMsgs.length > 0 ? serverMsgs[serverMsgs.length - 1].id : null;
                // Solo actualizar si hay datos nuevos
                if (serverMsgs.length !== lastPollCountRef.current || serverLastId !== lastPollIdRef.current) {
                    lastPollIdRef.current = serverLastId;
                    lastPollCountRef.current = serverMsgs.length;
                    dispatch(setChatMessages({ conversationId, messages: serverMsgs, hasMore: data.hasMore }));
                }
            } catch (_) {}
        }, 3000);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [dispatch, conversationId]);

    // Sync refs when messages change (e.g. after sending)
    useEffect(() => {
        if (messages.length > 0) {
            lastPollIdRef.current = messages[messages.length - 1].id;
            lastPollCountRef.current = messages.length;
        }
    }, [messages]);

    // Auto-scroll only when new messages arrive
    useEffect(() => {
        if (messages.length > prevMsgCount.current && messages.length > 0) {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
        }
        prevMsgCount.current = messages.length;
    }, [messages.length]);

    // Preload audio durations so they show before playing
    useEffect(() => {
        const audioMsgs = messages.filter((m) => m.media_type === 'audio' && m.media_url && !audioDurations[m.id]);
        if (audioMsgs.length === 0) return;

        const cleanups = [];
        audioMsgs.forEach((msg) => {
            const fullUrl = `${IMAGE_BASE_URL}${msg.media_url}`;
            if (Platform.OS === 'web') {
                const audio = new window.Audio();
                audio.preload = 'metadata';
                audio.onloadedmetadata = () => {
                    const dur = Math.round(audio.duration);
                    if (dur > 0) setAudioDurations((prev) => ({ ...prev, [msg.id]: dur }));
                };
                audio.src = fullUrl;
                cleanups.push(() => { audio.src = ''; });
            } else {
                let cancelled = false;
                Audio.Sound.createAsync({ uri: fullUrl }, { shouldPlay: false })
                    .then(({ sound: tmpSound }) => {
                        if (cancelled) { tmpSound.unloadAsync(); return; }
                        tmpSound.getStatusAsync().then((status) => {
                            if (status.isLoaded && status.durationMillis) {
                                const dur = Math.round(status.durationMillis / 1000);
                                if (dur > 0) setAudioDurations((prev) => ({ ...prev, [msg.id]: dur }));
                            }
                            tmpSound.unloadAsync();
                        });
                    })
                    .catch(() => {});
                cleanups.push(() => { cancelled = true; });
            }
        });
        return () => cleanups.forEach((fn) => fn());
    }, [messages]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (sound) {
                if (Platform.OS === 'web') { sound.pause(); } else { sound.unloadAsync(); }
            }
            if (recording) recording.stopAndUnloadAsync().catch(() => {});
            if (recordInterval.current) clearInterval(recordInterval.current);
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

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
            Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
        });
        if (!result.canceled && result.assets?.[0]) {
            dispatch(sendMediaMessage({ conversationId, mediaUri: result.assets[0].uri, mediaType: 'image' }));
        }
    };

    const handleTakePhoto = async () => {
        setShowAttach(false);
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permiso necesario', 'Necesitamos acceso a la camara.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
        if (!result.canceled && result.assets?.[0]) {
            dispatch(sendMediaMessage({ conversationId, mediaUri: result.assets[0].uri, mediaType: 'image' }));
        }
    };

    // ── Audio recording ──
    const startRecording = async () => {
        try {
            const perm = await Audio.requestPermissionsAsync();
            if (perm.status !== 'granted') {
                Alert.alert('Permiso necesario', 'Necesitamos acceso al microfono.');
                return;
            }
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });
            let rec;
            try {
                const result = await Audio.Recording.createAsync(RECORDING_OPTIONS);
                rec = result.recording;
            } catch (_) {
                // Fallback si las opciones custom fallan
                const result = await Audio.Recording.createAsync(
                    Audio.RecordingOptionsPresets.HIGH_QUALITY
                );
                rec = result.recording;
            }
            setRecording(rec);
            setIsRecording(true);
            setRecordDuration(0);
            recordInterval.current = setInterval(() => {
                setRecordDuration((d) => d + 1);
            }, 1000);
        } catch (err) {
            console.error('Error starting recording:', err);
            Alert.alert('Error', 'No se pudo iniciar la grabacion: ' + (err.message || err));
        }
    };

    const cancelRecording = async () => {
        if (recordInterval.current) clearInterval(recordInterval.current);
        setIsRecording(false);
        setRecordDuration(0);
        if (recording) {
            try {
                await recording.stopAndUnloadAsync();
            } catch (_) {}
            setRecording(null);
        }
    };

    const sendRecording = async () => {
        if (recordInterval.current) clearInterval(recordInterval.current);
        setIsRecording(false);
        setRecordDuration(0);
        if (!recording) return;
        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null);
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
            if (uri) {
                console.log('Audio URI:', uri);
                dispatch(sendMediaMessage({ conversationId, mediaUri: uri, mediaType: 'audio' }))
                    .unwrap()
                    .then(() => {
                        console.log('Audio enviado OK');
                    })
                    .catch((err) => {
                        console.error('Error enviando audio:', err);
                        Alert.alert('Error al enviar audio', String(err));
                    });
            } else {
                Alert.alert('Error', 'No se pudo obtener el audio grabado (URI vacia)');
            }
        } catch (err) {
            console.error('Error sending recording:', err);
            Alert.alert('Error al procesar audio', err.message || String(err));
            setRecording(null);
        }
    };

    // ── Audio playback ──
    const playAudio = async (msgId, audioUrl) => {
        try {
            // Stop any currently playing
            if (sound) {
                if (Platform.OS === 'web') {
                    sound.pause();
                    sound.currentTime = 0;
                } else {
                    await sound.unloadAsync();
                }
                setSound(null);
            }
            if (playingId === msgId) {
                setPlayingId(null);
                return;
            }

            const fullUrl = `${IMAGE_BASE_URL}${audioUrl}`;

            // Web: use HTML5 Audio API (expo-av has issues on web)
            if (Platform.OS === 'web') {
                const audio = new window.Audio(fullUrl);
                audio.onloadedmetadata = () => {
                    const dur = Math.round(audio.duration);
                    setPlayDuration(dur);
                    setAudioDurations((prev) => ({ ...prev, [msgId]: dur }));
                };
                audio.ontimeupdate = () => {
                    if (audio.duration) {
                        setPlayProgress(audio.currentTime / audio.duration);
                    }
                };
                audio.onended = () => {
                    setPlayingId(null);
                    setPlayProgress(0);
                    setPlayDuration(0);
                };
                audio.onerror = () => {
                    console.error('Web audio playback error');
                    setPlayingId(null);
                };
                audio.play().catch((err) => console.error('Web audio play error:', err));
                setSound(audio);
                setPlayingId(msgId);
                setPlayDuration(0);
                return;
            }

            // Native: use expo-av
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
            });
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: fullUrl },
                { shouldPlay: true },
                (status) => {
                    if (status.isLoaded && status.durationMillis) {
                        setPlayProgress(status.positionMillis / status.durationMillis);
                        const dur = Math.round(status.durationMillis / 1000);
                        setPlayDuration(dur);
                        setAudioDurations((prev) => ({ ...prev, [msgId]: dur }));
                    }
                    if (status.didJustFinish) {
                        setPlayingId(null);
                        setPlayProgress(0);
                        setPlayDuration(0);
                        newSound.unloadAsync();
                    }
                }
            );
            setSound(newSound);
            setPlayingId(msgId);
            setPlayDuration(0);
        } catch (err) {
            console.error('Error playing audio:', err);
        }
    };

    const formatDuration = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const loadOlder = () => {
        if (!isChatLoading && chatHasMore[conversationId] && messages.length > 0) {
            dispatch(fetchMessages({ conversationId, before: messages[0].id }));
        }
    };

    const getTimeLabel = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    };

    const getDateLabel = (dateStr) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now - d) / 86400000);
        if (diffDays === 0) return 'Hoy';
        if (diffDays === 1) return 'Ayer';
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    // ── Shared post preview ──
    const getPostImage = (post) => {
        if (post.photos && post.photos.length > 0 && post.photos[0]) {
            return `${IMAGE_BASE_URL}${post.photos[0]}`;
        }
        if (post.first_garment_image) {
            return `${IMAGE_BASE_URL}${post.first_garment_image}`;
        }
        return null;
    };

    const renderMessage = ({ item: msg, index }) => {
        const isMe = msg.sender_id === currentUser?.id;
        const sender = msg.sender || {};

        // Date separator: show when day changes between messages
        let showDateSep = false;
        if (index === 0) {
            showDateSep = true;
        } else {
            const prev = messages[index - 1];
            const prevDay = new Date(prev.created_at).toDateString();
            const currDay = new Date(msg.created_at).toDateString();
            if (prevDay !== currDay) showDateSep = true;
        }

        const hasMedia = msg.media_url && msg.media_type;

        return (
            <View>
                {showDateSep && (
                    <Text style={[styles.dateSeparator, { color: c.textMuted }]}>
                        {getDateLabel(msg.created_at)}
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
                        {/* FOTO — ampliable al tocar */}
                        {hasMedia && msg.media_type === 'photo' && (
                            <TouchableOpacity
                                activeOpacity={0.9}
                                onPress={() => setZoomImage(`${IMAGE_BASE_URL}${msg.media_url}`)}
                            >
                                <Image
                                    source={{ uri: `${IMAGE_BASE_URL}${msg.media_url}` }}
                                    style={styles.mediaImage}
                                    resizeMode="cover"
                                />
                            </TouchableOpacity>
                        )}

                        {/* AUDIO — reproducible */}
                        {hasMedia && msg.media_type === 'audio' && (
                            <TouchableOpacity
                                style={styles.audioRow}
                                onPress={() => playAudio(msg.id, msg.media_url)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.audioPlayBtn, { backgroundColor: isMe ? 'rgba(255,255,255,0.25)' : c.primary + '20' }]}>
                                    <Ionicons
                                        name={playingId === msg.id ? 'pause' : 'play'}
                                        size={20}
                                        color={isMe ? '#FFF' : c.primary}
                                    />
                                </View>
                                <View style={styles.audioWaveform}>
                                    {[4, 8, 14, 6, 12, 18, 8, 16, 10, 6, 14, 8].map((h, i) => (
                                        <View
                                            key={i}
                                            style={[
                                                styles.audioBar,
                                                {
                                                    height: h,
                                                    backgroundColor: isMe
                                                        ? (playingId === msg.id && i / 12 < playProgress ? '#FFF' : 'rgba(255,255,255,0.4)')
                                                        : (playingId === msg.id && i / 12 < playProgress ? c.primary : c.border),
                                                },
                                            ]}
                                        />
                                    ))}
                                </View>
                                <Text style={[styles.audioDuration, { color: isMe ? 'rgba(255,255,255,0.7)' : c.textMuted }]}>
                                    {playingId === msg.id && playDuration > 0
                                        ? formatDuration(Math.max(0, Math.round((1 - playProgress) * playDuration)))
                                        : audioDurations[msg.id]
                                            ? formatDuration(audioDurations[msg.id])
                                            : '0:00'}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* POST COMPARTIDO — estilo Instagram */}
                        {hasMedia && msg.media_type === 'post' && (
                            <TouchableOpacity
                                style={[styles.sharedPostCard, { backgroundColor: isMe ? 'rgba(255,255,255,0.12)' : c.background, borderColor: isMe ? 'rgba(255,255,255,0.2)' : c.border }]}
                                activeOpacity={0.8}
                                onPress={() => {
                                    const post = msg.shared_post;
                                    if (post) {
                                        setSelectedPost(post);
                                    }
                                }}
                            >
                                {msg.shared_post ? (
                                    <>
                                        {/* Header del post */}
                                        <View style={styles.sharedPostHeader}>
                                            <View style={[styles.sharedPostAvatar, { backgroundColor: msg.shared_post.author?.isAdmin ? 'transparent' : (c.primary + '20') }]}>
                                                {msg.shared_post.author?.isAdmin ? (
                                                    <Image source={WEARO_LOGO} style={styles.sharedPostAvatarImg} resizeMode="cover" />
                                                ) : msg.shared_post.author?.avatarUrl ? (
                                                    <Image
                                                        source={{ uri: `${IMAGE_BASE_URL}${msg.shared_post.author.avatarUrl}` }}
                                                        style={styles.sharedPostAvatarImg}
                                                    />
                                                ) : (
                                                    <Text style={[styles.sharedPostAvatarText, { color: c.primary }]}>
                                                        {(msg.shared_post.author?.fullName || '?')[0].toUpperCase()}
                                                    </Text>
                                                )}
                                            </View>
                                            <Text style={[styles.sharedPostAuthor, { color: isMe ? '#FFF' : c.text }]} numberOfLines={1}>
                                                {msg.shared_post.author?.fullName || 'Usuario'}
                                            </Text>
                                        </View>
                                        {/* Foto del post */}
                                        {getPostImage(msg.shared_post) ? (
                                            <Image
                                                source={{ uri: getPostImage(msg.shared_post) }}
                                                style={styles.sharedPostImage}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View style={[styles.sharedPostImagePlaceholder, { backgroundColor: c.surfaceVariant }]}>
                                                <Ionicons name="shirt-outline" size={32} color={c.textMuted} />
                                            </View>
                                        )}
                                        {/* Nombre del outfit */}
                                        <Text style={[styles.sharedPostName, { color: isMe ? '#FFF' : c.text }]} numberOfLines={1}>
                                            {msg.shared_post.author?.isAdmin && !msg.shared_post.outfit?.name ? 'Anuncio' : (msg.shared_post.outfit?.name || 'Outfit')}
                                        </Text>
                                    </>
                                ) : (
                                    <View style={styles.sharedPostUnavailable}>
                                        <Ionicons name="albums-outline" size={20} color={isMe ? 'rgba(255,255,255,0.6)' : c.textMuted} />
                                        <Text style={[styles.sharedPostUnavailableText, { color: isMe ? 'rgba(255,255,255,0.6)' : c.textMuted }]}>
                                            Publicacion no disponible
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}

                        {/* Texto del mensaje (no mostrar el texto auto-generado de posts compartidos) */}
                        {msg.text && !(hasMedia && msg.media_type === 'post') && !(hasMedia && msg.media_type === 'photo' && !msg.text.trim()) && (
                            <Text style={[styles.bubbleText, { color: isMe ? '#FFF' : c.text }]}>
                                {msg.text}
                            </Text>
                        )}
                    </View>
                </View>
                {/* Hora debajo de cada burbuja */}
                <Text style={[styles.msgTime, isMe ? styles.msgTimeMe : styles.msgTimeOther, { color: c.textMuted }]}>
                    {getTimeLabel(msg.created_at)}
                </Text>
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
                    onPress={() => navigation.navigate('UserProfile', {
                        userId: otherUser?.id,
                        ...(otherUser?.role === 'admin' ? { isWearo: true } : {}),
                    })}
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

                {/* Recording bar */}
                {isRecording && (
                    <View style={[styles.recordingBar, { backgroundColor: c.surface, borderTopColor: c.border }]}>
                        <TouchableOpacity onPress={cancelRecording} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="trash-outline" size={24} color={c.error || '#E17055'} />
                        </TouchableOpacity>
                        <View style={styles.recordingInfo}>
                            <View style={[styles.recordingDot, { backgroundColor: c.error || '#E17055' }]} />
                            <Text style={[styles.recordingTime, { color: c.text }]}>
                                {formatDuration(recordDuration)}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.sendRecordingBtn, { backgroundColor: c.primary }]}
                            onPress={sendRecording}
                        >
                            <Ionicons name="send" size={18} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Input bar */}
                {!isRecording && (
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
                        {input.trim() ? (
                            <TouchableOpacity
                                style={[styles.sendBtn, { backgroundColor: c.primary }]}
                                onPress={handleSend}
                                disabled={isSending}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="send" size={18} color="#FFF" />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={[styles.sendBtn, { backgroundColor: c.primary }]}
                                onPress={startRecording}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="mic" size={20} color="#FFF" />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </KeyboardAvoidingView>

            {/* Modal fullscreen para fotos */}
            <Modal visible={!!zoomImage} transparent animationType="fade" onRequestClose={() => setZoomImage(null)}>
                <View style={styles.zoomOverlay}>
                    <TouchableOpacity style={styles.zoomClose} onPress={() => setZoomImage(null)}>
                        <Ionicons name="close" size={28} color="#FFF" />
                    </TouchableOpacity>
                    {zoomImage && (
                        <Image
                            source={{ uri: zoomImage }}
                            style={styles.zoomImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>

            {/* Modal: Detalle de post compartido */}
            <Modal visible={!!selectedPost} animationType="slide" transparent onRequestClose={() => setSelectedPost(null)}>
                <View style={styles.postModalOverlay}>
                    <View style={[styles.postModalBox, { backgroundColor: c.surface }]}>
                        <View style={styles.postModalHeader}>
                            <Text style={[styles.postModalTitle, { color: c.text }]}>Publicación</Text>
                            <TouchableOpacity onPress={() => setSelectedPost(null)}>
                                <Ionicons name="close" size={22} color={c.primary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {selectedPost && (() => {
                                const post = selectedPost;
                                const author = post.author || {};
                                const outfit = post.outfit || {};
                                const photos = post.photos || [];
                                const garments = post.garments || [];

                                return (
                                    <View>
                                        {/* Author header */}
                                        <TouchableOpacity
                                            style={styles.postDetailHeader}
                                            onPress={() => {
                                                setSelectedPost(null);
                                                if (author.id) navigation.navigate('UserProfile', {
                                                    userId: author.id,
                                                    ...(author.isAdmin ? { isWearo: true } : {}),
                                                });
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[styles.postDetailAvatar, { backgroundColor: author.isAdmin ? 'transparent' : (c.primary + '20') }]}>
                                                {author.isAdmin ? (
                                                    <Image source={WEARO_LOGO} style={styles.postDetailAvatarImg} resizeMode="cover" />
                                                ) : (author.avatarUrl || author.avatar_url) ? (
                                                    <Image source={{ uri: `${IMAGE_BASE_URL}${author.avatarUrl || author.avatar_url}` }} style={styles.postDetailAvatarImg} />
                                                ) : (
                                                    <Text style={[styles.postDetailAvatarText, { color: c.primary }]}>
                                                        {(author.fullName || author.full_name || '?')[0].toUpperCase()}
                                                    </Text>
                                                )}
                                            </View>
                                            <Text style={[styles.postDetailAuthorName, { color: c.text }]}>
                                                {author.fullName || author.full_name || 'Usuario'}
                                            </Text>
                                            <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
                                        </TouchableOpacity>

                                        {/* Outfit info - hide for admin announcements */}
                                        {outfit.id && (
                                        <View style={[styles.postDetailOutfitBox, { backgroundColor: c.surfaceVariant, borderColor: c.border }]}>
                                            <Ionicons name="albums-outline" size={16} color={c.text} style={{ marginRight: 6 }} />
                                            <Text style={[styles.postDetailOutfitName, { color: c.text }]} numberOfLines={1}>
                                                {outfit.name || 'Outfit'}
                                            </Text>
                                            {outfit.occasion && (
                                                <View style={[styles.postDetailOccasion, { backgroundColor: c.primary + '15' }]}>
                                                    <Text style={[styles.postDetailOccasionText, { color: c.primary }]}>{outfit.occasion}</Text>
                                                </View>
                                            )}
                                        </View>
                                        )}

                                        {/* Photos / garments carousel */}
                                        {(photos.length > 0 || garments.length > 0) ? (
                                            <GarmentCarousel garments={author.isAdmin ? [] : garments} photos={photos} height={Math.round(SCREEN_WIDTH * 0.7)} hidePhotoLabel={!!author.isAdmin} />
                                        ) : post.first_garment_image ? (
                                            <Image
                                                source={{ uri: `${IMAGE_BASE_URL}${post.first_garment_image}` }}
                                                style={{ width: '100%', height: Math.round(SCREEN_WIDTH * 0.7) }}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View style={[styles.postDetailPlaceholder, { backgroundColor: c.surfaceVariant }]}>
                                                <Ionicons name="shirt-outline" size={48} color={c.textMuted} />
                                            </View>
                                        )}

                                        {/* Caption */}
                                        {post.caption ? (
                                            <View style={styles.postDetailCaptionRow}>
                                                <Text style={[styles.postDetailCaptionAuthor, { color: c.text }]}>
                                                    {author.fullName || author.full_name || 'Usuario'}
                                                </Text>
                                                <Text style={[styles.postDetailCaptionText, { color: c.text }]}>
                                                    {' '}{post.caption}
                                                </Text>
                                            </View>
                                        ) : null}

                                        {/* Ver perfil link */}
                                        {author.id && (
                                            <TouchableOpacity
                                                style={[styles.postDetailViewProfile, { borderColor: c.border }]}
                                                onPress={() => {
                                                    setSelectedPost(null);
                                                    navigation.navigate('UserProfile', {
                                                        userId: author.id,
                                                        ...(author.isAdmin ? { isWearo: true } : {}),
                                                    });
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name="person-outline" size={16} color={c.primary} />
                                                <Text style={[styles.postDetailViewProfileText, { color: c.primary }]}>
                                                    Ver perfil de {author.fullName || author.full_name || 'Usuario'}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                );
                            })()}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
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
    dateSeparator: { textAlign: 'center', fontSize: 12, paddingVertical: 12, fontWeight: '600' },
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

    // Message time
    msgTime: { fontSize: 10, marginTop: 2, marginBottom: 2 },
    msgTimeMe: { textAlign: 'right', marginRight: 4 },
    msgTimeOther: { textAlign: 'left', marginLeft: 34 },

    // Photo
    mediaImage: { width: 220, height: 220, borderRadius: 16, marginBottom: 4 },

    // Audio
    audioRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 6, minWidth: 180 },
    audioPlayBtn: {
        width: 36, height: 36, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center',
    },
    audioWaveform: { flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1 },
    audioBar: { width: 3, borderRadius: 2, minHeight: 4 },
    audioDuration: { fontSize: 11, fontWeight: '600', minWidth: 28 },

    // Shared post (estilo Instagram)
    sharedPostCard: {
        borderRadius: 12, borderWidth: 1, overflow: 'hidden',
        marginHorizontal: 2, marginBottom: 4, minWidth: 200,
    },
    sharedPostHeader: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, gap: 8,
    },
    sharedPostAvatar: {
        width: 24, height: 24, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    },
    sharedPostAvatarImg: { width: 24, height: 24, borderRadius: 12 },
    sharedPostAvatarText: { fontSize: 10, fontWeight: '700' },
    sharedPostAuthor: { fontSize: 13, fontWeight: '700', flex: 1 },
    sharedPostImage: { width: '100%', height: 160, backgroundColor: '#f0f0f0' },
    sharedPostImagePlaceholder: {
        width: '100%', height: 100, justifyContent: 'center', alignItems: 'center',
    },
    sharedPostName: { fontSize: 13, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 8 },
    sharedPostUnavailable: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 12, paddingVertical: 14,
    },
    sharedPostUnavailableText: { fontSize: 13 },

    // Attach
    attachBar: {
        flexDirection: 'row', gap: 16, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1,
    },
    attachOption: {
        alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 20,
        borderRadius: 14, gap: 4,
    },
    attachLabel: { fontSize: 12, fontWeight: '600' },

    // Recording bar
    recordingBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1,
    },
    recordingInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    recordingDot: { width: 10, height: 10, borderRadius: 5 },
    recordingTime: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
    sendRecordingBtn: {
        width: 40, height: 40, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center',
    },

    // Input bar
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

    // Zoom modal
    zoomOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center', alignItems: 'center',
    },
    zoomClose: {
        position: 'absolute', top: 50, right: 20, zIndex: 10,
        width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center', alignItems: 'center',
    },
    zoomImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.2 },

    // Empty
    emptyChat: { alignItems: 'center', paddingVertical: 60 },
    emptyChatAvatar: {
        width: 72, height: 72, borderRadius: 36,
        justifyContent: 'center', alignItems: 'center', marginBottom: 12, overflow: 'hidden',
    },
    emptyChatAvatarImg: { width: 72, height: 72, borderRadius: 36 },
    emptyChatAvatarText: { fontSize: 28, fontWeight: '800' },
    emptyChatName: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
    emptyChatHint: { fontSize: 14 },

    // Post detail modal
    postModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    postModalBox: {
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        maxHeight: '85%', paddingTop: 4,
    },
    postModalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 20, paddingBottom: 12,
    },
    postModalTitle: { fontSize: 18, fontWeight: '700' },
    postDetailHeader: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10,
    },
    postDetailAvatar: {
        width: 38, height: 38, borderRadius: 19,
        justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    },
    postDetailAvatarImg: { width: 38, height: 38, borderRadius: 19 },
    postDetailAvatarText: { fontSize: 16, fontWeight: '800' },
    postDetailAuthorName: { fontSize: 14, fontWeight: '700', flex: 1 },
    postDetailOutfitBox: {
        marginHorizontal: 14, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1,
        flexDirection: 'row', alignItems: 'center', marginBottom: 4,
    },
    postDetailOutfitName: { fontSize: 14, fontWeight: '700', flex: 1 },
    postDetailOccasion: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
    postDetailOccasionText: { fontSize: 11, fontWeight: '600' },
    postDetailPlaceholder: {
        width: '100%', height: 200, justifyContent: 'center', alignItems: 'center',
    },
    postDetailCaptionRow: {
        flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4,
    },
    postDetailCaptionAuthor: { fontSize: 14, fontWeight: '700' },
    postDetailCaptionText: { fontSize: 14, lineHeight: 20, flexShrink: 1 },
    postDetailViewProfile: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginHorizontal: 14, marginTop: 12, marginBottom: 20,
        paddingVertical: 12, paddingHorizontal: 16,
        borderRadius: 12, borderWidth: 1,
        justifyContent: 'center',
    },
    postDetailViewProfileText: { fontSize: 14, fontWeight: '600' },
});

export default ChatScreen;
