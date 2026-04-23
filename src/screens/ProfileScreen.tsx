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
import { RecordsManagerModal } from '../features/body/components/RecordsManagerModal';
import { CompetitionBagModal } from '../features/body/components/CompetitionBagModal';
import { bodyService } from '../services/bodyService';

const { width } = Dimensions.get('window');

const SPRINT_DISTANCES = ['60m', '100m', '200m'];
const MUSCU_EXERCISES = ['Power Clean', 'Squat', 'Bench Press'];
const calculateAge = (dobString: string) => {
  if (!dobString) return 0;
  const birthDate = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

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
  const [showRecordsModal, setShowRecordsModal] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddInitialData, setQuickAddInitialData] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetailData, setSelectedDetailData] = useState<any>(null);
  const [showBagModal, setShowBagModal] = useState(false);
  
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
      const age = profile?.dob ? calculateAge(profile.dob) : 25;

      const bmr = (10 * currentWeight) + (6.25 * (h || 175)) - (5 * age) + 5;
      const multipliers: Record<string, number> = { sedentary: 1.2, active: 1.55, very_active: 1.725 };
      const adjustments: Record<string, number> = { loss: -400, maintain: 0, gain: 300 };

      const tdee = bmr * (multipliers[editActivity] || 1.2);
      const targetCalories = Math.round(tdee + (adjustments[editGoal] || 0));
      const p = Math.round(currentWeight * 2.2);
      const f = Math.round(currentWeight * 1.0);
      const c = Math.round((targetCalories - (p * 4) - (f * 9)) / 4);

      // 3. Mise à jour via le Store
      const formattedDob = editDob.includes('/') ? editDob.split('/').reverse().join('-') : editDob;

      const updates: any = {
        personal_records: editRecords,
        dob: formattedDob,
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
        // Si d'autres colonnes manquent (ex: macros), on tente le strict minimum
        if (storeError.code === '42703') {
          const safeUpdates = {
            personal_records: editRecords,
            dob: formattedDob,
            height: h > 0 ? h : null,
          };
          await useBodyStore.getState().updateProfile(session.user.id, safeUpdates);
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

  const handleSaveRecords = async (type: string, discipline: string, entry: any) => {
    try {
      const currentRecords = JSON.parse(JSON.stringify(profile.personal_records || { official: {}, training: { athle: {}, muscu: {} } }));
      
      const parts = type.split('_');
      const category = parts[0]; 
      const subCategory = parts[1]; 

      if (category === 'official') {
        if (!currentRecords.official) currentRecords.official = {};
        if (!currentRecords.official[discipline]) currentRecords.official[discipline] = [];
        currentRecords.official[discipline].push(entry);
      } else if (category === 'training') {
        if (!currentRecords.training) currentRecords.training = { athle: {}, muscu: {} };
        if (!currentRecords.training[subCategory]) currentRecords.training[subCategory] = {};
        if (!currentRecords.training[subCategory][discipline]) currentRecords.training[subCategory][discipline] = [];
        currentRecords.training[subCategory][discipline].push(entry);
      }

      const { error } = await supabase
        .from('profiles')
        .update({ personal_records: currentRecords })
        .eq('id', profile.id);

      if (error) throw error;
      setProfile({ ...profile, personal_records: currentRecords });
      
      Alert.alert('INCROYABLE ! 🚀', 'Performance de haut niveau enregistrée. Continue comme ça, champion !');
    } catch (error: any) {
      console.error('Error saving record:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer le record');
    }
  };

  const handleDeleteRecordEntry = async (type: string, discipline: string, index: number) => {
    try {
      const currentRecords = JSON.parse(JSON.stringify(profile.personal_records));
      const parts = type.split('_');
      const category = parts[0];
      const subCategory = parts[1];

      if (category === 'official') {
        currentRecords.official[discipline].splice(index, 1);
      } else {
        currentRecords.training[subCategory][discipline].splice(index, 1);
      }

      const { error } = await supabase
        .from('profiles')
        .update({ personal_records: currentRecords })
        .eq('id', profile.id);

      if (error) throw error;
      setProfile({ ...profile, personal_records: currentRecords });
      
      if (selectedDetailData) {
        setSelectedDetailData({
          ...selectedDetailData,
          history: category === 'official' 
            ? currentRecords.official[discipline] 
            : currentRecords.training[subCategory][discipline]
        });
      }
    } catch (error) {
      console.error('Error deleting record entry:', error);
    }
  };

  const handleUpdateBag = async (items: any[]) => {
    if (!profile?.id) {
      console.error('No profile ID found for update');
      return;
    }
    
    try {
      const updatedProfile = await bodyService.updateProfile(profile.id, { 
        competition_bag: items 
      });

      setProfile(updatedProfile);
      setStoreProfile(updatedProfile);
    } catch (error) {
      console.error('Error updating bag:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le sac');
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
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AthleteIdentityCard onEdit={() => setShowEditModal(true)} />

        <TouchableOpacity 
          style={styles.recordsTriggerCard} 
          onPress={() => setShowRecordsModal(true)}
        >
          <LinearGradient
            colors={['rgba(0, 229, 255, 0.1)', 'rgba(191, 90, 242, 0.05)']}
            style={styles.recordsCardContent}
          >
            <View style={styles.recordsIconBg}>
              <Ionicons name="trophy" size={24} color="#00E5FF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.recordsCardTitle}>MES RECORDS</Text>
              <Text style={styles.recordsCardSub}>Officiels & Entraînement</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.3)" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.recordsTriggerCard} 
          onPress={() => setShowBagModal(true)}
        >
          <LinearGradient
            colors={['rgba(191, 90, 242, 0.1)', 'rgba(0, 229, 255, 0.05)']}
            style={styles.recordsCardContent}
          >
            <View style={[styles.recordsIconBg, { backgroundColor: 'rgba(191, 90, 242, 0.1)' }]}>
              <Ionicons name="briefcase" size={24} color="#BF5AF2" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.recordsCardTitle}>MES ACCESSOIRES</Text>
              <Text style={styles.recordsCardSub}>
                {profile?.competition_bag?.length || 0} Objets enregistrés
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.3)" />
          </LinearGradient>
        </TouchableOpacity>


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
                      {editDob} ({calculateAge(profile.dob)} ANS)
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

      <RecordsManagerModal 
        visible={showRecordsModal} 
        onClose={() => setShowRecordsModal(false)}
        records={profile?.personal_records}
        onSave={handleSaveRecords}
        onQuickAdd={(data: any) => {
          if (data) {
            // Ouvrir le détail au lieu de l'édition
            setSelectedDetailData(data);
            setShowDetailModal(true);
          } else {
            setQuickAddInitialData(null);
            setShowQuickAddModal(true);
          }
        }}
      />

      {/* Quick Add Record Modal */}
      <Modal visible={showQuickAddModal} animationType="fade" transparent>
        <QuickAddRecordModal 
          onClose={() => {
            setShowQuickAddModal(false);
            setQuickAddInitialData(null);
          }}
          onSave={handleSaveRecords}
          currentRecords={profile?.personal_records}
          initialData={quickAddInitialData}
        />
      </Modal>

      {/* Detail & Progress Modal */}
      <RecordDetailModal 
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        data={selectedDetailData}
        onDelete={handleDeleteRecordEntry}
      />

      <CompetitionBagModal 
        visible={showBagModal} 
        onClose={() => setShowBagModal(false)}
        bagItems={profile?.competition_bag || []}
        onUpdateBag={handleUpdateBag}
      />
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
  cancelBtnText: { color: '#FF3B30', fontSize: 14, fontWeight: '700' },
  recordsTriggerCard: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  recordsCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  recordsIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordsCardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  recordsCardSub: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  quickAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  detailTitle: { color: '#00E5FF', fontSize: 24, fontWeight: '900', letterSpacing: 2 },
  detailSectionTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 16 },
  emptyGraph: { height: 150, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  emptyGraphText: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '900', marginTop: 12 },
  emptyGraphSub: { color: 'rgba(255,255,255,0.1)', fontSize: 8, fontWeight: '700', marginTop: 4 },
  graphContainer: { height: 180, alignItems: 'center' },
  pointInfo: { marginTop: 16, alignItems: 'center' },
  pointValue: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  pointDate: { color: '#00E5FF', fontSize: 12, fontWeight: '700' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16, marginBottom: 8 },
  historyValue: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  historyDate: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700' },
  deleteEntryBtn: { padding: 8 },
});

