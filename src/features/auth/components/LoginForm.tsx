import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Input } from '../../../shared/components/Input';
import { useAuthStore } from '../../../store/authStore';
import { useTheme } from '../../../core/theme';
import { supabase } from '../../../services/supabase';
import { GoogleSignInButton } from './GoogleSignInButton';

interface LoginFormProps {
  onSwitchToSignup?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToSignup }) => {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const { login, signInWithGoogle, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await login(email, password);
    } catch (err) {
      // Error handled in store
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    clearError();
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error('Google login error:', e);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert(
        'Email requis',
        'Renseignez votre adresse email pour recevoir un lien de réinitialisation.'
      );
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      Alert.alert(
        'Lien envoyé',
        'Un email de réinitialisation a été envoyé à ' + email.trim()
      );
    } catch (e: any) {
      Alert.alert(
        'Erreur',
        e.message || "Impossible d'envoyer le lien de réinitialisation."
      );
    }
  };

  const isSubmitDisabled = isLoading || isGoogleLoading || !email || !password;

  return (
    <View style={styles.container}>
      {/* Athletic Clean Title Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Bon retour</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Connectez-vous pour continuer votre progression.
        </Text>
      </View>

      {/* Input Fields */}
      <View style={styles.form}>
        <Input
          label="Adresse email"
          placeholder="sprinter@sprintflow.app"
          value={email}
          onChangeText={(val) => {
            setEmail(val);
            clearError();
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          leftIcon={<Feather name="mail" size={18} color={theme.colors.textSecondary} />}
          rightIcon={
            email.length > 0 ? (
              <TouchableOpacity onPress={() => setEmail('')}>
                <Feather name="x" size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>
            ) : undefined
          }
        />

        <View>
          <Input
            label="Mot de passe"
            placeholder="••••••••"
            value={password}
            onChangeText={(val) => {
              setPassword(val);
              clearError();
            }}
            secureTextEntry={!showPassword}
            leftIcon={<Feather name="lock" size={18} color={theme.colors.textSecondary} />}
            rightIcon={
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setShowPassword(!showPassword);
                }}
              >
                <Feather
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={18}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            }
          />

          <TouchableOpacity
            style={styles.forgotPasswordLink}
            onPress={handleForgotPassword}
            activeOpacity={0.7}
          >
            <Text style={[styles.forgotPasswordText, { color: '#0069E8' }]}>
              Mot de passe oublié ?
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Error Message Container */}
      {error && (
        <View
          style={[
            styles.errorContainer,
            {
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              borderColor: 'rgba(239, 68, 68, 0.25)',
            },
          ]}
        >
          <Feather name="alert-circle" size={16} color={theme.colors.error} />
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error}
          </Text>
        </View>
      )}

      {/* Primary Gradient CTA Button */}
      <TouchableOpacity
        onPress={handleLogin}
        disabled={isSubmitDisabled}
        activeOpacity={0.88}
        style={[styles.buttonWrapper, isSubmitDisabled && styles.buttonDisabled]}
      >
        <LinearGradient
          colors={['#0026AE', '#0069E8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientButton}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <View style={styles.buttonContent}>
              <Text style={styles.buttonText}>Se connecter</Text>
              <Feather name="arrow-right" size={18} color="#FFF" />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Modern Separator */}
      <View style={styles.dividerContainer}>
        <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
        <Text style={[styles.dividerText, { color: theme.colors.textMuted }]}>
          ou continuer avec
        </Text>
        <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
      </View>

      {/* Official Google Sign-In Button */}
      <GoogleSignInButton
        onPress={handleGoogleLogin}
        isLoading={isGoogleLoading}
        disabled={isLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    marginBottom: 22,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  form: {
    marginBottom: 4,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginTop: -6,
    marginBottom: 16,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  buttonWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0026AE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 2,
  },
  buttonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  gradientButton: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
});
