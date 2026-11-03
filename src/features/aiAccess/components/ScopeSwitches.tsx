import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';
import { AI_SCOPES, AI_SCOPE_GROUPS, ALL_AI_SCOPES, AiScope, MINOR_PROFILE_DETAIL } from '../../../services/aiAccessService';
import { Section } from './ui';

/**
 * Categories as iOS switches, in three groups (training, body and health, memory).
 * Categories not allowed for this account (before 18) show a lock instead of a switch.
 */
export function ScopeSwitches({
  value,
  allowed,
  onToggle,
  disabled,
}: {
  value: AiScope[];
  allowed: AiScope[];
  onToggle: (s: AiScope) => void;
  disabled?: boolean;
}) {
  const restricted = allowed.length < ALL_AI_SCOPES.length;
  return (
    <>
      {AI_SCOPE_GROUPS.map((g) => {
        const items = AI_SCOPES.filter((s) => s.group === g.key);
        const footer = g.key === 'corps' && restricted ? 'Avant 18 ans, ton poids, ta forme et ta nutrition restent privés.' : g.footer;
        return (
          <Section key={g.key} title={g.label} footer={footer}>
            {items.map((s, i) => {
              const locked = !allowed.includes(s.key);
              const on = value.includes(s.key) && !locked;
              const detail = locked ? 'Dès 18 ans' : s.key === 'profil' && restricted ? MINOR_PROFILE_DETAIL : s.detail;
              return (
                <View key={s.key} style={[styles.row, i < items.length - 1 && styles.divider, locked && styles.locked]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.label}>{s.label}</Text>
                    <Text style={styles.detail} numberOfLines={1}>
                      {detail}
                    </Text>
                  </View>
                  {locked ? (
                    <Feather name="lock" size={17} color={theme.colors.textMuted} accessibilityLabel="Disponible dès 18 ans" />
                  ) : (
                    <Switch
                      value={on}
                      onValueChange={() => onToggle(s.key)}
                      disabled={disabled}
                      accessibilityLabel={`${s.label} : ${detail}`}
                    />
                  )}
                </View>
              );
            })}
          </Section>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.hairline },
  locked: { opacity: 0.5 },
  label: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  detail: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 1 },
});
