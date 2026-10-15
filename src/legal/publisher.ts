/**
 * Publisher details shown in the legal texts (mentions légales, privacy policy, terms).
 *
 * Empty fields are not shown. Add the SIRET and the address once the micro-enterprise is registered.
 * Keep docs/*.html in sync (same values) — they are the public versions of these texts.
 */
export const PUBLISHER = {
  /** Nom de l'éditeur (personne physique tant que la micro-entreprise n'est pas immatriculée). */
  companyName: 'Kleveens Verviers (nom commercial : Sprintys)',
  /** Statut. À remplacer par « Entrepreneur individuel (micro-entreprise) » à l'immatriculation. */
  legalForm: 'Entrepreneur individuel',
  /** SIRET, à ajouter dès réception (laisser vide sinon : la ligne n'est pas affichée). */
  registration: 'RCS Marseille 983 727 777 (SIREN 983 727 777)',
  /** Adresse, à ajouter avec le SIRET (laisser vide sinon : la ligne n'est pas affichée). */
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
