import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface RichChatMessageProps {
  content: string;
}

export const RichChatMessage: React.FC<RichChatMessageProps> = ({ content }) => {
  if (!content) return null;

  // Découper le texte par blocs (tableaux, titres, listes, paragraphes)
  const blocks = parseContentToBlocks(content);

  return (
    <View style={styles.container}>
      {blocks.map((block, idx) => {
        if (block.type === 'table') {
          return <TableBlock key={idx} rows={block.tableRows || []} />;
        }
        if (block.type === 'heading') {
          const fontSize = block.level === 1 ? 18 : block.level === 2 ? 16 : 14;
          return (
            <Text
              key={idx}
              style={[
                styles.heading,
                { fontSize, marginTop: idx > 0 ? 12 : 2, marginBottom: 4 },
              ]}
            >
              {renderInlineFormattedText(block.text || '')}
            </Text>
          );
        }
        if (block.type === 'bullet') {
          return (
            <View key={idx} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>
                {renderInlineFormattedText(block.text || '')}
              </Text>
            </View>
          );
        }
        if (block.type === 'callout') {
          return (
            <View key={idx} style={styles.calloutBox}>
              <Text style={styles.calloutText}>
                {renderInlineFormattedText(block.text || '')}
              </Text>
            </View>
          );
        }
        // Paragraphe classique
        return (
          <Text key={idx} style={styles.paragraph}>
            {renderInlineFormattedText(block.text || '')}
          </Text>
        );
      })}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Rendu Inline : Gras, Annotations / Italique, Code
// ---------------------------------------------------------------------------

function renderInlineFormattedText(rawText: string) {
  // Regex pour matcher : **gras**, *italique/annotation*, _italique_, `code`
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`)/g;
  const parts = rawText.split(regex);

  return parts.map((part, i) => {
    if (!part) return null;

    // Gras : **texte**
    if (part.startsWith('**') && part.endsWith('**')) {
      const clean = part.slice(2, -2);
      return (
        <Text key={i} style={styles.boldText}>
          {clean}
        </Text>
      );
    }
    // Annotation / Italique : *texte* ou _texte_
    if (
      (part.startsWith('*') && part.endsWith('*')) ||
      (part.startsWith('_') && part.endsWith('_'))
    ) {
      const clean = part.slice(1, -1);
      return (
        <Text key={i} style={styles.italicAnnotation}>
          {clean}
        </Text>
      );
    }
    // Code inline : `code`
    if (part.startsWith('`') && part.endsWith('`')) {
      const clean = part.slice(1, -1);
      return (
        <Text key={i} style={styles.inlineCode}>
          {clean}
        </Text>
      );
    }

    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

// ---------------------------------------------------------------------------
// Rendu Tableau Natif (style ChatGPT / Gemini)
// ---------------------------------------------------------------------------

interface TableRow {
  isHeader?: boolean;
  cells: string[];
}

const TableBlock: React.FC<{ rows: TableRow[] }> = ({ rows }) => {
  if (rows.length === 0) return null;

  return (
    <View style={styles.tableCard}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.tableInner}>
          {rows.map((row, rIdx) => {
            const isHeader = row.isHeader || rIdx === 0;
            const isEven = rIdx % 2 === 0;
            return (
              <View
                key={rIdx}
                style={[
                  styles.tableRow,
                  isHeader
                    ? styles.tableHeaderRow
                    : isEven
                    ? styles.tableRowEven
                    : styles.tableRowOdd,
                ]}
              >
                {row.cells.map((cell, cIdx) => (
                  <View key={cIdx} style={styles.tableCell}>
                    <Text
                      style={[
                        styles.cellText,
                        isHeader && styles.headerCellText,
                      ]}
                    >
                      {renderInlineFormattedText(cell)}
                    </Text>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Parseur de Blocs Markdown
// ---------------------------------------------------------------------------

interface Block {
  type: 'paragraph' | 'heading' | 'bullet' | 'table' | 'callout';
  text?: string;
  level?: number;
  tableRows?: TableRow[];
}

function parseContentToBlocks(content: string): Block[] {
  const lines = content.split('\n');
  const blocks: Block[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trimEnd();

    // Ligne vide
    if (!line.trim()) {
      i++;
      continue;
    }

    // Détection d'un tableau Markdown : commence par '|'
    if (line.trim().startsWith('|') && line.includes('|', 1)) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      const tableRows = parseMarkdownTable(tableLines);
      if (tableRows.length > 0) {
        blocks.push({ type: 'table', tableRows });
      }
      continue;
    }

    // Détection Titres : #, ##, ###
    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    // Détection Listes à puces : '- ' ou '* '
    const bulletMatch = line.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      blocks.push({
        type: 'bullet',
        text: bulletMatch[1].trim(),
      });
      i++;
      continue;
    }

    // Détection Callout / Citation : '> '
    if (line.startsWith('>')) {
      blocks.push({
        type: 'callout',
        text: line.replace(/^>\s*/, '').trim(),
      });
      i++;
      continue;
    }

    // Paragraphe simple
    blocks.push({
      type: 'paragraph',
      text: line,
    });
    i++;
  }

  return blocks;
}

function parseMarkdownTable(tableLines: string[]): TableRow[] {
  const rows: TableRow[] = [];

  tableLines.forEach((line, idx) => {
    // Ignorer la ligne de séparation |---|---|
    if (/^\|[-:\s|]+\|$/.test(line)) {
      return;
    }

    // Découper les cellules
    const rawCells = line.split('|');
    // Enlever le premier et dernier élément vide issu du split sur '|'
    if (rawCells.length >= 2) {
      const trimmedCells = rawCells
        .slice(1, rawCells.length - 1)
        .map((c) => c.trim());

      if (trimmedCells.length > 0) {
        rows.push({
          isHeader: idx === 0,
          cells: trimmedCells,
        });
      }
    }
  });

  return rows;
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: '#0F172A',
    marginBottom: 4,
  },
  heading: {
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  boldText: {
    fontWeight: '700',
    color: '#0F172A',
  },
  italicAnnotation: {
    fontStyle: 'italic',
    color: '#64748B',
    fontSize: 13,
  },
  inlineCode: {
    fontFamily: 'monospace',
    backgroundColor: '#F1F5F9',
    color: '#0369A1',
    fontSize: 13,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#0284C7',
    marginTop: 8,
    marginRight: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: '#1E293B',
  },
  calloutBox: {
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 3,
    borderLeftColor: '#38BDF8',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginVertical: 4,
  },
  calloutText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#334155',
    fontStyle: 'italic',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginVertical: 8,
  },
  tableInner: {
    minWidth: 280,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableHeaderRow: {
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1.5,
    borderBottomColor: '#CBD5E1',
  },
  tableRowEven: {
    backgroundColor: '#FFFFFF',
  },
  tableRowOdd: {
    backgroundColor: '#F8FAFC',
  },
  tableCell: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 90,
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 12,
    color: '#334155',
  },
  headerCellText: {
    fontWeight: '800',
    color: '#0F172A',
    fontSize: 12,
  },
});
