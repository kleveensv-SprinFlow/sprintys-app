import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../core/theme';
import { Feather, Ionicons } from '@expo/vector-icons';
import { CheckInModal } from '../../checkin/components/CheckInModal';
import { CheckInSummaryModal } from '../../checkin/components/CheckInSummaryModal';
import { useCheckInStore } from '../../../store/checkInStore';
import { useAuthStore } from '../../../store/authStore';
import { useNutritionStore } from '../../../store/nutrition/nutritionStore';
import { LinearGradient } from 'expo-linear-gradient';

export const AthleteGauges = () => {
  const theme = useTheme();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [summaryVisible, setSummaryVisible] = useState(false);
  
  const { user } = useAuthStore();
  const { startCheckIn, editTodayCheckIn, loadHistory, todayHealthScore } = useCheckInStore();
  const { mealLogs } = useNutritionStore();

  useEffect(() => {
    if (user?.id) {
      loadHistory(user.id);
    }
  }, [user]);

  const handleCheckInPress = () => {
    if (!user?.id) return;
    
    if (todayHealthScore !== null) {
      setSummaryVisible(true);
    } else {
      startCheckIn(user.id);
      setModalVisible(true);
    }
  };

  const handleEditCheckIn = () => {
    if (!user?.id) return;
    editTodayCheckIn(user.id);
    setModalVisible(true);
  };

  const handleNutritionPress = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {
        // ignore
      }
    }
    router.push('/(athlete)/nutrition');
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return theme.colors.success;
    if (score >= 40) return theme.colors.warning;
    return theme.colors.error;
  };

  const scoreValue = todayHealthScore !== null ? todayHealthScore : 0;
  const scoreColor = todayHealthScore !== null ? getScoreColor(scoreValue) : theme.colors.accent;
  const showScore = todayHealthScore !== null;

  const kcalGoal = user?.manualKcalGoal || 2000;
  const consumedKcal = mealLogs.reduce((sum, log) => sum + Number(log.calories), 0);
  const nutritionPercentage = Math.min(100, Math.round((consumedKcal / kcalGoal) * 100)) || 0;

  let compValue = "Aucune";
  let compLabel = "Compétition";
  let compPercentage = 0;
  let compColor = theme.colors.border;

  if (user?.nextCompetitionDate) {
    const compDate = new Date(user.nextCompetitionDate);
    const today = new Date();
    const diffTime = compDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      compValue = "Jour-J !";
      compPercentage = 100;
      compColor = theme.colors.success;
    } else if (diffDays > 0) {
      compValue = `J-${diffDays}`;
      compPercentage = Math.max(5, 100 - (diffDays / 90) * 100); 
      compColor = diffDays <= 7 ? theme.colors.error : theme.colors.warning;
    } else {
      compValue = "Terminée";
      compPercentage = 100;
    }
  }

  return (
    <View style={styles.container}>
      {/* 1. Main Card: Check-In / Readiness */}
      <TouchableOpacity 
        onPress={handleCheckInPress} 
        activeOpacity={0.85} 
        style={[styles.mainCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      >
        {!showScore ? (
          <View style={styles.mainCardInner}>
            <View style={styles.iconCircleAccent}>
              <Feather name="activity" size={22} color="#FFF" />
            </View>
            <View style={styles.mainPillText}>
              <Text style={[styles.mainTitle, { color: theme.colors.text }]}>Faire le Check-In</Text>
              <Text style={[styles.mainSubtitle, { color: theme.colors.textSecondary }]}>Recommandé ce matin</Text>
            </View>
            <View style={styles.actionBadge}>
              <Text style={styles.actionBadgeText}>Commencer</Text>
              <Feather name="arrow-right" size={14} color="#0066FF" />
            </View>
          </View>
        ) : (
          <View style={styles.mainCardInner}>
            <View style={[styles.scoreCircle, { borderColor: scoreColor, backgroundColor: theme.colors.surfaceLight }]}>
              <Text style={[styles.scoreValueText, { color: scoreColor }]}>{scoreValue}</Text>
            </View>
            <View style={styles.mainPillText}>
              <Text style={[styles.mainTitle, { color: theme.colors.text }]}>Forme du jour</Text>
              <Text style={[styles.mainSubtitle, { color: theme.colors.textSecondary }]}>
                {scoreValue >= 70 ? 'Prêt à performer' : scoreValue >= 40 ? 'À surveiller' : 'Repos conseillé'}
              </Text>
            </View>
            <View style={[styles.chevronCircle, { backgroundColor: theme.colors.surfaceLight }]}>
              <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* 2. Secondary Row */}
      <View style={styles.secondaryRow}>
        {/* Nutrition Card (Cliquable avec couverts & libellé) */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={handleNutritionPress}
          style={[styles.secondaryPillWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.smallIconCircle, { backgroundColor: 'rgba(0, 201, 167, 0.12)' }]}>
                <Ionicons name="restaurant" size={16} color="#00C9A7" />
              </View>
              <Text style={[styles.cardHeaderLabel, { color: theme.colors.text }]}>Nutrition</Text>
            </View>
            <Feather name="chevron-right" size={16} color={theme.colors.textMuted} />
          </View>

          <View style={styles.valueRow}>
            <Text style={[styles.secondaryValue, { color: theme.colors.text }]}>
              {Math.round(consumedKcal).toLocaleString('fr-FR')}
            </Text>
            <Text style={[styles.secondaryUnitText, { color: theme.colors.textMuted }]}>
              / {kcalGoal.toLocaleString('fr-FR')} kcal
            </Text>
          </View>

          <View style={styles.progressRow}>
            <View style={[styles.progressBarBg, { backgroundColor: theme.colors.surfaceLight }]}>
              <LinearGradient
                colors={['#00C9A7', '#00DFB6']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${nutritionPercentage}%` }]}
              />
            </View>
            <Text style={[styles.percentBadgeText, { color: theme.colors.textSecondary }]}>
              {nutritionPercentage}%
            </Text>
          </View>
        </TouchableOpacity>

        {/* Competition Card */}
        <View style={[styles.secondaryPillWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.smallIconCircle, { backgroundColor: theme.colors.surfaceLight }]}>
                <Feather name="flag" size={16} color={theme.colors.text} />
              </View>
              <Text style={[styles.cardHeaderLabel, { color: theme.colors.text }]}>Objectif</Text>
            </View>
          </View>

          <View style={styles.valueRow}>
            <Text style={[styles.secondaryValue, { color: theme.colors.text }]}>
              {compValue}
            </Text>
            <Text style={[styles.secondaryUnitText, { color: theme.colors.textMuted }]}>
              {user?.nextCompetitionDate ? 'Compétition' : ''}
            </Text>
          </View>

          <View style={styles.progressRow}>
            <View style={[styles.progressBarBg, { backgroundColor: theme.colors.surfaceLight }]}>
              <View style={[styles.progressBarFill, { width: `${compPercentage}%`, backgroundColor: compColor === theme.colors.border ? theme.colors.textMuted : compColor }]} />
            </View>
            {compPercentage > 0 && (
              <Text style={[styles.percentBadgeText, { color: theme.colors.textSecondary }]}>
                {Math.round(compPercentage)}%
              </Text>
            )}
          </View>
        </View>
      </View>

      <CheckInModal visible={modalVisible} onClose={() => setModalVisible(false)} />
      <CheckInSummaryModal visible={summaryVisible} onClose={() => setSummaryVisible(false)} onEdit={handleEditCheckIn} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 16,
  },
  mainCard: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  mainCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconCircleAccent: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#0066FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  actionBadgeText: {
    color: '#0066FF',
    fontSize: 13,
    fontWeight: '700',
  },
  scoreCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValueText: {
    fontSize: 18,
    fontWeight: '800',
  },
  mainPillText: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  mainSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  secondaryRow: {
    flexDirection: 'row',
    gap: 14,
  },
  secondaryPillWrapper: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 12,
  },
  secondaryValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  secondaryUnitText: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    minWidth: 26,
    textAlign: 'right',
  },
});
