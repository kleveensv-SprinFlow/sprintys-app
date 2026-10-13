import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
import { SprintyLogo } from '../../../shared/components/SprintyLogo';
import { GlowBackground } from '../../../shared/components/GlowBackground';
import { GlassSheen } from '../../../shared/components/GlassSheen';
import { SegmentedControl } from '../../../shared/components/SegmentedControl';
import { LoginForm } from './LoginForm';
import { RegisterMultiStep } from './RegisterMultiStep';

type Tab = 'login' | 'signup';

export const AuthScreen: React.FC<{ initialTab?: Tab }> = ({ initialTab = 'login' }) => {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const fade = useRef(new Animated.Value(1)).current;

  // Soft cross-fade between login and signup
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [tab]);

  const openDoc = (doc: string) => router.push({ pathname: '/legal/[doc]', params: { doc } });

  return (
    <View style={styles.container}>
      <GlowBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <SprintyLogo width={170} height={44} />
              <Text style={styles.tagline}>L’athlétisme, de la séance à la performance</Text>
            </View>

            <SegmentedControl
              style={styles.switcher}
              options={[
                { key: 'login' as Tab, label: 'Connexion' },
                { key: 'signup' as Tab, label: 'Inscription' },
              ]}
              value={tab}
              onChange={setTab}
            />

            <Animated.View
              style={[
                glassCard,
                styles.card,
                { opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
              ]}
            >
              <GlassSheen radius={22} />
              {tab === 'login' ? (
                <LoginForm onSwitchToSignup={() => setTab('signup')} />
              ) : (
                <RegisterMultiStep onSwitchToLogin={() => setTab('login')} />
              )}
            </Animated.View>

            <Text style={styles.footer}>
              <Text style={styles.footerLink} onPress={() => openDoc('terms')}>
                Conditions
              </Text>
              {'  ·  '}
              <Text style={styles.footerLink} onPress={() => openDoc('privacy')}>
                Confidentialité
              </Text>
              {'  ·  '}
              <Text style={styles.footerLink} onPress={() => openDoc('notice')}>
                Mentions légales
              </Text>
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backdrop },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  hero: { alignItems: 'center', marginBottom: 22, marginTop: 8, gap: 10 },
  tagline: { fontSize: 15, fontWeight: '600', color: theme.colors.textSecondary, letterSpacing: -0.2 },
  switcher: { marginBottom: 14 },
  card: { paddingHorizontal: 20, paddingVertical: 22, marginBottom: 18 },
  footer: { textAlign: 'center', fontSize: 13, color: theme.colors.textMuted },
  footerLink: { color: theme.colors.textSecondary, fontWeight: '600' },
});
