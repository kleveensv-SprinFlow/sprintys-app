import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../core/theme';
import { glassCard } from '../../core/glass';
import { goBack } from '../../core/navigation';
import { Header } from '../../shared/components/Header';
import { GlassScreen } from '../../shared/components/GlassScreen';
import { GlassSheen } from '../../shared/components/GlassSheen';
import { PressableScale } from '../../shared/components/PressableScale';
import { Button } from '../../shared/components/Button';
import { EmptyState } from '../../shared/components/EmptyState';
import { SkeletonCard } from '../../shared/components/Skeleton';
import { useFrostedHeader } from '../../shared/hooks/useFrostedHeader';
import { confirmAsync, toast } from '../../shared/feedback/appAlert';
import {
  coachMemoryService,
  groupMemory,
  INTRO_PROMPT,
  MEMORY_CATEGORY_LABELS,
  MEMORY_CATEGORY_ORDER,
  MEMORY_CONTENT_MAX,
  MEMORY_MAX,
  MemoryCategory,
  MemoryItem,
} from '../../services/coachMemoryService';

const SOURCE_LABELS: Record<string, string> = {
  presentation: 'Présentation',
  conversation: 'Conversation',
  programmation: 'Tes séances',
  import: 'Ancienne philosophie',
  manuel: 'Ajouté par toi',
};

