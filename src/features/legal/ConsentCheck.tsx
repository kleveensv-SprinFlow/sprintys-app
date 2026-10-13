import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../core/theme';

interface Props {
  checked: boolean;
  onToggle: () => void;
  /** Rich text: plain strings and <Text> links. */
  children: React.ReactNode;
  required?: boolean;
}

/** Consent line with an animated checkbox. Never pre-checked by callers. */
export function ConsentCheck({ checked, onToggle, children, required }: Props) {
  const scale = useRef(new Animated.Value(checked ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(scale, { toValue: checked ? 1 : 0, useNativeDriver: true, speed: 22, bounciness: 10 }).start();
  }, [checked]);

  return (
    <Pressable
      onPress={() => {
        try {
          Haptics.selectionAsync();
        } catch {
          // ignore
        }
        onToggle();
      }}
      style={styles.row}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      hitSlop={6}
    >
      <View style={[styles.box, checked && styles.boxOn]}>
        <Animated.View style={{ transform: [{ scale }], opacity: scale }}>
          <Feather name="check" size={15} color="#FFFFFF" />
        </Animated.View>
      </View>
      <Text style={styles.text}>
        {children}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
    </Pressable>
  );
}

/** Inline link inside a ConsentCheck (does not toggle the box). */
export function ConsentLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Text style={styles.link} onPress={onPress} suppressHighlighting>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 6,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxOn: {
    backgroundColor: theme.colors.sprintyBlue,
    borderColor: theme.colors.sprintyBlue,
  },
  text: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  link: {
    color: theme.colors.sprintyBlue,
    fontWeight: '700',
  },
  required: {
    color: theme.colors.error,
    fontWeight: '700',
  },
});
