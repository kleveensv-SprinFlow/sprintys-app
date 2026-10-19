import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import type { MessagePart, ProposedSession, UiBlock } from './types';
import { POSES } from './avatar/poses.generated';
import { poseToSvg } from './avatar/poseSvg';
import { buildColumns } from './blocks/tableModel';

/** Tableau HTML : chiffres alignés à droite, meilleure valeur en bleu (mêmes règles que dans l'app). */
function tableHtml(columns: string[], rows: string[][], cell: (s: string) => string = esc): string {
  const model = buildColumns(columns, rows);
  const cls = (ci: number, ri: number | null) =>
    [model[ci].numeric ? 'num' : '', ri != null && model[ci].bestRow === ri ? 'best' : ''].filter(Boolean).join(' ');
  return `<table><thead><tr>${columns.map((c, ci) => `<th class="${cls(ci, null)}">${cell(c)}</th>`).join('')}</tr></thead><tbody>${rows
    .map((r, ri) => `<tr>${columns.map((_, ci) => `<td class="${cls(ci, ri)}">${cell(String(r[ci] ?? ''))}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;
}

/**
 * PDF export of a Sprinty answer (analysis, plan, sessions): an HTML page printed by the system, with the charts
 * drawn as SVG and the AI mention on every page.
 */

const COLORS = ['#0069E8', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444'];

export const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const inline = (s: string) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>');

/** The markdown subset Sprinty writes: headings, lists, quotes, tables, bold and italic. */
function markdownToHtml(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  let table: string[][] | null = null;
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  const closeTable = () => {
    if (!table) return;
    const [head, ...rows] = table;
    out.push(tableHtml(head, rows, inline));
    table = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (/^\|.*\|$/.test(line)) {
      closeList();
      if (/^\|[\s:|-]+\|$/.test(line)) continue;
      (table ??= []).push(line.slice(1, -1).split('|').map((c) => c.trim()));
      continue;
    }
    closeTable();
    if (!line) {
      closeList();
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      closeList();
      out.push(`<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`);
    } else if (/^[-*•]\s+/.test(line)) {
      if (list !== 'ul') {
        closeList();
        out.push('<ul>');
        list = 'ul';
      }
      out.push(`<li>${inline(line.replace(/^[-*•]\s+/, ''))}</li>`);
    } else if (/^\d+[.)]\s+/.test(line)) {
      if (list !== 'ol') {
        closeList();
        out.push('<ol>');
        list = 'ol';
      }
      out.push(`<li>${inline(line.replace(/^\d+[.)]\s+/, ''))}</li>`);
    } else if (line.startsWith('>')) {
      closeList();
      out.push(`<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`);
    } else {
      closeList();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  closeTable();
  return out.join('\n');
}

const shortDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const longDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  const label = new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};
const fmt = (v: number) => (Math.abs(v) >= 100 ? Math.round(v).toString() : (Math.round(v * 10) / 10).toString().replace('.', ','));

export function chartSvg(c: Extract<UiBlock, { type: 'chart' }>): string {
  const W = 640;
  const H = 240;
  const P = { t: 16, r: 16, b: 28, l: 44 };
  const series = c.series.filter((s) => s.points.length);
  const xs = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort();
  const ys = series.flatMap((s) => s.points.map((p) => p.y));
  if (!ys.length) return '';
  const ref = c.reference && Number.isFinite(c.reference.value) ? c.reference : null;
  let min = Math.min(...ys, ...(ref ? [ref.value] : []));
  let max = Math.max(...ys, ...(ref ? [ref.value] : []));
  if (c.kind === 'bar' && series.length === 1) min = Math.min(0, min);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.1;
  min -= series.length === 1 && c.kind === 'bar' ? 0 : pad;
  max += pad;
  const iw = W - P.l - P.r;
  const ih = H - P.t - P.b;
  const x = (d: string) => P.l + (xs.length <= 1 ? iw / 2 : (xs.indexOf(d) / (xs.length - 1)) * iw);
  const y = (v: number) => P.t + ih - ((v - min) / (max - min)) * ih;
  const grid = [min, (min + max) / 2, max]
    .map(
      (g) =>
        `<line x1="${P.l}" x2="${W - P.r}" y1="${y(g)}" y2="${y(g)}" stroke="#E2E8F0"/><text x="${P.l - 6}" y="${y(g) + 4}" font-size="11" fill="#94A3B8" text-anchor="end">${fmt(g)}</text>`
    )
    .join('');
  const axis = xs.length
    ? `<text x="${P.l}" y="${H - 8}" font-size="11" fill="#94A3B8">${shortDate(xs[0])}</text><text x="${W - P.r}" y="${H - 8}" font-size="11" fill="#94A3B8" text-anchor="end">${shortDate(xs[xs.length - 1])}</text>`
    : '';
  let marks = '';
  if (c.kind === 'bar' && series.length === 1) {
    const bw = Math.max(4, Math.min(26, (iw / Math.max(1, xs.length)) * 0.6));
    marks = series[0].points
      .map((p) => `<rect x="${x(p.x) - bw / 2}" y="${Math.min(y(p.y), y(Math.max(min, 0)))}" width="${bw}" height="${Math.max(2, Math.abs(y(Math.max(min, 0)) - y(p.y)))}" rx="3" fill="${COLORS[0]}"/>`)
      .join('');
  } else {
    marks = series
      .map((s, i) => {
        const color = COLORS[i % COLORS.length];
        const pts = s.points.map((p) => [x(p.x), y(p.y)] as const);
        const d = pts.map(([px, py], j) => `${j ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
        const last = pts[pts.length - 1];
        const area =
          series.length === 1 && pts.length > 1
            ? `<path d="${d} L${last[0].toFixed(1)},${P.t + ih} L${pts[0][0].toFixed(1)},${P.t + ih} Z" fill="url(#area)"/>`
            : '';
        const dots = pts.length <= 16 ? pts.map(([px, py]) => `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3" fill="${color}"/>`).join('') : '';
        return `${area}<path d="${d}" fill="none" stroke="${color}" stroke-width="2.75" stroke-linejoin="round" stroke-linecap="round"/>${dots}<circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="5" fill="#fff" stroke="${color}" stroke-width="2.5"/>`;
      })
      .join('');
  }
  const refLine = ref
    ? `<line x1="${P.l}" x2="${W - P.r}" y1="${y(ref.value)}" y2="${y(ref.value)}" stroke="#10B981" stroke-width="1.5" stroke-dasharray="6,4"/><text x="${W - P.r}" y="${y(ref.value) - 6}" font-size="11" font-weight="700" fill="#059669" text-anchor="end">${esc(ref.label)} ${fmt(ref.value)}</text>`
    : '';
  const defs = `<defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${COLORS[0]}" stop-opacity="0.22"/><stop offset="1" stop-color="${COLORS[0]}" stop-opacity="0"/></linearGradient></defs>`;
  const legend =
    series.length > 1
      ? `<div class="legend">${series.map((s, i) => `<span><i style="background:${COLORS[i % COLORS.length]}"></i>${esc(s.name)}</span>`).join('')}</div>`
      : '';
  return `<figure><figcaption>${esc(c.title)} <small>(${esc(c.unit)})</small></figcaption><svg viewBox="0 0 ${W} ${H}" width="100%">${defs}${grid}${axis}${refLine}${marks}</svg>${legend}</figure>`;
}

