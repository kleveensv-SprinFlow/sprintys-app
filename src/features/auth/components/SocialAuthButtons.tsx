import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { theme } from '../../../core/theme';
import { useAuthStore } from '../../../store/authStore';
import { PressableScale } from '../../../shared/components/PressableScale';
import { GoogleIcon } from './GoogleSignInButton';

/**
 * "Continuer avec Apple" (iOS, official button as Apple requires) and "Continuer avec Google".
 * New social accounts then go through "Finalise ton compte" (role, age, consents).
 */
export function SocialAuthButtons() {
  const { signInWithGoogle, signInWithApple, clearError } = useAuthStore();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null);

  useEffect(() => {
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => undefined);
  }, []);

  const run = async (kind: 'google' | 'apple') => {
    if (busy) return;
    clearError();
    setBusy(kind);
    try {
      await (kind === 'google' ? signInWithGoogle() : signInWithApple());
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.wrap}>
      {appleAvailable && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={16}
          style={styles.apple}
          onPress={() => run('apple')}
        />
      )}
      <PressableScale onPress={() => run('google')} disabled={!!busy} style={styles.google}>
        {busy === 'google' ? (
          <ActivityIndicator color={theme.colors.text} />
        ) : (
          <>
            <GoogleIcon size={18} />
            <Text style={styles.googleText}>Continuer avec Google</Text>
          </>
        )}
      </PressableScale>
    </View>
  );
}

export function OrDivider({ label = 'ou' }: { label?: string }) {
  return (
    <View style={styles.divider}>
      <View style={styles.line} />
      <Text style={styles.dividerText}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  apple: { height: 52, width: '100%' },
  google: {
    height: 52,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleText: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border },
  dividerText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
});
