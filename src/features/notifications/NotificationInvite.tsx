import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../core/theme';
import { glassCard } from '../../core/glass';
import { GlassSheen } from '../../shared/components/GlassSheen';
import { PressableScale } from '../../shared/components/PressableScale';
import { toast } from '../../shared/feedback/appAlert';
import { useAuthStore } from '../../store/authStore';
import { useOnboardingStore } from '../../store/onboardingStore';
import { dismissInvite, enableNotifications, shouldInvite } from '../../services/notifications';

/** One-time, dismissible invitation to turn notifications on. Never shown over the welcome tour. */
export const NotificationInvite: React.FC<{ role: 'athlete' | 'coach' }> = ({ role }) => {
  const theme = useTheme();
  const userId = useAuthStore((s) => s.user?.id);
  const tourVisible = useOnboardingStore((s) => s.visible);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (userId) shouldInvite(userId).then(setShow);
  }, [userId]);

  if (!show || tourVisible || !userId) return null;

  const accept = async () => {
    if (busy) return;
    setBusy(true);
    const r = await enableNotifications(userId, role);
    setBusy(false);
    setShow(false);
    if (r === 'on') toast('success', role === 'athlete' ? 'Tu seras prévenu avant tes séances.' : 'Notifications activées.');
    else if (r === 'denied') {
      toast('info', 'Autorise les notifications pour Sprintys dans les réglages de ton téléphone.');
      Linking.openSettings().catch(() => undefined);
    }
  };

  const later = async () => {
    setShow(false);
    await dismissInvite(userId);
  };

  return (
    <View style={[glassCard, styles.card]}>
      <GlassSheen radius={22} />
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: 'rgba(0, 105, 232, 0.1)' }]}>
          <Feather name="bell" size={18} color={theme.colors.sprintyBlue} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {role === 'athlete' ? 'Un rappel avant tes séances ?' : 'Être prévenu pour ton équipe ?'}
          </Text>
          <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
            {role === 'athlete'
              ? 'Une notification avant chaque séance prévue par ton coach. Tu peux l’arrêter à tout moment.'
              : 'Alertes de tes athlètes et nouveautés de ton groupe. Tu peux les arrêter à tout moment.'}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <PressableScale onPress={later} accessibilityRole="button" style={styles.later}>
          <Text style={[styles.laterText, { color: theme.colors.textSecondary }]}>Plus tard</Text>
        </PressableScale>
        <PressableScale onPress={accept} accessibilityRole="button" style={[styles.accept, { backgroundColor: theme.colors.sprintyBlue }]}>
          <Text style={styles.acceptText}>Activer</Text>
        </PressableScale>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 14 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800' },
  text: { fontSize: 13, fontWeight: '500', lineHeight: 18, marginTop: 3 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 12 },
  later: { paddingHorizontal: 14, paddingVertical: 10 },
  laterText: { fontSize: 14, fontWeight: '700' },
  accept: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999 },
  acceptText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
