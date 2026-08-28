import React, { useRef, useEffect } from 'react';
import { 
  View, 
  TouchableOpacity, 
  StyleSheet, 
  Platform, 
  Animated,
  Alert
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../../core/theme';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';

const TabIcon = ({ name, isFocused }: { name: string, isFocused: boolean }) => {
  const theme = useTheme();
  const color = isFocused ? theme.colors.accent : theme.colors.textMuted;
  
  switch (name) {
    case 'index':
      return <Feather name="home" size={24} color={color} />;
    case 'calendar':
      return <Feather name="calendar" size={24} color={color} />;
    case 'nutrition':
      return <Feather name="heart" size={24} color={color} />; // Heart or coffee for nutrition
    case 'message':
      return <Feather name="message-square" size={24} color={color} />;
    default:
      return <Feather name="circle" size={24} color={color} />;
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
                if (route.name !== 'index') {
                  Alert.alert("Interface en cours de dev", "Cette fonctionnalité n'est pas encore prête.");
                } else {
                  navigation.navigate(route.name);
                }
              }
            };

            if (!['index', 'calendar', 'nutrition', 'message'].includes(route.name)) return null;

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
      web: {
        boxShadow: '0 10px 20px rgba(0,0,0,0.5)',
      }
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
