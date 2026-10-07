import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''; // Preferably use SERVICE_ROLE_KEY if you have it

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase URL or Key in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Parse numbers cleanly from french CSV format (e.g. "1,5" or "< 0.1")
function parseNumber(val: string): number {
  if (!val || val === '-' || val === 'traces') return 0;
  let clean = val.replace(/</g, '').replace(/>/g, '').trim();
  clean = clean.replace(/,/g, '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

// Derive state from name
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

// Derive synonymes for specific keywords
function deriveSynonymes(nom: string): string | null {
  const syns: string[] = [];
  const n = nom.toLowerCase();
  if (n.includes('œuf') || n.includes('oeuf')) syns.push('oeuf', 'egg');
  if (n.includes('bœuf') || n.includes('boeuf')) syns.push('boeuf', 'beef');
  if (n.includes('pâtes')) syns.push('pates', 'pasta');
  return syns.length > 0 ? syns.join(', ') : null;
}

async function run() {
  const csvFilePath = path.join(process.cwd(), 'ciqual.csv');
  
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ Fichier introuvable : ${csvFilePath}`);
    console.error('Veuillez télécharger la base CIQUAL au format CSV et la placer à la racine sous le nom "ciqual.csv".');
    process.exit(1);
  }

  console.log('🚀 Lecture du fichier CIQUAL...');
  const fileContent = fs.readFileSync(csvFilePath, 'utf8');

  // Ajustez le délimiteur selon le fichier CSV de l'Anses (souvent ';' en France)
  parse(fileContent, {
    delimiter: ';',
    columns: true,
    skip_empty_lines: true,
  }, async (err, records) => {
    if (err) {
      console.error('❌ Erreur de parsing CSV :', err);
      process.exit(1);
    }

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
          // Remplacer les noms de colonnes exacts par ceux du CSV CIQUAL Anses
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
        process.stdout.write(`\r✅ Importés : ${i + payload.length} / ${records.length}`);
      }
    }
    console.log('\n🎉 Import CIQUAL terminé avec succès !');
  });
}

run();
