import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useTheme } from '../../src/core/theme';
import { Card } from '../../src/shared/components/Card';
import { Feather } from '@expo/vector-icons';

export default function VerifyEmailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { verifyOtp, resendOtp, pendingEmail, isLoading, error, clearError } = useAuthStore();

  const targetEmail = params.email || pendingEmail || '';
  const [code, setCode] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleVerify = async () => {
    if (!code.trim()) return;
    clearError();
    const success = await verifyOtp(targetEmail, code.trim());
    if (success) {
      router.replace('/');
    }
  };

  const handleResend = async () => {
    if (!targetEmail) return;
    clearError();
    setResendSuccess(false);
    await resendOtp(targetEmail);
    setResendSuccess(true);
    setTimeout(() => setResendSuccess(false), 5000);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.inner}>
        <Card
          variant="glass"
          style={[
            styles.card,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
          ]}
        >
          <View style={styles.iconContainer}>
            <Feather name="mail" size={48} color={theme.colors.accent} />
          </View>

          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            Confirmation de votre compte
          </Text>

          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Un code de confirmation a été envoyé par e-mail à :
          </Text>
          <Text style={[styles.emailText, { color: theme.colors.accent }]}>
            {targetEmail || 'votre adresse e-mail'}
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.border
                }
              ]}
              placeholder="Code de confirmation"
              placeholderTextColor={theme.colors.textSecondary}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={8}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {error && (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {error}
            </Text>
          )}

          {resendSuccess && (
            <Text style={[styles.successText, { color: theme.colors.success || '#10B981' }]}>
              Un nouveau code a été envoyé !
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: theme.colors.accent },
              isLoading && { opacity: 0.7 }
            ]}
            onPress={handleVerify}
            disabled={isLoading || !code.trim()}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Confirmer mon compte</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleResend}
            disabled={isLoading || !targetEmail}
            style={styles.resendButton}
          >
            <Text style={[styles.resendText, { color: theme.colors.textSecondary }]}>
              Vous n'avez pas reçu de code ?{' '}
              <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>
                Renvoyer le code
              </Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/login')}
            style={styles.backButton}
          >
            <Text style={[styles.backText, { color: theme.colors.textSecondary }]}>
              Retour à la connexion
            </Text>
          </TouchableOpacity>
        </Card>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 2,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  successText: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendButton: {
    marginTop: 20,
  },
  resendText: {
    fontSize: 14,
  },
  backButton: {
    marginTop: 16,
  },
  backText: {
    fontSize: 13,
  },
});
