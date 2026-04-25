import { Tabs } from 'expo-router';
import { theme } from '../../src/core/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
          height: 60,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Séance',
        }}
      />
      <Tabs.Screen
        name="body"
        options={{
          title: 'Corps',
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: 'Assistant',
          headerShown: false, // Custom header handled inside the component for better layout control
        }}
      />
    </Tabs>
  );
}
