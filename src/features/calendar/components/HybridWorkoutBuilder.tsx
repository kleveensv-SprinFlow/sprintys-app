import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useCoachStore } from '../../../store/coach/coachStore';

interface HybridWorkoutBuilderProps {
  date: Date;
  onClose: () => void;
  onSave: () => void;
  defaultTitle?: string;
}

type TargetType = 'team' | 'subgroup' | 'athlete';
type MeasureType = 'chrono' | 'weight' | 'distance';

interface Measure {
  id: string;
  name: string;
  type: MeasureType;
}

export const HybridWorkoutBuilder: React.FC<HybridWorkoutBuilderProps> = ({ date, onClose, onSave, defaultTitle }) => {
  const { user } = useAuthStore();
  const { teams, subgroups, teamMembers } = useCoachStore();

  const [title, setTitle] = useState(defaultTitle || '');
  const [description, setDescription] = useState('');
  const [intensity, setIntensity] = useState<number>(3);
  
  const [targetType, setTargetType] = useState<TargetType>('team');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(teams.length > 0 ? teams[0].id : null);
  const [selectedSubgroupId, setSelectedSubgroupId] = useState<string | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);

  const [measures, setMeasures] = useState<Measure[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !user?.id) {
      Alert.alert('Erreur', 'Veuillez au moins renseigner le titre de la séance.');
      return;
    }
    if (!selectedTeamId) {
      Alert.alert('Erreur', 'Aucune équipe sélectionnée.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('workouts').insert([{
        coach_id: user.id,
        team_id: targetType === 'team' ? selectedTeamId : null,
        subgroup_id: targetType === 'subgroup' ? selectedSubgroupId : null,
        athlete_id: targetType === 'athlete' ? selectedAthleteId : null,
        date_prevue: date.toISOString(),
        type_seance: title.trim(),
        description: description.trim(),
        intensity,
        measures,
        status: 'planned'
      }]);

      if (error) throw error;
      onSave();
    } catch (err: any) {
      Alert.alert('Erreur', 'Impossible de sauvegarder la séance : ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const addMeasure = (type: MeasureType) => {
    setMeasures([...measures, {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      type
    }]);
  };

  const updateMeasure = (id: string, name: string) => {
    setMeasures(measures.map(m => m.id === id ? { ...m, name } : m));
  };

  const removeMeasure = (id: string) => {
    setMeasures(measures.filter(m => m.id !== id));
  };

  const renderTargetLabel = () => {
    if (targetType === 'team') {
      const t = teams.find(t => t.id === selectedTeamId);
      return t ? `Équipe : ${t.name}` : 'Choisir une cible';
    } else if (targetType === 'subgroup') {
      const sg = subgroups.find(s => s.id === selectedSubgroupId);
      return sg ? `Sous-groupe : ${sg.name}` : 'Choisir une cible';
    } else {
      const athlete = teamMembers.find(m => m.user_id === selectedAthleteId);
      return athlete ? `Athlète : ${athlete.profile?.full_name}` : 'Choisir une cible';
    }
  };

  const currentTeamSubgroups = subgroups.filter(sg => sg.team_id === selectedTeamId);
  const currentTeamAthletes = teamMembers.filter(m => m.team_id === selectedTeamId);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.iconButton}>
          <Feather name="x" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouvelle Séance</Text>
        <TouchableOpacity 
          onPress={handleSave} 
          disabled={isSaving}
          style={[styles.saveButton, { backgroundColor: theme.colors.accent, opacity: isSaving ? 0.7 : 1 }]}
        >
          {isSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveButtonText}>Valider</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* TITRE ET CIBLE */}
        <View style={styles.section}>
          <TextInput
            style={[styles.titleInput, { color: theme.colors.text }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Titre (ex: Vitesse Max)"
            placeholderTextColor={theme.colors.textMuted}
          />
          <TouchableOpacity style={styles.targetButton} onPress={() => setShowTargetModal(true)}>
            <Feather name="users" size={16} color={theme.colors.accent} />
            <Text style={styles.targetButtonText}>{renderTargetLabel()}</Text>
            <Feather name="chevron-down" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* INTENSITE */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Intensité prévue</Text>
          <View style={styles.intensityRow}>
            {[1, 2, 3, 4, 5].map(val => (
              <TouchableOpacity 
                key={val}
                style={[
                  styles.intensityDot,
                  intensity >= val ? { backgroundColor: getIntensityColor(val) } : { backgroundColor: theme.colors.surfaceLight }
                ]}
                onPress={() => setIntensity(val)}
              />
            ))}
          </View>
        </View>

        {/* DESCRIPTION (90%) */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Contenu de la séance</Text>
          <TextInput
            style={[styles.descInput, { backgroundColor: theme.colors.surfaceLight, color: theme.colors.text }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Écrivez le déroulement de la séance librement... (Échauffement, consignes, répétitions)"
            placeholderTextColor={theme.colors.textMuted}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* MESURES (10%) */}
        <View style={styles.section}>
          <View style={styles.measureHeaderRow}>
            <Text style={styles.sectionLabel}>Champs de Mesure (Optionnel)</Text>
          </View>
          <Text style={styles.measureHelper}>
            Ajoutez des champs pour que les athlètes saisissent leurs performances (chronos, poids) en fin de séance.
          </Text>

          {measures.map((measure, index) => (
            <View key={measure.id} style={styles.measureCard}>
              <View style={styles.measureIcon}>
                <Feather name={measure.type === 'chrono' ? 'clock' : measure.type === 'weight' ? 'box' : 'map-pin'} size={18} color={theme.colors.accent} />
              </View>
              <TextInput
                style={styles.measureInput}
                value={measure.name}
                onChangeText={(t) => updateMeasure(measure.id, t)}
                placeholder={measure.type === 'chrono' ? "Nom du test (ex: 60m)" : "Exercice (ex: Squat)"}
                placeholderTextColor={theme.colors.textMuted}
              />
              <TouchableOpacity onPress={() => removeMeasure(measure.id)}>
                <Feather name="trash-2" size={18} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.addMeasureRow}>
            <TouchableOpacity style={styles.addMeasureBtn} onPress={() => addMeasure('chrono')}>
              <Feather name="clock" size={14} color={theme.colors.text} />
              <Text style={styles.addMeasureText}>+ Chrono</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addMeasureBtn} onPress={() => addMeasure('weight')}>
              <Feather name="box" size={14} color={theme.colors.text} />
              <Text style={styles.addMeasureText}>+ Poids</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addMeasureBtn} onPress={() => addMeasure('distance')}>
              <Feather name="map-pin" size={14} color={theme.colors.text} />
              <Text style={styles.addMeasureText}>+ Distance</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* MODAL CIBLAGE */}
      <Modal visible={showTargetModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cibler la séance</Text>
            
            <Text style={styles.modalSubtitle}>Équipe entière</Text>
            {teams.map(t => (
              <TouchableOpacity key={t.id} style={styles.targetOption} onPress={() => {
                setSelectedTeamId(t.id);
                setTargetType('team');
                setShowTargetModal(false);
              }}>
                <Text style={styles.targetOptionText}>{t.name}</Text>
              </TouchableOpacity>
            ))}

            {currentTeamSubgroups.length > 0 && <Text style={styles.modalSubtitle}>Sous-groupes</Text>}
            {currentTeamSubgroups.map(sg => (
              <TouchableOpacity key={sg.id} style={styles.targetOption} onPress={() => {
                setSelectedSubgroupId(sg.id);
                setTargetType('subgroup');
                setShowTargetModal(false);
              }}>
                <Text style={styles.targetOptionText}>{sg.name}</Text>
              </TouchableOpacity>
            ))}

            {currentTeamAthletes.length > 0 && <Text style={styles.modalSubtitle}>Individuel</Text>}
            <ScrollView style={{ maxHeight: 200 }}>
              {currentTeamAthletes.map(a => (
                <TouchableOpacity key={a.user_id} style={styles.targetOption} onPress={() => {
                  setSelectedAthleteId(a.user_id);
                  setTargetType('athlete');
                  setShowTargetModal(false);
                }}>
                  <Text style={styles.targetOptionText}>{a.profile?.full_name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowTargetModal(false)}>
              <Text style={styles.modalCancelText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const getIntensityColor = (val: number) => {
  if (val <= 2) return theme.colors.success;
  if (val === 3) return theme.colors.warning;
  return theme.colors.error;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  iconButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surfaceLight },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  saveButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  saveButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  scrollContent: { padding: 24 },
  section: { marginBottom: 28 },
  sectionLabel: { fontSize: 14, fontWeight: 'bold', color: theme.colors.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  titleInput: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, paddingVertical: 8 },
  targetButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.accent + '15',
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, alignSelf: 'flex-start', gap: 8
  },
  targetButtonText: { color: theme.colors.accent, fontWeight: 'bold', fontSize: 14 },
  intensityRow: { flexDirection: 'row', gap: 12 },
  intensityDot: { width: 36, height: 36, borderRadius: 18 },
  descInput: { height: 180, borderRadius: 16, padding: 16, fontSize: 16, lineHeight: 24 },
  measureHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  measureHelper: { fontSize: 13, color: theme.colors.textMuted, marginBottom: 16, lineHeight: 18 },
  measureCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border, padding: 12, borderRadius: 12, marginBottom: 12, gap: 12
  },
  measureIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: theme.colors.accent + '20', justifyContent: 'center', alignItems: 'center' },
  measureInput: { flex: 1, fontSize: 16, color: theme.colors.text },
  addMeasureRow: { flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap' },
  addMeasureBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border
  },
  addMeasureText: { color: theme.colors.text, fontSize: 13, fontWeight: '600' },
  
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text, marginBottom: 20 },
  modalSubtitle: { fontSize: 14, fontWeight: 'bold', color: theme.colors.textMuted, marginTop: 12, marginBottom: 8, textTransform: 'uppercase' },
  targetOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  targetOptionText: { fontSize: 16, color: theme.colors.text },
  modalCancel: { marginTop: 20, paddingVertical: 16, alignItems: 'center', backgroundColor: theme.colors.surfaceLight, borderRadius: 12 },
  modalCancelText: { color: theme.colors.text, fontWeight: 'bold' }
});
