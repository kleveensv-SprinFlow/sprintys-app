import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, Animated } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../../../core/theme';
import { Input } from '../../../../shared/components/Input';
import { PressableScale } from '../../../../shared/components/PressableScale';
import { ConsentCheck, ConsentLink } from '../../../legal/ConsentCheck';
import { ageOn, MIN_AGE } from '../../../../legal/age';
import { StepTitle, StepFooter, FieldLabel, stepStyles } from './StepParts';

export const MIN_PASSWORD = 8;

const isEmail = (v?: string) => !!v && /^\S+@\S+\.\S+$/.test(v.trim());

/** 0 = too short, 1 = weak, 2 = fair, 3 = strong */
const passwordScore = (p: string) => {
  if (p.length < MIN_PASSWORD) return 0;
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(p)).length;
  const points = variety + (p.length >= 12 ? 1 : 0);
  return points >= 4 ? 3 : points === 3 ? 2 : 1;
};

const STRENGTH = [
  { label: `${MIN_PASSWORD} caractères minimum`, color: theme.colors.textMuted },
  { label: 'Faible', color: '#F59E0B' },
  { label: 'Correct', color: theme.colors.sprintyBlue },
  { label: 'Solide', color: theme.colors.success },
];

const StrengthMeter = ({ password }: { password: string }) => {
  const score = passwordScore(password);
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: score, useNativeDriver: false, speed: 18, bounciness: 4 }).start();
  }, [score]);
  if (!password) return null;
  const s = STRENGTH[score];
  return (
    <View style={styles.meter}>
      <View style={styles.meterTrack}>
        <Animated.View
          style={[
            styles.meterFill,
            {
              backgroundColor: s.color,
              width: anim.interpolate({ inputRange: [0, 3], outputRange: ['8%', '100%'] }),
            },
          ]}
        />
      </View>
      <Text style={[styles.meterText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
};

export const StepAccount = ({ data, updateData, onSubmit, onBack, isLoading }: any) => {
  const router = useRouter();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const isAthlete = data.role !== 'coach';

  const pass: string = data.pass || '';
  const isValidAge = !!data.dob && ageOn(data.dob) >= MIN_AGE;
  const consentsOk = !!data.acceptedTerms && (!isAthlete || !!data.acceptedHealth);
  const isValid = isEmail(data.email) && pass.length >= MIN_PASSWORD && isValidAge && consentsOk;
  const openDoc = (doc: string) => router.push({ pathname: '/legal/[doc]', params: { doc } });

  const onDateChange = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) updateData({ dob: selectedDate });
  };

  return (
    <View>
      <StepTitle title="Dernière étape" subtitle="Tes identifiants, ta date de naissance et tes accords." />

      <Input
        label="E-mail"
        placeholder="ton@email.fr"
        value={data.email || ''}
        onChangeText={(text: string) => updateData({ email: text.trim().toLowerCase() })}
        onBlur={() => setEmailTouched(true)}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        error={emailTouched && data.email && !isEmail(data.email) ? 'Cette adresse ne semble pas valide.' : undefined}
        leftIcon={<Feather name="mail" size={18} color={theme.colors.textSecondary} />}
      />
      <Input
        label="Mot de passe"
        placeholder={`${MIN_PASSWORD} caractères minimum`}
        value={pass}
        onChangeText={(text: string) => updateData({ pass: text })}
        secureTextEntry={!showPassword}
        autoComplete="new-password"
        textContentType="newPassword"
        containerStyle={{ marginBottom: 8 }}
        leftIcon={<Feather name="lock" size={18} color={theme.colors.textSecondary} />}
        rightIcon={
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={10}
            accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            style={styles.eye}
          >
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={theme.colors.textSecondary} />
          </Pressable>
        }
      />
      <StrengthMeter password={pass} />

      <FieldLabel>Date de naissance</FieldLabel>
      <PressableScale
        haptic="selection"
        onPress={() => setShowDatePicker((v) => !v)}
        style={[styles.dateField, showDatePicker && styles.dateFieldOn]}
        accessibilityRole="button"
      >
        <Feather name="calendar" size={18} color={theme.colors.textSecondary} />
        <Text style={[styles.dateText, !data.dob && { color: theme.colors.textMuted }]}>
          {data.dob
            ? data.dob.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
            : 'Choisir une date'}
        </Text>
      </PressableScale>
      {showDatePicker && (
        <DateTimePicker
          value={data.dob || new Date(new Date().getFullYear() - 18, 0, 1)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          locale="fr-FR"
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}
      {data.dob && !isValidAge ? (
        <Text style={[stepStyles.error, styles.dateError]}>Sprintys est réservé aux personnes d’au moins 15 ans.</Text>
      ) : (
        <View style={{ height: 16 }} />
      )}

      <View style={styles.consents}>
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

      <StepFooter onBack={onBack} onNext={onSubmit} nextTitle="Créer mon compte" disabled={!isValid} loading={isLoading} />
    </View>
  );
};

const styles = StyleSheet.create({
  eye: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  meter: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  meterTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: theme.colors.glassFill, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 2 },
  meterText: { fontSize: 12, fontWeight: '700', minWidth: 60, textAlign: 'right' },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    backgroundColor: theme.colors.glassFill,
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: 14,
  },
  dateFieldOn: { borderColor: theme.colors.sprintyBlue, backgroundColor: theme.colors.surface },
  dateText: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  dateError: { marginTop: 8, marginBottom: 12 },
  consents: { gap: 6, marginBottom: 16 },
});
