/**
 * Recherche sur le NOM seulement.
 * « poulet » ne sort pas d'une sauce qui a du poulet dans les ingrédients.
 * « oeuf » ne sort pas de « boeuf ». « riz » ne sort pas de « chorizo ».
 * Une faute légère (lettre échangée, oubliée ou en trop) passe quand même.
 */

const STOP = new Set([
  'de', 'du', 'des', 'la', 'le', 'les', 'un', 'une', 'au', 'aux',
  'et', 'en', 'd', 'l', 'a', 'pour', 'avec', 'sans', 'sur', 'dans', 'ou',
]);

const STATE = new Set([
  'cru', 'crue', 'cuit', 'cuite', 'roti', 'rotie', 'grille', 'grillee',
  'bouilli', 'bouillie', 'vapeur', 'saute', 'sautee', 'frit', 'frite',
  'pane', 'panee', 'seche', 'sechee', 'frais', 'fraiche', 'surgel', 'surgele',
  'brouille', 'brouillee', 'poele', 'poelee', 'appertise',
]);

/** Même mot, orthographes différentes. Pas une liste d'aliments. */
const SPELLING_GROUPS = [
  ['yaourt', 'yogourt', 'yoghourt', 'yahourt'],
  ['oeuf', 'euf'],
  ['muesli', 'musli'],
  ['boulgour', 'bulgur', 'bourgoul'],
  ['couscous', 'couscou', 'kouskous'],
  ['cacahuete', 'cacahouete'],
];

const ACCENT: Record<string, string[]> = {
  a: ['à', 'â'],
  e: ['é', 'è', 'ê'],
  i: ['î', 'ï'],
  o: ['ô'],
  u: ['ù', 'û'],
  c: ['ç'],
};

const SPELLING = new Map<string, string>();
for (const group of SPELLING_GROUPS) {
  for (const form of group) SPELLING.set(form, group[0]);
}

const COOKED = /^(cru|crue|cuit|cuite|roti|grille|grillee|bouilli|bouillie|surgel|appertis|frais|fraiche|seche|sechee|brouille|poele|poeile|vapeur|saute)/;

export function normalizeSearchText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .trim();
}

function stemToken(token: string): string {
  if (token.length > 4 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  if (token.length > 4 && token.endsWith('x')) return token.slice(0, -1);
  return token;
}

function canonWord(raw: string): string {
  const stemmed = stemToken(normalizeSearchText(raw));
  return SPELLING.get(stemmed) || stemmed;
}

export function searchTokens(query: string): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const raw of normalizeSearchText(query).split(/[^a-z0-9]+/)) {
    const token = stemToken(raw);
    if (token.length < 2 || STOP.has(token) || seen.has(token)) continue;
    seen.add(token);
    tokens.push(token);
  }
  return tokens;
}

export function isStateToken(token: string): boolean {
  const canon = canonWord(token);
  return STATE.has(canon) || STATE.has(canon.replace(/e$/, ''));
}

function wordsOf(text: string): string[] {
  return normalizeSearchText(text)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 2)
    .map((word) => canonWord(word))
    .filter((word) => word.length >= 2);
}

function damerau(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 3;
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }
  return dp[a.length][b.length];
}

/** Un mot caché dans un plus long : « riz » dans « chorizo », « pois » dans « poisson ». */
function isEmbedded(token: string, word: string): boolean {
  if (token === word) return false;
  const [short, long] = token.length <= word.length ? [token, word] : [word, token];
  if (!long.includes(short)) return false;
  if (long === `${short}s` || long === `${short}x`) return false;
  return long.length - short.length >= 2;
}

function matchWord(token: string, word: string): 'exact' | 'typo' | null {
  if (token === word) return 'exact';
  if (isEmbedded(token, word)) return null;
  if (token.length < 5 || word.length < 5) return null;
  if (Math.abs(token.length - word.length) > 1) return null;
  if (damerau(token, word) > 1) return null;
  if (token[0] === word[0]) return 'typo';
  const [short, long] = token.length <= word.length ? [token, word] : [word, token];
  return long.slice(1) === short ? 'typo' : null;
}

function bestWord(token: string, words: string[]): 'exact' | 'typo' | null {
  let typo = false;
  for (const word of words) {
    const hit = matchWord(token, word);
    if (hit === 'exact') return 'exact';
    if (hit === 'typo') typo = true;
  }
  return typo ? 'typo' : null;
}

const POULTRY = new Set(['poulet', 'dinde', 'canard', 'pintade']);
const CUT_ALIAS: Record<string, string> = { blanc: 'filet', filet: 'blanc' };
const CUTS = ['jambon', 'escalope', 'cuisse', 'aile', 'aiguillett', 'steak', 'filet', 'blanc'];
const ANIMALS = ['poulet', 'dinde', 'canard', 'pintade', 'boeuf', 'porc', 'veau', 'agneau', 'saumon', 'thon', 'cabillaud', 'colin'];

function cutAlias(token: string, queryTokens: string[], nameWords: string[]): string | null {
  const alias = CUT_ALIAS[token];
  if (!alias) return null;
  const poultryInQuery = queryTokens.some((part) => POULTRY.has(canonWord(part)));
  const poultryInName = nameWords.some((word) => POULTRY.has(word));
  if (!poultryInQuery || !poultryInName) return null;
  return alias;
}

