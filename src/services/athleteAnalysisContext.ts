/**
 * athleteAnalysisContext.ts
 *
 * Construit le prompt système envoyé à Sprinty quand un coach analyse un athlète.
 * Récupère TOUT l'historique de l'athlète (séances + résultats, nutrition, forme,
 * composition corporelle) et le formate en lignes compactes (1 ligne par jour /
 * séance / pesée) pour que l'IA puisse répondre sur n'importe quelle date.
 *
 * Les permissions RLS existantes autorisent un coach à lire ces données pour ses
 * athlètes approuvés (meal_logs, check_ins, body_metrics, athlete_efforts) et les
 * séances dont il est le coach (workouts).
 */
import { supabase } from './supabase';

export type AnalysisDomain = 'training' | 'nutrition' | 'wellness' | 'body';

export const ALL_DOMAINS: AnalysisDomain[] = ['training', 'nutrition', 'wellness', 'body'];

export const DOMAIN_LABELS: Record<AnalysisDomain, string> = {
  training: 'Entraînements',
  nutrition: 'Nutrition',
  wellness: 'Forme',
  body: 'Poids / Compo',
};

const PAGE_SIZE = 1000;
const MAX_SECTION_LINES = 400;
const DETAIL_WINDOW_DAYS = 183; // ~6 mois de détail complet avant regroupement
const FOCUS_DAYS = 30;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Récupère toutes les lignes d'une requête en paginant (Supabase limite à 1000). */
async function fetchAll<T = any>(build: (from: number, to: number) => any): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; page < 50; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) {
      console.warn('[athleteAnalysisContext] query error:', error.message);
      break;
    }
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Date locale YYYY-MM-DD à partir d'un timestamp ISO. */
const toLocalDay = (iso: string | null | undefined): string => {
  if (!iso) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso).slice(0, 10);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const todayStr = () => toLocalDay(new Date().toISOString());

const daysAgo = (day: string): number => {
  const d = new Date(`${day}T12:00:00`);
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return Math.round((now.getTime() - d.getTime()) / 86400000);
};

const num = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? null : n;
};

const round = (v: number, digits = 1) => {
  const f = Math.pow(10, digits);
  return Math.round(v * f) / f;
};

const avg = (values: (number | null)[]): number | null => {
  const clean = values.filter((v): v is number => v !== null);
  if (clean.length === 0) return null;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
};

const fmt = (v: number | null, suffix = '', digits = 1) => (v === null ? '-' : `${round(v, digits)}${suffix}`);

/** Lundi de la semaine (YYYY-MM-DD) pour regrouper les anciennes entrées. */
const weekKey = (day: string) => {
  const d = new Date(`${day}T12:00:00`);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return toLocalDay(d.toISOString());
};

/** Parse un chrono saisi ("7.12", "7,12", "1:02.35", "2'05") en secondes. */
const parseChrono = (raw: any): number | null => {
  if (raw === null || raw === undefined || raw === '') return null;
  const s = String(raw).trim().replace(',', '.').replace(/[''′]/g, ':').replace(/s$/i, '');
  if (s.includes(':')) {
    const parts = s.split(':').map(p => parseFloat(p));
    if (parts.some(isNaN)) return null;
    return parts.reduce((acc, p) => acc * 60 + p, 0);
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
};

const formatSeconds = (sec: number): string => {
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const r = sec - m * 60;
    return `${m}:${r < 10 ? '0' : ''}${r.toFixed(2)}`;
  }
  return `${sec.toFixed(2)}s`;
};

const MEAL_LABELS: Record<string, string> = {
  petit_dejeuner: 'Petit-déj',
  dejeuner: 'Déjeuner',
  diner: 'Dîner',
  collation: 'Collation',
  snack: 'Collation',
  gouter: 'Goûter',
};

const capSection = (lines: string[], label: string): string[] => {
  if (lines.length <= MAX_SECTION_LINES) return lines;
  return [
    ...lines.slice(0, MAX_SECTION_LINES),
    `(… ${lines.length - MAX_SECTION_LINES} entrées ${label} plus anciennes non affichées)`,
  ];
};

