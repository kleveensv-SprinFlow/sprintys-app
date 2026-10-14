import { Feather } from '@expo/vector-icons';

export type TourRole = 'athlete' | 'coach';

export interface TourStep {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  text: string;
  /** Where to find it in the app (shown as a small chip). */
  where?: string;
  /** Three short, concrete points. */
  points?: string[];
}

/** Bump when the tour changes enough that everyone should see it again. */
export const TOUR_VERSION = 1;

const ATHLETE: TourStep[] = [
  {
    icon: 'zap',
    title: 'Bienvenue sur Sprintys',
    text: 'Tes séances, ta forme et ton coach au même endroit. Ce tour dure une minute, et tu pourras le revoir quand tu veux depuis ton profil.',
  },
  {
    icon: 'calendar',
    title: 'Tes séances',
    where: 'Onglet Séances',
    text: 'Retrouve jour par jour ce que ton coach a prévu.',
    points: ['Touche une séance pour voir les blocs, les charges et les temps', 'Note tes chronos et valide la séance', 'Les phases d’entraînement apparaissent en couleur'],
  },
  {
    icon: 'activity',
    title: 'Ton check-in du jour',
    where: 'Accueil, carte « Forme du jour »',
    text: 'Trente secondes chaque jour pour dire comment tu vas.',
    points: ['Sommeil, énergie, stress, motivation', 'Les douleurs éventuelles, si tu l’acceptes', 'Ça calcule ta forme et aide ton coach à ajuster la charge'],
  },
  {
    icon: 'coffee',
    title: 'Nutrition et poids',
    where: 'Onglet Nutrition · carte « Composition »',
    text: 'Suis ce que tu manges et ton évolution, sans te prendre la tête.',
    points: ['Cherche un aliment ou scanne un code-barres', 'Avec l’IA : une photo ou une description suffit', 'Ton poids et ta composition sur une courbe claire'],
  },
  {
    icon: 'message-circle',
    title: 'Messages et Sprinty',
    where: 'Onglet Messages',
    text: 'Parle à ton coach, à ton groupe, et à Sprinty.',
    points: ['Discussion directe avec ton coach et salon du groupe', 'Sprinty répond sur l’entraînement, la récupération et la nutrition', 'Il peut se tromper : ce n’est jamais un avis médical'],
  },
  {
    icon: 'users',
    title: 'Rejoindre ton groupe',
    where: 'Accueil, icône en haut à gauche',
    text: 'Ton coach te donne un code à 8 chiffres.',
    points: ['Saisis-le : ton coach reçoit ta demande et l’accepte', 'Il ne voit tes données qu’après ton accord', 'Tu peux quitter le groupe à tout moment'],
  },
];

const COACH: TourStep[] = [
  {
    icon: 'zap',
    title: 'Bienvenue sur Sprintys',
    text: 'Planifie, suis et accompagne tes athlètes depuis un seul endroit. Ce tour dure une minute, et tu pourras le revoir depuis ton profil.',
  },
  {
    icon: 'users',
    title: 'Crée ton groupe',
    where: 'Onglet Équipe',
    text: 'Un groupe, un code d’invitation, et tes athlètes arrivent.',
    points: ['Touche « + » pour créer un groupe, puis copie ou partage son code', 'Valide les demandes dans l’onglet « Demandes »', 'Crée des sous-groupes : 100 m, Haies, Juniors…'],
  },
  {
    icon: 'calendar',
    title: 'Planifie des séances',
    where: 'Onglet Calendrier',
    text: 'Choisis un jour, puis le type d’entraînement.',
    points: ['Course, musculation, technique, escaliers, repos, compétition', 'Envoie à toute l’équipe, à un sous-groupe ou à un athlète', 'Copie ou répète une séance en deux touches'],
  },
  {
    icon: 'heart',
    title: 'La forme de ton équipe',
    where: 'Accueil, carte « Forme de l’équipe »',
    text: 'Chaque matin, vois qui est en forme et qui a besoin de récupérer.',
    points: ['Le score moyen et le nombre de check-ins du jour', 'Le détail de chaque athlète en un geste', 'Tu ne vois que ce que l’athlète a accepté de partager'],
  },
  {
    icon: 'volume-2',
    title: 'Messages et annonces',
    where: 'Accueil, mégaphone en haut à gauche',
    text: 'Garde le contact avec ton groupe.',
    points: ['Une annonce publiée dans le salon de l’équipe', 'Un sondage pour décider ensemble', 'Un message direct à chaque athlète'],
  },
  {
    icon: 'cpu',
    title: 'Sprinty, ton assistant',
    where: 'Onglet Sprinty',
    text: 'Il t’aide à préparer et à analyser.',
    points: ['Propose une séance adaptée à la date et au cycle', 'Analyse la progression d’un athlète : touche-le dans Équipe, puis « Analyser avec Sprinty »', 'Il peut se tromper : garde ton œil de coach'],
  },
];

export const tourFor = (role?: string | null): TourStep[] => (role === 'coach' ? COACH : ATHLETE);
