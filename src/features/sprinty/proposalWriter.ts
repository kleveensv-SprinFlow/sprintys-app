import uuid from 'react-native-uuid';
import { supabase } from '../../services/supabase';
import { workoutService } from '../../services/workoutService';
import { chatService } from '../../services/chatService';
import type { ProposalTarget, ProposedSession, UiBlock } from './types';

/**
 * Turns Sprinty's proposals into the same rows the session builders write. Runs with the user's own rights:
 * a coach writes for validated athletes only, an athlete without a coach for themself (source 'sprinty').
 */

const TYPE_SEANCE: Record<ProposedSession['kind'], (s: ProposedSession) => string> = {
  run: (s) => (s.surface === 'cote' ? 'Côte' : 'Piste'),
  strength: (s) => s.title || 'Musculation',
  stairs: () => 'Escalier',
  technical: () => 'Séance Technique',
  rest: () => 'Jour de repos',
  competition: () => 'Compétition',
  mobility: () => 'Mobilité',
};

const HOURS: Record<ProposedSession['kind'], number> = {
  run: 18,
  strength: 12,
  stairs: 12,
  technical: 12,
  rest: 12,
  competition: 9,
  mobility: 19,
};

const dateIso = (s: ProposedSession) => {
  const [y, m, d] = s.date.split('-').map(Number);
  return new Date(y, m - 1, d, HOURS[s.kind], 0, 0, 0).toISOString();
};

/** Content columns of a workout row (blocks, exercises, description, measures). */
export function sessionToRow(s: ProposedSession) {
  const notes = s.notes?.trim() || '';
  const base = {
    type_seance: TYPE_SEANCE[s.kind](s),
    date_prevue: dateIso(s),
    status: 'pending',
  };

  if (s.kind === 'run') {
    const blocks = s.run_blocks.map((b, idx) => {
      const id = String(uuid.v4());
      const summary = `${b.reps} × ${b.distance_m}m`;
      return {
        id,
        name: b.name ? `${b.name} : ${summary}` : `Bloc ${idx + 1} : ${summary}`,
        type: 'sprint',
        restAfterBlock: b.rest_after_s,
        exercises: [
          {
            id: `${id}_ex`,
            name: summary,
            sets: Array.from({ length: b.reps }, (_, i) => ({
              id: `${id}_set_${i}`,
              distance: b.distance_m,
              intensity: b.intensity_pct,
              restSeconds: i === b.reps - 1 ? b.rest_after_s : b.rest_s,
            })),
          },
        ],
      };
    });
    return {
      ...base,
      description: [s.title, notes].filter(Boolean).join('\n'),
      blocks,
      exercises: blocks.flatMap((b) => b.exercises),
      measures: { surface: s.surface === 'cote' ? 'cote' : 'piste', equipment: 'pointes' },
    };
  }

  if (s.kind === 'strength') {
    const exercises = s.strength.map((e) => {
      const id = String(uuid.v4());
      const weightType = e.percent_1rm != null ? 'percent_1rm' : 'kg';
      const weight = e.percent_1rm ?? e.weight_kg ?? 0;
      return {
        id,
        catalog_id: null,
        name: e.name,
        category: 'musculation',
        sets_count: e.sets,
        reps_count: e.reps,
        weight,
        weight_type: weightType,
        weightType,
        rest_between_sets_s: e.rest_s,
        sets: Array.from({ length: e.sets }, (_, i) => ({
          id: `${id}_set_${i}`,
          set_index: i + 1,
          reps: e.reps,
          weight: weight || undefined,
          weight_type: weightType,
          weightType,
          restSeconds: e.rest_s,
          isCompleted: false,
        })),
      };
    });
    return {
      ...base,
      description: notes || `${exercises.length} exercice${exercises.length > 1 ? 's' : ''} de musculation`,
      intensity: 7,
      blocks: [{ id: String(uuid.v4()), name: 'Musculation', exercises }],
      exercises,
      measures: {},
    };
  }

  if (s.kind === 'stairs') {
    const exercises = s.stairs.map((e) => {
      const id = String(uuid.v4());
      const count = e.sets * e.reps;
      return {
        id,
        name: e.name,
        category: 'escalier',
        stairs_count: e.steps,
        sets_count: count,
        rest_between_sets_s: e.rest_s,
        rest_between_exercises_s: 120,
        restBetweenExercises: 120,
        sets: Array.from({ length: count }, (_, i) => ({
          id: `${id}_set_${i}`,
          set_index: i + 1,
          steps: e.steps,
          reps: e.steps,
          restSeconds: e.rest_s,
          isCompleted: false,
        })),
      };
    });
    return {
      ...base,
      description: notes || `${exercises.length} exercice${exercises.length > 1 ? 's' : ''} en escalier`,
      intensity: 8,
      blocks: [{ id: String(uuid.v4()), name: 'Escalier', exercises }],
      exercises,
      measures: {},
    };
  }

  if (s.kind === 'technical') {
    return {
      ...base,
      description: `[${s.title}]\n${notes || s.title}`,
      blocks: [],
      exercises: [],
      measures: { technical_notes: [{ title: s.title, content: notes }], athlete_notes: [{ title: s.title, content: notes }] },
    };
  }

  if (s.kind === 'mobility') {
    // No blocks: the routine is written in the instructions so the athlete simply reads it
    const lines = s.steps.map((e) => `• ${e.name}${e.detail ? ` : ${e.detail}` : ''}`);
    return {
      ...base,
      description: [s.title, notes, ...lines].filter(Boolean).join('\n'),
      blocks: [],
      exercises: [],
      measures: {},
    };
  }

  if (s.kind === 'competition') {
    return {
      ...base,
      description: `${s.title}\n${s.location ? `📍 ${s.location}` : ''}`,
      blocks: [],
      exercises: [],
      measures: { location: s.location || '' },
    };
  }

  // Rest day
  return { ...base, description: notes || 'Jour de repos', blocks: [], exercises: [], measures: {} };
}

