/**
 * Single source of the legal texts. Shown in the app (LegalScreen) and turned into the public
 * pages of docs/ by `node scripts/build-legal-pages.js`. Plain data only (no imports from the app)
 * except the publisher details.
 */
import { PUBLISHER, HOSTS, LEGAL_VERSION } from './publisher';

export type LegalSection = { title: string; paragraphs: string[] };
export type LegalDocument = { id: 'privacy' | 'terms' | 'notice'; title: string; intro: string; sections: LegalSection[] };

const updated = `Dernière mise à jour : ${LEGAL_VERSION.split('-').reverse().join('/')}`;

export const PRIVACY_POLICY: LegalDocument = {
  id: 'privacy',
  title: 'Politique de confidentialité',
  intro: `${updated}. Sprintys est une application de suivi d'entraînement en athlétisme qui relie des athlètes et leurs coachs. Cette page explique, simplement, quelles données nous utilisons, pourquoi, avec qui elles sont partagées et comment exercer tes droits.`,
  sections: [
    {
      title: '1. Qui est responsable de tes données',
      paragraphs: [
        `Le responsable du traitement est ${PUBLISHER.companyName}, ${PUBLISHER.legalForm}, ${PUBLISHER.registration}, ${PUBLISHER.address}.`,
        `Pour toute question sur tes données ou pour exercer tes droits : ${PUBLISHER.privacyEmail}.`,
      ],
    },
    {
      title: '2. Les données que nous utilisons',
      paragraphs: [
        'Compte : adresse e-mail, prénom, nom, sexe, date de naissance, rôle (athlète ou coach), photo de profil si tu en ajoutes une, et l’identifiant Google ou Apple si tu te connectes avec eux. Ton mot de passe est chiffré par notre hébergeur, nous ne le voyons jamais.',
        'Profil sportif (athlètes) : taille, poids, disciplines, objectif, niveau d’activité, objectifs de nutrition.',
        'Données de santé, avec ton accord explicite : poids et composition corporelle (masse grasse, masse musculaire, eau), check-ins (sommeil, fatigue, stress, humeur) et scores de forme calculés à partir de ces réponses. Les douleurs (zone, type, intensité, commentaire) font l’objet d’un accord séparé, que tu peux retirer à tout moment.',
        'Entraînement : séances, performances, calendrier, compétitions.',
        'Nutrition : repas et aliments notés, objectifs caloriques. Une photo de repas n’est utilisée que pour l’analyse demandée et n’est pas conservée par Sprintys.',
        'Échanges : messages et sondages avec ton coach et ton équipe, signalements et blocages.',
        'Assistant Sprinty : tes conversations restent sur ton téléphone. Pour répondre, le contenu de la conversation est envoyé à notre prestataire d’IA, avec seulement les données utiles à ta question, lues dans ton compte au moment de la demande (par exemple tes check-ins des deux dernières semaines, tes séances, tes résultats, tes pesées ou tes apports du jour), sous forme résumée et sans ton nom de famille. Les graphiques sont calculés par Sprintys à partir de tes données. Nous comptons le nombre de requêtes par jour pour éviter les abus.',
        'Objectifs et plans Sprinty (athlètes sans coach) : quand tu enregistres un objectif ou ajoutes un plan proposé par Sprinty, nous conservons l’objectif (épreuve, échéance, niveau, disponibilités), le plan, tes réponses au questionnaire de sécurité et les séances ajoutées à ton calendrier.',
        'Assistant Sprinty côté coach : tes échanges avec Sprinty sont envoyés à notre prestataire d’IA pour générer la réponse. Quand ta question porte sur tes athlètes, seules les données qu’ils ont choisi de partager avec toi et qui sont utiles à la question (séances, forme, résultats, nutrition, poids, et douleurs s’ils l’ont accepté) sont envoyées, sous forme résumée, uniquement pour cette réponse.',
        'Position approximative : uniquement pendant l’utilisation, pour la météo de ton lieu d’entraînement. Elle n’est pas enregistrée.',
        'Accords : le type d’accord, le texte accepté, sa version et la date.',
        'Nous n’utilisons ni publicité, ni outil de suivi publicitaire, ni revente de données.',
      ],
    },
    {
      title: '3. Pourquoi et sur quelle base',
      paragraphs: [
        'Fournir le service (compte, planification, suivi, échanges avec ton coach) : exécution du contrat que constituent les conditions d’utilisation.',
        'Données de santé et douleurs : ton consentement explicite (article 9 du RGPD), que tu peux retirer dans les réglages.',
        'Fonctions d’intelligence artificielle (assistant, analyse de repas) : ton consentement, demandé avant la première utilisation. Sans cet accord, l’application fonctionne sans ces fonctions.',
        'Sécurité, prévention des abus, modération des signalements : notre intérêt légitime à garder un service sûr.',
        'Obligations légales : conservation de certaines informations quand la loi l’impose.',
      ],
    },
    {
      title: '4. Qui voit tes données',
      paragraphs: [
        'Toi, toujours.',
        'Ton coach, uniquement après que tu as rejoint son équipe et qu’il a accepté ta demande, et seulement après que tu as confirmé le partage. Il voit tes séances et performances, tes repas et objectifs, ton poids et ta composition corporelle, tes check-ins et, si tu as donné cet accord, tes douleurs. Il peut demander à l’assistant Sprinty une analyse de ces données. Si tu quittes l’équipe, ton coach n’y a plus accès.',
        'Les membres de ton équipe voient les messages que tu publies dans la discussion d’équipe, avec ton nom.',
        'Nos prestataires, uniquement pour faire fonctionner le service (section 5). Nous ne vendons aucune donnée.',
      ],
    },
    {
      title: '5. Prestataires et transferts',
      paragraphs: [
        'Supabase : base de données, comptes et fichiers. Données hébergées dans l’Union européenne (Paris).',
        'OpenAI (États-Unis) : génération des réponses de l’assistant, analyse des photos et descriptions de repas. Les données transmises ne sont pas utilisées pour entraîner leurs modèles (conditions de l’API). Le transfert est encadré par les clauses contractuelles types de la Commission européenne et le cadre de protection des données UE–États-Unis.',
        'Open-Meteo : prévisions météo à partir de ta position approximative, sans identifiant personnel.',
        'Open Food Facts : recherche d’un aliment par nom ou code-barres, sans identifiant personnel.',
        'Tavily (États-Unis) : recherche de compétitions sur le web à partir de critères (région, période, discipline), sans donnée personnelle.',
        'Google et Apple : si tu choisis de te connecter avec eux, et pour le paiement des abonnements via l’App Store ou Google Play (nous ne recevons jamais ton moyen de paiement).',
        'RevenueCat (États-Unis) : gestion des abonnements. Reçoit ton identifiant Sprintys, la formule achetée, les dates de début et de fin et l’historique d’achat, sans nom ni coordonnée bancaire. Transfert encadré par les clauses contractuelles types de la Commission européenne.',
      ],
    },
    {
      title: '6. Combien de temps nous les gardons',
      paragraphs: [
        'Tant que ton compte existe. Quand tu supprimes ton compte depuis les réglages, ton profil, tes séances, repas, mesures, check-ins, photos de profil et accords sont effacés. Les messages déjà envoyés dans une discussion d’équipe peuvent rester visibles par l’équipe, sans être rattachés à ton profil.',
        'Les informations d’abonnement (formule, dates, magasin) sont effacées avec le compte, hors obligations comptables du magasin. Les compteurs d’utilisation de l’IA sont effacés avec le compte. Les signalements sont conservés au plus un an pour traiter les abus.',
      ],
    },
    {
      title: '7. Tes droits',
      paragraphs: [
        'Tu peux accéder à tes données, les corriger, les exporter (Réglages › Exporter mes données), les effacer (Réglages › Supprimer mon compte), retirer un accord à tout moment, t’opposer à un traitement ou en demander la limitation, et définir des directives sur le sort de tes données après ton décès.',
        `Pour toute demande : ${PUBLISHER.privacyEmail}. Nous répondons sous un mois.`,
        'Tu peux aussi adresser une réclamation à la CNIL (www.cnil.fr).',
      ],
    },
    {
      title: '8. Âge minimum',
      paragraphs: [
        'Sprintys est réservé aux personnes d’au moins 15 ans. À partir de 15 ans, tu peux consentir seul au traitement de tes données en France. La date de naissance est vérifiée à l’inscription.',
      ],
    },
    {
      title: '9. Sécurité',
      paragraphs: [
        'Les échanges sont chiffrés (HTTPS). L’accès aux données est limité par des règles de sécurité au niveau de la base : chacun ne lit que ce à quoi il a droit. Ne partage pas ton mot de passe et préviens-nous si tu remarques un usage suspect.',
      ],
    },
    {
      title: '10. Modifications',
      paragraphs: [
        'Si cette politique change de façon importante, nous te le dirons dans l’application et, si nécessaire, nous te redemanderons ton accord.',
      ],
    },
  ],
};