// ---------------------------------------------------------------------------
// Types de données brutes
// ---------------------------------------------------------------------------

interface AthleteData {
  profile: any | null;
  workouts: any[];
  efforts: any[];
  meals: any[];
  checkins: any[];
  bodyMetrics: any[];
}

export async function fetchAthleteData(athleteId: string): Promise<AthleteData> {
  const [profileRes, workouts, efforts, meals, checkins, bodyMetrics] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, full_name, gender, disciplines, height, weight, objective, manual_kcal_goal, start_weight, target_weight, weekly_weight_goal, activity_level, sleep_goal')
      .eq('id', athleteId)
      .maybeSingle(),
    fetchAll((from, to) =>
      supabase
        .from('workouts')
        .select('id, date_prevue, type_seance, status, intensity, description, exercises, blocks, measures')
        .eq('athlete_id', athleteId)
        .order('date_prevue', { ascending: false })
        .range(from, to)
    ),
    fetchAll((from, to) =>
      supabase
        .from('athlete_efforts')
        .select('workout_id, set_order, block_order, planned_reps, planned_weight_kg, planned_distance_m, actual_reps, actual_weight_kg, actual_distance_m, actual_time_ms, actual_intensity, actual_extra, is_pr, notes')
        .eq('athlete_id', athleteId)
        .range(from, to)
    ),
    fetchAll((from, to) =>
      supabase
        .from('meal_logs')
        .select('consumed_at, meal_type, custom_food_name, food_id, quantity_g, calories, proteines, glucides, lipides')
        .eq('user_id', athleteId)
        .order('consumed_at', { ascending: false })
        .range(from, to)
    ),
    fetchAll((from, to) =>
      supabase
        .from('check_ins')
        .select('date, sleep_hours, sleep_quality, fatigue_level, stress_level, motivation_level, physical_score, mental_score, sleep_score, health_score, pains, menstruation')
        .eq('athlete_id', athleteId)
        .order('date', { ascending: false })
        .range(from, to)
    ),
    fetchAll((from, to) =>
      supabase
        .from('body_metrics')
        .select('created_at, weight, body_fat, muscle_mass_kg, muscle_mass_percent, fat_mass_kg, water_percentage, visceral_fat')
        .eq('athlete_id', athleteId)
        .order('created_at', { ascending: false })
        .range(from, to)
    ),
  ]);

  if (profileRes.error) console.warn('[athleteAnalysisContext] profile error:', profileRes.error.message);

  return {
    profile: profileRes.data || null,
    workouts,
    efforts,
    meals,
    checkins,
    bodyMetrics,
  };
}

// ---------------------------------------------------------------------------
// Section : Entraînements
// ---------------------------------------------------------------------------

interface PRRecord {
  label: string;
  value: string;
  date: string;
}

