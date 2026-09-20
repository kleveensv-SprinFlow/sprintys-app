import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../src/core/theme';
import { useAuthStore } from '../../src/store/authStore';
import { supabase } from '../../src/services/supabase';
import { useRouter } from 'expo-router';
import { EditProfileModal } from '../../src/shared/components/EditProfileModal';

// Helper to convert base64 to Uint8Array for binary upload
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

export default function SettingsScreen() {
  const { user, logout, updateProfile, reloadProfile } = useAuthStore();
  const router = useRouter();
  
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isPhotoSheetVisible, setIsPhotoSheetVisible] = useState(false);
  const [pendingImage, setPendingImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Reload fresh profile info from Supabase whenever user opens settings
  useFocusEffect(
    useCallback(() => {
      reloadProfile();
    }, [])
  );

  const handleLogout = async () => {
    Alert.alert('Déconnexion', 'Es-tu sûr de vouloir te déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { 
        text: 'Se déconnecter', 
        style: 'destructive', 
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        }
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
              const { error } = await supabase.rpc('delete_user');
              if (error) throw error;
              await logout();
              router.replace('/(auth)/login');
            } catch (err) {
              console.error('Error deleting account:', err);
              Alert.alert('Erreur', 'Impossible de supprimer le compte pour le moment.');
            }
          }
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

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

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
          }
        }
      ]
    );
  };

  const getInitials = () => {
    const f = user?.firstName || (user?.name ? user.name.split(' ')[0] : '');
    const l = user?.lastName || (user?.name && user.name.includes(' ') ? user.name.split(' ').slice(1).join(' ') : '');
    if (f && l) {
      return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
    }
    if (f) return f.charAt(0).toUpperCase();
    return user?.name?.charAt(0).toUpperCase() || 'A';
  };

  const displayFirstName = user?.firstName || (user?.name ? user.name.split(' ')[0] : null) || 'Non renseigné';
  const displayLastName = user?.lastName || (user?.name && user.name.includes(' ') ? user.name.split(' ').slice(1).join(' ') : null) || 'Non renseigné';
  const displayHeight = user?.height ? `${user.height} cm` : 'Non renseigné';

  const SettingsItem = ({ icon, title, value, onPress, isDestructive = false }: any) => (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
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
        {/* Profile Header with Avatar & Edit Badge */}
        <View style={styles.profileHeader}>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            activeOpacity={0.8}
            onPress={() => setIsPhotoSheetVisible(true)}
          >
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{getInitials()}</Text>
              </View>
            )}
            <View style={styles.avatarIconBadge}>
              <Feather name="camera" size={14} color="#FFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{user?.name || `${displayFirstName} ${displayLastName}`.trim()}</Text>
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

        {/* Section Mes Informations */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Mes informations</Text>
          <TouchableOpacity onPress={() => setIsEditModalVisible(true)} style={styles.editLinkBtn}>
            <Feather name="edit-3" size={14} color={theme.colors.accent} />
            <Text style={styles.editLinkText}>Modifier</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <TouchableOpacity 
            style={styles.infoRow} 
            onPress={() => setIsEditModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.infoIconBox}>
              <Feather name="user" size={18} color={theme.colors.accent} />
            </View>
            <View style={styles.infoTextBox}>
              <Text style={styles.infoLabel}>Prénom</Text>
              <Text style={[styles.infoValue, displayFirstName === 'Non renseigné' && styles.infoValueMuted]}>
                {displayFirstName}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.infoDivider} />

          <TouchableOpacity 
            style={styles.infoRow} 
            onPress={() => setIsEditModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.infoIconBox}>
              <Feather name="user" size={18} color={theme.colors.accent} />
            </View>
            <View style={styles.infoTextBox}>
              <Text style={styles.infoLabel}>Nom</Text>
              <Text style={[styles.infoValue, displayLastName === 'Non renseigné' && styles.infoValueMuted]}>
                {displayLastName}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.infoDivider} />

          <TouchableOpacity 
            style={styles.infoRow} 
            onPress={() => setIsEditModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.infoIconBox}>
              <Feather name="maximize-2" size={18} color={theme.colors.accent} />
            </View>
            <View style={styles.infoTextBox}>
              <Text style={styles.infoLabel}>Taille</Text>
              <Text style={[styles.infoValue, displayHeight === 'Non renseigné' && styles.infoValueMuted]}>
                {displayHeight}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Application</Text>
        <View style={styles.card}>
          <SettingsItem icon="help-circle" title="FAQ & Aide" onPress={() => {}} />
          <SettingsItem icon="mail" title="Nous contacter" onPress={() => {}} />
        </View>

        <View style={[styles.card, { marginTop: 30, marginBottom: 80 }]}>
          <SettingsItem icon="log-out" title="Se déconnecter" isDestructive onPress={handleLogout} />
          <SettingsItem icon="trash-2" title="Supprimer mon compte" isDestructive onPress={handleDeleteAccount} />
        </View>
      </ScrollView>

      {/* MODAL 1 : Choix de la source photo (Sheet) */}
      <Modal 
        visible={isPhotoSheetVisible} 
        transparent 
        animationType="fade" 
        onRequestClose={() => setIsPhotoSheetVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsPhotoSheetVisible(false)}
        >
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Photo de profil</Text>
            <Text style={styles.sheetSubtitle}>Choisissez une photo ou prenez-en une directement</Text>

            <TouchableOpacity 
              style={styles.sheetOption} 
              onPress={() => handlePickImage(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.sheetIconCircle, { backgroundColor: theme.colors.accent + '20' }]}>
                <Feather name="camera" size={20} color={theme.colors.accent} />
              </View>
              <Text style={styles.sheetOptionText}>Prendre une photo en direct</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.sheetOption} 
              onPress={() => handlePickImage(false)}
              activeOpacity={0.7}
            >
              <View style={[styles.sheetIconCircle, { backgroundColor: theme.colors.success + '20' }]}>
                <Feather name="image" size={20} color={theme.colors.success} />
              </View>
              <Text style={styles.sheetOptionText}>Choisir dans la galerie</Text>
            </TouchableOpacity>

            {user?.avatarUrl && (
              <TouchableOpacity 
                style={styles.sheetOption} 
                onPress={handleRemovePhoto}
                activeOpacity={0.7}
              >
                <View style={[styles.sheetIconCircle, { backgroundColor: theme.colors.error + '20' }]}>
                  <Feather name="trash-2" size={20} color={theme.colors.error} />
                </View>
                <Text style={[styles.sheetOptionText, { color: theme.colors.error }]}>Supprimer la photo actuelle</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.sheetCancelBtn} 
              onPress={() => setIsPhotoSheetVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.sheetCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL 2 : Aperçu & Confirmation du recadrage sans frustration */}
      <Modal 
        visible={isConfirmModalVisible} 
        transparent 
        animationType="slide" 
        onRequestClose={() => {
          if (!isUploadingPhoto) {
            setIsConfirmModalVisible(false);
            setPendingImage(null);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmModalTitle}>Aperçu de la photo</Text>
            <Text style={styles.confirmModalSubtitle}>
              Voici le résultat de votre recadrage. Souhaitez-vous appliquer cette photo à votre profil ?
            </Text>

            <View style={styles.previewImageContainer}>
              {pendingImage && (
                <Image source={{ uri: pendingImage.uri }} style={styles.previewImage} />
              )}
            </View>

            <View style={styles.confirmActionsRow}>
              <TouchableOpacity 
                style={styles.confirmCancelBtn} 
                disabled={isUploadingPhoto}
                onPress={() => {
                  setIsConfirmModalVisible(false);
                  setPendingImage(null);
                }}
              >
                <Text style={styles.confirmCancelText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.confirmValidateBtn, isUploadingPhoto && { opacity: 0.7 }]} 
                disabled={isUploadingPhoto}
                onPress={handleConfirmPhoto}
              >
                {isUploadingPhoto ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Feather name="check" size={18} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.confirmValidateText}>Valider</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3 : Édition des informations (Nom, Prénom, Taille) */}
      <EditProfileModal 
        visible={isEditModalVisible} 
        onClose={() => setIsEditModalVisible(false)} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { padding: 8, marginLeft: -8 },
  title: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  content: { flex: 1, paddingHorizontal: 20 },
  
  // Profile Header
  profileHeader: { alignItems: 'center', marginVertical: 16 },
  avatarContainer: {
    position: 'relative',
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: theme.colors.accent,
    padding: 2,
    backgroundColor: theme.colors.surface,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 46,
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 46,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 34, fontWeight: 'bold', color: '#FFF' },
  avatarIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.accent,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  name: { fontSize: 22, fontWeight: 'bold', color: theme.colors.text, marginBottom: 4 },
  email: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 8 },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  changePhotoText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.accent,
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  editLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.accent,
  },

  // Info Card
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  infoTextBox: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  infoValueMuted: {
    color: theme.colors.textMuted,
    fontWeight: 'normal',
  },
  infoDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: 66,
  },

  // Generic Card & Item
  card: { backgroundColor: theme.colors.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  item: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  iconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surfaceLight, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  itemTextContainer: { flex: 1 },
  itemTitle: { fontSize: 16, color: theme.colors.text, fontWeight: '500' },
  itemValue: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 },

  // Modal Overlay & Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.textMuted + '60',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceLight,
    marginBottom: 10,
  },
  sheetIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  sheetOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  sheetCancelBtn: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sheetCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },

  // Confirm Modal
  confirmModalContent: {
    margin: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 380,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmModalSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  previewImageContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: theme.colors.accent,
    padding: 4,
    backgroundColor: theme.colors.surfaceLight,
    marginBottom: 24,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 66,
  },
  confirmActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceLight,
  },
  confirmCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  confirmValidateBtn: {
    flex: 1.2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmValidateText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFF',
  },
});
