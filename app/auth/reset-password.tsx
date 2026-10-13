import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../src/services/supabase';
import { translateAuthError, useAuthStore } from '../../src/store/authStore';
import { theme } from '../../src/core/theme';
import { glassCard } from '../../src/core/glass';
import { GlowBackground } from '../../src/shared/components/GlowBackground';
import { GlassSheen } from '../../src/shared/components/GlassSheen';
import { Input } from '../../src/shared/components/Input';
import { Button } from '../../src/shared/components/Button';
import { MIN_PASSWORD } from '../../src/features/auth/components/steps/StepAccount';

/** Opened from the password recovery e-mail (via /auth/callback, session already set). */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mismatch = confirm.length > 0 && confirm !== password;
  const valid = password.length >= MIN_PASSWORD && confirm === password;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(translateAuthError(updateError));
      return;
    }
    setDone(true);
  };

  const leave = async () => {
    await useAuthStore.getState().reloadProfile().catch(() => undefined);
    router.replace('/');
  };

  const eye = (
    <Pressable
      onPress={() => setShow((v) => !v)}
      hitSlop={10}
      style={styles.eye}
      accessibilityLabel={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
    >
      <Feather name={show ? 'eye-off' : 'eye'} size={18} color={theme.colors.textSecondary} />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <GlowBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={[glassCard, styles.card]}>
              <GlassSheen radius={22} />
              <View style={[styles.badge, done && styles.badgeOk]}>
                <Feather name={done ? 'check' : 'key'} size={24} color={done ? theme.colors.success : theme.colors.sprintyBlue} />
              </View>
              {done ? (
                <>
                  <Text style={styles.title}>Mot de passe modifié</Text>
                  <Text style={styles.subtitle}>Tu es connecté. Utilise ce nouveau mot de passe la prochaine fois.</Text>
                  <Button title="Continuer" onPress={leave} style={styles.button} />
                </>
              ) : (
                <>
                  <Text style={styles.title}>Nouveau mot de passe</Text>
                  <Text style={styles.subtitle}>Choisis un mot de passe d’au moins {MIN_PASSWORD} caractères.</Text>
                  <Input
                    label="Nouveau mot de passe"
                    placeholder={`${MIN_PASSWORD} caractères minimum`}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!show}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    leftIcon={<Feather name="lock" size={18} color={theme.colors.textSecondary} />}
                    rightIcon={eye}
                  />
                  <Input
                    label="Confirme-le"
                    placeholder="Le même, une seconde fois"
                    value={confirm}
                    onChangeText={setConfirm}
                    secureTextEntry={!show}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="done"
                    onSubmitEditing={save}
                    error={mismatch ? 'Les deux mots de passe ne correspondent pas.' : undefined}
                    leftIcon={<Feather name="lock" size={18} color={theme.colors.textSecondary} />}
                  />
                  {!!error && (
                    <View style={styles.notice}>
                      <Feather name="alert-circle" size={16} color={theme.colors.error} />
                      <Text style={styles.noticeText}>{error}</Text>
                    </View>
                  )}
                  <Button title="Enregistrer" onPress={save} disabled={!valid} loading={saving} />
                  <Pressable onPress={leave} style={styles.later} hitSlop={8}>
                    <Text style={styles.laterText}>Plus tard</Text>
                  </Pressable>
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backdrop },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 24 },
  card: { paddingHorizontal: 20, paddingVertical: 24 },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  badgeOk: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: theme.colors.text },
  subtitle: { fontSize: 15, lineHeight: 21, color: theme.colors.textSecondary, marginTop: 4, marginBottom: 20 },
  eye: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  noticeText: { flex: 1, fontSize: 14, color: theme.colors.text },
  button: { marginTop: 4 },
  later: { alignItems: 'center', paddingTop: 16 },
  laterText: { fontSize: 14, fontWeight: '700', color: theme.colors.textSecondary },
});