function buildTrainingSection(workouts: any[], efforts: any[]) {
  const today = todayStr();
  const effortsByWorkout = new Map<string, any[]>();
  efforts.forEach(e => {
    if (!e.workout_id) return;
    if (!effortsByWorkout.has(e.workout_id)) effortsByWorkout.set(e.workout_id, []);
    effortsByWorkout.get(e.workout_id)!.push(e);
  });

  const bestChrono = new Map<string, { sec: number; date: string }>();
  const bestWeight = new Map<string, { kg: number; date: string }>();

  const pastLines: string[] = [];
  const upcomingLines: string[] = [];
  let pastPlanned = 0;
  let pastCompleted = 0;
  let focusPlanned = 0;
  let focusCompleted = 0;
  let lastCompletedDay: string | null = null;

  // workouts déjà triés du plus récent au plus ancien
  workouts.forEach(w => {
    const day = toLocalDay(w.date_prevue);
    if (!day) return;
    const isCompleted = w.status === 'completed';
    const isFuture = day > today;
    const age = daysAgo(day);

    const blocks: any[] = Array.isArray(w.blocks) && w.blocks.length > 0
      ? w.blocks
      : [{ name: 'Principal', exercises: Array.isArray(w.exercises) ? w.exercises : [] }];

    const wEfforts = effortsByWorkout.get(w.id) || [];
    const effortBySetOrder = new Map<number, any>();
    wEfforts.forEach(e => effortBySetOrder.set(e.set_order, e));

    // Reconstruit chaque exercice : prévu vs réalisé
    const exerciseParts: string[] = [];
    let globalIdx = 0;
    blocks.forEach(block => {
      (block.exercises || []).forEach((ex: any) => {
        const name = ex.name || 'Exercice';
        const sets: any[] = Array.isArray(ex.sets) ? ex.sets : [];
        const setTexts: string[] = [];
        sets.forEach((st: any, si: number) => {
          const eff = effortBySetOrder.get(globalIdx);
          globalIdx++;

          const plannedBits: string[] = [];
          if (st?.distance) plannedBits.push(`${st.distance}m`);
          if (st?.reps) plannedBits.push(`${st.reps} reps`);
          if (st?.weight !== undefined && st?.weight !== null && st?.weight !== '' && Number(st.weight) > 0) {
            plannedBits.push(`${st.weight}${st.weightType === '%' ? '%' : 'kg'}`);
          }
          const planned = plannedBits.join(' ');

          let actual = '';
          if (eff) {
            const extra = eff.actual_extra || {};
            const chronoSec = parseChrono(extra.chrono) ?? (eff.actual_time_ms ? eff.actual_time_ms / 1000 : null);
            const kg = num(eff.actual_weight_kg) ?? num(extra.weight);
            const bits: string[] = [];
            if (chronoSec !== null && chronoSec > 0) {
              bits.push(formatSeconds(chronoSec));
              const dist = st?.distance || num(eff.actual_distance_m) || num(eff.planned_distance_m);
              const key = `${name}${dist ? ` ${dist}m` : ''}`;
              const prev = bestChrono.get(key);
              if (!prev || chronoSec < prev.sec) bestChrono.set(key, { sec: chronoSec, date: day });
            }
            if (kg !== null && kg > 0) {
              bits.push(`${kg}kg`);
              const prev = bestWeight.get(name);
              if (!prev || kg > prev.kg) bestWeight.set(name, { kg, date: day });
            }
            if (extra.repsOk === false || eff.actual_reps === 0) bits.push('reps NON tenues');
            if (eff.actual_intensity) bits.push(`int ${eff.actual_intensity}/10`);
            if (eff.is_pr) bits.push('🏆PR');
            actual = bits.join(' ');
          }

          if (actual) setTexts.push(`S${si + 1} ${planned ? `${planned} → ` : ''}${actual}`);
          else if (planned) setTexts.push(`S${si + 1} ${planned}`);
        });

        if (age > DETAIL_WINDOW_DAYS) {
          exerciseParts.push(`${name} (${sets.length} séries)`);
        } else {
          exerciseParts.push(setTexts.length > 0 ? `${name} [${setTexts.join(', ')}]` : name);
        }
      });
    });

    let statusLabel = '';
    if (isFuture) statusLabel = '🗓️ à venir';
    else if (isCompleted) statusLabel = '✅ réalisée';
    else if (day === today) statusLabel = '⏳ prévue aujourd\'hui';
    else statusLabel = '❌ non réalisée';

    const notes = w.measures?.athlete_notes ? ` · Ressenti athlète : « ${String(w.measures.athlete_notes).trim()} »` : '';
    const surface = w.measures?.surface ? ` · ${w.measures.surface}` : '';
    const intensity = w.intensity ? ` · Intensité prévue ${w.intensity}/10` : '';
    const desc = w.description ? ` · Consignes : ${String(w.description).replace(/\s+/g, ' ').slice(0, 160)}` : '';
    const line = `- ${day} · ${w.type_seance || 'Séance'} · ${statusLabel}${intensity}${surface}${exerciseParts.length ? ` · ${exerciseParts.join(' | ')}` : ''}${notes}${age <= DETAIL_WINDOW_DAYS ? desc : ''}`;

    if (isFuture) {
      upcomingLines.push(line);
    } else {
      pastLines.push(line);
      if (day !== today) {
        pastPlanned++;
        if (isCompleted) pastCompleted++;
        if (age <= FOCUS_DAYS) {
          focusPlanned++;
          if (isCompleted) focusCompleted++;
        }
      }
      if (isCompleted && !lastCompletedDay) lastCompletedDay = day;
    }
  });

  const prs: PRRecord[] = [
    ...Array.from(bestChrono.entries()).map(([label, v]) => ({ label, value: formatSeconds(v.sec), date: v.date })),
    ...Array.from(bestWeight.entries()).map(([label, v]) => ({ label, value: `${v.kg}kg`, date: v.date })),
  ];

  const summary = [
    `- Séances passées programmées : ${pastPlanned} · réalisées : ${pastCompleted}${pastPlanned ? ` (${Math.round((pastCompleted / pastPlanned) * 100)}%)` : ''}`,
    `- ${FOCUS_DAYS} derniers jours : ${focusCompleted}/${focusPlanned} séances réalisées${focusPlanned ? ` (${Math.round((focusCompleted / focusPlanned) * 100)}%)` : ''}`,
    `- Dernière séance réalisée : ${lastCompletedDay || 'aucune'}`,
    `- Séances à venir : ${upcomingLines.length}`,
    prs.length > 0
      ? `- Meilleures performances enregistrées : ${prs.map(p => `${p.label} = ${p.value} (${p.date})`).join(' ; ')}`
      : '- Meilleures performances enregistrées : aucune donnée de chrono/charge saisie',
  ].join('\n');

  // À venir : ordre chronologique, max 15
  const upcoming = upcomingLines.reverse().slice(0, 15);

  return {
    summary,
    upcoming: upcoming.length ? upcoming.join('\n') : 'Aucune séance programmée à venir.',
    history: pastLines.length ? capSection(pastLines, 'de séances').join('\n') : 'Aucune séance passée.',
    hasData: workouts.length > 0,
  };
}

