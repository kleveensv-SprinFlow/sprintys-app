import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
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

async function run() {
  const excelFilePath = path.join(process.cwd(), 'ciqual.xlsx');
  
  if (!fs.existsSync(excelFilePath)) {
    console.error(`❌ Fichier introuvable : ${excelFilePath}`);
    process.exit(1);
  }

  console.log('🚀 Lecture du fichier CIQUAL (Excel)... cela peut prendre quelques secondes.');
  
  const workbook = xlsx.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0]; // On prend le premier onglet
  const worksheet = workbook.Sheets[sheetName];
  
  const records = xlsx.utils.sheet_to_json(worksheet);

  console.log(`✅ ${records.length} lignes trouvées. Préparation de l'import...`);

  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    const payload = batch.map((r: any) => {
      const nom = r['alim_nom_fr'] || r['alim_nom'] || r['Nom français'] || '';
      const code = r['alim_code'] || r['Code'] || '';
      
      return {
        code_ciqual: String(code),
        nom: nom,
        etat: deriveEtat(nom),
        synonymes: deriveSynonymes(nom),
        energie_kcal: parseNumber(r['Energie, Règlement UE N° 1169/2011 (kcal/100 g)'] || r['Energie (kcal/100g)']),
        proteines: parseNumber(r['Protéines, N x facteur de Jones (g/100 g)'] || r['Protéines (g/100g)']),
        glucides: parseNumber(r['Glucides (g/100 g)'] || r['Glucides (g/100g)']),
        lipides: parseNumber(r['Lipides (g/100 g)'] || r['Lipides (g/100g)']),
        fibres: parseNumber(r['Fibres alimentaires (g/100 g)'] || r['Fibres (g/100g)']),
        eau: parseNumber(r['Eau (g/100 g)']),
        vitamine_c: parseNumber(r['Vitamine C (mg/100 g)']),
        fer: parseNumber(r['Fer (mg/100 g)']),
        calcium: parseNumber(r['Calcium (mg/100 g)']),
        sodium: parseNumber(r['Sodium (mg/100 g)']),
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
