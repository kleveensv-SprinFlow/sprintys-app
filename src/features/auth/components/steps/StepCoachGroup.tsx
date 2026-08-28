import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SignupData } from '../../../../store/authStore';
import { useTheme } from '../../../../core/theme';
import { Feather } from '@expo/vector-icons';

interface StepCoachGroupProps {
  data: Partial<SignupData>;
  updateData: (newData: Partial<SignupData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepCoachGroup = ({ data, updateData, onNext, onBack }: StepCoachGroupProps) => {
  const theme = useTheme();
  const [groupName, setGroupName] = useState(data.groupName || '');
  const [subgroups, setSubgroups] = useState<string[]>(data.subgroups || ['']);

  const handleAddSubgroup = () => {
    setSubgroups(prev => [...prev, '']);
  };

  const handleSubgroupChange = (text: string, index: number) => {
    const updated = [...subgroups];
    updated[index] = text;
    setSubgroups(updated);
  };

  const handleRemoveSubgroup = (index: number) => {
    const updated = subgroups.filter((_, i) => i !== index);
    setSubgroups(updated);
  };

  const handleContinue = () => {
    const validSubgroups = subgroups.map(s => s.trim()).filter(s => s.length > 0);
    updateData({
      groupName: groupName.trim(),
      subgroups: validSubgroups,
    });
    onNext();
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={[styles.title, { color: theme.colors.text }]}>
        Créer votre premier groupe
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Organisez vos athlètes dès maintenant en créant un groupe principal et ses sous-groupes.
      </Text>

      {/* Main Group Name */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.text }]}>
          Nom du groupe principal *
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            },
          ]}
          placeholder="Ex: Équipe Sprint 2026, Club Athlé..."
          placeholderTextColor={theme.colors.textSecondary}
          value={groupName}
          onChangeText={setGroupName}
        />
      </View>

      {/* Subgroups section */}
      <View style={styles.subgroupsContainer}>
        <Text style={[styles.label, { color: theme.colors.text }]}>
          Sous-groupes (optionnel)
        </Text>
        <Text style={[styles.subText, { color: theme.colors.textSecondary }]}>
          Exemples: N1, Junior, Groupe 100m, Haie...
        </Text>

        {subgroups.map((sub, index) => (
          <View key={index} style={styles.subgroupRow}>
            <TextInput
              style={[
                styles.input,
                styles.subgroupInput,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder={`Sous-groupe ${index + 1}`}
              placeholderTextColor={theme.colors.textSecondary}
              value={sub}
              onChangeText={(text) => handleSubgroupChange(text, index)}
            />
            {subgroups.length > 1 && (
              <TouchableOpacity
                onPress={() => handleRemoveSubgroup(index)}
                style={styles.removeButton}
              >
                <Feather name="trash-2" size={20} color={theme.colors.error || '#EF4444'} />
              </TouchableOpacity>
            )}
          </View>
        ))}

        <TouchableOpacity
          style={[styles.addButton, { borderColor: theme.colors.accent }]}
          onPress={handleAddSubgroup}
        >
          <Feather name="plus" size={18} color={theme.colors.accent} />
          <Text style={[styles.addButtonText, { color: theme.colors.accent }]}>
            Ajouter un sous-groupe
          </Text>
        </TouchableOpacity>
      </View>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.backButton, { borderColor: theme.colors.border }]}
          onPress={onBack}
        >
          <Text style={[styles.backButtonText, { color: theme.colors.text }]}>Retour</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.nextButton,
            { backgroundColor: theme.colors.accent },
            !groupName.trim() && { opacity: 0.5 },
          ]}
          onPress={handleContinue}
          disabled={!groupName.trim()}
        >
          <Text style={styles.nextButtonText}>Continuer</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  subText: {
    fontSize: 12,
    marginBottom: 12,
  },
  input: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  subgroupsContainer: {
    marginBottom: 24,
  },
  subgroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  subgroupInput: {
    flex: 1,
  },
  removeButton: {
    padding: 10,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 8,
    gap: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    borderWidth: 1,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {},
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
