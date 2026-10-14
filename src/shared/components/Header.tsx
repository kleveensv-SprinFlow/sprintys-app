import React from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../core/theme';
import { Feather } from '@expo/vector-icons';
import { glassSurface } from '../../core/glass';
import { FrostedBar } from './FrostedBar';
import { PressableScale } from './PressableScale';

interface HeaderProps {
  title: string;
  rightComponent?: React.ReactNode;
  showBackButton?: boolean;
  onBackPress?: () => void;
  /** Tab roots: big left-aligned title (iOS large title). Pushed screens keep a centered title. */
  large?: boolean;
  /** Scroll position of the content below: the frosted bar fades in once content slides under it. */
  scrollY?: Animated.Value;
}

export const Header: React.FC<HeaderProps> = ({ title, rightComponent, showBackButton, onBackPress, large, scrollY }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Transparent over the glows at rest (no white band); frosted only when content is under it
  const barOpacity = scrollY
    ? scrollY.interpolate({ inputRange: [0, 16], outputRange: [0, 1], extrapolate: 'clamp' })
    : 0;

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) + 6 }]}>
      <FrostedBar opacity={barOpacity} />

      {large ? (
        <View style={styles.largeRow}>
          <Text style={[styles.largeTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          {rightComponent}
        </View>
      ) : (
        <View style={styles.row}>
          <View style={styles.side}>
            {showBackButton && (
              <PressableScale onPress={onBackPress} haptic="selection" hitSlop={8} style={[styles.backButton, glassSurface]} accessibilityRole="button" accessibilityLabel="Retour">
                <Feather name="chevron-left" size={22} color={theme.colors.text} />
              </PressableScale>
            )}
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          <View style={[styles.side, styles.sideRight]}>{rightComponent}</View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 10,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  side: {
    minWidth: 76,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideRight: {
    justifyContent: 'flex-end',
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    minHeight: 44,
  },
  largeTitle: {
    flex: 1,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginRight: 12,
  },
});
