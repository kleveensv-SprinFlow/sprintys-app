import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Input } from '../../../shared/components/Input';
import { useAuthStore } from '../../../store/authStore';
import { useTheme } from '../../../core/theme';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../../services/supabase';

interface LoginFormProps {
  onSwitchToSignup?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToSignup }) => {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error, clearError } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) return;
    try {
      await login(email, password);
    } catch (err) {
      // L'erreur est gérée dans le store
    }
  };

  const handleSignupPress = () => {
    if (onSwitchToSignup) {
      onSwitchToSignup();
    } else {
      router.push('/(auth)/signup');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Email requis', 'Renseignez votre email ci-dessus pour recevoir un lien de réinitialisation.');
      return;
    }
    await supabase.auth.resetPasswordForEmail(email);
    Alert.alert('Email envoyé', 'Un lien de réinitialisation a été envoyé à ' + email);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Bon retour ! ⚡</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Connectez-vous pour continuer votre entraînement.
        </Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Adresse email"
          placeholder="ex: sprinter@sprintflow.app"
          value={email}
          onChangeText={(val) => { setEmail(val); clearError(); }}
          autoCapitalize="none"
          keyboardType="email-address"
          leftIcon={<Feather name="mail" size={18} color={theme.colors.textSecondary} />}
          rightIcon={email.length > 0 ? (
            <TouchableOpacity onPress={() => setEmail('')}>
              <Feather name="x" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ) : undefined}
        />

        <View>
          <Input
            label="Mot de passe"
            placeholder="••••••••"
            value={password}
            onChangeText={(val) => { setPassword(val); clearError(); }}
            secureTextEntry={!showPassword}
            leftIcon={<Feather name="lock" size={18} color={theme.colors.textSecondary} />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            }
          />
          <TouchableOpacity style={styles.forgotPasswordLink} onPress={handleForgotPassword}>
            <Text style={[styles.forgotPasswordText, { color: theme.colors.accent }]}>
              Mot de passe oublié ?
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {error && (
        <View style={[styles.errorContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: theme.colors.error }]}>
          <Feather name="alert-circle" size={16} color={theme.colors.error} />
          <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
        </View>
      )}

      {/* Primary Gradient CTA Button */}
      <TouchableOpacity
        onPress={handleLogin}
        disabled={isLoading || !email || !password}
        activeOpacity={0.88}
        style={[styles.buttonWrapper, (!email || !password) && styles.buttonDisabled]}
      >
        <LinearGradient
          colors={['#0026AE', '#00DCFD']}
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

      <TouchableOpacity 
        onPress={handleSignupPress}
        style={styles.signupLink}
        activeOpacity={0.7}
      >
        <Text style={[styles.signupText, { color: theme.colors.textSecondary }]}>
          Pas encore de compte ? <Text style={[styles.signupTextBold, { color: theme.colors.accent }]}>Créer un compte</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    marginBottom: 8,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 16,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '600',
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
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0026AE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  gradientButton: {
    paddingVertical: 16,
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
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  signupLink: {
    marginTop: 22,
    alignItems: 'center',
    paddingVertical: 8,
  },
  signupText: {
    fontSize: 14,
  },
  signupTextBold: {
    fontWeight: '700',
  },
});
