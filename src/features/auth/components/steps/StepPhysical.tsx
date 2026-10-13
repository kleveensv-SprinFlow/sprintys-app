import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Input } from '../../../../shared/components/Input';
import { StepTitle, StepFooter } from './StepParts';

const formatSmartDecimal = (text: string) => {
  const cleaned = text.replace(',', '.').replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join('').slice(0, 1)}`;
};

export const StepPhysical = ({ data, updateData, onNext, onBack }: any) => (
  <View>
    <StepTitle
      title="Ton profil physique"
      subtitle="Pour personnaliser tes repères. Tu peux passer cette étape et compléter plus tard."
    />

    <View style={styles.row}>
      <Input
        label="Taille (cm)"
        placeholder="180"
        value={data.height?.toString() || ''}
        onChangeText={(text) => updateData({ height: text.replace(/[^0-9]/g, '').slice(0, 3) })}
        keyboardType="number-pad"
        containerStyle={styles.half}
      />
      <Input
        label="Poids (kg)"
        placeholder="72.5"
        value={data.weight?.toString() || ''}
        onChangeText={(text) => updateData({ weight: formatSmartDecimal(text).slice(0, 5) })}
        keyboardType="decimal-pad"
        containerStyle={styles.half}
      />
    </View>

    <StepFooter onBack={onBack} onNext={onNext} nextTitle={data.height || data.weight ? 'Continuer' : 'Passer'} />
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  half: { flex: 1, width: undefined },
});
