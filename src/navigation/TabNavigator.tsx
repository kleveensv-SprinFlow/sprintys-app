import React, { useRef } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../screens/DashboardScreen';
import WorkoutScreen from '../screens/WorkoutScreen';
import NutritionScreen from '../screens/NutritionScreen';

const Tab = createBottomTabNavigator();

const TabItem = ({ state, descriptors, navigation, route, index }: any) => {
  const isFocused = state.index === index;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.85, useNativeDriver: true, speed: 50 }),
      Animated.spring(scaleAnim, { toValue: 1.15, useNativeDriver: true, friction: 3, tension: 100 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5 }),
    ]).start();

    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  const getIconName = (name: string): any => {
    switch (name) {
      case 'Dashboard': return 'grid-outline';
      case 'Nutrition': return 'restaurant-outline';
      case 'Agenda': return 'calendar-outline';
      default: return 'help-outline';
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      style={styles.tabItem}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons 
          name={getIconName(route.name)} 
          size={26} 
          color={isFocused ? '#00E5FF' : '#8E8E93'} 
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={props => (
        <View style={styles.tabBarWrapper}>
          <BlurView intensity={90} tint="dark" style={styles.blurContainer}>
            <View style={styles.tabItemsRow}>
              {props.state.routes.map((route, index) => (
                <TabItem 
                  key={index}
                  route={route}
                  index={index}
                  state={props.state}
                  descriptors={props.descriptors}
                  navigation={props.navigation}
                />
              ))}
            </View>
          </BlurView>
        </View>
      )}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Nutrition" component={NutritionScreen} />
      <Tab.Screen name="Agenda" component={WorkoutScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 25,
    left: 40, // More compact
    right: 40,
    height: 60,
    backgroundColor: 'transparent',
    borderRadius: 30,
    overflow: 'hidden',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0, 229, 255, 0.3)',
  },
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  tabItemsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: '100%',
    paddingBottom: Platform.OS === 'ios' ? 5 : 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TabNavigator;
