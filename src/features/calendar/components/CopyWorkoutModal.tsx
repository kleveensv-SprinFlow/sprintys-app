import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../../core/theme';
import { workoutService } from '../../../services/workoutService';
import { useSprintyStore } from '../../../store/sprintyStore';
import { FeedbackHost } from '../../../shared/feedback/FeedbackHost';
import { glassCard } from '../../../core/glass';
import { IconButton } from '../../../shared/components/IconButton';
import { PressableScale } from '../../../shared/components/PressableScale';
import { Button } from '../../../shared/components/Button';

interface CopyWorkoutModalProps {
  visible: boolean;
  onClose: () => void;
  workout: any;
  onCopied: () => void;
}

export const CopyWorkoutModal: React.FC<CopyWorkoutModalProps> = ({
  visible,
  onClose,
  workout,
  onCopied,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const showFeedback = useSprintyStore((state) => state.showFeedback);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setCurrentMonth(new Date());
      setSelectedDate(new Date());
    }
  }, [visible]);

  // Calendar logic
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const handlePrevMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleSelectDate = (date: Date) => {
    if (date.getTime() < today.getTime()) return; // Prevent selecting past days
    Haptics.selectionAsync();
    setSelectedDate(date);
  };

  const handleCopy = async () => {
    if (!selectedDate || !workout) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);
    
    try {
      await workoutService.duplicateWorkout(workout, selectedDate);
      showFeedback('success', 'Séance copiée avec succès');
      onCopied();
      onClose();
    } catch (error) {
      console.error('Error duplicating workout:', error);
      showFeedback('error', 'Erreur lors de la copie de la séance');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // JS getDay(): 0 = Sun, 1 = Mon... We want 0 = Mon... 6 = Sun
    const firstDayIndex = (firstDay.getDay() + 6) % 7;
    const daysInMonth = lastDay.getDate();
    
    const days = [];
    
    // Padding for previous month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    
    // Actual days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  }, [currentMonth]);

  const isSameDay = (d1: Date | null, d2: Date) => {
    if (!d1) return false;
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.backdrop,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 14 : 20,
      paddingBottom: 12,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.3,
      color: theme.colors.text,
    },
    rightPlaceholder: {
      width: 38,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    subtitle: {
      fontSize: 15,
      lineHeight: 21,
      color: theme.colors.textSecondary,
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    calendarCard: {
      ...glassCard,
    },
    monthSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    monthTitle: {
      fontSize: 17,
      fontWeight: '800',
      letterSpacing: -0.3,
      color: theme.colors.text,
      textTransform: 'capitalize',
    },
    weekDays: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    weekDayCell: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      height: 28,
    },
    weekDayText: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.6,
      color: theme.colors.textSecondary,
    },
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCellContainer: {
      width: '14.28%', // 100 / 7
      aspectRatio: 1,
    },
    dayCellInner: {
      flex: 1,
      padding: 3,
    },
    dayCell: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
    },
    dayText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
    },
    dayTextPast: {
      color: theme.colors.textMuted,
      fontWeight: '500',
    },
    dayTextToday: {
      color: theme.colors.sprintyBlue,
      fontWeight: '800',
    },
    dayTextSelected: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    dayCellSelected: {
      backgroundColor: theme.colors.sprintyBlue,
    },
    dayCellToday: {
      backgroundColor: 'rgba(0, 105, 232, 0.1)',
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: insets.bottom + 16,
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <FeedbackHost />
      <View style={styles.container}>
        <View style={styles.header}>
          <IconButton icon="x" onPress={onClose} accessibilityLabel="Fermer" />
          <Text style={styles.headerTitle}>Copier la séance</Text>
          <View style={styles.rightPlaceholder} />
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>Choisis le jour où planifier une copie de cette séance.</Text>

          <View style={styles.calendarCard}>
            <View style={styles.monthSelector}>
              <IconButton icon="chevron-left" onPress={handlePrevMonth} accessibilityLabel="Mois précédent" />

              <Text style={styles.monthTitle}>
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </Text>

              <IconButton icon="chevron-right" onPress={handleNextMonth} accessibilityLabel="Mois suivant" />
            </View>

            <View style={styles.weekDays}>
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                <View key={i} style={styles.weekDayCell}>
                  <Text style={styles.weekDayText}>{day}</Text>
                </View>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarDays.map((date, i) => {
                if (!date) {
                  return <View key={`empty-${i}`} style={styles.dayCellContainer} />;
                }

                const isPast = date.getTime() < today.getTime();
                const isSelected = isSameDay(selectedDate, date);
                const isToday = isSameDay(today, date);

                return (
                  <PressableScale
                    key={i}
                    containerStyle={styles.dayCellContainer}
                    style={styles.dayCellInner}
                    onPress={() => handleSelectDate(date)}
                    disabled={isPast}
                    haptic="none"
                    activeScale={0.9}
                    accessibilityRole="button"
                    accessibilityLabel={date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    accessibilityState={{ selected: isSelected, disabled: isPast }}
                  >
                    <View
                      style={[
                        styles.dayCell,
                        isToday && !isSelected && styles.dayCellToday,
                        isSelected && styles.dayCellSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isPast && styles.dayTextPast,
                          isToday && !isSelected && styles.dayTextToday,
                          isSelected && styles.dayTextSelected,
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title="Copier"
            onPress={handleCopy}
            loading={isSubmitting}
            disabled={!selectedDate}
          />
        </View>
      </View>
    </Modal>
  );
};
