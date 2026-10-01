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

  const formatDecimal = (text: string) => {
    // Replace comma with dot and remove any non-numeric/non-dot characters
    let formatted = text.replace(/,/g, '.').replace(/[^0-9.]/g, '');
    
    // Ensure only one dot exists
    const parts = formatted.split('.');
    if (parts.length > 2) {
      formatted = parts[0] + '.' + parts.slice(1).join('');
    }
    
    return formatted;
  };

  const handleSubmit = async () => {
    if (!user) return;
    const w = parseFloat(weight);
    if (isNaN(w)) return;

    try {
      await addMetric(user.id, w, bodyFat ? parseFloat(bodyFat) : undefined);
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
          placeholder="00.0"
          value={weight}
          onChangeText={(text) => setWeight(formatDecimal(text))}
          keyboardType="decimal-pad"
          containerStyle={styles.inputContainer}
          autoFocus
        />
        <Input
          label="Masse Grasse (%)"
          placeholder="00.0"
          value={bodyFat}
          onChangeText={(text) => setBodyFat(formatDecimal(text))}
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
