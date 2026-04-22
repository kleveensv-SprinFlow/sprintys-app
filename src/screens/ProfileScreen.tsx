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
} from 'react-native';
import { BlurView } from 'expo-blur';
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
  const [isSaving, setIsSaving] = useState(false);

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
      setProfile(data);
      setEditRecords(data.personal_records || {});
    } catch (error) {
      console.error('Erreur profil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecords = async () => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ personal_records: editRecords })
        .eq('id', session.user.id);

      if (error) throw error;
      setProfile({ ...profile, personal_records: editRecords });
      setShowEditModal(false);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder les records.');
    } finally {
      setIsSaving(false);
    }
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

  const userName = profile?.id ? (profile?.email || 'Athlète') : 'Athlète';
  const records = profile?.personal_records || {};

  return (
    <View style={styles.container}>
      <View style={styles.lightBackground}>
        <View style={[styles.lightCircle, styles.cyanCircle]} />
        <View style={[styles.lightCircle, styles.purpleCircle]} />
      </View>
      <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{userName.split('@')[0].toUpperCase()}</Text>
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
          <Text style={styles.editBtnText}>MODIFIER MES RECORDS</Text>
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
            <Text style={styles.modalTitle}>MODIFIER LES PB</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSubTitle}>SPRINT</Text>
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
            
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveRecords} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>SAUVEGARDER</Text>}
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
  cyanCircle: { top: -50, right: -50, backgroundColor: '#00E5FF' },
  purpleCircle: { bottom: -50, left: -50, backgroundColor: '#BF5AF2' },
  scrollContent: { padding: 24, paddingTop: 80 },
  header: { alignItems: 'center', marginBottom: 40 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#00E5FF', marginBottom: 16 },
  avatarText: { color: '#FFFFFF', fontSize: 32, fontWeight: '900' },
  userName: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', letterSpacing: 2, marginBottom: 20 },
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
