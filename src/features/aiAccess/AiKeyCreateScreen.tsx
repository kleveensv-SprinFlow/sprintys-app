import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../core/theme';
import { goBack } from '../../core/navigation';
import { Header } from '../../shared/components/Header';
import { GlassScreen } from '../../shared/components/GlassScreen';
import { PressableScale } from '../../shared/components/PressableScale';
import { SegmentedControl } from '../../shared/components/SegmentedControl';
import { Button } from '../../shared/components/Button';
import { useFrostedHeader } from '../../shared/hooks/useFrostedHeader';
import { toast } from '../../shared/feedback/appAlert';
import {
  AI_KEY_DURATIONS,
  AI_PRESETS,
  ALL_AI_SCOPES,
  AiGuideKind,
  AiScope,
  CreatedAiKey,
  DEFAULT_AI_SCOPES,
  aiAccessService,
  guideForLabel,
} from '../../services/aiAccessService';
import { ScopeSwitches } from './components/ScopeSwitches';
import { AiGuide } from './components/AiGuide';
import { CopyField, Section } from './components/ui';
import { formatDate } from './format';

type DurationKey = '7' | '30' | '365' | 'never';
const DURATIONS: { key: DurationKey; label: string; days: number | null }[] = AI_KEY_DURATIONS.map((d) => ({
  key: (d.days == null ? 'never' : String(d.days)) as DurationKey,
  label: d.days === 7 ? '7 j' : d.days === 30 ? '30 j' : d.label,
  days: d.days,
}));

/** New key in three choices (which AI, what it reads, how long), then the key and the setup steps for that AI. */
export function AiKeyCreateScreen() {
  const router = useRouter();
  const { scrollY, scrollProps } = useFrostedHeader();
  const [preset, setPreset] = useState('ChatGPT');
  const [customName, setCustomName] = useState('');
  const [allowed, setAllowed] = useState<AiScope[]>(ALL_AI_SCOPES);
  const [scopes, setScopes] = useState<AiScope[]>(DEFAULT_AI_SCOPES);
  const [duration, setDuration] = useState<DurationKey>('30');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<CreatedAiKey | null>(null);
  const [guide, setGuide] = useState<AiGuideKind>('chatgpt');

  useEffect(() => {
    aiAccessService
      .allowedScopes()
      .then((a) => {
        setAllowed(a);
        setScopes((v) => v.filter((s) => a.includes(s)));
      })
      .catch(() => undefined);
  }, []);

  const label = preset === 'Autre' ? customName.trim() || 'Mon IA' : preset;
  const done = () => goBack(router, '/(athlete)/ai-access');

  const create = async () => {
    const chosen = scopes.filter((s) => allowed.includes(s));
    if (!chosen.length) {
      toast('warning', 'Active au moins une catégorie.');
      return;
    }
    setBusy(true);
    try {
      const days = DURATIONS.find((d) => d.key === duration)?.days ?? 30;
      const res = await aiAccessService.create(label, chosen, days);
      setGuide(guideForLabel(label));
      setCreated(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? '');
      toast(
        'error',
        /Limite/.test(msg)
          ? 'Tu as déjà 5 clés actives. Révoques-en une d’abord.'
          : /majeurs/.test(msg)
            ? 'Avant 18 ans, ton poids, ta forme et ta nutrition restent privés.'
            : 'Impossible de créer la clé. Réessaie.',
      );
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <GlassScreen>
        <Header title="Clé créée" showBackButton onBackPress={done} scrollY={scrollY} />
        <Animated.ScrollView {...scrollProps} contentContainerStyle={styles.content}>
          <View style={styles.success}>
            <View style={styles.successIcon}>
              <Feather name="check" size={28} color={theme.colors.success} />
            </View>
            <Text style={styles.successTitle}>Ta clé pour {label}</Text>
            <Text style={styles.successText}>Copie-la maintenant : elle ne s’affichera plus.</Text>
          </View>

          <Section footer={created.expires_at ? `Valable jusqu’au ${formatDate(created.expires_at)}.` : 'Sans expiration : révoque-la quand tu ne t’en sers plus.'}>
            <View style={styles.pad}>
              <CopyField value={created.key} what="Clé" />
            </View>
          </Section>

          <Text style={styles.sectionTitle}>BRANCHER TON IA</Text>
          <AiGuide kind={guide} onKindChange={setGuide} apiKey={created.key} />

          <Button title="Terminé" onPress={done} style={styles.cta} />
        </Animated.ScrollView>
      </GlassScreen>
    );
  }

  return (
    <GlassScreen>
      <Header title="Nouvelle clé" showBackButton onBackPress={done} scrollY={scrollY} />
      <Animated.ScrollView {...scrollProps} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Section title="Pour quelle IA ?">
          <View style={[styles.pad, styles.chips]} accessibilityRole="radiogroup">
            {AI_PRESETS.map((p) => {
              const on = p.label === preset;
              return (
                <PressableScale
                  key={p.label}
                  haptic="selection"
                  onPress={() => setPreset(p.label)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{p.label}</Text>
                </PressableScale>
              );
            })}
          </View>
          {preset === 'Autre' && (
            <TextInput
              style={styles.input}
              value={customName}
              onChangeText={setCustomName}
              placeholder="Nom de l’IA"
              placeholderTextColor={theme.colors.textMuted}
              maxLength={40}
              autoFocus
            />
          )}
        </Section>

        <ScopeSwitches value={scopes} allowed={allowed} onToggle={(s) => setScopes((v) => (v.includes(s) ? v.filter((x) => x !== s) : [...v, s]))} disabled={busy} />

        <Section title="Durée" footer="Tu peux changer ce qui est partagé ou révoquer la clé à tout moment.">
          <View style={styles.pad}>
            <SegmentedControl options={DURATIONS.map(({ key, label: l }) => ({ key, label: l }))} value={duration} onChange={setDuration} />
          </View>
        </Section>

        <Button title="Créer la clé" onPress={create} loading={busy} disabled={busy} style={styles.cta} />
      </Animated.ScrollView>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.xxxl },
  pad: { paddingVertical: theme.spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  chip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: theme.radius.full, backgroundColor: theme.colors.glassFill },
  chipOn: { backgroundColor: theme.colors.sprintyBlue },
  chipText: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  chipTextOn: { color: theme.colors.surface },
  input: {
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.glassFill,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    marginBottom: theme.spacing.sm,
  },
  cta: { marginTop: theme.spacing.sm },
  success: { alignItems: 'center', paddingVertical: theme.spacing.lg },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${theme.colors.success}1A`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  successTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4, color: theme.colors.text },
  successText: { fontSize: 15, color: theme.colors.textSecondary, marginTop: 6, textAlign: 'center' },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: theme.colors.textSecondary, marginBottom: 8, paddingHorizontal: 4 },
});
