const DAY = 86400000;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Days between the date and today, in calendar days (0 = today, 1 = yesterday). */
const daysAgo = (d: Date) => Math.round((startOfDay(new Date()) - startOfDay(d)) / DAY);

/** Time shown next to a conversation in a list: "14:05", "Hier", "lun.", "12 oct.", "12/10/25". */
export function formatListTime(input: string | number | Date): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  const ago = daysAgo(d);
  if (ago <= 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (ago === 1) return 'Hier';
  if (ago < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' });
  if (d.getFullYear() === new Date().getFullYear()) {
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/** Day separator inside a conversation: "Aujourd'hui", "Hier", "lundi 12 oct.", "12 oct. 2025". */
export function formatDayLabel(input: string | number | Date): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  const ago = daysAgo(d);
  if (ago <= 0) return "Aujourd'hui";
  if (ago === 1) return 'Hier';
  if (ago < 7) return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
  if (d.getFullYear() === new Date().getFullYear()) {
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  }
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Same calendar day? */
export const isSameDay = (a: string | number | Date, b: string | number | Date) =>
  startOfDay(new Date(a)) === startOfDay(new Date(b));
