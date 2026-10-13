import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../src/core/theme';
import { glassCard } from '../../src/core/glass';
import { GlassScreen } from '../../src/shared/components/GlassScreen';
import { GlassSheen } from '../../src/shared/components/GlassSheen';
import { PressableScale } from '../../src/shared/components/PressableScale';
import { SegmentedControl } from '../../src/shared/components/SegmentedControl';
import { ConsentCheck, ConsentLink } from '../../src/features/legal/ConsentCheck';
import { useAuthStore } from '../../src/store/authStore';
import { useConsentStore } from '../../src/store/consentStore';
import { supabase } from '../../src/services/supabase';
import { ConsentType, requiredConsents } from '../../src/legal/consents';
import { ageOn, MIN_AGE, toISODate } from '../../src/legal/age';

type Role = 'athlete' | 'coach';

/**
 * Shown before the app when the account misses its required consents: every Google / Apple
 * sign-up, and accounts created before consents were recorded. Asks only what is missing.
 */
export default function CompleteProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, reloadProfile, logout } = useAuthStore();
  const { active, inTeam, grant } = useConsentStore();

  // Social sign-ups choose their role here (the email flow asks it in step 1)
  const canChooseRole = !!user && user.authProvider !== 'email' && !active?.has('terms');
  const [role, setRole] = useState<Role>((user?.role as Role) || 'athlete');
  const needsDob = !user?.dateOfBirth;
  const [dob, setDob] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [checked, setChecked] = useState<Partial<Record<ConsentType, boolean>>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missing = useMemo(
    () => requiredConsents(role, inTeam).filter((t) => !active?.has(t)),
    [role, inTeam, active]
  );
  const ageOk = !needsDob || (!!dob && ageOn(dob) >= MIN_AGE);
  const allChecked = missing.every((t) => checked[t]);
  const canSubmit = ageOk && allChecked && !saving;
  const toggle = (t: ConsentType) => setChecked((c) => ({ ...c, [t]: !c[t] }));
  const openDoc = (doc: string) => router.push({ pathname: '/legal/[doc]', params: { doc } });

  const submit = async () => {
    if (!user || !canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const fields: Record<string, any> = {};
      if (canChooseRole && role !== user.role) fields.role = role;
      if (needsDob && dob) fields.date_of_birth = toISODate(dob);
      if (Object.keys(fields).length) {
        const { error: saveError } = await supabase.from('profiles').update(fields).eq('id', user.id);
        if (saveError && !/date_of_birth/i.test(saveError.message)) throw saveError;
        if (fields.date_of_birth) await supabase.auth.updateUser({ data: { date_of_birth: fields.date_of_birth } });
      }
      if (!(await grant(missing))) throw new Error('consents');
      await reloadProfile();
      router.replace('/');
    } catch (e: any) {
      console.error('complete profile', e);
      setError(
        /15 ans/.test(e?.message || '')
          ? 'Sprintys est réservé aux personnes d’au moins 15 ans.'
          : 'Impossible d’enregistrer pour le moment. Vérifie ta connexion et réessaie.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassScreen>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.badge}>
          <Feather name="shield" size={26} color={theme.colors.sprintyBlue} />
        </View>
        <Text style={styles.title}>{canChooseRole ? 'Bienvenue sur Sprintys' : 'Un dernier point'}</Text>
        <Text style={styles.subtitle}>
          {canChooseRole
            ? 'Encore quelques secondes pour finaliser ton compte.'
            : 'Nous avons mis à jour nos conditions. Ton accord est nécessaire pour continuer.'}
        </Text>

        {canChooseRole && (
          <View style={[glassCard, styles.card]}>
            <GlassSheen radius={22} />
            <Text style={styles.cardTitle}>Tu utilises Sprintys en tant que</Text>
            <SegmentedControl
              options={[
                { key: 'athlete' as Role, label: 'Athlète' },
                { key: 'coach' as Role, label: 'Coach' },
              ]}
              value={role}
              onChange={setRole}
            />
          </View>
        )}

        {needsDob && (
          <View style={[glassCard, styles.card]}>
            <GlassSheen radius={22} />
            <Text style={styles.cardTitle}>Ta date de naissance</Text>
            <PressableScale haptic="selection" onPress={() => setShowPicker(true)} style={styles.dateField}>
              <Feather name="calendar" size={18} color={theme.colors.textSecondary} />
              <Text style={[styles.dateText, !dob && { color: theme.colors.textMuted }]}>
                {dob ? dob.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Choisir une date'}
              </Text>
            </PressableScale>
            {showPicker && (
              <DateTimePicker
                value={dob || new Date(new Date().getFullYear() - 18, 0, 1)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(_e, d) => {
                  setShowPicker(Platform.OS === 'ios');
                  if (d) setDob(d);
                }}
              />
            )}
            {!!dob && !ageOk && <Text style={styles.error}>Sprintys est réservé aux personnes d’au moins 15 ans.</Text>}
          </View>
        )}

        {missing.length > 0 && (
          <View style={[glassCard, styles.card]}>
            <GlassSheen radius={22} />
            <Text style={styles.cardTitle}>Tes accords</Text>
            {missing.includes('terms') && (
              <ConsentCheck checked={!!checked.terms} onToggle={() => toggle('terms')} required>
                J’ai au moins 15 ans et j’accepte les <ConsentLink label="conditions d’utilisation" onPress={() => openDoc('terms')} /> et
                la <ConsentLink label="politique de confidentialité" onPress={() => openDoc('privacy')} />.
              </ConsentCheck>
            )}
            {missing.includes('health_profile') && (
              <ConsentCheck checked={!!checked.health_profile} onToggle={() => toggle('health_profile')} required>
                J’accepte que Sprintys utilise mes données de santé (poids, composition corporelle, sommeil, fatigue, stress,
                humeur) pour suivre ma forme.
              </ConsentCheck>
            )}
            {missing.includes('coach_sharing') && (
              <ConsentCheck checked={!!checked.coach_sharing} onToggle={() => toggle('coach_sharing')} required>
                J’accepte que mon coach voie mes séances, repas, poids, check-ins et, si je l’ai accepté, mes douleurs, et
                qu’il puisse les faire analyser par l’assistant Sprinty.
              </ConsentCheck>
            )}
          </View>
        )}

        {!!error && <Text style={[styles.error, styles.errorBlock]}>{error}</Text>}

        <PressableScale
          haptic="medium"
          disabled={!canSubmit}
          onPress={submit}
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Continuer</Text>}
        </PressableScale>

        <PressableScale haptic="selection" onPress={logout} style={styles.secondary}>
          <Text style={styles.secondaryText}>Se déconnecter</Text>
        </PressableScale>
      </ScrollView>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  badge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, color: theme.colors.text },
  subtitle: { fontSize: 15, lineHeight: 21, color: theme.colors.textSecondary, marginTop: 6, marginBottom: 20 },
  card: { marginBottom: 12, paddingVertical: 16 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.text, marginBottom: 10 },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.glassFill,
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateText: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  error: { color: theme.colors.error, fontSize: 13, fontWeight: '600', marginTop: 8 },
  errorBlock: { textAlign: 'center', marginBottom: 4 },
  button: {
    marginTop: 12,
    backgroundColor: theme.colors.sprintyBlue,
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  secondary: { alignItems: 'center', paddingVertical: 16 },
  secondaryText: { color: theme.colors.textSecondary, fontSize: 15, fontWeight: '700' },
});
