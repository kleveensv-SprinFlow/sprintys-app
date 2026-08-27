import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../../core/theme';
import { Button } from '../../../../shared/components/Button';
import { Input } from '../../../../shared/components/Input';

export const StepIdentity = ({ data, updateData, onNext, onBack }: any) => {
  const theme = useTheme();

  const isValid = data.firstName?.trim() && data.lastName?.trim();

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