/* ----------------------------------------------------------------------------------------------------------------- */
/* Athlete without a coach                                                                                           */
/* ----------------------------------------------------------------------------------------------------------------- */

const myId = async () => {
  const { data } = await supabase.auth.getUser();
  if (!data?.user?.id) throw new Error('auth');
  return data.user.id;
};

const sprintyRows = (uid: string, sessions: ProposedSession[], planId: string | null) =>
  sessions.map((s) => ({
    ...sessionToRow(s),
    athlete_id: uid,
    coach_id: uid,
    source: 'sprinty',
    ai_plan_id: planId,
  }));

/** Explains database refusals in plain words. */
export function writeErrorMessage(err: any): string {
  const msg = String(err?.message ?? '');
  if (msg.includes('sprinty_has_coach')) return 'Tu as un coach : c’est lui qui programme tes séances.';
  if (msg.includes('row-level security')) return 'Tu n’as pas le droit de faire cette modification.';
  return 'L’ajout n’a pas abouti. Vérifie ta connexion et réessaie.';
}

export async function addSessionsForMe(sessions: ProposedSession[]) {
  const uid = await myId();
  const { error } = await supabase.from('workouts').insert(sprintyRows(uid, sessions, null));
  if (error) throw error;
}

/** Active Sprinty plan of the athlete, if any. */
export async function getActivePlan(): Promise<{ id: string; title: string } | null> {
  const uid = await myId();
  const { data } = await supabase
    .from('ai_plans' as any)
    .select('id, title')
    .eq('athlete_id', uid)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as any) ?? null;
}

/** Removes the future, not yet done sessions of a plan and closes it. */
export async function removePlan(planId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Column added by the Sprinty migration, not in the generated types yet
  const workouts: any = supabase.from('workouts');
  const { error } = await workouts
    .delete()
    .eq('ai_plan_id', planId)
    .neq('status', 'completed')
    .gte('date_prevue', today.toISOString());
  if (error) throw error;
  await supabase.from('ai_plans' as any).update({ status: 'removed' }).eq('id', planId);
}

