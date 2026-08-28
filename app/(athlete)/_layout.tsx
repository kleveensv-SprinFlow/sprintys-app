import { Tabs } from 'expo-router';
import { theme } from '../../src/core/theme';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          height: Platform.OS === 'ios' ? 85 : 65,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          borderTopWidth: 0,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: Platform.OS === 'ios' ? 10 : 0,
        },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: '#A0AEC0',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => <Feather name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          tabBarIcon: ({ color }) => <Feather name="calendar" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="restaurant-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="message"
        options={{
          tabBarIcon: ({ color }) => <Feather name="message-circle" size={24} color={color} />,
        }}
      />
      
      {/* Cacher les autres écrans de la tab bar */}
      <Tabs.Screen name="workout" options={{ href: null }} />
      <Tabs.Screen name="body" options={{ href: null }} />
      <Tabs.Screen name="assistant" options={{ href: null }} />
      <Tabs.Screen name="assistant/index" options={{ href: null }} />
    </Tabs>
  );
}
