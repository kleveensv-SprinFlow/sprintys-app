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
import { AthleteIdentityCard } from '../features/body/components/AthleteIdentityCard';
import { ChecklistManagerCard } from '../features/body/components/ChecklistManagerCard';
import { useBodyStore } from '../store/bodyStore';

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
  
  // États d'édition étendus
  const [editDob, setEditDob] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [editActivity, setEditActivity] = useState('active');
  const [editGoal, setEditGoal] = useState('maintain');
  
  const navigation = useNavigation<any>();

  const { profile: storeProfile, fetchProfile: fetchStoreProfile, setProfile: setStoreProfile } = useBodyStore();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      await fetchStoreProfile(session.user.id);
      const data = useBodyStore.getState().profile;

      if (data) {
        setProfile(data);
        setUserEmail(session.user.email || '');
        setEditRecords(data.personal_records || {});
        setEditFirstName(data.first_name || '');
        setEditLastName(data.last_name || '');
        
        // Formatage de la date de naissance pour l'affichage (YYYY-MM-DD -> DD/MM/YYYY)
        if (data.dob) {
          const [y, m, d] = data.dob.split('-');
          setEditDob(`${d}/${m}/${y}`);
        } else {
          setEditDob('');
        }

        setEditHeight(data.height?.toString() || '');
        setEditActivity(data.activity_level || 'active');
        setEditGoal(data.nutrition_goal || 'maintain');
      }
    } catch (error) {
      console.error('Erreur profil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDobInputChange = (text: string) => {
    // Supprimer tout ce qui n'est pas un chiffre
    let cleaned = text.replace(/\D/g, '');
    
    // Limiter à 8 chiffres
    if (cleaned.length > 8) cleaned = cleaned.slice(0, 8);
    
    // Ajouter les slashs
    let formatted = cleaned;
    if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`;
    } else if (cleaned.length > 2) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    
    setEditDob(formatted);
  };

  const handleUpdateProfile = async () => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // 1. Sauvegarde dans Auth Metadata (Nom/Prénom)
      const { error: authError } = await supabase.auth.updateUser({
        data: { 
          first_name: editFirstName, 
          last_name: editLastName 
        }
      });
      if (authError) console.error('Auth update error:', authError);

      // 2. Calcul des macros
      const currentWeight = useBodyStore.getState().metrics[0]?.weight || 70;
      const h = parseFloat(editHeight) || 0;
      const dobYear = parseInt(editDob.split('-')[0]) || 0;
      const age = dobYear > 0 ? new Date().getFullYear() - dobYear : 25;

      const bmr = (10 * currentWeight) + (6.25 * (h || 175)) - (5 * age) + 5;
      const multipliers: Record<string, number> = { sedentary: 1.2, active: 1.55, very_active: 1.725 };
      const adjustments: Record<string, number> = { loss: -400, maintain: 0, gain: 300 };

      const tdee = bmr * (multipliers[editActivity] || 1.2);
      const targetCalories = Math.round(tdee + (adjustments[editGoal] || 0));
      const p = Math.round(currentWeight * 2.2);
      const f = Math.round(currentWeight * 1.0);
      const c = Math.round((targetCalories - (p * 4) - (f * 9)) / 4);

      // 3. Mise à jour via le Store (plus propre)
      const updates: any = {
        personal_records: editRecords,
        first_name: editFirstName,
        last_name: editLastName,
        dob: editDob.includes('/') ? editDob.split('/').reverse().join('-') : editDob,
        height: h > 0 ? h : null,
        activity_level: editActivity,
        nutrition_goal: editGoal,
        target_calories: targetCalories,
        target_protein: p,
        target_carbs: c,
        target_fats: f,
      };

      try {
        await useBodyStore.getState().updateProfile(session.user.id, updates);
      } catch (storeError: any) {
        console.error('Store update error:', storeError);
        // Si colonnes manquantes, on tente sans les colonnes suspectes
        if (storeError.code === '42703') {
          const safeUpdates = {
            personal_records: editRecords,
            dob: editDob,
            height: h > 0 ? h : null,
            activity_level: editActivity,
            nutrition_goal: editGoal,
          };
          await useBodyStore.getState().updateProfile(session.user.id, safeUpdates);
          Alert.alert('Note', 'Nom/Prénom non sauvegardés (colonnes manquantes en base), mais le reste est OK.');
        } else {
          throw storeError;
        }
      }
      
      setShowEditModal(false);
      fetchProfile();
      Alert.alert('Succès', 'Profil mis à jour !');
    } catch (error: any) {
      console.error('Final update error:', error);
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
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 })
        : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });

      if (!result.canceled) {
        setUploading(true);
        const imageUri = result.assets[0].uri;

        const { error } = await supabase
          .from('profiles')
          .upsert({ id: profile.id, avatar_url: imageUri, updated_at: new Date().toISOString() });

        if (error && error.code !== '42703') throw error;
        
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
        <LinearGradient colors={['rgba(0, 229, 255, 0.4)', 'transparent']} style={[styles.lightCircle, styles.cyanCircle]} />
        <LinearGradient colors={['rgba(191, 90, 242, 0.4)', 'transparent']} style={[styles.lightCircle, styles.purpleCircle]} />
      </View>
      <BlurView intensity={Platform.OS === 'android' ? 80 : 100} tint="dark" style={[StyleSheet.absoluteFill, Platform.OS === 'android' && { backgroundColor: 'rgba(0,0,0,0.7)' }]} />

      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>MON PROFIL</Text>
        <TouchableOpacity onPress={showImageOptions} style={styles.backButton}>
          <Ionicons name="camera" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AthleteIdentityCard onEdit={() => setShowEditModal(true)} />

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

        <ChecklistManagerCard />

        <TouchableOpacity style={styles.editBtn} onPress={() => setShowEditModal(true)}>
          <Text style={styles.editBtnText}>MODIFIER MON PROFIL</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={() => signOutUser()}>
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
                <TextInput style={styles.input} value={editFirstName} onChangeText={setEditFirstName} placeholder="Prénom" placeholderTextColor="#555" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NOM</Text>
                <TextInput style={styles.input} value={editLastName} onChangeText={setEditLastName} placeholder="Nom" placeholderTextColor="#555" />
              </View>

              <Text style={styles.modalSubTitle}>MORPHOLOGIE & ACTIVITÉ</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>TAILLE (CM)</Text>
                <TextInput style={styles.input} value={editHeight} onChangeText={setEditHeight} placeholder="180" placeholderTextColor="#555" keyboardType="numeric" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>DATE DE NAISSANCE (JJ/MM/AAAA)</Text>
                {profile?.dob ? (
                  <View style={styles.lockedInput}>
                    <Ionicons name="lock-closed" size={14} color="#8E8E93" style={{ marginRight: 8 }} />
                    <Text style={styles.lockedInputText}>
                      {editDob} ({new Date().getFullYear() - parseInt(profile.dob.split('-')[0])} ANS)
                    </Text>
                  </View>
                ) : (
                  <TextInput 
                    style={styles.input} 
                    value={editDob} 
                    onChangeText={handleDobInputChange} 
                    placeholder="21/06/2002" 
                    placeholderTextColor="#555" 
                    keyboardType="numeric"
                    maxLength={10}
                  />
                )}
                {profile?.dob && <Text style={styles.inputNote}>Impossible de changer après enregistrement</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NIVEAU D'ACTIVITÉ</Text>
                <View style={styles.chipRow}>
                  {['sedentary', 'active', 'very_active'].map(level => (
                    <TouchableOpacity key={level} style={[styles.miniChip, editActivity === level && styles.miniChipActive]} onPress={() => setEditActivity(level)}>
                      <Text style={[styles.miniChipText, editActivity === level && styles.miniChipTextActive]}>{level === 'sedentary' ? 'CALME' : level === 'active' ? 'ACTIF' : 'ÉLITE'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>OBJECTIF NUTRITIONNEL</Text>
                <View style={styles.chipRow}>
                  {['loss', 'maintain', 'gain'].map(g => (
                    <TouchableOpacity key={g} style={[styles.miniChip, editGoal === g && styles.miniChipActive]} onPress={() => setEditGoal(g)}>
                      <Text style={[styles.miniChipText, editGoal === g && styles.miniChipTextActive]}>{g === 'loss' ? 'PERTE' : g === 'maintain' ? 'MAINTIEN' : 'PRISE'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Text style={styles.modalSubTitle}>SPRINT (PB)</Text>
              {SPRINT_DISTANCES.map(d => (
                <View key={d} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{d.toUpperCase()}</Text>
                  <TextInput style={styles.input} value={editRecords[d]} onChangeText={v => setEditRecords({...editRecords, [d]: v})} placeholder="--:--" placeholderTextColor="#555" keyboardType="numeric" />
                </View>
              ))}

              <Text style={styles.modalSubTitle}>MUSCULATION (KG)</Text>
              {MUSCU_EXERCISES.map(e => (
                <View key={e} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{e.toUpperCase()}</Text>
                  <TextInput style={styles.input} value={editRecords[e]} onChangeText={v => setEditRecords({...editRecords, [e]: v})} placeholder="0" placeholderTextColor="#555" keyboardType="numeric" />
                </View>
              ))}
            </ScrollView>
            
            <TouchableOpacity style={[styles.saveBtn, isSaving && { opacity: 0.7 }]} onPress={handleUpdateProfile} disabled={isSaving}>
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
  topTitle: { fontSize: 14, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 },
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
  lockedInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  lockedInputText: { color: '#8E8E93', fontSize: 16, fontWeight: '700' },
  inputNote: { color: '#FF3B30', fontSize: 8, fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  miniChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  miniChipActive: { backgroundColor: 'rgba(0, 229, 255, 0.1)', borderColor: '#00E5FF' },
  miniChipText: { color: '#8E8E93', fontSize: 10, fontWeight: '900' },
  miniChipTextActive: { color: '#00E5FF' },
  saveBtn: { backgroundColor: '#FFFFFF', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#000', fontSize: 15, fontWeight: '900' },
  cancelBtn: { paddingVertical: 16, alignItems: 'center' },
  cancelBtnText: { color: '#8E8E93', fontSize: 13, fontWeight: '700' },
});

export default ProfileScreen;
