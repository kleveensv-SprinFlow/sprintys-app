import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../core/theme';
import { Feather } from '@expo/vector-icons';
import { CheckInModal } from '../../checkin/components/CheckInModal';
import { CheckInSummaryModal } from '../../checkin/components/CheckInSummaryModal';
import { useCheckInStore } from '../../../store/checkInStore';
import { useAuthStore } from '../../../store/authStore';
import { useNutritionStore } from '../../../store/nutrition/nutritionStore';
import { LinearGradient } from 'expo-linear-gradient';

export const AthleteGauges = () => {
  const theme = useTheme();
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
  let compLabel = "CompÃ©tition";
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
      compValue = "TerminÃ©e";
      compPercentage = 100;
    }
  }

  return (
    <View style={styles.container}>
      {/* 1. Main Pill: Check-In / Readiness */}
      <TouchableOpacity onPress={handleCheckInPress} activeOpacity={0.8} style={[styles.mainCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {!showScore ? (
          <LinearGradient
            colors={['#0026AE', '#00DCFD']} // Sprintflow logo gradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientCard}
          >
            <View style={styles.mainPillContent}>
              <View style={styles.iconCircleWhite}>
                <Feather name="activity" size={24} color="#0069E8" />
              </View>
              <View style={styles.mainPillText}>
                <Text style={styles.mainTitleWhite}>Faire le Check-In</Text>
                <Text style={styles.mainSubtitleWhite}>Action matinale requise âœ¨</Text>
              </View>
              <View style={styles.chevronCircle}>
                <Feather name="chevron-right" size={20} color="#FFF" />
              </View>
            </View>
          </LinearGradient>
        ) : (
          <View style={[styles.gradientCard, { padding: 16 }]}>
            <View style={styles.mainPillContent}>
              <View style={[styles.scoreCircle, { borderColor: scoreColor, backgroundColor: theme.colors.surfaceLight }]}>
                <Text style={[styles.scoreValueText, { color: scoreColor }]}>{scoreValue}</Text>
              </View>
              <View style={styles.mainPillText}>
                <Text style={[styles.mainTitle, { color: theme.colors.text }]}>Forme du jour</Text>
                <Text style={[styles.mainSubtitle, { color: theme.colors.textSecondary }]}>
                  {scoreValue >= 70 ? 'PrÃªt Ã  performer âš¡' : scoreValue >= 40 ? 'Ã€ surveiller ðŸ‘€' : 'Repos conseillÃ© ðŸ§˜'}
                </Text>
              </View>
              <View style={[styles.chevronCircle, { backgroundColor: theme.colors.surfaceLight }]}>
                <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* 2. Secondary Row */}
      <View style={styles.secondaryRow}>
        {/* Nutrition */}
        <View style={[styles.secondaryPillWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.secondaryHeader}>
            <View style={[styles.smallIconCircle, { backgroundColor: theme.colors.accentMuted }]}>
              <Feather name="zap" size={16} color={theme.colors.accent} />
            </View>
            <Text style={[styles.secondaryValue, { color: theme.colors.text }]}>
              {Math.round(consumedKcal)} <Text style={{ fontSize: 13, color: theme.colors.textMuted, fontWeight: '500' }}>/ {kcalGoal}</Text>
            </Text>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: theme.colors.surfaceLight }]}>
            <LinearGradient
              colors={['#0069E8', '#00DCFD']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${nutritionPercentage}%` }]}
            />
          </View>
        </View>

        {/* Competition */}
        <View style={[styles.secondaryPillWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.secondaryHeader}>
            <View style={[styles.smallIconCircle, { backgroundColor: theme.colors.surfaceLight }]}>
              <Feather name="flag" size={16} color={theme.colors.text} />
            </View>
            <Text style={[styles.secondaryValue, { color: theme.colors.text }]}>
              {compValue} <Text style={{ fontSize: 13, color: theme.colors.textMuted, fontWeight: '500' }}>- Objectif</Text>
            </Text>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: theme.colors.surfaceLight }]}>
            <View style={[styles.progressBarFill, { width: `${compPercentage}%`, backgroundColor: compColor === theme.colors.border ? theme.colors.textMuted : compColor }]} />
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
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#0026AE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  gradientCard: {
    width: '100%',
    padding: 20,
  },
  mainPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconCircleWhite: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  scoreCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValueText: {
    fontSize: 20,
    fontWeight: '900',
  },
  mainPillText: {
    flex: 1,
  },
  mainTitleWhite: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  mainSubtitleWhite: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  mainSubtitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  secondaryRow: {
    flexDirection: 'row',
    gap: 16,
  },
  secondaryPillWrapper: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  secondaryHeader: {
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 8,
  },
  smallIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 8,
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});

