import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../core/theme';

interface SegmentedControlProps<K extends string> {
  options: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
  style?: ViewStyle;
}

/** iOS-style segmented control: a white thumb slides with a spring under the active segment. */
export function SegmentedControl<K extends string>({ options, value, onChange, style }: SegmentedControlProps<K>) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  const segment = width > 0 ? (width - 6) / options.length : 0;
  const x = useRef(new Animated.Value(index)).current;

  useEffect(() => {
    Animated.spring(x, { toValue: index, useNativeDriver: true, speed: 22, bounciness: 4 }).start();
  }, [index]);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.glassFill }, style]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {segment > 0 && (
        <Animated.View
          style={[
            styles.thumb,
            { width: segment, transform: [{ translateX: Animated.multiply(x, segment) }] },
          ]}
        />
      )}
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            style={styles.segment}
            onPress={() => {
              if (on) return;
              if (Platform.OS !== 'web') {
                try {
                  Haptics.selectionAsync();
                } catch (e) {
                  // ignore
                }
              }
              onChange(o.key);
            }}
          >
            <Text
              style={[styles.label, { color: on ? theme.colors.text : theme.colors.textSecondary, fontWeight: on ? '700' : '600' }]}
              numberOfLines={1}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 3,
  },
  thumb: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: 9,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
  },
});
