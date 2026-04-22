import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform, Text, TouchableOpacity, Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../screens/DashboardScreen';
import WorkoutScreen from '../screens/WorkoutScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CheckInScreen from '../screens/CheckInScreen';

const Tab = createBottomTabNavigator();

const TabItem = ({ state, descriptors, navigation, route, index }: any) => {
  const { options } = descriptors[route.key];
  const isFocused = state.index === index;

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPress = () => {
    // Animation de rebond Elite
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        useNativeDriver: true,
        speed: 50,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1.1,
        useNativeDriver: true,
        friction: 3,
        tension: 100,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
      }),
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
      case 'Accueil': return 'grid-outline';
      case 'Agenda': return 'flash-outline';
      case 'Check-in': return 'pulse-outline';
      case 'Records': return 'person-outline';
      default: return 'help-outline';
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      style={styles.tabItem}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        <Ionicons 
          name={getIconName(route.name)} 
          size={24} 
          color={isFocused ? '#00E5FF' : '#8E8E93'} 
        />
        <Text style={[
          styles.tabBarLabel, 
          { color: isFocused ? '#00E5FF' : '#FFFFFF', opacity: isFocused ? 1 : 0.6 }
        ]}>
          {route.name.toUpperCase()}
        </Text>
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
      <Tab.Screen name="Accueil" component={DashboardScreen} />
      <Tab.Screen name="Agenda" component={WorkoutScreen} />
      <Tab.Screen name="Check-in" component={CheckInScreen} />
      <Tab.Screen name="Records" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 25,
    left: 20,
    right: 20,
    height: 75,
    backgroundColor: 'transparent',
    borderRadius: 35,
    overflow: 'hidden',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0, 229, 255, 0.4)', // Reflet Cyan sur le dessus
  },
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  tabItemsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 10 : 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
  tabBarLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 4,
    textTransform: 'uppercase',
  },
});

export default TabNavigator;