// ---------------------------------------------------------------------------
// Section : Nutrition
// ---------------------------------------------------------------------------

function buildNutritionSection(meals: any[], kcalGoal: number | null) {
  const byDay = new Map<string, any[]>();
  meals.forEach(m => {
    const day = toLocalDay(m.consumed_at);
    if (!day) return;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(m);
  });

  const days = Array.from(byDay.keys()).sort().reverse();
  const dayTotals = days.map(day => {
    const items = byDay.get(day)!;
    const sum = (k: string) => items.reduce((acc, it) => acc + (num(it[k]) || 0), 0);
    return {
      day,
      items,
      kcal: sum('calories'),
      p: sum('proteines'),
      g: sum('glucides'),
      l: sum('lipides'),
    };
  });

  const lines: string[] = [];
  const weekly = new Map<string, typeof dayTotals>();
  dayTotals.forEach(t => {
    const age = daysAgo(t.day);
    if (age > DETAIL_WINDOW_DAYS && dayTotals.length > MAX_SECTION_LINES) {
      const wk = weekKey(t.day);
      if (!weekly.has(wk)) weekly.set(wk, []);
      weekly.get(wk)!.push(t);
      return;
    }
    const goalTxt = kcalGoal ? ` (obj. ${kcalGoal})` : '';
    let line = `- ${t.day} · ${Math.round(t.kcal)} kcal${goalTxt} · P ${Math.round(t.p)}g / G ${Math.round(t.g)}g / L ${Math.round(t.l)}g`;
    if (age <= FOCUS_DAYS) {
      // Détail des aliments par repas sur la fenêtre d'analyse
      const byMeal = new Map<string, string[]>();
      t.items.forEach(it => {
        const meal = MEAL_LABELS[it.meal_type] || it.meal_type || 'Repas';
        const name = it.custom_food_name || it.food_id || 'Aliment';
        const qty = num(it.quantity_g);
        const kcal = num(it.calories);
        if (!byMeal.has(meal)) byMeal.set(meal, []);
        byMeal.get(meal)!.push(`${name}${qty ? ` ${Math.round(qty)}g` : ''}${kcal !== null ? ` (${Math.round(kcal)} kcal)` : ''}`);
      });
      line += ` · ${Array.from(byMeal.entries()).map(([meal, foods]) => `${meal} : ${foods.join(', ')}`).join(' | ')}`;
    } else {
      const mealsDone = Array.from(new Set(t.items.map(it => MEAL_LABELS[it.meal_type] || it.meal_type))).join(', ');
      line += ` · repas : ${mealsDone}`;
    }
    lines.push(line);
  });
  Array.from(weekly.entries()).forEach(([wk, list]) => {
    const a = (k: 'kcal' | 'p' | 'g' | 'l') => Math.round(list.reduce((acc, t) => acc + t[k], 0) / list.length);
    lines.push(`- Semaine du ${wk} (moyenne sur ${list.length} j saisis) · ${a('kcal')} kcal · P ${a('p')}g / G ${a('g')}g / L ${a('l')}g`);
  });

  const inWindow = (n: number) => dayTotals.filter(t => daysAgo(t.day) <= n);
  const last7 = inWindow(7);
  const last30 = inWindow(FOCUS_DAYS);
  const avgKcal7 = avg(last7.map(t => t.kcal));
  const avgKcal30 = avg(last30.map(t => t.kcal));
  const gap30 = kcalGoal && avgKcal30 !== null ? avgKcal30 - kcalGoal : null;

  const summary = [
    `- Objectif calorique : ${kcalGoal ? `${kcalGoal} kcal/j` : 'non défini'}`,
    `- Jours avec repas saisis : ${dayTotals.length} au total · ${last30.length}/${FOCUS_DAYS} sur les ${FOCUS_DAYS} derniers jours · dernier jour saisi : ${dayTotals[0]?.day || 'aucun'}`,
    `- Moyenne kcal (jours saisis) : 7 j = ${fmt(avgKcal7, ' kcal', 0)} · ${FOCUS_DAYS} j = ${fmt(avgKcal30, ' kcal', 0)}${gap30 !== null ? ` · écart vs objectif ${gap30 >= 0 ? '+' : ''}${Math.round(gap30)} kcal` : ''}`,
    `- Macros moyennes ${FOCUS_DAYS} j : P ${fmt(avg(last30.map(t => t.p)), 'g', 0)} / G ${fmt(avg(last30.map(t => t.g)), 'g', 0)} / L ${fmt(avg(last30.map(t => t.l)), 'g', 0)}`,
  ].join('\n');

  return {
    summary,
    history: lines.length ? capSection(lines, 'de nutrition').join('\n') : 'Aucun repas saisi.',
    hasData: meals.length > 0,
  };
}

