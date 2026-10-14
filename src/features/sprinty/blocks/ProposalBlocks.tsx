import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Linking } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../../core/theme';
import { PressableScale } from '../../../shared/components/PressableScale';
import { Button } from '../../../shared/components/Button';
import { confirmAsync, toast } from '../../../shared/feedback/appAlert';
import { useAuthStore } from '../../../store/authStore';
import type { ProposedSession, UiBlock } from '../types';
import {
  addPlanForMe,
  addSessionsForMe,
  addSessionsForTarget,
  getActivePlan,
  publishAnnouncement,
  removePlan,
  saveGoal,
  writeErrorMessage,
} from '../proposalWriter';

const BLUE = theme.colors.sprintyBlue;

interface ActionProps {
  /** Marks the block as done in the stored conversation. */
  onPatch: (patch: Record<string, unknown>) => void;
  /** Puts a sentence in the input so the user can ask for a change. */
  onAskChange: (text: string) => void;
}

const KIND_ICON: Record<ProposedSession['kind'], string> = {
  run: 'run-fast',
  strength: 'dumbbell',
  stairs: 'stairs',
  technical: 'target',
  rest: 'sleep',
  competition: 'trophy-outline',
};

const dayLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  const label = new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export function describe(s: ProposedSession): string {
  if (s.kind === 'run') return s.run_blocks.map((b) => `${b.reps} × ${b.distance_m} m à ${b.intensity_pct} %`).join(' · ');
  if (s.kind === 'strength')
    return s.strength
      .map((e) => `${e.name} ${e.sets}×${e.reps}${e.percent_1rm ? ` à ${e.percent_1rm} %` : e.weight_kg ? ` · ${e.weight_kg} kg` : ''}`)
      .join(' · ');
  if (s.kind === 'stairs') return s.stairs.map((e) => `${e.sets}×${e.reps} ${e.name} (${e.steps} marches)`).join(' · ');
  if (s.kind === 'competition') return s.location || '';
  return s.notes;
}

function SessionRow({ s }: { s: ProposedSession }) {
  const [open, setOpen] = useState(false);
  const detail = describe(s);
  const hasMore = !!s.notes && s.kind !== 'rest' && s.kind !== 'technical';
  return (
    <PressableScale haptic="selection" disabled={!hasMore} onPress={() => setOpen((o) => !o)} style={styles.session}>
      <View style={[styles.sessionIcon, s.kind === 'rest' && styles.sessionIconRest]}>
        <MaterialCommunityIcons name={KIND_ICON[s.kind] as any} size={17} color={s.kind === 'rest' ? theme.colors.textSecondary : BLUE} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sessionDay}>{dayLabel(s.date)}</Text>
        <Text style={styles.sessionTitle}>{s.title}</Text>
        {detail ? (
          <Text style={styles.sessionDetail} numberOfLines={open ? undefined : 2}>
            {detail}
          </Text>
        ) : null}
        {open && hasMore && <Text style={styles.sessionNotes}>{s.notes}</Text>}
      </View>
      {hasMore && <Feather name={open ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.textMuted} />}
    </PressableScale>
  );
}

function AiFootnote({ forCoach }: { forCoach?: boolean }) {
  return (
    <View style={styles.footnote}>
      <MaterialCommunityIcons name="robot-outline" size={14} color={theme.colors.textMuted} />
      <Text style={styles.footnoteText}>
        {forCoach
          ? 'Proposé par Sprinty (IA). Il peut se tromper : relis et ajuste avant d’envoyer à tes athlètes.'
          : 'Proposé par Sprinty (IA). Il peut se tromper : écoute ton corps, ce n’est pas un avis médical.'}
      </Text>
    </View>
  );
}

function Done({ label, onOpen }: { label: string; onOpen?: () => void }) {
  return (
    <View style={styles.done}>
      <Feather name="check-circle" size={16} color={theme.colors.success} />
      <Text style={styles.doneText}>{label}</Text>
      {onOpen && (
        <PressableScale haptic="selection" onPress={onOpen} hitSlop={8}>
          <Text style={styles.link}>Voir</Text>
        </PressableScale>
      )}
    </View>
  );
}

