// Compile la version web de l'app pour les captures d'écran.
// Aucune vraie clé : l'app est compilée avec une adresse Supabase factice, que shoot.js simule.
// Usage : node tools/preview/build.js        (≈ 2 min, sortie dans .preview/web-dist, ignoré par git)
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const out = path.join(root, '.preview', 'web-dist');

const r = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', out], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, EXPO_PUBLIC_SUPABASE_URL: 'https://mock.supabase.test', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'mock-anon-key', CI: '1' },
});
if (r.status !== 0) process.exit(r.status || 1);
console.log('\nOK :', out);
