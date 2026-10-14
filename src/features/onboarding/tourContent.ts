export type TourRole = 'athlete' | 'coach';

export interface TourStep {
  /** Element to light up (see tourRegistry). Without it, the step is a simple card with a "Suivant" button. */
  target?: string;
  /** Screen to be on for this step (the tour navigates there). */
  route?: string;
  title: string;
  text: string;
  /** Label of the button on a step without target. */
  cta?: string;
}

/** Bump when the tour changes enough that everyone should see it again. */
export const TOUR_VERSION = 2;

const ATHLETE: TourStep[] = [
  {
    route: '/(athlete)',
    title: 'Bienvenue sur Sprintys',
    text: 'On te montre où tout se trouve, directement sur l’écran. Suis la main : touche ce qui est entouré.',
    cta: 'C’est parti',
  },
  {
    target: 'athlete.checkin',
    route: '/(athlete)',
    title: 'Ton check-in du jour',
    text: 'Chaque jour, touche ici : 30 secondes pour dire comment tu vas. Ça calcule ta forme et aide ton coach à ajuster la charge.',
  },
  {
    target: 'athlete.groups',
    title: 'Rejoins ton coach',
    text: 'Ton coach te donne un code à 8 chiffres. Touche ici pour le saisir : il reçoit ta demande et l’accepte.',
  },
  {
    target: 'athlete.tab.calendar',
    title: 'Tes séances',
    text: 'Touche l’onglet Séances pour voir ce que ton coach a prévu.',
  },
  {
    route: '/(athlete)/calendar',
    title: 'Ton calendrier',
    text: 'Chaque jour affiche tes séances. Touche un jour, puis une séance : tu vois les blocs, les charges, et tu notes tes temps.',
    cta: 'Compris',
  },
  {
    target: 'athlete.tab.nutrition',
    route: '/(athlete)/calendar',
    title: 'Ta nutrition',
    text: 'Touche l’onglet Nutrition pour suivre ce que tu manges.',
  },
  {
    target: 'athlete.addMeal',
    route: '/(athlete)/nutrition',
    title: 'Ajoute un repas',
    text: 'Touche « Ajouter » : cherche un aliment, scanne un code-barres ou, avec l’IA, prends une photo de ton repas.',
  },
  {
    target: 'athlete.tab.message',
    title: 'Messages',
    text: 'Touche l’onglet Messages : ton coach, ton groupe et Sprinty.',
  },
  {
    target: 'athlete.sprinty',
    route: '/(athlete)/message',
    title: 'Sprinty, ton assistant',
    text: 'Pose-lui tes questions sur l’entraînement, la récupération ou la nutrition. Il peut se tromper : ce n’est jamais un avis médical.',
  },
  {
    target: 'athlete.profile',
    route: '/(athlete)',
    title: 'Ton profil',
    text: 'Tes informations, tes accords, l’export de tes données… et ce tutoriel, à revoir quand tu veux. Touche pour terminer.',
  },
];

const COACH: TourStep[] = [
  {
    route: '/(coach)',
    title: 'Bienvenue sur Sprintys',
    text: 'On te montre où tout se trouve, directement sur l’écran. Suis la main : touche ce qui est entouré.',
    cta: 'C’est parti',
  },
  {
    target: 'coach.form',
    route: '/(coach)',
    title: 'La forme de ton équipe',
    text: 'Chaque matin, touche cette carte : tu vois qui est en forme et qui a besoin de récupérer. Tu ne vois que ce que l’athlète a accepté de partager.',
  },
  {
    target: 'coach.announce',
    title: 'Une annonce à ton équipe',
    text: 'Touche le mégaphone pour publier une annonce dans le salon de l’équipe, ou l’envoyer à un sous-groupe.',
  },
  {
    target: 'coach.tab.group',
    title: 'Ton équipe',
    text: 'Touche l’onglet Équipe pour gérer tes groupes et tes athlètes.',
  },
  {
    target: 'coach.createGroup',
    route: '/(coach)/group',
    title: 'Crée ton groupe',
    text: 'Touche « + », donne un nom, puis partage le code d’invitation. Tu valides les demandes dans l’onglet « Demandes ».',
  },
  {
    target: 'coach.tab.calendar',
    title: 'Planifie les séances',
    text: 'Touche l’onglet Calendrier pour programmer l’entraînement.',
  },
  {
    route: '/(coach)/calendar',
    title: 'Un jour, un type de séance',
    text: 'Touche un jour, puis choisis : course, musculation, technique, escaliers, repos ou compétition. Envoie à toute l’équipe, à un sous-groupe ou à un athlète.',
    cta: 'Compris',
  },
  {
    target: 'coach.tab.chat',
    route: '/(coach)/calendar',
    title: 'Sprinty, ton assistant',
    text: 'Il propose des séances et analyse la progression d’un athlète (dans Équipe, touche l’athlète puis « Analyser avec Sprinty »). Il peut se tromper : garde ton œil de coach.',
  },
  {
    target: 'coach.profile',
    route: '/(coach)',
    title: 'Ton profil',
    text: 'Tes informations, tes accords, l’export de tes données… et ce tutoriel, à revoir quand tu veux. Touche pour terminer.',
  },
];

export const tourFor = (role?: string | null): TourStep[] => (role === 'coach' ? COACH : ATHLETE);