/** « Ce que Sprinty sait de moi » : le coach voit, corrige, ajoute et efface tout ce que Sprinty garde en tête. */
export function CoachMemoryScreen() {
  const router = useRouter();
  const { scrollY, scrollProps } = useFrostedHeader();
  const [items, setItems] = useState<MemoryItem[] | null>(null);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState('');
  const [newCat, setNewCat] = useState<MemoryCategory>('methodes');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      setItems(await coachMemoryService.list());
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveEdit = async (id: string) => {
    const text = draft.trim();
    if (!text) return;
    setBusy(true);
    try {
      await coachMemoryService.update(id, { content: text });
      setEditing(null);
      await load();
    } catch {
      toast('error', 'La modification n’a pas abouti. Réessaie.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: MemoryItem) => {
    const ok = await confirmAsync({ title: 'Oublier cet élément ?', message: item.content, confirmText: 'Oublier', destructive: true });
    if (!ok) return;
    try {
      await coachMemoryService.remove(item.id);
      setItems((list) => (list ?? []).filter((i) => i.id !== item.id));
    } catch {
      toast('error', 'La suppression n’a pas abouti. Réessaie.');
    }
  };

  const add = async () => {
    const text = newText.trim();
    if (!text) return;
    setBusy(true);
    try {
      await coachMemoryService.addMany([{ category: newCat, content: text, source: 'manuel' }]);
      setNewText('');
      setAdding(false);
      await load();
    } catch (e) {
      toast('error', coachMemoryService.isFull(e) ? `La mémoire est pleine (${MEMORY_MAX} éléments) : oublie d’abord un élément.` : 'L’ajout n’a pas abouti. Réessaie.');
    } finally {
      setBusy(false);
    }
  };

  const clearAll = async () => {
    const ok = await confirmAsync({
      title: 'Tout effacer ?',
      message: 'Sprinty oubliera tout ce qu’il sait de ta façon d’entraîner. Tu pourras refaire la présentation.',
      confirmText: 'Tout effacer',
      destructive: true,
    });
    if (!ok) return;
    try {
      await coachMemoryService.clearAll();
      await coachMemoryService.setIntroStatus(null).catch(() => undefined);
      setItems([]);
    } catch {
      toast('error', 'L’effacement n’a pas abouti. Réessaie.');
    }
  };

  const redoIntro = () =>
    router.push({ pathname: '/chat/sprinty', params: { initialPrompt: INTRO_PROMPT, ts: String(Date.now()) } } as never);

  const groups = groupMemory(items ?? []);

  return (
    <GlassScreen>
      <Header title="Ce que Sprinty sait de moi" showBackButton onBackPress={() => goBack(router, '/(coach)/profile')} scrollY={scrollY} />
      <Animated.ScrollView {...scrollProps} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          Sprinty s’appuie sur ces éléments pour te proposer des conseils et des séances à ta façon. Rien n’est retenu sans ton accord.
        </Text>

        {items == null && !error && (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {error && (
          <View style={[glassCard, styles.card]}>
            <EmptyState compact icon="wifi-off" title="Impossible de charger" message="Vérifie ta connexion et réessaie." actionLabel="Réessayer" onAction={load} />
          </View>
        )}

        {items != null && items.length === 0 && !adding && (
          <View style={[glassCard, styles.card]}>
            <GlassSheen radius={22} />
            <EmptyState
              compact
              icon="user-check"
              title="Sprinty ne te connaît pas encore"
              message="Fais connaissance en 2 minutes : spécialité, objectifs, semaine type, méthodes."
              actionLabel="Faire connaissance"
              onAction={redoIntro}
            />
          </View>
        )}

        {groups.map((g) => (
          <View key={g.category}>
            <Text style={styles.section}>{g.label.toUpperCase()}</Text>
            <View style={[glassCard, styles.card]}>
              <GlassSheen radius={22} />
              {g.items.map((it, i) => (
                <View key={it.id} style={[styles.item, i > 0 && styles.itemBorder]}>
                  {editing === it.id ? (
                    <>
                      <TextInput
                        style={styles.input}
                        value={draft}
                        onChangeText={setDraft}
                        multiline
                        maxLength={MEMORY_CONTENT_MAX}
                        autoFocus
                      />
                      <View style={styles.rowActions}>
                        <PressableScale haptic="selection" onPress={() => setEditing(null)} hitSlop={8}>
                          <Text style={styles.cancel}>Annuler</Text>
                        </PressableScale>
                        <PressableScale haptic="light" onPress={() => saveEdit(it.id)} disabled={busy || !draft.trim()} hitSlop={8}>
                          <Text style={styles.save}>Enregistrer</Text>
                        </PressableScale>
                      </View>
                    </>
                  ) : (
                    <View style={styles.itemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemText}>{it.content}</Text>
                        <Text style={styles.itemSource}>{SOURCE_LABELS[it.source] ?? ''}</Text>
                      </View>
                      <PressableScale
                        haptic="selection"
                        onPress={() => {
                          setEditing(it.id);
                          setDraft(it.content);
                        }}
                        hitSlop={8}
                        accessibilityLabel="Modifier"
                        style={styles.iconBtn}
                      >
                        <Feather name="edit-2" size={16} color={theme.colors.textSecondary} />
                      </PressableScale>
                      <PressableScale haptic="selection" onPress={() => remove(it)} hitSlop={8} accessibilityLabel="Oublier" style={styles.iconBtn}>
                        <Feather name="trash-2" size={16} color={theme.colors.error} />
                      </PressableScale>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {items != null && (
          <View style={{ gap: 10, marginTop: 18 }}>
            {adding ? (
              <View style={[glassCard, styles.card, { gap: 10 }]}>
                <View style={styles.chips}>
                  {MEMORY_CATEGORY_ORDER.map((c) => (
                    <PressableScale
                      key={c}
                      haptic="selection"
                      onPress={() => setNewCat(c)}
                      style={[styles.chip, newCat === c && styles.chipOn]}
                      accessibilityState={{ selected: newCat === c }}
                    >
                      <Text style={[styles.chipText, newCat === c && styles.chipTextOn]}>{MEMORY_CATEGORY_LABELS[c]}</Text>
                    </PressableScale>
                  ))}
                </View>
                <TextInput
                  style={styles.input}
                  value={newText}
                  onChangeText={setNewText}
                  placeholder="Ex. : Je ne fais jamais de 300 m avant décembre."
                  placeholderTextColor={theme.colors.textMuted}
                  multiline
                  maxLength={MEMORY_CONTENT_MAX}
                  autoFocus
                />
                <View style={styles.rowActions}>
                  <PressableScale haptic="selection" onPress={() => setAdding(false)} hitSlop={8}>
                    <Text style={styles.cancel}>Annuler</Text>
                  </PressableScale>
                  <PressableScale haptic="light" onPress={add} disabled={busy || !newText.trim()} hitSlop={8}>
                    <Text style={styles.save}>Ajouter</Text>
                  </PressableScale>
                </View>
              </View>
            ) : (
              (items.length < MEMORY_MAX) && <Button title="Ajouter un élément" variant="secondary" onPress={() => setAdding(true)} />
            )}
            {items.length > 0 && <Button title="Refaire la présentation" variant="secondary" onPress={redoIntro} />}
            {items.length > 0 && (
              <PressableScale haptic="light" onPress={clearAll} style={styles.clear} accessibilityRole="button">
                <Text style={styles.clearText}>Tout effacer</Text>
              </PressableScale>
            )}
            <Text style={styles.foot}>{`${items.length} / ${MEMORY_MAX} éléments`}</Text>
          </View>
        )}
      </Animated.ScrollView>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 48 },
  intro: { fontSize: 14, lineHeight: 20, color: theme.colors.textSecondary, marginBottom: 8 },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: theme.colors.textSecondary, marginTop: 18, marginBottom: 8, marginLeft: 4 },
  card: { padding: 14, borderRadius: 22 },
  item: { paddingVertical: 10 },
  itemBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.hairline },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  itemText: { fontSize: 15, lineHeight: 21, color: theme.colors.text },
  itemSource: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  input: {
    minHeight: 60,
    fontSize: 15,
    lineHeight: 21,
    color: theme.colors.text,
    backgroundColor: theme.colors.glassFill,
    borderRadius: 12,
    padding: 10,
    textAlignVertical: 'top',
  },
  rowActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 8 },
  cancel: { fontSize: 15, fontWeight: '600', color: theme.colors.textSecondary },
  save: { fontSize: 15, fontWeight: '700', color: theme.colors.sprintyBlue },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: theme.colors.glassFill },
  chipOn: { backgroundColor: theme.colors.sprintyBlue },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  chipTextOn: { color: '#FFFFFF' },
  clear: { alignItems: 'center', paddingVertical: 12 },
  clearText: { fontSize: 15, fontWeight: '700', color: theme.colors.error },
  foot: { fontSize: 12, color: theme.colors.textMuted, textAlign: 'center' },
});
