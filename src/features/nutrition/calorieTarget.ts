/**
 * Cible calorique Sprintflow.
 *
 * Métabolisme de repos
 * - Mifflin-St Jeor (1990) par défaut. C'est l'équation la plus fiable
 *   pour un adulte sans masse grasse connue (revue Frankenfield, 2005).
 * - Katch-McArdle (370 + 21,6 × masse maigre) dès qu'une masse grasse
 *   récente est entre 8 et 45 %. Meilleur choix chez un sportif.
 *
 * Dépense
 * - Le quotidien (NEAT) est un facteur PAL SANS l'entraînement :
 *   bureau 1,25 · marche 1,40 · debout 1,55 · métier physique 1,70.
 * - L'entraînement est ajouté à part (Compendium of Physical Activities) :
 *   séance athlétique moyenne = 6 MET × 60 min, puis ramenée à la journée.
 *   Ça évite de compter deux fois la même activité, ce que font les
 *   multiplicateurs 1,55 / 1,725 quand on est surtout assis.
 *
 * Objectif (ISSN 2017, Helms, consensus sport 2025)
 * - Perte : 1 100 kcal/j par kg/semaine (7 700 kcal ≈ 1 kg de tissu adipeux),
 *   plafonné à 25 % de la dépense pour limiter la perte de muscle.
 * - Maintien : dépense estimée.
 * - Prise de masse : surplus modéré, 150 à 500 kcal (environ 10–15 %),
 *   pas 1 100 kcal/kg. Au-delà, le poids gagné est surtout du gras.
 * - Recomposition : proche du maintien. Petit déficit si la masse grasse
 *   est haute, petit surplus si l'athlète est déjà sec.
 *
 * Plancher : 1 500 kcal (homme) / 1 200 (femme), et 30 kcal/kg de masse
 *   maigre quand on la connaît (disponibilité énergétique).
 */

export type NeatLevel = 'bureau' | 'marche' | 'debout' | 'physique';
export type CalorieGoal = 'cut' | 'maintain' | 'bulk' | 'recomp';

export const NEAT_LEVELS: { id: NeatLevel; label: string; desc: string; factor: number }[] = [
  { id: 'bureau', label: 'Bureau', desc: 'Assis, peu de marche', factor: 1.25 },
  { id: 'marche', label: 'Marche', desc: '7 à 10 000 pas', factor: 1.4 },
  { id: 'debout', label: 'Debout', desc: 'Souvent debout', factor: 1.55 },
  { id: 'physique', label: 'Physique', desc: 'Métier physique', factor: 1.7 },
];

const SESSION_MET = 6;
const SESSION_HOURS = 1;
export const MIN_SESSIONS = 0;
export const MAX_SESSIONS = 12;

const NEAT_IDS = new Set<string>(NEAT_LEVELS.map((level) => level.id));

export function clampSessions(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(MIN_SESSIONS, Math.min(MAX_SESSIONS, Math.round(value)));
}

export function classifyObjective(objective: string): CalorieGoal {
  const value = (objective || '').toLowerCase();
  if (value.includes('perte') || value.includes('gras') || value.includes('allég') || value.includes('alleg')) return 'cut';
  if (value.includes('prend')) return 'bulk';
  if (value.includes('muscle') || value.includes('recomp')) return 'recomp';
  return 'maintain';
}

export function parseActivity(raw?: string | null): { neat: NeatLevel; sessions: number; age: number | null } {
  const value = (raw || '').trim();
  const match = value.match(/^(bureau|marche|debout|physique)\|(\d{1,2})(?:\|(\d{1,2}))?$/);
  if (match && NEAT_IDS.has(match[1])) {
    const age = match[3] ? Number(match[3]) : null;
    return {
      neat: match[1] as NeatLevel,
      sessions: clampSessions(Number(match[2])),
      age: age !== null && age >= 14 && age <= 80 ? age : null,
    };
  }
  if (value === 'faible') return { neat: 'bureau', sessions: 2, age: null };
  if (value === 'moyen') return { neat: 'marche', sessions: 3, age: null };
  if (value === 'élevé') return { neat: 'debout', sessions: 5, age: null };
  if (value === 'très élevé') return { neat: 'physique', sessions: 6, age: null };
  return { neat: 'marche', sessions: 4, age: null };
}

export function encodeActivity(neat: NeatLevel, sessions: number, age?: number | null): string {
  const base = `${neat}|${clampSessions(sessions)}`;
  if (age && age >= 14 && age <= 80) return `${base}|${Math.round(age)}`;
  return base;
}

export function formatActivity(raw?: string | null): string {
  const { neat, sessions } = parseActivity(raw);
  const label = NEAT_LEVELS.find((level) => level.id === neat)?.label || neat;
  const noun = sessions > 1 ? 'séances' : 'séance';
  return `${label}, ${sessions} ${noun} / sem.`;
}

export function ageFromDob(dob?: string | null, now = new Date()): number | null {
  if (!dob) return null;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;
  let age = now.getFullYear() - born.getFullYear();
  const month = now.getMonth() - born.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < born.getDate())) age -= 1;
  if (age < 14 || age > 80) return null;
  return age;
}

