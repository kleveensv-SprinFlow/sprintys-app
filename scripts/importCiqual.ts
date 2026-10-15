import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase URL or Key in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function parseNumber(val: any): number {
  if (val === undefined || val === null || val === '-' || val === 'traces') return 0;
  if (typeof val === 'number') return val;
  let clean = String(val).replace(/</g, '').replace(/>/g, '').trim();
  clean = clean.replace(/,/g, '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function deriveEtat(nom: string): string | null {
  const n = nom.toLowerCase();
  if (n.includes('cru')) return 'cru';
  if (n.includes('cuit')) return 'cuit';
  if (n.includes('bouilli')) return 'bouilli';
  if (n.includes('au plat')) return 'au plat';
  if (n.includes('brouillé')) return 'brouillé';
  if (n.includes('rôti')) return 'rôti';
  if (n.includes('frit')) return 'frit';
  return null;
}

function deriveSynonymes(nom: string): string | null {
  const syns: string[] = [];
  const n = nom.toLowerCase();
  if (n.includes('œuf') || n.includes('oeuf')) syns.push('oeuf', 'egg');
  if (n.includes('bœuf') || n.includes('boeuf')) syns.push('boeuf', 'beef');
  if (n.includes('pâtes')) syns.push('pates', 'pasta');
  return syns.length > 0 ? syns.join(', ') : null;
}

/** Lecture CSV (séparateur , ou ;) sans bibliothèque Excel. */
function parseCsv(text: string): Record<string, string>[] {
  const src = text.replace(/^\uFEFF/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const sep = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === sep) {
      row.push(cell);
      cell = '';
    } else if (c === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (c !== '\r') {
      cell += c;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const headers = rows.shift();
  if (!headers) return [];
  return rows
    .filter((r) => r.some((value) => value.trim().length > 0))
    .map((r) => {
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        obj[header] = r[index] ?? '';
      });
      return obj;
    });
}

async function run() {
  const csvFilePath = path.join(process.cwd(), 'ciqual.csv');

  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ Fichier introuvable : ${csvFilePath}`);
    console.error('Enregistre le tableau CIQUAL en CSV (ciqual.csv) à la racine du projet.');
    process.exit(1);
  }

  console.log('🚀 Lecture du fichier CIQUAL (CSV)...');

  const records = parseCsv(fs.readFileSync(csvFilePath, 'utf8'));

  console.log(`✅ ${records.length} lignes trouvées. Préparation de l'import...`);

  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    const payload = batch.map((r) => {
      const normRow: Record<string, string> = {};
      for (const k of Object.keys(r)) {
        const cleanKey = k.replace(/[\r\n]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
        normRow[cleanKey] = r[k];
      }

      const findVal = (keywords: string[]) => {
        const key = Object.keys(normRow).find((candidate) => keywords.every((kw) => candidate.includes(kw.toLowerCase())));
        return key ? normRow[key] : null;
      };

      const nom = findVal(['alim_nom_fr']) || findVal(['nom français']) || '';
      const code = findVal(['alim_code']) || findVal(['code']) || '';

      return {
        code_ciqual: String(code),
        nom: nom,
        etat: deriveEtat(nom),
        synonymes: deriveSynonymes(nom),
        energie_kcal: parseNumber(findVal(['energie', 'kcal'])),
        proteines: parseNumber(findVal(['protéines', 'jones', 'g'])),
        glucides: parseNumber(findVal(['glucides', 'g'])),
        lipides: parseNumber(findVal(['lipides', 'g'])),
        fibres: parseNumber(findVal(['fibres', 'g'])),
        eau: parseNumber(findVal(['eau', 'g'])),
        vitamine_c: parseNumber(findVal(['vitamine c'])),
        fer: parseNumber(findVal(['fer', 'mg'])),
        calcium: parseNumber(findVal(['calcium', 'mg'])),
        sodium: parseNumber(findVal(['sodium', 'mg'])),
      };
    }).filter((item) => item.nom && item.code_ciqual);

    if (payload.length === 0) continue;

    const { error } = await supabase
      .from('ciqual_foods')
      .upsert(payload, { onConflict: 'code_ciqual' });

    if (error) {
      console.error(`❌ Erreur batch ${i} - ${i + batchSize}:`, error.message);
    } else {
      process.stdout.write(`\r✅ Importés : ${Math.min(i + payload.length, records.length)} / ${records.length}`);
    }
  }
  console.log('\n🎉 Import CIQUAL terminé avec succès !');
}

run();
