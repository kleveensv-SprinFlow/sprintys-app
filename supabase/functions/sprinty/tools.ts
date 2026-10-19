// deno-lint-ignore-file no-explicit-any
import type { AthleteRef, Ctx, ToolResult } from './types.ts';
import { addDays, describeSession, isIsoDate, normalizeSession, type Caps, type Session } from './sessions.ts';
import { computeCoachHabits } from './habits.ts';

const MEMORY_CATEGORIES = ['specialite', 'athletes', 'objectifs', 'semaine', 'methodes', 'interdits', 'autre'];

/* -------------------------------------------------------------------------------------------------------------------
 * Tool definitions (OpenAI function calling). Which ones are offered depends on the role and situation.
 * ----------------------------------------------------------------------------------------------------------------- */

const ATHLETE_ID = {
  type: 'string',
  description: "Id de l'athlète (obtenu avec list_athletes). Ne pas remplir pour parler de soi.",
};
const DAYS = (def: number) => ({ type: 'integer', minimum: 1, maximum: 365, description: `Nombre de jours en arrière (défaut ${def}).` });

const SESSION_SCHEMA = {
  type: 'object',
  properties: {
    date: { type: 'string', description: 'YYYY-MM-DD' },
    kind: { type: 'string', enum: ['run', 'strength', 'stairs', 'technical', 'rest', 'competition', 'mobility'] },
    title: { type: 'string' },
    surface: { type: 'string', enum: ['piste', 'cote'] },
    notes: { type: 'string', description: 'Échauffement, consignes, objectif de la séance.' },
    location: { type: 'string' },
    run_blocks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          reps: { type: 'integer' },
          distance_m: { type: 'integer' },
          intensity_pct: { type: 'integer' },
          rest_s: { type: 'integer' },
          rest_after_s: { type: 'integer' },
        },
        required: ['reps', 'distance_m', 'intensity_pct', 'rest_s'],
      },
    },
    strength: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          sets: { type: 'integer' },
          reps: { type: 'integer' },
          weight_kg: { type: 'number' },
          percent_1rm: { type: 'integer' },
          rest_s: { type: 'integer' },
        },
        required: ['name', 'sets', 'reps', 'rest_s'],
      },
    },
    steps: {
      type: 'array',
      description: 'kind mobility : exercices de mobilité, étirements, respiration.',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, detail: { type: 'string', description: 'Durée ou répétitions, ex. « 2 × 30 s par côté ».' } },
        required: ['name'],
      },
    },
    stairs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          sets: { type: 'integer' },
          reps: { type: 'integer' },
          steps: { type: 'integer' },
          rest_s: { type: 'integer' },
        },
        required: ['sets', 'reps', 'steps', 'rest_s'],
      },
    },
  },
  required: ['date', 'kind', 'title'],
};

const fn = (name: string, description: string, properties: Record<string, unknown> = {}, required: string[] = []) => ({
  type: 'function',
  function: { name, description, parameters: { type: 'object', properties, required } },
});

const CHART_METRICS = [
  'weight', 'body_fat', 'muscle_mass', 'readiness', 'sleep_hours', 'fatigue', 'stress', 'motivation',
  'kcal', 'protein', 'sessions_per_week', 'best_time', 'max_weight',
];

export function toolsFor(ctx: Ctx) {
  const coach = ctx.role === 'coach';
  const target = coach ? { athlete_id: ATHLETE_ID } : {};
  const tools: any[] = [
    fn('get_profile', "Profil sportif : disciplines, taille, poids, objectifs enregistrés, plan Sprinty en cours.", { ...target }),
    fn('get_checkins', 'Check-ins quotidiens : forme (sur 100), sommeil, fatigue, stress, motivation, douleurs (nombre).', { ...target, days: DAYS(14) }),
    fn('get_workouts', 'Séances passées et à venir, avec statut (faite ou non) et résumé.', {
      ...target,
      days: DAYS(14),
      days_ahead: { type: 'integer', minimum: 0, maximum: 120, description: 'Jours à venir (défaut 7).' },
    }),
    fn('get_results', 'Résultats saisis par les athlètes dans leurs séances : chronos (course, côte), charges et répétitions (musculation), escaliers, avec un résumé par distance ou exercice.', {
      ...target,
      days: DAYS(60),
      kind: { type: 'string', enum: ['course', 'muscu', 'escalier'], description: 'Type de séance (omettre pour tout).' },
      distance_m: { type: 'integer', description: 'Filtrer une distance de course (ex. 60, 100, 200).' },
      exercise: { type: 'string', description: "Filtrer un exercice de musculation par son nom (ex. squat)." },
    }),
    fn('get_records', 'Meilleures performances (records personnels).', { ...target }),
    fn('get_performance', "Vue d'ensemble de la performance : records (et ceux battus ces 14 derniers jours), progression par distance/exercice, assiduité par semaine, charge d'entraînement (effort ressenti × durée, ratio charge aiguë/chronique) et forme récente.", { ...target }),
    fn('get_weight', 'Pesées et composition corporelle.', { ...target, days: DAYS(90) }),
    fn('get_nutrition', 'Apports nutritionnels par jour (kcal, protéines, glucides, lipides) et objectif.', { ...target, days: DAYS(7) }),
    fn(
      'show_chart',
      "Affiche un graphique calculé à partir des vraies données. Pour comparer, passe plusieurs athlete_ids (coach). best_time demande distance_m ; max_weight demande exercise.",
      {
        title: { type: 'string' },
        metric: { type: 'string', enum: CHART_METRICS },
        days: DAYS(60),
        ...(coach ? { athlete_ids: { type: 'array', items: { type: 'string' }, description: '1 à 5 athlètes.' } } : {}),
        distance_m: { type: 'integer' },
        exercise: { type: 'string', description: "Nom de l'exercice de musculation (ex. squat)." },
      },
      ['title', 'metric']
    ),
    fn(
      'show_stats',
      'Affiche 2 à 6 chiffres clés (uniquement des valeurs obtenues par les outils).',
      {
        title: { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              value: { type: 'string' },
              unit: { type: 'string' },
              trend: { type: 'string', enum: ['up', 'down', 'flat'] },
              good: { type: 'boolean', description: 'La tendance est-elle bonne ?' },
            },
            required: ['label', 'value'],
          },
        },
      },
      ['items']
    ),
    fn(
      'show_table',
      'Affiche un tableau (uniquement des valeurs obtenues par les outils).',
      {
        title: { type: 'string' },
        columns: { type: 'array', items: { type: 'string' } },
        rows: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
      },
      ['columns', 'rows']
    ),
    fn(
      'ask_choices',
      "Seule façon de poser une question à l'utilisateur : 1 à 4 questions avec des réponses courtes à toucher (2 à 6 options), puis attendre. À utiliser dès qu'une information indispensable manque, et pour les questions de sécurité (Oui / Non).",
      {
        intro: { type: 'string', description: 'Une phrase courte avant les questions.' },
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              question: { type: 'string' },
              options: { type: 'array', items: { type: 'string' } },
              multi: { type: 'boolean', description: 'Plusieurs réponses possibles.' },
              allow_other: { type: 'boolean', description: 'Ajouter une réponse libre « Autre ».' },
            },
            required: ['id', 'question', 'options'],
          },
        },
      },
      ['questions']
    ),
    fn(
      'suggest_followups',
      "Propose 2 ou 3 questions ou actions courtes pour relancer la discussion sous ta réponse.",
      {
        items: {
          type: 'array',
          items: { type: 'string' },
          minItems: 2,
          maxItems: 3,
          description: '2 ou 3 suggestions courtes (max 8 mots chacune).',
        },
      },
      ['items']
    ),
  ];

  if (coach) {
    tools.push(
      fn('list_athletes', "Liste les athlètes validés du coach avec leurs ids, groupes et sous-groupes, et la date du dernier check-in."),
      fn('team_readiness', "Forme de l'équipe : dernier check-in de chaque athlète (3 derniers jours) et séances faites sur 7 jours.", {
        team_id: { type: 'string' },
        subgroup_id: { type: 'string' },
      }),
      fn('missed_sessions', 'Séances prévues non faites sur une période, par athlète.', { days: DAYS(14) }),
      fn(
        'propose_sessions',
        "Affiche une proposition de séances que le coach peut ajouter au calendrier d'un athlète, d'un sous-groupe ou de l'équipe.",
        {
          intro: { type: 'string' },
          title: { type: 'string' },
          target: {
            type: 'object',
            properties: { type: { type: 'string', enum: ['athlete', 'subgroup', 'team'] }, id: { type: 'string' } },
            required: ['type', 'id'],
          },
          sessions: { type: 'array', items: SESSION_SCHEMA },
        },
        ['title', 'target', 'sessions']
      ),
      fn(
        'draft_announcement',
        "Affiche un brouillon d'annonce que le coach peut relire et publier dans le salon de l'équipe.",
        {
          text: { type: 'string' },
          target: {
            type: 'object',
            properties: { type: { type: 'string', enum: ['team', 'subgroup'] }, id: { type: 'string' } },
            required: ['type', 'id'],
          },
        },
        ['text', 'target']
      ),
      fn(
        'remember_facts',
        "Propose au coach de retenir 1 à 8 informations sur sa façon d'entraîner (une phrase courte chacune, à la deuxième personne : « Tu … »). Le coach coche ce qu'il garde ; rien n'est enregistré sans lui. N'y mets jamais une information déjà dans ta mémoire, ni une donnée de santé d'un athlète.",
        {
          items: {
            type: 'array',
            minItems: 1,
            maxItems: 8,
            items: {
              type: 'object',
              properties: {
                category: { type: 'string', enum: MEMORY_CATEGORIES },
                content: { type: 'string', description: 'Une phrase, 160 caractères maximum.' },
                source: { type: 'string', enum: ['presentation', 'conversation', 'programmation'] },
              },
              required: ['category', 'content', 'source'],
            },
          },
        },
        ['items']
      ),
      fn('get_coach_habits', "Habitudes de programmation du coach déduites de ses séances des 8 dernières semaines (jours, types, formats de course, intensité moyenne, exercices de muscu). À utiliser pendant la présentation pour lui faire confirmer ses habitudes.")
    );
  } else if (ctx.hasCoach) {
    tools.push(
      fn(
        'propose_sessions',
        "Affiche 1 à 3 séances de RÉCUPÉRATION DOUCE (kind mobility uniquement : mobilité, étirements, respiration, automassage) que l'athlète peut ajouter à son calendrier. Aucune séance physique : son coach programme l'entraînement.",
        { intro: { type: 'string' }, title: { type: 'string' }, sessions: { type: 'array', items: SESSION_SCHEMA } },
        ['title', 'sessions']
      )
    );
  } else {
    tools.push(
      fn(
        'propose_goal',
        "Affiche l'objectif résumé, que l'athlète peut enregistrer.",
        {
          title: { type: 'string' },
          event_date: { type: 'string', description: 'YYYY-MM-DD si une échéance existe.' },
          target: { type: 'string', description: 'Ex. « 11"80 au 100 m ».' },
          level: { type: 'string', enum: ['debutant', 'intermediaire', 'confirme'] },
          days_per_week: { type: 'integer' },
        },
        ['title']
      ),
      fn(
        'propose_sessions',
        "Affiche 1 à 3 séances ponctuelles que l'athlète peut ajouter à son calendrier.",
        { intro: { type: 'string' }, title: { type: 'string' }, sessions: { type: 'array', items: SESSION_SCHEMA } },
        ['title', 'sessions']
      ),
      fn(
        'propose_plan',
        "Affiche un plan d'entraînement semaine par semaine que l'athlète peut ajouter à son calendrier. Uniquement après les questions de sécurité.",
        {
          intro: { type: 'string' },
          title: { type: 'string' },
          goal: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              event_date: { type: 'string' },
              target: { type: 'string' },
              level: { type: 'string', enum: ['debutant', 'intermediaire', 'confirme'] },
            },
            required: ['title'],
          },
          safety: {
            type: 'object',
            description: "Réponses de l'athlète aux 4 questions de sécurité.",
            properties: {
              pain: { type: 'boolean' },
              heart: { type: 'boolean' },
              malaise: { type: 'boolean' },
              comeback: { type: 'boolean' },
            },
            required: ['pain', 'heart', 'malaise', 'comeback'],
          },
          weeks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                week: { type: 'integer' },
                focus: { type: 'string' },
                sessions: { type: 'array', items: SESSION_SCHEMA },
              },
              required: ['week', 'focus', 'sessions'],
            },
          },
          advice: { type: 'string', description: 'Conseils généraux (récupération, sommeil, alimentation), 3 lignes.' },
        },
        ['title', 'goal', 'safety', 'weeks']
      )
    );
  }

  if (ctx.limits.weeklyReport) {
    tools.push(
      fn(
        'weekly_summary',
        "Bilan chiffré de la semaine écoulée (7 jours avant aujourd'hui) : séances, résultats, forme, sommeil, nutrition, poids. À utiliser pour « mon bilan de la semaine » ; commente ensuite avec show_stats et show_chart.",
        { ...target }
      )
    );
    if (!coach && !ctx.hasCoach) {
      tools.push(
        fn('get_plan_sessions', "Séances à venir de son plan Sprinty actif (pour l'ajuster semaine après semaine).", {})
      );
    }
  }

  if (ctx.limits.competitionSearch && (coach || !ctx.hasCoach)) {
    tools.push(
      fn(
        'search_competitions',
        "Cherche sur le web des compétitions d'athlétisme. Affiche les résultats sous forme de cartes.",
        {
          region: { type: 'string', description: 'Ville, département ou région (France par défaut).' },
          month: { type: 'string', description: 'Mois et année visés, ex. « février 2027 ».' },
          discipline: { type: 'string', description: 'Ex. sprint, 60 m, haies, demi-fond.' },
          indoor: { type: 'boolean', description: 'Salle (true) ou plein air (false).' },
        },
        ['month']
      )
    );
  }
  return tools;
}

