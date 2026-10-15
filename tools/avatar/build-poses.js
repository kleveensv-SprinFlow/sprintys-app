/**
 * Convertit les 6 SVG du personnage de Sprinty (assets/sprinty/source) en arbres de données pour react-native-svg
 * (src/features/sprinty/avatar/poses.generated.ts). Les pièces qui bougent sont regroupées par rôle :
 *   back (poils d'oreille) · earR / earL · face (tête, ombres, taches) · cap · nose · eyeR / eyeL · ball (pupilles) · fx (éclairs, « ? », « zzz »)
 * Usage : node tools/avatar/build-poses.js
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', '..', 'assets', 'sprinty', 'source');
const OUT = path.join(__dirname, '..', '..', 'src', 'features', 'sprinty', 'avatar', 'poses.generated.ts');
const PIVOTS = JSON.parse(fs.readFileSync(path.join(__dirname, 'pivots.json'), 'utf8'));
const FILES = { neutral: '1_neutral', success: '2_success', perplexed: '3_perplexed', caution: '4_caution', frustrated: '5_frustated', sleep: '6_sleep' };

// --- Mini analyseur XML (SVG simple : pas de CDATA, pas d'entités) -----------------------------------------
function parse(xml) {
  const root = { t: 'root', a: {}, c: [] };
  const stack = [root];
  const re = /<(\/?)([A-Za-z][\w:-]*)((?:\s+[\w:-]+\s*=\s*"[^"]*")*)\s*(\/?)>/g;
  let m;
  while ((m = re.exec(xml))) {
    const [, close, tag, rawAttrs, self] = m;
    if (close) {
      stack.pop();
      continue;
    }
    const a = {};
    for (const x of rawAttrs.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) a[x[1]] = x[2];
    const node = { t: tag, a, c: [] };
    stack[stack.length - 1].c.push(node);
    if (!self) stack.push(node);
  }
  return root.c[0];
}

// --- Attributs -> props react-native-svg -------------------------------------------------------------------
const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
function matrixOf(str) {
  // « matrix(a b c d e f) » ou « translate(..) rotate(..) scale(..) » -> [a,b,c,d,e,f]
  let M = [1, 0, 0, 1, 0, 0];
  const mul = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
  for (const m of str.matchAll(/(matrix|translate|rotate|scale)\(([^)]*)\)/g)) {
    const n = m[2].trim().split(/[\s,]+/).map(Number);
    let T = [1, 0, 0, 1, 0, 0];
    if (m[1] === 'matrix') T = n;
    if (m[1] === 'translate') T = [1, 0, 0, 1, n[0], n[1] ?? 0];
    if (m[1] === 'scale') T = [n[0], 0, 0, n[1] ?? n[0], 0, 0];
    if (m[1] === 'rotate') {
      const r = (n[0] * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
      T = [c, s, -s, c, 0, 0];
    }
    M = mul(M, T);
  }
  return M.map((v) => +v.toFixed(6));
}

function convert(node, k, ids) {
  const out = { t: node.t };
  const a = {};
  for (const [key, val] of Object.entries(node.a)) {
    if (['xmlns', 'width', 'height', 'viewBox', 'maskUnits'].includes(key) && node.t !== 'mask') continue;
    if (key === 'id') {
      out.i = val;
      if (['mask', 'radialGradient', 'linearGradient', 'clipPath'].includes(node.t)) a.id = ids.get(val);
      continue;
    }
    if (key === 'style') {
      const mt = val.match(/mask-type:\s*(\w+)/);
      if (mt) a.maskType = mt[1];
      continue;
    }
    if (key === 'transform' || key === 'gradientTransform') {
      a[key] = matrixOf(val);
      continue;
    }
    const ref = val.match(/^url\(#([^)]+)\)$/);
    a[camel(key)] = ref ? `url(#${ids.get(ref[1])})` : val;
  }
  if (Object.keys(a).length) out.a = a;
  const kids = node.c.map((c) => convert(c, k, ids));
  if (kids.length) out.c = kids;
  return out;
}

// --- Rôles de mouvement ------------------------------------------------------------------------------------
function roleOf(id = '') {
  if (id === 'ear_R') return 'earR';
  if (id === 'ear_L') return 'earL';
  if (/^ear_hair/.test(id)) return 'back';
  if (/^(cap|Vector 11|shade_inner)/.test(id)) return 'cap';
  if (id === 'nose_and_mouth') return 'nose';
  if (id === 'eye_R') return 'eyeR';
  if (id === 'eye_L') return 'eyeL';
  return 'face';
}

function wrapBalls(node) {
  if (!node.c) return node;
  node.c = node.c.map((c) => {
    if (/^eye_ball/.test(c.i || '') ) return { t: 'g', r: 'ball', c: [c] };
    return wrapBalls(c);
  });
  return node;
}

function rig(top, k) {
  const out = { t: 'g', c: [] };
  const piv = PIVOTS[k];
  for (const child of top.c || []) {
    if (child.i !== 'leo') {
      out.c.push({ t: 'g', r: 'fx', c: [child] });
      continue;
    }
    const leo = { t: 'g', r: 'leo', c: [] };
    let run = null;
    for (const c of child.c) {
      const role = roleOf(c.i);
      const single = ['earR', 'earL', 'eyeR', 'eyeL'].includes(role);
      if (!single && run && run.r === role) {
        run.c.push(c);
        continue;
      }
      run = { t: 'g', r: role, c: [single ? wrapBalls(c) : c] };
      if (role === 'earR') run.o = piv.earR;
      if (role === 'earL') run.o = piv.earL;
      if (role === 'eyeR') run.o = piv.eyeR;
      if (role === 'eyeL') run.o = piv.eyeL;
      leo.c.push(run);
      if (single) run = null;
    }
    out.c.push(leo);
  }
  return out;
}

const poses = {};
for (const [k, file] of Object.entries(FILES)) {
  const svg = parse(fs.readFileSync(path.join(SRC, `${file}.svg`), 'utf8'));
  // retire le fond sombre de l'export (rect 1024 x 1024)
  svg.c = svg.c.filter((n) => !(n.t === 'rect' && n.a.width === '1024' && n.a.height === '1024'));
  const idList = [];
  (function collect(n) {
    if (n.a && n.a.id) idList.push(n.a.id);
    (n.c || []).forEach(collect);
  })(svg);
  const ids = new Map(idList.map((id) => [id, `${k}_${id.replace(/[^\w-]/g, '_')}`]));
  const state = convert(svg.c.find((n) => n.t === 'g'), k, ids);
  poses[k] = rig(state, k);
  // dégradés (joues roses…) : déclarés en fin de fichier dans <defs>
  poses[k].c.unshift(...svg.c.filter((n) => n.t === 'defs').map((n) => convert(n, k, ids)));
}

const header = `/* Fichier généré par tools/avatar/build-poses.js : ne pas modifier à la main. */\nexport type PoseNode = { t: string; i?: string; r?: string; o?: [number, number]; a?: Record<string, unknown>; c?: PoseNode[] };\nexport type MoodKey = 'neutral' | 'success' | 'perplexed' | 'caution' | 'frustrated' | 'sleep';\n`;
fs.writeFileSync(OUT, `${header}export const POSES: Record<MoodKey, PoseNode> = ${JSON.stringify(poses)};\n`);
console.log('écrit', OUT, (fs.statSync(OUT).size / 1024).toFixed(0), 'Ko');