export function SessionsProposalBlock({ data, onPatch, onAskChange }: { data: Extract<UiBlock, { type: 'sessions_proposal' }> } & ActionProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const isCoach = data.target.type !== 'self';

  const apply = async () => {
    setBusy(true);
    try {
      if (isCoach) {
        const n = await addSessionsForTarget(data.target, data.sessions);
        toast('success', `${data.sessions.length} séance${data.sessions.length > 1 ? 's' : ''} pour ${n} athlète${n > 1 ? 's' : ''}.`, 'Ajouté au calendrier');
      } else {
        await addSessionsForMe(data.sessions);
        toast('success', 'Les séances sont dans ton calendrier.', 'Ajouté');
      }
      onPatch({ applied: true });
    } catch (e: any) {
      toast('error', e?.message === 'no_members' ? 'Aucun athlète validé ne correspond à ce destinataire.' : writeErrorMessage(e), 'Oups');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.badge}>
          <MaterialCommunityIcons name="calendar-plus" size={16} color={BLUE} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{data.title}</Text>
          <Text style={styles.cardSub}>
            {isCoach ? `Pour ${data.target.type === 'team' ? 'l’équipe' : data.target.type === 'subgroup' ? 'le groupe' : ''} ${data.target.name}` : 'Pour toi'} ·{' '}
            {data.sessions.length} séance{data.sessions.length > 1 ? 's' : ''}
          </Text>
        </View>
      </View>
      <View style={styles.sessions}>
        {data.sessions.map((s, i) => (
          <SessionRow key={i} s={s} />
        ))}
      </View>
      {data.applied ? (
        <Done label="Ajouté au calendrier" onOpen={() => router.push(isCoach ? '/(coach)/calendar' : '/(athlete)/calendar')} />
      ) : (
        <View style={styles.actions}>
          <Button title="Ajouter au calendrier" onPress={apply} loading={busy} style={styles.primary} />
          <PressableScale haptic="selection" onPress={() => onAskChange('Je voudrais modifier ces séances : ')} style={styles.secondary}>
            <Text style={styles.secondaryText}>Modifier</Text>
          </PressableScale>
        </View>
      )}
      <AiFootnote forCoach={isCoach} />
    </View>
  );
}

export function PlanProposalBlock({ data, onPatch, onAskChange }: { data: Extract<UiBlock, { type: 'plan_proposal' }> } & ActionProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [openWeek, setOpenWeek] = useState<number | null>(1);
  const count = data.weeks.reduce((n, w) => n + w.sessions.filter((s) => s.kind !== 'rest').length, 0);

  const apply = async () => {
    try {
      const active = await getActivePlan();
      if (active) {
        const ok = await confirmAsync({
          title: 'Remplacer ton plan ?',
          message: `Tu suis déjà « ${active.title} ». Ses séances à venir seront retirées de ton calendrier (celles déjà faites restent).`,
          confirmText: 'Remplacer',
          destructive: true,
        });
        if (!ok) return;
        setBusy(true);
        await removePlan(active.id);
      }
      setBusy(true);
      const planId = await addPlanForMe(data);
      onPatch({ applied: true, planId });
      toast('success', `${count} séances ajoutées à ton calendrier.`, 'Plan lancé');
    } catch (e) {
      toast('error', writeErrorMessage(e), 'Oups');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.badge}>
          <MaterialCommunityIcons name="flag-checkered" size={16} color={BLUE} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{data.title}</Text>
          <Text style={styles.cardSub}>
            {data.weeks.length} semaine{data.weeks.length > 1 ? 's' : ''} · {count} séances · du {dayLabel(data.start_date)} au {dayLabel(data.end_date)}
          </Text>
        </View>
      </View>

      {(data.goal.target || data.goal.event_date) && (
        <View style={styles.goalRow}>
          <Feather name="target" size={14} color={BLUE} />
          <Text style={styles.goalText}>
            {data.goal.target ?? data.goal.title}
            {data.goal.event_date ? ` · le ${dayLabel(data.goal.event_date)}` : ''}
          </Text>
        </View>
      )}

      {data.cautious && (
        <View style={styles.caution}>
          <Feather name="alert-triangle" size={15} color={theme.colors.warning} />
          <Text style={styles.cautionText}>
            Plan volontairement doux après tes réponses de sécurité. Demande l’avis d’un médecin avant d’augmenter l’intensité.
          </Text>
        </View>
      )}

      {data.weeks.map((w) => {
        const open = openWeek === w.week;
        return (
          <View key={w.week} style={styles.week}>
            <PressableScale haptic="selection" onPress={() => setOpenWeek(open ? null : w.week)} style={styles.weekHead}>
              <Text style={styles.weekNum}>S{w.week}</Text>
              <Text style={styles.weekFocus} numberOfLines={open ? undefined : 1}>
                {w.focus || 'Semaine'}
              </Text>
              <Text style={styles.weekCount}>{w.sessions.filter((s) => s.kind !== 'rest').length}</Text>
              <Feather name={open ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.textMuted} />
            </PressableScale>
            {open && (
              <View style={styles.sessions}>
                {w.sessions.map((s, i) => (
                  <SessionRow key={i} s={s} />
                ))}
              </View>
            )}
          </View>
        );
      })}

      {data.advice ? <Text style={styles.advice}>{data.advice}</Text> : null}

      {data.applied ? (
        <Done label="Plan ajouté à ton calendrier" onOpen={() => router.push('/(athlete)/calendar')} />
      ) : (
        <View style={styles.actions}>
          <Button title="Ajouter à mon calendrier" onPress={apply} loading={busy} style={styles.primary} />
          <PressableScale haptic="selection" onPress={() => onAskChange('Je voudrais changer ce plan : ')} style={styles.secondary}>
            <Text style={styles.secondaryText}>Modifier</Text>
          </PressableScale>
        </View>
      )}
      <AiFootnote />
    </View>
  );
}

