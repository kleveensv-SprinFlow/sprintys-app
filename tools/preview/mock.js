// Faux Supabase pour les captures d'écran : aucun réseau, aucune vraie donnée. Tout ce qui suit est inventé.
// Les filtres PostgREST ne sont pas appliqués (sauf ceux listés plus bas) : chaque table renvoie toutes ses lignes factices.
const SUPABASE_HOST = 'mock.supabase.test';
const USER_ID = '11111111-1111-4111-8111-111111111111';

const day = (offset, h = 18, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const dateOnly = (offset) => day(offset).slice(0, 10);

const block = (name, type) => ({ id: name, name, type, exercises: [] });

function buildData(opts = {}) {
  const minor = !!opts.minor;
  const profile = {
    id: USER_ID,
    full_name: 'Alex Martin',
    first_name: 'Alex',
    last_name: 'Martin',
    role: 'athlete',
    gender: 'male',
    date_of_birth: minor ? dateOnly(-16 * 365) : '1998-05-12',
    height: 180,
    weight: 79.8,
    target_weight: opts.noTarget ? null : 78,
    manual_kcal_goal: 2662,
    disciplines: ['100m', '200m'],
    objective: 'Améliorer mes performances',
    avatar_url: null,
  };

  const workouts = [
    [-3, 'Séance Musculation', 'completed'],
    [-2, 'Piste', 'completed'],
    [-1, 'Jour de repos', 'pending'],
    [0, 'Piste', 'pending'],
    [1, 'Côte', 'pending'],
    [2, 'Séance Musculation', 'pending'],
    [3, 'Jour de repos', 'pending'],
    [4, 'Escalier', 'pending'],
  ].map(([offset, type, status], i) => ({
    id: 100 + i,
    athlete_id: USER_ID,
    coach_id: null,
    date_prevue: day(offset),
    type_seance: type,
    status,
    intensity: 7,
    description: type === 'Jour de repos' ? 'Récupération, hydratation, sommeil' : '',
    blocks: type === 'Jour de repos' ? [] : [block('Échauffement', 'warmup'), block('Corps de séance', 'main'), block('Retour au calme', 'cooldown')],
    exercises: [],
    measures: {},
    source: 'coach',
  }));

  const stale = !!opts.staleWeight;
  const metrics = [
    { id: 'm1', athlete_id: USER_ID, weight: 79.6, body_fat: 14.2, muscle_mass_kg: 36.1, created_at: day(stale ? -42 : -31, 8) },
    { id: 'm2', athlete_id: USER_ID, weight: 79.2, body_fat: 14.0, created_at: day(stale ? -30 : -15, 8) },
    { id: 'm3', athlete_id: USER_ID, weight: 79.8, body_fat: 14.1, created_at: day(stale ? -12 : -1, 8) },
  ];

  const meals = [
    { id: 'l1', user_id: USER_ID, meal_type: 'breakfast', custom_food_name: 'Porridge', quantity_g: 250, calories: 420, proteines: 14, glucides: 70, lipides: 8, consumed_at: day(0, 8) },
    { id: 'l2', user_id: USER_ID, meal_type: 'lunch', custom_food_name: 'Poulet riz', quantity_g: 400, calories: 533, proteines: 42, glucides: 60, lipides: 10, consumed_at: day(0, 12) },
  ];

  const consents = ['terms', 'health_profile', 'coach_sharing', 'ai_processing'].map((t) => ({ consent_type: t, version: '2026-10-18' }));

  return { profile, workouts, metrics, meals, consents, minor };
}

// Unsigned token built at runtime (readable by supabase-js, valid for nobody): no token-looking literal in the repo
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const FAKE_JWT = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: USER_ID, role: 'authenticated', exp: 4102444800 })}.preview`;

const SESSION = {
  access_token: FAKE_JWT,
  refresh_token: 'mock-refresh',
  token_type: 'bearer',
  expires_in: 999999,
  expires_at: 4102444800,
  user: {
    id: USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'alex@example.test',
    email_confirmed_at: '2026-01-01T00:00:00Z',
    app_metadata: { provider: 'email' },
    user_metadata: { role: 'athlete', first_name: 'Alex', last_name: 'Martin', full_name: 'Alex Martin' },
    created_at: '2026-01-01T00:00:00Z',
  },
};

/** Installs the routes on a Playwright context. `seen` collects the requests the app made. */
async function install(context, data, seen) {
  await context.route(`https://${SUPABASE_HOST}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname;
    const wantsObject = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'content-range': '0-0/*' }, body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });

    seen.add(`${req.method()} ${p}`);

    if (p.startsWith('/auth/v1/user')) return json(SESSION.user);
    if (p.startsWith('/auth/v1')) return json(SESSION);
    if (p.startsWith('/functions/v1')) return json({});

    if (p.startsWith('/rest/v1/rpc/')) {
      const fn = p.split('/').pop();
      const ALL = ['profil', 'poids', 'forme', 'nutrition', 'seances', 'resultats', 'records', 'objectifs', 'notes'];
      if (fn === 'ai_access_allowed_scopes') return json(data.minor ? ['profil', 'seances', 'resultats', 'records', 'objectifs', 'notes'] : ALL);
      if (fn === 'list_ai_access_keys')
        return json([
          { id: 'k1', label: 'ChatGPT', key_prefix: 'spk_7e139d', scopes: ['seances', 'resultats', 'records', 'notes'], created_at: day(-2), expires_at: day(6), revoked_at: null, last_used_at: day(0, 9), use_count: 12 },
          { id: 'k2', label: 'Claude', key_prefix: 'spk_a41c90', scopes: ['seances', 'objectifs'], created_at: day(-10), expires_at: null, revoked_at: null, last_used_at: null, use_count: 0 },
        ]);
      if (fn === 'list_ai_access_log')
        return json([
          { used_at: day(0, 9, 12), key_label: 'ChatGPT', scopes: ['seances', 'resultats', 'notes'] },
          { used_at: day(-1, 21, 40), key_label: 'ChatGPT', scopes: ['seances', 'resultats', 'records'] },
          { used_at: day(-2, 8, 5), key_label: 'ChatGPT', scopes: ['seances'] },
        ]);
      if (fn === 'get_athlete_performance' || fn === 'athlete_performance') return json({ records: [{ label: 'Épaule puissance', value: 110, unit: 'kg', date: dateOnly(-1) }], recent_prs: [{ label: 'Épaule puissance', value: 110, unit: 'kg', date: dateOnly(-1) }] });
      return json(null);
    }

    const table = p.replace('/rest/v1/', '');
    const rows = {
      profiles: [data.profile],
      workouts: data.workouts,
      body_metrics: data.metrics,
      meal_logs: data.meals,
      user_consents: data.consents,
      ai_notes: [
        { id: 'n1', categorie: 'demande', texte: 'Rappelle-moi de travailler les départs le mardi.', source: 'ChatGPT', created_at: day(-1, 21) },
        { id: 'n2', categorie: 'habitude', texte: 'S’entraîne surtout le soir, après 18 h.', source: 'ChatGPT', created_at: day(-2, 9) },
        { id: 'n3', categorie: 'info', texte: 'La piste est fermée le jeudi.', source: 'Claude', created_at: day(-5, 12) },
      ],
      check_ins: [],
      team_members: [],
      competitions: [],
    }[table];

    // The few filters the dashboard relies on (the fake server ignores the others)
    if (table === 'workouts' && (url.searchParams.get('type_seance') || '').includes('comp')) return json([]);

    if (rows === undefined) return wantsObject ? json({ message: 'no rows' }, 406) : json([]);
    if (req.method() !== 'GET') return json(rows[0] ?? {}, 201);
    return wantsObject ? (rows.length ? json(rows[0]) : json({ message: 'no rows' }, 406)) : json(rows);
  });
}

module.exports = { install, SESSION, USER_ID, SUPABASE_HOST, buildData };
