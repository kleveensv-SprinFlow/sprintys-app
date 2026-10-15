import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Animated, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
import { useCheckInStore } from '../../../store/checkInStore';
import { FeedbackHost } from '../../../shared/feedback/FeedbackHost';
import { IconButton } from '../../../shared/components/IconButton';
import { PressableScale } from '../../../shared/components/PressableScale';
import { Tone, checkInStreak, dayAdvice, missingPillars, streakLabel } from '../checkinInsights';
import { intensityColor, painKey } from '../painTaxonomy';
import { zoneById, zoneLabel } from '../bodyZones';

interface Props {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  /** Ouvert juste après l'enregistrement : on le dit et on félicite. */
  justDone?: boolean;
}

const TONE_ICON: Record<Tone, keyof typeof Feather.glyphMap> = { good: 'sun', mid: 'cloud', low: 'battery', alert: 'alert-triangle' };

export const CheckInSummaryModal = ({ visible, onClose, onEdit, justDone }: Props) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { history, todayHealthScore } = useCheckInStore();

  // Success badge (native spring) + gauges fill (JS driver, animates widths)
  const pop = useRef(new Animated.Value(0)).current;
  const fill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    pop.setValue(0);
    fill.setValue(0);
    Animated.parallel([
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 12, delay: 150 }),
      Animated.timing(fill, { toValue: 1, duration: 700, delay: 250, useNativeDriver: false }),
    ]).start();
  }, [visible]);

  // Local calendar day, like the check-in store (UTC would miss late-evening check-ins)
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayCheckIn = history.find(c => c.date === today);

  if (!todayCheckIn) return null;

  const pains = todayCheckIn.pains || [];
  const advice = dayAdvice(todayHealthScore, pains);
  const streak = checkInStreak(history.map((c) => c.date), today);
  const missing = missingPillars(todayCheckIn);
  const toneColor = { good: theme.colors.success, mid: theme.colors.warning, low: theme.colors.error, alert: theme.colors.error }[advice.tone];

  const getScoreColor = (score: number) => {
    if (score >= 70) return theme.colors.success;
    if (score >= 40) return theme.colors.warning;
    return theme.colors.error;
  };

  const overallColor = getScoreColor(todayHealthScore || 0);

  const ScoreGauge = ({ label, score: rawScore, icon }: { label: string, score: number | null | undefined, icon: keyof typeof Feather.glyphMap }) => {
    const answered = rawScore != null;
    const score = rawScore ?? 0;
    const color = answered ? getScoreColor(score) : theme.colors.textMuted;
    const clamped = Math.max(0, Math.min(100, score));
    return (
      <View style={[glassCard, styles.gaugeCard]}>
        <View style={styles.gaugeHeader}>
          <View style={[styles.gaugeIcon, { backgroundColor: theme.colors.glassFill }]}>
            <Feather name={icon} size={16} color={theme.colors.textSecondary} />
          </View>
          <Text style={[styles.gaugeLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
          <Text style={[styles.gaugeScore, { color }]}>
            {answered ? Math.round(score) : 'Non renseigné'}
            {answered &&<Text style={[styles.gaugeScoreMax, { color: theme.colors.textMuted }]}> / 100</Text>}
          </Text>
        </View>
        <View style={[styles.progressBarBg, { backgroundColor: theme.colors.glassFill }]}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: color,
                width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${clamped}%`] }),
              },
            ]}
          />
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <FeedbackHost />
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />
        <View style={[styles.content, { backgroundColor: theme.colors.backdrop, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <IconButton icon="x" onPress={onClose} accessibilityLabel="Fermer" />
            <Text style={[styles.title, { color: theme.colors.text }]}>{justDone ? 'Check-in enregistré' : 'Bilan du jour'}</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={[glassCard, styles.overallContainer]}>
              <View style={styles.ringWrap}>
                <View style={[styles.overallCircle, { borderColor: overallColor }]}>
                  <Text style={[styles.overallScoreText, { color: overallColor }]}>{todayHealthScore}</Text>
                </View>
                <Animated.View
                  style={[
                    styles.checkBadge,
                    { backgroundColor: theme.colors.success, borderColor: theme.colors.surface },
                    { opacity: pop, transform: [{ scale: pop }] },
                  ]}
                >
                  <Feather name="check" size={16} color="#FFFFFF" />
                </Animated.View>
              </View>
              <Text style={[styles.overallTitle, { color: theme.colors.text }]}>Forme du jour</Text>
              <View style={[styles.streakChip, { backgroundColor: theme.colors.sprintyMuted }]}>
                <Feather name="zap" size={13} color={theme.colors.sprintyBlue} />
                <Text style={[styles.streakText, { color: theme.colors.sprintyBlue }]}>{streakLabel(streak)}</Text>
              </View>
            </View>

            <View style={[glassCard, styles.adviceCard]}>
              <View style={[styles.adviceIcon, { backgroundColor: theme.colors.glassFill }]}>
                <Feather name={TONE_ICON[advice.tone]} size={18} color={toneColor} />
              </View>
              <View style={styles.adviceBody}>
                <Text style={[styles.adviceTitle, { color: theme.colors.text }]}>{advice.title}</Text>
                <Text style={[styles.adviceText, { color: theme.colors.textSecondary }]}>{advice.text}</Text>
                {!!missing && <Text style={[styles.adviceNote, { color: theme.colors.textMuted }]}>{missing}</Text>}
              </View>
            </View>

            {pains.length > 0 && (
              <View style={styles.painsBlock}>
                <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Douleurs signalées</Text>
                <View style={styles.painsWrap}>
                  {pains.map((p) => (
                    <View key={painKey(p)} style={[styles.painChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.hairline }]}>
                      <View style={[styles.painDot, { backgroundColor: intensityColor(p.intensity).css }]} />
                      <Text style={[styles.painText, { color: theme.colors.text }]}>
                        {zoneById(p.muscle_id) ? zoneLabel(p.muscle_id, p.side) : p.muscle_name} · {p.intensity}/10
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Détail</Text>
            <View style={styles.gaugesContainer}>
              <ScoreGauge label="Sommeil" score={todayCheckIn.sleep_score} icon="moon" />
              <ScoreGauge label="Physique" score={todayCheckIn.physical_score} icon="activity" />
              <ScoreGauge label="Mental" score={todayCheckIn.mental_score} icon="smile" />
            </View>

            <PressableScale
              haptic="medium"
              style={[styles.editButton, { backgroundColor: theme.colors.sprintyBlue }]}
              accessibilityRole="button"
              onPress={() => {
                onClose();
                onEdit();
              }}
            >
              <Feather name="edit-2" size={18} color="#FFF" />
              <Text style={styles.editButtonText}>Modifier mon check-in</Text>
            </PressableScale>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderCurve: 'continuous',
    maxHeight: '90%',
    paddingTop: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.15)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerSpacer: { width: 38 },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  overallContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 20,
  },
  ringWrap: {
    marginBottom: 14,
  },
  overallCircle: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overallScoreText: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  overallTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  gaugesContainer: {
    gap: 12,
    marginBottom: 24,
  },
  gaugeCard: {
    paddingVertical: 14,
  },
  gaugeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  gaugeIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  gaugeScore: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  gaugeScoreMax: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 16,
    borderCurve: 'continuous',
  },
  editButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  streakChip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  streakText: { fontSize: 13, fontWeight: '700' },
  adviceCard: { flexDirection: 'row', gap: 12, padding: 16, marginBottom: 20 },
  adviceIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  adviceBody: { flex: 1, gap: 4 },
  adviceTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  adviceText: { fontSize: 14, lineHeight: 20 },
  adviceNote: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  painsBlock: { marginBottom: 20 },
  painsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  painChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, minHeight: 34, borderRadius: 12, borderWidth: 1 },
  painDot: { width: 8, height: 8, borderRadius: 4 },
  painText: { fontSize: 13, fontWeight: '600' },
});