export function searchVariants(token: string, queryTokens: string[]): string[] {
  const canon = canonWord(token);
  const alias = CUT_ALIAS[canon];
  const poultry = queryTokens.some((part) => POULTRY.has(canonWord(part)));
  return alias && poultry ? [canon, alias] : [canon];
}

export function tokenInName(token: string, name: string, state = '', queryTokens: string[] = [token]): boolean {
  const canon = canonWord(token);
  const nameWords = wordsOf(name);
  if (bestWord(canon, nameWords)) return true;
  const alias = cutAlias(canon, queryTokens, nameWords);
  if (alias && nameWords.includes(alias)) return true;
  return isStateToken(canon) && wordsOf(state).includes(canon);
}

export function matchScore(queryTokens: string[], name: string, state = ''): number {
  const nameWords = wordsOf(name);
  const stateWords = wordsOf(state);
  if (queryTokens.length === 0 || nameWords.length === 0) return 0;

  let score = 0;
  let nameHits = 0;
  let typo = false;
  const wanted = queryTokens.map((token) => canonWord(token));

  for (const token of wanted) {
    const hit = bestWord(token, nameWords);
    const alias = cutAlias(token, wanted, nameWords);
    const aliasHit = !hit && alias && nameWords.includes(alias);
    if (hit || aliasHit) {
      nameHits += 1;
      score += hit === 'exact' ? 500 : hit === 'typo' ? 260 : 420;
      if (hit === 'typo') typo = true;
      if (nameWords[0] === token || (alias && nameWords[0] === alias)) score += 220;
      continue;
    }
    if (isStateToken(token) && (stateWords.includes(token) || stateWords.includes(token.replace(/e$/, '')))) {
      score += 70;
      continue;
    }
    return 0;
  }

  if (nameHits === 0) return 0;
  const extras = nameWords.filter((word) => !wanted.includes(word) && !isStateToken(word) && word !== 'filet' && word !== 'blanc').length;
  score -= extras * 35;
  const plainName = normalizeSearchText(name);
  if (/\bpeau\b/.test(plainName) && !/sans peau/.test(plainName)) score -= 200;
  if (/label|fermier|bio|halal/.test(plainName)) score -= 180;
  if (['jambon', 'nugget', 'panure', 'cordon', 'farce'].some((word) => nameWords.includes(word) && !wanted.includes(word))) score -= 320;
  if (!typo) score += 80;
  return score;
}

export function foodStateLabel(nom: string, etat = ''): string {
  const words = wordsOf(`${nom} ${etat}`);
  if (words.some((word) => word === 'cru' || word === 'crue')) return 'cru';
  if (words.some((word) => ['cuit', 'cuite', 'grille', 'poele', 'roti', 'bouilli', 'vapeur', 'saute'].includes(word))) return 'cuit';
  return '';
}

function capitalFood(label: string): string {
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : label;
}

/** Nom court pour la liste. « Filet sans peau cru de poulet » devient « Filet de poulet ». */
export function spokenFoodTitle(nom: string, queryTokens: string[] = []): string {
  const words = wordsOf(nom);
  const animal = ANIMALS.find((name) => words.includes(name));
  const cutInName = CUTS.find((cut) => words.some((word) => word === cut || word.startsWith(cut)));
  const asked = queryTokens.map((token) => canonWord(token));
  const askedCut = asked.find((token) => token === 'blanc' || token === 'filet');
  const cut = animal && POULTRY.has(animal) && askedCut && (cutInName === 'blanc' || cutInName === 'filet' || cutInName?.startsWith('aiguillett'))
    ? askedCut
    : cutInName;
  if (animal && cut) return capitalFood(`${cut.startsWith('aiguillett') ? 'aiguillette' : cut} de ${animal}`);
  if (animal && words.length <= 3) return capitalFood(animal);
  return friendlyFoodTitle(nom);
}

/** Formes à envoyer à la base pour rattraper accent, pluriel et faute. Le tri final reste sur le nom. */
export function recallForms(token: string): string[] {
  const canon = canonWord(token);
  const family = SPELLING_GROUPS.find((group) => group.includes(canon) || group.includes(stemToken(token))) || [canon];
  const seeds = [...new Set([stemToken(token), canon, ...family])];
  const forms: string[] = [];
  const push = (value: string) => {
    const clean = value.trim();
    if (clean.length >= 3 && !forms.includes(clean)) forms.push(clean);
  };

  for (const seed of seeds) push(seed);
  for (const seed of seeds) {
    if (seed.includes('oe')) push(seed.replace(/oe/g, 'œ'));
    if (seed.length >= 5) {
      for (let i = 0; i < seed.length - 1; i++) {
        push(seed.slice(0, i) + seed[i + 1] + seed[i] + seed.slice(i + 2));
      }
      push(seed.slice(0, -1));
    }
  }
  for (const seed of [...forms]) {
    for (let i = 0; i < seed.length; i++) {
      const accents = ACCENT[seed[i]];
      if (!accents) continue;
      for (const accent of accents) push(seed.slice(0, i) + accent + seed.slice(i + 1));
    }
  }
  return forms.slice(0, 14);
}

export function friendlyFoodTitle(nom: string): string {
  const parts = nom.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2 || parts[0].includes(' ')) return nom;
  const second = normalizeSearchText(parts[1]);
  if (COOKED.test(second)) return nom;
  const rest = parts.slice(2);
  const title = `${parts[1]} de ${parts[0].toLowerCase()}`;
  const extra = rest.length ? `, ${rest.join(', ')}` : '';
  return title.charAt(0).toUpperCase() + title.slice(1) + extra;
}
