import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform, LayoutChangeEvent } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../core/theme';
import { useCoachStore } from '../../../store/coach/coachStore';

interface TabConfig {
  name: string;
  label: string;
  renderIcon: (color: string, focused: boolean) => React.ReactNode;
}

const COACH_TABS: Record<string, TabConfig> = {
  index: {
    name: 'index',
    label: 'Dashboard',
    renderIcon: (color) => <Feather name="grid" size={20} color={color} />,
  },
  group: {
    name: 'group',
    label: 'Équipe',
    renderIcon: (color) => <Feather name="users" size={20} color={color} />,
  },
  calendar: {
    name: 'calendar',
    label: 'Calendrier',
    renderIcon: (color) => <Feather name="calendar" size={20} color={color} />,
  },
  chat: {
    name: 'chat',
    label: 'Sprinty',
    renderIcon: (color) => <Feather name="zap" size={20} color={color} />,
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
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const { pendingMembers } = useCoachStore();
  const hasBadge = tab.name === 'group' && pendingMembers.length > 0;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isFocused ? 1.05 : 1,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [isFocused]);

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    }

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: isFocused ? 1.05 : 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();

    onPress();
  };

  const activeColor = '#0069E8';
  const inactiveColor = '#64748B';
  const color = isFocused ? activeColor : inactiveColor;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={tab.label}
      testID={`tab-${tab.name}`}
      onPress={handlePress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      style={styles.tabButton}
    >
      <Animated.View
        style={[
          styles.itemContent,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.iconWrapper}>
          {tab.renderIcon(color, isFocused)}
          {hasBadge && (
            <View style={[styles.badgeDot, { borderColor: theme.colors.surface, backgroundColor: '#EF4444' }]} />
          )}
        </View>

        <Text
          style={[
            styles.tabLabel,
            {
              color,
              fontWeight: isFocused ? '700' : '500',
            },
          ]}
        >
          {tab.label}
        </Text>
      </Animated.View>
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
  const [containerWidth, setContainerWidth] = useState(0);
  const translateXAnim = useRef(new Animated.Value(0)).current;

  const PRIMARY_COACH_TABS = ['index', 'group', 'calendar', 'chat'];
  const activeRoute = state.routes[state.index];
  const isPrimaryTab = PRIMARY_COACH_TABS.includes(activeRoute?.name);

  const visibleRoutes = state.routes.filter((route) => COACH_TABS[route.name]);
  const activeVisibleIndex = visibleRoutes.findIndex((r) => r.name === activeRoute?.name);

  const tabWidth = containerWidth > 0 ? (containerWidth - 16) / Math.max(1, visibleRoutes.length) : 0;

  useEffect(() => {
    if (activeVisibleIndex >= 0 && tabWidth > 0) {
      Animated.spring(translateXAnim, {
        toValue: activeVisibleIndex * tabWidth,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }).start();
    }
  }, [activeVisibleIndex, tabWidth]);

  const focusedDescriptor = descriptors[activeRoute?.key];
  const tabBarStyle = focusedDescriptor?.options?.tabBarStyle as any;
  if (!isPrimaryTab || (tabBarStyle && tabBarStyle.display === 'none')) {
    return null;
  }

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== containerWidth) {
      setContainerWidth(width);
    }
  };

  return (
    <View
      style={[
        styles.barContainer,
        {
          backgroundColor: theme.colors.surface,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      <View style={styles.tabList} onLayout={handleLayout}>
        {/* Sliding Background Pill */}
        {tabWidth > 0 && activeVisibleIndex >= 0 && (
          <Animated.View
            style={[
              styles.slidingPill,
              {
                width: tabWidth - 8,
                transform: [{ translateX: Animated.add(translateXAnim, 4) }],
              },
            ]}
          />
        )}

        {state.routes.map((route) => {
          const tabConfig = COACH_TABS[route.name];
          if (!tabConfig) return null;

          const isFocused = activeRoute?.name === route.name;

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
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.6)',
    paddingTop: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 6,
  },
  tabList: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    position: 'relative',
    height: 52,
  },
  slidingPill: {
    position: 'absolute',
    left: 8,
    top: 2,
    bottom: 2,
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
    borderRadius: 16,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    zIndex: 2,
  },
  itemContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: -0.1,
  },
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
});
