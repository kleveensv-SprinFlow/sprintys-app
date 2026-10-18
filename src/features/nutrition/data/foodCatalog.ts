import { isStateToken, matchScore, searchTokens } from '../../../services/foodSearchRank';
import { FOOD_CATALOG, CatalogFiche } from './foodCatalogData';
import { microsFromCatalog, type Micros } from '../micros';

export type { CatalogFiche };

export interface CatalogHit {
  id: string;
  code_ciqual: string;
  nom: string;
  display_name: string;
  etat: string;
  energie_kcal: number;
  proteines: number;
  glucides: number;
  lipides: number;
  fibres: number;
  sodium: number;
  micros_100g?: Micros;
}

/** Noms du quotidien. Les chiffres sont copiés de CIQUAL, pas calculés. */
export function searchFoodCatalog(rawQ: string): CatalogHit[] {
  const tokens = searchTokens(rawQ);
  if (!tokens.length) return [];
  const askedState = tokens.some((token) => isStateToken(token));

  const hits = FOOD_CATALOG.map((fiche) => {
    const labels = [fiche.nom, ...fiche.aliases];
    let score = 0;
    for (const label of labels) {
      score = Math.max(score, matchScore(tokens, label, fiche.etat || ''));
    }
    return { fiche, score };
  }).filter((hit) => hit.score > 0);

  const best = hits.reduce((max, hit) => Math.max(max, hit.score), 0);
  const close = hits.filter((hit) => hit.score >= best - 220);

  close.sort((a, b) => {
    if (!askedState) {
      const aRaw = a.fiche.etat === 'cru' ? 1 : 0;
      const bRaw = b.fiche.etat === 'cru' ? 1 : 0;
      if (aRaw !== bRaw) return aRaw - bRaw;
    }
    return b.score - a.score || a.fiche.nom.localeCompare(b.fiche.nom, 'fr');
  });

  return close.slice(0, 8).map(({ fiche }) => toHit(fiche));
}

function toHit(fiche: CatalogFiche): CatalogHit {
  return {
    id: `ciqual-${fiche.code_ciqual}`,
    code_ciqual: fiche.code_ciqual,
    nom: fiche.nom_ciqual,
    display_name: fiche.nom,
    etat: fiche.etat || '',
    energie_kcal: fiche.kcal_100g,
    proteines: fiche.proteines_100g,
    glucides: fiche.glucides_100g,
    lipides: fiche.lipides_100g,
    fibres: fiche.fibres_100g,
    sodium: 0,
    micros_100g: microsFromCatalog(fiche.fibres_100g),
  };
}
