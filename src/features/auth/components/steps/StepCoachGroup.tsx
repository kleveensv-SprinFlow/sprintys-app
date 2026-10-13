import React, { useState } from 'react';
import { View, Text, StyleSheet, LayoutAnimation } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SignupData } from '../../../../store/authStore';
import { theme } from '../../../../core/theme';
import { Input } from '../../../../shared/components/Input';
import { PressableScale } from '../../../../shared/components/PressableScale';
import { StepTitle, StepFooter, FieldLabel } from './StepParts';

interface StepCoachGroupProps {
  data: Partial<SignupData>;
  updateData: (newData: Partial<SignupData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const MAX_SUBGROUPS = 8;

export const StepCoachGroup = ({ data, updateData, onNext, onBack }: StepCoachGroupProps) => {
  const [groupName, setGroupName] = useState(data.groupName || '');
  const [subgroups, setSubgroups] = useState<string[]>(data.subgroups?.length ? data.subgroups : ['']);

  const animate = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

  const add = () => {
    if (subgroups.length >= MAX_SUBGROUPS) return;
    animate();
    setSubgroups((prev) => [...prev, '']);
  };

  const change = (text: string, index: number) =>
    setSubgroups((prev) => prev.map((s, i) => (i === index ? text : s)));

  const remove = (index: number) => {
    animate();
    setSubgroups((prev) => prev.filter((_, i) => i !== index));
  };

  const handleContinue = () => {
    updateData({
      groupName: groupName.trim(),
      subgroups: subgroups.map((s) => s.trim()).filter(Boolean),
    });
    onNext();
  };

  return (
    <View>
      <StepTitle
        title="Crée ton premier groupe"
        subtitle="Tes athlètes le rejoindront avec un code. Tu pourras en créer d’autres ensuite."
      />

      <Input
        label="Nom du groupe"
        placeholder="Ex. Groupe sprint, Club athlé…"
        value={groupName}
        onChangeText={setGroupName}
        maxLength={40}
        leftIcon={<Feather name="users" size={18} color={theme.colors.textSecondary} />}
      />

      <FieldLabel>Sous-groupes (facultatif)</FieldLabel>
      <Text style={styles.hint}>Ex. Juniors, 100 m, Haies…</Text>

      {subgroups.map((sub, index) => (
        <View key={index} style={styles.subRow}>
          <Input
            placeholder={`Sous-groupe ${index + 1}`}
            value={sub}
            onChangeText={(text) => change(text, index)}
            maxLength={30}
            containerStyle={styles.subInput}
          />
          {subgroups.length > 1 && (
            <PressableScale
              haptic="selection"
              onPress={() => remove(index)}
              style={styles.remove}
              accessibilityLabel={`Retirer le sous-groupe ${index + 1}`}
            >
              <Feather name="x" size={18} color={theme.colors.textSecondary} />
            </PressableScale>
          )}
        </View>
      ))}

      {subgroups.length < MAX_SUBGROUPS && (
        <PressableScale haptic="selection" onPress={add} style={styles.add}>
          <Feather name="plus" size={16} color={theme.colors.sprintyBlue} />
          <Text style={styles.addText}>Ajouter un sous-groupe</Text>
        </PressableScale>
      )}

      <StepFooter onBack={onBack} onNext={handleContinue} disabled={!groupName.trim()} />
    </View>
  );
};

const styles = StyleSheet.create({
  hint: { fontSize: 13, color: theme.colors.textMuted, marginTop: -2, marginBottom: 10 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  subInput: { flex: 1, width: undefined, marginBottom: 0 },
  remove: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.glassFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(0, 105, 232, 0.08)',
    marginBottom: 20,
  },
  addText: { fontSize: 15, fontWeight: '700', color: theme.colors.sprintyBlue },
});
