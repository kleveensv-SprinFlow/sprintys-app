import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useBodyStore } from '../../../store/bodyStore';
import { useAuthStore } from '../../../store/authStore';
import { useSprintyStore } from '../../../store/sprintyStore';
import { useInsightStore } from '../../../store/insightStore';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Card } from '../../../shared/components/Card';
import { theme } from '../../../core/theme';

export const BodyMetricsForm: React.FC = () => {
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const { user } = useAuthStore();
  const { addMetric, isLoading } = useBodyStore();
  const showFeedback = useSprintyStore((state) => state.showFeedback);
  const runAnalysis = useInsightStore((state) => state.runAnalysis);

  const handleDecimalInput = (text: string, setter: (val: string) => void) => {
    // Remplacer virgule par point pour harmoniser
    let formatted = text.replace(',', '.');
    // Ne garder que les chiffres et un seul point
    const parts = formatted.split('.');
    if (parts.length > 2) {
      formatted = parts[0] + '.' + parts.slice(1).join('');
    }
    // Si la valeur est un nombre valide avec max 1 décimale ou vide/en cours de saisie
    if (/^\d*\.?\d{0,1}$/.test(formatted)) {
      setter(formatted);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    const w = parseFloat(weight.replace(',', '.'));
    if (isNaN(w)) return;

    try {
      await addMetric(user.id, w, bodyFat ? parseFloat(bodyFat.replace(',', '.')) : undefined);
      setWeight('');
      setBodyFat('');
      showFeedback('success', 'Données enregistrées.');
      runAnalysis();
    } catch (error) {
      showFeedback('error', 'Échec de l\'enregistrement.');
    }
  };

  return (
    <Card variant="glass" style={styles.card}>
      <Text style={styles.title}>Mise à jour corporelle</Text>
      
      <View style={styles.row}>
        <Input
          label="Poids (kg)"
          placeholder="Ex: 75.5 ou 105"
          value={weight}
          onChangeText={(text) => handleDecimalInput(text, setWeight)}
          keyboardType="decimal-pad"
          containerStyle={styles.inputContainer}
          autoFocus
        />
        <Input
          label="Masse Grasse (%)"
          placeholder="Ex: 12.5"
          value={bodyFat}
          onChangeText={(text) => handleDecimalInput(text, setBodyFat)}
          keyboardType="decimal-pad"
          containerStyle={styles.inputContainer}
        />
      </View>

      <Button
        title="ENREGISTRER LA PESÉE"
        onPress={handleSubmit}
        disabled={!weight || isLoading}
        loading={isLoading}
        variant="primary"
        style={styles.button}
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    marginBottom: theme.spacing.xl,
  },
  title: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: theme.typography.fontWeights.bold as any,
    marginBottom: theme.spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  inputContainer: {
    flex: 1,
  },
  button: {
    marginTop: theme.spacing.md,
  },
});
