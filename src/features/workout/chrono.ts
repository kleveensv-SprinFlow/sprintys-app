/** Parsing and sanity checks for running times typed by athletes. */

/** "9.85", "1:02.45", "14:35" → seconds (null when unreadable) */
export function chronoToSeconds(value: string | null | undefined): number | null {
  const s = String(value ?? '').trim().replace(',', '.');
  if (!s) return null;
  if (s.includes(':')) {
    const parts = s.split(':').map((p) => parseFloat(p));
    if (parts.some((p) => Number.isNaN(p))) return null;
    return parts.reduce((acc, p) => acc * 60 + p, 0);
  }
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

/** Average speeds no human runs outside of: slower than a walk or faster than the world record sprinters' top speed. */
const MIN_SPEED = 1.8;
const MAX_SPEED = 12.2;

export function isPlausibleChrono(seconds: number | null, distanceM: number | string | null | undefined): boolean {
  const d = parseFloat(String(distanceM ?? ''));
  if (seconds == null || !Number.isFinite(d) || d <= 0) return true; // nothing to compare with
  if (seconds <= 0) return false;
  const v = d / seconds;
  return v >= MIN_SPEED && v <= MAX_SPEED;
}

/** "1:13,50" style for the confirmation message */
export function chronoLabel(seconds: number): string {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    return `${m}'${(seconds - m * 60).toFixed(2).replace('.', ',').padStart(5, '0')}`;
  }
  return `${seconds.toFixed(2).replace('.', ',')} s`;
}
