import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../src/core/theme';
import { Header } from '../../src/shared/components/Header';
import { useCoachStore } from '../../src/store/coach/coachStore';

export default function CoachLibraryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { workoutTemplates, fetchWorkoutTemplates, deleteWorkoutTemplate } = useCoachStore();

  useEffect(() => {
    fetchWorkoutTemplates();
  }, []);

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      "Supprimer le modèle",
      `Êtes-vous sûr de vouloir supprimer "${name}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => deleteWorkoutTemplate(id) }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header 
        title="Bibliothèque" 
        rightComponent={
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.closeBtn}
          >
            <Feather name="x" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        }
      />
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Vos modèles de séances prêts à l'emploi.
        </Text>

        {workoutTemplates.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.accent + '15' }]}>
              <Feather name="book-open" size={32} color={theme.colors.accent} />
            </View>
            <Text style={[styles.emptyText, { color: theme.colors.text }]}>Aucun modèle enregistré.</Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
              Créez une séance depuis le calendrier et cliquez sur "Sauvegarder comme modèle" pour la retrouver ici.
            </Text>
          </View>
        ) : (
          workoutTemplates.map((template) => (
            <View key={template.id} style={[styles.templateCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleContainer}>
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{template.name}</Text>
                  <View style={[styles.badge, { backgroundColor: template.type_seance === 'musculation' ? '#3B82F620' : '#F59E0B20' }]}>
                    <Text style={[styles.badgeText, { color: template.type_seance === 'musculation' ? '#3B82F6' : '#F59E0B' }]}>
                      {template.type_seance === 'musculation' ? 'Musculation' : 'Course / Hybride'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleDelete(template.id, template.name)} style={styles.actionBtn}>
                  <Feather name="trash-2" size={18} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
              
              {template.description && (
                <Text style={[styles.cardDesc, { color: theme.colors.textMuted }]} numberOfLines={2}>
                  {template.description}
                </Text>
              )}
              
              <View style={styles.cardFooter}>
                <Text style={[styles.cardStats, { color: theme.colors.textSecondary }]}>
                  {template.blocks ? template.blocks.length : 0} blocs configurés
                </Text>
                
                <TouchableOpacity 
                  style={[styles.useBtn, { backgroundColor: theme.colors.accent }]}
                  onPress={() => {
                    // TODO: Insert flow
                    Alert.alert('Bientôt', 'L\'importation de ce modèle dans le calendrier sera activée dans la prochaine étape.');
                  }}
                >
                  <Text style={styles.useBtnText}>Utiliser</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeBtn: {
    width: 40, 
    height: 40, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 24,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  templateCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitleContainer: {
    flex: 1,
    paddingRight: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  actionBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,59,48,0.1)',
    borderRadius: 8,
  },
  cardDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 16,
    marginTop: 8,
  },
  cardStats: {
    fontSize: 13,
    fontWeight: '600',
  },
  useBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  useBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
