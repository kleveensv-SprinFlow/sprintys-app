import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../core/theme';
import { SprintyLogo } from '../../../shared/components/SprintyLogo';
import { LoginForm } from './LoginForm';
import { RegisterMultiStep } from './RegisterMultiStep';
import { GlowBackground } from '../../../shared/components/GlowBackground';
import { glassSurface } from '../../../core/glass';
import { GlassSheen } from '../../../shared/components/GlassSheen';

interface AuthScreenProps {
  initialTab?: 'login' | 'signup';
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ initialTab = 'login' }) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialTab);

  const handleTabChange = (tab: 'login' | 'signup') => {
    if (activeTab !== tab) {
      Haptics.selectionAsync().catch(() => {});
      setActiveTab(tab);
    }
  };

  const Content = (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="always"
      showsVerticalScrollIndicator={false}
    >
      {/* Brand Hero Header */}
      <View style={styles.heroSection}>
        <View style={styles.logoWrapper}>
          <SprintyLogo width={180} height={46} />
        </View>
        <Text style={[styles.tagline, { color: theme.colors.textSecondary }]}>
          L'accélération de votre performance
        </Text>
      </View>

      {/* Modern Athletic Segmented Switcher */}
      <View style={[styles.switcherContainer, { backgroundColor: theme.colors.glassFill }]}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'login' && styles.activeTabButton,
          ]}
          onPress={() => handleTabChange('login')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'login'
                ? { color: '#0F172A', fontWeight: '700' }
                : { color: theme.colors.textSecondary, fontWeight: '500' },
            ]}
          >
            Connexion
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'signup' && styles.activeTabButton,
          ]}
          onPress={() => handleTabChange('signup')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'signup'
                ? { color: '#0F172A', fontWeight: '700' }
                : { color: theme.colors.textSecondary, fontWeight: '500' },
            ]}
          >
            Inscription
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Authentication Card */}
      <View
        style={[
          styles.card,
          glassSurface,
        ]}
      >
        <GlassSheen radius={20} />
        {activeTab === 'login' ? (
          <LoginForm onSwitchToSignup={() => handleTabChange('signup')} />
        ) : (
          <RegisterMultiStep onSwitchToLogin={() => handleTabChange('login')} />
        )}
      </View>

      {/* Minimal Athletic Footer */}
      <Text style={[styles.footerText, { color: theme.colors.textMuted }]}>
        Sprintys · Athlétisme & performance
      </Text>
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.backdrop }]}>
      <GlowBackground />

      <SafeAreaView style={styles.safeArea}>
        {Platform.OS === 'ios' ? (
          <KeyboardAvoidingView behavior="padding" style={styles.keyboardView}>
            {Content}
          </KeyboardAvoidingView>
        ) : (
          <View style={styles.keyboardView}>{Content}</View>
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
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 90,
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 6,
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
    height: 44,
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  tabButton: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9,
  },
  activeTabButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    letterSpacing: -0.2,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: 0.1,
  },
});
