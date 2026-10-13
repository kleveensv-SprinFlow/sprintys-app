import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../src/store/authStore';
import { theme } from '../../src/core/theme';
import { glassCard } from '../../src/core/glass';
import { GlowBackground } from '../../src/shared/components/GlowBackground';
import { GlassSheen } from '../../src/shared/components/GlassSheen';
import { Button } from '../../src/shared/components/Button';

const RESEND_COOLDOWN = 60;
// Supabase codes are 6 digits by default; the row grows if the project sends longer ones.
const BASE_LENGTH = 6;
const MAX_LENGTH = 8;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { verifyOtp, resendOtp, pendingEmail, isLoading, error, clearError, logout } = useAuthStore();

  const targetEmail = params.email || pendingEmail || '';
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(true);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [resent, setResent] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const shake = useRef(new Animated.Value(0)).current;

  const boxes = Math.max(BASE_LENGTH, Math.min(MAX_LENGTH, code.length));

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Wrong code: little horizontal shake + error haptic
  useEffect(() => {
    if (!error) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // haptics unavailable (web)
    }
    shake.setValue(0);
    Animated.sequence(
      [10, -10, 6, -6, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 55, useNativeDriver: true })),
    ).start();
  }, [error]);

  const verify = async (value = code) => {
    if (value.length < BASE_LENGTH || isLoading) return;
    clearError();
    await verifyOtp(targetEmail, value);
    // The root layout navigates to the app once the user is set
  };

  const onChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, MAX_LENGTH);
    if (error) clearError();
    setCode(digits);
    if (digits.length === MAX_LENGTH) verify(digits);
  };

  const resend = async () => {
    if (!targetEmail || cooldown > 0) return;
    clearError();
    await resendOtp(targetEmail);
    if (!useAuthStore.getState().error) {
      setResent(true);
      setCode('');
      setCooldown(RESEND_COOLDOWN);
      setTimeout(() => setResent(false), 4000);
    }
  };

  const backToLogin = async () => {
    clearError();
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <GlowBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={[glassCard, styles.card]}>
              <GlassSheen radius={22} />
              <View style={styles.badge}>
                <Feather name="mail" size={24} color={theme.colors.sprintyBlue} />
              </View>
              <Text style={styles.title}>Vérifie ta boîte mail</Text>
              <Text style={styles.subtitle}>
                Saisis le code envoyé à{'\n'}
                <Text style={styles.email}>{targetEmail || 'ton adresse e-mail'}</Text>
              </Text>

              <Animated.View style={[styles.codeRow, { transform: [{ translateX: shake }] }]}>
                {Array.from({ length: boxes }).map((_, i) => {
                  const char = code[i] || '';
                  const active = focused && (i === code.length || (i === boxes - 1 && code.length >= boxes));
                  return (
                    <View
                      key={i}
                      style={[
                        styles.box,
                        boxes > BASE_LENGTH && styles.boxCompact,
                        !!char && styles.boxFilled,
                        active && styles.boxActive,
                        !!error && styles.boxError,
                      ]}
                    >
                      <Text style={styles.boxText}>{char}</Text>
                    </View>
                  );
                })}
                {/* One real input over the boxes: keeps paste and one-time-code autofill working */}
                <TextInput
                  ref={inputRef}
                  value={code}
                  onChangeText={onChange}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  maxLength={MAX_LENGTH}
                  autoFocus
                  caretHidden
                  selectionColor="transparent"
                  style={styles.hiddenInput}
                  accessibilityLabel="Code de confirmation"
                />
              </Animated.View>

              {!!error && (
                <View style={styles.notice}>
                  <Feather name="alert-circle" size={16} color={theme.colors.error} />
                  <Text style={styles.noticeText}>{error}</Text>
                </View>
              )}
              {resent && (
                <View style={[styles.notice, styles.noticeOk]}>
                  <Feather name="check-circle" size={16} color={theme.colors.success} />
                  <Text style={styles.noticeText}>Nouveau code envoyé. Pense à regarder tes spams.</Text>
                </View>
              )}

              <Button
                title="Confirmer"
                onPress={() => verify()}
                disabled={code.length < BASE_LENGTH}
                loading={isLoading}
                style={styles.button}
              />

              <Pressable onPress={resend} disabled={cooldown > 0 || isLoading} style={styles.resend} hitSlop={8}>
                <Text style={styles.resendText}>
                  Pas reçu ?{' '}
                  {cooldown > 0 ? (
                    <Text style={styles.cooldown}>Renvoyer dans {cooldown} s</Text>
                  ) : (
                    <Text style={styles.link}>Renvoyer le code</Text>
                  )}
                </Text>
              </Pressable>
            </View>

            <Pressable onPress={backToLogin} style={styles.back} hitSlop={8}>
              <Feather name="arrow-left" size={15} color={theme.colors.textSecondary} />
              <Text style={styles.backText}>Utiliser une autre adresse</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backdrop },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 24 },
  card: { paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center' },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: theme.colors.text, textAlign: 'center' },
  subtitle: { fontSize: 15, lineHeight: 22, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 6 },
  email: { color: theme.colors.text, fontWeight: '700' },
  codeRow: { flexDirection: 'row', gap: 8, marginTop: 22, marginBottom: 16, alignSelf: 'stretch', justifyContent: 'center' },
  box: {
    flex: 1,
    maxWidth: 48,
    height: 56,
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: theme.colors.glassFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxCompact: { height: 50, borderRadius: 12 },
  boxFilled: { backgroundColor: theme.colors.surface },
  boxActive: { borderColor: theme.colors.sprintyBlue, backgroundColor: theme.colors.surface },
  boxError: { borderColor: theme.colors.error },
  boxText: { fontSize: 22, fontWeight: '800', color: theme.colors.text },
  hiddenInput: { ...StyleSheet.absoluteFillObject, color: 'transparent', opacity: Platform.OS === 'web' ? 0 : 0.011 },
  notice: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  noticeOk: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  noticeText: { flex: 1, fontSize: 14, color: theme.colors.text },
  button: { alignSelf: 'stretch' },
  resend: { paddingTop: 18 },
  resendText: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center' },
  cooldown: { color: theme.colors.textMuted, fontWeight: '600', fontVariant: ['tabular-nums'] },
  link: { color: theme.colors.sprintyBlue, fontWeight: '700' },
  back: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 18 },
  backText: { fontSize: 14, fontWeight: '700', color: theme.colors.textSecondary },
});
