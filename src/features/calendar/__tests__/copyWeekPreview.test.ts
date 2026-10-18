import { summarizeWeek, dayLabel, athletesLabel } from '../copyWeekPreview';

describe('summarizeWeek', () => {
  const rows = [
    { id: 'm', group_assignment_id: 'g1', date_prevue: '2026-10-14T08:00:00', type_seance: 'Piste', athlete_id: 'coach', measures: { is_master: true } },
    { id: 'a', group_assignment_id: 'g1', date_prevue: '2026-10-14T08:00:00', type_seance: 'Piste', athlete_id: 'u1' },
    { id: 'b', group_assignment_id: 'g1', date_prevue: '2026-10-14T08:00:00', type_seance: 'Piste', athlete_id: 'u2' },
    { id: 'c', date_prevue: '2026-10-13T08:00:00', type_seance: 'Muscu', athlete_id: 'u3' },
    { id: 'd', date_prevue: '2026-10-16T08:00:00', type_seance: '', athlete_id: 'u1' },
  ];

  it('une ligne par séance, dans l’ordre des jours, athlètes comptés sans le coach', () => {
    const s = summarizeWeek(rows, 'coach');
    expect(s.map((x) => x.title)).toEqual(['Muscu', 'Piste', 'Séance']);
    expect(s[1].athletes).toBe(2);
    expect(s[0].athletes).toBe(1);
  });

  it('libellés', () => {
    expect(dayLabel('2026-10-14T08:00:00')).toBe('Mer. 14');
    expect(athletesLabel(1)).toBe('1 athlète');
    expect(athletesLabel(3)).toBe('3 athlètes');
  });
});
