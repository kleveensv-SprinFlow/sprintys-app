import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../core/theme';
import { Feather } from '@expo/vector-icons';
import { workoutService } from '../services/workoutService';
import { useAuthStore } from '../store/authStore';
import { useCoachStore } from '../store/coach/coachStore';

export interface AIWorkoutProposal {
  target: string;
  target_name: string;
  target_type: 'athlete' | 'subgroup' | 'group';
  date_prevue: string;
  type_seance: string;
  nom_seance: string;
  exercises: { name: string; sets: number; reps: string; rest: string; notes?: string }[];
}

export function WorkoutProposalCard({ proposal, onValidate, onReject }: { proposal: AIWorkoutProposal, onValidate: () => void, onReject: () => void }) {
  const { user } = useAuthStore();
  const { teamMembers } = useCoachStore();
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleValidate = async () => {
    setIsSaving(true);
    try {
      if (proposal.target_type === 'athlete') {
         await workoutService.assignWorkoutToAthlete({
           coach_id: user!.id,
           athlete_id: proposal.target,
           type_seance: proposal.type_seance,
           nom_seance: proposal.nom_seance || proposal.type_seance,
           date_prevue: proposal.date_prevue,
           exercises: proposal.exercises.map(e => ({
             exercise_id: 'custom',
             name: e.name,
             sets: e.sets,
             reps: e.reps,
             rest_time: parseInt(e.rest) || 0,
             notes: e.notes || ''
           }))
         });
      } else if (proposal.target_type === 'group' || proposal.target_type === 'subgroup') {
         const athletes = proposal.target_type === 'subgroup' 
           ? teamMembers.filter(m => m.subgroups?.includes(proposal.target))
           : teamMembers;

         for (const athlete of athletes) {
           await workoutService.assignWorkoutToAthlete({
             coach_id: user!.id,
             athlete_id: athlete.user_id,
             type_seance: proposal.type_seance,
             nom_seance: proposal.nom_seance || proposal.type_seance,
             date_prevue: proposal.date_prevue,
             exercises: proposal.exercises.map(e => ({
               exercise_id: 'custom',
               name: e.name,
               sets: e.sets,
               reps: e.reps,
               rest_time: parseInt(e.rest) || 0,
               notes: e.notes || ''
             }))
           });
         }
      }
      setSaved(true);
      onValidate();
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la sauvegarde de la séance.');
    } finally {
      setIsSaving(false);
    }
  };

  if (saved) {
    return (
      <View style={[styles.card, { borderColor: theme.colors.success }]}>
        <Feather name="check-circle" size={32} color={theme.colors.success} style={{ alignSelf: 'center', marginBottom: 12 }} />
        <Text style={[styles.title, { textAlign: 'center', color: theme.colors.success }]}>Séance validée et ajoutée pour {proposal.target_name} !</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Feather name="calendar" size={20} color={theme.colors.accent} />
        <Text style={styles.title}>Proposition de Séance</Text>
      </View>
      
      <View style={styles.infoRow}>
        <Text style={styles.label}>Pour :</Text>
        <Text style={styles.value}>{proposal.target_name} ({proposal.target_type})</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.label}>Date :</Text>
        <Text style={styles.value}>{new Date(proposal.date_prevue).toLocaleDateString('fr-FR')}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.label}>Type :</Text>
        <Text style={styles.value}>{proposal.nom_seance} ({proposal.type_seance})</Text>
      </View>

      <View style={styles.divider} />
      <Text style={styles.subtitle}>Exercices ({proposal.exercises.length})</Text>
      {proposal.exercises.map((ex, idx) => (
        <View key={idx} style={styles.exerciseRow}>
          <Text style={styles.exerciseName}>{idx + 1}. {ex.name}</Text>
          <Text style={styles.exerciseDetails}>{ex.sets} séries x {ex.reps} (Repos: {ex.rest})</Text>
          {ex.notes ? <Text style={styles.exerciseNotes}>{ex.notes}</Text> : null}
        </View>
      ))}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnReject} onPress={onReject} disabled={isSaving}>
          <Feather name="x" size={18} color={theme.colors.error} />
          <Text style={styles.btnRejectText}>Modifier</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnValidate} onPress={handleValidate} disabled={isSaving}>
          {isSaving ? (
            <Text style={styles.btnValidateText}>Enregistrement...</Text>
          ) : (
            <>
              <Feather name="check" size={18} color="#FFF" />
              <Text style={styles.btnValidateText}>Valider</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.colors.accent, marginVertical: 8, width: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  title: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  infoRow: { flexDirection: 'row', marginBottom: 6 },
  label: { width: 60, color: theme.colors.textSecondary, fontSize: 13 },
  value: { flex: 1, color: theme.colors.text, fontSize: 13, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 12 },
  subtitle: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text, marginBottom: 8 },
  exerciseRow: { backgroundColor: theme.colors.background, padding: 10, borderRadius: 8, marginBottom: 8 },
  exerciseName: { color: theme.colors.text, fontWeight: 'bold', fontSize: 14 },
  exerciseDetails: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 },
  exerciseNotes: { color: theme.colors.warning, fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  btnReject: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, backgroundColor: theme.colors.error + '20', gap: 6 },
  btnRejectText: { color: theme.colors.error, fontWeight: 'bold' },
  btnValidate: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, backgroundColor: theme.colors.success, gap: 6 },
  btnValidateText: { color: '#FFF', fontWeight: 'bold' },
});
