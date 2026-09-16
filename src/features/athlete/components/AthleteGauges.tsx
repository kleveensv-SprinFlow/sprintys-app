import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../core/theme';
import { Feather } from '@expo/vector-icons';
import { CheckInModal } from '../../checkin/components/CheckInModal';
import { CheckInSummaryModal } from '../../checkin/components/CheckInSummaryModal';
import { useCheckInStore } from '../../../store/checkInStore';
import { useAuthStore } from '../../../store/authStore';
import { useNutritionStore } from '../../../store/nutrition/nutritionStore';
import { BlurView } from 'expo-blur';

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
  let compLabel = "Compétition";
  let compPercentage = 0;
  let compColor = 'rgba(255,255,255,0.2)';

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
      {/* 1. Main Pill: Check-In / Readiness */}
      <TouchableOpacity onPress={handleCheckInPress} activeOpacity={0.8} style={styles.cardWrapper}>
        {/* Glow Effect behind the main card if action needed */}
        {!showScore && <View style={[styles.glowBackground, { backgroundColor: theme.colors.accent }]} />}
        
        <BlurView intensity={30} tint="dark" style={[styles.glassCard, { borderColor: showScore ? scoreColor : theme.colors.accent }]}>
          {!showScore ? (
            <View style={styles.mainPillContent}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.accent }]}>
                <Feather name="activity" size={24} color="#FFF" />
              </View>
              <View style={styles.mainPillText}>
                <Text style={[styles.mainTitle, { color: theme.colors.text }]}>Faire le Check-In</Text>
                <Text style={[styles.mainSubtitle, { color: theme.colors.accent }]}>Action requise 🔥</Text>
              </View>
              <Feather name="chevron-right" size={24} color={theme.colors.textSecondary} />
            </View>
          ) : (
            <View style={styles.mainPillContent}>
              <View style={[styles.scoreCircle, { borderColor: scoreColor, shadowColor: scoreColor }]}>
                <Text style={[styles.scoreValueText, { color: scoreColor }]}>{scoreValue}</Text>
              </View>
              <View style={styles.mainPillText}>
                <Text style={[styles.mainTitle, { color: theme.colors.text }]}>Forme du jour</Text>
                <Text style={[styles.mainSubtitle, { color: theme.colors.textSecondary }]}>
                  {scoreValue >= 70 ? 'Prêt à performer ⚡' : scoreValue >= 40 ? 'À surveiller 👀' : 'Repos conseillé 🧘'}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
            </View>
          )}
        </BlurView>
      </TouchableOpacity>

      {/* 2. Secondary Row */}
      <View style={styles.secondaryRow}>
        {/* Nutrition */}
        <View style={styles.secondaryPillWrapper}>
          <BlurView intensity={20} tint="dark" style={styles.secondaryGlassCard}>
            <View style={styles.secondaryHeader}>
              <View style={[styles.smallIconCircle, { backgroundColor: 'rgba(255, 87, 34, 0.2)' }]}>
                <Feather name="zap" size={16} color={theme.colors.accent} />
              </View>
              <Text style={[styles.secondaryValue, { color: theme.colors.text }]}>
                {Math.round(consumedKcal)} <Text style={{ fontSize: 12, color: theme.colors.textSecondary, fontWeight: 'normal' }}>/ {kcalGoal}</Text>
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${nutritionPercentage}%`, backgroundColor: theme.colors.accent }]} />
            </View>
          </BlurView>
        </View>

        {/* Competition */}
        <View style={styles.secondaryPillWrapper}>
          <BlurView intensity={20} tint="dark" style={styles.secondaryGlassCard}>
            <View style={styles.secondaryHeader}>
              <View style={[styles.smallIconCircle, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
                <Feather name="flag" size={16} color={theme.colors.text} />
              </View>
              <Text style={[styles.secondaryValue, { color: theme.colors.text }]}>
                {compValue} <Text style={{ fontSize: 12, color: theme.colors.textSecondary, fontWeight: 'normal' }}>- Objectif</Text>
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${compPercentage}%`, backgroundColor: compColor }]} />
            </View>
          </BlurView>
        </View>
      </View>

      <CheckInModal visible={modalVisible} onClose={() => setModalVisible(false)} />
      <CheckInSummaryModal visible={summaryVisible} onClose={() => setSummaryVisible(false)} onEdit={handleEditCheckIn} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 16,
  },
  cardWrapper: {
    width: '100%',
    position: 'relative',
  },
  glowBackground: {
    position: 'absolute',
    top: 5,
    left: 10,
    right: 10,
    bottom: 5,
    borderRadius: 24,
    opacity: 0.15,
    filter: 'blur(20px)', // Web/New RN prop for intense shadow glow
    shadowColor: '#FF5722',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  glassCard: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  mainPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF5722',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  scoreCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  scoreValueText: {
    fontSize: 20,
    fontWeight: '900',
  },
  mainPillText: {
    flex: 1,
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

  secondaryRow: {
    flexDirection: 'row',
    gap: 16,
  },
  secondaryPillWrapper: {
    flex: 1,
  },
  secondaryGlassCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  secondaryHeader: {
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 8,
  },
  smallIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 6,
    width: '100%',
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
