import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { signInWithEmail, signUpWithEmail } from '../services/authService';
import { supabase } from '../services/supabaseClient';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const AuthScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && (!firstName || !lastName))) {
      showAlert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await signInWithEmail(email, password);
        if (error) throw error;
      } else {
        // En mode inscription, Supabase enverra un code si configuré en OTP
        const { data, error } = await signUpWithEmail(email, password, firstName, lastName);
        if (error) throw error;
        
        if (data?.user) {
          setShowOtp(true);
          showAlert('Vérification', 'Un code de confirmation a été envoyé à ton email.');
        }
      }
    } catch (e: any) {
      let errorMessage = e.message;
      if (errorMessage.includes('Invalid login credentials')) {
        errorMessage = 'Email ou mot de passe incorrect.';
      } else if (errorMessage.includes('User already registered')) {
        errorMessage = 'Cet email est déjà utilisé.';
      } else if (errorMessage.includes('Password should be')) {
        errorMessage = 'Le mot de passe doit faire au moins 6 caractères.';
      }
      showAlert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpToken.length !== 8) {
      showAlert('Erreur', 'Le code doit comporter 8 chiffres.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpToken,
        type: 'signup',
      });

      if (error) throw error;
      
      showAlert('Succès', 'Compte vérifié ! Bienvenue dans l\'élite.');
    } catch (e: any) {
      showAlert('Erreur de validation', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Jeux de lumière background */}
      <View style={styles.lightBackground}>
        <LinearGradient
          colors={['rgba(50, 173, 230, 0.4)', 'transparent']}
          style={[styles.lightCircle, styles.cyanCircle]}
        />
        <LinearGradient
          colors={['rgba(191, 90, 242, 0.4)', 'transparent']}
          style={[styles.lightCircle, styles.purpleCircle]}
        />
      </View>
      
      {/* Full screen blur to diffuse light */}
      <BlurView 
        intensity={Platform.OS === 'android' ? 80 : 100} 
        tint="dark" 
        style={[StyleSheet.absoluteFill, Platform.OS === 'android' && { backgroundColor: 'rgba(0,0,0,0.7)' }]} 
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <BlurView intensity={40} tint="default" style={styles.glassCard}>
            <Text style={styles.title}>
              {showOtp ? 'Vérification' : (isLogin ? 'Connexion' : 'Inscription')}
            </Text>
            <Text style={styles.subtitle}>
              {showOtp ? 'Entre le code reçu par email' : "Sprinty's - Elite Performance"}
            </Text>

            {!showOtp ? (
              <>
                {!isLogin && (
                  <>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        placeholder="Prénom"
                        placeholderTextColor="#8E8E93"
                        value={firstName}
                        onChangeText={setFirstName}
                      />
                    </View>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        placeholder="Nom"
                        placeholderTextColor="#8E8E93"
                        value={lastName}
                        onChangeText={setLastName}
                      />
                    </View>
                  </>
                )}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#8E8E93"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Mot de passe"
                    placeholderTextColor="#8E8E93"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity 
                  style={styles.mainButton} 
                  onPress={handleAuth}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#000000" />
                  ) : (
                    <Text style={styles.mainButtonText}>
                      {isLogin ? 'Se connecter' : 'Créer un compte'}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.toggleButton} 
                  onPress={() => setIsLogin(!isLogin)}
                >
                  <Text style={styles.toggleButtonText}>
                    {isLogin 
                      ? "Pas de compte ? S'inscrire" 
                      : "Déjà un compte ? Se connecter"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, { textAlign: 'center', fontSize: 22, letterSpacing: 4 }]}
                    placeholder="00000000"
                    placeholderTextColor="#444"
                    value={otpToken}
                    onChangeText={setOtpToken}
                    keyboardType="numeric"
                    maxLength={8}
                  />
                </View>

                <TouchableOpacity 
                  style={styles.mainButton} 
                  onPress={handleVerifyOtp}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#000000" />
                  ) : (
                    <Text style={styles.mainButtonText}>Confirmer le code</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.toggleButton} 
                  onPress={() => setShowOtp(false)}
                >
                  <Text style={styles.toggleButtonText}>Retour à l'inscription</Text>
                </TouchableOpacity>
              </>
            )}
          </BlurView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  lightBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  lightCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.6,
  },
  cyanCircle: {
    top: -50,
    left: -50,
    backgroundColor: '#32ADE6', // iOS Cyan
  },
  purpleCircle: {
    bottom: -50,
    right: -50,
    backgroundColor: '#BF5AF2', // iOS Purple
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: Platform.OS === 'android' ? 'flex-start' : 'center',
    paddingTop: Platform.OS === 'android' ? 60 : 0,
    alignItems: 'center',
    padding: 20,
  },
  glassCard: {
    width: '100%',
    maxWidth: 400,
    padding: 30,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93', // iOS Grey
    marginBottom: 35,
    fontWeight: '500',
    letterSpacing: 1,
  },
  inputContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    marginBottom: 16,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#FFFFFF',
    fontSize: 17,
  },
  mainButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  mainButtonText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '600',
  },
  googleButton: {
    width: '100%',
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '500',
  },
  toggleButton: {
    marginTop: 25,
    padding: 10,
  },
  toggleButtonText: {
    color: '#8E8E93',
    fontSize: 15,
    fontWeight: '500',
  },
});

export default AuthScreen;
