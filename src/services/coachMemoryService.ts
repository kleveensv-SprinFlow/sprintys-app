import { supabase } from './supabase';

/** Ce que Sprinty sait de la façon d'entraîner d'un coach (validé par le coach, table coach_ai_memory). */
export type MemoryCategory = 'specialite' | 'athletes' | 'objectifs' | 'semaine' | 'methodes' | 'interdits' | 'autre';
export type MemorySource = 'presentation' | 'conversation' | 'programmation' | 'import' | 'manuel';

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  content: string;
  source: MemorySource;
  created_at: string;
}

export const MEMORY_MAX = 40;
export const MEMORY_CONTENT_MAX = 300;

export const MEMORY_CATEGORY_LABELS: Record<MemoryCategory, string> = {
  specialite: 'Spécialité',
  athletes: 'Tes athlètes',
  objectifs: 'Objectifs',
  semaine: 'Semaine type',
  methodes: 'Méthodes',
  interdits: 'Ce que tu ne fais pas',
  autre: 'Autre',
};

export const MEMORY_CATEGORY_ORDER: MemoryCategory[] = ['specialite', 'athletes', 'objectifs', 'semaine', 'methodes', 'interdits', 'autre'];

export type IntroStatus = 'done' | 'skipped' | null;

// Tables récentes, absentes des types générés : client non typé
const db = supabase as any;

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Session expirée');
  return data.user.id;
}

/** Regroupe les souvenirs par thème, dans l'ordre d'affichage (thèmes vides absents). */
export function groupMemory(items: MemoryItem[]): { category: MemoryCategory; label: string; items: MemoryItem[] }[] {
  return MEMORY_CATEGORY_ORDER.map((category) => ({
    category,
    label: MEMORY_CATEGORY_LABELS[category],
    items: items.filter((i) => i.category === category),
  })).filter((g) => g.items.length > 0);
}

export const coachMemoryService = {
  async list(): Promise<MemoryItem[]> {
    const me = await uid();
    const { data, error } = await db
      .from('coach_ai_memory')
      .select('id, category, content, source, created_at')
      .eq('coach_id', me)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as MemoryItem[];
  },

  async count(): Promise<number> {
    const me = await uid();
    const { count, error } = await db.from('coach_ai_memory').select('id', { count: 'exact', head: true }).eq('coach_id', me);
    if (error) throw error;
    return count ?? 0;
  },

  /** Enregistre les éléments cochés par le coach. */
  async addMany(items: { category: MemoryCategory; content: string; source: MemorySource }[]): Promise<number> {
    const me = await uid();
    const rows = items
      .map((i) => ({ coach_id: me, category: i.category, content: i.content.trim().slice(0, MEMORY_CONTENT_MAX), source: i.source }))
      .filter((r) => r.content.length > 0);
    if (!rows.length) return 0;
    const { error } = await db.from('coach_ai_memory').insert(rows);
    if (error) throw error;
    return rows.length;
  },

  async update(id: string, patch: { content?: string; category?: MemoryCategory }): Promise<void> {
    const body: Record<string, string> = {};
    if (patch.content != null) body.content = patch.content.trim().slice(0, MEMORY_CONTENT_MAX);
    if (patch.category) body.category = patch.category;
    const { error } = await db.from('coach_ai_memory').update(body).eq('id', id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await db.from('coach_ai_memory').delete().eq('id', id);
    if (error) throw error;
  },

  async clearAll(): Promise<void> {
    const me = await uid();
    const { error } = await db.from('coach_ai_memory').delete().eq('coach_id', me);
    if (error) throw error;
  },

  async getIntroStatus(): Promise<IntroStatus> {
    const me = await uid();
    const { data } = await db.from('profiles').select('sprinty_intro_status').eq('id', me).maybeSingle();
    const s = data?.sprinty_intro_status;
    return s === 'done' || s === 'skipped' ? s : null;
  },

  async setIntroStatus(status: IntroStatus): Promise<void> {
    const me = await uid();
    const { error } = await db.from('profiles').update({ sprinty_intro_status: status }).eq('id', me);
    if (error) throw error;
  },

  /** True if the full error means the 40-item limit was reached. */
  isFull: (e: any) => /memory_full/i.test(String(e?.message ?? e ?? '')),
};

/** Message envoyé à Sprinty pour lancer la présentation. */
export const INTRO_PROMPT = 'Faisons connaissance : pose-moi tes questions pour comprendre ma façon d’entraîner.';
