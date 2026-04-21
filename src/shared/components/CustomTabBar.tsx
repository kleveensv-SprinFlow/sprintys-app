import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { theme } from '../../core/theme';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle } from 'react-native-svg';

const TabIcon = ({ name, isFocused }: { name: string, isFocused: boolean }) => {
  const color = isFocused ? theme.colors.accent : theme.colors.textMuted;
  
  switch (name) {
    case 'index':
      return (
        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <Circle cx="9" cy="7" r="4" />
          <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </Svg>
      );
    default:
      return (
        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="12" cy="12" r="10" />
        </Svg>
      );
  }
};

export const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.container}>
      <BlurView intensity={30} tint="dark" style={styles.blur}>
        <View style={styles.tabBar}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            const scaleAnim = useRef(new Animated.Value(1)).current;

            useEffect(() => {
              Animated.spring(scaleAnim, {
                toValue: isFocused ? 1.2 : 1,
                useNativeDriver: true,
                friction: 8,
                tension: 100,
              }).start();
            }, [isFocused]);

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.navigate(route.name);
              }
            };

            if (['profile', 'assign/[id]', 'athlete/[id]'].includes(route.name)) return null;

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                activeOpacity={0.7}
                style={styles.tabItem}
              >
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                  <TabIcon name={route.name} isFocused={isFocused} />
                </Animated.View>
                {isFocused && <View style={styles.activeDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 25,
    left: '25%',
    right: '25%',
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)', // Subtle Gold border
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  blur: {
    paddingVertical: 15,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.accent,
    position: 'absolute',
    bottom: -8,
  },
});
