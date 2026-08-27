import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../../core/theme';
import { Button } from '../../../../shared/components/Button';
import { Input } from '../../../../shared/components/Input';

export const StepAccount = ({ data, updateData, onSubmit, onBack, isLoading }: any) => {
  const theme = useTheme();

  const isValid = data.email?.includes('@') && data.pass?.length >= 6;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Créez votre compte</Text>

      <View style={styles.form}>
        <Input
          label="Email"
          placeholder="Entrez votre email"
          value={data.email || ''}
          onChangeText={(text) => updateData({ email: text.toLowerCase() })}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          label="Mot de passe"
          placeholder="6 caractères minimum"
          value={data.pass || ''}
          onChangeText={(text) => updateData({ pass: text })}
          secureTextEntry
        />
      </View>

      <View style={styles.footer}>
        <Button title="Retour" variant="outline" onPress={onBack} style={styles.halfBtn} disabled={isLoading} />
        <Button
          title="Créer mon compte"
          onPress={onSubmit}
          disabled={!isValid || isLoading}
          loading={isLoading}
          style={styles.halfBtn}
        />
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
