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
    PressableScale: ({ children, testID, ...props }: any) =>
      React.createElement(View, { ...props, testID: testID || 'pressable-scale' }, children),
  };
});

jest.mock('../../../shared/components/GlassSheen', () => ({
  GlassSheen: () => null,
}));

jest.mock('../../../shared/components/GlowBackground', () => ({
  GlowBackground: () => null,
}));

jest.mock('../../../shared/components/SegmentedControl', () => ({
  SegmentedControl: () => null,
}));

jest.mock('../components/MealIcon', () => ({
  MealIcon: () => null,
}));

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }: any) => React.createElement(View, props, children),
  };
});

jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: () => [{ granted: true }, jest.fn()],
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
}));

jest.mock('../../../store/consentStore', () => ({
  useConsentStore: () => ({ hasConsented: true }),
}));

jest.mock('../../../store/entitlementStore', () => ({
  useEntitlementStore: () => ({ isPro: false }),
  billingOn: () => false,
  remainingToday: () => 10,
}));

jest.mock('../../../services/openFoodFactsService', () => ({
  openFoodFactsService: {
    search: jest.fn().mockResolvedValue([]),
    fetchByBarcode: jest.fn(),
  },
}));

jest.mock('../../../services/nutritionService', () => ({
  nutritionService: {
    searchHybrid: jest.fn().mockResolvedValue({ off: [], ciqual: [] }),
  },
}));

jest.mock('../../../services/aiNutritionService', () => ({
  aiNutritionService: {
    analyzeMealText: jest.fn(),
  },
  AIQuotaError: class extends Error {},
}));

