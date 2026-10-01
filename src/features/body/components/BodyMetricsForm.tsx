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

  const formatSmartDecimal = (text: string) => {
    // Supprimer tout ce qui n'est pas un chiffre
    const digits = text.replace(/\D/g, '');
    if (!digits) return '';

    // Si 1 ou 2 chiffres : ex "7" -> "7", "79" -> "79"
    if (digits.length <= 2) {
      return digits;
    }

    // Si 3 chiffres : ex "794" -> "79.4"
    if (digits.length === 3) {
      return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    }

    // Si 4 chiffres ou plus : ex "1052" -> "105.2" (support des > 100 kg)
    return `${digits.slice(0, digits.length - 1)}.${digits.slice(digits.length - 1)}`;
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
          onChangeText={(text) => setWeight(formatSmartDecimal(text))}
          keyboardType="numeric"
          containerStyle={styles.inputContainer}
          autoFocus
        />
        <Input
          label="Masse Grasse (%)"
          placeholder="Ex: 12.5"
          value={bodyFat}
          onChangeText={(text) => setBodyFat(formatSmartDecimal(text))}
          keyboardType="numeric"
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
