import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TextInput, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
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
  AI_KEY_DURATIONS,
  AI_SCOPES,
  ALL_AI_SCOPES,
  AiAccessKey,
  AiScope,
  CreatedAiKey,
  aiAccessService,
  isActiveKey,
  promptForAi,
} from '../../services/aiAccessService';

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

const expiryText = (iso: string | null) => (iso ? `expire le ${formatDate(iso)}` : 'n’expire jamais');

function ScopeChecklist({ value, onToggle, disabled }: { value: AiScope[]; onToggle: (s: AiScope) => void; disabled?: boolean }) {
  return (
    <View>
      {AI_SCOPES.map((s, i) => {
        const on = value.includes(s.key);
        return (
          <PressableScale
            key={s.key}
            haptic="selection"
            onPress={() => onToggle(s.key)}
            disabled={disabled}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on, disabled }}
            accessibilityLabel={`${s.label} : ${s.detail}`}
            style={[styles.scopeRow, i > 0 && styles.rowBorder]}
          >
            <Feather name={on ? 'check-square' : 'square'} size={20} color={on ? theme.colors.sprintyBlue : theme.colors.textMuted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.scopeLabel}>{s.label}</Text>
              <Text style={styles.scopeDetail}>{s.detail}</Text>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

/** « Accès IA » : l'athlète crée une clé en lecture seule pour l'IA de son choix et coche ce qu'elle peut lire. */
export function AiAccessScreen() {
  const router = useRouter();
  const { scrollY, scrollProps } = useFrostedHeader();
  const [keys, setKeys] = useState<AiAccessKey[] | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState('');
  const [draftScopes, setDraftScopes] = useState<AiScope[]>(ALL_AI_SCOPES);
  const [days, setDays] = useState<number | null>(30);
  const [created, setCreated] = useState<CreatedAiKey | null>(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      setKeys(await aiAccessService.list());
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (list: AiScope[], s: AiScope) => (list.includes(s) ? list.filter((x) => x !== s) : [...list, s]);

  const create = async () => {
    if (!draftScopes.length) {
      toast('warning', 'Coche au moins une catégorie à partager.');
      return;
    }
    setBusy(true);
    try {
      const res = await aiAccessService.create(label.trim() || 'Mon IA', draftScopes, days);
      setCreated(res);
      setLabel('');
      setDraftScopes(ALL_AI_SCOPES);
      await load();
    } catch (e: any) {
      toast('error', /Limite/.test(e?.message ?? '') ? 'Tu as déjà 5 clés actives. Révoque-en une avant d’en créer une autre.' : 'Impossible de créer la clé. Réessaie.');
    } finally {
      setBusy(false);
    }
  };

  const updateScopes = async (k: AiAccessKey, s: AiScope) => {
    const next = toggle(k.scopes, s);
    setKeys((prev) => prev?.map((x) => (x.id === k.id ? { ...x, scopes: next } : x)) ?? prev);
    try {
      await aiAccessService.updateScopes(k.id, next);
    } catch {
      toast('error', 'Modification impossible. Réessaie.');
      load();
    }
  };

  const revoke = async (k: AiAccessKey) => {
    const ok = await confirmAsync({
      title: `Révoquer « ${k.label} » ?`,
      message: 'L’IA qui utilise cette clé ne pourra plus lire tes données. C’est immédiat et définitif.',
      confirmText: 'Révoquer',
      destructive: true,
    });
    if (!ok) return;
    try {
      await aiAccessService.revoke(k.id);
      if (created?.id === k.id) setCreated(null);
      toast('success', 'Clé révoquée.');
      load();
    } catch {
      toast('error', 'Révocation impossible. Réessaie.');
    }
  };

  const copy = async (text: string, what: string) => {
    await Clipboard.setStringAsync(text);
    toast('success', `${what} copié${what.endsWith('e') ? 'e' : ''}.`);
  };

  const active = (keys ?? []).filter(isActiveKey);
  const inactiveCount = (keys ?? []).length - active.length;

  return (
    <GlassScreen>
      <Header title="Accès IA" showBackButton onBackPress={() => goBack(router, '/(athlete)/settings')} scrollY={scrollY} />
      <Animated.ScrollView {...scrollProps} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          Crée une clé personnelle pour que l’IA de ton choix (ChatGPT, Claude, Gemini…) lise tes données directement, sans captures d’écran. Elle ne peut que lire, uniquement ce que tu coches, jamais ton nom ni ton e-mail. Tes données sont alors envoyées à ce service : vérifie ses conditions.
        </Text>

        {created && (
          <View style={[glassCard, styles.card, styles.createdCard]}>
            <GlassSheen radius={22} />
            <View style={styles.titleRow}>
              <Feather name="key" size={18} color={theme.colors.sprintyBlue} />
              <Text style={styles.cardTitle}>Ta nouvelle clé</Text>
            </View>
            <Text style={styles.warning}>Elle ne s’affichera qu’une fois. Copie-la maintenant et ne la partage avec personne d’autre que ton IA.</Text>
            <Text selectable style={styles.keyText}>{created.key}</Text>
            <View style={styles.actions}>
              <Button title="Copier la clé" variant="outline" onPress={() => copy(created.key, 'Clé')} style={{ flex: 1 }} />
              <Button title="Copier le message pour l’IA" onPress={() => copy(promptForAi(created.key), 'Message')} style={{ flex: 1 }} />
            </View>
            <Text style={styles.foot}>{created.expires_at ? `Valable jusqu’au ${formatDate(created.expires_at)}.` : 'Sans date d’expiration : pense à la révoquer si tu ne t’en sers plus.'}</Text>
            <PressableScale haptic="selection" onPress={() => setCreated(null)} style={styles.dismiss} hitSlop={8}>
              <Text style={styles.dismissText}>C’est copié, masquer</Text>
            </PressableScale>
          </View>
        )}

        {keys == null && !error && <SkeletonCard />}

        {error && (
          <View style={[glassCard, styles.card]}>
            <EmptyState compact icon="wifi-off" title="Impossible de charger" message="Vérifie ta connexion et réessaie." actionLabel="Réessayer" onAction={load} />
          </View>
        )}

        {active.map((k) => (
          <View key={k.id}>
            <Text style={styles.section}>{k.label.toUpperCase()}</Text>
            <View style={[glassCard, styles.card]}>
              <GlassSheen radius={22} />
              <Text style={styles.meta}>
                {k.key_prefix}… · créée le {formatDate(k.created_at)} · {expiryText(k.expires_at)}
              </Text>
              <Text style={styles.meta}>
                {k.last_used_at ? `Utilisée ${k.use_count} fois, dernière fois le ${formatDate(k.last_used_at)}` : 'Jamais utilisée'}
              </Text>
              <Text style={styles.subTitle}>Ce que cette IA peut lire</Text>
              <ScopeChecklist value={k.scopes} onToggle={(s) => updateScopes(k, s)} />
              {k.scopes.length === 0 && <Text style={styles.warning}>Rien n’est partagé : l’IA ne recevra aucune donnée.</Text>}
              <PressableScale haptic="light" onPress={() => revoke(k)} style={styles.revoke} hitSlop={8}>
                <Text style={styles.revokeText}>Révoquer cette clé</Text>
              </PressableScale>
            </View>
          </View>
        ))}

        <Text style={styles.section}>NOUVELLE CLÉ</Text>
        <View style={[glassCard, styles.card]}>
          <GlassSheen radius={22} />
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="Nom de l’IA (ex. ChatGPT)"
            placeholderTextColor={theme.colors.textMuted}
            maxLength={40}
          />
          <Text style={styles.subTitle}>Ce que tu partages</Text>
          <ScopeChecklist value={draftScopes} onToggle={(s) => setDraftScopes((v) => toggle(v, s))} disabled={busy} />
          <Text style={styles.subTitle}>Expiration</Text>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {AI_KEY_DURATIONS.map((d) => {
              const on = d.days === days;
              return (
                <PressableScale
                  key={d.label}
                  haptic="selection"
                  onPress={() => setDays(d.days)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{d.label}</Text>
                </PressableScale>
              );
            })}
          </View>
          <Button title="Créer la clé" onPress={create} loading={busy} disabled={busy || keys == null} style={{ marginTop: 12 }} />
          <Text style={styles.foot}>Tu pourras changer les cases cochées ou révoquer la clé à tout moment.</Text>
        </View>

        {inactiveCount > 0 && (
          <Text style={styles.foot}>
            {inactiveCount} ancienne{inactiveCount > 1 ? 's' : ''} clé{inactiveCount > 1 ? 's' : ''} révoquée{inactiveCount > 1 ? 's' : ''} ou expirée{inactiveCount > 1 ? 's' : ''}.
          </Text>
        )}
      </Animated.ScrollView>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.xxxl },
  intro: { fontSize: 14, lineHeight: 20, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: theme.colors.textSecondary, marginTop: 18, marginBottom: theme.spacing.sm, marginLeft: theme.spacing.xs },
  card: { padding: 14, borderRadius: 22 },
  createdCard: { marginTop: theme.spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  subTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginTop: theme.spacing.md, marginBottom: theme.spacing.xs },
  meta: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 2 },
  warning: { fontSize: 13, lineHeight: 18, color: theme.colors.warning, marginVertical: 6 },
  keyText: {
    fontSize: 13,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    color: theme.colors.text,
    backgroundColor: theme.colors.glassFill,
    borderRadius: theme.radius.md,
    padding: 10,
    marginVertical: theme.spacing.sm,
  },
  actions: { flexDirection: 'row', gap: theme.spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  chip: { paddingHorizontal: theme.spacing.md, paddingVertical: 7, borderRadius: theme.radius.full, backgroundColor: theme.colors.glassFill },
  chipOn: { backgroundColor: theme.colors.sprintyBlue },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  chipTextOn: { color: theme.colors.surface },
  scopeRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: 10 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.hairline },
  scopeLabel: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  scopeDetail: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  input: {
    fontSize: 15,
    color: theme.colors.text,
    backgroundColor: theme.colors.glassFill,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
  },
  revoke: { alignItems: 'center', paddingVertical: theme.spacing.md, marginTop: theme.spacing.xs },
  revokeText: { fontSize: 15, fontWeight: '700', color: theme.colors.error },
  dismiss: { alignItems: 'center', paddingVertical: theme.spacing.sm },
  dismissText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  foot: { fontSize: 12, color: theme.colors.textMuted, textAlign: 'center', marginTop: theme.spacing.sm },
});