function sessionHtml(s: ProposedSession): string {
  let detail = '';
  if (s.kind === 'run') detail = s.run_blocks.map((b) => `${b.reps} × ${b.distance_m} m à ${b.intensity_pct} % (récup ${b.rest_s} s)`).join('<br/>');
  else if (s.kind === 'strength')
    detail = s.strength
      .map((e) => `${esc(e.name)} : ${e.sets} × ${e.reps}${e.percent_1rm ? ` à ${e.percent_1rm} % 1RM` : e.weight_kg ? ` · ${e.weight_kg} kg` : ''} (récup ${e.rest_s} s)`)
      .join('<br/>');
  else if (s.kind === 'stairs') detail = s.stairs.map((e) => `${e.sets} × ${e.reps} ${esc(e.name)}, ${e.steps} marches`).join('<br/>');
  else if (s.kind === 'mobility') detail = s.steps.map((e) => `${esc(e.name)}${e.detail ? ` : ${esc(e.detail)}` : ''}`).join('<br/>');
  else if (s.kind === 'competition') detail = esc(s.location);
  return `<tr><td class="day">${esc(longDate(s.date))}</td><td><strong>${esc(s.title)}</strong>${detail ? `<br/>${detail}` : ''}${
    s.notes && s.kind !== 'rest' ? `<div class="notes">${esc(s.notes)}</div>` : s.kind === 'rest' ? `<div class="notes">${esc(s.notes || 'Repos')}</div>` : ''
  }</td></tr>`;
}

