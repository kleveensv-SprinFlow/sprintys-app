jest.mock('../supabase', () => ({ supabase: {} }));

import { computeCoachHabits, oneRowPerSession } from '../../../supabase/functions/sprinty/habits';
import { groupMemory, MemoryItem } from '../coachMemoryService';
import { summarizeBlock } from '../../features/sprinty/types';

const run = (dist: number, n: number, intensity = 90) => ({
  name: `${n} × ${dist} m`,
  sets: Array.from({ length: n }, () => ({ distance: dist, intensity })),
});

describe('habitudes de programmation du coach', () => {
  const rows = [
    // même séance envoyée à 2 athlètes + copie maître : comptée une fois
    { id: 'm', group_assignment_id: 'g1', date_prevue: '2026-10-13T08:00:00', type_seance: 'Piste', measures: { is_master: true, surface: 'piste' }, blocks: [{ exercises: [run(120, 6)] }] },
    { id: 'a', group_assignment_id: 'g1', date_prevue: '2026-10-13T08:00:00', type_seance: 'Piste', measures: { surface: 'piste' }, blocks: [{ exercises: [run(120, 6)] }] },
    { id: 'b', group_assignment_id: 'g1', date_prevue: '2026-10-13T08:00:00', type_seance: 'Piste', measures: { surface: 'piste' }, blocks: [{ exercises: [run(120, 6)] }] },
    { id: 'c', date_prevue: '2026-10-15T08:00:00', type_seance: 'Côte', measures: { surface: 'cote' }, blocks: [{ exercises: [run(80, 8, 80)] }] },
    {
      id: 'd',
      date_prevue: '2026-10-16T08:00:00',
      type_seance: 'Musculation',
      measures: {},
      blocks: [{ exercises: [{ name: 'Squat', sets: [{ reps: 5, weight: 100 }, { reps: 5, weight: 100 }, { reps: 5, weight: 100 }] }] }],
    },
    { id: 'r', date_prevue: '2026-10-17T08:00:00', type_seance: 'Repos', measures: {}, blocks: [] },
  ];

  it('une séance par groupe, la copie maître en priorité', () => {
    const one = oneRowPerSession(rows);
    expect(one).toHaveLength(4);
    expect(one.find((w) => w.group_assignment_id === 'g1')?.id).toBe('m');
  });

  it('formats, terrains, intensité, muscu et jours, repos exclu', () => {
    const h = computeCoachHabits(rows, 8);
    expect(h.seances).toBe(3);
    expect(h.seances_par_semaine).toBe(0.4);
    expect(h.formats_course.map((f) => f.format)).toEqual(expect.arrayContaining(['6 × 120 m', '8 × 80 m']));
    expect(h.terrains.map((t) => t.terrain)).toEqual(expect.arrayContaining(['piste', 'côte']));
    expect(h.intensite_course_moyenne_pct).toBe(84); // (6×90 + 8×80) / 14
    expect(h.exercices_muscu[0]).toEqual({ exercice: 'Squat', nombre: 1, format_habituel: '3 × 5' });
    expect(h.jours_frequents.map((j) => j.jour)).toEqual(expect.arrayContaining(['mardi', 'jeudi', 'vendredi']));
    // minuit à Paris enregistré la veille à 22 h UTC : compté le bon jour
    expect(computeCoachHabits([{ id: 'x', date_prevue: '2026-09-11T22:00:00Z', type_seance: 'Piste', measures: {}, blocks: [] }]).jours_frequents[0].jour).toBe('samedi');
  });

  it('rien programmé : zéro, sans habitude inventée', () => {
    const h = computeCoachHabits([], 8);
    expect(h.seances).toBe(0);
    expect(h.formats_course).toEqual([]);
    expect(h.intensite_course_moyenne_pct).toBeNull();
  });
});

describe('mémoire du coach côté app', () => {
  const item = (id: string, category: any, content: string): MemoryItem => ({ id, category, content, source: 'manuel', created_at: '' });

  it('regroupe par thème dans l’ordre d’affichage, sans thème vide', () => {
    const g = groupMemory([item('1', 'interdits', 'Pas de 300 m'), item('2', 'specialite', 'Sprint court'), item('3', 'specialite', 'Haies')]);
    expect(g.map((x) => x.category)).toEqual(['specialite', 'interdits']);
    expect(g[0].items).toHaveLength(2);
  });

  it('la carte est résumée pour la conversation', () => {
    const s = summarizeBlock({ type: 'memory_proposal', items: [{ category: 'methodes', content: 'Tu fais des côtes le mercredi', source: 'presentation' }], applied: true, kept: 1 });
    expect(s).toContain('Tu fais des côtes le mercredi');
    expect(s).toContain('1 retenu');
  });
});