export function GoalProposalBlock({ data, onPatch }: { data: Extract<UiBlock, { type: 'goal_proposal' }> } & ActionProps) {
  const [busy, setBusy] = useState(false);
  const g = data.goal;
  const save = async () => {
    setBusy(true);
    try {
      await saveGoal(g);
      onPatch({ applied: true });
      toast('success', 'Sprinty s’en servira pour te conseiller.', 'Objectif enregistré');
    } catch (e) {
      toast('error', writeErrorMessage(e), 'Oups');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={[styles.card, styles.goalCard]}>
      <View style={styles.cardHead}>
        <View style={styles.badge}>
          <Feather name="target" size={16} color={BLUE} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>OBJECTIF</Text>
          <Text style={styles.cardTitle}>{g.title}</Text>
          <Text style={styles.cardSub}>
            {[g.target, g.event_date ? `le ${dayLabel(g.event_date)}` : null, g.days_per_week ? `${g.days_per_week} jours/semaine` : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      </View>
      {data.applied ? (
        <Done label="Objectif enregistré" />
      ) : (
        <Button title="Enregistrer l’objectif" variant="secondary" onPress={save} loading={busy} />
      )}
    </View>
  );
}

export function AnnouncementBlock({ data, onPatch }: { data: Extract<UiBlock, { type: 'announcement_draft' }> } & ActionProps) {
  const [text, setText] = useState(data.text);
  const [busy, setBusy] = useState(false);
  const publish = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await publishAnnouncement(data.target, text);
      onPatch({ applied: true, text });
      toast('success', data.target.type === 'team' ? 'Publiée dans la discussion de l’équipe.' : 'Envoyée à chaque athlète du groupe.', 'Annonce envoyée');
    } catch {
      toast('error', 'L’annonce n’est pas partie. Vérifie ta connexion et réessaie.', 'Oups');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.badge}>
          <MaterialCommunityIcons name="bullhorn-outline" size={16} color={BLUE} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Annonce</Text>
          <Text style={styles.cardSub}>Pour {data.target.type === 'team' ? 'l’équipe' : 'le groupe'} {data.target.name}</Text>
        </View>
      </View>
      {data.applied ? (
        <>
          <Text style={styles.announcement}>{text}</Text>
          <Done label="Annonce envoyée" />
        </>
      ) : (
        <>
          <TextInput style={styles.editor} multiline value={text} onChangeText={setText} maxLength={2000} />
          <Button title="Publier" onPress={publish} loading={busy} disabled={!text.trim()} />
        </>
      )}
    </View>
  );
}

export function PhilosophyBlock({ data, onPatch }: { data: Extract<UiBlock, { type: 'philosophy' }> } & ActionProps) {
  const [text, setText] = useState(data.summary);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const ok = await useAuthStore.getState().updateCoachPhilosophy(text.trim());
    setBusy(false);
    if (ok) {
      onPatch({ applied: true, summary: text.trim() });
      toast('success', 'Sprinty en tiendra compte dans ses propositions.', 'Philosophie enregistrée');
    } else toast('error', 'L’enregistrement n’a pas abouti. Réessaie.', 'Oups');
  };
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>TA PHILOSOPHIE D’ENTRAÎNEMENT</Text>
      {data.applied ? (
        <>
          <Text style={styles.announcement}>{text}</Text>
          <Done label="Enregistrée" />
        </>
      ) : (
        <>
          <TextInput style={styles.editor} multiline value={text} onChangeText={setText} maxLength={2000} />
          <Button title="Enregistrer" onPress={save} loading={busy} disabled={!text.trim()} />
        </>
      )}
    </View>
  );
}