export async function addPlanForMe(block: Extract<UiBlock, { type: 'plan_proposal' }>): Promise<string> {
  const uid = await myId();
  let goalId: string | null = null;
  const { data: goal } = await supabase
    .from('athlete_goals' as any)
    .insert({
      athlete_id: uid,
      title: block.goal.title,
      event_date: block.goal.event_date,
      target: block.goal.target,
      level: block.goal.level,
    })
    .select('id')
    .single();
  goalId = (goal as any)?.id ?? null;

  const { data: plan, error: planError } = await supabase
    .from('ai_plans' as any)
    .insert({
      athlete_id: uid,
      goal_id: goalId,
      title: block.title,
      weeks: block.weeks.length,
      start_date: block.start_date,
      end_date: block.end_date,
      safety: block.safety,
    })
    .select('id')
    .single();
  if (planError || !plan) throw planError ?? new Error('plan');
  const planId = (plan as any).id as string;

  const sessions = block.weeks.flatMap((w) => w.sessions);
  const { error } = await supabase.from('workouts').insert(sprintyRows(uid, sessions, planId));
  if (error) {
    await supabase.from('ai_plans' as any).delete().eq('id', planId);
    throw error;
  }
  return planId;
}

export async function saveGoal(goal: Extract<UiBlock, { type: 'goal_proposal' }>['goal']) {
  const uid = await myId();
  const { error } = await supabase.from('athlete_goals' as any).insert({
    athlete_id: uid,
    title: goal.title,
    event_date: goal.event_date,
    target: goal.target,
    level: goal.level,
    availability: goal.days_per_week ? { days_per_week: goal.days_per_week } : {},
  });
  if (error) throw error;
}

/* ----------------------------------------------------------------------------------------------------------------- */
/* Coach                                                                                                             */
/* ----------------------------------------------------------------------------------------------------------------- */

async function recipients(coachId: string, target: ProposalTarget) {
  const teamId = target.teamId ?? (target.type === 'team' ? target.id : null);
  let q = supabase.from('team_members').select('user_id, team_id, subgroup_id').eq('status', 'approved');
  if (target.type === 'athlete') q = q.eq('user_id', target.id);
  if (teamId) q = q.eq('team_id', teamId);
  if (target.type === 'subgroup') q = q.eq('subgroup_id', target.id);
  const { data, error } = await q;
  if (error) throw error;
  const seen = new Set<string>();
  return (data ?? []).filter((m: any) => m.user_id !== coachId && !seen.has(m.user_id) && seen.add(m.user_id));
}

/** Same layout as the builders: one row per athlete sharing a group_assignment_id, plus the coach's master copy. */
export async function addSessionsForTarget(target: ProposalTarget, sessions: ProposedSession[]): Promise<number> {
  const coachId = await myId();
  const members = await recipients(coachId, target);
  if (!members.length) throw new Error('no_members');
  const teamId = target.teamId ?? members[0].team_id;

  for (const s of sessions) {
    const row = sessionToRow(s);
    const assignment = String(uuid.v4());
    const payloads: any[] = [];
    const withMaster = s.kind === 'run' || s.kind === 'strength' || s.kind === 'stairs';
    if (withMaster && members.length > 1) {
      payloads.push({
        ...row,
        coach_id: coachId,
        team_id: teamId,
        athlete_id: coachId,
        group_assignment_id: assignment,
        measures: { ...(row.measures as object), is_master: true },
      });
    }
    for (const m of members) {
      payloads.push({
        ...row,
        coach_id: coachId,
        team_id: teamId,
        subgroup_id: m.subgroup_id ?? null,
        athlete_id: m.user_id,
        group_assignment_id: members.length > 1 ? assignment : null,
      });
    }
    await workoutService.smartUpdateWorkouts(undefined, payloads);
  }
  return members.length;
}

export async function publishAnnouncement(target: ProposalTarget, text: string) {
  const coachId = await myId();
  const content = `Annonce · ${text.trim()}`;
  if (target.type === 'team') {
    const convo = await chatService.getOrCreateTeamConversation(target.id);
    if (!convo) throw new Error('team conversation');
    await chatService.sendMessage(convo.id, coachId, content);
    return;
  }
  const members = await recipients(coachId, target);
  const results = await Promise.allSettled(
    members.map(async (m: any) => {
      const convo = await chatService.getOrCreateDirectConversation(coachId, m.user_id);
      if (!convo) throw new Error('direct conversation');
      await chatService.sendMessage(convo.id, coachId, content);
    })
  );
  if (members.length && results.every((r) => r.status === 'rejected')) throw new Error('all failed');
}
