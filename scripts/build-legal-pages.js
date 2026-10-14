/**
 * Builds the public legal pages (docs/*.html, served by GitHub Pages) from the single source
 * src/legal/documents.ts, so the app and the website always show the same texts.
 *
 * Usage: node scripts/build-legal-pages.js
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const legalDir = path.join(root, 'src', 'legal');
const outDir = path.join(root, 'docs');

// Load the TS modules (plain data) without a bundler
const cache = {};
function load(file) {
  const full = path.join(legalDir, file + '.ts');
  if (cache[full]) return cache[full].exports;
  const src = fs.readFileSync(full, 'utf8');
  const { outputText } = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } });
  const mod = { exports: {} };
  cache[full] = mod;
  const req = (p) => (p.startsWith('./') ? load(p.slice(2)) : require(p));
  new Function('require', 'module', 'exports', outputText)(req, mod, mod.exports);
  return mod.exports;
}

const { PRIVACY_POLICY, TERMS_OF_SERVICE, LEGAL_NOTICE } = load('documents');
const { PUBLISHER } = load('publisher');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const PAGES = [
  { file: 'cgu.html', doc: TERMS_OF_SERVICE },
  { file: 'confidentialite.html', doc: PRIVACY_POLICY },
  { file: 'mentions-legales.html', doc: LEGAL_NOTICE },
];

const nav = (current) =>
  [
    ['index.html', 'Accueil'],
    ['cgu.html', 'Conditions'],
    ['confidentialite.html', 'Confidentialité'],
    ['mentions-legales.html', 'Mentions légales'],
    ['suppression-compte.html', 'Supprimer mon compte'],
    ['support.html', 'Assistance'],
  ]
    .map(([href, label]) => `<a href="${href}"${href === current ? ' aria-current="page"' : ''}>${label}</a>`)
    .join('');

const page = (file, title, body) => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · Sprintys</title>
<meta name="description" content="${esc(title)} de l'application Sprintys.">
<style>
  :root { --bg:#EDF1F7; --card:rgba(255,255,255,.82); --text:#0F172A; --muted:#64748B; --blue:#0069E8; --line:rgba(15,23,42,.08); }
  * { box-sizing: border-box; }
  body { margin:0; font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color:var(--text);
    background: radial-gradient(60rem 40rem at 10% -10%, rgba(0,105,232,.16), transparent 60%),
                radial-gradient(50rem 40rem at 110% 10%, rgba(0,220,253,.16), transparent 60%), var(--bg); min-height:100vh; }
  header { max-width:760px; margin:0 auto; padding:28px 16px 8px; display:flex; align-items:center; gap:12px; }
  .logo { width:40px; height:40px; border-radius:12px; background:linear-gradient(135deg,#0023AB,#0069E8 55%,#00DCFD); color:#fff;
    display:grid; place-items:center; font-weight:900; font-size:22px; font-style:italic; }
  header b { font-size:20px; letter-spacing:-.3px; }
  nav { max-width:760px; margin:0 auto; padding:8px 16px 0; display:flex; flex-wrap:wrap; gap:8px; }
  nav a { color:var(--muted); text-decoration:none; font-size:14px; font-weight:600; padding:6px 12px; border-radius:999px; background:rgba(15,23,42,.05); }
  nav a[aria-current] { color:#fff; background:var(--blue); }
  main { max-width:760px; margin:16px auto 48px; padding:0 16px; }
  .card { background:var(--card); border:1px solid rgba(255,255,255,.9); border-radius:22px; padding:24px 22px; box-shadow:0 8px 24px rgba(30,58,138,.06); }
  h1 { font-size:30px; letter-spacing:-.8px; margin:0 0 6px; }
  .intro { color:var(--muted); margin:0 0 8px; }
  h2 { font-size:18px; letter-spacing:-.2px; margin:26px 0 8px; padding-top:18px; border-top:1px solid var(--line); }
  p { margin:0 0 10px; }
  .todo { background:#FEF3C7; border-radius:8px; padding:0 4px; }
  footer { max-width:760px; margin:0 auto 32px; padding:0 16px; color:var(--muted); font-size:13px; }
  a { color:var(--blue); }
</style>
</head>
<body>
<header><div class="logo">S</div><b>Sprintys</b></header>
<nav>${nav(file)}</nav>
<main><div class="card">${body}</div></main>
<footer>© Sprintys · <a href="mailto:${esc(PUBLISHER.contactEmail)}">${esc(PUBLISHER.contactEmail)}</a></footer>
</body>
</html>
`;

const highlight = (s) => esc(s).replace(/(À COMPLÉTER[^,.]*)/g, '<span class="todo">$1</span>');

const docBody = (doc) =>
  `<h1>${esc(doc.title)}</h1><p class="intro">${highlight(doc.intro)}</p>` +
  doc.sections
    .map((s) => `<h2>${esc(s.title)}</h2>` + s.paragraphs.map((p) => `<p>${highlight(p)}</p>`).join(''))
    .join('');

fs.mkdirSync(outDir, { recursive: true });

for (const { file, doc } of PAGES) {
  fs.writeFileSync(path.join(outDir, file), page(file, doc.title, docBody(doc)));
}

fs.writeFileSync(
  path.join(outDir, 'suppression-compte.html'),
  page(
    'suppression-compte.html',
    'Supprimer ton compte',
    `<h1>Supprimer ton compte Sprintys</h1>
<p class="intro">Tu peux supprimer ton compte et tes données à tout moment, directement dans l’application.</p>
<h2>Depuis l’application</h2>
<p>Athlète : Accueil › ta photo en haut à droite › <b>Supprimer mon compte</b>.</p>
<p>Coach : Accueil › ta photo en haut › <b>Supprimer mon compte</b>.</p>
<p>La suppression est immédiate et définitive.</p>
<h2>Ce qui est supprimé</h2>
<p>Ton profil, tes séances et performances, repas, mesures de poids et de composition, check-ins, douleurs, photos de profil, accords et compteurs d’utilisation de l’IA.</p>
<h2>Ce qui peut rester</h2>
<p>Les messages déjà envoyés dans une discussion d’équipe restent visibles par l’équipe, sans être rattachés à ton profil. Les signalements sont conservés au plus un an pour traiter les abus.</p>
<h2>Sans accès à l’application</h2>
<p>Écris-nous depuis l’adresse e-mail de ton compte à <a href="mailto:${esc(PUBLISHER.privacyEmail)}?subject=Suppression%20de%20compte">${esc(PUBLISHER.privacyEmail)}</a> avec l’objet « Suppression de compte ». Nous supprimons le compte sous 30 jours et te le confirmons.</p>`
  )
);

fs.writeFileSync(
  path.join(outDir, 'support.html'),
  page(
    'support.html',
    'Assistance',
    `<h1>Assistance Sprintys</h1>
<p class="intro">Une question, un problème ou une suggestion ? Écris-nous, nous répondons en général sous 48 heures ouvrées.</p>
<h2>Nous contacter</h2>
<p><a href="mailto:${esc(PUBLISHER.contactEmail)}?subject=Assistance%20Sprintys">${esc(PUBLISHER.contactEmail)}</a></p>
<p>Indique l’adresse e-mail de ton compte, le modèle de ton téléphone et, si possible, une capture d’écran.</p>
<h2>Questions fréquentes</h2>
<p><b>Mot de passe oublié.</b> Sur l’écran de connexion, touche « Mot de passe oublié » : un lien de réinitialisation t’est envoyé par e-mail.</p>
<p><b>Gérer ou résilier l’abonnement Plus.</b> L’abonnement est géré par ton store : sur iPhone, Réglages › ton nom › Abonnements ; sur Android, Google Play › Paiements et abonnements › Abonnements. Supprimer ton compte ne résilie pas l’abonnement.</p>
<p><b>Restaurer mes achats.</b> Dans l’application : Profil › Abonnement › Restaurer mes achats.</p>
<p><b>Signaler un contenu ou un utilisateur.</b> Dans une discussion d’équipe, appuie longuement sur le message ou ouvre le profil pour signaler ou bloquer.</p>
<p><b>Supprimer mon compte.</b> <a href="suppression-compte.html">Voir la procédure</a>.</p>`
  )
);

fs.writeFileSync(
  path.join(outDir, 'index.html'),
  page(
    'index.html',
    'Sprintys',
    `<h1>Sprintys</h1>
<p class="intro">L’application d’entraînement en athlétisme qui relie athlètes et coachs : séances, nutrition, poids, forme et assistant IA.</p>
<h2>Informations</h2>
<p><a href="cgu.html">Conditions d’utilisation</a></p>
<p><a href="confidentialite.html">Politique de confidentialité</a></p>
<p><a href="mentions-legales.html">Mentions légales</a></p>
<p><a href="suppression-compte.html">Supprimer ton compte</a></p>
<p><a href="support.html">Assistance</a></p>
<h2>Contact</h2>
<p><a href="mailto:${esc(PUBLISHER.contactEmail)}">${esc(PUBLISHER.contactEmail)}</a></p>`
  )
);

// GitHub Pages: serve files as is
fs.writeFileSync(path.join(outDir, '.nojekyll'), '');
console.log('Legal pages written to docs/');
