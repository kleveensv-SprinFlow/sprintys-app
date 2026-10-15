import { Tabs } from 'expo-router';
import { AthleteTabBar } from '../../src/features/athlete/components/AthleteTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <AthleteTabBar {...props} />}
      // Back from a hidden screen (meal, day, profile…) returns to the screen it was opened from, not to Home
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="nutrition" />
      <Tabs.Screen name="message" />
      
      {/* Hidden screens from the tab bar */}
      <Tabs.Screen name="performance" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="body" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="groups" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="settings" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="day/[date]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="meal/[type]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}


