import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useBodyStore } from '../../../store/bodyStore';

const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'SÉDENTAIRE', multiplier: 1.2 },
  { id: 'active', label: 'ACTIF', multiplier: 1.55 },
  { id: 'very_active', label: 'TRÈS ACTIF', multiplier: 1.725 },
];

const GOALS = [
  { id: 'loss', label: 'PERTE', adjustment: -400 },
  { id: 'maintain', label: 'MAINTIEN', adjustment: 0 },
  { id: 'gain', label: 'PRISE DE MASSE', adjustment: 300 },
];

export const NutritionSettingsCard = () => {
  const { profile, metrics, updateProfile, fetchMetrics } = useBodyStore();
  
  useEffect(() => {
    if (profile?.id) {
      fetchMetrics(profile.id);
    }
  }, [profile?.id]);
  
  const [dob, setDob] = useState(profile?.dob || '');
  const [height, setHeight] = useState(profile?.height?.toString() || '');
  const [selectedActivity, setSelectedActivity] = useState(profile?.activity_level || 'sedentary');
  const [selectedGoal, setSelectedGoal] = useState(profile?.nutrition_goal || 'maintain');
  
  const [results, setResults] = useState<{
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  } | null>(profile?.target_calories ? {
    calories: profile.target_calories,
    protein: profile.target_protein,
    carbs: profile.target_carbs,
    fats: profile.target_fats,
  } : null);

  const [isSaving, setIsSaving] = useState(false);

  const calculateMacros = () => {
    // 1. Poids actuel
    const currentWeight = metrics[0]?.weight || 0;
    if (currentWeight === 0) {
      Alert.alert('ERREUR', 'VEUILLEZ SAISIR VOTRE POIDS DANS LA SECTION MESURES D\'ABORD.');
      return;
    }

    // 2. Taille
    const h = parseFloat(height);
    if (isNaN(h) || h <= 0) {
      Alert.alert('ERREUR', 'TAILLE INVALIDE.');
      return;
    }

    // 3. Âge
    const year = parseInt(dob.split('-')[0]);
    if (isNaN(year)) {
      Alert.alert('ERREUR', 'FORMAT DATE INVALIDE (YYYY-MM-DD).');
      return;
    }
    const age = new Date().getFullYear() - year;

    // 4. Calcul BMR (Mifflin-St Jeor)
    const bmr = (10 * currentWeight) + (6.25 * h) - (5 * age) + 5;

    // 5. TDEE
    const activity = ACTIVITY_LEVELS.find(a => a.id === selectedActivity);
    const tdee = bmr * (activity?.multiplier || 1.2);

    // 6. Cible Calories
    const goal = GOALS.find(g => g.id === selectedGoal);
    const targetCalories = Math.round(tdee + (goal?.adjustment || 0));

    // 7. Macros
    const p = Math.round(currentWeight * 2.2);
    const f = Math.round(currentWeight * 1.0);
    const c = Math.round((targetCalories - (p * 4) - (f * 9)) / 4);

    setResults({
      calories: targetCalories,
      protein: p,
      carbs: c,
      fats: f,
    });
  };

  const handleSave = async () => {
    if (!results || !profile?.id) return;
    
    setIsSaving(true);
    try {
      await updateProfile(profile.id, {
        dob,
        height: parseFloat(height),
        activity_level: selectedActivity as any,
        nutrition_goal: selectedGoal as any,
        target_calories: results.calories,
        target_protein: results.protein,
        target_carbs: results.carbs,
        target_fats: results.fats,
      });
      Alert.alert('SUCCÈS', 'PROFIL NUTRITIONNEL ENREGISTRÉ.');
    } catch (error: any) {
      Alert.alert('ERREUR', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BlurView intensity={20} tint="dark" style={styles.container}>
      <Text style={styles.title}>PARAMÉTRAGE NUTRITIONNEL</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>DATE DE NAISSANCE (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={dob}
          onChangeText={setDob}
          placeholder="1995-01-01"
          placeholderTextColor="#444"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>TAILLE (CM)</Text>
        <TextInput
          style={styles.input}
          value={height}
          onChangeText={setHeight}
          placeholder="180"
          placeholderTextColor="#444"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>NIVEAU D'ACTIVITÉ</Text>
        <View style={styles.row}>
          {ACTIVITY_LEVELS.map(a => (
            <TouchableOpacity
              key={a.id}
              style={[styles.chip, selectedActivity === a.id && styles.chipActive]}
              onPress={() => setSelectedActivity(a.id as any)}
            >
              <Text style={[styles.chipText, selectedActivity === a.id && styles.chipTextActive]}>
                {a.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>OBJECTIF</Text>
        <View style={styles.row}>
          {GOALS.map(g => (
            <TouchableOpacity
              key={g.id}
              style={[styles.chip, selectedGoal === g.id && styles.chipActive]}
              onPress={() => setSelectedGoal(g.id as any)}
            >
              <Text style={[styles.chipText, selectedGoal === g.id && styles.chipTextActive]}>
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.calcBtn} onPress={calculateMacros}>
        <Text style={styles.calcBtnText}>CALCULER MES MACROS</Text>
      </TouchableOpacity>

      {results && (
        <View style={styles.resultsContainer}>
          <View style={styles.resultGrid}>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>KCAL</Text>
              <Text style={styles.resultValue}>{results.calories}</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>PRO (G)</Text>
              <Text style={styles.resultValue}>{results.protein}</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>GLU (G)</Text>
              <Text style={styles.resultValue}>{results.carbs}</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>LIP (G)</Text>
              <Text style={styles.resultValue}>{results.fats}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>SAUVEGARDER LE PROFIL</Text>}
          </TouchableOpacity>
        </View>
      )}
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
    overflow: 'hidden',
  },
  title: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', marginBottom: 24, letterSpacing: 1.5 },
  inputGroup: { marginBottom: 20 },
  label: { color: '#8E8E93', fontSize: 10, fontWeight: '800', marginBottom: 8, letterSpacing: 1 },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  section: { marginBottom: 20 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chipActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderColor: '#00E5FF',
  },
  chipText: { color: '#8E8E93', fontSize: 10, fontWeight: '900' },
  chipTextActive: { color: '#00E5FF' },
  calcBtn: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00E5FF',
    marginTop: 10,
  },
  calcBtnText: { color: '#00E5FF', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  resultsContainer: { marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)' },
  resultGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  resultItem: { alignItems: 'center', flex: 1 },
  resultLabel: { color: '#8E8E93', fontSize: 9, fontWeight: '900', marginBottom: 4 },
  resultValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  saveBtn: {
    backgroundColor: '#00E5FF',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveBtnText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
});
