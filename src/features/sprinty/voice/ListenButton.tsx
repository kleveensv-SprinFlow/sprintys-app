import React from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';
import { PressableScale } from '../../../shared/components/PressableScale';
import type { MessagePart } from '../types';
import { partsToSpeech } from './speechText';
import { useSprintyVoice } from './sprintyVoice';

/** « Écouter » sous une réponse de Sprinty : lecture par la voix IA, appui de nouveau pour arrêter. */
export function ListenButton({ id, parts, content }: { id: string; parts?: MessagePart[]; content: string }) {
  const loading = useSprintyVoice((s) => s.loadingId === id);
  const playing = useSprintyVoice((s) => s.playingId === id);
  const onPress = () => {
    const v = useSprintyVoice.getState();
    if (loading || playing) v.stop();
    else v.play(id, partsToSpeech(parts, content));
  };
  return (
    <PressableScale
      haptic="light"
      onPress={onPress}
      style={[styles.btn, playing && styles.on]}
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Arrêter la lecture' : 'Écouter la réponse'}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.sprintyBlue} />
      ) : (
        <Feather name={playing ? 'square' : 'volume-2'} size={13} color={playing ? '#FFFFFF' : theme.colors.sprintyBlue} />
      )}
      <Text style={[styles.text, playing && styles.textOn]}>{playing ? 'Stop' : loading ? 'Préparation…' : 'Écouter'}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 105, 232, 0.08)',
  },
  on: { backgroundColor: theme.colors.sprintyBlue },
  text: { fontSize: 13, fontWeight: '700', color: theme.colors.sprintyBlue },
  textOn: { color: '#FFFFFF' },
});
