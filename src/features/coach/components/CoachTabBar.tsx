import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../core/theme';

interface TabConfig {
  name: string;
  label: string;
  renderIcon: (color: string, focused: boolean) => React.ReactNode;
}

const COACH_TABS: Record<string, TabConfig> = {
  index: {
    name: 'index',
    label: 'Dashboard',
    renderIcon: (color) => <Feather name="grid" size={22} color={color} />,
  },
  group: {
    name: 'group',
    label: 'Équipe',
    renderIcon: (color) => <Feather name="users" size={22} color={color} />,
  },
  calendar: {
    name: 'calendar',
    label: 'Calendrier',
    renderIcon: (color) => <Feather name="calendar" size={22} color={color} />,
  },
  chat: {
    name: 'chat',
    label: 'Chat',
    renderIcon: (color) => <Feather name="message-circle" size={22} color={color} />,
  },
};

const TabItem = ({
  tab,
  isFocused,
  onPress,
  onLongPress,
}: {
  tab: TabConfig;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) => {
  const theme = useTheme();
  const scaleAnim = useRef(new Animated.Value(isFocused ? 1 : 0.95)).current;
  const pillOpacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isFocused ? 1.08 : 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(pillOpacity, {
        toValue: isFocused ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isFocused]);

  const handlePress = () => {
    // Haptic feedback
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    }

    // Quick press bounce animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1.08,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onPress();
  };

  const iconColor = isFocused ? theme.colors.accent : theme.colors.textSecondary;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={tab.label}
      testID={`tab-${tab.name}`}
      onPress={handlePress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
      style={styles.tabButton}
    >
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.activePill,
            {
              backgroundColor: theme.colors.accentMuted,
              opacity: pillOpacity,
            },
          ]}
        />
        {tab.renderIcon(iconColor, isFocused)}
      </Animated.View>

      <Text
        style={[
          styles.tabLabel,
          {
            color: isFocused ? theme.colors.accent : theme.colors.textSecondary,
            fontWeight: isFocused ? '600' : '400',
          },
        ]}
      >
        {tab.label}
      </Text>

      {isFocused && (
        <View style={[styles.activeDot, { backgroundColor: theme.colors.accent }]} />
      )}
    </TouchableOpacity>
  );
};

export const CoachTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.barContainer,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      <View style={styles.tabList}>
        {state.routes.map((route, index) => {
          const tabConfig = COACH_TABS[route.name];
          if (!tabConfig) return null; // Ignore hidden screens

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <TabItem
              key={route.key}
              tab={tabConfig}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  barContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tabList: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minHeight: 52,
  },
  iconContainer: {
    width: 44,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  activePill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.2,
    marginTop: 1,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
});
