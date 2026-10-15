/** 7.73 s, 1'05.20 */
export function formatSeconds(s: number): string {
  if (!Number.isFinite(s)) return '–';
  if (s >= 60) {
    const m = Math.floor(s / 60);
    const rest = s - m * 60;
    return `${m}'${rest.toFixed(2).padStart(5, '0')}`;
  }
  return `${s.toFixed(2).replace('.', ',')} s`;
}

export function formatKg(n: number): string {
  return `${Number.isInteger(n) ? n : n.toFixed(1).replace('.', ',')} kg`;
}

export function formatValue(value: number, unit: 's' | 'kg'): string {
  return unit === 's' ? formatSeconds(value) : formatKg(value);
}

export function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Acute (7 days) / chronic (4-week average) load ratio, the usual way to read training load. */
export function loadZone(ratio: number | null): { label: string; tone: 'muted' | 'good' | 'warn' | 'bad' } {
  if (ratio == null) return { label: 'À suivre', tone: 'muted' };
  if (ratio < 0.8) return { label: 'Charge en baisse', tone: 'muted' };
  if (ratio <= 1.3) return { label: 'Charge optimale', tone: 'good' };
  if (ratio <= 1.5) return { label: 'Charge élevée', tone: 'warn' };
  return { label: 'Charge très élevée', tone: 'bad' };
}
