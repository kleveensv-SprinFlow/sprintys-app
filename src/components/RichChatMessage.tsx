import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../core/theme';
import { DataTable } from '../features/sprinty/blocks/DataTable';
import { parseContentToBlocks, splitInline } from './richText';

interface RichChatMessageProps {
  content: string;
}

/**
 * Réponse de Sprinty : texte aéré (16 px, interligne 24), titres, listes à puces et numérotées, encadrés, séparateurs,
 * et tableaux au même style que la carte tableau.
 */
export const RichChatMessage: React.FC<RichChatMessageProps> = ({ content }) => {
  if (!content) return null;
  const blocks = parseContentToBlocks(content);

  return (
    <View style={styles.container}>
      {blocks.map((block, idx) => {
        const first = idx === 0;
        switch (block.type) {
          case 'table': {
            const [head, ...rows] = block.rows;
            return head ? (
              <View key={idx} style={styles.tableWrap}>
                <DataTable columns={head} rows={rows} renderCell={inline} />
              </View>
            ) : null;
          }
          case 'heading':
            return (
              <Text key={idx} style={[styles.heading, block.level === 1 ? styles.h1 : block.level === 2 ? styles.h2 : styles.h3, !first && styles.headingGap]}>
                {inline(block.text)}
              </Text>
            );
          case 'bullet':
            return (
              <View key={idx} style={styles.listRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.listText}>{inline(block.text)}</Text>
              </View>
            );
          case 'numbered':
            return (
              <View key={idx} style={styles.listRow}>
                <View style={styles.numBadge}>
                  <Text style={styles.numText}>{block.n}</Text>
                </View>
                <Text style={styles.listText}>{inline(block.text)}</Text>
              </View>
            );
          case 'callout':
            return (
              <View key={idx} style={styles.callout}>
                <Text style={styles.calloutText}>{inline(block.text)}</Text>
              </View>
            );
          case 'rule':
            return <View key={idx} style={styles.rule} />;
          default:
            return (
              <Text key={idx} style={styles.paragraph}>
                {inline(block.text)}
              </Text>
            );
        }
      })}
    </View>
  );
};

/** **gras**, *italique*, `code` */
function inline(raw: string): React.ReactNode {
  return splitInline(raw).map((part, i) => {
    if (part.kind === 'bold') return <Text key={i} style={styles.bold}>{part.text}</Text>;
    if (part.kind === 'italic') return <Text key={i} style={styles.italic}>{part.text}</Text>;
    if (part.kind === 'code') return <Text key={i} style={styles.code}>{part.text}</Text>;
    return <React.Fragment key={i}>{part.text}</React.Fragment>;
  });
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  paragraph: { fontSize: 16, lineHeight: 24, color: theme.colors.text },
  heading: { color: theme.colors.text, fontWeight: '800', letterSpacing: -0.3 },
  h1: { fontSize: 20, lineHeight: 26 },
  h2: { fontSize: 18, lineHeight: 24 },
  h3: { fontSize: 16, lineHeight: 22 },
  headingGap: { marginTop: 8 },
  bold: { fontWeight: '700', color: theme.colors.text },
  italic: { fontStyle: 'italic', color: theme.colors.textSecondary },
  code: { fontVariant: ['tabular-nums'], fontWeight: '600', color: theme.colors.sprintyBlue },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingRight: 4 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.sprintyBlue, marginTop: 9, marginLeft: 4 },
  numBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  numText: { fontSize: 12, fontWeight: '800', color: theme.colors.sprintyBlue, fontVariant: ['tabular-nums'] },
  listText: { flex: 1, fontSize: 16, lineHeight: 24, color: theme.colors.text },
  callout: {
    backgroundColor: 'rgba(0, 105, 232, 0.06)',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.sprintyBlue,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  calloutText: { fontSize: 15, lineHeight: 22, color: theme.colors.text },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border, marginVertical: 4 },
  tableWrap: { marginVertical: 2 },
});