export const TERMS_OF_SERVICE: LegalDocument = {
  id: 'terms',
  title: 'Conditions d’utilisation',
  intro: `${updated}. Ces conditions encadrent l’utilisation de l’application Sprintys. En créant un compte, tu les acceptes.`,
  sections: [
    {
      title: '1. Le service',
      paragraphs: [
        'Sprintys permet à des athlètes et à leurs coachs de planifier des séances, de suivre l’entraînement, la nutrition, le poids et la forme, et d’échanger. Un assistant d’intelligence artificielle, Sprinty, aide à interpréter ces informations.',
        'Sprintys est gratuite : les fonctions essentielles (suivi, calendrier, messages, recherche d’aliments) restent accessibles sans payer. Des abonnements facultatifs, décrits à l’article 4 ter, débloquent des fonctions supplémentaires. Nous pouvons faire évoluer les fonctions du service.',
      ],
    },
    {
      title: '2. Ton compte',
      paragraphs: [
        'Il faut avoir au moins 15 ans. Les informations données à l’inscription doivent être exactes, en particulier ta date de naissance.',
        'Ton compte est personnel. Tu es responsable de la confidentialité de ton mot de passe.',
      ],
    },
    {
      title: '3. Pas un avis médical',
      paragraphs: [
        'Sprintys n’est pas un dispositif médical. Les calories, scores de forme, analyses de repas et réponses de l’assistant sont des indications générales : ils ne remplacent pas un médecin, un kinésithérapeute ou un diététicien.',
        'En cas de douleur, de blessure ou de symptôme inquiétant, consulte un professionnel de santé. En cas d’urgence, appelle le 15 ou le 112.',
      ],
    },
    {
      title: '4. L’intelligence artificielle',
      paragraphs: [
        'Les réponses de Sprinty sont générées automatiquement et peuvent être inexactes ou incomplètes. Vérifie toute information importante.',
        'Sprinty est conçu pour le sport et la nutrition. N’y partage pas d’informations sensibles concernant d’autres personnes. Une limite d’utilisation quotidienne s’applique pour éviter les abus.',
        'Sprinty ne modifie rien seul : les séances, plans, objectifs et annonces qu’il propose ne sont enregistrés que si tu les valides. Tout ce qu’il propose porte la mention « Sprinty (IA) ».',
        'Les résultats de recherche de compétitions viennent du web et peuvent être inexacts : vérifie les dates et les inscriptions auprès de l’organisateur ou de la fédération.',
      ],
    },
    {
      title: '4 bis. Sprinty coach IA (athlètes sans coach)',
      paragraphs: [
        'Si tu n’as pas de coach dans l’application, Sprinty peut te proposer un objectif et un plan d’entraînement, que tu ajoutes ou non à ton calendrier. Ce plan est une proposition générale, établie à partir de tes réponses et de tes données : il ne remplace ni un entraîneur diplômé ni un suivi médical, et aucun résultat n’est garanti.',
        'Avant le premier plan, Sprinty te pose quelques questions de sécurité (douleur, problème cardiaque, malaise à l’effort, reprise après un arrêt). Si une réponse l’indique, il te conseille de consulter un médecin et ne propose qu’un plan doux. Pour les moins de 18 ans, les charges restent prudentes et aucun objectif de perte de poids n’est proposé.',
        'Tu restes responsable de ta pratique : échauffe-toi, adapte ou arrête une séance en cas de douleur, de malaise ou de fatigue inhabituelle, et consulte un professionnel de santé si besoin.',
        'Quand tu rejoins un coach, c’est lui qui programme tes séances : Sprinty ne te propose plus de plan ni de séance physique, et te permet de retirer les séances restantes de ton plan. Il peut seulement t’ajouter des séances de récupération douce (mobilité, étirements, respiration), que tu valides toi-même ; ton coach ne les voit pas. Tu peux retirer ton plan à tout moment depuis ton profil.',
      ],
    },
    {
      title: '4 ter. Abonnement facultatif (Plus)',
      paragraphs: [
        'Une formule payante existe pour les athlètes : Plus, en abonnement mensuel ou annuel. Ses fonctions et les limites de la formule gratuite sont détaillées sur la page d’offre de l’application. Sans abonnement, la recherche d’aliments et le scan de code-barres restent libres, et tu gardes chaque semaine (du lundi au dimanche) un essai de l’analyse de repas par IA (3 analyses, photo ou phrase), de Sprinty (7 messages) et d’un plan Sprinty de 2 semaines (une seule fois).',
        'L’achat est réalisé par l’App Store d’Apple ou Google Play : le prix, la TVA, le moyen de paiement et la facturation sont ceux du magasin, affichés avant que tu confirmes. L’abonnement se renouvelle automatiquement à la fin de chaque période, au même prix, sauf si tu le résilies au moins 24 heures avant l’échéance depuis les réglages de ton compte Apple ou Google Play (bouton « Gérer l’abonnement » dans ton profil). Résilier ne supprime rien : tu gardes l’accès jusqu’à la fin de la période payée, puis tu reviens à la formule gratuite, avec toutes tes données.',
        'Un essai gratuit de 7 jours peut être proposé une fois par compte du magasin. Si tu ne résilies pas avant la fin de l’essai, l’abonnement payant démarre. Les remboursements sont gérés par Apple ou Google selon leurs conditions ; nous ne pouvons pas les effectuer. Les codes promotionnels ne sont proposés que par les mécanismes officiels des magasins.',
        'Ton coach peut te faire bénéficier d’un accès Premium via son propre abonnement : tu as alors le niveau Plus tant que tu fais partie de son groupe. Si tu as aussi un abonnement personnel, il continue d’être facturé : pense à le résilier si tu n’en as plus besoin. Supprimer ton compte Sprintys n’annule pas un abonnement acheté auprès d’Apple ou de Google : résilie-le d’abord dans les réglages du magasin.',
        'Pour les consommateurs de l’Union européenne, le droit de rétractation de 14 jours s’applique selon les conditions du magasin, sauf si tu demandes un accès immédiat au contenu numérique. Nous pouvons modifier les prix ou les fonctions d’une formule ; tu es prévenu avant tout changement de prix, et le magasin te demande ton accord si nécessaire.',
      ],
    },
    {
      title: '5. Coachs et équipes',
      paragraphs: [
        'Un athlète rejoint une équipe avec le code de son coach. Une fois sa demande acceptée et le partage confirmé, le coach voit les données décrites dans la politique de confidentialité. L’athlète peut quitter l’équipe à tout moment.',
        'Le coach s’engage à utiliser ces données uniquement pour l’accompagnement sportif, à les garder confidentielles, à ne pas poser de diagnostic médical et à faire preuve d’une vigilance particulière avec les athlètes mineurs.',
      ],
    },
    {
      title: '6. Règles de conduite',
      paragraphs: [
        'Sont interdits : les propos haineux, harcelants, discriminatoires, violents ou à caractère sexuel ; le partage de contenus illicites ; l’usurpation d’identité ; la promotion du dopage ou de pratiques dangereuses ; toute tentative de contourner la sécurité ou les limites du service.',
        'Chaque conversation permet de signaler un message ou de bloquer un utilisateur. Nous examinons les signalements et pouvons supprimer un contenu ou suspendre un compte qui enfreint ces règles.',
      ],
    },
    {
      title: '7. Propriété',
      paragraphs: [
        'L’application, sa marque et ses contenus appartiennent à l’éditeur. Tu restes propriétaire de ce que tu publies ; tu nous autorises seulement à l’afficher aux personnes concernées pour faire fonctionner le service.',
      ],
    },
    {
      title: '8. Disponibilité et responsabilité',
      paragraphs: [
        'Nous faisons notre possible pour que le service soit disponible et fiable, sans pouvoir le garantir en permanence. Notre responsabilité ne peut être engagée pour un usage contraire à ces conditions ni pour une décision prise uniquement sur la base d’une indication de l’application.',
      ],
    },
    {
      title: '9. Fin d’utilisation',
      paragraphs: [
        'Tu peux supprimer ton compte à tout moment depuis les réglages. Nous pouvons suspendre un compte en cas de manquement grave à ces conditions, après t’avoir prévenu sauf urgence.',
      ],
    },
    {
      title: '10. Modifications et droit applicable',
      paragraphs: [
        'Nous te prévenons dans l’application de toute modification importante. Ces conditions sont soumises au droit français. En cas de désaccord, contacte-nous d’abord : nous chercherons une solution amiable.',
        `Contact : ${PUBLISHER.contactEmail}.`,
      ],
    },
  ],
};

export const LEGAL_NOTICE: LegalDocument = {
  id: 'notice',
  title: 'Mentions légales',
  intro: updated + '.',
  sections: [
    {
      title: 'Éditeur',
      paragraphs: [
        `${PUBLISHER.companyName}, ${PUBLISHER.legalForm}.`,
        `${PUBLISHER.registration}.`,
        `Siège : ${PUBLISHER.address}.`,
        `Contact : ${PUBLISHER.contactEmail}.`,
        `Directeur de la publication : ${PUBLISHER.publicationDirector}.`,
      ],
    },
    {
      title: 'Hébergement',
      paragraphs: [`Application et données : ${HOSTS.backend}`, `Pages publiques : ${HOSTS.website}`],
    },
    {
      title: 'Propriété intellectuelle',
      paragraphs: ['La marque Sprintys, le logo et l’application sont protégés. Toute reproduction sans autorisation est interdite.'],
    },
  ],
};

export const LEGAL_DOCUMENTS = [TERMS_OF_SERVICE, PRIVACY_POLICY, LEGAL_NOTICE];
