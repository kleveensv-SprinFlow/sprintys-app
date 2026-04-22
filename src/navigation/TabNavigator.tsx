import React from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import DashboardScreen from '../screens/DashboardScreen';
import WorkoutScreen from '../screens/WorkoutScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        ),
        tabBarActiveTintColor: '#00E5FF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen 
        name="Accueil" 
        component={DashboardScreen} 
        options={{ tabBarLabel: 'DASHBOARD' }}
      />
      <Tab.Screen 
        name="Entraînement" 
        component={WorkoutScreen} 
        options={{ tabBarLabel: 'AGENDA' }}
      />
      <Tab.Screen 
        name="Profil" 
        component={ProfileScreen} 
        options={{ tabBarLabel: 'RECORDS' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 25,
    left: 20,
    right: 20,
    elevation: 0,
    backgroundColor: 'transparent',
    borderRadius: 32,
    height: 65,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 10 : 0,
    borderTopWidth: 1, // Assure consistency
    borderTopColor: 'rgba(0, 229, 255, 0.2)',
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 5,
  },
});

export default TabNavigator;
