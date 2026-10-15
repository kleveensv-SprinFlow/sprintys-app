/** 7,73 s, 1'05,20 (rounded to the hundredth first, so 59.996 reads 1'00,00 and not 60,00 s) */
export function formatSeconds(s: number): string {
  if (!Number.isFinite(s)) return '–';
  const cs = Math.round(s * 100);
  if (cs >= 6000) {
    const m = Math.floor(cs / 6000);
    const rest = (cs % 6000) / 100;
    return `${m}'${rest.toFixed(2).replace('.', ',').padStart(5, '0')}`;
  }
  return `${(cs / 100).toFixed(2).replace('.', ',')} s`;
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