/** Tools whose arguments deserve the more capable model. */
export const HEAVY_TOOLS = new Set(['propose_plan', 'propose_sessions']);

/* -------------------------------------------------------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------------------------------------------------- */

/** Efforts are stored with the session type as category and, for many rows, the values only in actual_extra. */
const norm = (v: unknown) => String(v ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const parseSeconds = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const t = String(v).trim().replace(',', '.');
  const m = t.match(/^(\d+):(\d+(?:\.\d+)?)$/);
  const n = m ? parseInt(m[1], 10) * 60 + parseFloat(m[2]) : parseFloat(t);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const parseNum = (v: unknown): number | null => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const effortKind = (category: unknown): 'course' | 'muscu' | 'escalier' | 'autre' => {
  const c = norm(category);
  if (/piste|cote|course|sprint/.test(c)) return 'course';
  if (/muscu|force/.test(c)) return 'muscu';
  if (/escalier|stair/.test(c)) return 'escalier';
  return 'autre';
};
const effortSeconds = (r: any): number | null => (r.actual_time_ms != null ? Number(r.actual_time_ms) / 1000 : parseSeconds(r.actual_extra?.chrono));
const effortWeight = (r: any): number | null => (r.actual_weight_kg != null ? Number(r.actual_weight_kg) : parseNum(r.actual_extra?.weight));
const EFFORT_COLS =
  'date_achieved, exercise_category, exercise_catalog_id, actual_distance_m, actual_time_ms, actual_reps, actual_weight_kg, actual_height_cm, actual_intensity, actual_extra, planned_extra, is_pr';
// Name of the exercise a result belongs to: recorded with the result since 1.1.0, else the catalog id, else the session type
const effortExercise = (r: any): string => String(r.actual_extra?.exercise ?? r.planned_extra?.exercise_name ?? r.exercise_catalog_id ?? r.exercise_category ?? '');
// Same exercise whether the result is old (catalog id only) or recent (name recorded)
const effortKey = (r: any): string => String(r.exercise_catalog_id ?? norm(effortExercise(r)));
const repsMissed = (r: any): boolean => r.actual_extra?.repsOk === false;
const effortSurface = (r: any): 'côte' | 'piste' => (/cote/.test(norm(r.exercise_category)) ? 'côte' : 'piste');

const STATUS: Record<string, string> = {
  get_profile: 'Je regarde ton profil…',
  weekly_summary: 'Je prépare ton bilan de la semaine…',
  get_plan_sessions: 'Je regarde ton plan…',
  get_checkins: 'Je regarde les check-ins…',
  get_workouts: 'Je regarde les séances…',
  get_results: 'Je regarde les résultats…',
  get_records: 'Je regarde les records…',
  get_performance: 'Je regarde la progression…',
  get_weight: 'Je regarde les pesées…',
  get_nutrition: 'Je regarde la nutrition…',
  list_athletes: 'Je regarde ton équipe…',
  team_readiness: "Je regarde la forme de l'équipe…",
  missed_sessions: 'Je regarde les séances manquées…',
  show_chart: 'Je prépare le graphique…',
  search_competitions: 'Je cherche des compétitions…',
  propose_plan: 'Je construis le plan…',
  propose_sessions: 'Je prépare les séances…',
};
export const statusFor = (name: string) => STATUS[name] ?? null;

const daysArg = (v: any, def: number, max = 365) => {
  const n = parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : def;
};
const round = (n: any, d = 1) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 10 ** d) / 10 ** d : null);
const avg = (xs: (number | null | undefined)[]) => {
  const v = xs.filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  return v.length ? round(v.reduce((a, b) => a + b, 0) / v.length) : null;
};
const sinceIso = (ctx: Ctx, days: number) => addDays(ctx.today, -days);
const fmtTime = (ms: number | null) => (ms == null ? null : ms >= 60000 ? `${Math.floor(ms / 60000)}'${((ms % 60000) / 1000).toFixed(2).padStart(5, '0')}` : `${(ms / 1000).toFixed(2)} s`);
const clipText = (s: any, n: number) => (typeof s === 'string' ? (s.length > n ? s.slice(0, n) + '…' : s) : '');

