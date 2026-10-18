import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
import type { SessionFuel } from '../sessionFuel';

/** « Autour de ta séance » : avant / après, en deux lignes calmes. */
export const SessionFuelCard: React.FC<{ fuel: SessionFuel }> = ({ fuel }) => (
  <View style={[glassCard, styles.card]}>
    <Text style={styles.title}>Autour de ta séance</Text>
    <View style={styles.row}>
      <Feather name="clock" size={15} color={theme.colors.sprintyBlue} style={styles.icon} />
      <Text style={styles.text}><Text style={styles.strong}>Avant. </Text>{fuel.before}</Text>
    </View>
    <View style={styles.row}>
      <Feather name="refresh-cw" size={15} color={theme.colors.sprintyBlue} style={styles.icon} />
      <Text style={styles.text}><Text style={styles.strong}>Après. </Text>{fuel.after}</Text>
    </View>
    {fuel.note ? <Text style={styles.note}>{fuel.note}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 22 },
  title: { fontSize: 15, fontWeight: '800', color: theme.colors.text, marginBottom: 8 },
  row: { flexDirection: 'row', marginTop: 6 },
  icon: { marginTop: 2, marginRight: 8 },
  text: { flex: 1, fontSize: 14, lineHeight: 20, color: theme.colors.text },
  strong: { fontWeight: '700' },
  note: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 10 },
});
