const STOP = new Set([
  'de', 'du', 'des', 'la', 'le', 'les', 'un', 'une', 'au', 'aux',
  'et', 'en', 'd', 'l', 'a', 'pour', 'avec', 'sans', 'sur', 'dans', 'ou',
]);

const COOKED = /^(cru|crue|cuit|cuite|roti|grille|grillee|bouilli|bouillie|surgel|appertis|frais|fraiche|seche|sechee|brouille|poele|poeile|vapeur|saute)/;

export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .trim();
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

function stemToken(token: string): string {
  if (token.length > 4 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  if (token.length > 4 && token.endsWith('x')) return token.slice(0, -1);
  return token;
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 3;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(prev + cost, dp[j] + 1, dp[j - 1] + 1);
      prev = current;
    }
  }
  return dp[b.length];
}

function nameWords(text: string): string[] {
  return normalizeSearchText(text)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 2)
    .map(stemToken);
}

type Hit = 'exact' | 'prefix' | 'fuzzy';

/** « oeuf » ne doit jamais compter comme trouvé dans « boeuf ». */
function classifyHit(token: string, word: string): Hit | null {
  if (word === token) return 'exact';
  if (word.length > token.length && word.endsWith(token)) return null;
  if (token.length >= 3 && word.startsWith(token) && word.length - token.length <= 2) return 'prefix';
  if (word.length >= 4 && token.startsWith(word) && token.length - word.length <= 2) return 'prefix';
  if (token.length >= 5 && Math.abs(token.length - word.length) <= 1 && editDistance(token, word) === 1) {
    if (word.endsWith(token) || token.endsWith(word)) return null;
    return 'fuzzy';
  }
  return null;
}

function bestHit(token: string, words: string[]): Hit | null {
  const rank: Record<Hit, number> = { exact: 3, prefix: 2, fuzzy: 1 };
  let best: Hit | null = null;
  for (const word of words) {
    const hit = classifyHit(token, word);
    if (hit && (!best || rank[hit] > rank[best])) best = hit;
  }
  return best;
}

function isEmbeddedInName(token: string, titleWords: string[]): boolean {
  return titleWords.some((word) => word !== token && word.endsWith(token) && word.length > token.length);
}

export function matchScore(queryTokens: string[], name: string, extra = ''): number {
  const titleWords = nameWords(name);
  const extraWords = nameWords(extra).filter((word) => !isEmbeddedInName(word, titleWords));
  if (queryTokens.length === 0) return 0;

  let hits = 0;
  let score = 0;
  for (const token of queryTokens) {
    const inName = bestHit(token, titleWords);
    const inExtra = isEmbeddedInName(token, titleWords) ? null : bestHit(token, extraWords);
    const hit = inName || inExtra;
    if (!hit) continue;
    hits += 1;
    const weight = hit === 'exact' ? 340 : hit === 'prefix' ? 220 : 110;
    score += inName ? weight : Math.round(weight * 0.4);
  }
  if (hits < queryTokens.length) return 0;

  const nameNorm = normalizeSearchText(name);
  if (titleWords[0] === queryTokens[0]) score += 220;
  if (nameNorm === queryTokens.join(' ')) score += 260;
  score -= Math.min(70, Math.max(0, nameNorm.length - 14));

  if (!queryTokens.some((token) => token.startsWith('cru')) && COOKED.test(normalizeSearchText(extra))) {
    if (normalizeSearchText(extra).startsWith('cru')) score -= 30;
    else score += 20;
  }
  if (queryTokens.length === 1 && queryTokens[0] === 'pomme' && nameNorm.includes('pomme de terre')) {
    score -= 900;
  }
  if (queryTokens.length === 1 && queryTokens[0] === 'oeuf' && /lump|lompe|cabillaud|poisson|truite|saumon/.test(nameNorm)) {
    score -= 250;
  }
  return score;
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
