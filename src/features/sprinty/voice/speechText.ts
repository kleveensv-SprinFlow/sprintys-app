import type { MessagePart, UiBlock } from '../types';

/**
 * Texte d'une réponse de Sprinty préparé pour être lu à voix haute (pur, testé) : sans markdown, unités dites en
 * toutes lettres, chiffres lus à la française, cartes résumées en une phrase au lieu d'être lues case par case.
 */

const UNITS: [RegExp, string][] = [
  [/(\d)\s?km\/h\b/g, '$1 kilomètres heure'],
  [/(\d)\s?kcal\b/g, '$1 kilocalories'],
  [/(\d)\s?kg\b/g, '$1 kilos'],
  [/(\d)\s?km\b/g, '$1 kilomètres'],
  [/(\d)\s?cm\b/g, '$1 centimètres'],
  [/(\d)\s?min\b/g, '$1 minutes'],
  [/(\d)\s?m\b/g, '$1 mètres'],
  [/(\d)\s?h\b/g, '$1 heures'],
  [/(\d)\s?%/g, '$1 pour cent'],
  [/(\d)\s?g\b/g, '$1 grammes'],
  [/\/100\b/g, ' sur 100'],
  [/\/10\b/g, ' sur 10'],
  [/\/5\b/g, ' sur 5'],
];

/** « 12,96 s » → « 12 secondes 96 » ; « 7,4 s » → « 7 secondes 4 » ; « 45 s » → « 45 secondes ». */
function seconds(text: string): string {
  return text
    .replace(/(\d+)'(\d{2})[,.](\d{1,2})/g, '$1 minute $2 secondes $3')
    .replace(/(\d+)[,.](\d{1,2})\s?s\b/g, '$1 secondes $2')
    .replace(/(\d+)\s?s\b/g, '$1 secondes');
}

export function cleanForSpeech(md: string): string {
  let t = md
    .replace(/\r/g, '')
    .split('\n')
    .filter((l) => !/^\s*\|/.test(l)) // tableaux écrits : résumés à part
    .filter((l) => !/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l))
    .map((l) => l.replace(/^\s*#{1,6}\s+/, '').replace(/^\s*[-*•]\s+/, '').replace(/^\s*(\d{1,2})[.)]\s+/, '$1. ').replace(/^\s*>\s?/, ''))
    .map((l) => {
      const s = l.trim();
      return s && !/[.!?:;…]$/.test(s) ? `${s}.` : s;
    })
    .filter(Boolean)
    .join(' ');
  t = t.replace(/\*\*|__|`/g, '').replace(/(^|\s)[*_]([^*_]+)[*_]/g, '$1$2');
  t = seconds(t);
  for (const [re, rep] of UNITS) t = t.replace(re, rep);
  t = t.replace(/×/g, ' fois ').replace(/\b1RM\b/gi, 'charge maximale').replace(/→/g, ' puis ').replace(/≈/g, 'environ ');
  t = t.replace(/(\d),(\d)/g, '$1 virgule $2');
  return t.replace(/\s+/g, ' ').replace(/\s+([.,])/g, '$1').trim();
}

function blockSentence(b: UiBlock): string {
  switch (b.type) {
    case 'chart':
      return `Je t'affiche un graphique : ${b.title}.`;
    case 'stats':
      return `${b.title ? `${b.title}. ` : ''}${b.items.map((i) => `${i.label} : ${i.value}${i.unit ? ` ${i.unit}` : ''}`).join('. ')}.`;
    case 'table':
      return `Je t'affiche un tableau${b.title ? ` : ${b.title}` : ''}.`;
    case 'sessions_proposal':
      return `Je te propose ${b.sessions.length} séance${b.sessions.length > 1 ? 's' : ''}, à ajouter depuis la carte.`;
    case 'plan_proposal':
      return `Je te propose un plan de ${b.weeks.length} semaines : ${b.title}.`;
    case 'goal_proposal':
      return `Objectif proposé : ${b.goal.title}.`;
    case 'announcement_draft':
      return "J'ai préparé un brouillon d'annonce, tu peux le relire avant de le publier.";
    case 'memory_proposal':
      return 'Dis-moi ce que je dois retenir en cochant la carte.';
    case 'competitions':
      return `J'ai trouvé ${b.items.length} compétition${b.items.length > 1 ? 's' : ''}.`;
    case 'choices':
      return b.questions.map((q) => q.question).join(' ');
    default:
      return '';
  }
}

/** Texte complet à lire, limité pour rester un message court à écouter. */
export function partsToSpeech(parts: MessagePart[] | undefined, fallback = '', max = 1800): string {
  const pieces = parts?.length
    ? parts.map((p) => (p.kind === 'text' ? cleanForSpeech(p.text) : cleanForSpeech(blockSentence(p.block)))).filter(Boolean)
    : [cleanForSpeech(fallback)];
  const full = pieces.join(' ').replace(/\s+/g, ' ').trim();
  if (full.length <= max) return full;
  const cut = full.slice(0, max);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return (end > max * 0.5 ? cut.slice(0, end + 1) : cut).trim();
}
