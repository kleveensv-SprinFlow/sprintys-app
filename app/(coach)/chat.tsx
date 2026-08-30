import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { theme } from '../../src/core/theme';

export default function CoachChatScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MESSAGERIE</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Messagerie bientôt disponible</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: theme.colors.accent,
  },
  content: {
    padding: theme.spacing.xl,
    flex: 1,
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textMuted,
  }
});
