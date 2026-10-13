import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../core/theme';
import { PressableScale } from '../../shared/components/PressableScale';
import { ConsentCheck } from './ConsentCheck';
import { FeedbackHost } from '../../shared/feedback/FeedbackHost';

const SHARED: { icon: keyof typeof Feather.glyphMap; label: string }[] = [
  { icon: 'calendar', label: 'Tes séances et performances' },
  { icon: 'coffee', label: 'Tes repas et objectifs nutrition' },
  { icon: 'trending-down', label: 'Ton poids et ta composition' },
  { icon: 'moon', label: 'Tes check-ins (sommeil, fatigue, stress)' },
  { icon: 'alert-circle', label: 'Tes douleurs, si tu as activé leur suivi' },
  { icon: 'zap', label: 'Une analyse de ces données par l’assistant Sprinty' },
];

interface Props {
  visible: boolean;
  teamName?: string | null;
  /** Called once the athlete agreed; the caller records the consent and sends the request. */
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

/** Tells the athlete exactly what the coach will see before joining a team. */
export function CoachSharingSheet({ visible, teamName, onConfirm, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) {
      setChecked(false);
      setBusy(false);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <FeedbackHost />
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 4 }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>{teamName ? `Rejoindre ${teamName}` : 'Rejoindre l’équipe'}</Text>
          <Text style={styles.subtitle}>Une fois ta demande acceptée, ton coach pourra voir :</Text>

          <View style={styles.list}>
            {SHARED.map((item) => (
              <View key={item.label} style={styles.item}>
                <View style={styles.itemIcon}>
                  <Feather name={item.icon} size={15} color={theme.colors.sprintyBlue} />
                </View>
                <Text style={styles.itemText}>{item.label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.note}>Tu peux quitter l’équipe à tout moment : ton coach n’aura alors plus accès à tes données.</Text>

          <ConsentCheck checked={checked} onToggle={() => setChecked((v) => !v)}>
            J’accepte ce partage avec mon coach.
          </ConsentCheck>

          <PressableScale
            haptic="medium"
            disabled={!checked || busy}
            onPress={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
            }}
            style={[styles.button, (!checked || busy) && { opacity: 0.4 }]}
          >
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Envoyer ma demande</Text>}
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
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: theme.colors.border, marginBottom: 14 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4, color: theme.colors.text },
  subtitle: { fontSize: 15, color: theme.colors.textSecondary, marginTop: 4, marginBottom: 12 },
  list: { gap: 10, marginBottom: 14 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: { flex: 1, fontSize: 15, color: theme.colors.text, fontWeight: '600' },
  note: { fontSize: 13, lineHeight: 18, color: theme.colors.textSecondary, marginBottom: 6 },
  button: {
    marginTop: 12,
    backgroundColor: theme.colors.sprintyBlue,
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
