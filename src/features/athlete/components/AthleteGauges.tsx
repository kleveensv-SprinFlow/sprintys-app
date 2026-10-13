import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../../core/theme';
import { Feather, Ionicons } from '@expo/vector-icons';
import { CheckInModal } from '../../checkin/components/CheckInModal';
import { CheckInSummaryModal } from '../../checkin/components/CheckInSummaryModal';
import { useCheckInStore } from '../../../store/checkInStore';
import { useAuthStore } from '../../../store/authStore';
import { useNutritionStore } from '../../../store/nutrition/nutritionStore';
import { PressableScale } from '../../../shared/components/PressableScale';
import { glassCard, glassFill, DashboardCardHeader } from '../../../shared/components/DashboardCard';
import { useFocusEffect } from '@react-navigation/native';
import { workoutService } from '../../../services/workoutService';
import { GlassSheen } from '../../../shared/components/GlassSheen';

const toLocalDateString = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getCheckInPrompt = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Recommandé ce matin';
  if (hour < 18) return 'Évalue ta forme en 2 min';
  return 'Ton bilan du jour';
};

const NUTRITION_TINT = '#00A88C';
const COMPETITION_TINT = '#B45309';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Apple Fitness-like ring that fills up when the score appears. */
const ScoreRing = ({ score, color, track }: { score: number; color: string; track: string }) => {
  const size = 52;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: Math.max(0, Math.min(100, score)) / 100,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [score]);

  const dashOffset = progress.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
        />
      </Svg>
      <Text style={{ fontSize: 17, fontWeight: '800', color, letterSpacing: -0.4 }}>{score}</Text>
    </View>
  );
};

/** Progress bar that grows from 0 on mount / when the value changes. */
const AnimatedBar = ({ percent, color, track }: { percent: number; color: string; track: string }) => {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: Math.max(0, Math.min(100, percent)),
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [percent]);

  return (
    <View style={[styles.progressBarBg, { backgroundColor: track }]}>
      <Animated.View
        style={[
          styles.progressBarFill,
          {
            backgroundColor: color,
            width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
          },
        ]}
      />
    </View>
  );
};