// ---------------------------------------------------------------------------
// Section : Forme (check-ins)
// ---------------------------------------------------------------------------

function formatPains(pains: any): string {
  if (!Array.isArray(pains) || pains.length === 0) return '';
  return pains
    .map((p: any) => {
      if (typeof p === 'string') return p;
      const side = p.side && p.side !== 'Aucun' ? ` ${p.side}` : '';
      const type = p.type ? ` ${p.type}` : '';
      const intensity = p.intensity ? ` ${p.intensity}/10` : '';
      return `${p.muscle_name || p.muscle_id || 'zone'}${side}${type}${intensity}${p.comment ? ` « ${p.comment} »` : ''}`;
    })
    .join(', ');
}

function buildWellnessSection(checkins: any[]) {
  const lines: string[] = [];
  const weekly = new Map<string, any[]>();
  checkins.forEach(c => {
    const day = toLocalDay(c.date);
    if (!day) return;
    if (daysAgo(day) > DETAIL_WINDOW_DAYS && checkins.length > MAX_SECTION_LINES) {
      const wk = weekKey(day);
      if (!weekly.has(wk)) weekly.set(wk, []);
      weekly.get(wk)!.push(c);
      return;
    }
    const pains = formatPains(c.pains);
    lines.push(
      `- ${day} · Forme ${fmt(num(c.health_score), '%', 0)} · Sommeil ${fmt(num(c.sleep_hours), 'h')} (qualité ${c.sleep_quality ?? '-'}/5) · Fatigue ${c.fatigue_level ?? '-'}/5 · Stress ${c.stress_level ?? '-'}/5 · Motivation ${c.motivation_level ?? '-'}/10 · Physique ${fmt(num(c.physical_score), '%', 0)} · Mental ${fmt(num(c.mental_score), '%', 0)}${c.menstruation ? ' · règles' : ''} · Douleurs : ${pains || 'aucune'}`
    );
  });
  Array.from(weekly.entries()).forEach(([wk, list]) => {
    lines.push(
      `- Semaine du ${wk} (${list.length} check-ins) · Forme moy. ${fmt(avg(list.map(c => num(c.health_score))), '%', 0)} · Sommeil moy. ${fmt(avg(list.map(c => num(c.sleep_hours))), 'h')} · Fatigue moy. ${fmt(avg(list.map(c => num(c.fatigue_level))), '/5')}`
    );
  });

  const win = (n: number) => checkins.filter(c => daysAgo(toLocalDay(c.date)) <= n);
  const last7 = win(7);
  const last30 = win(FOCUS_DAYS);
  const painDays30 = last30.filter(c => Array.isArray(c.pains) && c.pains.length > 0);
  const zones = new Map<string, number>();
  painDays30.forEach(c => (c.pains || []).forEach((p: any) => {
    const z = typeof p === 'string' ? p : (p.muscle_name || p.muscle_id || 'zone');
    zones.set(z, (zones.get(z) || 0) + 1);
  }));

  const summary = [
    `- Check-ins remplis : ${checkins.length} au total · ${last30.length}/${FOCUS_DAYS} sur les ${FOCUS_DAYS} derniers jours · dernier : ${toLocalDay(checkins[0]?.date) || 'aucun'}`,
    `- Forme moyenne : 7 j = ${fmt(avg(last7.map(c => num(c.health_score))), '%', 0)} · ${FOCUS_DAYS} j = ${fmt(avg(last30.map(c => num(c.health_score))), '%', 0)}`,
    `- Sommeil moyen ${FOCUS_DAYS} j : ${fmt(avg(last30.map(c => num(c.sleep_hours))), 'h')} · Fatigue moy. ${fmt(avg(last30.map(c => num(c.fatigue_level))), '/5')} · Stress moy. ${fmt(avg(last30.map(c => num(c.stress_level))), '/5')}`,
    `- Jours avec douleurs (${FOCUS_DAYS} j) : ${painDays30.length}${zones.size ? ` · zones : ${Array.from(zones.entries()).map(([z, n]) => `${z} (${n}x)`).join(', ')}` : ''}`,
  ].join('\n');

  return {
    summary,
    history: lines.length ? capSection(lines, 'de check-ins').join('\n') : 'Aucun check-in rempli.',
    hasData: checkins.length > 0,
  };
}

