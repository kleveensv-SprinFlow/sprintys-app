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
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="analyze" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      
      {/* Cacher les écrans qui ne sont pas des onglets principaux et masquer la tabbar */}
      <Tabs.Screen name="profile" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="library" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="athlete" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="assign" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="day" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}
