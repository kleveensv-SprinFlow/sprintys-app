jest.mock('expo-notifications', () => ({}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../supabase', () => ({ supabase: {} }));

import { checkInReminderDates } from '../notifications';

const at = (y: number, mo: number, d: number, h: number, mi = 0) => new Date(y, mo - 1, d, h, mi, 0, 0);

describe('rappels du check-in', () => {
  it('programme 7 rappels à l’heure choisie, dont aujourd’hui si l’heure n’est pas passée', () => {
    const dates = checkInReminderDates('08:30', false, at(2026, 10, 20, 7, 0));
    expect(dates).toHaveLength(7);
    expect(dates[0]).toEqual(at(2026, 10, 20, 8, 30));
    expect(dates[6]).toEqual(at(2026, 10, 26, 8, 30));
  });

  it('saute aujourd’hui si le check-in est déjà fait', () => {
    const dates = checkInReminderDates('08:30', true, at(2026, 10, 20, 7, 0));
    expect(dates[0]).toEqual(at(2026, 10, 21, 8, 30));
    expect(dates).toHaveLength(6);
  });

  it('saute aujourd’hui si l’heure est passée', () => {
    const dates = checkInReminderDates('08:30', false, at(2026, 10, 20, 9, 0));
    expect(dates[0]).toEqual(at(2026, 10, 21, 8, 30));
  });
});
