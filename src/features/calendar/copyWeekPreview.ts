export interface WeekSessionPreview {
  key: string;
  date: string; // date_prevue (ISO)
  title: string;
  /** Athletes receiving this session (the coach's master copy is not counted) */
  athletes: number;
}

const DAYS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];

/** One line per session of the week (a session sent to a group is one line), in day order. */
export function summarizeWeek(rows: any[], coachId?: string): WeekSessionPreview[] {
  const map = new Map<string, { date: string; title: string; athletes: Set<string> }>();
  for (const w of rows || []) {
    const key = w.group_assignment_id || w.id;
    let e = map.get(key);
    if (!e) {
      e = { date: w.date_prevue, title: String(w.type_seance || '').trim() || 'Séance', athletes: new Set() };
      map.set(key, e);
    }
    if (!w.measures?.is_master && w.athlete_id && w.athlete_id !== coachId) e.athletes.add(w.athlete_id);
    if (w.measures?.is_master && w.type_seance) e.title = String(w.type_seance).trim() || e.title;
  }
  return Array.from(map.entries())
    .map(([key, e]) => ({ key, date: e.date, title: e.title, athletes: e.athletes.size }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

/** « Mar. 14 » */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${DAYS[d.getDay()]} ${d.getDate()}`;
}

export function athletesLabel(n: number): string {
  if (n === 0) return 'aucun athlète';
  return n === 1 ? '1 athlète' : `${n} athlètes`;
}
