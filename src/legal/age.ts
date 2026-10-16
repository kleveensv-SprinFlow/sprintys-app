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

/** Returns true if the profile belongs to a minor (< 18 years) or if the date of birth is missing/invalid. */
export function isMinorAthlete(profile?: any, today = new Date()): boolean {
  const dob = profile?.dateOfBirth || profile?.date_of_birth;
  if (!dob) return true;
  return ageOn(dob, today) < 18;
}

/** Local calendar date as YYYY-MM-DD (no UTC shift). */
export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

