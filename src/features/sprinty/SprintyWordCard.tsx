import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../core/theme';
import { glassCard } from '../../core/glass';
import { PressableScale } from '../../shared/components/PressableScale';
import { useAuthStore } from '../../store/authStore';
import { useCheckInStore } from '../../store/checkInStore';
import { SprintyAvatar } from './avatar/SprintyAvatar';
import { computeSprintyWord } from './sprintyWord';

const localDay = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/**
 * Accueil de l'athlète : une phrase de Sprinty par jour, seulement s'il a quelque chose d'utile à dire.
 * Toucher la carte ouvre le chat avec la question déjà écrite ; la croix la masque pour la journée.
 */
export function SprintyWordCard() {
  const router = useRouter();
  const uid = useAuthStore((s) => s.user?.id);
  const history = useCheckInStore((s) => s.history);
  const loaded = useCheckInStore((s) => s.historyLoaded);
  const today = localDay();
  const [hidden, setHidden] = useState(true); // masquée tant qu'on ne sait pas si elle a été fermée aujourd'hui
  const dismissKey = uid ? `sprinty-word-hidden:${uid}:${today}` : null;

  useEffect(() => {
    if (!dismissKey) return;
    AsyncStorage.getItem(dismissKey)
      .then((v) => setHidden(v === '1'))
      .catch(() => setHidden(false));
  }, [dismissKey]);

  const word = useMemo(() => (loaded ? computeSprintyWord(history, today) : null), [history, loaded, today]);
  if (!word || hidden) return null;

  const open = () => router.push({ pathname: '/chat/sprinty', params: { initialPrompt: word.prompt, ts: String(Date.now()) } } as never);
  const dismiss = () => {
    setHidden(true);
    if (dismissKey) AsyncStorage.setItem(dismissKey, '1').catch(() => undefined);
  };

  return (
    <View style={[glassCard, styles.card]}>
      <PressableScale haptic="selection" activeScale={0.985} onPress={open} style={styles.body} accessibilityRole="button" accessibilityLabel={`Sprinty : ${word.text} Appuie pour en parler.`}>
        <SprintyAvatar size={64} mood={word.mood} style={styles.avatar} />
        <View style={styles.textCol}>
          <Text style={styles.kicker}>LE MOT DE SPRINTY</Text>
          <Text style={styles.text}>{word.text}</Text>
          <Text style={styles.cta}>Demander à Sprinty</Text>
        </View>
      </PressableScale>
      <PressableScale haptic="selection" onPress={dismiss} style={styles.close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Masquer pour aujourd’hui">
        <Feather name="x" size={14} color={theme.colors.textSecondary} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  body: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingRight: 40 },
  avatar: { marginLeft: -4 },
  textCol: { flex: 1, gap: 2 },
  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 0.7, color: theme.colors.sprintyBlue },
  text: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: theme.colors.text },
  cta: { marginTop: 4, fontSize: 13, fontWeight: '700', color: theme.colors.sprintyBlue },
  close: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.glassFill },
});
