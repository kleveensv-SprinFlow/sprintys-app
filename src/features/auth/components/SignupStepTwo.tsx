import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { colors } from '../../../shared/theme/colors';

interface Props {
  name: string;
  setName: (val: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  loading: boolean;
}

export const SignupStepTwo: React.FC<Props> = ({ name, setName, onBack, onSubmit, loading }) => {
  const isValid = name.trim().length >= 2;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Presque terminé</Text>
      <Text style={styles.subtitle}>Comment doit-on t'appeler ? (2/2)</Text>
      
      <Input 
        label="Prénom ou Pseudo" 
        placeholder="Sprinty" 
        value={name}
        onChangeText={setName}
      />
      
      <View style={styles.buttonGroup}>
        <Button 
          title="Retour" 
          variant="secondary" 
          onPress={onBack} 
          style={styles.backButton}
        />
        <Button 
          title="Terminer" 
          onPress={onSubmit} 
          disabled={!isValid}
          loading={loading}
          style={styles.submitButton}
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
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 24,
  },
  buttonGroup: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  backButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
});
