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
  AI_NOTE_LABELS,
  AI_QUESTIONS,
  AI_SCOPES,
  ALL_AI_SCOPES,
  AiAccessKey,
  AiAccessLogEntry,
  AiNote,
  AiScope,
  CreatedAiKey,
  DEFAULT_AI_SCOPES,
  MINOR_PROFILE_DETAIL,
  aiAccessService,
  isActiveKey,
  promptForAi,
} from '../../services/aiAccessService';

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const scopeLabel = (s: AiScope) => AI_SCOPES.find((x) => x.key === s)?.label.toLowerCase() ?? s;

const expiryText = (iso: string | null) => (iso ? `expire le ${formatDate(iso)}` : 'n’expire jamais');

function ScopeChecklist({ value, onToggle, disabled, allowed }: { value: AiScope[]; onToggle: (s: AiScope) => void; disabled?: boolean; allowed: AiScope[] }) {
  return (
    <View>
      {AI_SCOPES.map((s, i) => {
        const locked = !allowed.includes(s.key);
        // Before 18 the profile category only carries age, sex and disciplines
        const detail = locked ? 'Disponible à partir de 18 ans' : s.key === 'profil' && allowed.length < ALL_AI_SCOPES.length ? MINOR_PROFILE_DETAIL : s.detail;
        const on = value.includes(s.key) && !locked;
        const off = disabled || locked;
        return (
          <PressableScale
            key={s.key}
            haptic="selection"
            onPress={() => onToggle(s.key)}
            disabled={off}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on, disabled: off }}
            accessibilityLabel={`${s.label} : ${detail}`}
            style={[styles.scopeRow, i > 0 && styles.rowBorder, locked && styles.scopeLocked]}
          >
            <Feather name={locked ? 'lock' : on ? 'check-square' : 'square'} size={20} color={on ? theme.colors.sprintyBlue : theme.colors.textMuted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.scopeLabel}>{s.label}</Text>
              <Text style={styles.scopeDetail}>{detail}</Text>
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
  const [draftScopes, setDraftScopes] = useState<AiScope[]>(DEFAULT_AI_SCOPES);
  const [notes, setNotes] = useState<AiNote[]>([]);
  const [log, setLog] = useState<AiAccessLogEntry[]>([]);
  const [days, setDays] = useState<number | null>(30);
  const [created, setCreated] = useState<CreatedAiKey | null>(null);
  // Categories this account may share (fewer before 18). The server enforces it; this only greys the boxes.
  const [allowed, setAllowed] = useState<AiScope[]>(ALL_AI_SCOPES);
  const restricted = allowed.length < ALL_AI_SCOPES.length;

  const load = useCallback(async () => {
    setError(false);
    try {
      const [list, scopes, notesList, logList] = await Promise.all([
        aiAccessService.list(),
        aiAccessService.allowedScopes().catch(() => ALL_AI_SCOPES),
        // Secondary sections: an error there must not hide the keys
        aiAccessService.listNotes().catch(() => [] as AiNote[]),
        aiAccessService.listLog(10).catch(() => [] as AiAccessLogEntry[]),
      ]);
      setKeys(list);
      setAllowed(scopes);
      setNotes(notesList);
      setLog(logList);
      setDraftScopes((v) => v.filter((s) => scopes.includes(s)));
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (list: AiScope[], s: AiScope) => (list.includes(s) ? list.filter((x) => x !== s) : [...list, s]);

  const create = async () => {
    if (!draftScopes.some((s) => allowed.includes(s))) {
      toast('warning', 'Coche au moins une catégorie à partager.');
      return;
    }
    setBusy(true);
    try {
      const res = await aiAccessService.create(label.trim() || 'Mon IA', draftScopes.filter((s) => allowed.includes(s)), days);
      setCreated(res);
      setLabel('');
      setDraftScopes(DEFAULT_AI_SCOPES.filter((s) => allowed.includes(s)));
      await load();
    } catch (e: any) {
      const msg = e?.message ?? '';
      toast(
        'error',
        /Limite/.test(msg)
          ? 'Tu as déjà 5 clés actives. Révoque-en une avant d’en créer une autre.'
          : /majeurs/.test(msg)
            ? 'Avant 18 ans, seuls les séances, résultats, records et objectifs peuvent être partagés.'
            : 'Impossible de créer la clé. Réessaie.',
      );
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

  const removeNote = async (n: AiNote) => {
    const ok = await confirmAsync({
      title: 'Supprimer cette note ?',
      message: 'Ton IA ne la relira plus.',
      confirmText: 'Supprimer',
      destructive: true,
    });
    if (!ok) return;
    setNotes((prev) => prev.filter((x) => x.id !== n.id));
    try {
      await aiAccessService.deleteNote(n.id);
    } catch {
      toast('error', 'Suppression impossible. Réessaie.');
      load();
    }
  };

  const copy = async (text: string, what: string) => {
    await Clipboard.setStringAsync(text);
    toast('success', `${what} copié${what.endsWith('e') ? 'e' : ''}.`);
  };

  const active = (keys ?? []).filter(isActiveKey);
  const notesShared = active.some((k) => k.scopes.includes('notes'));
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
              <ScopeChecklist value={k.scopes} onToggle={(s) => updateScopes(k, s)} allowed={allowed} />
              {!k.scopes.some((s) => allowed.includes(s)) && <Text style={styles.warning}>Rien n’est partagé : l’IA ne recevra aucune donnée.</Text>}
              <PressableScale haptic="light" onPress={() => revoke(k)} style={styles.revoke} hitSlop={8}>
                <Text style={styles.revokeText}>Révoquer cette clé</Text>
              </PressableScale>
            </View>
          </View>
        ))}

        {(notes.length > 0 || notesShared) && (
          <>
            <Text style={styles.section}>NOTES DE TES IA</Text>
            <View style={[glassCard, styles.card]}>
              <GlassSheen radius={22} />
              {notes.length === 0 ? (
                <Text style={styles.meta}>Aucune note pour l’instant. Demande à ton IA de retenir quelque chose : elle l’écrira ici.</Text>
              ) : (
                notes.map((n, i) => (
                  <View key={n.id} style={[styles.noteRow, i > 0 && styles.rowBorder]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.noteTag}>{AI_NOTE_LABELS[n.categorie] ?? n.categorie}</Text>
                      <Text style={styles.noteText}>{n.texte}</Text>
                      <Text style={styles.meta}>
                        {n.source} · {formatDate(n.created_at)}
                      </Text>
                    </View>
                    <PressableScale haptic="light" onPress={() => removeNote(n)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Supprimer cette note">
                      <Feather name="trash-2" size={18} color={theme.colors.textMuted} />
                    </PressableScale>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {log.length > 0 && (
          <>
            <Text style={styles.section}>DERNIÈRES LECTURES</Text>
            <View style={[glassCard, styles.card]}>
              <GlassSheen radius={22} />
              {log.map((l, i) => (
                <View key={`${l.used_at}-${i}`} style={[styles.logRow, i > 0 && styles.rowBorder]}>
                  <Text style={styles.scopeLabel}>{l.key_label}</Text>
                  <Text style={styles.meta}>
                    {formatDateTime(l.used_at)}
                    {l.scopes.length ? ` · ${l.scopes.map(scopeLabel).join(', ')}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {active.length > 0 && (
          <>
            <Text style={styles.section}>IDÉES DE QUESTIONS</Text>
            <View style={[glassCard, styles.card]}>
              <GlassSheen radius={22} />
              {AI_QUESTIONS.map((q, i) => (
                <PressableScale
                  key={q.label}
                  haptic="selection"
                  onPress={() => copy(q.text, 'Question')}
                  accessibilityRole="button"
                  accessibilityLabel={`Copier la question : ${q.label}`}
                  style={[styles.scopeRow, i > 0 && styles.rowBorder]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scopeLabel}>{q.label}</Text>
                    <Text style={styles.scopeDetail}>{q.text}</Text>
                  </View>
                  <Feather name="copy" size={18} color={theme.colors.sprintyBlue} />
                </PressableScale>
              ))}
              <Text style={styles.foot}>Copie une question, puis colle-la dans ton IA.</Text>
            </View>
          </>
        )}

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
          <ScopeChecklist value={draftScopes} onToggle={(s) => setDraftScopes((v) => toggle(v, s))} disabled={busy} allowed={allowed} />
          {restricted && <Text style={styles.foot}>Avant 18 ans, ton poids, ta forme, ta nutrition et ton profil détaillé restent privés.</Text>}
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
  scopeLocked: { opacity: 0.55 },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md, paddingVertical: 10 },
  noteTag: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, color: theme.colors.sprintyBlue, textTransform: 'uppercase', marginBottom: 2 },
  noteText: { fontSize: 14, lineHeight: 20, color: theme.colors.text, marginBottom: 2 },
  logRow: { paddingVertical: 8 },
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
