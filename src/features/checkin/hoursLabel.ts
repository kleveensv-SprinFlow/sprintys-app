/** 7.5 → « 7,5 h », 8 → « 8 h » */
export const hoursLabel = (h: number) => `${String(Math.round(h * 10) / 10).replace('.', ',')} h`;
