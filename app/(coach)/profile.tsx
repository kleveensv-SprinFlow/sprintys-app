import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../src/core/theme';
import { useAuthStore } from '../../src/store/authStore';
import { useRouter } from 'expo-router';
import { EditProfileModal } from '../../src/shared/components/EditProfileModal';
import { supabase } from '../../src/services/supabase';

function base64ToUint8Array(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }

  let bufferLength = base64.length * 0.75;
  if (base64[base64.length - 1] === '=') {
    bufferLength--;
    if (base64[base64.length - 2] === '=') {
      bufferLength--;
    }
  }

  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < base64.length; i += 4) {
    const encoded1 = lookup[base64.charCodeAt(i)];
    const encoded2 = lookup[base64.charCodeAt(i + 1)];
    const encoded3 = lookup[base64.charCodeAt(i + 2)];
    const encoded4 = lookup[base64.charCodeAt(i + 3)];

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (encoded3 !== undefined && base64[i + 2] !== '=') {
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    }
    if (encoded4 !== undefined && base64[i + 3] !== '=') {
      bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }
  }

  return bytes;
}

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuthStore();
  const router = useRouter();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isPhotoSheetVisible, setIsPhotoSheetVisible] = useState(false);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [pendingImage, setPendingImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handleLogout = async () => {
    Alert.alert('Déconnexion', 'Es-tu sûr de vouloir te déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer mon compte',
      'ATTENTION : Cette action est irréversible. Toutes tes données seront définitivement supprimées.\n\nEs-tu absolument certain de vouloir continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer définitivement',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.functions.invoke('delete_account_and_assets');
              if (error) throw error;
              await logout();
              router.replace('/(auth)/login');
            } catch (err) {
              console.error('Error deleting account:', err);
              Alert.alert('Erreur', 'Impossible de supprimer le compte pour le moment.');
            }
          },
        },
      ]
    );
  };

  const handlePickImage = async (fromCamera: boolean) => {
    setIsPhotoSheetVisible(false);

    try {
      let permission;
      if (fromCamera) {
        permission = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (!permission.granted) {
        Alert.alert(
          'Permission requise',
          'Veuillez autoriser l\'accès pour pouvoir sélectionner ou prendre une photo de profil.'
        );
        return;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      };

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPendingImage(result.assets[0]);
        setIsConfirmModalVisible(true);
      }
    } catch (err) {
      console.error('Error selecting image:', err);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image.');
    }
  };

  const handleConfirmPhoto = async () => {
    if (!pendingImage || !user?.id) return;
    setIsUploadingPhoto(true);

    try {
      const filePath = `${user.id}/${Date.now()}.jpg`;
      let uploadData: any;

      if (pendingImage.base64) {
        uploadData = base64ToUint8Array(pendingImage.base64);
      } else {
        const response = await fetch(pendingImage.uri);
        uploadData = await response.blob();
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, uploadData, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      await updateProfile({ avatarUrl: publicUrl });
      setIsConfirmModalVisible(false);
      setPendingImage(null);
      Alert.alert('Succès 🎉', 'Votre photo de profil a été mise à jour !');
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      Alert.alert('Erreur', 'Impossible de mettre à jour la photo de profil.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setIsPhotoSheetVisible(false);
    Alert.alert(
      'Supprimer la photo',
      'Êtes-vous sûr de vouloir supprimer votre photo de profil ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await updateProfile({ avatarUrl: null });
            Alert.alert('Photo supprimée', 'Votre photo de profil a été retirée.');
          },
        },
      ]
    );
  };

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    return user?.name?.charAt(0).toUpperCase() || 'C';
  };

  const getInfoString = () => {
    return user?.email || 'Coach Sprintys';
  };

  const SettingsItem = ({ icon, title, value, onPress, isDestructive = false }: any) => (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={[styles.iconContainer, isDestructive && { backgroundColor: theme.colors.error + '20' }]}>
        <Feather name={icon} size={20} color={isDestructive ? theme.colors.error : theme.colors.accent} />
      </View>
      <View style={styles.itemTextContainer}>
        <Text style={[styles.itemTitle, isDestructive && { color: theme.colors.error }]}>{title}</Text>
        {value && <Text style={styles.itemValue}>{value}</Text>}
      </View>
      <Feather name="chevron-right" size={20} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Mon Profil</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => setIsPhotoSheetVisible(true)}
            activeOpacity={0.8}
          >
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{getInitials()}</Text>
              </View>
            )}
            <View style={styles.avatarIconBadge}>
              <Feather name="camera" size={13} color="#FFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Coach'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <TouchableOpacity
            style={styles.changePhotoBtn}
            onPress={() => setIsPhotoSheetVisible(true)}
            activeOpacity={0.7}
          >
            <Feather name="edit-2" size={12} color={theme.colors.accent} />
            <Text style={styles.changePhotoText}>Modifier ma photo</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Mon Compte</Text>
        <View style={styles.card}>
          <SettingsItem
            icon="user"
            title="Mes informations"
            value={getInfoString()}
            onPress={() => setIsEditModalVisible(true)}
          />
        </View>

        <Text style={styles.sectionTitle}>Application</Text>
        <View style={styles.card}>
          <SettingsItem
            icon="help-circle"
            title="FAQ & Aide"
            onPress={() => Linking.openURL('mailto:support@sprintflow.app?subject=FAQ%20%26%20Aide')}
          />
          <SettingsItem
            icon="mail"
            title="Nous contacter"
            onPress={() => Linking.openURL('mailto:support@sprintflow.app?subject=Contact')}
          />
        </View>

        <View style={[styles.card, { marginTop: 30, marginBottom: 40 }]}>
          <SettingsItem icon="log-out" title="Se déconnecter" isDestructive onPress={handleLogout} />
          <SettingsItem icon="trash-2" title="Supprimer mon compte" isDestructive onPress={handleDeleteAccount} />
        </View>
      </ScrollView>

      {/* MODAL 1 : Choix Camera / Galerie */}
      <Modal visible={isPhotoSheetVisible} transparent animationType="fade" onRequestClose={() => setIsPhotoSheetVisible(false)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setIsPhotoSheetVisible(false)}>
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Photo de profil</Text>

            <TouchableOpacity style={styles.sheetOption} onPress={() => handlePickImage(true)} activeOpacity={0.7}>
              <View style={[styles.sheetIconCircle, { backgroundColor: theme.colors.accent + '20' }]}>
                <Feather name="camera" size={20} color={theme.colors.accent} />
              </View>
              <Text style={styles.sheetOptionText}>Prendre une photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetOption} onPress={() => handlePickImage(false)} activeOpacity={0.7}>
              <View style={[styles.sheetIconCircle, { backgroundColor: theme.colors.success + '20' }]}>
                <Feather name="image" size={20} color={theme.colors.success} />
              </View>
              <Text style={styles.sheetOptionText}>Choisir dans la galerie</Text>
            </TouchableOpacity>

            {user?.avatarUrl && (
              <TouchableOpacity style={styles.sheetOption} onPress={handleRemovePhoto} activeOpacity={0.7}>
                <View style={[styles.sheetIconCircle, { backgroundColor: theme.colors.error + '20' }]}>
                  <Feather name="trash-2" size={20} color={theme.colors.error} />
                </View>
                <Text style={[styles.sheetOptionText, { color: theme.colors.error }]}>Supprimer la photo actuelle</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => setIsPhotoSheetVisible(false)} activeOpacity={0.7}>
              <Text style={styles.sheetCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL 2 : Aperçu & Confirmation */}
      <Modal visible={isConfirmModalVisible} transparent animationType="slide" onRequestClose={() => setIsConfirmModalVisible(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Aperçu de la photo</Text>
            <Text style={styles.confirmSubtitle}>Vérifie le résultat avant d'enregistrer.</Text>

            <View style={styles.previewContainer}>
              {pendingImage && <Image source={{ uri: pendingImage.uri }} style={styles.previewImage} />}
            </View>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmBtnCancel}
                onPress={() => {
                  setIsConfirmModalVisible(false);
                  setPendingImage(null);
                }}
                disabled={isUploadingPhoto}
              >
                <Text style={styles.confirmBtnCancelText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtnSave, isUploadingPhoto && { opacity: 0.7 }]}
                onPress={handleConfirmPhoto}
                disabled={isUploadingPhoto}
              >
                {isUploadingPhoto ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.confirmBtnSaveText}>Valider cette photo</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <EditProfileModal visible={isEditModalVisible} onClose={() => setIsEditModalVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { padding: 8, marginLeft: -8 },
  title: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  content: { flex: 1, paddingHorizontal: 20 },
  profileHeader: { alignItems: 'center', marginVertical: 20 },
  avatarContainer: {
    position: 'relative',
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    overflow: 'visible',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#E2E8F0',
  },
  avatarFallback: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 30, fontWeight: 'bold', color: '#FFF' },
  avatarIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#0F172A',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  name: { fontSize: 22, fontWeight: 'bold', color: theme.colors.text, marginBottom: 4 },
  email: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 8 },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceLight,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  changePhotoText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 10,
    marginLeft: 10,
  },
  card: { backgroundColor: theme.colors.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  item: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  iconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surfaceLight, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  itemTextContainer: { flex: 1 },
  itemTitle: { fontSize: 16, color: theme.colors.text, fontWeight: '500' },
  itemValue: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 },

  // BottomSheet Photo
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 14,
  },
  sheetIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  sheetCancelBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  sheetCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },

  // Modal Confirmation Photo
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
  },
  confirmSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 20,
  },
  previewContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 24,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmBtnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  confirmBtnCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  confirmBtnSave: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
