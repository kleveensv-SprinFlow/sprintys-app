import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { tourRef } from '../../onboarding/tourRegistry';
import { isMinorAthlete } from '../../../legal/age';
import { MEALS } from '../../nutrition/nutritionTheme';
import { useToday } from '../../../shared/hooks/useToday';

const toLocalDateString = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getCheckInPrompt = () => (new Date().getHours() < 18 ? 'Ta forme en 2 minutes' : 'Ton bilan du jour');

/**
 * Readiness wording: a description of the score the athlete entered, never advice that sounds medical
 * (« Repos conseillé » read like a prescription).
 */
const formeLabel = (score: number) => (score >= 70 ? 'Bonne forme' : score >= 40 ? 'Forme moyenne' : 'Forme basse · écoute ton corps');

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

/** The daily action, first on the home: check-in, or today's readiness once it is done. */
export const CheckInCard = ({ refreshKey = 0 }: { refreshKey?: number }) => {
  const theme = useTheme();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [summaryVisible, setSummaryVisible] = useState(false);
  const userId = useAuthStore((s) => s.user?.id);
  const { startCheckIn, editTodayCheckIn, loadHistory, todayHealthScore, historyLoaded } = useCheckInStore();
  const [justDone, setJustDone] = useState(false);

  // Ouvert depuis le rappel du check-in (`/(athlete)?checkin=1`) : on lance directement le check-in, ou le bilan s'il est fait
  const params = useLocalSearchParams<{ checkin?: string }>();
  const autoOpened = useRef(false);
  useEffect(() => {
    if (params.checkin !== '1' || autoOpened.current || !historyLoaded || !userId) return;
    autoOpened.current = true;
    router.setParams({ checkin: undefined });
    if (todayHealthScore !== null) {
      setJustDone(false);
      setSummaryVisible(true);
    } else {
      startCheckIn(userId);
      setModalVisible(true);
    }
  }, [params.checkin, historyLoaded, todayHealthScore, userId]);

  useEffect(() => {
    if (userId) loadHistory(userId);
  }, [userId, refreshKey]);

  // Après l'enregistrement : le bilan s'ouvre une fois la fenêtre du check-in refermée (iOS refuse deux fenêtres à la fois)
  const onCheckInDone = () => {
    setJustDone(true);
    setTimeout(() => setSummaryVisible(true), 450);
  };

  const handlePress = () => {
    if (!userId) return;
    if (todayHealthScore !== null) {
      setSummaryVisible(true);
    } else {
      startCheckIn(userId);
      setModalVisible(true);
    }
  };

  const handleEdit = () => {
    if (!userId) return;
    editTodayCheckIn(userId);
    // Android : deux Modal qui se ferment/s'ouvrent dans le même tick donnent une étape vide
    setTimeout(() => setModalVisible(true), 450);
  };

  const showScore = todayHealthScore !== null;
  const scoreValue = todayHealthScore ?? 0;
  const scoreColor = !showScore
    ? theme.colors.accent
    : scoreValue >= 70
      ? theme.colors.success
      : scoreValue >= 40
        ? theme.colors.warning
        : theme.colors.error;

  return (
    <View style={styles.container}>
      <PressableScale
        onPress={handlePress}
        haptic="medium"
        style={glassCard}
        targetRef={tourRef('athlete.checkin')}
        accessibilityRole="button"
        accessibilityLabel={showScore ? `Forme du jour : ${scoreValue} sur 100, ${formeLabel(scoreValue)}. Voir le bilan.` : 'Faire le check-in du jour'}
      >
        <GlassSheen radius={22} />
        {!showScore ? (
          <View style={styles.mainCardInner}>
            <View style={[styles.iconCircleAccent, { backgroundColor: theme.colors.sprintyBlue }]}>
              <Feather name="activity" size={22} color={theme.colors.onAccent} />
            </View>
            <View style={styles.mainPillText}>
              <Text style={[styles.mainTitle, { color: theme.colors.text }]} numberOfLines={1}>Check-in du jour</Text>
              <Text style={[styles.mainSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {getCheckInPrompt()}
              </Text>
            </View>
            <View style={[styles.actionBadge, { backgroundColor: theme.colors.sprintyBlue }]}>
              <Feather name="arrow-right" size={18} color={theme.colors.onAccent} />
            </View>
          </View>
        ) : (
          <View style={styles.mainCardInner}>
            <ScoreRing score={scoreValue} color={scoreColor} track={glassFill} />
            <View style={styles.mainPillText}>
              <Text style={[styles.mainTitle, { color: theme.colors.text }]} numberOfLines={1}>Forme du jour</Text>
              <Text style={[styles.mainSubtitle, { color: scoreColor }]} numberOfLines={1}>
                {formeLabel(scoreValue)}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
          </View>
        )}
      </PressableScale>

      <CheckInModal visible={modalVisible} onClose={() => setModalVisible(false)} onDone={onCheckInDone} />
      <CheckInSummaryModal
        visible={summaryVisible}
        justDone={justDone}
        onClose={() => {
          setSummaryVisible(false);
          setJustDone(false);
        }}
        onEdit={handleEdit}
      />
    </View>
  );
};

/**
 * Two glanceable tiles: nutrition and, when the coach planned one, the next competition.
 * Before 18 the nutrition tile counts meals instead of calories (same rule as the Nutrition tab).
 */
export const SummaryTiles = ({ refreshKey = 0 }: { refreshKey?: number }) => {
  const theme = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const mealLogs = useNutritionStore((s) => s.mealLogs);
  const today = useToday();
  const [nextCompetition, setNextCompetition] = useState<{ date_prevue: string; description?: string | null } | null>(null);
  const isMinor = isMinorAthlete(user);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      workoutService
        .fetchNextCompetition(user.id)
        .then(setNextCompetition)
        .catch((e) => console.error('Error fetching next competition:', e));
    }, [user?.id, refreshKey])
  );

  const openCompetition = () => {
    if (nextCompetition?.date_prevue) router.push(`/(athlete)/day/${toLocalDateString(new Date(nextCompetition.date_prevue))}`);
    else router.push('/(athlete)/calendar');
  };

  // Nutrition: calories against the goal (adults), meals logged (minors)
  const kcalGoal = isMinor ? null : user?.manualKcalGoal || null;
  const consumedKcal = mealLogs.reduce((sum, log) => sum + Number(log.calories), 0);
  const nutritionPercentage = kcalGoal ? Math.round((consumedKcal / kcalGoal) * 100) || 0 : 0;
  const nutritionExceeded = nutritionPercentage > 100;
  const mealsLogged = new Set(mealLogs.map((l) => l.meal_type)).size;
  const nutritionLabel = isMinor
    ? `Nutrition : ${mealsLogged} repas sur ${MEALS.length} notés aujourd’hui`
    : kcalGoal
      ? `Nutrition : ${Math.round(consumedKcal)} kilocalories sur ${kcalGoal}`
      : `Nutrition : ${Math.round(consumedKcal)} kilocalories aujourd’hui`;

  let compValue = '';
  let compSub = '';
  if (nextCompetition?.date_prevue) {
    const compDate = new Date(nextCompetition.date_prevue);
    compDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((compDate.getTime() - today.getTime()) / 86400000);
    compValue = diffDays <= 0 ? 'Jour J' : `J-${diffDays}`;
    // CompetitionBuilder stores "<title>\n📍 <location>" in description
    const title = (nextCompetition.description || '').split('\n')[0].trim();
    compSub = title || `${compDate.getDate()} ${MONTHS_SHORT[compDate.getMonth()]}`;
  }

  return (
    <View style={[styles.container, styles.secondaryRow]}>
      <PressableScale
        onPress={() => router.push('/(athlete)/nutrition')}
        containerStyle={styles.tileTouch}
        style={[glassCard, styles.tile]}
        accessibilityRole="button"
        accessibilityLabel={nutritionLabel}
      >
        <GlassSheen radius={22} />
        <DashboardCardHeader icon={<Ionicons name="restaurant" size={15} color={theme.colors.nutrition} />} label="Nutrition" tint={theme.colors.nutrition} />
        {isMinor ? (
          <>
            <View style={styles.valueRow}>
              <Text style={[styles.secondaryValue, { color: theme.colors.text }]}>{mealsLogged}</Text>
              <Text style={[styles.secondaryUnitText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                / {MEALS.length} repas
              </Text>
            </View>
            <Text style={[styles.cardLinkText, { color: theme.colors.nutrition }]} numberOfLines={1}>
              {mealsLogged ? 'Voir mes repas' : 'Noter un repas'}
            </Text>
          </>
        ) : (
          <>
            <View style={styles.valueRow}>
              <Text style={[styles.secondaryValue, { color: theme.colors.text }]}>{Math.round(consumedKcal).toLocaleString('fr-FR')}</Text>
              <Text style={[styles.secondaryUnitText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {kcalGoal ? `/ ${kcalGoal.toLocaleString('fr-FR')} kcal` : 'kcal'}
              </Text>
            </View>
            {kcalGoal ? (
              <View style={styles.progressRow}>
                <AnimatedBar percent={nutritionPercentage} color={nutritionExceeded ? theme.colors.warning : theme.colors.nutrition} track={glassFill} />
                <Text style={[styles.percentBadgeText, { color: nutritionExceeded ? theme.colors.warning : theme.colors.textSecondary }]}>
                  {nutritionPercentage}%
                </Text>
              </View>
            ) : (
              <Text style={[styles.cardLinkText, { color: theme.colors.nutrition }]} numberOfLines={1}>
                Définir mon objectif
              </Text>
            )}
          </>
        )}
      </PressableScale>

      {/* Next competition planned by the coach: one steady color, the countdown is the message */}
      {!!nextCompetition && (
        <PressableScale
          onPress={openCompetition}
          containerStyle={styles.tileTouch}
          style={[glassCard, styles.tile]}
          accessibilityRole="button"
          accessibilityLabel={`Prochaine compétition : ${compSub}, ${compValue === 'Jour J' ? 'aujourd’hui' : `dans ${compValue.slice(2)} jours`}`}
        >
          <GlassSheen radius={22} />
          <DashboardCardHeader icon={<Ionicons name="trophy" size={15} color={theme.colors.competition} />} label="Compétition" tint={theme.colors.competition} />
          <View style={styles.valueRow}>
            <Text style={[styles.secondaryValue, { color: compValue === 'Jour J' ? theme.colors.success : theme.colors.competition }]}>{compValue}</Text>
          </View>
          <Text style={[styles.cardLinkText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {compSub}
          </Text>
        </PressableScale>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 4,
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
