import { Tabs } from 'expo-router';
import { CoachTabBar } from '../../src/features/coach/components/CoachTabBar';

export default function CoachTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CoachTabBar {...props} />}
      // Back from a hidden screen (meal, day, profile…) returns to the screen it was opened from, not to Home
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="group" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="chat" options={{ tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="analyze" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      
      {/* Cacher les écrans qui ne sont pas des onglets principaux et masquer la tabbar */}
      <Tabs.Screen name="profile" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="athlete" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="day" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="week" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}