// ---------------------------------------------------------------------------
// Section : Poids / composition corporelle
// ---------------------------------------------------------------------------

function buildBodySection(bodyMetrics: any[], profile: any) {
  const lines = bodyMetrics.map(b => {
    const parts = [`${fmt(num(b.weight), ' kg')}`];
    if (num(b.body_fat) !== null) parts.push(`MG ${fmt(num(b.body_fat), '%')}`);
    if (num(b.fat_mass_kg) !== null) parts.push(`Masse grasse ${fmt(num(b.fat_mass_kg), ' kg')}`);
    if (num(b.muscle_mass_kg) !== null) parts.push(`Muscle ${fmt(num(b.muscle_mass_kg), ' kg')}`);
    if (num(b.muscle_mass_percent) !== null) parts.push(`Muscle ${fmt(num(b.muscle_mass_percent), '%')}`);
    if (num(b.water_percentage) !== null) parts.push(`Eau ${fmt(num(b.water_percentage), '%')}`);
    if (num(b.visceral_fat) !== null) parts.push(`Viscéral ${fmt(num(b.visceral_fat), '', 0)}`);
    return `- ${toLocalDay(b.created_at)} · ${parts.join(' · ')}`;
  });

  const latest = bodyMetrics[0];
  const oldest = bodyMetrics[bodyMetrics.length - 1];
  const within30 = bodyMetrics.filter(b => daysAgo(toLocalDay(b.created_at)) <= FOCUS_DAYS);
  const ref30 = within30[within30.length - 1];
  const latestW = num(latest?.weight);
  const delta30 = latestW !== null && ref30 && ref30 !== latest ? latestW - (num(ref30.weight) || latestW) : null;
  const deltaTotal = latestW !== null && oldest && oldest !== latest ? latestW - (num(oldest.weight) || latestW) : null;

  const summary = [
    `- Poids profil : ${fmt(num(profile?.weight), ' kg')} · Poids de départ : ${fmt(num(profile?.start_weight), ' kg')} · Poids cible : ${fmt(num(profile?.target_weight), ' kg')}${profile?.weekly_weight_goal ? ` · objectif hebdo ${profile.weekly_weight_goal} kg` : ''}`,
    `- Pesées enregistrées : ${bodyMetrics.length}${latest ? ` · dernière : ${toLocalDay(latest.created_at)} (${fmt(latestW, ' kg')}${num(latest.body_fat) !== null ? `, MG ${fmt(num(latest.body_fat), '%')}` : ''})` : ''}`,
    `- Évolution du poids : ${FOCUS_DAYS} j = ${delta30 !== null ? `${delta30 >= 0 ? '+' : ''}${round(delta30)} kg` : '-'} · depuis la 1re pesée = ${deltaTotal !== null ? `${deltaTotal >= 0 ? '+' : ''}${round(deltaTotal)} kg` : '-'}`,
  ].join('\n');

  return {
    summary,
    history: lines.length ? capSection(lines, 'de pesées').join('\n') : 'Aucune pesée / composition corporelle enregistrée.',
    hasData: bodyMetrics.length > 0 || num(profile?.weight) !== null,
  };
}

