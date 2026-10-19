/** Durée en heures décimales → « 7 h 30 » (1 h = 60 min, jamais « 7,5 h » qui se lit 7 h 50). */
export const hoursLabel = (h: number) => {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return mm === 0 ? `${hh} h` : `${hh} h ${String(mm).padStart(2, '0')}`;
};