const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export const AthleteGauges = ({ refreshKey = 0 }: { refreshKey?: number }) => {
  const theme = useTheme();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [summaryVisible, setSummaryVisible] = useState(false);
  
  const { user } = useAuthStore();
  const { startCheckIn, editTodayCheckIn, loadHistory, todayHealthScore } = useCheckInStore();
  const { mealLogs } = useNutritionStore();
  const [nextCompetition, setNextCompetition] = useState<any | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadHistory(user.id);
    }
  }, [user, refreshKey]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      workoutService
        .fetchNextCompetition(user.id)
        .then(setNextCompetition)
        .catch((e) => console.error('Error fetching next competition:', e));
    }, [user?.id, refreshKey])
  );

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
    router.push('/(athlete)/nutrition');
  };

  const handleCompetitionPress = () => {
    if (nextCompetition?.date_prevue) {
      router.push(`/(athlete)/day/${toLocalDateString(new Date(nextCompetition.date_prevue))}`);
    } else {
      router.push('/(athlete)/calendar');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return theme.colors.success;
    if (score >= 40) return theme.colors.warning;
    return theme.colors.error;
  };

  const scoreValue = todayHealthScore !== null ? todayHealthScore : 0;
  const scoreColor = todayHealthScore !== null ? getScoreColor(scoreValue) : theme.colors.accent;
  const showScore = todayHealthScore !== null;

  const kcalGoal = user?.manualKcalGoal || null;
  const consumedKcal = mealLogs.reduce((sum, log) => sum + Number(log.calories), 0);
  const nutritionPercentage = kcalGoal ? Math.round((consumedKcal / kcalGoal) * 100) || 0 : 0;
  const nutritionExceeded = nutritionPercentage > 100;

  let compValue = 'Aucune';
  let compSub = 'Voir mon calendrier';
  let compColor = theme.colors.textMuted;

  if (nextCompetition?.date_prevue) {
    const compDate = new Date(nextCompetition.date_prevue);
    compDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((compDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      compValue = 'Jour J';
      compColor = theme.colors.success;
    } else {
      compValue = `J-${diffDays}`;
      compColor = diffDays <= 7 ? theme.colors.error : theme.colors.warning;
    }

    // CompetitionBuilder stores "<title>\n📍 <location>" in description
    const title = (nextCompetition.description || '').split('\n')[0].trim();
    compSub = title || `${compDate.getDate()} ${MONTHS_SHORT[compDate.getMonth()]}`;
  }

  return (
    <View style={styles.container}>
      {/* 1. Hero card: Check-In / Readiness */}
      <PressableScale onPress={handleCheckInPress} haptic="medium" style={glassCard}>
        <GlassSheen radius={22} />
        {!showScore ? (
          <View style={styles.mainCardInner}>
            <View style={[styles.iconCircleAccent, { backgroundColor: theme.colors.sprintyBlue }]}>
              <Feather name="activity" size={22} color="#FFF" />
            </View>
            <View style={styles.mainPillText}>
              <Text style={[styles.mainTitle, { color: theme.colors.text }]} numberOfLines={1}>Check-in du jour</Text>
              <Text style={[styles.mainSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {getCheckInPrompt()}
              </Text>
            </View>
            <View style={[styles.actionBadge, { backgroundColor: theme.colors.sprintyBlue }]}>
              <Feather name="arrow-right" size={18} color="#FFF" />
            </View>
          </View>
        ) : (
          <View style={styles.mainCardInner}>
            <ScoreRing score={scoreValue} color={scoreColor} track={glassFill} />
            <View style={styles.mainPillText}>
              <Text style={[styles.mainTitle, { color: theme.colors.text }]} numberOfLines={1}>Forme du jour</Text>
              <Text style={[styles.mainSubtitle, { color: scoreColor }]} numberOfLines={1}>
                {scoreValue >= 70 ? 'Prêt à performer' : scoreValue >= 40 ? 'À surveiller' : 'Repos conseillé'}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
          </View>
        )}
      </PressableScale>

      {/* 2. Summary tiles */}
      <View style={styles.secondaryRow}>
        <PressableScale onPress={handleNutritionPress} containerStyle={styles.tileTouch} style={[glassCard, styles.tile]}>
          <GlassSheen radius={22} />
          <DashboardCardHeader
            icon={<Ionicons name="restaurant" size={15} color={NUTRITION_TINT} />}
            label="Nutrition"
            tint={NUTRITION_TINT}
          />

          <View style={styles.valueRow}>
            <Text style={[styles.secondaryValue, { color: theme.colors.text }]}>
              {Math.round(consumedKcal).toLocaleString('fr-FR')}
            </Text>
            <Text style={[styles.secondaryUnitText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {kcalGoal ? `/ ${kcalGoal.toLocaleString('fr-FR')} kcal` : 'kcal'}
            </Text>
          </View>

          {kcalGoal ? (
            <View style={styles.progressRow}>
              <AnimatedBar
                percent={nutritionPercentage}
                color={nutritionExceeded ? theme.colors.warning : NUTRITION_TINT}
                track={glassFill}
              />
              <Text style={[styles.percentBadgeText, { color: nutritionExceeded ? theme.colors.warning : theme.colors.textSecondary }]}>
                {nutritionPercentage}%
              </Text>
            </View>
          ) : (
            <Text style={[styles.cardLinkText, { color: NUTRITION_TINT }]} numberOfLines={1}>
              Définir mon objectif
            </Text>
          )}
        </PressableScale>

        {/* Next competition planned by the coach */}
        <PressableScale onPress={handleCompetitionPress} containerStyle={styles.tileTouch} style={[glassCard, styles.tile]}>
          <GlassSheen radius={22} />
          <DashboardCardHeader
            icon={<Ionicons name="trophy" size={15} color={COMPETITION_TINT} />}
            label="Compétition"
            tint={COMPETITION_TINT}
          />

          <View style={styles.valueRow}>
            <Text style={[styles.secondaryValue, { color: nextCompetition ? compColor : theme.colors.textSecondary }]}>
              {compValue}
            </Text>
          </View>

          <Text
            style={[styles.cardLinkText, { color: nextCompetition ? theme.colors.textSecondary : theme.colors.sprintyBlue }]}
            numberOfLines={1}
          >
            {compSub}
          </Text>
        </PressableScale>
      </View>

      <CheckInModal visible={modalVisible} onClose={() => setModalVisible(false)} />
      <CheckInSummaryModal visible={summaryVisible} onClose={() => setSummaryVisible(false)} onEdit={handleEditCheckIn} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 12,
  },
  mainCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconCircleAccent: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainPillText: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  mainSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },

  secondaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tileTouch: {
    flex: 1,
  },
  tile: {
    flex: 1,
    padding: 14,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 10,
  },
  secondaryValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  secondaryUnitText: {
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardLinkText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
  },
  percentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
