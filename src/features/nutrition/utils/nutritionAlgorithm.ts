export interface BilanAnswers {
  perf: number;
  energy: number;
  recup: number;
  sleep: number;
  weight: number;
}

export interface BilanResult {
  title: string;
  diagnostic: string;
  action: string;
}

export const analyzeBilan = (answers: BilanAnswers): BilanResult => {
  // RÈGLES EN DUR (Par ordre de priorité)

  // 1. ALERTE GLYCOGÈNE
  if (answers.perf === -1 && answers.energy === -1) {
    return {
      title: 'ALERTE GLYCOGÈNE',
      diagnostic: 'Déplétion glycogénique et nerveuse détectée. Ton corps se vide.',
      action: 'Augmente tes glucides de 15% sur les 3 prochains jours.',
    };
  }

  // 2. ALERTE CATABOLISME
  if (answers.recup === -1) {
    return {
      title: 'ALERTE CATABOLISME',
      diagnostic: 'Tes muscles ne se réparent pas assez vite (courbatures persistantes).',
      action: 'Augmente tes protéines de 20g en post-séance et hydrate-toi mieux.',
    };
  }

  // 3. DETTE NERVEUSE
  if (answers.sleep === -1 && answers.perf <= 0) {
    return {
      title: 'DETTE NERVEUSE',
      diagnostic: 'Ton système nerveux ne récupère pas la nuit, impactant l\'explosivité.',
      action: 'Coupe les écrans 1h avant le coucher. Check ton apport en Magnésium/ZMA.',
    };
  }

  // 4. DÉFICIT CALORIQUE TROP SÉVÈRE
  if (answers.weight === -1 && answers.energy === -1) {
    return {
      title: 'DÉFICIT CALORIQUE TROP SÉVÈRE',
      diagnostic: 'Tu perds du poids mais au détriment de ton énergie.',
      action: 'Rajoute 200 kcal (50g de glucides) avant l\'entraînement.',
    };
  }

  // 5. MACHINE PARFAITE ⚡️
  if (
    answers.perf >= 0 &&
    answers.energy >= 0 &&
    answers.recup >= 0 &&
    answers.sleep >= 0 &&
    answers.weight >= 0
  ) {
    return {
      title: 'MACHINE PARFAITE ⚡️',
      diagnostic: 'Tous les voyants sont au vert. Ton corps assimile la charge.',
      action: 'Ne change rien, protocole validé.',
    };
  }

  // 6. FALLBACK
  return {
    title: 'AJUSTEMENTS MINEURS',
    diagnostic: 'Quelques variations normales. Maintiens la rigueur.',
    action: 'Garde tes macros actuelles, on refait le point la semaine prochaine.',
  };
};
