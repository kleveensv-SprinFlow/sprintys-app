import React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { CoachTabBar } from '../../src/features/coach/components/CoachTabBar';

export default function CoachTabsLayout() {
  return (
    <View style={styles.container}>
      {/* Arrière-plan global persistant de la piste d'athlétisme avec virage rehaussé */}
      <ImageBackground
        source={require('../../assets/track_background.png')}
        style={StyleSheet.absoluteFillObject}
        imageStyle={{
          transform: [{ translateY: -60 }, { scale: 1.14 }],
        }}
        resizeMode="cover"
      >
        {/* Voile d'ambiance protecteur léger pour faire ressortir le verre sans effet laiteux */}
        <LinearGradient
          colors={[
            'rgba(15, 23, 42, 0.12)',
            'transparent',
            'rgba(2, 132, 199, 0.06)',
          ]}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
      </ImageBackground>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
});
