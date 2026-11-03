import { AiAccessKey, AI_SCOPES, AiScope } from '../../services/aiAccessService';

export const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const formatShortDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const expiryText = (iso: string | null) => (iso ? `Expire le ${formatShortDate(iso)}` : 'Sans expiration');

/** One line under a key: expiry and use */
export const keySubtitle = (k: AiAccessKey) =>
  `${expiryText(k.expires_at)} · ${k.use_count ? `${k.use_count} lecture${k.use_count > 1 ? 's' : ''}` : 'jamais utilisée'}`;

export const scopeLabel = (s: AiScope) => AI_SCOPES.find((x) => x.key === s)?.label ?? s;

/** « Séances, Résultats et 2 autres » */
export const scopesSummary = (scopes: AiScope[]) => {
  const names = scopes.map(scopeLabel);
  if (names.length <= 2) return names.join(' et ') || 'Rien';
  return `${names.slice(0, 2).join(', ')} et ${names.length - 2} autre${names.length - 2 > 1 ? 's' : ''}`;
};
