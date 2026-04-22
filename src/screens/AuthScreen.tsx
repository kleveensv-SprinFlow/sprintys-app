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

const { width, height } = Dimensions.get('window');

const AuthScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleAuth = async () => {
    console.log(`Attempting ${isLogin ? 'Sign In' : 'Sign Up'} for:`, email);
    if (!email || !password) {
      showAlert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = isLogin 
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(email, password);

      setLoading(false);

      if (error) {
        console.error('Auth Error:', error.message);
        showAlert('Erreur d\'authentification', error.message);
      } else {
        console.log('Auth Success:', data);
        if (!isLogin && data?.user) {
          showAlert('Succès', 'Veuillez vérifier votre email pour confirmer l\'inscription.');
        }
      }
    } catch (e: any) {
      setLoading(false);
      console.error('Unexpected Auth Error:', e);
      showAlert('Erreur inattendue', e.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Jeux de lumière background */}
      <View style={styles.lightBackground}>
        <View style={[styles.lightCircle, styles.cyanCircle]} />
        <View style={[styles.lightCircle, styles.purpleCircle]} />
      </View>
      
      {/* Full screen blur to diffuse light */}
      <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <BlurView intensity={40} tint="default" style={styles.glassCard}>
            <Text style={styles.title}>{isLogin ? 'Connexion' : 'Inscription'}</Text>
            <Text style={styles.subtitle}>Sprinty's - Elite Performance</Text>

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
              style={styles.googleButton} 
              onPress={() => console.log('Google Auth later')}
              activeOpacity={0.7}
            >
              <Text style={styles.googleButtonText}>Continuer avec Google</Text>
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
    justifyContent: 'center',
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
