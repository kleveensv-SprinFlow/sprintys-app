import React from 'react';
// @ts-ignore
import renderer, { act } from 'react-test-renderer';

// Home weight line: value first, its age, a + that opens the weighing sheet; no 30-day change before 18.

let mockUser: Record<string, unknown> = {};
let mockMetrics: { weight: number; created_at: string }[] = [];
const mockPush = jest.fn();

const daysAgoIso = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(8, 0, 0, 0);
  return d.toISOString();
};
const yearsAgo = (n: number) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d.toISOString().slice(0, 10);
};

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../../../store/authStore', () => ({
  useAuthStore: (sel: (s: { user: unknown }) => unknown) => sel({ user: mockUser }),
}));
jest.mock('../../../store/bodyStore', () => ({
  useBodyStore: () => ({ metrics: mockMetrics, loadMetrics: jest.fn() }),
}));
jest.mock('../../../services/performanceService', () => ({
  performanceService: { fetch: () => Promise.resolve({ records: [], recent_prs: [] }) },
}));
jest.mock('../../../shared/hooks/useToday', () => ({
  useToday: () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  },
}));
jest.mock('../../../shared/components/PressableScale', () => {
  const R = require('react');
  const { View } = require('react-native');
  return { PressableScale: ({ children, ...p }: { children: React.ReactNode }) => R.createElement(View, p, children) };
});
jest.mock('../../../shared/components/GlassSheen', () => ({ GlassSheen: () => null }));
jest.mock('../../../shared/components/DashboardCard', () => ({ glassCard: {} }));
jest.mock('@expo/vector-icons', () => ({ Feather: () => null, Ionicons: () => null }));

import { ProgressSummaryCard } from '../components/ProgressSummaryCard';

const allText = (tree: renderer.ReactTestRenderer) =>
  tree.root
    .findAll((n: { type: unknown }) => n.type === 'Text')
    .map((n: { props: { children: unknown } }) => [].concat(n.props.children as never).join(''))
    .join(' | ');

async function render() {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<ProgressSummaryCard />);
  });
  return tree;
}

describe('Ligne Poids de l’accueil', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockMetrics = [
      { weight: 79.6, created_at: daysAgoIso(31) },
      { weight: 79.8, created_at: daysAgoIso(1) },
    ];
  });

  it('montre le poids, sa date relative et l’évolution à un majeur', async () => {
    mockUser = { id: 'a', dateOfBirth: yearsAgo(25) };
    const t = allText(await render());
    expect(t).toMatch(/79,8 kg/);
    expect(t).toMatch(/hier/);
    expect(t).toMatch(/\+0,2 kg en 30 jours/);
  });

  it('n’affiche pas l’évolution du poids à un mineur', async () => {
    mockUser = { id: 'm', dateOfBirth: yearsAgo(16) };
    const t = allText(await render());
    expect(t).toMatch(/79,8 kg/);
    expect(t).not.toMatch(/30 jours/);
  });

  it('le + ouvre directement la saisie d’une pesée', async () => {
    mockUser = { id: 'a', dateOfBirth: yearsAgo(25) };
    const tree = await render();
    const plus = tree.root.find((n: { props: { accessibilityLabel?: string } }) => n.props.accessibilityLabel === 'Ajouter une pesée');
    act(() => plus.props.onPress());
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/(athlete)/body', params: { new: '1' } });
  });

  it('invite à peser quand il n’y a aucune pesée', async () => {
    mockUser = { id: 'a', dateOfBirth: yearsAgo(25) };
    mockMetrics = [];
    expect(allText(await render())).toMatch(/Ajoute ta première pesée/);
  });
});
