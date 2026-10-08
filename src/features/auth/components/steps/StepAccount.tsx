import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../../../core/theme';
import { Button } from '../../../../shared/components/Button';
import { Input } from '../../../../shared/components/Input';
import { LegalNoticeModal } from '../LegalNoticeModal';

export const StepAccount = ({ data, updateData, onSubmit, onBack, isLoading }: any) => {
  const theme = useTheme();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showLegal, setShowLegal] = useState(false);

  const calculateAge = (dob: Date | null) => {
    if (!dob) return 0;
    const diffMs = Date.now() - dob.getTime();
    const ageDt = new Date(diffMs);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  };

  const age = calculateAge(data.dob);
  const isValidAge = data.dob && age >= 15;
  const isValid = data.email?.includes('@') && data.pass?.length >= 6 && isValidAge && data.acceptedTerms;

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
              value={data.dob || new Date()}
              mode="date"
              display="default"
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}
          {data.dob && !isValidAge && (
            <Text style={{ color: theme.colors.error, marginTop: 4, fontSize: 12 }}>
              Vous devez avoir au moins 15 ans pour utiliser Sprintflow.
            </Text>
          )}
          <TouchableOpacity
            onPress={() => updateData({ acceptedTerms: !data.acceptedTerms })}
            style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 16, gap: 10 }}
          >
            <View style={{
              width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, marginTop: 2,
              borderColor: theme.colors.accent,
              backgroundColor: data.acceptedTerms ? theme.colors.accent : 'transparent',
            }} />
            <Text style={{ flex: 1, color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
              J’ai au moins 15 ans et j’ai lu les{' '}
              <Text style={{ color: theme.colors.sprintyBlue, fontWeight: '700' }} onPress={() => setShowLegal(true)}>
                mentions et conditions
              </Text>
              . L’éditeur n’est pas encore une société.
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <LegalNoticeModal visible={showLegal} onClose={() => setShowLegal(false)} />

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
