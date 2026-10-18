import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../../core/theme';
import { PressableScale } from '../../../shared/components/PressableScale';
import { Button } from '../../../shared/components/Button';
import { toast } from '../../../shared/feedback/appAlert';
import { coachMemoryService, MEMORY_CATEGORY_LABELS, MemoryCategory, MemorySource } from '../../../services/coachMemoryService';
import type { UiBlock } from '../types';

type Data = Extract<UiBlock, { type: 'memory_proposal' }>;

/** « Je retiens… » : le coach coche ce que Sprinty garde. Rien n'est enregistré sans lui. */
export function MemoryProposalBlock({ data, onPatch }: { data: Data; onPatch: (patch: Record<string, unknown>) => void }) {
  const router = useRouter();
  const [checked, setChecked] = useState<boolean[]>(() => data.items.map(() => true));
  const [busy, setBusy] = useState(false);
  const n = checked.filter(Boolean).length;

  const save = async () => {
    const keep = data.items.filter((_, i) => checked[i]);
    setBusy(true);
    try {
      const saved = await coachMemoryService.addMany(
        keep.map((i) => ({ category: i.category as MemoryCategory, content: i.content, source: i.source as MemorySource }))
      );
      await coachMemoryService.setIntroStatus('done').catch(() => undefined);
      onPatch({ applied: true, kept: saved });
      toast('success', 'Sprinty s’en servira dans ses conseils et ses séances.', saved > 1 ? `${saved} éléments retenus` : 'Élément retenu');
    } catch (e) {
      toast(
        'error',
        coachMemoryService.isFull(e) ? 'La mémoire est pleine : fais du tri dans « Ce que Sprinty sait de moi ».' : 'L’enregistrement n’a pas abouti. Réessaie.',
        'Oups'
      );
    } finally {
      setBusy(false);
    }
  };

  if (data.applied) {
    return (
      <View style={styles.card}>
        <Text style={styles.kicker}>MÉMOIRE DE SPRINTY</Text>
        <View style={styles.done}>
          <Feather name="check-circle" size={16} color={theme.colors.success} />
          <Text style={styles.doneText}>{data.kept ? `${data.kept} élément${data.kept > 1 ? 's' : ''} retenu${data.kept > 1 ? 's' : ''}` : 'Rien retenu'}</Text>
          <PressableScale haptic="selection" onPress={() => router.push('/(coach)/sprinty-memory' as any)} hitSlop={8}>
            <Text style={styles.link}>Voir</Text>
          </PressableScale>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>JE RETIENS ?</Text>
      <Text style={styles.sub}>Coche ce que je dois garder en tête pour la suite.</Text>
      {data.items.map((it, i) => (
        <PressableScale
          key={`${i}-${it.content}`}
          haptic="selection"
          activeScale={0.98}
          onPress={() => setChecked((c) => c.map((v, j) => (j === i ? !v : v)))}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: checked[i] }}
          style={styles.row}
        >
          <Feather name={checked[i] ? 'check-square' : 'square'} size={20} color={checked[i] ? theme.colors.sprintyBlue : theme.colors.textMuted} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cat}>{MEMORY_CATEGORY_LABELS[it.category as MemoryCategory] ?? 'Autre'}</Text>
            <Text style={styles.content}>{it.content}</Text>
          </View>
        </PressableScale>
      ))}
      <Button
        title={n > 0 ? `Retenir (${n})` : 'Ne rien retenir'}
        onPress={n > 0 ? save : () => onPatch({ applied: true, kept: 0 })}
        loading={busy}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.hairline,
    padding: 14,
    gap: 10,
  },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: theme.colors.sprintyBlue },
  sub: { fontSize: 13, color: theme.colors.textSecondary },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 4 },
  cat: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  content: { fontSize: 15, lineHeight: 20, color: theme.colors.text, marginTop: 1 },
  done: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  doneText: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.colors.text },
  link: { fontSize: 14, fontWeight: '700', color: theme.colors.sprintyBlue },
});
