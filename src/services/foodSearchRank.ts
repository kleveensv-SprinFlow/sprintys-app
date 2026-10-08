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

export function typoVariants(token: string): string[] {
  const out = new Set<string>([token]);
  if (token.length >= 5) {
    for (let i = 1; i < token.length - 1 && out.size < 6; i++) {
      out.add(token.slice(0, i) + token[i + 1] + token[i] + token.slice(i + 2));
    }
  }
  if (token.length >= 6 && out.size < 7) {
    const mid = Math.floor(token.length / 2);
    out.add(token.slice(0, mid) + token.slice(mid + 1));
  }
  return [...out];
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

function tokenHits(token: string, words: string[]): boolean {
  return words.some((word) => {
    if (word === token) return true;
    if (token.length >= 4 && (word.startsWith(token) || token.startsWith(word))) return true;
    const limit = token.length >= 6 ? 2 : token.length >= 5 ? 1 : 0;
    return limit > 0 && editDistance(token, word) <= limit;
  });
}

export function matchScore(queryTokens: string[], name: string, extra = ''): number {
  const words = normalizeSearchText(`${name} ${extra}`).split(/[^a-z0-9]+/).filter((w) => w.length >= 2).map(stemToken);
  if (queryTokens.length === 0) return 0;
  let hits = 0;
  let score = 0;
  for (const token of queryTokens) {
    if (!tokenHits(token, words)) continue;
    hits += 1;
    score += words.includes(token) ? 300 : 160;
  }
  if (hits === 0) return 0;
  if (hits < queryTokens.length) score -= (queryTokens.length - hits) * 220;
  const nameNorm = normalizeSearchText(name);
  if (nameNorm === queryTokens.join(' ')) score += 400;
  score -= Math.min(120, nameNorm.length);
  if (!queryTokens.some((t) => t.startsWith('cru')) && COOKED.test(normalizeSearchText(extra))) {
    if (normalizeSearchText(extra).startsWith('cru')) score -= 40;
    else score += 25;
  }
  if (queryTokens.length === 1 && queryTokens[0] === 'pomme' && nameNorm.includes('pomme de terre')) {
    score -= 900;
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
