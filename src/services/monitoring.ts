import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

/** Liste des mots-clés de données de santé ou sensibles à filtrer impérativement. */
const SENSITIVE_KEYWORDS = [
  'pain',
  'douleur',
  'blessure',
  'injury',
  'eva',
  'checkin',
  'check_in',
  'check-in',
  'sommeil',
  'sleep',
  'fatigue',
  'stress',
  'humeur',
  'mood',
  'soreness',
  'courbature',
  'nutrition',
  'repas',
  'meal',
  'calorie',
  'macro',
  'glucide',
  'lipide',
  'proteine',
  'protein',
  'carbs',
  'fat',
  'food',
  'aliment',
  'poids',
  'weight',
  'masse',
  'heart',
  'coeur',
  'bpm',
];

/** Tables Supabase traitant des données de santé ou privées des athlètes. */
const SENSITIVE_TABLES = [
  'checkins',
  'check_ins',
  'daily_checkins',
  'pains',
  'body_pains',
  'body_injuries',
  'meals',
  'food_logs',
  'weight_logs',
  'athlete_profiles',
];

function isSensitiveKeyOrValue(str: string): boolean {
  const lower = str.toLowerCase();
  return SENSITIVE_KEYWORDS.some((kw) => lower.includes(kw));
}

/** Nettoie un objet de façon récursive pour purger toute donnée de santé. */
export function sanitizeContext(data: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (isSensitiveKeyOrValue(key)) {
      clean[key] = '[DONNÉE_SANTÉ_MASQUÉE]';
      continue;
    }

    if (typeof value === 'string' && isSensitiveKeyOrValue(value)) {
      clean[key] = '[DONNÉE_SANTÉ_MASQUÉE]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      clean[key] = sanitizeContext(value as Record<string, unknown>);
    } else {
      clean[key] = value;
    }
  }

  return clean;
}

/** Filtre les miettes de pain (breadcrumbs) pour éviter toute fuite d'URL ou d'action liée à la santé. */
export function sanitizeBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb | null {
  // Purger les requêtes HTTP/fetch vers des endpoints de santé
  if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch' || breadcrumb.type === 'http') {
    const url = String(breadcrumb.data?.url ?? '');
    const lowerUrl = url.toLowerCase();

    // Si la requête concerne une table de données de santé ou de profil sportif, on jette la trace
    if (SENSITIVE_TABLES.some((table) => lowerUrl.includes(table))) {
      return null;
    }

    // Supprimer les query parameters des URLs pour ne pas faire fuiter de filtres ou valeurs
    if (url.includes('?') && breadcrumb.data) {
      breadcrumb.data.url = url.split('?')[0];
    }
  }

  // Filtrer les messages textuels contenant des termes de santé
  if (breadcrumb.message && isSensitiveKeyOrValue(breadcrumb.message)) {
    breadcrumb.message = '[ACTION_SANTÉ_MASQUÉE]';
  }

  // Nettoyer les données attachées
  if (breadcrumb.data) {
    breadcrumb.data = sanitizeContext(breadcrumb.data as Record<string, unknown>);
  }

  return breadcrumb;
}

/** Nettoie l'événement Sentry avant son expédition : aucun PII, aucune donnée de santé. */
export function sanitizeSentryEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  // 1. Identifiant utilisateur : uniquement l'ID technique anonyme, jamais d'email ni de nom
  if (event.user) {
    event.user = {
      id: event.user.id,
    };
  }

  // 2. Nettoyer les données supplémentaires (extra)
  if (event.extra) {
    event.extra = sanitizeContext(event.extra as Record<string, unknown>);
  }

  // 3. Nettoyer les contextes
  if (event.contexts) {
    for (const [ctxKey, ctxVal] of Object.entries(event.contexts)) {
      if (isSensitiveKeyOrValue(ctxKey)) {
        delete event.contexts[ctxKey];
      } else if (ctxVal && typeof ctxVal === 'object') {
        event.contexts[ctxKey] = sanitizeContext(ctxVal as Record<string, unknown>);
      }
    }
  }

  // 4. Nettoyer les tags
  if (event.tags) {
    for (const [tagKey, tagVal] of Object.entries(event.tags)) {
      if (isSensitiveKeyOrValue(tagKey) || (typeof tagVal === 'string' && isSensitiveKeyOrValue(tagVal))) {
        delete event.tags[tagKey];
      }
    }
  }

  // 5. Nettoyer les breadcrumbs
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs
      .map(sanitizeBreadcrumb)
      .filter((b): b is Sentry.Breadcrumb => b !== null);
  }

  // 6. Nettoyer la requête (suppression des en-têtes et corps)
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    if (event.request.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['apikey'];
    }
  }

  return event;
}

/** Initialise Sentry si un DSN valide est renseigné dans l'environnement. */
export function initMonitoring(): void {
  if (!SENTRY_DSN) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.info('[Monitoring] EXPO_PUBLIC_SENTRY_DSN absent — Sentry est inactif.');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    debug: false,
    sendDefaultPii: false,
    enableAutoSessionTracking: true,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      return sanitizeSentryEvent(event);
    },
    beforeBreadcrumb(breadcrumb) {
      return sanitizeBreadcrumb(breadcrumb);
    },
  });
}

/** Capture une exception technique en garantissant le nettoyage de ses métadonnées. */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!SENTRY_DSN) return;
  const safeContext = context ? sanitizeContext(context) : undefined;
  Sentry.captureException(error, safeContext ? { extra: safeContext } : undefined);
}

/** Associe l'ID utilisateur technique pour corréler les sessions, sans aucune donnée personnelle. */
export function setMonitoringUser(userId: string | null): void {
  if (!SENTRY_DSN) return;
  if (!userId) {
    Sentry.setUser(null);
  } else {
    Sentry.setUser({ id: userId });
  }
}

/** Enveloppe le composant racine avec le capteur d'erreurs de Sentry. */
export function wrapWithMonitoring<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return Sentry.wrap(Component as any) as unknown as React.ComponentType<P>;
}