function blockHtml(b: UiBlock): string {
  switch (b.type) {
    case 'chart':
      return chartSvg(b);
    case 'stats':
      return `${b.title ? `<h3>${esc(b.title)}</h3>` : ''}<div class="stats">${b.items
        .map((i) => {
          const tone = i.good == null ? '' : i.good ? ' good' : ' bad';
          const arrow = i.trend === 'up' ? '▲' : i.trend === 'down' ? '▼' : i.trend === 'flat' ? '■' : '';
          return `<div class="${tone.trim()}"><span>${esc(i.label)}</span><b>${esc(i.value)}${i.unit ? ` <small>${esc(i.unit)}</small>` : ''}${arrow ? ` <em>${arrow}</em>` : ''}</b></div>`;
        })
        .join('')}</div>`;
    case 'table':
      return `${b.title ? `<h3>${esc(b.title)}</h3>` : ''}${tableHtml(b.columns, b.rows)}`;
    case 'sessions_proposal':
      return `<h3>${esc(b.title)}</h3><p class="muted">Pour ${esc(b.target.name)}</p><table class="sessions">${b.sessions.map(sessionHtml).join('')}</table>`;
    case 'plan_proposal':
      return `<h2>${esc(b.title)}</h2><p class="muted">${esc(b.goal.target ?? b.goal.title)}${b.goal.event_date ? ` · objectif le ${esc(longDate(b.goal.event_date))}` : ''} · du ${esc(
        longDate(b.start_date)
      )} au ${esc(longDate(b.end_date))}</p>${b.cautious ? '<p class="warn">Plan volontairement doux : demande l’avis d’un médecin avant d’augmenter l’intensité.</p>' : ''}${b.weeks
        .map((w) => `<h3>Semaine ${w.week} · ${esc(w.focus)}</h3><table class="sessions">${w.sessions.map(sessionHtml).join('')}</table>`)
        .join('')}${b.advice ? `<p>${esc(b.advice)}</p>` : ''}`;
    case 'goal_proposal':
      return `<p><strong>Objectif :</strong> ${esc(b.goal.title)}${b.goal.target ? ` (${esc(b.goal.target)})` : ''}</p>`;
    case 'competitions':
      return `<h3>Compétitions trouvées</h3><ul>${b.items.map((c) => `<li><strong>${esc(c.title)}</strong>${c.date ? ` · ${esc(longDate(c.date))}` : ''}${c.url ? `<br/><small>${esc(c.url)}</small>` : ''}</li>`).join('')}</ul>`;
    default:
      return '';
  }
}

