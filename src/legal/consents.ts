import { LEGAL_VERSION } from './publisher';

/**
 * Every consent the app records (table user_consents: type, exact text, version, server date).
 * `health_data` is the historical key of the pain consent: a database trigger keeps pains out of
 * check-ins without it, so the key must not change.
 */
export type ConsentType = 'terms' | 'health_profile' | 'coach_sharing' | 'ai_processing' | 'health_data';

export const CONSENT_VERSION = LEGAL_VERSION;

export const CONSENT_TEXTS: Record<ConsentType, string> = {
  terms: 'J’ai au moins 15 ans et j’accepte les conditions d’utilisation et la politique de confidentialité de Sprintys.',
  health_profile:
    'J’accepte que Sprintys utilise mes données de santé (poids, composition corporelle, sommeil, fatigue, stress, humeur) pour suivre ma forme. Je peux retirer cet accord en supprimant ces données ou mon compte.',
  coach_sharing:
    'J’accepte que mon coach voie mes séances, mes repas, mon poids et ma composition, mes check-ins et, si je l’ai accepté, mes douleurs, et qu’il puisse les faire analyser par l’assistant Sprinty. Je peux quitter l’équipe à tout moment.',
  ai_processing:
    'J’accepte que les informations nécessaires à la réponse (message, photo ou description du repas, résumé de mon contexte) soient envoyées à notre prestataire d’IA, OpenAI (États-Unis), qui ne les utilise pas pour entraîner ses modèles. Je peux retirer cet accord dans les réglages.',
  health_data:
    'J’accepte que Sprintys enregistre les douleurs que je décris (zone, type, intensité, commentaire) et que mon coach les voie. Ce n’est pas un dossier médical. Je peux retirer cet accord dans les réglages ; les douleurs déjà notées restent consultables par moi.',
};

/** Short labels for the settings list. */
export const CONSENT_LABELS: Record<ConsentType, string> = {
  terms: 'Conditions et confidentialité',
  health_profile: 'Données de santé',
  coach_sharing: 'Partage avec mon coach',
  ai_processing: 'Fonctions d’IA',
  health_data: 'Suivi des douleurs',
};

/** Consents without which the account cannot be used. */
export const requiredConsents = (role: 'athlete' | 'coach' | string | undefined, inTeam: boolean): ConsentType[] =>
  role === 'coach' ? ['terms'] : inTeam ? ['terms', 'health_profile', 'coach_sharing'] : ['terms', 'health_profile'];
