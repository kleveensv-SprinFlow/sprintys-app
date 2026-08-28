import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../../core/theme';
import { Button } from '../../../../shared/components/Button';
import { Input } from '../../../../shared/components/Input';
import { Feather } from '@expo/vector-icons';

export const StepIdentity = ({ data, updateData, onNext, onBack }: any) => {
  const theme = useTheme();

  const isValid = data.firstName?.trim() && data.lastName?.trim() && data.gender;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Comment doit-on vous appeler ?</Text>

      <View style={styles.form}>
        <Input
          label="Prénom"
          placeholder="Entrez votre prénom"
          value={data.firstName}
          onChangeText={(text) => updateData({ firstName: text })}
          autoCapitalize="words"
        />
        <Input
          label="Nom"
          placeholder="Entrez votre nom"
          value={data.lastName}
          onChangeText={(text) => updateData({ lastName: text })}
          autoCapitalize="words"
        />
      </View>

      <Text style={[styles.genderTitle, { color: theme.colors.textSecondary }]}>Sexe</Text>
      <View style={styles.genderContainer}>
        <TouchableOpacity 
          style={[
            styles.genderCard, 
            { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border },
            data.gender === 'homme' && { borderColor: theme.colors.accent, backgroundColor: theme.colors.accent + '15' }
          ]}
          onPress={() => updateData({ gender: 'homme' })}
          activeOpacity={0.7}
        >
          <Feather name="user" size={24} color={data.gender === 'homme' ? theme.colors.accent : theme.colors.textMuted} />
          <Text style={[styles.genderText, { color: data.gender === 'homme' ? theme.colors.text : theme.colors.textSecondary }]}>Homme</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.genderCard, 
            { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border },
            data.gender === 'femme' && { borderColor: theme.colors.accent, backgroundColor: theme.colors.accent + '15' }
          ]}
          onPress={() => updateData({ gender: 'femme' })}
          activeOpacity={0.7}
        >
          <Feather name="user" size={24} color={data.gender === 'femme' ? theme.colors.accent : theme.colors.textMuted} />
          <Text style={[styles.genderText, { color: data.gender === 'femme' ? theme.colors.text : theme.colors.textSecondary }]}>Femme</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Button title="Retour" variant="outline" onPress={onBack} style={styles.halfBtn} />
        <Button title="Continuer" onPress={onNext} disabled={!isValid} style={styles.halfBtn} />
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
    marginBottom: 32,
    textAlign: 'center',
  },
  form: {
    gap: 16,
    marginBottom: 24,
  },
  genderTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  genderCard: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  genderText: {
    fontSize: 16,
    fontWeight: '600',
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
