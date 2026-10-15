import {
  teamWeeklySummaryService,
  getWeekRange,
  buildFallbackSummary,
  TeamWeeklyStats,
} from '../teamWeeklySummaryService';
import { supabase } from '../supabase';
import { alertsService } from '../alertsService';
import { fetchOpenAIResponse } from '../aiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../alertsService', () => ({
  alertsService: {
    fetchTeamAlerts: jest.fn(),
  },
}));

jest.mock('../aiService', () => ({
  fetchOpenAIResponse: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('Team Weekly Summary Service — Tâche T4', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getWeekRange', () => {
    it('calcule correctement l’intervalle du lundi au dimanche', () => {
      // 2026-10-15 est un jeudi
      const date = new Date(2026, 9, 15);
      const range = getWeekRange(date);

      expect(range.start.getDay()).toBe(1); // Lundi
      expect(range.end.getDay()).toBe(0); // Dimanche
      expect(range.startStr).toBe('2026-10-12');
      expect(range.endStr).toBe('2026-10-18');
      expect(range.weekLabel).toBe('Semaine du 12 au 18 octobre');
    });
  });

  describe('buildFallbackSummary', () => {
    it('génère exactement 5 lignes contenant les chiffres calculés stricts sans rien inventer', () => {
      const mockStats: TeamWeeklyStats = {
        startDate: '2026-10-12',
        endDate: '2026-10-18',
        weekLabel: 'Semaine du 12 au 18 octobre',
        totalAthletes: 10,
        plannedWorkouts: 20,
        completedWorkouts: 18,
        workoutCompletionRate: 90,
        expectedCheckIns: 40,
        recordedCheckIns: 36,
        checkInRate: 90,
        avgHealthScore: 78,
        avgSleepHours: 7.8,
        avgSleepQuality: 4.2,
        activeAlertsCount: 2,
        flaggedAthletesCount: 1,
        painZones: ['ischio-jambier'],
      };

      const lines = buildFallbackSummary(mockStats);

      expect(lines).toHaveLength(5);
      // Vérification que les chiffres réels exacts sont présents dans le texte
      expect(lines[0]).toContain('18 séances réalisées sur 20 planifiées (90% d\'assiduité)');
      expect(lines[1]).toContain('78% (bonne forme)');
      expect(lines[2]).toContain('36 check-ins saisis (90% de complétion)');
      expect(lines[3]).toContain('7.8h de sommeil par nuit (qualité 4.2/5)');
      expect(lines[4]).toContain('1 athlète à surveiller (zones : ischio-jambier)');
    });

    it('gère correctement le cas où aucune séance n’a été programmée', () => {
      const emptyStats: TeamWeeklyStats = {
        startDate: '2026-10-12',
        endDate: '2026-10-18',
        weekLabel: 'Semaine du 12 au 18 octobre',
        totalAthletes: 5,
        plannedWorkouts: 0,
        completedWorkouts: 0,
        workoutCompletionRate: 0,
        expectedCheckIns: 20,
        recordedCheckIns: 0,
        checkInRate: 0,
        avgHealthScore: null,
        avgSleepHours: null,
        avgSleepQuality: null,
        activeAlertsCount: 0,
        flaggedAthletesCount: 0,
        painZones: [],
      };

      const lines = buildFallbackSummary(emptyStats);
      expect(lines).toHaveLength(5);
      expect(lines[0]).toContain('aucune séance programmée cette semaine pour les 5 athlètes');
      expect(lines[1]).toContain('aucun check-in saisi pour le moment');
      expect(lines[4]).toContain('aucun signal de blessure ni alerte majeure détectée');
    });
  });

  describe('calculateTeamWeeklyStats', () => {
    it('calcule correctement les statistiques déterministes à partir des données Supabase', async () => {
      // Mock team_members
      const mockMembers = [
        { user_id: 'ath-1', status: 'approved' },
        { user_id: 'ath-2', status: 'approved' },
      ];

      // Mock workouts
      const mockWorkouts = [
        { id: 'w1', user_id: 'ath-1', date_prevue: '2026-10-13', completed: true },
        { id: 'w2', user_id: 'ath-2', date_prevue: '2026-10-14', completed: false },
      ];

      // Mock check-ins
      const mockCheckins = [
        { id: 'c1', athlete_id: 'ath-1', date: '2026-10-13', health_score: 80, sleep_hours: 8, sleep_quality: 4, pains: [] },
        { id: 'c2', athlete_id: 'ath-2', date: '2026-10-14', health_score: 60, sleep_hours: 6, sleep_quality: 3, pains: [{ muscle_id: 'mollets', muscle_name: 'mollet droit', intensity: 6, type: 'Contracture' }] },
      ];

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'team_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: mockMembers, error: null }),
              }),
            }),
          };
        }
        if (table === 'workouts') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lte: jest.fn().mockResolvedValue({ data: mockWorkouts, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'check_ins') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lte: jest.fn().mockResolvedValue({ data: mockCheckins, error: null }),
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      (alertsService.fetchTeamAlerts as jest.Mock).mockResolvedValue([
        { athlete_id: 'ath-2', severity: 'medium', reasons: [{ code: 'pain', label: 'Douleur' }] },
      ]);

      const stats = await teamWeeklySummaryService.calculateTeamWeeklyStats('team-1', new Date(2026, 9, 15));

      expect(stats.totalAthletes).toBe(2);
      expect(stats.plannedWorkouts).toBe(2);
      expect(stats.completedWorkouts).toBe(1);
      expect(stats.workoutCompletionRate).toBe(50);
      expect(stats.recordedCheckIns).toBe(2);
      expect(stats.avgHealthScore).toBe(70); // (80 + 60) / 2
      expect(stats.avgSleepHours).toBe(7); // (8 + 6) / 2
      expect(stats.avgSleepQuality).toBe(3.5); // (4 + 3) / 2
      expect(stats.painZones).toContain('mollet droit');
      expect(stats.flaggedAthletesCount).toBe(1);
    });
  });

  describe('getOrGenerateWeeklySummary', () => {
    it('utilise l’IA pour rédiger les 5 lignes et formate la réponse', async () => {
      const mockAiReply = `1. Les athlètes ont validé 1 séance sur 2 planifiées (50% de réussite).
2. La forme globale est modérée avec une moyenne de 70%.
3. 2 check-ins ont été enregistrés sur la période.
4. Le sommeil moyen est de 7h par nuit pour une qualité de 3.5/5.
5. Une alerte active sur le mollet droit pour 1 athlète à surveiller.`;

      (fetchOpenAIResponse as jest.Mock).mockResolvedValue(mockAiReply);

      // Setup simple DB mocks
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [{ user_id: 'ath-1', status: 'approved' }], error: null }),
          }),
          in: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      });

      (alertsService.fetchTeamAlerts as jest.Mock).mockResolvedValue([]);

      const result = await teamWeeklySummaryService.getOrGenerateWeeklySummary('team-test', 'Team Sprint', true);

      expect(result.aiLines).toHaveLength(5);
      expect(result.isFallback).toBe(false);
      expect(result.aiLines[0]).toContain('Les athlètes ont validé 1 séance sur 2 planifiées');
    });

    it('bascule sur le fallback déterministe en cas d’erreur de l’IA', async () => {
      (fetchOpenAIResponse as jest.Mock).mockRejectedValue(new Error('Réseau indisponible'));

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
          in: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      });

      const result = await teamWeeklySummaryService.getOrGenerateWeeklySummary('team-test', 'Team Sprint', true);

      expect(result.aiLines).toHaveLength(5);
      expect(result.isFallback).toBe(true);
    });
  });
});
