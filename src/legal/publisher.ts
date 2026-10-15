/**
 * Publisher details shown in the legal texts (mentions légales, privacy policy, terms).
 *
 * Empty fields are not shown. The registration and the address below are the real ones.
 * Keep docs/*.html in sync (same values) — they are the public versions of these texts.
 */
export const PUBLISHER = {
  /** Nom de l'éditeur. */
  companyName: 'Kleveens Verviers (nom commercial : Sprintys)',
  /** Statut affiché. Ne pas le changer sans confirmation : ce n'est pas encore « micro-entreprise ». */
  legalForm: 'Entrepreneur individuel',
  /** SIREN / RCS. */
  registration: 'RCS Marseille 983 727 777 (SIREN 983 727 777)',
  /** Adresse. */
  address: '1022 Route de Cassis, 13830 Roquefort-la-Bédoule, France',
  /** Directeur ou directrice de la publication. */
  publicationDirector: 'Kleveens Verviers',
  /** Adresse de contact et d'exercice des droits RGPD. */
  contactEmail: 'sprinty.flow@gmail.com',
  privacyEmail: 'sprinty.flow@gmail.com',
};

/** Hosting providers (required by the LCEN). */
export const HOSTS = {
  backend: 'Supabase Inc., 970 Toa Payoh North #07-04, Singapour 318992 — données hébergées en Union européenne (Paris, AWS eu-west-3).',
  website: 'GitHub Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis (pages publiques).',
};

/** Date of the current version of the legal texts. */
export const LEGAL_VERSION = '2026-10-18';
