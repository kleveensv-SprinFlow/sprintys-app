/** Le petit markdown qu'écrit Sprinty, découpé en blocs (pur, testé). */

export type RichBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'bullet'; text: string }
  | { type: 'numbered'; n: number; text: string }
  | { type: 'callout'; text: string }
  | { type: 'rule' }
  | { type: 'table'; rows: string[][] };

export function parseContentToBlocks(content: string): RichBlock[] {
  const lines = content.replace(/\r/g, '').split('\n');
  const blocks: RichBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trimEnd();
    const trimmed = line.trim();
    if (!trimmed) {
      i++;
      continue;
    }
    if (trimmed.startsWith('|') && trimmed.indexOf('|', 1) > 0) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const l = lines[i].trim();
        i++;
        if (/^\|[\s:|-]+\|?$/.test(l)) continue; // ligne |---|---|
        const cells = l.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
        if (cells.length) rows.push(cells);
      }
      if (rows.length) blocks.push({ type: 'table', rows: rows.map((r) => r.slice(0, rows[0].length)) });
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'rule' });
      i++;
      continue;
    }
    const h = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      blocks.push({ type: 'heading', level: Math.min(3, h[1].length) as 1 | 2 | 3, text: h[2].trim() });
      i++;
      continue;
    }
    const b = trimmed.match(/^[-*•]\s+(.*)$/);
    if (b) {
      blocks.push({ type: 'bullet', text: b[1].trim() });
      i++;
      continue;
    }
    const n = trimmed.match(/^(\d{1,2})[.)]\s+(.*)$/);
    if (n) {
      blocks.push({ type: 'numbered', n: parseInt(n[1], 10), text: n[2].trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith('>')) {
      blocks.push({ type: 'callout', text: trimmed.replace(/^>\s*/, '') });
      i++;
      continue;
    }
    blocks.push({ type: 'paragraph', text: trimmed });
    i++;
  }
  return blocks;
}

export type InlinePart = { kind: 'text' | 'bold' | 'italic' | 'code'; text: string };

export function splitInline(raw: string): InlinePart[] {
  const regex = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|_[^_\s][^_]*_|`[^`]+`)/g;
  return raw
    .split(regex)
    .filter(Boolean)
    .map((part) => {
      if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) return { kind: 'bold', text: part.slice(2, -2) };
      if (part.length > 2 && ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_')))) return { kind: 'italic', text: part.slice(1, -1) };
      if (part.startsWith('`') && part.endsWith('`')) return { kind: 'code', text: part.slice(1, -1) };
      return { kind: 'text', text: part };
    });
}