async function loadRoster(ctx: Ctx) {
  if (ctx.roster) return ctx.roster;
  const { data: teams } = await ctx.supabase.from('teams').select('id, name').eq('coach_id', ctx.userId);
  const teamIds = (teams ?? []).map((t: any) => t.id);
  let athletes: AthleteRef[] = [];
  let subgroups: { id: string; name: string; teamId: string }[] = [];
  if (teamIds.length) {
    const [{ data: members }, { data: subs }] = await Promise.all([
      ctx.supabase
        .from('team_members')
        .select('user_id, team_id, subgroup_id, profiles:user_id (first_name, last_name, full_name, disciplines)')
        .in('team_id', teamIds)
        .eq('status', 'approved'),
      ctx.supabase.from('subgroups').select('id, name, team_id').in('team_id', teamIds),
    ]);
    subgroups = (subs ?? []).map((s: any) => ({ id: s.id, name: s.name, teamId: s.team_id }));
    const seen = new Set<string>();
    athletes = (members ?? [])
      .filter((m: any) => m.user_id !== ctx.userId && !seen.has(m.user_id) && seen.add(m.user_id))
      .map((m: any) => {
        const p = m.profiles ?? {};
        const name = (p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Athlète').trim();
        const team = (teams ?? []).find((t: any) => t.id === m.team_id);
        const sub = subgroups.find((s) => s.id === m.subgroup_id);
        return {
          id: m.user_id,
          name,
          firstName: p.first_name || name.split(' ')[0],
          teamId: m.team_id,
          teamName: team?.name ?? '',
          subgroupId: m.subgroup_id ?? null,
          subgroupName: sub?.name ?? null,
          disciplines: Array.isArray(p.disciplines) ? p.disciplines : [],
        };
      });
  }
  ctx.roster = { athletes, teams: (teams ?? []).map((t: any) => ({ id: t.id, name: t.name })), subgroups };
  return ctx.roster;
}

class ToolError extends Error {}

/** The athlete a read is about: self for athletes, a validated athlete for coaches. */
async function resolveAthlete(ctx: Ctx, raw: any): Promise<{ id: string; name: string }> {
  if (ctx.role !== 'coach') return { id: ctx.userId, name: ctx.firstName || 'toi' };
  const id = typeof raw === 'string' ? raw.trim() : '';
  if (!id) {
    if (ctx.focusAthlete) return ctx.focusAthlete;
    throw new ToolError(
      "Cet outil porte sur un seul athlète : passe athlete_id (obtenu avec list_athletes). Pour toute l'équipe, utilise team_readiness ou missed_sessions."
    );
  }
  const roster = await loadRoster(ctx);
  const a = roster.athletes.find((x) => x.id === id);
  if (!a) throw new ToolError("Cet athlète ne fait pas partie de tes groupes validés : dis-le clairement au coach, sans montrer d'autres athlètes à la place.");
  return { id: a.id, name: a.name };
}

function summarizeBlocks(w: any): string {
  const blocks = Array.isArray(w?.blocks) ? w.blocks : [];
  const parts: string[] = [];
  for (const b of blocks) {
    for (const ex of Array.isArray(b?.exercises) ? b.exercises : []) {
      if (ex?.name) {
        const sets = ex.sets_count ?? (Array.isArray(ex.sets) ? ex.sets.length : null);
        const reps = ex.reps_count ?? null;
        parts.push(sets && reps && !/×/.test(ex.name) ? `${ex.name} ${sets}×${reps}` : ex.name);
      }
    }
  }
  return clipText(parts.join(', '), 200);
}

/* -------------------------------------------------------------------------------------------------------------------
 * Chart data, computed from the database
 * ----------------------------------------------------------------------------------------------------------------- */

interface Point { x: string; y: number }

async function seriesFor(ctx: Ctx, athleteId: string, metric: string, days: number, opts: any): Promise<Point[]> {
  const since = sinceIso(ctx, days);
  const sb = ctx.supabase;
  if (['weight', 'body_fat', 'muscle_mass'].includes(metric)) {
    const col = metric === 'weight' ? 'weight' : metric === 'body_fat' ? 'body_fat' : 'muscle_mass_kg';
    const { data } = await sb.from('body_metrics').select(`created_at, ${col}`).eq('athlete_id', athleteId).gte('created_at', since).order('created_at');
    return (data ?? []).filter((r: any) => r[col] != null).map((r: any) => ({ x: String(r.created_at).slice(0, 10), y: Number(r[col]) }));
  }
  if (['readiness', 'sleep_hours', 'fatigue', 'stress', 'motivation'].includes(metric)) {
    const col = { readiness: 'health_score', sleep_hours: 'sleep_hours', fatigue: 'fatigue_level', stress: 'stress_level', motivation: 'motivation_level' }[metric]!;
    const { data } = await sb.from('check_ins').select(`date, ${col}`).eq('athlete_id', athleteId).gte('date', since).order('date');
    return (data ?? []).filter((r: any) => r[col] != null).map((r: any) => ({ x: r.date, y: Number(r[col]) }));
  }
  if (metric === 'kcal' || metric === 'protein') {
    const col = metric === 'kcal' ? 'calories' : 'proteines';
    const { data } = await sb.from('meal_logs').select(`consumed_at, ${col}`).eq('user_id', athleteId).gte('consumed_at', since);
    const byDay = new Map<string, number>();
    for (const r of data ?? []) byDay.set(r.consumed_at, (byDay.get(r.consumed_at) ?? 0) + Number(r[col] ?? 0));
    return [...byDay.entries()].sort().map(([x, y]) => ({ x, y: Math.round(y) }));
  }
  if (metric === 'sessions_per_week') {
    const { data } = await sb.from('workouts').select('date_prevue, status, measures').eq('athlete_id', athleteId).gte('date_prevue', since).lte('date_prevue', `${ctx.today}T23:59:59`);
    const byWeek = new Map<string, number>();
    for (const w of data ?? []) {
      if (w?.measures?.is_master) continue;
      const d = new Date(w.date_prevue);
      const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)));
      const key = monday.toISOString().slice(0, 10);
      byWeek.set(key, (byWeek.get(key) ?? 0) + (w.status === 'completed' ? 1 : 0));
    }
    return [...byWeek.entries()].sort().map(([x, y]) => ({ x, y }));
  }
  if (metric === 'best_time' || metric === 'max_weight') {
    const { data } = await sb
      .from('athlete_efforts')
      .select(EFFORT_COLS)
      .eq('athlete_id', athleteId)
      .gte('date_achieved', since)
      .order('date_achieved')
      .limit(1500);
    const ex = norm(opts.exercise);
    const dist = opts.distance_m ? Number(opts.distance_m) : null;
    const byDay = new Map<string, number>();
    for (const r of data ?? []) {
      const kind = effortKind(r.exercise_category);
      let v: number | null = null;
      if (metric === 'best_time') {
        if (kind !== 'course') continue;
        if (dist && Number(r.actual_distance_m) !== dist) continue;
        v = effortSeconds(r);
      } else {
        if (kind !== 'muscu') continue;
        if (ex && !norm(`${effortExercise(r)} ${r.exercise_catalog_id ?? ''} ${r.exercise_category ?? ''}`).includes(ex)) continue;
        if (repsMissed(r)) continue;
        v = effortWeight(r);
      }
      if (v == null) continue;
      const day = String(r.date_achieved).slice(0, 10);
      const prev = byDay.get(day);
      byDay.set(day, prev == null ? v : metric === 'best_time' ? Math.min(prev, v) : Math.max(prev, v));
    }
    return [...byDay.entries()].sort().map(([x, y]) => ({ x, y: round(y, 2)! }));
  }
  throw new ToolError('Métrique inconnue.');
}

const METRIC_META: Record<string, { unit: string; better: 'higher' | 'lower' | null; kind: 'line' | 'bar'; label: string }> = {
  weight: { unit: 'kg', better: null, kind: 'line', label: 'Poids' },
  body_fat: { unit: '%', better: 'lower', kind: 'line', label: 'Masse grasse' },
  muscle_mass: { unit: 'kg', better: 'higher', kind: 'line', label: 'Masse musculaire' },
  readiness: { unit: '/100', better: 'higher', kind: 'line', label: 'Forme' },
  sleep_hours: { unit: 'h', better: 'higher', kind: 'bar', label: 'Sommeil' },
  fatigue: { unit: '/5', better: 'lower', kind: 'line', label: 'Fatigue' },
  stress: { unit: '/5', better: 'lower', kind: 'line', label: 'Stress' },
  motivation: { unit: '/5', better: 'higher', kind: 'line', label: 'Motivation' },
  kcal: { unit: 'kcal', better: null, kind: 'bar', label: 'Calories' },
  protein: { unit: 'g', better: null, kind: 'bar', label: 'Protéines' },
  sessions_per_week: { unit: 'séances', better: null, kind: 'bar', label: 'Séances faites par semaine' },
  best_time: { unit: 's', better: 'lower', kind: 'line', label: 'Meilleur chrono' },
  max_weight: { unit: 'kg', better: 'higher', kind: 'line', label: 'Charge max' },
};