// Modal Interne pour l'ajout rapide
const QuickAddRecordModal = ({ onClose, onSave, currentRecords, initialData }: any) => {
  const [type, setType] = useState<'official' | 'training_athle' | 'training_muscu'>(initialData?.type || 'official');
  const [discipline, setDiscipline] = useState(initialData?.discipline || '');
  const [value, setValue] = useState(initialData?.value || '');
  const [wind, setWind] = useState(initialData?.wind || '');
  
  const today = new Date();
  const defaultDateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
  const [date, setDate] = useState(defaultDateStr);

  const disciplines = type === 'training_muscu' 
    ? ['Squat', 'Power Clean', 'Bench Press', 'Deadlift', 'Hip Thrust']
    : ['60m', '100m', '200m', '400m', 'Longueur', 'Triple'];

  const handleSave = () => {
    if (!discipline || !value || !date) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }

    const updated = { ...currentRecords };
    
    // Migration helper & structure update
    const ensureArray = (obj: any, key: string) => {
      if (!obj[key]) obj[key] = [];
      // Si c'est l'ancien format (objet simple au lieu de tableau d'historique)
      if (!Array.isArray(obj[key])) {
        const old = obj[key];
        obj[key] = [typeof old === 'string' ? { value: old, date: '2024-01-01' } : { ...old, date: '2024-01-01' }];
      }
    };

    const formattedDate = date.split('/').reverse().join('-'); // JJ/MM/AAAA -> YYYY-MM-DD
    const newEntry: any = { value, date: formattedDate };
    if (type === 'official' && wind) newEntry.wind = wind;

    if (type === 'official') {
      if (!updated.official) updated.official = {};
      ensureArray(updated.official, discipline);
      updated.official[discipline].push(newEntry);
      // Sort by date
      updated.official[discipline].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else {
      const cat = type === 'training_athle' ? 'athle' : 'muscu';
      if (!updated.training) updated.training = { athle: {}, muscu: {} };
      if (!updated.training[cat]) updated.training[cat] = {};
      ensureArray(updated.training[cat], discipline);
      updated.training[cat][discipline].push(newEntry);
      updated.training[cat][discipline].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    onSave(updated);
    onClose();
  };

  const handleDateInput = (text: string) => {
    let cleaned = text.replace(/\D/g, '');
    if (cleaned.length > 8) cleaned = cleaned.slice(0, 8);
    let formatted = cleaned;
    if (cleaned.length > 4) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`;
    else if (cleaned.length > 2) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    setDate(formatted);
  };

  return (
    <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
      <View style={[styles.modalContent, { height: 'auto', paddingBottom: 40 }]}>
        <Text style={styles.modalTitle}>AJOUTER UN RECORD</Text>
        
        <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.inputLabel}>TYPE DE RECORD</Text>
          <View style={styles.chipRow}>
            {[
              { id: 'official', label: 'COMPÉTITION' },
              { id: 'training_athle', label: 'ENTRAÎNEMENT' },
              { id: 'training_muscu', label: 'MUSCU' }
            ].map(t => (
              <TouchableOpacity 
                key={t.id} 
                style={[styles.miniChip, type === t.id && styles.miniChipActive]}
                onPress={() => { setType(t.id as any); setDiscipline(''); }}
              >
                <Text style={[styles.miniChipText, type === t.id && styles.miniChipTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.inputLabel, { marginTop: 20 }]}>DISCIPLINE</Text>
          <View style={styles.chipRow}>
            {disciplines.map(d => (
              <TouchableOpacity 
                key={d} 
                style={[styles.miniChip, discipline === d && styles.miniChipActive]}
                onPress={() => setDiscipline(d)}
              >
                <Text style={[styles.miniChipText, discipline === d && styles.miniChipTextActive]}>{d.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ marginTop: 20 }}>
            <Text style={styles.inputLabel}>DATE (JJ/MM/AAAA)</Text>
            <TextInput 
              style={styles.input} 
              value={date} 
              onChangeText={handleDateInput} 
              placeholder="JJ/MM/AAAA" 
              placeholderTextColor="#555" 
              keyboardType="numeric" 
            />
          </View>

          <View style={{ marginTop: 20 }}>
            <Text style={styles.inputLabel}>RÉSULTAT {type === 'training_muscu' ? '(KG)' : '(CHRONO)'}</Text>
            <TextInput 
              style={styles.input} 
              value={value} 
              onChangeText={setValue} 
              placeholder={type === 'training_muscu' ? '0' : '00.00'} 
              placeholderTextColor="#555" 
              keyboardType="numeric" 
            />
          </View>

          {type === 'official' && (
            <View style={{ marginTop: 20 }}>
              <Text style={styles.inputLabel}>VENT (ex: +1.2 ou -0.5)</Text>
              <TextInput 
                style={styles.input} 
                value={wind} 
                onChangeText={setWind} 
                placeholder="+0.0" 
                placeholderTextColor="#555" 
              />
            </View>
          )}
        </ScrollView>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>VALIDER LE RECORD</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelBtnText}>ANNULER</Text>
        </TouchableOpacity>
      </View>
    </BlurView>
  );
};

// --- NOUVELLE MODAL DE DÉTAIL & GRAPHIQUE ---
import { Svg, Path, Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

const RecordDetailModal = ({ visible, onClose, data, onDelete }: any) => {
  const [selectedPoint, setSelectedPoint] = useState<any>(null);

  if (!data) return null;

  const history = Array.isArray(data.history) ? data.history : [];
  const isMuscu = data.type === 'training_muscu';

  const renderGraph = () => {
    if (history.length < 2) {
      return (
        <View style={styles.emptyGraph}>
          <Ionicons name="stats-chart" size={48} color="rgba(255,255,255,0.05)" />
          <Text style={styles.emptyGraphText}>HISTORIQUE INSUFFISANT POUR LE GRAPHIQUE</Text>
          <Text style={styles.emptyGraphSub}>Ajoute un autre record pour voir ta progression</Text>
        </View>
      );
    }

    const values = history.map(h => parseFloat(h.value));
    const min = Math.min(...values) * 0.95;
    const max = Math.max(...values) * 1.05;
    const range = max - min;
    
    const chartW = width - 80;
    const chartH = 150;
    
    const points = history.map((h, i) => {
      const x = (i / (history.length - 1)) * chartW;
      // Pour le chrono, plus bas c'est mieux, mais on garde l'affichage standard
      const y = chartH - ((parseFloat(h.value) - min) / range) * chartH;
      return { x, y, ...h };
    });

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }

    return (
      <View style={styles.graphContainer}>
        <Svg width={chartW} height={chartH}>
          <Defs>
            <SvgGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#00E5FF" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
            </SvgGradient>
          </Defs>
          <Path d={d} stroke="#00E5FF" strokeWidth="3" fill="none" />
          <Path d={`${d} L ${chartW} ${chartH} L 0 ${chartH} Z`} fill="url(#grad)" />
          {points.map((p, i) => (
            <Circle 
              key={i} 
              cx={p.x} 
              cy={p.y} 
              r="6" 
              fill="#00E5FF" 
              onPress={() => setSelectedPoint(p)}
            />
          ))}
        </Svg>
        
        {selectedPoint && (
          <View style={styles.pointInfo}>
            <Text style={styles.pointValue}>{selectedPoint.value} {isMuscu ? 'KG' : 'SEC'}</Text>
            <Text style={styles.pointDate}>{selectedPoint.date.split('-').reverse().join('/')}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
        <View style={[styles.modalContent, { height: 'auto', paddingBottom: 40 }]}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>{data.discipline.toUpperCase()}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeDetail}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.detailSectionTitle}>PROGRESSION</Text>
          {renderGraph()}

          <Text style={[styles.detailSectionTitle, { marginTop: 32 }]}>HISTORIQUE DES ENTRÉES</Text>
          <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
            {history.slice().reverse().map((h, i) => (
              <View key={i} style={styles.historyRow}>
                <View>
                  <Text style={styles.historyValue}>{h.value} {isMuscu ? 'KG' : 'SEC'}</Text>
                  <Text style={styles.historyDate}>{h.date.split('-').reverse().join('/')}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.deleteEntryBtn}
                  onPress={() => {
                    Alert.alert('Supprimer', 'Voulez-vous supprimer ce record ?', [
                      { text: 'Annuler', style: 'cancel' },
                      { text: 'Supprimer', style: 'destructive', onPress: () => onDelete(data.type, data.discipline, history.length - 1 - i) }
                    ]);
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      </BlurView>
    </Modal>
  );
};

export default ProfileScreen;
