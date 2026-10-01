import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../../core/theme';
import { Button } from '../../../../shared/components/Button';
import { Input } from '../../../../shared/components/Input';

export const StepPhysical = ({ data, updateData, onNext, onBack }: any) => {
  const theme = useTheme();

  const formatSmartDecimal = (text: string) => {
    const digits = text.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length <= 2) return digits;
    if (digits.length === 3) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    return `${digits.slice(0, digits.length - 1)}.${digits.slice(digits.length - 1)}`;
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Profil physique</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Quelques informations sur vous</Text>

      <View style={styles.form}>
        <Input
          label="Taille (cm)"
          placeholder="Ex: 180"
          value={data.height?.toString() || ''}
          onChangeText={(text) => updateData({ height: text.replace(/[^0-9]/g, '') })}
          keyboardType="number-pad"
        />
        <Input
          label="Poids (kg)"
          placeholder="Ex: 75.5 ou 105.2"
          value={data.weight?.toString() || ''}
          onChangeText={(text) => updateData({ weight: formatSmartDecimal(text) })}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.footer}>
        <Button title="Retour" variant="outline" onPress={onBack} style={styles.halfBtn} />
        <Button title="Continuer" onPress={onNext} style={styles.halfBtn} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 32,
    textAlign: 'center',
  },
  form: {
    gap: 16,
    marginBottom: 32,
  },
  footer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 'auto',
  },
  halfBtn: {
    flex: 1,
  }
});
