import React, { useState, useEffect } from 'react';
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
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../services/supabaseClient';
import { EXERCISE_LIBRARY } from '../data/exercises';

const WORKOUT_TYPES = ['Vitesse', 'Lactique', 'Aérobie', 'Départs/Blocs', 'Musculation/Haltéro'];
const CATEGORIES = ['Haltérophilie', 'Jambes', 'Haut du Corps', 'Tronc / Gainage'];

const AddWorkoutScreen = () => {
  const navigation = useNavigation<any>();
  const [workoutType, setWorkoutType] = useState('Vitesse');
  const [rpe, setRpe] = useState(7);
  const [notes, setNotes] = useState('');
  const [workoutDate, setWorkoutDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // États pour la Piste
  const [blocks, setBlocks] = useState([
    { sets: '1', distance: '100', unit: 'm', performance: '', recovery: '' }
  ]);

  // États pour la Musculation
  const [muscuExercises, setMuscuExercises] = useState([
    { name: '', sets: '', reps: '', weight: '' }
  ]);
  const [showExercisePicker, setShowExercisePicker] = useState<number | null>(null);
  const [userExercises, setUserExercises] = useState<any[]>([]);

  // État pour la création d'exercice custom
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState(CATEGORIES[0]);

  useEffect(() => {
    fetchUserExercises();
  }, []);

  const fetchUserExercises = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('user_exercises')
        .select('*')
        .eq('user_id', session.user.id);

      if (error) throw error;
      setUserExercises(data || []);
    } catch (error) {
      console.error('Error fetching user exercises:', error);
    }
  };

  const saveCustomExercise = async () => {
    if (!customName) {
      Alert.alert('Erreur', 'Veuillez saisir un nom pour l\'exercice.');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Non connecté');

      const { data, error } = await supabase
        .from('user_exercises')
        .insert({
          user_id: session.user.id,
          name: customName,
          category: customCategory
        })
        .select()
        .single();

      if (error) throw error;

      setUserExercises([...userExercises, data]);
      setCustomName('');
      setIsCreatingCustom(false);
      Alert.alert('Succès', 'Exercice ajouté à votre bibliothèque !');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de sauvegarder l\'exercice');
    }
  };

  const getFullLibrary = () => {
    return EXERCISE_LIBRARY.map(cat => {
      const customs = userExercises.filter(ue => ue.category === cat.category).map(ue => ue.name);
      return {
        ...cat,
        exercises: [...cat.exercises, ...customs]
      };
    });
  };

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

  const addMuscuExercise = () => {
    setMuscuExercises([...muscuExercises, { name: '', sets: '', reps: '', weight: '' }]);
  };

  const updateMuscuExercise = (index: number, key: string, value: string) => {
    const newExercises = [...muscuExercises];
    (newExercises[index] as any)[key] = value;
    setMuscuExercises(newExercises);
  };

  const removeMuscuExercise = (index: number) => {
    if (muscuExercises.length > 1) {
      setMuscuExercises(muscuExercises.filter((_, i) => i !== index));
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
      if (workoutType === 'Musculation/Haltéro') {
        const muscuText = muscuExercises
          .filter(e => e.name)
          .map(e => `${e.name} : ${e.sets}x${e.reps} @${e.weight}kg`)
          .join(' | ');
        finalNotes = `MUSCULATION : ${muscuText}\n\nNOTES : ${notes}`;
      } else {
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
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible d\'enregistrer la séance');
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
            <TouchableOpacity style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateSelectorText}>📅 Séance du {workoutDate.toLocaleDateString('fr-FR')}</Text>
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

            {/* Constructeurs */}
            {workoutType !== 'Musculation/Haltéro' ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Cœur de séance (Blocs)</Text>
                {blocks.map((block, index) => (
                  <View key={index} style={styles.blockContainer}>
                    <View style={styles.blockInputGrid}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Séries</Text>
                        <TextInput style={[styles.input, styles.compactInput]} value={block.sets} onChangeText={(val) => updateBlock(index, 'sets', val)} keyboardType="numeric" placeholder="1" />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1.5, marginLeft: 12 }]}>
                        <Text style={styles.inputLabel}>Distance / Temps</Text>
                        <View style={styles.unitInputRow}>
                          <TextInput style={[styles.input, styles.compactInput, { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]} value={block.distance} onChangeText={(val) => updateBlock(index, 'distance', val)} keyboardType="numeric" placeholder="100" />
                          <TouchableOpacity style={styles.unitInlineBtn} onPress={() => updateBlock(index, 'unit', block.unit === 'm' ? 'sec' : 'm')}>
                            <Text style={styles.unitInlineText}>{block.unit}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                    <View style={styles.blockInputGrid}>
                      <View style={styles.inputGroup}><Text style={styles.inputLabel}>⏱️ Chrono</Text><TextInput style={[styles.input, styles.compactInput]} value={block.performance} onChangeText={(val) => updateBlock(index, 'performance', val)} keyboardType="numeric" placeholder='12"50' /></View>
                      <View style={[styles.inputGroup, { marginLeft: 12 }]}><Text style={styles.inputLabel}>⏳ Repos (min)</Text><TextInput style={[styles.input, styles.compactInput]} value={block.recovery} onChangeText={(val) => updateBlock(index, 'recovery', val)} keyboardType="numeric" placeholder="5" /></View>
                    </View>
                    {blocks.length > 1 && <TouchableOpacity onPress={() => removeBlock(index)} style={styles.removeBlockBtn}><Text style={styles.removeBlockText}>Supprimer</Text></TouchableOpacity>}
                  </View>
                ))}
                <TouchableOpacity style={styles.addBlockBtn} onPress={addBlock}><Text style={styles.addBlockText}>+ Ajouter un bloc</Text></TouchableOpacity>
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Cœur de séance (Musculation)</Text>
                {muscuExercises.map((ex, index) => (
                  <View key={index} style={styles.blockContainer}>
                    <TouchableOpacity style={styles.exerciseSelector} onPress={() => setShowExercisePicker(index)}>
                      <Text style={ex.name ? styles.exerciseName : styles.exercisePlaceholder}>{ex.name || 'Choisir un exercice...'}</Text>
                    </TouchableOpacity>
                    <View style={styles.blockInputGrid}>
                      <View style={styles.inputGroup}><Text style={styles.inputLabel}>Séries</Text><TextInput style={[styles.input, styles.compactInput]} value={ex.sets} onChangeText={(val) => updateMuscuExercise(index, 'sets', val)} keyboardType="numeric" placeholder="3" /></View>
                      <View style={[styles.inputGroup, { marginHorizontal: 8 }]}><Text style={styles.inputLabel}>Reps</Text><TextInput style={[styles.input, styles.compactInput]} value={ex.reps} onChangeText={(val) => updateMuscuExercise(index, 'reps', val)} keyboardType="numeric" placeholder="10" /></View>
                      <View style={styles.inputGroup}><Text style={styles.inputLabel}>Poids (kg)</Text><TextInput style={[styles.input, styles.compactInput]} value={ex.weight} onChangeText={(val) => updateMuscuExercise(index, 'weight', val)} keyboardType="numeric" placeholder="60" /></View>
                    </View>
                    {muscuExercises.length > 1 && <TouchableOpacity onPress={() => removeMuscuExercise(index)} style={styles.removeBlockBtn}><Text style={styles.removeBlockText}>Supprimer</Text></TouchableOpacity>}
                  </View>
                ))}
                <TouchableOpacity style={styles.addBlockBtn} onPress={addMuscuExercise}><Text style={styles.addBlockText}>+ Ajouter un exercice</Text></TouchableOpacity>
              </View>
            )}

            {/* Intensité */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Intensité de l'effort (1 à 10)</Text>
              <View style={styles.rpeGrid}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                  <TouchableOpacity key={score} style={[styles.rpePill, rpe === score && styles.rpePillSelected]} onPress={() => setRpe(score)}>
                    <Text style={[styles.rpeText, rpe === score && styles.rpeTextSelected]}>{score}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Échauffement & Notes</Text>
              <TextInput style={styles.textArea} placeholder="Détails supplémentaires..." placeholderTextColor="#8E8E93" multiline numberOfLines={4} value={notes} onChangeText={setNotes} />
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

      {/* Modal Sélecteur d'Exercices */}
      <Modal visible={showExercisePicker !== null} animationType="slide" transparent>
        <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bibliothèque</Text>
              <TouchableOpacity style={styles.createBtn} onPress={() => setIsCreatingCustom(true)}>
                <Text style={styles.createBtnText}>✨ Créer</Text>
              </TouchableOpacity>
            </View>

            {isCreatingCustom ? (
              <View style={styles.customForm}>
                <Text style={styles.formLabel}>Nom de l'exercice</Text>
                <TextInput style={styles.input} value={customName} onChangeText={setCustomName} placeholder="Ex: Gobelet Squat" placeholderTextColor="#555" />
                
                <Text style={styles.formLabel}>Catégorie</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity 
                      key={cat} 
                      style={[styles.categoryPill, customCategory === cat && styles.categoryPillSelected]}
                      onPress={() => setCustomCategory(cat)}
                    >
                      <Text style={[styles.categoryText, customCategory === cat && styles.categoryTextSelected]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.saveCustomBtn} onPress={saveCustomExercise}>
                  <Text style={styles.saveCustomBtnText}>Sauvegarder</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelCustomBtn} onPress={() => setIsCreatingCustom(false)}>
                  <Text style={styles.cancelCustomBtnText}>Retour à la liste</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {getFullLibrary().map((cat, i) => (
                  <View key={i} style={styles.modalSection}>
                    <Text style={styles.modalCategory}>{cat.category}</Text>
                    <View style={styles.modalExerciseGrid}>
                      {cat.exercises.map((ex, j) => (
                        <TouchableOpacity 
                          key={j} 
                          style={styles.modalExerciseBtn}
                          onPress={() => {
                            if (showExercisePicker !== null) updateMuscuExercise(showExercisePicker, 'name', ex);
                            setShowExercisePicker(null);
                          }}
                        >
                          <Text style={styles.modalExerciseText}>{ex}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => { setShowExercisePicker(null); setIsCreatingCustom(false); }}>
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>
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
  dateSelector: { marginTop: 8, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', alignSelf: 'flex-start', backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  dateSelectorText: { color: '#8E8E93', fontSize: 13, fontWeight: '600' },
  glassCard: { borderRadius: 28, padding: 24, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)', overflow: 'hidden' },
  section: { marginBottom: 28 },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 16 },
  tagScroll: { marginBottom: 12 },
  tagPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', marginRight: 8, backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  tagPillSelected: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  tagText: { color: '#8E8E93', fontSize: 14, fontWeight: '500' },
  tagTextSelected: { color: '#000000' },
  input: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 12, padding: 12, color: '#FFFFFF', fontSize: 16, fontWeight: '600', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  compactInput: { padding: 10 },
  blockContainer: { backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  blockInputGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  inputGroup: { flex: 1 },
  inputLabel: { color: '#8E8E93', fontSize: 10, marginBottom: 4, fontWeight: '600', textTransform: 'uppercase' },
  unitInputRow: { flexDirection: 'row', alignItems: 'center' },
  unitInlineBtn: { backgroundColor: 'rgba(255, 255, 255, 0.1)', paddingVertical: 11, paddingHorizontal: 10, borderTopRightRadius: 12, borderBottomRightRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', borderLeftWidth: 0, minWidth: 40, alignItems: 'center' },
  unitInlineText: { color: '#8E8E93', fontWeight: '700', fontSize: 12 },
  removeBlockBtn: { marginTop: 8, alignItems: 'center' },
  removeBlockText: { color: '#FF3B30', fontSize: 12 },
  addBlockBtn: { marginTop: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#32ADE6', borderStyle: 'dashed', alignItems: 'center' },
  addBlockText: { color: '#32ADE6', fontWeight: '600' },
  exerciseSelector: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  exerciseName: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  exercisePlaceholder: { color: '#555', fontSize: 16 },
  rpeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  rpePill: { width: '18%', height: 40, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 8, backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  rpePillSelected: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  rpeText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  rpeTextSelected: { color: '#000000' },
  textArea: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 16, padding: 16, color: '#FFFFFF', fontSize: 16, height: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  saveButton: { backgroundColor: '#FFFFFF', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#000000', fontSize: 17, fontWeight: '700' },
  cancelButton: { alignItems: 'center', marginTop: 16 },
  cancelButtonText: { color: '#8E8E93', fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1C1C1E', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, height: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  createBtn: { backgroundColor: 'rgba(50, 173, 230, 0.1)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#32ADE6' },
  createBtnText: { color: '#32ADE6', fontWeight: '700', fontSize: 13 },
  modalSection: { marginBottom: 24 },
  modalCategory: { color: '#32ADE6', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12 },
  modalExerciseGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  modalExerciseBtn: { backgroundColor: 'rgba(255, 255, 255, 0.05)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  modalExerciseText: { color: '#FFFFFF', fontSize: 14 },
  modalCloseBtn: { marginTop: 12, paddingVertical: 16, alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 16 },
  modalCloseText: { color: '#FFFFFF', fontWeight: '700' },
  customForm: { paddingBottom: 24 },
  formLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 12, marginTop: 16 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  categoryPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', marginRight: 8, marginBottom: 8 },
  categoryPillSelected: { backgroundColor: '#32ADE6', borderColor: '#32ADE6' },
  categoryText: { color: '#8E8E93', fontSize: 12, fontWeight: '600' },
  categoryTextSelected: { color: '#FFFFFF' },
  saveCustomBtn: { backgroundColor: '#32ADE6', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  saveCustomBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  cancelCustomBtn: { paddingVertical: 14, alignItems: 'center' },
  cancelCustomBtnText: { color: '#8E8E93', fontSize: 14 },
});

export default AddWorkoutScreen;
