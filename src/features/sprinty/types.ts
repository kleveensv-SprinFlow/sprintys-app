/** Visual blocks streamed by the `sprinty` edge function (see supabase/functions/sprinty/tools.ts). */

export type SessionKind = 'run' | 'strength' | 'stairs' | 'technical' | 'rest' | 'competition' | 'mobility';

export interface ProposedSession {
  date: string;
  kind: SessionKind;
  title: string;
  surface: 'piste' | 'cote' | null;
  notes: string;
  location: string;
  run_blocks: { name: string; reps: number; distance_m: number; intensity_pct: number; rest_s: number; rest_after_s: number }[];
  strength: { name: string; sets: number; reps: number; weight_kg: number | null; percent_1rm: number | null; rest_s: number }[];
  stairs: { name: string; sets: number; reps: number; steps: number; rest_s: number }[];
  steps: { name: string; detail: string }[];
}

export interface ProposalTarget {
  type: 'self' | 'athlete' | 'subgroup' | 'team';
  id: string;
  name: string;
  teamId?: string;
}

export interface ChartSeries {
  name: string;
  points: { x: string; y: number }[];
}

export type UiBlock =
  | {
      type: 'chart';
      title: string;
      kind: 'line' | 'bar';
      unit: string;
      better: 'higher' | 'lower' | null;
      series: ChartSeries[];
      /** Ligne de repère (objectif, record) calculée par le serveur */
      reference?: { value: number; label: string } | null;
    }
  | {
      type: 'stats';
      title?: string;
      items: { label: string; value: string; unit?: string; trend?: 'up' | 'down' | 'flat'; good?: boolean }[];
    }
  | { type: 'table'; title?: string; columns: string[]; rows: string[][] }
  | {
      type: 'choices';
      questions: { id: string; question: string; options: string[]; multi: boolean; allow_other: boolean }[];
      answered?: boolean;
    }
  | { type: 'sessions_proposal'; title: string; target: ProposalTarget; sessions: ProposedSession[]; applied?: boolean }
  | {
      type: 'plan_proposal';
      title: string;
      goal: { title: string; event_date: string | null; target: string | null; level: string | null };
      safety: { pain: boolean; heart: boolean; malaise: boolean; comeback: boolean };
      cautious: boolean;
      start_date: string;
      end_date: string;
      weeks: { week: number; focus: string; sessions: ProposedSession[] }[];
      advice: string;
      applied?: boolean;
      planId?: string;
    }
  | {
      type: 'goal_proposal';
      goal: { title: string; event_date: string | null; target: string | null; level: string | null; days_per_week: number | null };
      applied?: boolean;
    }
  | { type: 'announcement_draft'; target: ProposalTarget; text: string; applied?: boolean }
  | { type: 'philosophy'; summary: string; applied?: boolean }
  | {
      type: 'memory_proposal';
      items: { category: string; content: string; source: string }[];
      applied?: boolean;
      kept?: number;
    }
  | {
      type: 'competitions';
      query: string;
      items: { id: string; title: string; date: string | null; location: string; snippet: string; url: string | null }[];
    }
  | {
      type: 'suggestions';
      items: string[];
    };

export type MessagePart = { kind: 'text'; text: string } | { kind: 'ui'; block: UiBlock };

/** One line per block, sent back to the server as conversation memory. */
export function summarizeBlock(b: UiBlock): string {
  switch (b.type) {
    case 'chart':
      return `[Graphique affiché : ${b.title}]`;
    case 'stats':
      return `[Chiffres clés affichés : ${b.items.map((i) => `${i.label} ${i.value}${i.unit ? ' ' + i.unit : ''}`).join(', ')}]`;
    case 'table':
      return `[Tableau affiché : ${b.title ?? b.columns.join(', ')}]`;
    case 'choices':
      return `[Questions affichées : ${b.questions.map((q) => q.question).join(' ; ')}]`;
    case 'sessions_proposal':
      return `[Proposition de ${b.sessions.length} séance(s) pour ${b.target.name}${b.applied ? ' — ajoutée au calendrier' : ' — pas encore ajoutée'}]`;
    case 'plan_proposal':
      return `[Plan proposé : ${b.title}, ${b.weeks.length} semaines${b.applied ? ' — ajouté au calendrier' : ' — pas encore ajouté'}]`;
    case 'goal_proposal':
      return `[Objectif proposé : ${b.goal.title}${b.applied ? ' — enregistré' : ''}]`;
    case 'announcement_draft':
      return `[Brouillon d'annonce pour ${b.target.name}${b.applied ? ' — publié' : ''}]`;
    case 'philosophy':
      return `[Philosophie proposée${b.applied ? ' — enregistrée' : ''}]`;
    case 'memory_proposal':
      return `[Propose de retenir : ${b.items.map((i) => i.content).join(' ; ')}${b.applied ? ` — ${b.kept ?? 0} retenu(s)` : ' — en attente du coach'}]`;
    case 'competitions':
      return `[Compétitions trouvées : ${b.items.map((i) => i.title).join(' ; ')}]`;
    case 'suggestions':
      return `[Suggestions proposées : ${b.items.join(' ; ')}]`;
  }
}

export const partsToText = (parts: MessagePart[]) =>
  parts
    .map((p) => (p.kind === 'text' ? p.text : summarizeBlock(p.block)))
    .join('\n')
    .trim();
