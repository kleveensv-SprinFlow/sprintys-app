/** Exact age in full years on a given day. */
export function ageOn(dob: Date | string | null | undefined, today = new Date()): number {
  if (!dob) return 0;
  const d = typeof dob === 'string' ? new Date(dob) : dob;
  if (Number.isNaN(d.getTime())) return 0;
  let age = today.getFullYear() - d.getFullYear();
  const beforeBirthday =
    today.getMonth() < d.getMonth() || (today.getMonth() === d.getMonth() && today.getDate() < d.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export const MIN_AGE = 15;

/** Local calendar date as YYYY-MM-DD (no UTC shift). */
export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
