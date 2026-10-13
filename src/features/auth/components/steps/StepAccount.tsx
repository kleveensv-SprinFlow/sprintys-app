import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../../../core/theme';
import { Button } from '../../../../shared/components/Button';
import { Input } from '../../../../shared/components/Input';
import { useRouter } from 'expo-router';
import { ConsentCheck, ConsentLink } from '../../../legal/ConsentCheck';
import { ageOn, MIN_AGE } from '../../../../legal/age';

export const StepAccount = ({ data, updateData, onSubmit, onBack, isLoading }: any) => {
  const theme = useTheme();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const router = useRouter();
  const isAthlete = data.role !== 'coach';

  const isValidAge = !!data.dob && ageOn(data.dob) >= MIN_AGE;
  const consentsOk = !!data.acceptedTerms && (!isAthlete || !!data.acceptedHealth);
  const isValid = data.email?.includes('@') && data.pass?.length >= 6 && isValidAge && consentsOk;
  const openDoc = (doc: string) => router.push({ pathname: '/legal/[doc]', params: { doc } });

  const onDateChange = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      updateData({ dob: selectedDate });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Créez votre compte</Text>

      <View style={styles.form}>
        <Input
          label="Email"
          placeholder="Entrez votre email"
          value={data.email || ''}
          onChangeText={(text: string) => updateData({ email: text.toLowerCase() })}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          label="Mot de passe"
          placeholder="6 caractères minimum"
          value={data.pass || ''}
          onChangeText={(text: string) => updateData({ pass: text })}
          secureTextEntry
        />
        <View style={{ marginTop: 8 }}>
          <Text style={{ color: theme.colors.textSecondary, marginBottom: 8 }}>Date de naissance</Text>
          <Button
            title={data.dob ? data.dob.toLocaleDateString() : 'Sélectionner une date'}
            variant="outline"
            onPress={() => setShowDatePicker(true)}
          />
          {showDatePicker && (
            <DateTimePicker
              value={data.dob || new Date(new Date().getFullYear() - 18, 0, 1)}
              mode="date"
              display="default"
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}
          {data.dob && !isValidAge && (
            <Text style={{ color: theme.colors.error, marginTop: 4, fontSize: 12 }}>
              Vous devez avoir au moins 15 ans pour utiliser Sprintys.
            </Text>
          )}
          <View style={{ marginTop: 16, gap: 6 }}>
            <ConsentCheck checked={!!data.acceptedTerms} onToggle={() => updateData({ acceptedTerms: !data.acceptedTerms })} required>
              J’ai au moins 15 ans et j’accepte les <ConsentLink label="conditions d’utilisation" onPress={() => openDoc('terms')} /> et la{' '}
              <ConsentLink label="politique de confidentialité" onPress={() => openDoc('privacy')} />.
            </ConsentCheck>
            {isAthlete && (
              <ConsentCheck checked={!!data.acceptedHealth} onToggle={() => updateData({ acceptedHealth: !data.acceptedHealth })} required>
                J’accepte que Sprintys utilise mes données de santé (poids, composition corporelle, sommeil, fatigue, stress,
                humeur) pour suivre ma forme.
              </ConsentCheck>
            )}
          </View>
        </View>
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
