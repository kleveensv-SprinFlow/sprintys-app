import { Tabs } from 'expo-router';
import { AthleteTabBar } from '../../src/features/athlete/components/AthleteTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <AthleteTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="nutrition" />
      <Tabs.Screen name="message" />
      
      {/* Hidden screens from the tab bar */}
      <Tabs.Screen name="workout" options={{ href: null }} />
      <Tabs.Screen name="body" options={{ href: null }} />
      <Tabs.Screen name="groups" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="assistant" options={{ href: null }} />
      <Tabs.Screen name="assistant/index" options={{ href: null }} />
    </Tabs>
  );
}