// ---------------------------------------------------------------------------
// Instructions d'analyse par domaine
// ---------------------------------------------------------------------------

const DOMAIN_INSTRUCTIONS: Record<AnalysisDomain, string> = {
  training: `🏋️ ENTRAÎNEMENTS : assiduité (réalisées vs non réalisées), progression des chronos et charges (compare aux meilleures perfs), reps non tenues, ressentis de l'athlète, charge/intensité récente, séances à venir.`,
  nutrition: `🍽️ NUTRITION : régularité de la saisie, apport kcal vs objectif, répartition des macros (protéines en g/kg si le poids est connu), qualité et timing des repas, cohérence avec la charge d'entraînement.`,
  wellness: `💚 FORME : tendance du score de forme, sommeil (durée et qualité), fatigue, stress, motivation, douleurs récurrentes (zones, intensité) et signaux d'alerte de surmenage ou de blessure.`,
  body: `⚖️ POIDS / COMPO : évolution du poids et de la composition (MG, masse musculaire), écart à l'objectif, vitesse de variation, cohérence avec la nutrition et l'entraînement.`,
};

// ---------------------------------------------------------------------------
// Prompt principal
// ---------------------------------------------------------------------------

export interface AthleteAnalysisPromptOptions {
  /** Domaines que le coach a cochés : orientent l'analyse automatique. */
  domains?: AnalysisDomain[];
  /** Philosophie d'entraînement du coach (profil coach). */
  coachPhilosophy?: string | null;
  /** Instructions additionnelles (ex : format de proposition de séance). */
  extraInstructions?: string;
}

