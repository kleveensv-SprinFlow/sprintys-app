import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../src/core/theme';
import { Button } from '../src/shared/components/Button';
import { Input } from '../src/shared/components/Input';
import { Card } from '../src/shared/components/Card';
import { SprintyFeedback } from '../src/features/sprinty/SprintyFeedback';
import { useSprintyStore } from '../src/store/sprintyStore';

export default function HomeScreen() {
  const [inputText, setInputText] = useState('');
  const showFeedback = useSprintyStore((state) => state.showFeedback);

  return (
    <View style={styles.container}>
      <SprintyFeedback />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>SprintFlow V3</Text>
          <Text style={styles.subtitle}>Design System & Sprinty Preview</Text>
        </View>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Buttons</Text>
          <View style={styles.buttonRow}>
            <Button 
              title="Success" 
              variant="primary" 
              onPress={() => showFeedback('success', 'Entraînement enregistré avec succès !')} 
              style={styles.flexButton}
            />
          </View>
          <View style={styles.buttonRow}>
            <Button 
              title="Warning" 
              variant="outline" 
              onPress={() => showFeedback('warning', 'Le vent pourrait ralentir votre allure.')} 
              style={styles.flexButton}
            />
          </View>
          <View style={styles.buttonRow}>
            <Button 
              title="Error" 
              variant="secondary" 
              onPress={() => showFeedback('error', 'Échec de la connexion au capteur.')} 
              style={styles.flexButton}
            />
          </View>
        </Card>

        <Card style={styles.section} variant="glass">
          <Text style={styles.sectionTitle}>Inputs & Glass Effect</Text>
          <Input 
            label="Athlete Name" 
            placeholder="Enter name..." 
            value={inputText}
            onChangeText={setInputText}
          />
          <Input 
            label="Recovery Note" 
            placeholder="Enter note..." 
            error={inputText.length > 10 ? "Note too long" : undefined}
          />
        </Card>

        <Card style={styles.section} variant="elevated">
          <Text style={styles.sectionTitle}>Typography & Theme</Text>
          <Text style={styles.bodyText}>
            Ceci est un aperçu de la philosophie de design sombre et premium. 
            Accentuation subtile via la couleur Or et les effets de lumière.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.xl,
    paddingTop: 80,
  },
  header: {
    marginBottom: theme.spacing.xxl,
  },
  title: {
    color: theme.colors.text,
    fontSize: 32,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  subtitle: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: theme.typography.fontWeights.medium as any,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 4,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: theme.typography.fontWeights.bold as any,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: theme.spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  flexButton: {
    flex: 1,
  },
  bodyText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
});
