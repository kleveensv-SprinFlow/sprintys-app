const mockStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => mockStore[k] ?? null),
    setItem: jest.fn(async (k: string, v: string) => { mockStore[k] = v; }),
    removeItem: jest.fn(async (k: string) => { delete mockStore[k]; }),
  },
}));

const mockInsert = jest.fn();
jest.mock('../supabase', () => ({ supabase: { from: () => ({ insert: mockInsert }) } }));

import { mealOutbox } from '../mealOutbox';

const row = (id: string) => ({ id, user_id: 'u1', consumed_at: '2026-10-20', meal_type: 'dejeuner', calories: 100 });

describe('mealOutbox (N7)', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k]);
    mockInsert.mockReset();
  });

  it('garde un repas et le renvoie pour le bon jour', async () => {
    expect(await mealOutbox.enqueue('u1', row('a'))).toBe(true);
    expect(await mealOutbox.pendingFor('u1', '2026-10-20')).toHaveLength(1);
    expect(await mealOutbox.pendingFor('u1', '2026-10-21')).toHaveLength(0);
  });

  it('envoie puis vide la file', async () => {
    await mealOutbox.enqueue('u1', row('a'));
    mockInsert.mockResolvedValue({ error: null });
    expect(await mealOutbox.flush('u1')).toEqual({ sent: 1, dropped: 0 });
    expect(await mealOutbox.count('u1')).toBe(0);
  });

  it('reste en file tant que le réseau manque', async () => {
    await mealOutbox.enqueue('u1', row('a'));
    mockInsert.mockResolvedValue({ error: { message: 'Network request failed' } });
    expect(await mealOutbox.flush('u1')).toEqual({ sent: 0, dropped: 0 });
    expect(await mealOutbox.count('u1')).toBe(1);
  });

  it('un doublon (23505) compte comme déjà envoyé', async () => {
    await mealOutbox.enqueue('u1', row('a'));
    mockInsert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } });
    expect(await mealOutbox.flush('u1')).toEqual({ sent: 1, dropped: 0 });
    expect(await mealOutbox.count('u1')).toBe(0);
  });

  it('retire un repas supprimé avant envoi', async () => {
    await mealOutbox.enqueue('u1', row('a'));
    await mealOutbox.remove('u1', 'a');
    expect(await mealOutbox.count('u1')).toBe(0);
  });
});
