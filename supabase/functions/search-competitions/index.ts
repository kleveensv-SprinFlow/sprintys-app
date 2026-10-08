import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorise' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorise' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    const MONTHS_MAP: Record<string, string> = {
      janvier: '01', fevrier: '02',
      mars: '03', avril: '04', mai: '05',
      juin: '06', juillet: '07', aout: '08',
      septembre: '09', octobre: '10', novembre: '11',
      decembre: '12',
    };

    const extractDateFromText = (text: string, fallbackDate: string): string => {
      if (!text) return fallbackDate;
      const matchFull = text.match(/(\d{1,2})\s+(janvier|f[eé]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[eé]cembre)\s+(\d{4})/i);
      if (matchFull) {
        const day = matchFull[1].padStart(2, '0');
        const rawMonth = matchFull[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const month = MONTHS_MAP[rawMonth];
        if (month) return `${matchFull[3]}-${month}-${day}`;
      }
      const matchShort = text.match(/(\d{1,2})\s+(janvier|f[eé]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[eé]cembre)/i);
      if (matchShort) {
        const day = matchShort[1].padStart(2, '0');
        const rawMonth = matchShort[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const month = MONTHS_MAP[rawMonth];
        if (month) {
          const targetYear = parseInt(fallbackDate.split('-')[0] || '2026', 10);
          const isWinterNextYear = parseInt(month, 10) <= 3;
          const year = isWinterNextYear ? `${targetYear + 1}` : `${targetYear}`;
          return `${year}-${month}-${day}`;
        }
      }
      return fallbackDate;
    };

    const competitions: FoundCompetition[] = validResults.slice(0, 5).map((r: any, idx: number) => {
      const rawTitle = r.title || 'Meeting d\'Athlétisme';
      const cleanTitle = rawTitle
        .replace(/\s*-\s*(TrackAthletes|World Athletics|FFA|Facebook|YouTube).*/i, '')
        .replace(/\|\s*.*/i, '')
        .trim();

      let stadium = 'Stadium Régional';
      const fullContent = `${r.title} ${r.content}`;
      const textContent = fullContent.toLowerCase();
      if (textContent.includes('miramas')) stadium = 'Stadium Miramas Métropole';
      else if (textContent.includes('diagana')) stadium = 'Halle Stéphane Diagana';
      else if (textContent.includes('quinon')) stadium = 'Stadium Pierre-Quinon';
      else if (textContent.includes('cdfas') || textContent.includes('eaubonne')) stadium = 'CDFAS Eaubonne';
      else if (textContent.includes('liévin') || textContent.includes('lievin')) stadium = 'Arena Stade Couvert de Liévin';
      else if (textContent.includes('ehrmann') || textContent.includes('nice')) stadium = 'Halle Charles-Ehrmann (Nice)';
      else if (textContent.includes('bordeaux')) stadium = 'Stadium Vélodrome de Bordeaux-Lac';

      const locationStr = region && region !== 'Toute la France' ? region : 'France';
      const parsedDate = extractDateFromText(fullContent, startDate);

      return {
        id: `tavily-${idx}-${Date.now()}`,
        title: cleanTitle || 'Meeting d\'Athlétisme Officiel',
        date: parsedDate,
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
