import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../core/theme';
import { Feather } from '@expo/vector-icons';
import { CheckInModal } from '../../checkin/components/CheckInModal';
import { useCheckInStore } from '../../../store/checkInStore';
import { useAuthStore } from '../../../store/authStore';
import { useNutritionStore } from '../../../store/nutrition/nutritionStore';

export const AthleteGauges = () => {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  
  const { user } = useAuthStore();
  const { startCheckIn, loadHistory, todayHealthScore } = useCheckInStore();
  const { mealLogs } = useNutritionStore();

  useEffect(() => {
    if (user?.id) {
      loadHistory(user.id);
    }
  }, [user]);

  const handleCheckIn = () => {
    if (user?.id) {
      startCheckIn(user.id);
      setModalVisible(true);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return theme.colors.success;
    if (score >= 40) return theme.colors.warning;
    return theme.colors.error;
  };

  const scoreValue = todayHealthScore !== null ? todayHealthScore : 0;
  const scoreColor = todayHealthScore !== null ? getScoreColor(scoreValue) : theme.colors.border;
  const showScore = todayHealthScore !== null;

  // Calcul Jauge Nutrition
  const kcalGoal = user?.manualKcalGoal || 2000;
  const consumedKcal = mealLogs.reduce((sum, log) => sum + Number(log.calories), 0);
  const nutritionPercentage = Math.min(100, Math.round((consumedKcal / kcalGoal) * 100)) || 0;

  // Calcul Jauge Compétition
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
      compLabel = "Compétition";
      compPercentage = 100;
      compColor = theme.colors.success;
    } else if (diffDays > 0) {
      compValue = `J-${diffDays}`;
      compLabel = "Compétition";
      // La jauge se remplit sur une base de 90 jours (3 mois) environ
      compPercentage = Math.max(5, 100 - (diffDays / 90) * 100); 
      compColor = diffDays <= 7 ? theme.colors.error : theme.colors.warning;
    } else {
      compValue = "Terminée";
      compLabel = "Compétition";
      compPercentage = 100;
      compColor = theme.colors.border;
    }
  }

  return (
    <View style={styles.container}>
      
      {/* 1. Main Pill: Check-In / Readiness */}
      <TouchableOpacity 
        style={[
          styles.mainPill, 
          { backgroundColor: theme.colors.surface, borderColor: showScore ? scoreColor : theme.colors.border }
        ]} 
        onPress={handleCheckIn}
        activeOpacity={0.8}
      >
        {!showScore ? (
          <View style={styles.mainPillContent}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.accent + '20' }]}>
              <Feather name="activity" size={24} color={theme.colors.accent} />
            </View>
            <View style={styles.mainPillText}>
              <Text style={[styles.mainTitle, { color: theme.colors.text }]}>Faire le Check-In</Text>
              <Text style={[styles.mainSubtitle, { color: theme.colors.textMuted }]}>Évalue ta forme du jour</Text>
            </View>
            <Feather name="chevron-right" size={24} color={theme.colors.textMuted} />
          </View>
        ) : (
          <View style={styles.mainPillContent}>
            <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
              <Text style={[styles.scoreValueText, { color: scoreColor }]}>{scoreValue}</Text>
            </View>
            <View style={styles.mainPillText}>
              <Text style={[styles.mainTitle, { color: theme.colors.text }]}>Forme du jour</Text>
              <Text style={[styles.mainSubtitle, { color: theme.colors.textMuted }]}>
                {scoreValue >= 70 ? 'Prêt à performer' : scoreValue >= 40 ? 'À surveiller' : 'Repos conseillé'}
              </Text>
            </View>
            <Feather name="edit-2" size={20} color={theme.colors.textMuted} />
          </View>
        )}
      </TouchableOpacity>

      {/* 2. Secondary Pills Row */}
      <View style={styles.secondaryRow}>
        
        {/* Nutrition Pill */}
        <View style={[styles.secondaryPill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.secondaryHeader}>
            <View style={styles.secondaryTitleRow}>
              <Feather name="zap" size={14} color={theme.colors.accent} />
              <Text style={[styles.secondaryTitle, { color: theme.colors.textSecondary }]}>Nutrition</Text>
            </View>
            <Text style={[styles.secondaryValue, { color: theme.colors.text, fontSize: 13 }]}>{Math.round(consumedKcal)}/{kcalGoal} kcal</Text>
          </View>
          {/* Progress Bar */}
          <View style={[styles.progressBarBg, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.progressBarFill, { width: `${nutritionPercentage}%`, backgroundColor: theme.colors.accent }]} />
          </View>
        </View>

        {/* Competition Pill */}
        <View style={[styles.secondaryPill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.secondaryHeader}>
            <View style={styles.secondaryTitleRow}>
              <Feather name="flag" size={14} color={compColor} />
              <Text style={[styles.secondaryTitle, { color: theme.colors.textSecondary }]}>{compLabel}</Text>
            </View>
            <Text style={[styles.secondaryValue, { color: theme.colors.text }]}>{compValue}</Text>
          </View>
          {/* Progress Bar */}
          <View style={[styles.progressBarBg, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.progressBarFill, { width: `${compPercentage}%`, backgroundColor: compColor }]} />
          </View>
        </View>

      </View>

      <CheckInModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12, // Espace entre la grosse pilule et la ligne du bas
  },
  
  // Main Pill
  mainPill: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  mainPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValueText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  mainPillText: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  mainSubtitle: {
    fontSize: 13,
  },

  // Secondary Row
  secondaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryPill: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  secondaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  secondaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secondaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  secondaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Progress Bars
  progressBarBg: {
    height: 6,
    width: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