export function dobFromAge(age: number, existing?: string | null, now = new Date()): string {
  let month = now.getMonth();
  let day = now.getDate();
  if (existing) {
    const current = new Date(existing);
    if (!Number.isNaN(current.getTime())) {
      month = current.getMonth();
      day = current.getDate();
    }
  }
  const date = new Date(now.getFullYear() - age, month, day);
  const year = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

export function isFemale(sex?: string | null): boolean {
  const value = (sex || '').trim().toLowerCase();
  return value === 'femme' || value === 'female' || value === 'f' || value.startsWith('femme');
}

export interface CalorieInput {
  weightKg: number;
  heightCm: number | null;
  age: number;
  sex?: string | null;
  bodyFatPct?: number | null;
  neat: NeatLevel;
  sessionsPerWeek: number;
  goal: CalorieGoal;
  weeklyKg: number;
}

export interface CalorieResult {
  bmr: number;
  bmrMethod: 'katch' | 'mifflin';
  exercisePerDay: number;
  tdee: number;
  target: number;
  delta: number;
  note: string;
  heightAssumed: boolean;
}

export function computeCalorieTarget(input: CalorieInput): CalorieResult {
  const weight = input.weightKg;
  const heightAssumed = !(input.heightCm && input.heightCm >= 120 && input.heightCm <= 230);
  const height = heightAssumed ? 175 : (input.heightCm as number);
  const age = input.age >= 14 && input.age <= 80 ? input.age : 25;
  const female = isFemale(input.sex);
  const bodyFat = input.bodyFatPct;
  const katchOk = typeof bodyFat === 'number' && bodyFat >= 8 && bodyFat <= 45;
  let ffm: number | null = null;
  let bmr: number;
  let bmrMethod: 'katch' | 'mifflin';

  if (katchOk && typeof bodyFat === 'number') {
    ffm = weight * (1 - bodyFat / 100);
    bmr = 370 + 21.6 * ffm;
    bmrMethod = 'katch';
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age + (female ? -161 : 5);
    bmrMethod = 'mifflin';
    if (typeof bodyFat === 'number' && bodyFat > 0 && bodyFat < 70) {
      ffm = weight * (1 - bodyFat / 100);
    }
  }

  const factor = NEAT_LEVELS.find((level) => level.id === input.neat)?.factor ?? 1.4;
  const sessions = clampSessions(input.sessionsPerWeek);
  const exercisePerDay = (sessions * SESSION_MET * weight * SESSION_HOURS) / 7;
  const tdee = bmr * factor + exercisePerDay;
  const weekly = Math.min(1, Math.max(0, Math.abs(input.weeklyKg) || 0));

  let target = tdee;
  let note = 'Maintien : dépense estimée, sans surplus ni déficit.';

  if (input.goal === 'cut') {
    const wanted = Math.round((weekly || 0.5) * 1100);
    const cap = Math.round(tdee * 0.25);
    const deficit = Math.min(wanted, cap);
    target = tdee - deficit;
    note = deficit < wanted
      ? `Perte : déficit limité à 25 % (${deficit} kcal) pour garder du muscle.`
      : `Perte : −${deficit} kcal/j, environ ${String(weekly || 0.5).replace('.', ',')} kg/semaine.`;
  } else if (input.goal === 'bulk') {
    const fromPace = Math.round((weekly || 0.5) * 700);
    const percentCap = Math.max(200, Math.round(tdee * 0.15));
    const surplus = Math.min(500, percentCap, Math.max(150, fromPace));
    target = tdee + surplus;
    note = surplus < fromPace
      ? `Prise de masse : surplus plafonné à ${surplus} kcal. Au-delà, le poids gagné est surtout du gras.`
      : `Prise de masse : +${surplus} kcal/j. Surplus modéré, pas un gros bulk.`;
  } else if (input.goal === 'recomp') {
    let shift = -100;
    if (typeof bodyFat === 'number' && bodyFat >= 8 && bodyFat <= 45) {
      if ((!female && bodyFat >= 20) || (female && bodyFat >= 28)) shift = -200;
      else if ((!female && bodyFat <= 12) || (female && bodyFat <= 20)) shift = 150;
    }
    target = tdee + shift;
    note = shift < 0
      ? `Recomposition : ${shift} kcal autour du maintien, pour sécher un peu sans couper le muscle.`
      : `Recomposition : +${shift} kcal. Déjà sec, un petit surplus aide le muscle.`;
  }

  let floor = female ? 1200 : 1500;
  if (ffm && ffm > 30) floor = Math.max(floor, Math.round(30 * ffm));
  if (target < floor) {
    target = floor;
    note += ' Plancher atteint pour protéger la santé.';
  }
  if (heightAssumed) note += ' Taille non renseignée : 175 cm utilisés.';

  return {
    bmr: Math.round(bmr),
    bmrMethod,
    exercisePerDay: Math.round(exercisePerDay),
    tdee: Math.round(tdee),
    target: Math.round(target),
    delta: Math.round(Math.round(target) - Math.round(tdee)),
    note,
    heightAssumed,
  };
}
