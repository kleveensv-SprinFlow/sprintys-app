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
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../services/supabaseClient';

const WORKOUT_TYPES = ['Vitesse', 'Lactique', 'Aérobie', 'Départs/Blocs', 'Musculation/Haltéro'];

const AddWorkoutScreen = () => {
  const navigation = useNavigation<any>();
  const [workoutType, setWorkoutType] = useState('Vitesse');
  const [rpe, setRpe] = useState(7);
  const [notes, setNotes] = useState('');
  const [workoutDate, setWorkoutDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [blocks, setBlocks] = useState([
    { sets: '1', distance: '100', unit: 'm', performance: '', recovery: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addBlock = () => {
    setBlocks([...blocks, { sets: '1', distance: '100', unit: 'm', performance: '', recovery: '' }]);
  };

  const updateBlock = (index: number, key: string, value: string) => {
    const newBlocks = [...blocks];
    (newBlocks[index] as any)[key] = value;
    setBlocks(newBlocks);
  };

  const removeBlock = (index: number) => {
    if (blocks.length > 1) {
      setBlocks(blocks.filter((_, i) => i !== index));
    }
  };

  const formatPerformance = (val: string) => {
    if (!val) return '';
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) {
      return `${cleaned.slice(0, cleaned.length - 2)}"${cleaned.slice(-2)}`;
    }
    const cc = cleaned.slice(-2);
    const ss = cleaned.slice(-4, -2);
    const mm = cleaned.slice(0, -4);
    return `${mm}:${ss}.${cc}`;
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Utilisateur non identifié');

      let finalNotes = notes;
      if (workoutType !== 'Musculation/Haltéro') {
        const blocksText = blocks
          .map(b => {
            const perfPart = b.performance ? ` (⏱️ ${formatPerformance(b.performance)})` : '';
            const recPart = b.recovery ? ` [⏳ ${b.recovery}min]` : '';
            return `${b.sets}x ${b.distance}${b.unit}${perfPart}${recPart}`;
          })
          .join(' | ');
        finalNotes = `CŒUR DE SÉANCE : ${blocksText}\n\nÉCHAUFFEMENT & NOTES : ${notes}`;
      }

      const { error } = await supabase.from('workouts').insert({
        user_id: session.user.id,
        type: workoutType,
        duration_minutes: 0,
        rpe: rpe,
        notes: finalNotes,
        created_at: workoutDate.toISOString(),
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
            <View style={styles.titleRow}>
              <Text style={styles.title}>Nouvelle Séance</Text>
            </View>
            <TouchableOpacity 
              style={styles.dateSelector}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateSelectorText}>
                📅 Séance du {workoutDate.toLocaleDateString('fr-FR')}
              </Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={workoutDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setWorkoutDate(selectedDate);
              }}
            />
          )}

          <BlurView intensity={40} tint="default" style={styles.glassCard}>
            {/* Type de séance */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Type de séance</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll}>
                {WORKOUT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.tagPill, workoutType === type && styles.tagPillSelected]}
                    onPress={() => setWorkoutType(type)}
                  >
                    <Text style={[styles.tagText, workoutType === type && styles.tagTextSelected]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Cœur de séance (Blocs) */}
            {workoutType !== 'Musculation/Haltéro' && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Cœur de séance (Blocs)</Text>
                {blocks.map((block, index) => (
                  <View key={index} style={styles.blockContainer}>
                    {/* Ligne 1 : Séries x Distance */}
                    <View style={styles.blockInputGrid}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Séries</Text>
                        <TextInput
                          style={[styles.input, styles.compactInput]}
                          value={block.sets}
                          onChangeText={(val) => updateBlock(index, 'sets', val)}
                          keyboardType="numeric"
                          placeholder="1"
                          placeholderTextColor="#555"
                        />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1.5, marginLeft: 12 }]}>
                        <Text style={styles.inputLabel}>Distance / Temps</Text>
                        <View style={styles.unitInputRow}>
                          <TextInput
                            style={[styles.input, styles.compactInput, { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                            value={block.distance}
                            onChangeText={(val) => updateBlock(index, 'distance', val)}
                            keyboardType="numeric"
                            placeholder="100"
                            placeholderTextColor="#555"
                          />
                          <TouchableOpacity 
                            style={styles.unitInlineBtn}
                            onPress={() => updateBlock(index, 'unit', block.unit === 'm' ? 'sec' : 'm')}
                          >
                            <Text style={styles.unitInlineText}>{block.unit}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {/* Ligne 2 : Chrono / Repos */}
                    <View style={styles.blockInputGrid}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>⏱️ Chrono</Text>
                        <TextInput
                          style={[styles.input, styles.compactInput]}
                          value={block.performance}
                          onChangeText={(val) => updateBlock(index, 'performance', val)}
                          keyboardType="numeric"
                          placeholder='12"50'
                          placeholderTextColor="#555"
                        />
                      </View>
                      <View style={[styles.inputGroup, { marginLeft: 12 }]}>
                        <Text style={styles.inputLabel}>⏳ Repos (min)</Text>
                        <TextInput
                          style={[styles.input, styles.compactInput]}
                          value={block.recovery}
                          onChangeText={(val) => updateBlock(index, 'recovery', val)}
                          keyboardType="numeric"
                          placeholder="5"
                          placeholderTextColor="#555"
                        />
                      </View>
                    </View>

                    {parseInt(block.distance) > 800 && block.unit === 'm' && (
                      <Text style={styles.warningText}>⚠️ Discipline hors scope sprint/haies</Text>
                    )}

                    {blocks.length > 1 && (
                      <TouchableOpacity onPress={() => removeBlock(index)} style={styles.removeBlockBtn}>
                        <Text style={styles.removeBlockText}>Supprimer ce bloc</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity style={styles.addBlockBtn} onPress={addBlock}>
                  <Text style={styles.addBlockText}>+ Ajouter un bloc de travail</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Intensité */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Intensité de l'effort (1 à 10)</Text>
              <View style={styles.rpeGrid}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                  <TouchableOpacity
                    key={score}
                    style={[styles.rpePill, rpe === score && styles.rpePillSelected]}
                    onPress={() => setRpe(score)}
                  >
                    <Text style={[styles.rpeText, rpe === score && styles.rpeTextSelected]}>{score}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Échauffement & Notes supplémentaires</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Détails, sensations, départs chariot..."
                placeholderTextColor="#8E8E93"
                multiline
                numberOfLines={4}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#000000" /> : <Text style={styles.saveButtonText}>Enregistrer la séance</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()} disabled={isSubmitting}>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 34, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1 },
  dateSelector: { marginTop: 8, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', alignSelf: 'flex-start', backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  dateSelectorText: { color: '#8E8E93', fontSize: 13, fontWeight: '600' },
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
  blockContainer: { backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  blockInputGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  inputGroup: { flex: 1 },
  inputLabel: { color: '#8E8E93', fontSize: 11, marginBottom: 6, fontWeight: '600', textTransform: 'uppercase' },
  compactInput: { padding: 12, fontSize: 16 },
  unitInputRow: { flexDirection: 'row', alignItems: 'center' },
  unitInlineBtn: { backgroundColor: 'rgba(255, 255, 255, 0.1)', paddingVertical: 12, paddingHorizontal: 12, borderTopRightRadius: 12, borderBottomRightRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', borderLeftWidth: 0, minWidth: 45, alignItems: 'center', justifyContent: 'center' },
  unitInlineText: { color: '#8E8E93', fontWeight: '700', fontSize: 13 },
  warningText: { color: '#FF9F0A', fontSize: 12, fontWeight: '600', marginBottom: 10, textAlign: 'center' },
  removeBlockBtn: { marginTop: 4, paddingVertical: 4, alignItems: 'center' },
  removeBlockText: { color: '#FF3B30', fontSize: 12, fontWeight: '500' },
  addBlockBtn: { marginTop: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#32ADE6', borderStyle: 'dashed', alignItems: 'center' },
  addBlockText: { color: '#32ADE6', fontWeight: '600', fontSize: 15 },
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
