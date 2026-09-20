import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../core/theme';
import { SprintyLogo } from '../../../shared/components/SprintyLogo';
import { LoginForm } from './LoginForm';
import { RegisterMultiStep } from './RegisterMultiStep';
import { LinearGradient } from 'expo-linear-gradient';

interface AuthScreenProps {
  initialTab?: 'login' | 'signup';
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ initialTab = 'login' }) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialTab);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Background Decorative Athletic Halo */}
      <View style={styles.glowTopContainer} pointerEvents="none">
        <LinearGradient
          colors={['rgba(0, 220, 253, 0.12)', 'rgba(0, 38, 174, 0.04)', 'transparent']}
          style={styles.glowGradient}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        {Platform.OS === 'ios' ? (
          <KeyboardAvoidingView behavior="padding" style={styles.keyboardView}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
            >
            {/* HERO BRAND HEADER */}
            <View style={styles.heroSection}>
              <View style={styles.logoWrapper}>
                <SprintyLogo width={180} height={46} />
              </View>
              <Text style={[styles.tagline, { color: theme.colors.textSecondary }]}>
                L'accélération de votre performance <Text style={{ color: theme.colors.accent }}>⚡</Text>
              </Text>
            </View>

            {/* SEGMENTED SWITCHER (Connexion | Inscription) */}
            <View style={[styles.switcherContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              {/* Tab 1: Connexion */}
              <TouchableOpacity
                style={styles.tabButton}
                onPress={() => setActiveTab('login')}
                activeOpacity={0.8}
              >
                {activeTab === 'login' ? (
                  <LinearGradient
                    colors={['#0026AE', '#0069E8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.activeTabGradient}
                  >
                    <Text style={styles.activeTabText}>Connexion</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.inactiveTab}>
                    <Text style={[styles.inactiveTabText, { color: theme.colors.textSecondary }]}>
                      Connexion
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Tab 2: Inscription */}
              <TouchableOpacity
                style={styles.tabButton}
                onPress={() => setActiveTab('signup')}
                activeOpacity={0.8}
              >
                {activeTab === 'signup' ? (
                  <LinearGradient
                    colors={['#0026AE', '#0069E8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.activeTabGradient}
                  >
                    <Text style={styles.activeTabText}>Inscription</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.inactiveTab}>
                    <Text style={[styles.inactiveTabText, { color: theme.colors.textSecondary }]}>
                      Inscription
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* MAIN CARD CONTAINER */}
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              {activeTab === 'login' ? (
                <LoginForm onSwitchToSignup={() => setActiveTab('signup')} />
              ) : (
                <RegisterMultiStep onSwitchToLogin={() => setActiveTab('login')} />
              )}
            </View>

            {/* Minimal Footer */}
            <Text style={[styles.footerText, { color: theme.colors.textMuted }]}>
              Sprintflow • Athlétisme & Haute Performance
            </Text>
            </ScrollView>
          </KeyboardAvoidingView>
        ) : (
          <View style={styles.keyboardView}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
            >
              {/* HERO BRAND HEADER */}
              <View style={styles.heroSection}>
                <View style={styles.logoWrapper}>
                  <SprintyLogo width={180} height={46} />
                </View>
                <Text style={[styles.tagline, { color: theme.colors.textSecondary }]}>
                  L'accélération de votre performance <Text style={{ color: theme.colors.accent }}>⚡</Text>
                </Text>
              </View>

              {/* SEGMENTED SWITCHER (Connexion | Inscription) */}
              <View style={[styles.switcherContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                {/* Tab 1: Connexion */}
                <TouchableOpacity
                  style={styles.tabButton}
                  onPress={() => setActiveTab('login')}
                  activeOpacity={0.8}
                >
                  {activeTab === 'login' ? (
                    <LinearGradient
                      colors={['#0026AE', '#0069E8']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.activeTabGradient}
                    >
                      <Text style={styles.activeTabText}>Connexion</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.inactiveTab}>
                      <Text style={[styles.inactiveTabText, { color: theme.colors.textSecondary }]}>
                        Connexion
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Tab 2: Inscription */}
                <TouchableOpacity
                  style={styles.tabButton}
                  onPress={() => setActiveTab('signup')}
                  activeOpacity={0.8}
                >
                  {activeTab === 'signup' ? (
                    <LinearGradient
                      colors={['#0026AE', '#0069E8']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.activeTabGradient}
                    >
                      <Text style={styles.activeTabText}>Inscription</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.inactiveTab}>
                      <Text style={[styles.inactiveTabText, { color: theme.colors.textSecondary }]}>
                        Inscription
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* MAIN CARD CONTAINER */}
              <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                {activeTab === 'login' ? (
                  <LoginForm onSwitchToSignup={() => setActiveTab('signup')} />
                ) : (
                  <RegisterMultiStep onSwitchToLogin={() => setActiveTab('login')} />
                )}
              </View>

              {/* Minimal Footer */}
              <Text style={[styles.footerText, { color: theme.colors.textMuted }]}>
                Sprintflow • Athlétisme & Haute Performance
              </Text>
            </ScrollView>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  glowTopContainer: {
    position: 'absolute',
    top: -50,
    left: 0,
    right: 0,
    height: 320,
    alignItems: 'center',
  },
  glowGradient: {
    width: '100%',
    height: '100%',
    borderBottomLeftRadius: 180,
    borderBottomRightRadius: 180,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  switcherContainer: {
    flexDirection: 'row',
    width: '100%',
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
    shadowColor: '#0026AE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    height: '100%',
  },
  activeTabGradient: {
    flex: 1,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0026AE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  activeTabText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  inactiveTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inactiveTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 26,
    shadowColor: '#0026AE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    marginBottom: 24,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },
});
