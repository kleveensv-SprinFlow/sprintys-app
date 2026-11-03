import React from 'react';
import { View, Text, StyleSheet, Platform, StyleProp, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { theme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
import { GlassSheen } from '../../../shared/components/GlassSheen';
import { PressableScale } from '../../../shared/components/PressableScale';
import { toast } from '../../../shared/feedback/appAlert';

/** Copies a text and confirms with a short toast (« Adresse copiée ») */
export async function copyText(text: string, what: string, feminine = true) {
  await Clipboard.setStringAsync(text);
  toast('success', `${what} copié${feminine ? 'e' : ''}`);
}

/** iOS grouped section: small caps title, glass card, optional footer */
export function Section({ title, footer, children, style }: { title?: string; footer?: string; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.section, style]}>
      {!!title && <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>}
      <View style={[glassCard, styles.card]}>
        <GlassSheen radius={22} />
        {children}
      </View>
      {!!footer && <Text style={styles.footer}>{footer}</Text>}
    </View>
  );
}

/** A value to copy (address, key): monospace, one tap copies it */
export function CopyField({ value, label, what, feminine = true, mono = true }: { value: string; label?: string; what: string; feminine?: boolean; mono?: boolean }) {
  return (
    <PressableScale
      haptic="selection"
      activeScale={0.98}
      onPress={() => copyText(value, what, feminine)}
      accessibilityRole="button"
      accessibilityLabel={`Copier ${label ?? what.toLowerCase()}`}
      style={styles.copyField}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        {!!label && <Text style={styles.copyLabel}>{label}</Text>}
        <Text style={[styles.copyValue, mono && styles.mono]} numberOfLines={2} selectable>
          {value}
        </Text>
      </View>
      <Feather name="copy" size={17} color={theme.colors.sprintyBlue} />
    </PressableScale>
  );
}

/** Numbered step of a guide */
export function Step({ n, title, children, last }: { n: number; title: string; children?: React.ReactNode; last?: boolean }) {
  return (
    <View style={[styles.step, !last && styles.stepGap]}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
        <Text style={styles.stepTitle}>{title}</Text>
        {children}
      </View>
    </View>
  );
}

export const styles = StyleSheet.create({
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: theme.colors.textSecondary, marginBottom: 8, paddingHorizontal: 4 },
  card: { paddingVertical: 4 },
  footer: { fontSize: 12, lineHeight: 17, color: theme.colors.textMuted, marginTop: 8, paddingHorizontal: 4 },
  copyField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.glassFill,
    borderRadius: theme.radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  copyLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, color: theme.colors.textMuted, marginBottom: 2 },
  copyValue: { fontSize: 13, color: theme.colors.text },
  mono: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 12 },
  step: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  stepGap: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.hairline },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: `${theme.colors.sprintyBlue}1A`, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumText: { fontSize: 13, fontWeight: '800', color: theme.colors.sprintyBlue },
  stepTitle: { fontSize: 15, lineHeight: 21, color: theme.colors.text, fontWeight: '500' },
});
