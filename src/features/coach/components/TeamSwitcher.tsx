import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
import { BottomSheet } from '../../../shared/components/BottomSheet';
import { PressableScale } from '../../../shared/components/PressableScale';
import { useCoachStore, useCurrentTeam } from '../../../store/coach/coachStore';

/** Picks the group the coach is working on. Hidden for coaches with a single group. */
export const TeamSwitcher = ({ style }: { style?: any }) => {
  const theme = useTheme();
  const teams = useCoachStore((s) => s.teams);
  const selectTeam = useCoachStore((s) => s.selectTeam);
  const current = useCurrentTeam();
  const [open, setOpen] = useState(false);

  if (teams.length < 2 || !current) return null;

  return (
    <>
      <PressableScale
        haptic="selection"
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Groupe ${current.name}, changer de groupe`}
        style={[glassCard as any, styles.pill, style]}
      >
        <Feather name="users" size={14} color={theme.colors.sprintyBlue} />
        <Text style={[styles.pillText, { color: theme.colors.text }]} numberOfLines={1}>
          {current.name}
        </Text>
        <Feather name="chevron-down" size={14} color={theme.colors.textMuted} />
      </PressableScale>

      <BottomSheet visible={open} onClose={() => setOpen(false)} title="Mes groupes" subtitle="Le calendrier, les séances et les alertes suivent le groupe choisi.">
        <View style={{ gap: 8 }}>
          {teams.map((t) => {
            const active = t.id === current.id;
            return (
              <PressableScale
                key={t.id}
                haptic="selection"
                onPress={() => {
                  Haptics.selectionAsync().catch(() => undefined);
                  selectTeam(t.id);
                  setOpen(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.row, { borderColor: active ? theme.colors.sprintyBlue : theme.colors.hairline }]}
              >
                <Text style={[styles.rowText, { color: theme.colors.text }]} numberOfLines={1}>
                  {t.name}
                </Text>
                {active && <Feather name="check" size={18} color={theme.colors.sprintyBlue} />}
              </PressableScale>
            );
          })}
        </View>
      </BottomSheet>
    </>
  );
};

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, maxWidth: '100%' },
  pillText: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, borderWidth: 1.5 },
  rowText: { fontSize: 16, fontWeight: '600', flex: 1 },
});
