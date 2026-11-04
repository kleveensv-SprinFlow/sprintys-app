import React from 'react';
// @ts-ignore
import renderer, { act } from 'react-test-renderer';

// The home nutrition tile must follow the Nutrition tab rule: no calories nor calorie goal before 18.

let mockUser: Record<string, unknown> = {};
let mockMeals: { calories: number; meal_type: string }[] = [];

jest.mock('../../../store/authStore', () => ({
  useAuthStore: (sel: (s: { user: unknown }) => unknown) => sel({ user: mockUser }),
}));
jest.mock('../../../store/nutrition/nutritionStore', () => ({
  useNutritionStore: (sel: (s: { mealLogs: unknown }) => unknown) => sel({ mealLogs: mockMeals }),
}));
jest.mock('../../../store/checkInStore', () => ({ useCheckInStore: () => ({}) }));
jest.mock('../../../services/workoutService', () => ({
  workoutService: { fetchNextCompetition: () => Promise.resolve(null) },
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }), useLocalSearchParams: () => ({}) }));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: (cb: () => void) => require('react').useEffect(cb, []) }));
jest.mock('../../../shared/components/PressableScale', () => {
  const R = require('react');
  const { View } = require('react-native');
  return { PressableScale: ({ children, ...p }: { children: React.ReactNode }) => R.createElement(View, p, children) };
});
jest.mock('../../../shared/components/GlassSheen', () => ({ GlassSheen: () => null }));
jest.mock('../../../shared/components/DashboardCard', () => {
  const R = require('react');
  const { Text } = require('react-native');
  return { glassCard: {}, glassFill: '#eee', DashboardCardHeader: ({ label }: { label: string }) => R.createElement(Text, null, label) };
});
jest.mock('../../checkin/components/CheckInModal', () => ({ CheckInModal: () => null }));
jest.mock('../../checkin/components/CheckInSummaryModal', () => ({ CheckInSummaryModal: () => null }));
jest.mock('../../onboarding/tourRegistry', () => ({ tourRef: () => undefined }));
jest.mock('react-native-svg', () => ({ __esModule: true, default: () => null, Circle: () => null }));
jest.mock('../../../shared/hooks/useToday', () => ({
  useToday: () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  },
}));
jest.mock('@expo/vector-icons', () => ({ Feather: () => null, Ionicons: () => null }));

import { SummaryTiles } from '../components/AthleteGauges';

const yearsAgo = (n: number) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d.toISOString().slice(0, 10);
};

const textOf = (tree: renderer.ReactTestRenderer) =>
  tree.root
    .findAll((n: { type: unknown }) => n.type === 'Text' || (n.type as { displayName?: string })?.displayName === 'Text')
    .map((n: { props: { children: unknown } }) => [].concat(n.props.children as never).join(''))
    .join(' | ');

async function render() {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<SummaryTiles />);
  });
  return tree;
}

describe('Tuile Nutrition de l’accueil', () => {
  beforeEach(() => {
    mockMeals = [
      { calories: 600, meal_type: 'breakfast' },
      { calories: 700, meal_type: 'lunch' },
    ];
  });

  it('montre les calories et l’objectif à un majeur', async () => {
    mockUser = { id: 'a', dateOfBirth: yearsAgo(25), manualKcalGoal: 2500 };
    const t = textOf(await render());
    expect(t).toMatch(/kcal/);
    expect(t).toMatch(/2[\s  ]?500/);
  });

  it('ne montre ni calories ni objectif à un mineur, seulement les repas notés', async () => {
    mockUser = { id: 'm', dateOfBirth: yearsAgo(16), manualKcalGoal: 2500 };
    const t = textOf(await render());
    expect(t).not.toMatch(/kcal/i);
    expect(t).not.toMatch(/objectif/i);
    expect(t).toMatch(/repas/);
  });

  it('traite une date de naissance absente comme un mineur', async () => {
    mockUser = { id: 'x', manualKcalGoal: 2500 };
    const t = textOf(await render());
    expect(t).not.toMatch(/kcal/i);
  });
});
