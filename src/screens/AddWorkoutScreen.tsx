import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../services/supabaseClient';

const WORKOUT_TYPES = ['Sprint', 'Musculation', 'Aérobie', 'PPG', 'Récupération'];

const AddWorkoutScreen = () => {
  const navigation = useNavigation<any>();
  const [workoutType, setWorkoutType] = useState('Sprint');
  const [duration, setDuration] = useState('90');
  const [rpe, setRpe] = useState(7);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!duration || isNaN(parseInt(duration))) {
      Alert.alert('Erreur', 'Veuillez saisir une durée valide en minutes.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Utilisateur non identifié');

      const { error } = await supabase.from('workouts').insert({
        user_id: session.user.id,
        type: workoutType,
        duration_minutes: parseInt(duration),
        rpe: rpe,
        notes: notes,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      if (Platform.OS === 'web') alert('Séance enregistrée !');
      navigation.goBack();
    } catch (error: any) {
      if (Platform.OS === 'web') alert(error.message || 'Erreur de sauvegarde');
      else Alert.alert('Erreur', error.message || 'Impossible d\'enregistrer la séance');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.lightBackground}>
        <View style={[styles.lightCircle, styles.cyanCircle]} />
        <View style={[styles.lightCircle, styles.purpleCircle]} />
      </View>
      <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Nouvelle Séance</Text>
            <Text style={styles.subtitle}>Consigne tes efforts du jour</Text>
          </View>

          <BlurView intensity={40} tint="default" style={styles.glassCard}>
            {/* Type de séance */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Type de séance</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll}>
                {WORKOUT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.tagPill,
                      workoutType === type && styles.tagPillSelected
                    ]}
                    onPress={() => setWorkoutType(type)}
                  >
                    <Text style={[styles.tagText, workoutType === type && styles.tagTextSelected]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Durée */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Durée (minutes)</Text>
              <TextInput
                style={styles.input}
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
                placeholder="Ex: 90"
                placeholderTextColor="#8E8E93"
              />
            </View>

            {/* RPE */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Difficulté ressentie (RPE 1-10)</Text>
              <View style={styles.rpeGrid}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                  <TouchableOpacity
                    key={score}
                    style={[
                      styles.rpePill,
                      rpe === score && styles.rpePillSelected
                    ]}
                    onPress={() => setRpe(score)}
                  >
                    <Text style={[styles.rpeText, rpe === score && styles.rpeTextSelected]}>
                      {score}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Notes / Détails</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Contenu de la séance, sensations..."
                placeholderTextColor="#8E8E93"
                multiline
                numberOfLines={4}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.saveButtonText}>Enregistrer la séance</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </BlurView>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  lightBackground: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  lightCircle: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.4 },
  cyanCircle: { top: -50, right: -50, backgroundColor: '#32ADE6' },
  purpleCircle: { bottom: -50, left: -50, backgroundColor: '#BF5AF2' },
  keyboardView: { flex: 1 },
  scrollContent: { padding: 24, paddingTop: 60 },
  header: { marginBottom: 32 },
  title: { fontSize: 34, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1 },
  subtitle: { fontSize: 17, color: '#8E8E93', marginTop: 8 },
  glassCard: { borderRadius: 28, padding: 24, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)', overflow: 'hidden' },
  section: { marginBottom: 28 },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 16 },
  tagScroll: { marginBottom: 12 },
  tagPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', marginRight: 8, backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  tagPillSelected: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  tagText: { color: '#8E8E93', fontSize: 14, fontWeight: '500' },
  tagTextSelected: { color: '#000000' },
  input: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 12, padding: 16, color: '#FFFFFF', fontSize: 18, fontWeight: '600', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  rpeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  rpePill: { width: '18%', height: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 10, backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  rpePillSelected: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  rpeText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  rpeTextSelected: { color: '#000000' },
  textArea: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 16, padding: 16, color: '#FFFFFF', fontSize: 16, height: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  saveButton: { backgroundColor: '#FFFFFF', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#000000', fontSize: 17, fontWeight: '700' },
  cancelButton: { alignItems: 'center', marginTop: 20 },
  cancelButtonText: { color: '#8E8E93', fontSize: 15, fontWeight: '500' },
});

export default AddWorkoutScreen;
