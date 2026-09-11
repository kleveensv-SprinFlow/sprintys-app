export interface TrainingPeriod {
  id: string;
  coach_id: string;
  name: string;
  color: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  team_id?: string | null;
  subgroup_id?: string | null;
  athlete_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTrainingPeriodPayload {
  name: string;
  color: string;
  start_date: string;
  end_date: string;
  team_id?: string | null;
  subgroup_id?: string | null;
  athlete_id?: string | null;
}

export interface UpdateTrainingPeriodPayload {
  name?: string;
  color?: string;
  start_date?: string;
  end_date?: string;
  team_id?: string | null;
  subgroup_id?: string | null;
  athlete_id?: string | null;
}

export interface PeriodTemplate {
  name: string;
  color: string;
}

// 8 signature modern sports periodization colors
export const PERIOD_COLORS = [
  { name: 'Cyan Lagon', hex: '#06B6D4' },
  { name: 'Vert Émeraude', hex: '#10B981' },
  { name: 'Violet Électrique', hex: '#8B5CF6' },
  { name: 'Orange Vif', hex: '#F97316' },
  { name: 'Rouge Corail', hex: '#EF4444' },
  { name: 'Jaune Ambre', hex: '#F59E0B' },
  { name: 'Rose Fuchsia', hex: '#EC4899' },
  { name: 'Bleu Nuit / Indigo', hex: '#6366F1' },
] as const;

export const DEFAULT_PERIOD_SUGGESTIONS: PeriodTemplate[] = [
  { name: 'Aérobie', color: '#06B6D4' },
  { name: 'Affûtage', color: '#F59E0B' },
  { name: 'Renforcement', color: '#8B5CF6' },
  { name: 'Vitesse & Puissance', color: '#EF4444' },
  { name: 'Volume & Fonctions', color: '#6366F1' },
  { name: 'Récupération Active', color: '#10B981' },
];
