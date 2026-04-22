import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../services/supabaseClient';
import { signOutUser } from '../services/authService';

const { width } = Dimensions.get('window');

const SPRINT_DISTANCES = ['60m', '100m', '200m'];
const MUSCU_EXERCISES = ['Power Clean', 'Squat', 'Bench Press'];

const ProfileScreen = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRecords, setEditRecords] = useState<Record<string, string>>({});
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  
  const navigation = useNavigation<any>();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      
      const userMetadata = session.user.user_metadata || {};
      const mergedProfile = {
        ...data,
        first_name: data?.first_name || userMetadata.first_name || '',
        last_name: data?.last_name || userMetadata.last_name || '',
      };

      setProfile(mergedProfile);
      setUserEmail(session.user.email || '');
      setEditRecords(data?.personal_records || {});
      setEditFirstName(mergedProfile.first_name);
      setEditLastName(mergedProfile.last_name);
    } catch (error) {
      console.error('Erreur profil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // 1. Sauvegarde dans Auth Metadata (Toujours possible et sûr)
      const { error: authError } = await supabase.auth.updateUser({
        data: { 
          first_name: editFirstName, 
          last_name: editLastName 
        }
      });

      if (authError) console.error('Auth update error:', authError);

      // 2. Sauvegarde dans la table profiles
      // On tente d'inclure les noms, mais on est prêt à ce que la table ne les ait pas
      const profileData: any = { 
        id: session.user.id,
        personal_records: editRecords,
        updated_at: new Date().toISOString(),
      };

      // On ajoute les noms seulement s'ils sont supportés par la table (testé au fetch)
      if (profile && 'first_name' in profile) {
        profileData.first_name = editFirstName;
        profileData.last_name = editLastName;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData);

      if (error) {
        console.error('Profile table update error:', error);
        // Si l'erreur est un 400, c'est probablement que les colonnes manquent
        if (error.code === '42703' || error.message.includes('column')) {
           // On réessaie sans les colonnes problématiques
           const { error: retryError } = await supabase
            .from('profiles')
            .upsert({ 
              id: session.user.id,
              personal_records: editRecords,
              updated_at: new Date().toISOString(),
            });
           if (retryError) throw retryError;
        } else {
          throw error;
        }
      }
      
      setShowEditModal(false);
      fetchProfile();
      Alert.alert('Succès', 'Ton profil a été mis à jour.');
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickImage = async (useCamera = false) => {
    try {
      const permissionResult = useCamera 
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permission refusée', 'Nous avons besoin de votre permission pour changer la photo.');
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
          });

      if (!result.canceled) {
        setUploading(true);
        const imageUri = result.assets[0].uri;

        // Note: Dans une version complète, on uploaderait ici sur Supabase Storage.
        // Pour l'instant, on sauvegarde l'URI locale ou on prépare le champ.
        // On tente de sauvegarder l'URL de l'image
        const { error } = await supabase
          .from('profiles')
          .upsert({ 
            id: profile.id,
            avatar_url: imageUri,
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error('Avatar save error:', error);
          // Si la colonne avatar_url manque, on prévient mais on garde l'image localement pour la session
          if (error.code === '42703') {
             Alert.alert('Note', 'Ta photo est enregistrée localement mais pas sur le serveur (colonne manquante).');
          } else {
            throw error;
          }
        }
        
        setProfile({ ...profile, avatar_url: imageUri });
        Alert.alert('Succès', 'Photo de profil mise à jour !');
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setUploading(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Photo de profil',
      'Comment souhaitez-vous ajouter votre photo ?',
      [
        { text: 'Galerie', onPress: () => handlePickImage(false) },
        { text: 'Appareil Photo', onPress: () => handlePickImage(true) },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const renderRecordCard = (label: string, value: string, isMuscu = false) => (
    <BlurView key={label} intensity={20} tint="default" style={styles.recordCard}>
      <Text style={styles.recordLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.recordValue}>{value || '--'}{value && isMuscu ? ' KG' : ''}</Text>
    </BlurView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  const records = profile?.personal_records || {};

  return (
    <View style={styles.container}>
      <View style={styles.lightBackground}>
        <LinearGradient
          colors={['rgba(0, 229, 255, 0.4)', 'transparent']}
          style={[styles.lightCircle, styles.cyanCircle]}
        />
        <LinearGradient
          colors={['rgba(191, 90, 242, 0.4)', 'transparent']}
          style={[styles.lightCircle, styles.purpleCircle]}
        />
      </View>
      <BlurView 
        intensity={Platform.OS === 'android' ? 80 : 100} 
        tint="dark" 
        style={[StyleSheet.absoluteFill, Platform.OS === 'android' && { backgroundColor: 'rgba(0,0,0,0.7)' }]} 
      />

      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>MON PROFIL</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={showImageOptions}
            disabled={uploading}
          >
            <View style={styles.avatarPlaceholder}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {(profile?.first_name || 'A').charAt(0).toUpperCase()}
                </Text>
              )}
              {uploading && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator color="#00E5FF" />
                </View>
              )}
            </View>
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={16} color="#000" />
            </View>
          </TouchableOpacity>
          <Text style={styles.userName}>
            {`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim().toUpperCase() || 'MODIFIER NOM'}
          </Text>
          <Text style={styles.userEmail}>{userEmail.toLowerCase()}</Text>
          <View style={styles.goalContainer}>
            <Text style={styles.goalLabel}>OBJECTIF DE LA SAISON</Text>
            <Text style={styles.goalValue}>{profile?.season_goal || 'NON DÉFINI'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>RECORD ROOM : SPRINT</Text>
          </View>
          <View style={styles.recordsGrid}>
            {SPRINT_DISTANCES.map(d => renderRecordCard(d, records[d]))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>RECORD ROOM : MUSCULATION</Text>
          </View>
          <View style={styles.recordsGrid}>
            {MUSCU_EXERCISES.map(e => renderRecordCard(e, records[e], true))}
          </View>
        </View>

        <TouchableOpacity 
          style={styles.editBtn}
          onPress={() => setShowEditModal(true)}
        >
          <Text style={styles.editBtnText}>MODIFIER MON PROFIL</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.logoutBtn}
          onPress={() => signOutUser()}
        >
          <Text style={styles.logoutBtnText}>DÉCONNEXION</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal d'édition */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>MODIFIER LE PROFIL</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSubTitle}>IDENTITÉ</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PRÉNOM</Text>
                <TextInput 
                  style={styles.input}
                  value={editFirstName}
                  onChangeText={setEditFirstName}
                  placeholder="Prénom"
                  placeholderTextColor="#555"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NOM</Text>
                <TextInput 
                  style={styles.input}
                  value={editLastName}
                  onChangeText={setEditLastName}
                  placeholder="Nom"
                  placeholderTextColor="#555"
                />
              </View>
              <Text style={styles.modalSubTitle}>SPRINT (PB)</Text>
              {SPRINT_DISTANCES.map(d => (
                <View key={d} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{d.toUpperCase()}</Text>
                  <TextInput 
                    style={styles.input}
                    value={editRecords[d]}
                    onChangeText={v => setEditRecords({...editRecords, [d]: v})}
                    placeholder="--:--"
                    placeholderTextColor="#555"
                    keyboardType="numeric"
                  />
                </View>
              ))}
              <Text style={styles.modalSubTitle}>MUSCULATION (KG)</Text>
              {MUSCU_EXERCISES.map(e => (
                <View key={e} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{e.toUpperCase()}</Text>
                  <TextInput 
                    style={styles.input}
                    value={editRecords[e]}
                    onChangeText={v => setEditRecords({...editRecords, [e]: v})}
                    placeholder="0"
                    placeholderTextColor="#555"
                    keyboardType="numeric"
                  />
                </View>
              ))}
            </ScrollView>
            
            <TouchableOpacity 
              style={[styles.saveBtn, isSaving && { opacity: 0.7 }]} 
              onPress={handleUpdateProfile}
              disabled={isSaving}
            >
              {isSaving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>ENREGISTRER</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditModal(false)}>
              <Text style={styles.cancelBtnText}>ANNULER</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  lightBackground: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  lightCircle: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.4 },
  cyanCircle: { top: -50, left: -50, backgroundColor: '#00E5FF' },
  purpleCircle: { bottom: 100, right: -50, backgroundColor: '#BF5AF2' },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 10,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 },
  header: { alignItems: 'center', marginBottom: 40 },
  avatarContainer: { position: 'relative' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 50 },
  editBadge: {
    position: 'absolute',
    bottom: 25,
    right: 0,
    backgroundColor: '#00E5FF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1C1C1E',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  avatarText: { color: '#FFFFFF', fontSize: 40, fontWeight: '900' },
  userName: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
  userEmail: { color: '#8E8E93', fontSize: 13, fontWeight: '600', marginBottom: 20 },
  goalContainer: { backgroundColor: 'rgba(0, 229, 255, 0.05)', padding: 16, borderRadius: 16, width: '100%', borderWidth: 1, borderColor: 'rgba(0, 229, 255, 0.2)', alignItems: 'center' },
  goalLabel: { color: '#00E5FF', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
  goalValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  section: { marginBottom: 32 },
  sectionHeader: { marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#00E5FF', paddingLeft: 12 },
  sectionTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  recordsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  recordCard: { width: (width - 48 - 24) / 3, padding: 16, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', alignItems: 'center' },
  recordLabel: { color: '#8E8E93', fontSize: 9, fontWeight: '900', marginBottom: 8, letterSpacing: 0.5 },
  recordValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  editBtn: { backgroundColor: 'rgba(255, 255, 255, 0.05)', paddingVertical: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', marginBottom: 16 },
  editBtnText: { color: '#00E5FF', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  logoutBtn: { paddingVertical: 16, alignItems: 'center' },
  logoutBtnText: { color: '#FF3B30', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#111', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, height: '80%' },
  modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 1.5, marginBottom: 24, textAlign: 'center' },
  modalSubTitle: { color: '#00E5FF', fontSize: 12, fontWeight: '900', marginBottom: 16, marginTop: 16, letterSpacing: 1 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { color: '#8E8E93', fontSize: 10, fontWeight: '800', marginBottom: 8 },
  input: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 12, padding: 12, color: '#FFFFFF', fontSize: 16, fontWeight: '700', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  saveBtn: { backgroundColor: '#FFFFFF', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#000', fontSize: 15, fontWeight: '900' },
  cancelBtn: { paddingVertical: 16, alignItems: 'center' },
  cancelBtnText: { color: '#8E8E93', fontSize: 13, fontWeight: '700' },
});

export default ProfileScreen;
