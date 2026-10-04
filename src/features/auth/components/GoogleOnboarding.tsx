import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore, UserRole } from '../../../store/authStore';
import { useTheme } from '../../../core/theme';
import { SprintyLogo } from '../../../shared/components/SprintyLogo';

const DISCIPLINES = [
  { category: 'Sprints', items: ['60 m', '100 m', '200 m', '400 m'] },
  { category: 'Haies', items: ['60 m haies', '100 m haies', '110 m haies', '400 m haies'] },
  { category: 'Demi-fond / Fond', items: ['800 m', '1 500 m', '3 000 m', '5 000 m'] },
  { category: 'Sauts', items: ['Hauteur', 'Perche', 'Longueur', 'Triple saut'] },
  { category: 'Lancers', items: ['Poids', 'Disque', 'Marteau', 'Javelot'] },
  { category: 'Épreuves combinées', items: ['Heptathlon', 'Décathlon'] },
];

export const GoogleOnboarding: React.FC = () => {
  const theme = useTheme();
  const { user, updateProfile, logout } = useAuthStore();

  const [role, setRole] = useState<UserRole>('athlete');
  const [gender, setGender] = useState<'homme' | 'femme'>('homme');
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleDiscipline = (item: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (selectedDisciplines.includes(item)) {
      setSelectedDisciplines(selectedDisciplines.filter((d) => d !== item));
    } else {
      setSelectedDisciplines([...selectedDisciplines, item]);
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      await updateProfile({
        role,
        gender: role === 'athlete' ? gender : null,
        disciplines: role === 'athlete' ? selectedDisciplines : null,
        groupName: role === 'coach' ? groupName.trim() : null,
      });
    } catch (e) {
      console.error('Error during onboarding finish:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReady =
    role === 'coach'
      ? groupName.trim().length > 0
      : selectedDisciplines.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <SprintyLogo width={160} height={40} />
          <Text style={[styles.welcomeTitle, { color: theme.colors.text }]}>
            Bienvenue {user?.firstName || user?.name || ''}
          </Text>
          <Text style={[styles.welcomeSubtitle, { color: theme.colors.textSecondary }]}>
            Configurons votre profil pour personnaliser vos métriques.
          </Text>
        </View>

        {/* Role Selector Card */}
        <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
          VOUS ÊTES
        </Text>
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[
              styles.roleCard,
              {
                backgroundColor: role === 'athlete' ? '#FFFFFF' : theme.colors.surface,
                borderColor: role === 'athlete' ? '#0069E8' : theme.colors.border,
              },
              role === 'athlete' && styles.selectedRoleCard,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setRole('athlete');
            }}
            activeOpacity={0.85}
          >
            <View style={styles.roleCardHeader}>
              <Feather
                name="activity"
                size={20}
                color={role === 'athlete' ? '#0069E8' : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.roleCardTitle,
                  { color: role === 'athlete' ? '#0069E8' : theme.colors.text },
                ]}
              >
                Athlète
              </Text>
            </View>
            <Text style={[styles.roleCardDesc, { color: theme.colors.textSecondary }]}>
              Entraînements, chronos et suivi physique
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleCard,
              {
                backgroundColor: role === 'coach' ? '#FFFFFF' : theme.colors.surface,
                borderColor: role === 'coach' ? '#0069E8' : theme.colors.border,
              },
              role === 'coach' && styles.selectedRoleCard,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setRole('coach');
            }}
            activeOpacity={0.85}
          >
            <View style={styles.roleCardHeader}>
              <Feather
                name="users"
                size={20}
                color={role === 'coach' ? '#0069E8' : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.roleCardTitle,
                  { color: role === 'coach' ? '#0069E8' : theme.colors.text },
                ]}
              >
                Coach
              </Text>
            </View>
            <Text style={[styles.roleCardDesc, { color: theme.colors.textSecondary }]}>
              Gestion de groupe et planification
            </Text>
          </TouchableOpacity>
        </View>

        {role === 'athlete' ? (
          <>
            {/* Gender Selector */}
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
              CATÉGORIE
            </Text>
            <View style={styles.genderRow}>
              {(['homme', 'femme'] as const).map((g) => {
                const isSelected = gender === g;
                return (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderPill,
                      {
                        backgroundColor: isSelected ? '#0F172A' : theme.colors.surface,
                        borderColor: isSelected ? '#0F172A' : theme.colors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setGender(g);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.genderPillText,
                        { color: isSelected ? '#FFFFFF' : theme.colors.text },
                      ]}
                    >
                      {g === 'homme' ? 'Homme' : 'Femme'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Disciplines Chips */}
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
              DISCIPLINES (SÉLECTION MULTIPLE)
            </Text>
            <View style={styles.disciplinesContainer}>
              {DISCIPLINES.map((sec) => (
                <View key={sec.category} style={styles.categoryBlock}>
                  <Text style={[styles.categoryTitle, { color: theme.colors.textMuted }]}>
                    {sec.category}
                  </Text>
                  <View style={styles.chipGrid}>
                    {sec.items.map((item) => {
                      const isSel = selectedDisciplines.includes(item);
                      return (
                        <TouchableOpacity
                          key={item}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: isSel ? '#0069E8' : theme.colors.surface,
                              borderColor: isSel ? '#0069E8' : theme.colors.border,
                            },
                          ]}
                          onPress={() => toggleDiscipline(item)}
                          activeOpacity={0.75}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              { color: isSel ? '#FFFFFF' : theme.colors.text },
                            ]}
                          >
                            {item}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          /* Coach club input */
          <View style={styles.coachSection}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
              NOM DE VOTRE GROUPE OU CLUB
            </Text>
            <View
              style={[
                styles.coachInputWrapper,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Feather name="shield" size={18} color={theme.colors.textSecondary} />
              <TextInput
                style={[styles.coachInput, { color: theme.colors.text }]}
                placeholder="ex: Team Sprint Elite"
                placeholderTextColor={theme.colors.textMuted}
                value={groupName}
                onChangeText={setGroupName}
              />
            </View>
          </View>
        )}

        {/* CTA Button */}
        <TouchableOpacity
          style={[
            styles.ctaButtonWrapper,
            !isReady && styles.ctaDisabled,
          ]}
          disabled={!isReady || isSubmitting}
          onPress={handleFinish}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={isReady ? ['#0026AE', '#00DCFD'] : ['#94A3B8', '#CBD5E1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <View style={styles.ctaContent}>
                <Text style={styles.ctaText}>Finaliser mon profil</Text>
                <Feather name="arrow-right" size={18} color="#FFF" />
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Cancel / Disconnect */}
        <TouchableOpacity
          onPress={logout}
          style={styles.cancelLink}
          activeOpacity={0.7}
        >
          <Text style={[styles.cancelText, { color: theme.colors.textMuted }]}>
            Se déconnecter
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 16,
    marginBottom: 6,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 16,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  roleCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  selectedRoleCard: {
    shadowColor: '#0069E8',
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  roleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  roleCardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  roleCardDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderPill: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderPillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  disciplinesContainer: {
    gap: 14,
  },
  categoryBlock: {
    gap: 8,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  coachSection: {
    marginTop: 4,
  },
  coachInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    gap: 12,
  },
  coachInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  ctaButtonWrapper: {
    marginTop: 32,
    height: 54,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0026AE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cancelLink: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
