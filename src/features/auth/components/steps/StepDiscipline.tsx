import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../../../core/theme';
import { Button } from '../../../../shared/components/Button';

const DISCIPLINES = [
  { category: 'Sprints', items: ['60 m', '100 m', '200 m', '400 m'] },
  { category: 'Haies', items: ['60 m haies', '100 m haies', '110 m haies', '400 m haies'] },
  { category: 'Demi-fond / Fond', items: ['800 m', '1 500 m', '3 000 m', '5 000 m', '10 000 m'] },
  { category: 'Sauts', items: ['Hauteur', 'Perche', 'Longueur', 'Triple saut'] },
  { category: 'Lancers', items: ['Poids', 'Disque', 'Marteau', 'Javelot'] },
  { category: 'Épreuves combinées', items: ['Heptathlon', 'Décathlon'] }
];

export const StepDiscipline = ({ data, updateData, onNext, onBack }: any) => {
  const theme = useTheme();

  const toggleDiscipline = (item: string) => {
    const current = data.disciplines || [];
    if (current.includes(item)) {
      updateData({ disciplines: current.filter((d: string) => d !== item) });
    } else {
      updateData({ disciplines: [...current, item] });
    }
  };

  const selectedCount = (data.disciplines || []).length;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Quelle est votre discipline ?</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Sélection multiple</Text>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {DISCIPLINES.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{section.category}</Text>
            <View style={styles.chipContainer}>
              {section.items.map(item => {
                const isSelected = (data.disciplines || []).includes(item);
                return (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? theme.colors.accent : theme.colors.background,
                        borderColor: isSelected ? theme.colors.accent : theme.colors.border
                      }
                    ]}
                    onPress={() => toggleDiscipline(item)}
                  >
                    <Text style={[
                      styles.chipText,
                      { color: isSelected ? '#FFFFFF' : theme.colors.text }
                    ]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Retour" variant="outline" onPress={onBack} style={styles.halfBtn} />
        <Button title="Continuer" onPress={onNext} disabled={selectedCount === 0} style={styles.halfBtn} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 400, // Make sure it takes up enough space but flexes
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    marginBottom: 24,
  },
  scrollContent: {
    paddingBottom: 24, // extra padding at the bottom of the list
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 'auto', // Pushes the footer to the bottom
  },
  halfBtn: {
    flex: 1,
  }
});
