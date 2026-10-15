import {
  sanitizeContext,
  sanitizeBreadcrumb,
  sanitizeSentryEvent,
} from '../monitoring';
import type * as Sentry from '@sentry/react-native';

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  setUser: jest.fn(),
}));

describe('monitoring - anonymisation et filtrage des données de santé', () => {
  describe('sanitizeContext', () => {
    it('masque les clés sensibles relatives à la santé', () => {
      const input = {
        screen: 'Calendar',
        painLevel: 5,
        dailyCheckInCompleted: true,
        sessionCount: 2,
      };

      const result = sanitizeContext(input);

      expect(result.screen).toBe('Calendar');
      expect(result.painLevel).toBe('[DONNÉE_SANTÉ_MASQUÉE]');
      expect(result.dailyCheckInCompleted).toBe('[DONNÉE_SANTÉ_MASQUÉE]');
      expect(result.sessionCount).toBe(2);
    });

    it('masque les valeurs textuelles contenant des termes de santé', () => {
      const input = {
        errorReason: 'Erreur lors du calcul du score de sommeil',
        code: 500,
      };

      const result = sanitizeContext(input);

      expect(result.code).toBe(500);
      expect(result.errorReason).toBe('[DONNÉE_SANTÉ_MASQUÉE]');
    });

    it('nettoie les objets imbriqués', () => {
      const input = {
        meta: {
          nutritionTarget: { calories: 2500 },
          device: 'Pixel 8',
        },
      };

      const result = sanitizeContext(input);

      expect((result.meta as any).device).toBe('Pixel 8');
      expect((result.meta as any).nutritionTarget).toBe('[DONNÉE_SANTÉ_MASQUÉE]');
    });
  });

  describe('sanitizeBreadcrumb', () => {
    it('supprime complètement les miettes de requêtes vers des tables de santé', () => {
      const breadcrumb: Sentry.Breadcrumb = {
        type: 'http',
        category: 'fetch',
        data: {
          url: 'https://xyz.supabase.co/rest/v1/daily_checkins?select=*',
          method: 'GET',
        },
      };

      const result = sanitizeBreadcrumb(breadcrumb);
      expect(result).toBeNull();
    });

    it('supprime les query strings des URLs non sensibles pour ne pas faire fuiter de paramètres', () => {
      const breadcrumb: Sentry.Breadcrumb = {
        type: 'http',
        category: 'fetch',
        data: {
          url: 'https://xyz.supabase.co/rest/v1/teams?id=eq.12345',
          method: 'GET',
        },
      };

      const result = sanitizeBreadcrumb(breadcrumb);
      expect(result).not.toBeNull();
      expect(result?.data?.url).toBe('https://xyz.supabase.co/rest/v1/teams');
    });

    it('masque les messages textuels contenant des informations de santé', () => {
      const breadcrumb: Sentry.Breadcrumb = {
        category: 'ui.click',
        message: 'Utilisateur a cliqué sur douleur genou',
      };

      const result = sanitizeBreadcrumb(breadcrumb);
      expect(result?.message).toBe('[ACTION_SANTÉ_MASQUÉE]');
    });
  });

  describe('sanitizeSentryEvent', () => {
    it('anonymise l’utilisateur en ne gardant que son ID technique opaque', () => {
      const event = {
        user: {
          id: 'user-uuid-123',
          email: 'athlete@example.com',
          username: 'Jean Dupont',
          ip_address: '192.168.1.1',
        },
      } as unknown as Sentry.ErrorEvent;

      const result = sanitizeSentryEvent(event);

      expect(result.user).toEqual({ id: 'user-uuid-123' });
      expect((result.user as any).email).toBeUndefined();
      expect((result.user as any).username).toBeUndefined();
      expect((result.user as any).ip_address).toBeUndefined();
    });

    it('supprime les en-têtes d’autorisation et données de requête', () => {
      const event = {
        request: {
          url: 'https://api.example.com',
          headers: {
            authorization: 'Bearer secret-token',
            apikey: 'anon-key-123',
            'content-type': 'application/json',
          },
          data: { secret: 'payload' },
          cookies: { session: '123' },
        },
      } as unknown as Sentry.ErrorEvent;

      const result = sanitizeSentryEvent(event);

      expect(result.request?.data).toBeUndefined();
      expect(result.request?.cookies).toBeUndefined();
      expect(result.request?.headers?.['authorization']).toBeUndefined();
      expect(result.request?.headers?.['apikey']).toBeUndefined();
      expect(result.request?.headers?.['content-type']).toBe('application/json');
    });

    it('supprime les tags et contextes liés à la santé', () => {
      const event = {
        tags: {
          version: '1.1.0',
          painZone: 'quadriceps',
        },
        contexts: {
          os: { name: 'Android' },
          checkinContext: { sleepScore: 8 },
        },
      } as unknown as Sentry.ErrorEvent;

      const result = sanitizeSentryEvent(event);

      expect(result.tags?.version).toBe('1.1.0');
      expect(result.tags?.painZone).toBeUndefined();
      expect(result.contexts?.os).toBeDefined();
      expect(result.contexts?.checkinContext).toBeUndefined();
    });
  });
});
