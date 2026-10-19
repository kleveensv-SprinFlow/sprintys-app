import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../../../core/theme';
import { buildColumns } from './tableModel';

/**
 * Le seul tableau de Sprinty (carte « tableau » et tableaux écrits dans un message) : en-tête clair, chiffres alignés
 * à droite et de même largeur, meilleure valeur en bleu, défilement horizontal si besoin.
 */
export function DataTable({ title, columns, rows, renderCell }: {
  title?: string;
  columns: string[];
  rows: string[][];
  renderCell?: (text: string) => React.ReactNode;
}) {
  const model = useMemo(() => buildColumns(columns, rows), [columns, rows]);
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={[styles.tr, styles.thead]}>
            {columns.map((c, i) => (
              <Text key={i} style={[styles.th, { width: model[i].width }, model[i].numeric && styles.right]} numberOfLines={2}>
                {c}
              </Text>
            ))}
          </View>
          {rows.map((r, ri) => (
            <View key={ri} style={[styles.tr, ri % 2 === 1 && styles.zebra, ri === rows.length - 1 && styles.lastRow]}>
              {columns.map((_, ci) => {
                const text = String(r[ci] ?? '');
                const best = model[ci].bestRow === ri;
                return (
                  <Text
                    key={ci}
                    style={[
                      styles.td,
                      { width: model[ci].width },
                      ci === 0 && styles.firstCol,
                      model[ci].numeric && styles.num,
                      best && styles.best,
                    ]}
                  >
                    {renderCell ? renderCell(text) : text}
                  </Text>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.hairline,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  title: { fontSize: 15, fontWeight: '800', color: theme.colors.text, paddingHorizontal: 2 },
  tr: { flexDirection: 'row', alignItems: 'center' },
  thead: { borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: 6 },
  zebra: { backgroundColor: theme.colors.glassFill },
  lastRow: { borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  th: { paddingHorizontal: 8, fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, letterSpacing: 0.2 },
  td: { paddingVertical: 9, paddingHorizontal: 8, fontSize: 14, lineHeight: 19, color: theme.colors.text },
  firstCol: { fontWeight: '700' },
  right: { textAlign: 'right' },
  num: { textAlign: 'right', fontVariant: ['tabular-nums'], fontWeight: '600' },
  best: { color: theme.colors.sprintyBlue, fontWeight: '800' },
});