export async function buildAthleteAnalysisPrompt(
  athleteId: string,
  options: AthleteAnalysisPromptOptions = {}
): Promise<string> {
  const domains = options.domains && options.domains.length > 0 ? options.domains : ALL_DOMAINS;
  const data = await fetchAthleteData(athleteId);
  const p = data.profile || {};

  // RGPD : on n'envoie que le prénom et l'ID technique (nécessaire aux propositions de séance)
  const firstName = p.first_name || (p.full_name ? String(p.full_name).split(' ')[0] : 'l\'athlète');
  const kcalGoal = num(p.manual_kcal_goal);

  const training = buildTrainingSection(data.workouts, data.efforts);
  const nutrition = buildNutritionSection(data.meals, kcalGoal);
  const wellness = buildWellnessSection(data.checkins);
  const body = buildBodySection(data.bodyMetrics, p);

  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('fr-FR', { weekday: 'long' });

  const philosophy = options.coachPhilosophy
    ? `\nPHILOSOPHIE DU COACH :\n${options.coachPhilosophy}\n-> Adapte tes recommandations à cette philosophie.\n`
    : '';

  return `Tu es Sprinty, l'assistant IA d'analyse de performance du coach sur l'application SprinFlow (athlétisme).
Tu analyses UN athlète pour son coach. Réponds en français, style data-scientist du sport : précis, chiffré, concis, listes à puces et émojis de section.

CONTEXTE TEMPOREL : nous sommes le ${dayOfWeek} ${todayStr()}.

ATHLÈTE : ${firstName} (ID technique : ${athleteId})
- Sexe : ${p.gender || '-'} · Disciplines : ${Array.isArray(p.disciplines) && p.disciplines.length ? p.disciplines.join(', ') : '-'} · Taille : ${fmt(num(p.height), ' cm', 0)} · Niveau d'activité : ${p.activity_level || '-'}
- Objectif déclaré : ${p.objective || '-'}

══════════ RÉSUMÉS CHIFFRÉS ══════════
🏋️ ENTRAÎNEMENTS
${training.summary}

🍽️ NUTRITION
${nutrition.summary}

💚 FORME (check-ins)
${wellness.summary}

⚖️ POIDS / COMPOSITION
${body.summary}

══════════ HISTORIQUE COMPLET (du plus récent au plus ancien) ══════════
🗓️ SÉANCES À VENIR :
${training.upcoming}

🏋️ SÉANCES PASSÉES (prévu → réalisé) :
${training.history}

🍽️ NUTRITION PAR JOUR (détail des aliments sur les ${FOCUS_DAYS} derniers jours) :
${nutrition.history}

💚 CHECK-INS QUOTIDIENS :
${wellness.history}

⚖️ PESÉES / COMPOSITION :
${body.history}
${philosophy}
══════════ CONSIGNES ══════════
1. Les données ci-dessus sont la SOURCE DE VÉRITÉ complète, quelle que soit la date. Pour toute question de suivi (ex : « qu'a-t-il mangé le 12 ? », « son chrono au 60m la semaine dernière ? »), cherche la date exacte dans l'historique et cite les valeurs.
2. Si une donnée est absente pour une date ou un domaine, dis-le précisément (ex : « aucun repas saisi le 12/09 ») ; n'invente JAMAIS de valeur.
3. Pour une analyse demandée, concentre-toi sur les ${FOCUS_DAYS} derniers jours (en comparant à l'historique si utile), avec la structure : constats chiffrés → points forts → points de vigilance → 2-3 recommandations actionnables pour le coach.
4. Domaines prioritaires choisis par le coach :
${domains.map(d => DOMAIN_INSTRUCTIONS[d]).join('\n')}
5. Échelles : fatigue/stress/qualité sommeil sur 5 (fatigue et stress : plus c'est haut, pire c'est), motivation sur 10, scores forme/physique/mental en %.
6. Tu ne poses pas de diagnostic médical : en cas de douleur persistante ou forte, recommande l'avis d'un professionnel de santé.
${options.extraInstructions || ''}`;
}

/** Indique quels domaines contiennent des données (pour griser les tuiles vides). */
export async function getAthleteDomainAvailability(athleteId: string): Promise<Record<AnalysisDomain, boolean>> {
  const head = (table: string, col: string) =>
    supabase.from(table).select(col, { count: 'exact', head: true }).eq(col, athleteId);

  const [w, m, c, b, prof] = await Promise.all([
    head('workouts', 'athlete_id'),
    head('meal_logs', 'user_id'),
    head('check_ins', 'athlete_id'),
    head('body_metrics', 'athlete_id'),
    supabase.from('profiles').select('weight').eq('id', athleteId).maybeSingle(),
  ]);

  return {
    training: (w.count || 0) > 0,
    nutrition: (m.count || 0) > 0,
    wellness: (c.count || 0) > 0,
    body: (b.count || 0) > 0 || num((prof.data as any)?.weight) !== null,
  };
}
