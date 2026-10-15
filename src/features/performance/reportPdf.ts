import { supabase } from '../../services/supabase';
import { performanceService, AthletePerformance } from '../../services/performanceService';
import { PDF_STYLES, chartSvg, esc, sharePdfFromHtml } from '../sprinty/pdf';
import { formatValue, loadZone } from './format';

/**
 * Season report of an athlete as a PDF: attendance, records, progression, training load and the list of sessions
 * with the felt effort, duration and comments. Used by the athlete (their own) and by the coach (one athlete).
 */

interface SessionRow {
  date_prevue: string;
  type_seance: string | null;
  status: string | null;
  measures: any;
}

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const day = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const weekLabel = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export function buildReportHtml(opts: {
  athleteName: string;
  groupName?: string | null;
  weeks: number;
  perf: AthletePerformance;
  sessions: SessionRow[];
  /** Who reads it: wording of the footer only */
  audience: 'athlete' | 'coach';
}): string {
  const { athleteName, groupName, weeks, perf, sessions, audience } = opts;
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const real = sessions.filter((s) => !s.measures?.is_master && !/repos/i.test(s.type_seance || ''));
  const done = real.filter((s) => s.status === 'completed');
  const planned = perf.weekly.reduce((a, w) => a + w.planned, 0);
  const doneW = perf.weekly.reduce((a, w) => a + w.done, 0);
  const rpes = done.map((s) => Number(s.measures?.rpe)).filter((n) => Number.isFinite(n) && n > 0);
  const mins = done.map((s) => Number(s.measures?.duration_min)).filter((n) => Number.isFinite(n) && n > 0);
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const zone = loadZone(perf.load.ratio);

  const stats = `<div class="stats">
    <div><span>Séances validées</span><b>${doneW}${planned ? ` / ${planned}` : ''}</b></div>
    <div><span>Assiduité</span><b>${planned ? Math.round((doneW / planned) * 100) : '–'}${planned ? ' %' : ''}</b></div>
    <div><span>Effort ressenti moyen</span><b>${avg(rpes) != null ? (avg(rpes) as number).toFixed(1).replace('.', ',') : '–'}<small> / 10</small></b></div>
    <div><span>Durée moyenne d’une séance</span><b>${avg(mins) != null ? Math.round(avg(mins) as number) : '–'}<small> min</small></b></div>
    <div><span>Charge (7 jours / moyenne 4 semaines)</span><b>${perf.load.ratio != null ? perf.load.ratio.toFixed(2).replace('.', ',') : '–'}</b><small>${esc(zone.label)}</small></div>
    <div><span>Forme moyenne (7 jours)</span><b>${perf.form.avg7 != null ? perf.form.avg7 : '–'}<small> / 100</small></b></div>
  </div>`;

  const records = perf.records.length
    ? `<h2>Records</h2><table><thead><tr><th>Épreuve / exercice</th><th>Meilleur</th><th>Date</th><th>Résultats</th></tr></thead><tbody>${perf.records
        .map((r) => `<tr><td>${esc(r.label)}</td><td><strong>${esc(formatValue(r.value, r.unit))}</strong></td><td>${esc(day(r.date))}</td><td>${r.count}</td></tr>`)
        .join('')}</tbody></table>`
    : '';

  const charts = perf.series
    .filter((s) => s.points.length >= 2)
    .map((s) =>
      chartSvg({
        type: 'chart',
        title: s.label,
        kind: 'line',
        unit: s.unit === 's' ? 's' : 'kg',
        better: s.better === 'lower' ? 'lower' : 'higher',
        series: [{ name: s.label, points: s.points.map((p) => ({ x: p.date.slice(0, 10), y: p.value })) }],
      }),
    )
    .join('');
  const progression = charts ? `<h2>Progression</h2>${charts}` : '';

  // Weeks before the first planned session are noise
  const firstActive = perf.weekly.findIndex((w) => w.planned > 0 || w.done > 0);
  const weeksShown = firstActive < 0 ? [] : perf.weekly.slice(firstActive);
  const weekly = !weeksShown.length ? '' : `<h2>Semaine par semaine</h2><table><thead><tr><th>Semaine du</th><th>Prévues</th><th>Validées</th><th>Charge</th><th>Course</th></tr></thead><tbody>${weeksShown
    .map((w) => `<tr><td>${esc(weekLabel(w.week_start))}</td><td>${w.planned || '–'}</td><td>${w.done || (w.planned ? 0 : '–')}</td><td>${w.load || '–'}</td><td>${w.run_m ? `${Math.round(w.run_m)} m` : '–'}</td></tr>`)
    .join('')}</tbody></table>`;

  const rows = real
    .map((s) => {
      const m = s.measures || {};
      const fb = typeof m.athlete_feedback === 'string' ? m.athlete_feedback : typeof m.athlete_notes === 'string' ? m.athlete_notes : '';
      const coach = m.coach_feedback?.text ? `<div class="notes"><strong>Coach :</strong> ${esc(m.coach_feedback.text)}</div>` : '';
      return `<tr><td class="day">${esc(day(s.date_prevue))}</td><td><strong>${esc(s.type_seance || 'Séance')}</strong>${
        s.status === 'completed' ? '' : '<span class="muted"> · non validée</span>'
      }${fb ? `<div class="notes">${esc(fb)}</div>` : ''}${coach}</td><td>${m.rpe ? `${esc(m.rpe)}/10` : ''}</td><td>${m.duration_min ? `${esc(m.duration_min)} min` : ''}</td></tr>`;
    })
    .join('');
  const history = rows
    ? `<h2>Historique des séances</h2><table class="sessions"><thead><tr><th>Date</th><th>Séance et commentaires</th><th>Effort</th><th>Durée</th></tr></thead><tbody>${rows}</tbody></table>`
    : '';

  const subtitle = `${groupName ? `${esc(groupName)} · ` : ''}${weeks} dernières semaines · ${esc(today)}`;
  const footer =
    audience === 'coach'
      ? 'Bilan généré par Sprintys à partir des résultats saisis par l’athlète et du planning du coach.'
      : 'Bilan généré par Sprintys à partir de tes séances et résultats saisis.';
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><title>Bilan ${esc(athleteName)}</title><style>
${PDF_STYLES}
  </style></head><body>
  <header><div class="brand">SPRINTYS · BILAN</div><h1>${esc(athleteName)}</h1><div class="muted">${subtitle}</div></header>
  ${stats}${records}${progression}${weekly}${history}
  <footer>${esc(footer)}</footer>
  </body></html>`;
}

export async function exportAthleteReport(opts: {
  athleteId: string;
  athleteName: string;
  groupName?: string | null;
  audience: 'athlete' | 'coach';
  weeks?: number;
}) {
  const weeks = opts.weeks ?? 26;
  const perf = await performanceService.fetch(opts.athleteId, weeks);
  if (!perf) throw new Error('no_data');
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);
  const { data, error } = await supabase
    .from('workouts')
    .select('date_prevue, type_seance, status, measures')
    .eq('athlete_id', opts.athleteId)
    .gte('date_prevue', since.toISOString())
    .lte('date_prevue', new Date().toISOString())
    .order('date_prevue', { ascending: false })
    .limit(300);
  if (error) throw error;
  const html = buildReportHtml({ athleteName: opts.athleteName, groupName: opts.groupName, weeks, perf, sessions: (data as SessionRow[]) || [], audience: opts.audience });
  await sharePdfFromHtml(html, `Bilan ${opts.athleteName}`);
}
