import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { AthleteList } from './AthleteList';
import { theme } from '../../../core/theme';
import { useAuthStore } from '../../../store/authStore';
import { Button } from '../../../shared/components/Button';
import { WeatherBadge } from '../../../shared/components/WeatherBadge';

export const CoachDashboard: React.FC = () => {
  const { user, logout } = useAuthStore();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={styles.headerTop}>
            <Text style={styles.welcome}>ESPACE COACH</Text>
            <WeatherBadge />
          </View>
          <Text style={styles.title}>Salut, {user?.name.split(' ')[0]}</Text>
        </View>
        <Button
          title="LOGOUT"
          onPress={logout}
          variant="ghost"
          style={styles.logoutBtn}
          textStyle={styles.logoutText}
        />
      </View>

      <View style={styles.content}>
        <AthleteList />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  welcome: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 2,
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: theme.typography.fontWeights.bold as any,
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
  },
  logoutBtn: {
    height: 32,
    paddingHorizontal: theme.spacing.sm,
  },
  logoutText: {
    fontSize: 10,
    color: theme.colors.error,
  }
});