/* -------------------------------------------------------------------------------------------------------------------
 * Execution
 * ----------------------------------------------------------------------------------------------------------------- */

export async function runTool(ctx: Ctx, name: string, args: any): Promise<ToolResult> {
  try {
    return await execute(ctx, name, args ?? {});
  } catch (e) {
    if (e instanceof ToolError) {
      console.warn('tool refused', name, e.message);
      if (ctx.debug) ctx.emit({ debug: { tool: name, error: e.message, args: JSON.stringify(args ?? {}).slice(0, 3000) } });
      return { content: { error: e.message } };
    }
    console.error('tool failed', name, e);
    return { content: { error: 'Données indisponibles pour le moment.' } };
  }
}

async function execute(ctx: Ctx, name: string, a: any): Promise<ToolResult> {
  const sb = ctx.supabase;
  switch (name) {
    case 'get_profile': {
      const who = await resolveAthlete(ctx, a.athlete_id);
      const { data: p } = await sb
        .from('profiles')
        .select('first_name, gender, height, weight, disciplines, objective, target_weight, activity_level')
        .eq('id', who.id)
        .maybeSingle();
      const out: any = {
        prenom: p?.first_name ?? null,
        sexe: p?.gender ?? null,
        taille_cm: p?.height ?? null,
        poids_kg: p?.weight ?? null,
        disciplines: p?.disciplines ?? [],
        objectif_profil: ctx.role === 'athlete' ? p?.objective ?? null : undefined,
        poids_cible: p?.target_weight ?? null,
        activite: p?.activity_level ?? null,
      };
      if (who.id === ctx.userId) {
        out.age = ctx.age;
        out.a_un_coach = ctx.hasCoach;
        const [{ data: goals }, { data: plans }] = await Promise.all([
          sb.from('athlete_goals').select('title, event_date, target, level, availability').eq('athlete_id', ctx.userId).eq('status', 'active').limit(3),
          sb.from('ai_plans').select('title, weeks, start_date, end_date').eq('athlete_id', ctx.userId).eq('status', 'active').limit(2),
        ]);
        out.objectifs = goals ?? [];
        out.plans_sprinty_actifs = plans ?? [];
      }
      return { content: out };
    }

    case 'get_checkins': {
      const who = await resolveAthlete(ctx, a.athlete_id);
      const days = daysArg(a.days, 14, 120);
      const { data } = await sb
        .from('check_ins')
        .select('date, health_score, sleep_hours, sleep_quality, fatigue_level, stress_level, motivation_level, pains')
        .eq('athlete_id', who.id)
        .gte('date', sinceIso(ctx, days))
        .order('date', { ascending: false })
        .limit(60);
      const rows = (data ?? []).map((r: any) => ({
        date: r.date,
        forme: round(r.health_score, 0),
        sommeil_h: r.sleep_hours,
        qualite_sommeil: r.sleep_quality,
        fatigue: r.fatigue_level,
        stress: r.stress_level,
        motivation: r.motivation_level,
        douleurs: Array.isArray(r.pains) ? r.pains.length : 0,
      }));
      return {
        content: {
          athlete: who.name,
          echelles: 'forme sur 100 ; qualité du sommeil, fatigue, stress et motivation sur 5 (fatigue : 1 = frais, 5 = épuisé ; stress : 1 = serein, 5 = très stressé ; motivation : 1 = faible, 5 = à bloc ; qualité du sommeil : 5 = excellente)',
          nombre: rows.length,
          moyennes: {
            forme: avg(rows.map((r: any) => r.forme)),
            sommeil_h: avg(rows.map((r: any) => r.sommeil_h)),
            fatigue: avg(rows.map((r: any) => r.fatigue)),
            stress: avg(rows.map((r: any) => r.stress)),
            motivation: avg(rows.map((r: any) => r.motivation)),
          },
          jours: rows,
        },
      };
    }

    case 'get_workouts': {
      const who = await resolveAthlete(ctx, a.athlete_id);
      const days = daysArg(a.days, 14, 180);
      const ahead = Math.min(120, Math.max(0, parseInt(String(a.days_ahead ?? 7), 10) || 0));
      const { data } = await sb
        .from('workouts')
        .select('date_prevue, type_seance, status, description, source, blocks, measures, intensity')
        .eq('athlete_id', who.id)
        .gte('date_prevue', sinceIso(ctx, days))
        .lte('date_prevue', `${addDays(ctx.today, ahead)}T23:59:59`)
        .order('date_prevue')
        .limit(80);
      const rows = (data ?? [])
        .filter((w: any) => !w?.measures?.is_master)
        .map((w: any) => ({
          date: String(w.date_prevue).slice(0, 10),
          type: w.type_seance,
          titre: clipText(String(w.description ?? '').split('\n')[0], 80) || w.type_seance,
          resultats_saisis: w.status === 'completed',
          origine: w.source === 'sprinty' ? 'Sprinty' : 'coach',
          contenu: summarizeBlocks(w),
        }));
      const isRest = (r: any) => /repos/i.test(r.type ?? '');
      const past = rows.filter((r: any) => r.date < ctx.today && !isRest(r));
      const todayRows = rows.filter((r: any) => r.date === ctx.today);
      const upcoming = rows.filter((r: any) => r.date > ctx.today && !isRest(r));
      const next = upcoming[0] ?? null;
      return {
        content: {
          athlete: who.name,
          aujourdhui_date: ctx.today,
          prochaine_seance: next ? { date: next.date, type: next.type, titre: next.titre } : "aucune séance programmée à venir (un jour de repos n'est pas une séance)",
          note: "Un « Repos » n'est PAS une séance : ne dis jamais que la prochaine séance est un jour de repos, utilise prochaine_seance. « Résultats saisis » = l'athlète a validé la séance et noté ses résultats ; une séance sans résultats saisis n'est PAS forcément une séance non faite. Les séances d'aujourd'hui et à venir ne sont jamais « manquées ».",
          passees: { nombre: past.length, avec_resultats_saisis: past.filter((r: any) => r.resultats_saisis).length, sans_resultats_saisis: past.filter((r: any) => !r.resultats_saisis).length },
          aujourdhui: todayRows,
          a_venir: upcoming.length,
          seances: rows,
        },
      };
    }

    case 'get_results': {
      const who = await resolveAthlete(ctx, a.athlete_id);
      const days = daysArg(a.days, 60);
      const { data } = await sb
        .from('athlete_efforts')
        .select(EFFORT_COLS)
        .eq('athlete_id', who.id)
        .gte('date_achieved', sinceIso(ctx, days))
        .order('date_achieved', { ascending: false })
        .limit(600);
      const wantKind = ['course', 'muscu', 'escalier'].includes(a.kind) ? a.kind : null;
      const dist = a.distance_m ? parseInt(a.distance_m, 10) : null;
      const ex = norm(a.exercise);
      const rows = (data ?? [])
        .filter((r: any) => (!wantKind || effortKind(r.exercise_category) === wantKind))
        .filter((r: any) => !dist || Number(r.actual_distance_m) === dist)
        .filter((r: any) => !ex || norm(`${effortExercise(r)} ${r.exercise_catalog_id ?? ''} ${r.exercise_category ?? ''}`).includes(ex))
        .map((r: any) => ({
          date: String(r.date_achieved).slice(0, 10),
          type: effortKind(r.exercise_category),
          seance: r.exercise_category,
          exercice: effortExercise(r),
          _cle: effortKey(r),
          reps_tenues: effortKind(r.exercise_category) === 'muscu' && repsMissed(r) ? false : undefined,
          terrain: effortKind(r.exercise_category) === 'course' ? effortSurface(r) : undefined,
          distance_m: r.actual_distance_m != null ? Number(r.actual_distance_m) : null,
          secondes: effortSeconds(r),
          reps: r.actual_reps,
          charge_kg: effortWeight(r),
          hauteur_cm: r.actual_height_cm,
          intensite: r.actual_intensity,
          record: r.is_pr || undefined,
        }));
      // Short summary per distance (running) and per exercise (strength), so the model does not recompute
      const groups = new Map<string, { label: string; n: number; best: number | null; sum: number; first?: number; last?: number; unit: string }>();
      for (const r of [...rows].reverse()) {
        const key = r.type === 'course' && r.distance_m ? `${r.distance_m} m${r.terrain === 'côte' ? ' (côte)' : ''}` : r.type === 'muscu' ? `muscu|${r._cle}` : null;
        const label = r.type === 'muscu' ? String(r.exercice ?? r.seance) : key;
        const v = r.type === 'course' ? r.secondes : r.type === 'muscu' && r.reps_tenues !== false ? r.charge_kg : null;
        if (!key || v == null) continue;
        const g = groups.get(key) ?? { label: String(label), n: 0, best: null, sum: 0, unit: r.type === 'course' ? 's' : 'kg' };
        g.n++;
        g.sum += v;
        g.best = g.best == null ? v : r.type === 'course' ? Math.min(g.best, v) : Math.max(g.best, v);
        g.first ??= v;
        g.last = v;
        groups.set(key, g);
      }
      return {
        content: {
          athlete: who.name,
          nombre: rows.length,
          resume: [...groups.values()].map((g) => ({ serie: g.label, mesures: g.n, meilleur: round(g.best, 2), moyenne: round(g.sum / g.n, 2), premier: round(g.first!, 2), dernier: round(g.last!, 2), unite: g.unit })),
          resultats: rows.slice(0, 80).map(({ _cle, ...r }: any) => r),
        },
      };
    }

    case 'get_performance': {
      const who = await resolveAthlete(ctx, a.athlete_id);
      const { data, error } = await sb.rpc('get_athlete_performance', { p_athlete: who.id, p_weeks: 8 });
      if (error) throw new ToolError('Impossible de lire la performance de cet athlète.');
      return {
        content: {
          athlete: who.name,
          note: "charge = effort ressenti (1-10) × minutes ; ratio = charge des 7 derniers jours / moyenne hebdomadaire des 28 jours (0,8 à 1,3 = zone optimale, au-dessus de 1,5 = risque). Si la charge est vide, l'athlète ne renseigne pas l'effort ressenti.",
          ...(data as Record<string, unknown>),
        },
      };
    }

    case 'get_records': {
      const who = await resolveAthlete(ctx, a.athlete_id);
      const { data } = await sb
        .from('athlete_efforts')
        .select(EFFORT_COLS)
        .eq('athlete_id', who.id)
        .order('date_achieved', { ascending: false })
        .limit(3000);
      const best = new Map<string, { exercice: string; type: string; valeur: number; unite: string; distance_m?: number; date: string }>();
      for (const r of data ?? []) {
        const kind = effortKind(r.exercise_category);
        const date = String(r.date_achieved).slice(0, 10);
        if (kind === 'course') {
          const v = effortSeconds(r);
          if (v == null || !r.actual_distance_m) continue;
          const surf = effortSurface(r);
          const key = `course ${Number(r.actual_distance_m)} ${surf}`;
          const cur = best.get(key);
          if (!cur || v < cur.valeur) best.set(key, { exercice: `${Number(r.actual_distance_m)} m${surf === 'côte' ? ' (côte)' : ''}`, type: 'course', valeur: v, unite: 's', distance_m: Number(r.actual_distance_m), date });
        } else if (kind === 'muscu') {
          const v = effortWeight(r);
          if (v == null || v <= 0 || repsMissed(r)) continue; // a set whose reps were not completed is not a record
          const name = effortExercise(r);
          const key = `muscu ${effortKey(r)}`;
          const cur = best.get(key);
          if (!cur || v > cur.valeur) best.set(key, { exercice: name, type: 'muscu', valeur: v, unite: 'kg', date });
        }
      }
      return { content: { athlete: who.name, records: [...best.values()].map((b) => ({ ...b, valeur: round(b.valeur, 2) })) } };
    }

    case 'get_weight': {
      const who = await resolveAthlete(ctx, a.athlete_id);
      const days = daysArg(a.days, 90);
      const { data } = await sb
        .from('body_metrics')
        .select('created_at, weight, body_fat, muscle_mass_kg')
        .eq('athlete_id', who.id)
        .gte('created_at', sinceIso(ctx, days))
        .order('created_at')
        .limit(120);
      const rows = (data ?? []).map((r: any) => ({ date: String(r.created_at).slice(0, 10), poids: r.weight, mg_pct: r.body_fat, muscle_kg: r.muscle_mass_kg }));
      const w = rows.filter((r: any) => r.poids != null);
      return {
        content: {
          athlete: who.name,
          nombre: rows.length,
          premier: w[0] ?? null,
          dernier: w[w.length - 1] ?? null,
          pesees: rows.slice(-40),
        },
      };
    }

    case 'weekly_summary': {
      if (!ctx.limits.weeklyReport) throw new ToolError('Le bilan de la semaine fait partie de la formule Plus.');
      const who = await resolveAthlete(ctx, a.athlete_id);
      const from = sinceIso(ctx, 7);
      const to = addDays(ctx.today, -1);
      const [{ data: ws }, { data: checks }, { data: meals }, { data: bm }, { data: prof }, { data: eff }] = await Promise.all([
        sb.from('workouts').select('date_prevue, type_seance, status, measures').eq('athlete_id', who.id).gte('date_prevue', from).lt('date_prevue', `${ctx.today}T00:00:00`),
        sb.from('check_ins').select('date, health_score, sleep_hours, fatigue_level, stress_level').eq('athlete_id', who.id).gte('date', from).lte('date', to),
        sb.from('meal_logs').select('consumed_at, calories, proteines').eq('user_id', who.id).gte('consumed_at', from).lte('consumed_at', to),
        sb.from('body_metrics').select('created_at, weight').eq('athlete_id', who.id).gte('created_at', sinceIso(ctx, 14)).order('created_at'),
        sb.from('profiles').select('manual_kcal_goal, objective, target_weight').eq('id', who.id).maybeSingle(),
        sb.from('athlete_efforts').select(EFFORT_COLS).eq('athlete_id', who.id).gte('date_achieved', from).limit(500),
      ]);
      const sessions = (ws ?? []).filter((w: any) => !w?.measures?.is_master && !/repos/i.test(w.type_seance ?? ''));
      const byDay = new Map<string, { kcal: number; prot: number }>();
      for (const m of meals ?? []) {
        const d = byDay.get(m.consumed_at) ?? { kcal: 0, prot: 0 };
        d.kcal += Number(m.calories ?? 0);
        d.prot += Number(m.proteines ?? 0);
        byDay.set(m.consumed_at, d);
      }
      const days = [...byDay.values()];
      const weights = (bm ?? []).filter((r: any) => r.weight != null).map((r: any) => Number(r.weight));
      const runs = (eff ?? []).filter((r: any) => effortKind(r.exercise_category) === 'course' && effortSeconds(r) != null && r.actual_distance_m);
      const bestByDist = new Map<number, number>();
      for (const r of runs) {
        const d = Number(r.actual_distance_m);
        const v = effortSeconds(r)!;
        bestByDist.set(d, Math.min(bestByDist.get(d) ?? v, v));
      }
      return {
        content: {
          athlete: who.name,
          periode: `${from} → ${to}`,
          seances: {
            prevues: sessions.length,
            avec_resultats_saisis: sessions.filter((w: any) => w.status === 'completed').length,
            note: "Sans résultats saisis ne veut pas dire non faite.",
          },
          meilleurs_chronos: [...bestByDist.entries()].map(([d, v]) => ({ distance_m: d, secondes: round(v, 2) })),
          forme: { moyenne: avg((checks ?? []).map((c: any) => c.health_score)), jours_renseignes: (checks ?? []).length },
          sommeil_moyen_h: avg((checks ?? []).map((c: any) => c.sleep_hours)),
          fatigue_moyenne: avg((checks ?? []).map((c: any) => c.fatigue_level)),
          stress_moyen: avg((checks ?? []).map((c: any) => c.stress_level)),
          nutrition: {
            jours_renseignes: days.length,
            kcal_moyennes: avg(days.map((d) => Math.round(d.kcal))),
            proteines_moyennes_g: avg(days.map((d) => Math.round(d.prot))),
            objectif_kcal: prof?.manual_kcal_goal ?? null,
          },
          poids: { debut: weights[0] ?? null, fin: weights[weights.length - 1] ?? null, cible: prof?.target_weight ?? null, objectif: prof?.objective ?? null },
          consigne: "Rédige le bilan : 3 points forts, 2 points de vigilance, 3 actions pour la semaine qui vient. Utilise show_stats pour les chiffres clés. Ne cite que ces données ; si une rubrique est vide, dis-le simplement. Ne dis jamais qu'une séance a été « respectée » ou « manquée » : parle de séances avec ou sans résultats saisis. L'échelle de la forme est sur 100.",
        },
      };
    }

    case 'get_plan_sessions': {
      if (ctx.role === 'coach' || ctx.hasCoach) throw new ToolError('Réservé aux athlètes sans coach.');
      const { data: plan } = await sb.from('ai_plans').select('id, title, start_date, end_date, weeks').eq('athlete_id', ctx.userId).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (!plan) return { content: { plan: null, note: "Aucun plan Sprinty actif : propose d'en créer un." } };
      const { data } = await sb.from('workouts').select('date_prevue, type_seance, status, description').eq('ai_plan_id', plan.id).order('date_prevue');
      const rows = (data ?? []).map((w: any) => ({ date: String(w.date_prevue).slice(0, 10), type: w.type_seance, titre: clipText(String(w.description ?? '').split('\n')[0], 70), resultats_saisis: w.status === 'completed' }));
      return {
        content: {
          plan: { titre: plan.title, debut: plan.start_date, fin: plan.end_date, semaines: plan.weeks },
          a_venir: rows.filter((r: any) => r.date >= ctx.today),
          passees: rows.filter((r: any) => r.date < ctx.today).length,
          consigne: "Pour ajuster : regarde aussi get_checkins et get_results, explique en 2 phrases ce que tu changes et pourquoi, puis propose_plan pour les semaines restantes (il remplacera l'ancien après confirmation de l'athlète).",
        },
      };
    }

    case 'get_nutrition': {
      const who = await resolveAthlete(ctx, a.athlete_id);
      const days = daysArg(a.days, 7, 60);
      const [{ data }, { data: p }] = await Promise.all([
        sb.from('meal_logs').select('consumed_at, calories, proteines, glucides, lipides').eq('user_id', who.id).gte('consumed_at', sinceIso(ctx, days)).limit(2000),
        sb.from('profiles').select('manual_kcal_goal, weight').eq('id', who.id).maybeSingle(),
      ]);
      const byDay = new Map<string, { kcal: number; p: number; g: number; l: number }>();
      for (const r of data ?? []) {
        const d = byDay.get(r.consumed_at) ?? { kcal: 0, p: 0, g: 0, l: 0 };
        d.kcal += Number(r.calories ?? 0);
        d.p += Number(r.proteines ?? 0);
        d.g += Number(r.glucides ?? 0);
        d.l += Number(r.lipides ?? 0);
        byDay.set(r.consumed_at, d);
      }
      const jours = [...byDay.entries()].sort().map(([date, d]) => ({
        date,
        kcal: Math.round(d.kcal),
        proteines_g: Math.round(d.p),
        glucides_g: Math.round(d.g),
        lipides_g: Math.round(d.l),
      }));
      return {
        content: {
          athlete: who.name,
          objectif_kcal: p?.manual_kcal_goal ?? null,
          poids_kg: p?.weight ?? null,
          jours_renseignes: jours.length,
          moyenne_kcal: avg(jours.map((j) => j.kcal)),
          moyenne_proteines_g: avg(jours.map((j) => j.proteines_g)),
          jours,
        },
      };
    }

    case 'list_athletes': {
      if (ctx.role !== 'coach') throw new ToolError('Réservé au coach.');
      const roster = await loadRoster(ctx);
      const ids = roster.athletes.map((x) => x.id);
      const last = new Map<string, any>();
      if (ids.length) {
        const { data } = await sb.from('check_ins').select('athlete_id, date, health_score').in('athlete_id', ids).gte('date', sinceIso(ctx, 30)).order('date', { ascending: false });
        for (const r of data ?? []) if (!last.has(r.athlete_id)) last.set(r.athlete_id, r);
      }
      return {
        content: {
          equipes: roster.teams,
          sous_groupes: roster.subgroups.map((s) => ({ id: s.id, nom: s.name, equipe_id: s.teamId })),
          athletes: roster.athletes.map((x) => ({
            id: x.id,
            nom: x.name,
            equipe: x.teamName,
            sous_groupe: x.subgroupName,
            disciplines: x.disciplines,
            dernier_checkin: last.get(x.id)?.date ?? null,
            forme: round(last.get(x.id)?.health_score, 0),
          })),
        },
      };
    }

    case 'team_readiness': {
      if (ctx.role !== 'coach') throw new ToolError('Réservé au coach.');
      const roster = await loadRoster(ctx);
      const list = roster.athletes.filter(
        (x) => (!a.team_id || x.teamId === a.team_id) && (!a.subgroup_id || x.subgroupId === a.subgroup_id)
      );
      const ids = list.map((x) => x.id);
      if (!ids.length) return { content: { athletes: [], note: 'Aucun athlète validé.' } };
      const [{ data: checks }, { data: wos }] = await Promise.all([
        sb.from('check_ins').select('athlete_id, date, health_score, fatigue_level, sleep_hours, stress_level, pains').in('athlete_id', ids).gte('date', sinceIso(ctx, 3)).order('date', { ascending: false }),
        sb.from('workouts').select('athlete_id, status, date_prevue, measures').in('athlete_id', ids).eq('coach_id', ctx.userId).gte('date_prevue', sinceIso(ctx, 7)).lte('date_prevue', `${ctx.today}T23:59:59`),
      ]);
      const latest = new Map<string, any>();
      for (const c of checks ?? []) if (!latest.has(c.athlete_id)) latest.set(c.athlete_id, c);
      const rows = list.map((x) => {
        const c = latest.get(x.id);
        const mine = (wos ?? []).filter((w: any) => w.athlete_id === x.id && !w?.measures?.is_master);
        return {
          id: x.id,
          nom: x.name,
          sous_groupe: x.subgroupName,
          checkin: c?.date ?? null,
          forme: round(c?.health_score, 0),
          fatigue: c?.fatigue_level ?? null,
          sommeil_h: c?.sleep_hours ?? null,
          stress: c?.stress_level ?? null,
          douleurs: Array.isArray(c?.pains) ? c.pains.length : 0,
          seances_7j: `${mine.filter((w: any) => w.status === 'completed').length}/${mine.length}`,
        };
      });
      return { content: { echelles: 'forme /100 ; fatigue et stress sur 5 (1 = frais / serein, 5 = épuisé / très stressé)', athletes: rows } };
    }

    case 'missed_sessions': {
      if (ctx.role !== 'coach') throw new ToolError('Réservé au coach.');
      const roster = await loadRoster(ctx);
      const days = daysArg(a.days, 14, 90);
      const { data } = await sb
        .from('workouts')
        .select('athlete_id, date_prevue, type_seance, status, measures')
        .eq('coach_id', ctx.userId)
        .neq('athlete_id', ctx.userId)
        .gte('date_prevue', sinceIso(ctx, days))
        .lt('date_prevue', `${ctx.today}T00:00:00`);
      const per = new Map<string, { prevues: number; manquees: string[] }>();
      for (const w of data ?? []) {
        if (w?.measures?.is_master || /repos/i.test(w.type_seance ?? '')) continue;
        const e = per.get(w.athlete_id) ?? { prevues: 0, manquees: [] };
        e.prevues++;
        if (w.status !== 'completed') e.manquees.push(`${String(w.date_prevue).slice(0, 10)} ${w.type_seance}`);
        per.set(w.athlete_id, e);
      }
      return {
        content: {
          periode_jours: days,
          note: "Séances passées (avant aujourd'hui) dont l'athlète n'a pas saisi les résultats : il a pu les faire sans les valider. Ne dis pas « pas faites » mais « sans résultats saisis ».",
          athletes: [...per.entries()].map(([id, e]) => ({
            nom: roster.athletes.find((x) => x.id === id)?.name ?? 'Athlète',
            prevues: e.prevues,
            sans_resultats: e.manquees.length,
            detail: e.manquees.slice(0, 6),
          })),
        },
      };
    }

    case 'show_chart': {
      const meta = METRIC_META[a.metric];
      if (!meta) throw new ToolError('Métrique inconnue.');
      const days = daysArg(a.days, 60);
      const ids: string[] = ctx.role === 'coach'
        ? (Array.isArray(a.athlete_ids) && a.athlete_ids.length ? a.athlete_ids : ctx.focusAthlete ? [ctx.focusAthlete.id] : []).slice(0, 5)
        : [ctx.userId];
      if (!ids.length) throw new ToolError('Précise au moins un athlète (athlete_ids).');
      const series = [];
      for (const id of ids) {
        const who = await resolveAthlete(ctx, ctx.role === 'coach' ? id : undefined);
        const points = await seriesFor(ctx, who.id, a.metric, days, { distance_m: parseInt(a.distance_m, 10) || null, exercise: a.exercise });
        series.push({ name: ctx.role === 'coach' ? who.name : meta.label, points: points.slice(-90) });
      }
      const total = series.reduce((n, s) => n + s.points.length, 0);
      if (!total) return { content: { affiche: false, raison: 'Aucune donnée sur cette période : le graphique n’a pas été affiché.' } };
      const unit = a.metric === 'best_time' && a.distance_m ? `s (${a.distance_m} m)` : meta.unit;
      // Ligne de repère : le poids visé par l'athlète (un seul athlète affiché)
      let reference: { value: number; label: string } | null = null;
      if (a.metric === 'weight' && ids.length === 1) {
        const who = await resolveAthlete(ctx, ctx.role === 'coach' ? ids[0] : undefined);
        const { data: p } = await sb.from('profiles').select('target_weight').eq('id', who.id).maybeSingle();
        const target = Number(p?.target_weight);
        if (Number.isFinite(target) && target > 0) reference = { value: target, label: 'Objectif' };
      }
      ctx.emit({
        ui: {
          type: 'chart',
          title: clipText(a.title, 80) || meta.label,
          kind: meta.kind,
          unit,
          better: meta.better,
          series,
          reference,
        },
      });
      return {
        content: {
          affiche: true,
          resume: series.map((s) => {
            const ys = s.points.map((p) => p.y);
            return {
              serie: s.name,
              points: ys.length,
              premier: s.points[0] ?? null,
              dernier: s.points[s.points.length - 1] ?? null,
              min: ys.length ? Math.min(...ys) : null,
              max: ys.length ? Math.max(...ys) : null,
              moyenne: avg(ys),
            };
          }),
        },
      };
    }

    case 'show_stats': {
      const items = (Array.isArray(a.items) ? a.items : []).slice(0, 6).map((i: any) => ({
        label: clipText(String(i?.label ?? ''), 40),
        value: clipText(String(i?.value ?? ''), 20),
        unit: i?.unit ? clipText(String(i.unit), 12) : undefined,
        trend: ['up', 'down', 'flat'].includes(i?.trend) ? i.trend : undefined,
        good: typeof i?.good === 'boolean' ? i.good : undefined,
      })).filter((i: any) => i.label && i.value);
      if (!items.length) throw new ToolError('Aucun chiffre à afficher.');
      ctx.emit({ ui: { type: 'stats', title: a.title ? clipText(a.title, 80) : undefined, items } });
      return { content: { affiche: true } };
    }

    case 'show_table': {
      const columns = (Array.isArray(a.columns) ? a.columns : []).slice(0, 8).map((c: any) => clipText(String(c), 30));
      const rows = (Array.isArray(a.rows) ? a.rows : []).slice(0, 30).map((r: any) =>
        (Array.isArray(r) ? r : []).slice(0, columns.length).map((c: any) => clipText(String(c ?? ''), 40))
      );
      if (!columns.length || !rows.length) throw new ToolError('Tableau vide.');
      ctx.emit({ ui: { type: 'table', title: a.title ? clipText(a.title, 80) : undefined, columns, rows } });
      return { content: { affiche: true } };
    }

    case 'ask_choices': {
      const questions = (Array.isArray(a.questions) ? a.questions : []).slice(0, 4).map((q: any, i: number) => ({
        id: clipText(String(q?.id ?? `q${i + 1}`), 30),
        question: clipText(String(q?.question ?? ''), 160),
        options: (Array.isArray(q?.options) ? q.options : []).slice(0, 8).map((o: any) => clipText(String(o), 50)).filter(Boolean),
        multi: q?.multi === true,
        allow_other: q?.allow_other === true,
      })).filter((q: any) => q.question && q.options.length >= 2);
      if (!questions.length) throw new ToolError('Il faut au moins une question avec 2 réponses.');
      if (a.intro) ctx.emit({ t: `${clipText(String(a.intro), 300)}\n` });
      ctx.emit({ ui: { type: 'choices', questions } });
      return { content: { affiche: true }, terminal: true, closing: false };
    }

    case 'suggest_followups': {
      const items = (Array.isArray(a.items) ? a.items : [])
        .slice(0, 3)
        .map((s: any) => clipText(String(s ?? ''), 80))
        .filter(Boolean);
      if (items.length) {
        ctx.emit({ ui: { type: 'suggestions', items } });
      }
      return { content: { affiche: true } };
    }

    case 'propose_sessions': {
      const caps = capsFor(ctx, null);
      if (ctx.role !== 'coach' && ctx.hasCoach) caps.recoveryOnly = true;
      let target: any;
      if (ctx.role === 'coach') {
        target = await resolveTarget(ctx, a.target);
      } else {
        target = { type: 'self', id: ctx.userId, name: ctx.firstName || 'Moi' };
      }
      const max = ctx.role === 'coach' ? 14 : 3;
      const sessions = normalizeAll(a.sessions, caps, ctx.today, addDays(ctx.today, 120)).slice(0, max);
      if (!sessions.length) {
        throw new ToolError(
          caps.recoveryOnly
            ? "Seules les séances de récupération douce (kind mobility, avec des exercices) sont possibles : l'entraînement est programmé par le coach."
            : 'Aucune séance valable (dates à partir d’aujourd’hui, contenu complet).'
        );
      }
      if (a.intro) ctx.emit({ t: `${clipText(String(a.intro), 400)}\n` });
      ctx.emit({ ui: { type: 'sessions_proposal', title: clipText(a.title, 80) || 'Séances proposées', target, sessions } });
      return {
        content: {
          affiche: true,
          seances: sessions.map(describeSession),
          consigne: "La carte est affichée : l'utilisateur peut l'ajouter au calendrier. Termine par une phrase courte, sans répéter le détail.",
        },
        terminal: true,
      };
    }

    case 'propose_plan': {
      if (ctx.role === 'coach' || ctx.hasCoach) throw new ToolError('Les plans Sprinty sont réservés aux athlètes sans coach.');
      if (ctx.limits.planLifetimeMax != null) {
        const { count } = await ctx.supabase.from('ai_plans').select('id', { count: 'exact', head: true }).eq('athlete_id', ctx.userId);
        if ((count ?? 0) >= ctx.limits.planLifetimeMax) {
          throw new ToolError("Son plan gratuit (un seul plan de 2 semaines) a déjà été utilisé. Un nouveau plan et les plans jusqu'à 12 semaines font partie de la formule Plus : dis-le simplement, sans insister, et propose-lui de continuer à discuter ou de regarder la page des formules.");
        }
      }
      const s = a.safety ?? {};
      const safety = { pain: s.pain === true, heart: s.heart === true, malaise: s.malaise === true, comeback: s.comeback === true };
      const cautious = Object.values(safety).some(Boolean);
      const caps = capsFor(ctx, cautious);
      const weeksRaw = (Array.isArray(a.weeks) ? a.weeks : []).slice(0, ctx.limits.planWeeksMax);
      if (!weeksRaw.length) throw new ToolError('Le plan doit contenir au moins une semaine.');
      const maxDate = addDays(ctx.today, ctx.limits.planWeeksMax * 7 + 6);
      // Sessions are regrouped into real calendar weeks (Monday to Sunday); the model's focus labels are kept in order
      // Remember which model week each session came from, to keep its focus label
      const tagged = weeksRaw.flatMap((w: any, wi: number) => (Array.isArray(w?.sessions) ? w.sessions : []).map((x: any) => ({ ...x, __w: wi })));
      const origin = new Map<string, number>();
      for (const x of tagged) if (isIsoDate(x?.date) && !origin.has(x.date)) origin.set(x.date, x.__w);
      const all0 = normalizeAll(tagged, caps, addDays(ctx.today, 1), maxDate);
      const mondayOf = (iso: string) => addDays(iso, -((new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7));
      const buckets = new Map<string, Session[]>();
      for (const x of all0) {
        const k = mondayOf(x.date);
        if (!buckets.has(k)) buckets.set(k, []);
        // One session per day
        if (!buckets.get(k)!.some((y) => y.date === x.date)) buckets.get(k)!.push(x);
      }
      const weeks = [...buckets.entries()]
        .sort(([x], [y]) => x.localeCompare(y))
        .slice(0, ctx.limits.planWeeksMax)
        .map(([, sessions], i) => {
          const training = sessions.filter((x) => x.kind !== 'rest');
          return {
            week: i + 1,
            focus: clipText(String(weeksRaw[majority(sessions.map((x) => origin.get(x.date) ?? i))]?.focus ?? ''), 120) || `Semaine ${i + 1}`,
            // At most 6 training sessions a week: one full rest day is kept
            sessions: [...training.slice(0, 6), ...sessions.filter((x) => x.kind === 'rest')].sort((x, y) => x.date.localeCompare(y.date)),
          };
        });
      if (!weeks.length) throw new ToolError('Aucune séance valable dans le plan (dates à partir d’aujourd’hui).');
      const all = weeks.flatMap((w: any) => w.sessions);
      const goal = {
        title: clipText(String(a.goal?.title ?? ''), 200) || clipText(a.title, 200) || 'Objectif',
        event_date: isIsoDate(a.goal?.event_date) ? a.goal.event_date : null,
        target: a.goal?.target ? clipText(String(a.goal.target), 200) : null,
        level: ['debutant', 'intermediaire', 'confirme'].includes(a.goal?.level) ? a.goal.level : null,
      };
      ctx.emit({
        ui: {
          type: 'plan_proposal',
          title: clipText(a.title, 80) || goal.title,
          goal,
          safety,
          cautious,
          start_date: all[0].date,
          end_date: all[all.length - 1].date,
          weeks,
          advice: a.advice ? clipText(String(a.advice), 600) : '',
        },
      });
      return {
        content: {
          affiche: true,
          prudent: cautious,
          nombre_semaines: weeks.length,
          nombre_seances: all.filter((x: any) => x.kind !== 'rest').length,
          semaines: weeks.map((w: any) => `S${w.week} ${w.focus} : ${w.sessions.length} séances`),
          consigne: "Le plan est affiché : l'athlète peut l'ajouter à son calendrier. Résume-le en 3 lignes maximum avec ces nombres exacts (semaines, séances) et rappelle d'écouter son corps.",
        },
        terminal: true,
      };
    }

    case 'propose_goal': {
      if (ctx.role === 'coach') throw new ToolError('Réservé aux athlètes.');
      const goal = {
        title: clipText(String(a.title ?? ''), 200),
        event_date: isIsoDate(a.event_date) ? a.event_date : null,
        target: a.target ? clipText(String(a.target), 200) : null,
        level: ['debutant', 'intermediaire', 'confirme'].includes(a.level) ? a.level : null,
        days_per_week: a.days_per_week ? Math.min(7, Math.max(1, parseInt(a.days_per_week, 10) || 3)) : null,
      };
      if (!goal.title) throw new ToolError('Objectif vide.');
      ctx.emit({ ui: { type: 'goal_proposal', goal } });
      return {
        content: {
          affiche: true,
          consigne: "Carte affichée : l'athlète peut enregistrer cet objectif. Ne dis pas qu'il est enregistré.",
        },
      };
    }

    case 'draft_announcement': {
      if (ctx.role !== 'coach') throw new ToolError('Réservé au coach.');
      const target = await resolveTarget(ctx, a.target);
      if (target.type === 'athlete') throw new ToolError('Une annonce va à une équipe ou un sous-groupe.');
      const text = clipText(String(a.text ?? '').trim(), 2000);
      if (!text) throw new ToolError('Annonce vide.');
      ctx.emit({ ui: { type: 'announcement_draft', target, text } });
      return { content: { affiche: true, consigne: 'Brouillon affiché ; le coach peut le modifier et le publier.' }, terminal: true };
    }

    case 'remember_facts': {
      if (ctx.role !== 'coach') throw new ToolError('Réservé au coach.');
      const known = new Set((ctx.memory ?? []).map((m) => m.content.toLowerCase()));
      const items = (Array.isArray(a.items) ? a.items : [])
        .map((it: any) => ({
          category: MEMORY_CATEGORIES.includes(it?.category) ? it.category : 'autre',
          content: clipText(String(it?.content ?? '').trim(), 160),
          source: ['presentation', 'conversation', 'programmation'].includes(it?.source) ? it.source : 'conversation',
        }))
        .filter((it: any) => it.content && !known.has(it.content.toLowerCase()))
        .slice(0, 8);
      if (!items.length) throw new ToolError('Rien de nouveau à retenir.');
      const room = 40 - (ctx.memory?.length ?? 0);
      if (room <= 0) throw new ToolError('Mémoire pleine (40 éléments) : invite le coach à faire du tri dans « Ce que Sprinty sait de moi ».');
      ctx.emit({ ui: { type: 'memory_proposal', items: items.slice(0, room) } });
      return { content: { affiche: true, consigne: 'Carte affichée ; le coach coche ce qu’il garde.' }, terminal: true, closing: false };
    }

    case 'get_coach_habits': {
      if (ctx.role !== 'coach') throw new ToolError('Réservé au coach.');
      const { data, error } = await sb
        .from('workouts')
        .select('id, group_assignment_id, date_prevue, type_seance, measures, blocks')
        .eq('coach_id', ctx.userId)
        .gte('date_prevue', sinceIso(ctx, 56))
        .lte('date_prevue', addDays(ctx.today, 1))
        .limit(2000);
      if (error) throw new ToolError('Séances indisponibles.');
      const habits = computeCoachHabits(data ?? [], 8);
      if (habits.seances === 0) return { content: { seances: 0, consigne: 'Aucune séance programmée ces 8 dernières semaines : ne déduis aucune habitude.' } };
      return { content: habits };
    }

    case 'search_competitions':
      return await searchCompetitions(ctx, a);

    default:
      throw new ToolError('Outil inconnu.');
  }
}

const majority = (xs: number[]) => {
  const count = new Map<number, number>();
  for (const x of xs) count.set(x, (count.get(x) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
};

function capsFor(ctx: Ctx, cautious: boolean | null): Caps {
  const minor = ctx.age !== null && ctx.age < 18;
  if (cautious) return { maxRunIntensity: 75, maxPercent1rm: 60, allowCompetition: false };
  return { maxRunIntensity: minor ? 90 : 100, maxPercent1rm: minor ? 80 : 95, allowCompetition: true };
}

function normalizeAll(raw: any, caps: Caps, minDate: string, maxDate: string): Session[] {
  return (Array.isArray(raw) ? raw : [])
    .slice(0, 60)
    .map((s: any) => normalizeSession(s, caps, minDate, maxDate))
    .filter((s): s is Session => !!s)
    .sort((x, y) => x.date.localeCompare(y.date));
}

async function resolveTarget(ctx: Ctx, raw: any) {
  const roster = await loadRoster(ctx);
  const type = raw?.type;
  const id = typeof raw?.id === 'string' ? raw.id : '';
  if (type === 'athlete') {
    const x = roster.athletes.find((r) => r.id === id);
    if (!x) throw new ToolError('Athlète inconnu : utilise un id de list_athletes.');
    return { type, id, name: x.name, teamId: x.teamId };
  }
  if (type === 'subgroup') {
    const s = roster.subgroups.find((r) => r.id === id);
    if (!s) throw new ToolError('Sous-groupe inconnu : utilise un id de list_athletes.');
    return { type, id, name: s.name, teamId: s.teamId };
  }
  if (type === 'team') {
    const t = roster.teams.find((r) => r.id === id) ?? (roster.teams.length === 1 ? roster.teams[0] : null);
    if (!t) throw new ToolError('Équipe inconnue : utilise un id de list_athletes.');
    return { type, id: t.id, name: t.name, teamId: t.id };
  }
  throw new ToolError('Destinataire invalide (athlete, subgroup ou team).');
}

/* -------------------------------------------------------------------------------------------------------------------
 * Web search (Tavily)
 * ----------------------------------------------------------------------------------------------------------------- */

const MONTHS: Record<string, string> = {
  janvier: '01', fevrier: '02', mars: '03', avril: '04', mai: '05', juin: '06',
  juillet: '07', aout: '08', septembre: '09', octobre: '10', novembre: '11', decembre: '12',
};

function findDate(textIn: string, fallbackYear: number): string | null {
  const t = textIn.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const full = t.match(/(\d{1,2})(?:er)?\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s+(\d{4})/);
  if (full) return `${full[3]}-${MONTHS[full[2]]}-${full[1].padStart(2, '0')}`;
  const short = t.match(/(\d{1,2})(?:er)?\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)/);
  if (short) return `${fallbackYear}-${MONTHS[short[2]]}-${short[1].padStart(2, '0')}`;
  const num = t.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (num) return `${num[3]}-${num[2].padStart(2, '0')}-${num[1].padStart(2, '0')}`;
  return null;
}

async function searchCompetitions(ctx: Ctx, a: any): Promise<ToolResult> {
  const apiKey = Deno.env.get('TAVILY_API_KEY');
  if (!apiKey) throw new ToolError('La recherche web est indisponible pour le moment.');
  const region = clipText(String(a.region ?? 'France'), 60);
  const month = clipText(String(a.month ?? ''), 40);
  const discipline = clipText(String(a.discipline ?? ''), 40);
  const where = a.indoor === true ? 'en salle' : a.indoor === false ? 'plein air' : '';
  const query = `compétition meeting athlétisme ${where} ${discipline} ${region} ${month}`.replace(/\s+/g, ' ').trim();
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, query, search_depth: 'advanced', max_results: 10 }),
  });
  if (!res.ok) {
    console.error('tavily', res.status, await res.text().catch(() => ''));
    throw new ToolError('La recherche web n’a pas répondu.');
  }
  const data = await res.json();
  const yearMatch = month.match(/\d{4}/);
  const year = yearMatch ? parseInt(yearMatch[0], 10) : parseInt(ctx.today.slice(0, 4), 10);
  const monthKey = Object.keys(MONTHS).find((m) => month.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(m));
  const target = monthKey ? `${year}-${MONTHS[monthKey]}` : null;
  // Within a month of the requested one
  const near = (iso: string | null) => {
    if (!iso || !target) return true;
    const diff = (parseInt(iso.slice(0, 4), 10) - year) * 12 + (parseInt(iso.slice(5, 7), 10) - parseInt(target.slice(5, 7), 10));
    return Math.abs(diff) <= 1;
  };
  const results = (data?.results ?? [])
    .filter((r: any) => !/wikipedia\.org|youtube\.com|facebook\.com|instagram\.com/i.test(String(r.url ?? '')))
    .filter((r: any) => /athl|meeting|competition|compétition|championnat|indoor/i.test(`${r.title} ${r.content}`))
    .map((r: any, i: number) => {
      const title = String(r.title ?? '').replace(/\s*[|–-]\s*(Facebook|YouTube|Instagram).*/i, '').trim().slice(0, 120);
      return {
        id: `web-${i}`,
        title: title || "Compétition d'athlétisme",
        date: findDate(`${r.title} ${r.content}`, year),
        location: region,
        snippet: clipText(String(r.content ?? ''), 220),
        url: typeof r.url === 'string' ? r.url : null,
      };
    })
    .filter((r: any) => near(r.date))
    .sort((x: any, y: any) => (x.date ? 0 : 1) - (y.date ? 0 : 1))
    .slice(0, 6);
  if (!results.length) return { content: { trouve: 0, note: 'Aucun résultat pertinent. Propose de changer de région ou de période.' } };
  ctx.emit({ ui: { type: 'competitions', query: `${region} · ${month}`.trim(), items: results } });
  return {
    content: {
      trouve: results.length,
      resultats: results.map((r: any) => ({ titre: r.title, date: r.date, extrait: r.snippet })),
      consigne: "Les cartes sont affichées. Commente en 2 phrases sans inventer de lieu ni de date absents des extraits, et rappelle de vérifier dates et inscriptions sur le site officiel (FFA, organisateur).",
    },
  };
}
