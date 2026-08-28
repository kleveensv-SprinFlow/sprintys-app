import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useAuthStore } from '../../../store/authStore';
import { useNutritionStore } from '../../../store/nutrition/nutritionStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const NutritionSettingsModal: React.FC<Props> = ({ visible, onClose }) => {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const updateProfile = useNutritionStore((state) => state.updateNutritionProfile);

  const [objective, setObjective] = useState(user?.objective || 'perte');
  const [startWeight, setStartWeight] = useState(user?.startWeight?.toString() || '');
  const [targetWeight, setTargetWeight] = useState(user?.targetWeight?.toString() || '');
  const [activityLevel, setActivityLevel] = useState(user?.activityLevel || 'moyen');
  const [weeklyGoal, setWeeklyGoal] = useState(user?.weeklyWeightGoal?.toString() || '0.5');
  const [kcalGoal, setKcalGoal] = useState(user?.manualKcalGoal?.toString() || '2000');

  const [distribution, setDistribution] = useState(
    user?.mealDistribution || { petit_dejeuner: 25, dejeuner: 35, diner: 30, collation: 10 }
  );

  const totalDist = distribution.petit_dejeuner + distribution.dejeuner + distribution.diner + distribution.collation;

  const handleSave = async () => {
    if (totalDist !== 100) return; // Empêcher la sauvegarde si != 100%

    // Check max weekly goal (1kg)
    const parsedWeekly = parseFloat(weeklyGoal);
    if (parsedWeekly > 1 || parsedWeekly < -1) return;

    await updateProfile({
      activity_level: activityLevel,
      start_weight: parseFloat(startWeight),
      target_weight: parseFloat(targetWeight),
      weekly_weight_goal: parsedWeekly,
      manual_kcal_goal: parseInt(kcalGoal, 10),
      meal_distribution: distribution,
    });

    onClose();
  };

  const handleRecalculateKcal = () => {
    // Mifflin-St Jeor equation (simplified)
    const weight = user?.weight || parseFloat(startWeight) || 70;
    const height = user?.height || 170;
    const age = 30; // Devrait venir du profil (date de naissance)
    const isMale = user?.gender === 'homme';

    let bmr = (10 * weight) + (6.25 * height) - (5 * age) + (isMale ? 5 : -161);

    let activityMultiplier = 1.2;
    if (activityLevel === 'faible') activityMultiplier = 1.375;
    if (activityLevel === 'moyen') activityMultiplier = 1.55;
    if (activityLevel === 'élevé') activityMultiplier = 1.725;
    if (activityLevel === 'très élevé') activityMultiplier = 1.9;

    let tdee = bmr * activityMultiplier;

    // Ajustement selon objectif hebdo (1kg = ~7700 kcal / 7 jours = 1100 kcal/jour)
    const weeklyKg = parseFloat(weeklyGoal) || 0;
    const dailyAdjustment = weeklyKg * 1100;

    // Si perte, weeklyKg doit être négatif logiquement, on simplifie l'UI :
    // l'utilisateur rentre une valeur absolue, on l'applique selon l'objectif.
    if (objective === 'perte' || objective.includes('perte')) {
      tdee -= dailyAdjustment;
    } else if (objective === 'prendre' || objective.includes('prendre')) {
      tdee += dailyAdjustment;
    }

    setKcalGoal(Math.round(tdee).toString());
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: theme.colors.accent, fontSize: 16 }}>Annuler</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>Profil Nutritionnel</Text>
          <TouchableOpacity onPress={handleSave} disabled={totalDist !== 100}>
            <Text style={{ color: totalDist === 100 ? theme.colors.accent : theme.colors.textSecondary, fontSize: 16, fontWeight: 'bold' }}>
              Enregistrer
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 50 }}>

          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Objectif principal</Text>
            <View style={styles.buttonGroup}>
              {['Perte de poids', 'Prendre du poids', 'Se muscler', 'Stabiliser'].map(obj => (
                <TouchableOpacity
                  key={obj}
                  style={[styles.objButton, objective === obj && { backgroundColor: theme.colors.accent }]}
                  onPress={() => setObjective(obj)}
                >
                  <Text style={{ color: objective === obj ? '#FFF' : theme.colors.text, fontSize: 12 }}>{obj}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Activité & Mensurations</Text>

            <View style={styles.inputRow}>
              <Text style={{ color: theme.colors.text }}>Poids de départ (kg)</Text>
              <TextInput style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]} keyboardType="numeric" value={startWeight} onChangeText={setStartWeight} />
            </View>
            <View style={styles.inputRow}>
              <Text style={{ color: theme.colors.text }}>Poids cible (kg)</Text>
              <TextInput style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]} keyboardType="numeric" value={targetWeight} onChangeText={setTargetWeight} />
            </View>
            <View style={styles.inputRow}>
              <Text style={{ color: theme.colors.text }}>Niveau d'activité</Text>
              <View style={styles.buttonGroup}>
                {['faible', 'moyen', 'élevé', 'très élevé'].map(lvl => (
                  <TouchableOpacity
                    key={lvl}
                    style={[styles.objButton, activityLevel === lvl && { backgroundColor: theme.colors.accent }]}
                    onPress={() => setActivityLevel(lvl)}
                  >
                    <Text style={{ color: activityLevel === lvl ? '#FFF' : theme.colors.text, fontSize: 12 }}>{lvl}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Objectifs de Calories</Text>

            <View style={styles.inputRow}>
              <Text style={{ color: theme.colors.text }}>Rythme (kg/semaine) max 1kg</Text>
              <TextInput style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]} keyboardType="numeric" value={weeklyGoal} onChangeText={setWeeklyGoal} />
            </View>

            <View style={styles.inputRow}>
              <Text style={{ color: theme.colors.text }}>Objectif Calorique (kcal)</Text>
              <TextInput style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]} keyboardType="numeric" value={kcalGoal} onChangeText={setKcalGoal} />
            </View>

            <TouchableOpacity style={[styles.recalcButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.accent, borderWidth: 1 }]} onPress={handleRecalculateKcal}>
              <Text style={{ color: theme.colors.accent, textAlign: 'center' }}>Recalculer auto</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Répartition des calories (%)</Text>

            {(Object.keys(distribution) as Array<keyof typeof distribution>).map((meal) => (
              <View key={meal} style={styles.inputRow}>
                <Text style={{ color: theme.colors.text, textTransform: 'capitalize' }}>{meal.replace('_', ' ')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: theme.colors.textSecondary, marginRight: 10 }}>
                    {Math.round((parseInt(kcalGoal) * distribution[meal]) / 100)} kcal
                  </Text>
                  <TextInput
                    style={[styles.inputShort, { color: theme.colors.text, borderColor: theme.colors.border }]}
                    keyboardType="numeric"
                    value={distribution[meal].toString()}
                    onChangeText={(val) => setDistribution({...distribution, [meal]: parseInt(val) || 0})}
                  />
                  <Text style={{ color: theme.colors.text }}>%</Text>
                </View>
              </View>
            ))}

            <Text style={{ textAlign: 'right', marginTop: 10, color: totalDist === 100 ? theme.colors.text : '#FF6B6B', fontWeight: 'bold' }}>
              Total : {totalDist}%
            </Text>
          </View>

          <TouchableOpacity style={[styles.sprintyButton, { backgroundColor: theme.colors.accent }]}>
            <Feather name="smile" size={20} color="#FFF" style={{ marginRight: 10 }} />
            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Sprinty Nutrition</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    padding: 15,
  },
  card: {
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 5,
  },
  objButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#EEE',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    width: 100,
    textAlign: 'right',
  },
  inputShort: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    width: 50,
    textAlign: 'center',
    marginRight: 5,
  },
  recalcButton: {
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  sprintyButton: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  }
});
