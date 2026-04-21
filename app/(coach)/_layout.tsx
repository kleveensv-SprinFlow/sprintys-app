import { Tabs } from 'expo-router';
import { theme } from '../../src/core/theme';
import { CustomTabBar } from '../../src/shared/components/CustomTabBar';

export default function CoachTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'transparent',
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Athlètes',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          href: null,
        }}
      />
      <Tabs.Screen
        name="athlete/[id]"
        options={{
          title: 'Détails',
          href: null,
        }}
      />
      <Tabs.Screen
        name="assign/[id]"
        options={{
          title: 'Assigner',
          href: null,
        }}
      />
    </Tabs>
  );
}
