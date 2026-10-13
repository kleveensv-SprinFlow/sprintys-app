/**
 * Publisher details shown in the legal texts (mentions légales, privacy policy, terms).
 *
 * ⚠️ To complete before publishing on the stores: every field marked "À COMPLÉTER".
 * Keep docs/*.html in sync (same values) — they are the public versions of these texts.
 */
export const PUBLISHER = {
  /** Raison sociale (ex. « Sprintys SAS »). */
  companyName: 'À COMPLÉTER — raison sociale',
  /** Forme juridique et capital (ex. « SAS au capital de 1 000 € »). */
  legalForm: 'À COMPLÉTER — forme juridique et capital',
  /** Numéro SIREN / SIRET et RCS. */
  registration: 'À COMPLÉTER — SIRET / RCS',
  /** Adresse du siège social. */
  address: 'À COMPLÉTER — adresse du siège',
  /** Directeur ou directrice de la publication. */
  publicationDirector: 'À COMPLÉTER — nom du directeur de la publication',
  /** Adresse de contact et d'exercice des droits RGPD. */
  contactEmail: 'support@sprintflow.app',
  privacyEmail: 'support@sprintflow.app',
};

/** Hosting providers (required by the LCEN). */
export const HOSTS = {
  backend: 'Supabase Inc., 970 Toa Payoh North #07-04, Singapour 318992 — données hébergées en Union européenne (Paris, AWS eu-west-3).',
  website: 'GitHub Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis (pages publiques).',
};

/** Date of the current version of the legal texts. */
export const LEGAL_VERSION = '2026-10-14';
