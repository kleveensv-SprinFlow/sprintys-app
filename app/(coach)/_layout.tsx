import { Tabs } from 'expo-router';
import { theme } from '../../src/core/theme';
import { Feather } from '@expo/vector-icons';
import { Platform } from 'react-native';

export default function CoachTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 30 : 20,
          left: 20,
          right: 20,
          backgroundColor: '#1E293B', // Darker background to distinguish the Coach app easily
          borderRadius: 30,
          height: 65,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          borderTopWidth: 0,
        },
        tabBarActiveTintColor: theme.colors.primary, // Blue accent instead of Green
        tabBarInactiveTintColor: '#94A3B8',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => <Feather name="users" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          tabBarIcon: ({ color }) => <Feather name="calendar" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          tabBarIcon: ({ color }) => <Feather name="folder" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color }) => <Feather name="settings" size={24} color={color} />,
        }}
      />
      
      {/* Cacher les autres écrans de la navigation Coach qui ne sont pas des onglets */}
      <Tabs.Screen name="athlete/[id]" options={{ href: null }} />
      <Tabs.Screen name="assign/[id]" options={{ href: null }} />
    </Tabs>
  );
}
