import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../core/theme';
import { PressableScale } from '../../shared/components/PressableScale';
import { useConsentStore } from '../../store/consentStore';
import { ConsentLink } from './ConsentCheck';

const POINTS: { icon: keyof typeof Feather.glyphMap; text: string }[] = [
  { icon: 'send', text: 'Ton message, ta photo ou ta description de repas, et un résumé de ton contexte sont envoyés à OpenAI (États-Unis) pour générer la réponse.' },
  { icon: 'shield', text: 'Ces données ne servent pas à entraîner leurs modèles.' },
  { icon: 'alert-triangle', text: 'L’IA peut se tromper : ce n’est jamais un avis médical.' },
];

/** Asked once, the first time an AI feature is used. Rendered in the root layout. */
export function AIConsentSheet() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const open = useConsentStore((s) => s.aiPromptOpen);
  const resolve = useConsentStore((s) => s.resolveAIPrompt);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) setBusy(false);
  }, [open]);

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => resolve(false)} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={() => resolve(false)} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 4 }]}>
          <View style={styles.handle} />
          <LinearGradient
            colors={[theme.colors.sprintyBlue, theme.colors.sprintyCyan]}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={styles.badge}
          >
            <Feather name="zap" size={24} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.title}>Activer les fonctions d’IA</Text>
          <Text style={styles.subtitle}>Assistant Sprinty, analyse de repas et conseils météo.</Text>

          <View style={styles.points}>
            {POINTS.map((p) => (
              <View key={p.icon} style={styles.point}>
                <Feather name={p.icon} size={16} color={theme.colors.sprintyBlue} style={{ marginTop: 2 }} />
                <Text style={styles.pointText}>{p.text}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.small}>
            Tu peux retirer cet accord dans les réglages. Détails dans la{' '}
            <ConsentLink
              label="politique de confidentialité"
              onPress={() => {
                resolve(false);
                router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } });
              }}
            />
            .
          </Text>

          <PressableScale
            haptic="medium"
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              await resolve(true);
            }}
            style={styles.button}
          >
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>J’accepte</Text>}
          </PressableScale>
          <PressableScale haptic="selection" onPress={() => resolve(false)} style={styles.secondary}>
            <Text style={styles.secondaryText}>Pas maintenant</Text>
          </PressableScale>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: theme.colors.border, marginBottom: 16 },
  badge: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4, color: theme.colors.text },
  subtitle: { fontSize: 15, color: theme.colors.textSecondary, marginTop: 4, marginBottom: 16 },
  points: { gap: 12, marginBottom: 14 },
  point: { flexDirection: 'row', gap: 12 },
  pointText: { flex: 1, fontSize: 15, lineHeight: 21, color: theme.colors.text },
  small: { fontSize: 13, lineHeight: 18, color: theme.colors.textSecondary },
  button: {
    marginTop: 16,
    backgroundColor: theme.colors.sprintyBlue,
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  secondary: { alignItems: 'center', paddingVertical: 14 },
  secondaryText: { color: theme.colors.textSecondary, fontSize: 15, fontWeight: '700' },
});
