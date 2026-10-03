import { Tabs } from 'expo-router';
import { CoachTabBar } from '../../src/features/coach/components/CoachTabBar';

export default function CoachTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CoachTabBar {...props} />}
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
      
      {/* Cacher les écrans qui ne sont pas des onglets principaux */}
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="library" options={{ href: null }} />
      <Tabs.Screen name="athlete" options={{ href: null }} />
      <Tabs.Screen name="assign" options={{ href: null }} />
    </Tabs>
  );
}

