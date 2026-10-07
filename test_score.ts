import { supabase } from './src/services/supabase';

async function testScore(q: string) {
  const { data } = await supabase
    .from('ciqual_foods')
    .select('*')
    .ilike('search_text', `%${q}%`)
    .limit(100);
    
  if (!data) return;

  const scoredData = data.map(item => {
    let score = 0;
    const nameLower = item.nom.toLowerCase();
    
    if (nameLower === q || nameLower.startsWith(q + ',') || nameLower.startsWith(q + ' ') || nameLower.startsWith(q + '-')) {
      score += 1000;
    } else if (nameLower.startsWith(q)) {
      score += 500;
    } else if (new RegExp(`\\b${q}\\b`).test(nameLower)) {
      score += 200;
    }

    if (q === 'pomme' && nameLower.includes('pomme de terre')) {
      score -= 800;
    }

    score -= nameLower.length; // length penalty

    return { name: item.nom, score };
  });

  scoredData.sort((a, b) => b.score - a.score);
  console.log(`\n=== Results for '${q}' ===`);
  console.log(scoredData.slice(0, 5));
}

async function runAll() {
  await testScore('pomme');
  await testScore('oeuf');
  await testScore('ananas');
}

runAll();
