import React from 'react';
// @ts-ignore
import renderer, { act } from 'react-test-renderer';

// Mocks avant les imports
jest.mock('../../../core/theme', () => {
  const actual = jest.requireActual('../../../core/theme');
  return {
    ...actual,
    useTheme: () => ({
      colors: {
        text: '#000',
        textSecondary: '#666',
        textMuted: '#999',
        border: '#ccc',
        surface: '#fff',
        surfaceLight: '#f5f5f5',
        glassFill: '#eee',
        hairline: '#ddd',
      },
    }),
  };
});

jest.mock('../../../shared/components/PressableScale', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    PressableScale: ({ children, ...props }: any) => React.createElement(View, props, children),
  };
});

jest.mock('../../../shared/components/GlassSheen', () => ({
  GlassSheen: () => null,
}));

jest.mock('../components/EnergyTrack', () => ({
  EnergyTrack: 'EnergyTrack',
}));

jest.mock('../components/MacroLanes', () => ({
  MacroLanes: 'MacroLanes',
}));

jest.mock('@expo/vector-icons', () => ({
  Feather: 'Feather',
}));

const mockMealLogs = [
  { id: '1', meal_type: 'petit_dejeuner', custom_food_name: 'Banane', calories: 105, proteines: 1.3, glucides: 27, lipides: 0.3, quantity_g: 120 },
  { id: '2', meal_type: 'dejeuner', custom_food_name: 'Riz et poulet', calories: 450, proteines: 35, glucides: 50, lipides: 8, quantity_g: 300 },
];

jest.mock('../../../store/nutrition/nutritionStore', () => ({
  useNutritionStore: (selector: any) => {
    const state = {
      mealLogs: mockMealLogs,
      currentDate: '2026-10-16',
      openSearchModal: jest.fn(),
      copyMealFromDate: jest.fn(),
    };
    return typeof selector === 'function' ? selector(state) : state;
  },
  getLocalDateString: () => '2026-10-15',
}));

jest.mock('../../../store/authStore', () => ({
  useAuthStore: (selector: any) => {
    const state = {
      user: { id: 'u1', dateOfBirth: '2000-01-01' },
    };
    return typeof selector === 'function' ? selector(state) : state;
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('../../../services/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => new Promise(() => {}),
        }),
      }),
    }),
  },
}));

import { NutritionSummary } from '../components/NutritionSummary';
import { MealSection } from '../components/MealSection';

/** Helper pour extraire récursivement tous les textes d'un rendu react-test-renderer */
function extractAllStrings(node: any): string[] {
  const result: string[] = [];
  function walk(n: any) {
    if (!n) return;
    if (typeof n === 'string' || typeof n === 'number') {
      result.push(String(n));
      return;
    }
    if (Array.isArray(n)) {
      n.forEach(walk);
      return;
    }
    if (n.children) {
      n.children.forEach(walk);
    }
  }
  walk(node);
  return result;
}

describe('Preuve de rendu UI (N2) : Masquage réel mineur vs adulte via react-test-renderer', () => {
  const minorAthlete = { dateOfBirth: '2010-06-15' }; // 16 ans
  const adultAthlete = { dateOfBirth: '1998-05-20', manualKcalGoal: 2200 }; // 28 ans

  describe('Écran du jour (NutritionSummary)', () => {
    it('pour un MINEUR : affiche « Repas du jour », aucun « kcal », et aucune macro (protéines/glucides/lipides)', () => {
      let comp: any;
      act(() => {
        comp = renderer.create(<NutritionSummary athleteProfile={minorAthlete} />);
      });
      const texts = extractAllStrings(comp.toJSON());
      const fullText = texts.join(' ');

      // Titre calme
      expect(fullText).toContain('Repas du jour');
      expect(fullText).not.toContain('Énergie du jour');

      // Aucune mention de kcal ni de macros dans le rendu complet
      expect(fullText).not.toMatch(/kcal/i);
      expect(fullText).not.toMatch(/protéines|glucides|lipides/i);
      expect(fullText).not.toMatch(/2\s*000/);
    });

    it('pour un ADULTE : affiche « Énergie du jour », l’objectif calorique et les kcal consommées', () => {
      let comp: any;
      act(() => {
        comp = renderer.create(<NutritionSummary athleteProfile={adultAthlete} />);
      });
      const texts = extractAllStrings(comp.toJSON());
      const fullText = texts.join(' ');

      expect(fullText).toContain('Énergie du jour');
      expect(fullText).toMatch(/2[\s\u202f]?200\s*kcal/i);
      expect(fullText).toMatch(/kcal/i);
    });
  });

  describe('Liste des repas (MealSection)', () => {
    it('pour un MINEUR : masque tous les kcal de chaque repas et affiche le nombre d’aliments', () => {
      let comp: any;
      act(() => {
        comp = renderer.create(<MealSection athleteProfile={minorAthlete} />);
      });
      const texts = extractAllStrings(comp.toJSON());
      const fullText = texts.join(' ');

      // Zéro "kcal" pour le mineur
      expect(fullText).not.toMatch(/kcal/i);

      // Affiche l’état calme
      expect(fullText).toMatch(/1 aliment/);
    });

    it('pour un ADULTE : affiche les calories consommées et cibles par repas', () => {
      let comp: any;
      act(() => {
        comp = renderer.create(<MealSection athleteProfile={adultAthlete} />);
      });
      const texts = extractAllStrings(comp.toJSON());
      const fullText = texts.join(' ');

      // Les kcal sont bien présentes pour chaque repas
      expect(fullText).toMatch(/kcal/i);
    });
  });
});