export function CompetitionsBlock({ data }: { data: Extract<UiBlock, { type: 'competitions' }> }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.badge}>
          <MaterialCommunityIcons name="trophy-outline" size={16} color={BLUE} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Compétitions trouvées</Text>
          <Text style={styles.cardSub}>{data.query} · résultats du web, à vérifier</Text>
        </View>
      </View>
      {data.items.map((c) => (
        <PressableScale
          key={c.id}
          haptic="selection"
          disabled={!c.url}
          onPress={() => c.url && Linking.openURL(c.url)}
          style={styles.comp}
          accessibilityRole="link"
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.compTitle} numberOfLines={2}>
              {c.title}
            </Text>
            <Text style={styles.compMeta}>{c.date ? dayLabel(c.date) : 'Date à vérifier'}</Text>
            {c.snippet ? (
              <Text style={styles.compSnippet} numberOfLines={2}>
                {c.snippet}
              </Text>
            ) : null}
          </View>
          {c.url && <Feather name="external-link" size={16} color={BLUE} />}
        </PressableScale>
      ))}
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
    gap: 12,
  },
  goalCard: { gap: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: { fontSize: 11, fontWeight: '800', color: BLUE, letterSpacing: 0.6 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.text },
  cardSub: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, marginTop: 2 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goalText: { flex: 1, fontSize: 13, fontWeight: '700', color: theme.colors.text },
  caution: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 10,
  },
  cautionText: { flex: 1, fontSize: 12, lineHeight: 17, color: theme.colors.text },
  sessions: { gap: 8 },
  session: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: theme.colors.glassFill,
    borderRadius: 14,
    borderCurve: 'continuous',
    padding: 10,
  },
  sessionIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionIconRest: { backgroundColor: 'rgba(255,255,255,0.6)' },
  sessionDay: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary },
  sessionTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.text, marginTop: 1 },
  sessionDetail: { fontSize: 12, lineHeight: 17, color: theme.colors.textSecondary, marginTop: 2 },
  sessionNotes: { fontSize: 12, lineHeight: 17, color: theme.colors.text, marginTop: 6 },
  week: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.hairline, paddingTop: 10, gap: 8 },
  weekHead: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 },
  weekNum: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    backgroundColor: BLUE,
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  weekFocus: { flex: 1, fontSize: 13, fontWeight: '700', color: theme.colors.text },
  weekCount: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
  advice: { fontSize: 13, lineHeight: 19, color: theme.colors.textSecondary },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  primary: { flex: 1 },
  secondary: { minHeight: 44, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 14, fontWeight: '800', color: BLUE },
  done: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  doneText: { flex: 1, fontSize: 13, fontWeight: '700', color: theme.colors.text },
  link: { fontSize: 13, fontWeight: '800', color: BLUE },
  footnote: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  footnoteText: { flex: 1, fontSize: 11, lineHeight: 15, color: theme.colors.textMuted },
  editor: {
    minHeight: 90,
    maxHeight: 220,
    borderRadius: 12,
    backgroundColor: theme.colors.glassFill,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text,
    textAlignVertical: 'top',
  },
  announcement: { fontSize: 14, lineHeight: 20, color: theme.colors.text },
  comp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.glassFill,
    borderRadius: 14,
    padding: 10,
  },
  compTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
  compMeta: { fontSize: 12, fontWeight: '700', color: BLUE },
  compSnippet: { fontSize: 12, lineHeight: 16, color: theme.colors.textSecondary },
});