jest.mock('../../../shared/hooks/useDebounce', () => ({
  useDebounce: (val: any) => val,
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

jest.mock('../../../shared/feedback/FeedbackHost', () => ({
  FeedbackHost: () => null,
}));

const mockMealLogs = [
  { id: '1', meal_type: 'petit_dejeuner', custom_food_name: 'Banane', calories: 105, proteines: 1.3, glucides: 27, lipides: 0.3, quantity_g: 120 },
  { id: '2', meal_type: 'dejeuner', custom_food_name: 'Riz et poulet', calories: 450, proteines: 35, glucides: 50, lipides: 8, quantity_g: 300 },
];

let mockNutritionStoreState: any = {
  mealLogs: mockMealLogs,
  currentDate: '2026-10-16',
  openSearchModal: jest.fn(),
  closeSearchModal: jest.fn(),
  isSearchModalOpen: true,
  activeSearchMealType: 'dejeuner',
  copyMealFromDate: jest.fn(),
  fetchHistory: jest.fn(),
  recentFoods: [
    { id: 'r1', food_name: 'Pomme', last_calories: 52, last_proteines: 0.3, last_glucides: 14, last_lipides: 0.2, count: 5 }
  ],
  frequentFoods: [],
  savedMeals: [],
  quickAddFood: jest.fn().mockResolvedValue(true),
  logSavedMeal: jest.fn().mockResolvedValue(true),
  deleteSavedMeal: jest.fn(),
  addMealLog: jest.fn().mockResolvedValue(true),
};

jest.mock('../../../store/nutrition/nutritionStore', () => ({
  useNutritionStore: (selector: any) => {
    return typeof selector === 'function' ? selector(mockNutritionStoreState) : mockNutritionStoreState;
  },
  getLocalDateString: () => '2026-10-15',
}));

let mockCurrentAuthUser: any = { id: 'u1', dateOfBirth: '2000-01-01' };

jest.mock('../../../store/authStore', () => ({
  useAuthStore: (selector: any) => {
    const state = {
      user: mockCurrentAuthUser,
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
import { FoodDetailSheet } from '../components/FoodDetailSheet';
import { FoodSearchModal } from '../components/FoodSearchModal';
import { isMinorAthlete } from '../../../legal/age';

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

  describe('Fiche détaillée d’un aliment (FoodDetailSheet)', () => {
    const mockProduct = {
      nom: 'Pomme',
      display_name: 'Pomme',
      energie_kcal: 52,
      proteines: 0.3,
      glucides: 14,
      lipides: 0.2,
    };

    it('pour un MINEUR : masque totalement les kcal et les macro lanes', () => {
      mockCurrentAuthUser = minorAthlete;
      let comp: any;
      act(() => {
        comp = renderer.create(
          <FoodDetailSheet
            product={mockProduct}
            visible={true}
            onClose={jest.fn()}
            onAdd={jest.fn()}
          />
        );
      });
      const texts = extractAllStrings(comp.toJSON());
      const fullText = texts.join(' ');

      // Pas de calories ni de macros
      expect(fullText).not.toMatch(/kcal/i);
      expect(fullText).not.toMatch(/protéines|glucides|lipides/i);

      // Le nom de l'aliment et le sélecteur de portion restent accessibles
      expect(fullText).toContain('Pomme');
      expect(fullText).toContain('Ajouter');
    });

    it('pour un ADULTE : affiche les calories en direct et les voies de macros', () => {
      mockCurrentAuthUser = adultAthlete;
      let comp: any;
      act(() => {
        comp = renderer.create(
          <FoodDetailSheet
            product={mockProduct}
            visible={true}
            onClose={jest.fn()}
            onAdd={jest.fn()}
          />
        );
      });
      const texts = extractAllStrings(comp.toJSON());
      const fullText = texts.join(' ');

      // Les calories sont visibles en direct pour l'adulte (78 kcal pour la portion par défaut de 150g)
      expect(fullText).toMatch(/(?:52|78)\s*kcal/i);
    });
  });

  describe('Messages de confirmation d’ajout et recherche réelle (FoodSearchModal)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      act(() => {
        jest.runOnlyPendingTimers();
      });
      jest.useRealTimers();
    });

    it('pour un MINEUR : monte FoodSearchModal, masque les kcal sur les aliments récents et affiche le toast réel « Pomme ajouté ! » sans kcal', async () => {
      mockCurrentAuthUser = minorAthlete;
      mockNutritionStoreState.isSearchModalOpen = true;

      let comp: any;
      try {
        await act(async () => {
          comp = renderer.create(<FoodSearchModal />);
        });

        const initialText = extractAllStrings(comp.toJSON()).join(' ');
        // Dans la liste des récents, aucun chiffre calorique pour le mineur
        expect(initialText).toContain('Pomme');
        expect(initialText).not.toMatch(/kcal/i);
        expect(initialText).not.toMatch(/protéines|glucides|lipides/i);

        // Simule l'appui sur le bouton d'ajout rapide du premier aliment récent
        const plusButton = comp.root.findByProps({ hitSlop: 10 });
        await act(async () => {
          await plusButton.props.onPress();
        });

        const postAddText = extractAllStrings(comp.toJSON()).join(' ');
        // Le toast réel affiché sur l'écran ne doit contenir aucune kcal
        expect(postAddText).toContain('Pomme ajouté !');
        expect(postAddText).not.toMatch(/kcal/i);
      } finally {
        if (comp) {
          act(() => {
            comp.unmount();
          });
        }
      }
    });

    it('pour un ADULTE : monte FoodSearchModal et affiche le toast réel « Pomme ajouté (52 kcal) »', async () => {
      mockCurrentAuthUser = adultAthlete;
      mockNutritionStoreState.isSearchModalOpen = true;

      let comp: any;
      try {
        await act(async () => {
          comp = renderer.create(<FoodSearchModal />);
        });

        const plusButton = comp.root.findByProps({ hitSlop: 10 });
        await act(async () => {
          await plusButton.props.onPress();
        });

        const postAddText = extractAllStrings(comp.toJSON()).join(' ');
        // Le toast réel affiché sur l'écran pour l'adulte mentionne bien les kcal
        expect(postAddText).toContain('Pomme ajouté (52 kcal)');
        expect(postAddText).toMatch(/52\s*kcal/i);
      } finally {
        if (comp) {
          act(() => {
            comp.unmount();
          });
        }
      }
    });
  });
});

