import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Input } from '../../../shared/components/Input';
import { Button } from '../../../shared/components/Button';
import { useAuthStore, authRedirectUrl } from '../../../store/authStore';
import { theme } from '../../../core/theme';
import { supabase } from '../../../services/supabase';
import { SocialAuthButtons, OrDivider } from './SocialAuthButtons';

interface LoginFormProps {
  onSwitchToSignup?: () => void;
}

const isEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetState, setResetState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) return;
    await login(email.trim(), password);
  };

  const sendReset = async () => {
    if (!isEmail(email)) return;
    setResetState('sending');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: authRedirectUrl(),
    });
    setResetState(resetError ? 'error' : 'sent');
  };

  const tap = () => {
    try {
      Haptics.selectionAsync();
    } catch {
      // ignore
    }
  };

  if (resetMode) {
    return (
      <View>
        <Text style={styles.title}>Mot de passe oublié</Text>
        <Text style={styles.subtitle}>Indique ton e-mail : nous t’envoyons un lien pour en choisir un nouveau.</Text>
        <Input
          label="E-mail"
          placeholder="ton@email.fr"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setResetState('idle');
          }}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          leftIcon={<Feather name="mail" size={18} color={theme.colors.textSecondary} />}
        />
        {resetState === 'sent' && (
          <View style={[styles.notice, styles.noticeOk]}>
            <Feather name="check-circle" size={16} color={theme.colors.success} />
            <Text style={styles.noticeText}>C’est envoyé. Pense à vérifier tes spams.</Text>
          </View>
        )}
        {resetState === 'error' && (
          <View style={styles.notice}>
            <Feather name="alert-circle" size={16} color={theme.colors.error} />
            <Text style={styles.noticeText}>Impossible d’envoyer le lien. Réessaie dans un instant.</Text>
          </View>
        )}
        <Button
          title={resetState === 'sent' ? 'Renvoyer le lien' : 'Envoyer le lien'}
          onPress={sendReset}
          loading={resetState === 'sending'}
          disabled={!isEmail(email)}
        />
        <Pressable
          onPress={() => {
            tap();
            setResetMode(false);
            setResetState('idle');
          }}
          style={styles.linkRow}
          hitSlop={8}
        >
          <Feather name="arrow-left" size={15} color={theme.colors.sprintyBlue} />
          <Text style={styles.link}>Retour à la connexion</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.title}>Bon retour</Text>
      <Text style={styles.subtitle}>Connecte-toi pour retrouver tes séances.</Text>

      <SocialAuthButtons />
      <OrDivider label="ou avec ton e-mail" />

      <Input
        label="E-mail"
        placeholder="ton@email.fr"
        value={email}
        onChangeText={(val) => {
          setEmail(val);
          clearError();
        }}
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
        returnKeyType="next"
        leftIcon={<Feather name="mail" size={18} color={theme.colors.textSecondary} />}
      />
      <Input
        label="Mot de passe"
        placeholder="Ton mot de passe"
        value={password}
        onChangeText={(val) => {
          setPassword(val);
          clearError();
        }}
        secureTextEntry={!showPassword}
        autoComplete="password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleLogin}
        leftIcon={<Feather name="lock" size={18} color={theme.colors.textSecondary} />}
        rightIcon={
          <Pressable
            onPress={() => {
              tap();
              setShowPassword((v) => !v);
            }}
            hitSlop={10}
            accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            style={styles.eye}
          >
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={theme.colors.textSecondary} />
          </Pressable>
        }
      />

      <Pressable onPress={() => setResetMode(true)} hitSlop={8} style={styles.forgot}>
        <Text style={styles.link}>Mot de passe oublié ?</Text>
      </Pressable>

      {!!error && (
        <View style={styles.notice}>
          <Feather name="alert-circle" size={16} color={theme.colors.error} />
          <Text style={styles.noticeText}>{error}</Text>
        </View>
      )}

      <Button title="Se connecter" onPress={handleLogin} loading={isLoading} disabled={!email || !password} />

      {onSwitchToSignup && (
        <Pressable onPress={onSwitchToSignup} style={styles.switchRow} hitSlop={8}>
          <Text style={styles.switchText}>
            Pas encore de compte ? <Text style={styles.link}>Crée-le</Text>
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6, color: theme.colors.text },
  subtitle: { fontSize: 15, lineHeight: 21, color: theme.colors.textSecondary, marginTop: 4, marginBottom: 20 },
  eye: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  forgot: { alignSelf: 'flex-end', marginTop: -6, marginBottom: 16, paddingVertical: 4 },
  link: { color: theme.colors.sprintyBlue, fontWeight: '700', fontSize: 14 },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 16 },
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
  noticeOk: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  noticeText: { flex: 1, fontSize: 14, color: theme.colors.text },
  switchRow: { alignItems: 'center', paddingTop: 18 },
  switchText: { fontSize: 14, color: theme.colors.textSecondary },
});