/** Shared look of every exported document */
export const PDF_STYLES = `  @page { margin: 18mm 14mm 20mm; @bottom-right { content: counter(page) " / " counter(pages); font-size: 9px; color: #94A3B8; } }
  html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: -apple-system, 'Helvetica Neue', Roboto, Arial, sans-serif; color: #0F172A; font-size: 13px; line-height: 1.55; font-variant-numeric: tabular-nums; }
  header { border-bottom: 3px solid #0069E8; padding-bottom: 10px; margin-bottom: 16px; }
  header.brandbar { display: flex; align-items: center; gap: 12px; }
  header .brand { color: #0069E8; font-weight: 800; letter-spacing: .5px; font-size: 12px; }
  h1 { font-size: 22px; margin: 4px 0 2px; letter-spacing: -0.3px; } h2 { font-size: 17px; margin: 20px 0 6px; color: #0B4FB3; } h3 { font-size: 14px; margin: 14px 0 4px; } h4 { font-size: 13px; }
  p strong:first-child { color: #0B4FB3; }
  .num { text-align: right; } td.best { color: #0069E8; font-weight: 800; }
  .stats div.good b { color: #059669; } .stats div.bad b { color: #DC2626; } .stats em { font-style: normal; font-size: 11px; }
  .page-footer { position: fixed; bottom: -12mm; left: 0; right: 0; font-size: 9px; color: #94A3B8; }
  .muted, small { color: #64748B; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 10px; page-break-inside: auto; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #E2E8F0; vertical-align: top; }
  th { background: #F1F5F9; font-size: 11.5px; }
  tr { page-break-inside: avoid; }
  .sessions td.day { width: 30%; font-weight: 700; color: #0069E8; }
  .notes { color: #475569; font-size: 11.5px; margin-top: 3px; }
  figure { margin: 10px 0 14px; page-break-inside: avoid; } figcaption { font-weight: 700; margin-bottom: 4px; }
  .legend span { margin-right: 14px; font-size: 11px; } .legend i { display: inline-block; width: 9px; height: 9px; border-radius: 5px; margin-right: 5px; }
  .stats { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; } .stats div { flex: 1 1 40%; background: #F1F5F9; border-radius: 10px; padding: 8px 10px; }
  .stats span { display: block; color: #64748B; font-size: 11px; } .stats b { font-size: 17px; }
  blockquote { border-left: 3px solid #0069E8; margin: 8px 0; padding: 4px 10px; color: #334155; }
  .warn { background: #FEF3C7; padding: 8px 10px; border-radius: 8px; }
  footer { margin-top: 22px; padding-top: 8px; border-top: 1px solid #E2E8F0; color: #64748B; font-size: 10.5px; }
`;

export function buildPdfHtml(parts: MessagePart[], title: string, subtitle?: string): string {
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const body = parts.map((p) => (p.kind === 'text' ? markdownToHtml(p.text) : blockHtml(p.block))).join('\n');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><title>${esc(title)}</title><style>
${PDF_STYLES}
  </style></head><body>
  <header class="brandbar">${poseToSvg(POSES.neutral, 54)}<div><div class="brand">SPRINTYS · SPRINTY</div><h1>${esc(title)}</h1><div class="muted">${subtitle ? `${esc(subtitle)} · ` : ''}${esc(today)}</div></div></header>
  <div class="page-footer">Sprinty est une IA : contenu indicatif, pas un avis médical.</div>
  ${body}
  <footer>Contenu proposé par Sprinty, l’assistant IA de Sprintys, à partir des données de l’application. Il peut contenir des erreurs et ne remplace ni un entraîneur diplômé ni un avis médical.</footer>
  </body></html>`;
}

/** Builds the PDF and opens the share sheet (print dialog on the web). */
export async function exportPartsToPdf(parts: MessagePart[], title: string, subtitle?: string) {
  await sharePdfFromHtml(buildPdfHtml(parts, title, subtitle), title);
}

/** Prints an HTML document to a PDF with a readable file name and opens the share sheet (print dialog on the web). */
export async function sharePdfFromHtml(html: string, title: string) {
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri: tempUri } = await Print.printToFileAsync({ html });
  // expo-print names the file with a random id: give it a readable name before sharing
  let uri = tempUri;
  try {
    const dest = `${FileSystem.cacheDirectory}${pdfFileName(title)}.pdf`;
    await FileSystem.deleteAsync(dest, { idempotent: true });
    await FileSystem.moveAsync({ from: tempUri, to: dest });
    uri = dest;
  } catch {
    // keep the original file
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: title });
  } else {
    await Print.printAsync({ uri });
  }
}

/** « Sprintys - Plan 100 m sous 12 s - 14-10-2026 » : readable, no characters a file system refuses. */
export function pdfFileName(title: string, now = new Date()): string {
  const clean = title
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)
    .trim();
  const date = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  return `Sprintys - ${clean || 'Sprinty'} - ${date}`;
}

/** A readable title for the export, from the first visual block or the conversation. */
export function pdfTitleFor(parts: MessagePart[], fallback: string): string {
  for (const p of parts) {
    if (p.kind !== 'ui') continue;
    const b = p.block as any;
    if (b.type === 'plan_proposal' || b.type === 'sessions_proposal' || b.type === 'chart') return b.title;
  }
  return fallback;
}
