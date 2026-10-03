import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchParams {
  startDate: string;
  endDate: string;
  region: string;
  level?: string;
  disciplines: string[];
}

interface FoundCompetition {
  id: string;
  title: string;
  date: string;
  location: string;
  stadiumName?: string;
  googleMapsUrl: string;
  level?: string;
  disciplines: string[];
  timetableUrl?: string;
  sourceUrl?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('TAVILY_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'TAVILY_API_KEY non configurée dans les secrets Supabase' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: SearchParams = await req.json();
    const { startDate, region, level, disciplines } = body;

    const regionKeywords: Record<string, string> = {
      'Provence-Alpes-Côte d\'Azur': 'PACA Miramas Nice Marseille',
      'Auvergne-Rhône-Alpes': 'Lyon Diagana AURA',
      'Île-de-France': 'Eaubonne Paris CDFAS LIFA',
      'Nouvelle-Aquitaine': 'Bordeaux Stadium Lac Aquitaine',
      'Hauts-de-France': 'Liévin Lille Pas de Calais',
      'Occitanie': 'Montpellier Toulouse Occitanie',
      'Pays de la Loire': 'Nantes Pierre Quinon',
      'Grand Est': 'Reims Metz Strasbourg',
      'Bretagne': 'Rennes Brest Bretagne',
      'Normandie': 'Rouen Caen Normandie',
    };

    const regionQuery = regionKeywords[region] || (region && region !== 'Toute la France' ? region : 'France');
    const year = startDate ? startDate.split('-')[0] : '2026';
    const query = `meeting competition athletisme salle ${regionQuery} ${year}`;

    const tavilyRes = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'advanced',
        max_results: 6,
      }),
    });

    if (!tavilyRes.ok) {
      const errText = await tavilyRes.text();
      return new Response(
        JSON.stringify({ error: `Erreur API Tavily: ${errText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tavilyData = await tavilyRes.json();
    const validResults = (tavilyData.results || []).filter((r: any) => {
      const t = (r.title || '').toLowerCase();
      const c = (r.content || '').toLowerCase();
      return (
        t.includes('meeting') ||
        t.includes('athlet') ||
        t.includes('indoor') ||
        c.includes('meeting') ||
        c.includes('athletisme')
      );
    });

    const competitions: FoundCompetition[] = validResults.slice(0, 5).map((r: any, idx: number) => {
      const rawTitle = r.title || 'Meeting d\'Athlétisme';
      const cleanTitle = rawTitle
        .replace(/\s*-\s*(TrackAthletes|World Athletics|FFA|Facebook|YouTube).*/i, '')
        .replace(/\|\s*.*/i, '')
        .trim();

      let stadium = 'Stadium Régional';
      const textContent = `${r.title} ${r.content}`.toLowerCase();
      if (textContent.includes('miramas')) stadium = 'Stadium Miramas Métropole';
      else if (textContent.includes('diagana')) stadium = 'Halle Stéphane Diagana';
      else if (textContent.includes('quinon')) stadium = 'Stadium Pierre-Quinon';
      else if (textContent.includes('cdfas') || textContent.includes('eaubonne')) stadium = 'CDFAS Eaubonne';
      else if (textContent.includes('liévin') || textContent.includes('lievin')) stadium = 'Arena Stade Couvert de Liévin';
      else if (textContent.includes('ehrmann') || textContent.includes('nice')) stadium = 'Halle Charles-Ehrmann (Nice)';
      else if (textContent.includes('bordeaux')) stadium = 'Stadium Vélodrome de Bordeaux-Lac';

      const locationStr = region && region !== 'Toute la France' ? region : 'France';

      return {
        id: `tavily-${idx}-${Date.now()}`,
        title: cleanTitle || 'Meeting d\'Athlétisme Officiel',
        date: startDate,
        location: locationStr,
        stadiumName: stadium,
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${stadium} ${locationStr}`)}`,
        level: textContent.includes('world athletics') ? 'World Athletics / International' : (level || 'Compétition Officielle'),
        disciplines: disciplines && disciplines.length > 0 ? disciplines : ['Sprint (60m, 100m, 200m, 400m)'],
        timetableUrl: r.url,
        sourceUrl: r.url,
      };
    });

    return new Response(JSON.stringify({ competitions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
