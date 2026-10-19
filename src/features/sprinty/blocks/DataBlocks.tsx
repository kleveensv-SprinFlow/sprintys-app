import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';
import { PressableScale } from '../../../shared/components/PressableScale';
import { Button } from '../../../shared/components/Button';
import type { UiBlock } from '../types';
import { DataTable } from './DataTable';

const BLUE = theme.colors.sprintyBlue;

export function StatsBlock({ data }: { data: Extract<UiBlock, { type: 'stats' }> }) {
  return (
    <View style={styles.card}>
      {data.title ? <Text style={styles.title}>{data.title}</Text> : null}
      <View style={styles.tiles}>
        {data.items.map((i, idx) => {
          const color = i.good == null ? theme.colors.textSecondary : i.good ? BLUE : theme.colors.error;
          const icon = i.trend === 'up' ? 'trending-up' : i.trend === 'down' ? 'trending-down' : i.trend === 'flat' ? 'minus' : null;
          return (
            <View key={idx} style={styles.tile}>
              <Text style={styles.tileLabel} numberOfLines={2}>
                {i.label}
              </Text>
              <View style={styles.tileRow}>
                <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
                  {i.value}
                  {i.unit ? <Text style={styles.tileUnit}> {i.unit}</Text> : null}
                </Text>
                {icon && <Feather name={icon as any} size={16} color={color} />}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function TableBlock({ data }: { data: Extract<UiBlock, { type: 'table' }> }) {
  return <DataTable title={data.title} columns={data.columns} rows={data.rows} />;
}

/**
 * Questions with tap-to-answer chips. All answers are sent together as one message.
 */
export function ChoicesBlock({
  data,
  disabled,
  onSubmit,
}: {
  data: Extract<UiBlock, { type: 'choices' }>;
  disabled?: boolean;
  onSubmit: (text: string) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [other, setOther] = useState<Record<string, string>>({});
  const locked = disabled || data.answered;

  const toggle = (qid: string, opt: string, multi: boolean) => {
    if (locked) return;
    setAnswers((prev) => {
      const cur = prev[qid] ?? [];
      if (multi) return { ...prev, [qid]: cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt] };
      return { ...prev, [qid]: cur[0] === opt ? [] : [opt] };
    });
  };

  const valueOf = (qid: string) => {
    const picked = (answers[qid] ?? []).filter((o) => o !== '__other');
    const free = (answers[qid] ?? []).includes('__other') ? other[qid]?.trim() : '';
    return [...picked, ...(free ? [free] : [])];
  };
  const complete = data.questions.every((q) => valueOf(q.id).length > 0);

  const submit = () => {
    const text = data.questions.map((q) => `${q.question} ${valueOf(q.id).join(', ')}`).join('\n');
    onSubmit(text);
  };

  // Single question with single choice: one tap answers
  const quick = data.questions.length === 1 && !data.questions[0].multi && !data.questions[0].allow_other;

  return (
    <View style={[styles.card, styles.choicesCard]}>
      {data.questions.map((q) => (
        <View key={q.id} style={styles.question}>
          <Text style={styles.questionText}>{q.question}</Text>
          <View style={styles.chips}>
            {[...q.options, ...(q.allow_other ? ['__other'] : [])].map((opt) => {
              const on = (answers[q.id] ?? []).includes(opt);
              return (
                <PressableScale
                  key={opt}
                  haptic="selection"
                  disabled={locked}
                  onPress={() => {
                    if (quick && !locked) {
                      setAnswers({ [q.id]: [opt] });
                      onSubmit(`${q.question} ${opt}`);
                      return;
                    }
                    toggle(q.id, opt, q.multi);
                  }}
                  style={[styles.chip, on && styles.chipOn, locked && !on && styles.chipLocked]}
                  accessibilityRole={q.multi ? 'checkbox' : 'radio'}
                  accessibilityState={{ checked: on }}
                >
                  {on && <Feather name="check" size={13} color="#FFFFFF" />}
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{opt === '__other' ? 'Autre…' : opt}</Text>
                </PressableScale>
              );
            })}
          </View>
          {(answers[q.id] ?? []).includes('__other') && !locked && (
            <TextInput
              style={styles.otherInput}
              placeholder="Précise…"
              placeholderTextColor={theme.colors.textMuted}
              value={other[q.id] ?? ''}
              onChangeText={(t) => setOther((p) => ({ ...p, [q.id]: t }))}
              maxLength={120}
            />
          )}
        </View>
      ))}
      {!quick && !locked && <Button title="Valider mes réponses" onPress={submit} disabled={!complete} style={styles.submit} />}
      {locked && data.answered && <Text style={styles.answered}>Réponses envoyées</Text>}
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
    padding: 14,
    gap: 10,
  },
  title: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: theme.colors.glassFill,
    borderRadius: 14,
    borderCurve: 'continuous',
    padding: 10,
    gap: 4,
  },
  tileLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  tileRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  tileValue: { flexShrink: 1, fontSize: 20, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.3 },
  tileUnit: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },


  choicesCard: { gap: 14 },
  question: { gap: 8 },
  questionText: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 36,
    maxWidth: '100%',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 105, 232, 0.08)',
  },
  chipOn: { backgroundColor: BLUE },
  chipLocked: { opacity: 0.45 },
  chipText: { flexShrink: 1, fontSize: 14, fontWeight: '700', color: BLUE },
  chipTextOn: { color: '#FFFFFF' },
  otherInput: {
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.glassFill,
    paddingHorizontal: 12,
    fontSize: 14,
    color: theme.colors.text,
  },
  submit: { marginTop: 2 },
  answered: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted },
});
