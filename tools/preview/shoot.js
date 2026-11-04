// Capture d'écran d'un écran de l'app (version web, données fictives, format téléphone).
//
// Usage :  node tools/preview/shoot.js <scénario> <route> <sortie.png> [hauteur] [--click "texte"]… [--wait ms]
//   scénario : default | minor | stale | loggedout   (voir mock.js)
//   route    : /  /calendar  /nutrition  /ai-access  /ai-access/new …   (les groupes d'expo-router ne figurent pas dans l'URL)
//   hauteur  : 844 par défaut ; plus grand pour voir toute la page (le défilement est interne à l'écran)
//   --click  : touche l'élément portant ce texte avant la capture (peut être répété, dans l'ordre)
// Prérequis : node tools/preview/build.js (une fois, ou après chaque changement de code).
const fs = require('fs');
const http = require('http');
const path = require('path');
const { install, SESSION, USER_ID, buildData } = require('./mock');

const root = path.resolve(__dirname, '..', '..');
const dist = path.join(root, '.preview', 'web-dist');

function loadPlaywright() {
  for (const p of ['playwright', '/opt/node-tools/node_modules/playwright']) {
    try {
      return require(p);
    } catch {
      /* next */
    }
  }
  throw new Error('Playwright introuvable (npm i -D playwright, ou utiliser la machine cloud qui l’a déjà).');
}

const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.ico': 'image/x-icon' };

/** Static server with single-page fallback (expo-router web output). Returns the server and its port. */
function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let file = path.join(dist, decodeURIComponent(req.url.split('?')[0]));
      if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, 'index.html');
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, () => resolve({ server, port: server.address().port }));
  });
}

const SCENARIOS = { default: {}, minor: { minor: true }, stale: { staleWeight: true }, loggedout: { noSession: true } };

(async () => {
  const args = process.argv.slice(2);
  const clicks = [];
  let wait = 6000;
  const pos = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--click') clicks.push(args[++i]);
    else if (args[i] === '--wait') wait = Number(args[++i]);
    else pos.push(args[i]);
  }
  const [scenario = 'default', route = '/', out = 'capture.png', height = '844'] = pos;

  if (!fs.existsSync(path.join(dist, 'index.html'))) {
    console.error('Version web absente : lance d’abord  node tools/preview/build.js');
    process.exit(2);
  }
  if (!SCENARIOS[scenario]) {
    console.error(`Scénario inconnu « ${scenario} » (${Object.keys(SCENARIOS).join(', ')})`);
    process.exit(2);
  }

  const { chromium } = loadPlaywright();
  const { server, port } = await serve();
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: Number(height) },
      deviceScaleFactor: 2,
      locale: 'fr-FR',
      timezoneId: 'Europe/Paris',
      isMobile: true,
      hasTouch: true,
    });
    const seen = new Set();
    await install(context, buildData(SCENARIOS[scenario]), seen);
    await context.addInitScript(
      ({ session, uid, noSession }) => {
        if (!noSession) localStorage.setItem('sb-mock-auth-token', JSON.stringify(session));
        // Visite guidée déjà vue
        for (let v = 1; v <= 9; v++) localStorage.setItem(`@sprintys_tour_seen_v${v}:${uid}`, String(Date.now()));
      },
      { session: SESSION, uid: USER_ID, noSession: !!SCENARIOS[scenario].noSession },
    );

    const page = await context.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
    page.on('pageerror', (e) => errors.push('PAGEERROR ' + String(e).slice(0, 200)));

    await page.goto(`http://localhost:${port}${route}`, { waitUntil: 'load' });
    await page.waitForTimeout(wait);
    for (const text of clicks) {
      await page.getByText(text, { exact: false }).first().click({ timeout: 8000 });
      await page.waitForTimeout(1200);
    }
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    await page.screenshot({ path: out });
    console.log('capture :', out);
    console.log('requêtes :', [...seen].sort().join(' | '));
    if (errors.length) console.log('erreurs :', errors.slice(0, 6).join('\n  '));
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error('ÉCHEC', e.message || e);
  process.exit(1);
});
