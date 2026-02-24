// Pantalla de Edición de Perfil
import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, Image,
    StyleSheet, ActivityIndicator, ScrollView, StatusBar, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import { updateMyProfile, uploadAvatar } from '../store/profileSlice';
import { useTheme } from '../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { IMAGE_BASE_URL } from '../services/api';
import ScreenHeader from '../components/ScreenHeader';

const EditProfileScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { myProfile, isSaving } = useSelector((s) => s.profile);
    const { theme } = useTheme();
    const c = theme.colors;

    const [fullName, setFullName] = useState(myProfile?.full_name || '');
    const [bio,      setBio]      = useState(myProfile?.bio       || '');

    const avatarUri = myProfile?.avatar_url ? `${IMAGE_BASE_URL}${myProfile.avatar_url}` : null;

    const pickAvatar = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });
        if (result.canceled) return;

        const uri = result.assets[0].uri;
        const filename = uri.split('/').pop();
        const ext = filename.split('.').pop().toLowerCase();
        const mimeTypes = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

        const formData = new FormData();
        formData.append('avatar', { uri, name: filename, type: mimeTypes[ext] || 'image/jpeg' });
        dispatch(uploadAvatar(formData));
    };

    const handleSave = async () => {
        if (!fullName.trim()) {
            Alert.alert('Error', 'El nombre no puede estar vacío');
            return;
        }
        const result = await dispatch(updateMyProfile({ fullName: fullName.trim(), bio: bio.trim() }));
        if (updateMyProfile.fulfilled.match(result)) {
            navigation.goBack();
        } else {
            Alert.alert('Error', result.payload || 'No se pudo actualizar el perfil');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <StatusBar barStyle={c.statusBar} />
            <ScreenHeader title="Editar Perfil" onBack={() => navigation.goBack()} />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Avatar */}
                <View style={styles.avatarSection}>
                    <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8}>
                        <View style={[styles.avatarWrap, { backgroundColor: c.primary + '20', borderColor: c.primary + '40' }]}>
                            {avatarUri ? (
                                <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                            ) : (
                                <Text style={[styles.avatarInitial, { color: c.primary }]}>
                                    {(fullName || '?')[0].toUpperCase()}
                                </Text>
                            )}
                        </View>
                        {isSaving ? (
                            <ActivityIndicator style={styles.avatarLoader} color={c.primary} />
                        ) : (
                            <View style={[styles.cameraBadge, { backgroundColor: c.primary }]}>
                                <Ionicons name="camera" size={14} color="#FFF" />
                            </View>
                        )}
                    </TouchableOpacity>
                    <Text style={[styles.changePhotoText, { color: c.primary }]}>Cambiar foto</Text>
                </View>

                {/* Nombre */}
                <View style={styles.field}>
                    <Text style={[styles.label, { color: c.textSecondary }]}>Nombre completo *</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.inputText }]}
                        placeholder="Tu nombre"
                        placeholderTextColor={c.placeholder}
                        value={fullName}
                        onChangeText={setFullName}
                        maxLength={80}
                    />
                </View>

                {/* Bio */}
                <View style={styles.field}>
                    <Text style={[styles.label, { color: c.textSecondary }]}>Biografía</Text>
                    <TextInput
                        style={[styles.input, styles.bioInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.inputText }]}
                        placeholder="Cuéntanos algo sobre ti..."
                        placeholderTextColor={c.placeholder}
                        value={bio}
                        onChangeText={setBio}
                        multiline
                        numberOfLines={3}
                        maxLength={200}
                    />
                    <Text style={[styles.charCount, { color: c.textMuted }]}>{bio.length}/200</Text>
                </View>

                {/* Guardar */}
                <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: c.primary }]}
                    onPress={handleSave}
                    disabled={isSaving}
                    activeOpacity={0.8}
                >
                    {isSaving ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.saveBtnText}>Guardar Cambios</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 24, paddingBottom: 40 },

    avatarSection: { alignItems: 'center', marginBottom: 28 },
    avatarWrap: {
        width: 100, height: 100, borderRadius: 50, borderWidth: 2,
        justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    },
    avatarImg: { width: 100, height: 100, borderRadius: 50 },
    avatarInitial: { fontSize: 42, fontWeight: '800' },
    avatarLoader: { position: 'absolute', bottom: 0, right: -4 },
    cameraBadge: {
        position: 'absolute', bottom: 0, right: -4,
        width: 30, height: 30, borderRadius: 15,
        justifyContent: 'center', alignItems: 'center',
    },
    changePhotoText: { marginTop: 8, fontSize: 14, fontWeight: '600' },

    field: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
    bioInput: { minHeight: 80, textAlignVertical: 'top' },
    charCount: { fontSize: 12, textAlign: 'right', marginTop: 4 },

    saveBtn: {
        borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8,
        shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    saveBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});

export default EditProfileScreen;
