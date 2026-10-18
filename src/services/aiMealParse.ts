import type { ParsedFoodItem } from './aiNutritionService';

const MAX_ITEMS = 20;
const MAX_QTY_G = 2000;
const MAX_QTY_PIECES = 30;
const MAX_KCAL_100G = 900; // 100 g d'huile pure ≈ 884 kcal : au-delà, c'est une erreur.

const ETATS = ['cru', 'cuit', 'au plat', 'brouillé', 'rôti', 'vapeur'];

const toNum = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Extrait le tableau JSON d'une réponse de l'IA (avec ou sans bloc markdown, avec du texte autour). */
export function extractJsonArray(raw: unknown): unknown[] | null {
  if (typeof raw !== 'string') return null;
  const text = raw.replace(/```json/gi, '').replace(/```/g, '');
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Valide un aliment : renvoie null s'il est inutilisable. Les valeurs hors limites sont refusées, pas devinées. */
export function sanitizeFoodItem(raw: any): ParsedFoodItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 80) : '';
  const query = typeof raw.query === 'string' ? raw.query.trim().slice(0, 40) : '';
  if (!name && !query) return null;

  const unit: 'g' | 'piece' = raw.unit === 'piece' ? 'piece' : 'g';
  const qty = toNum(raw.qty);
  if (qty === null || qty <= 0) return null;
  if (qty > (unit === 'piece' ? MAX_QTY_PIECES : MAX_QTY_G)) return null;

  const kcal = toNum(raw.fallback_kcal_100g);
  const pro = toNum(raw.fallback_pro_100g);
  const glu = toNum(raw.fallback_glu_100g);
  const lip = toNum(raw.fallback_lip_100g);
  if ([kcal, pro, glu, lip].some((v) => v === null || (v as number) < 0)) return null;
  if ((kcal as number) > MAX_KCAL_100G) return null;
  // Les macros d'un aliment ne peuvent pas dépasser 100 g pour 100 g.
  if ((pro as number) + (glu as number) + (lip as number) > 105) return null;

  const etat = typeof raw.etat === 'string' && ETATS.includes(raw.etat.toLowerCase()) ? raw.etat.toLowerCase() : null;

  return {
    name: name || query,
    query: query || name,
    etat,
    qty: Math.round(qty * 10) / 10,
    unit,
    fallback_kcal_100g: Math.round(kcal as number),
    fallback_pro_100g: Math.round((pro as number) * 10) / 10,
    fallback_glu_100g: Math.round((glu as number) * 10) / 10,
    fallback_lip_100g: Math.round((lip as number) * 10) / 10,
  };
}

/** Réponse brute de l'IA → liste d'aliments valides (vide si rien d'exploitable). */
export function parseAiMeal(raw: unknown): ParsedFoodItem[] {
  const arr = extractJsonArray(raw);
  if (!arr) return [];
  return arr
    .slice(0, MAX_ITEMS)
    .map(sanitizeFoodItem)
    .filter((i): i is ParsedFoodItem => i !== null);
}
