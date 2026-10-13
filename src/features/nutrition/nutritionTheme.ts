import { universalColors } from '../../core/theme';
import { MealType } from './types';

/**
 * Single source of truth for the nutrition visuals ("Piste & couloirs" identity).
 * Colors are reserved for the macros; meals all use the brand blue.
 */

/** Calories: the brand gradient (logo colors). */
export const ENERGY = {
  from: universalColors.sprintyBlue,
  to: universalColors.sprintyCyan,
  over: universalColors.error,
};

export type MacroKey = 'proteines' | 'glucides' | 'lipides';

export const MACROS: { key: MacroKey; label: string; short: string; color: string; tint: string }[] = [
  { key: 'proteines', label: 'Protéines', short: 'P', color: '#7C5CFC', tint: 'rgba(124, 92, 252, 0.12)' },
  { key: 'glucides', label: 'Glucides', short: 'G', color: '#F59E0B', tint: 'rgba(245, 158, 11, 0.14)' },
  { key: 'lipides', label: 'Lipides', short: 'L', color: '#14B8A6', tint: 'rgba(20, 184, 166, 0.13)' },
];

export const MACRO_COLOR: Record<MacroKey, string> = {
  proteines: MACROS[0].color,
  glucides: MACROS[1].color,
  lipides: MACROS[2].color,
};

/** Daily macro split of the calorie goal (same rule as before: 30 / 40 / 30). */
export const macroGoals = (kcalGoal: number) => ({
  proteines: Math.round((kcalGoal * 0.3) / 4),
  glucides: Math.round((kcalGoal * 0.4) / 4),
  lipides: Math.round((kcalGoal * 0.3) / 9),
});

export const MEALS: { type: MealType; label: string; short: string }[] = [
  { type: 'petit_dejeuner', label: 'Petit-déjeuner', short: 'Matin' },
  { type: 'dejeuner', label: 'Déjeuner', short: 'Midi' },
  { type: 'diner', label: 'Dîner', short: 'Soir' },
  { type: 'collation', label: 'Collation', short: 'Extra' },
];

export const mealLabel = (type?: MealType | null) =>
  MEALS.find((m) => m.type === type)?.label || 'Repas';

/** Brand blue used for every meal accent. */
export const MEAL_ACCENT = universalColors.sprintyBlue;
export const MEAL_ACCENT_TINT = 'rgba(0, 105, 232, 0.1)';
