import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../../core/theme';
import { workoutService } from '../../../services/workoutService';
import { useSprintyStore } from '../../../store/sprintyStore';

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
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 16 : 24,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    closeButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    rightPlaceholder: {
      width: 40,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    monthSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    monthSelectorBtn: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
    },
    monthTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      textTransform: 'capitalize',
    },
    weekDays: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    weekDayCell: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      height: 30,
    },
    weekDayText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCellContainer: {
      width: '14.28%', // 100 / 7
      aspectRatio: 1,
      padding: 4,
    },
    dayCell: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20, // Circular
    },
    dayText: {
      fontSize: 14,
      color: theme.colors.text,
    },
    dayTextPast: {
      color: theme.colors.textMuted,
    },
    dayTextSelected: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
    dayCellSelected: {
      backgroundColor: theme.colors.accent,
    },
    dayCellToday: {
      borderWidth: 1,
      borderColor: theme.colors.accent,
    },
    footer: {
      padding: 16,
      paddingBottom: insets.bottom + 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    copyButton: {
      backgroundColor: theme.colors.accent,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: !selectedDate || isSubmitting ? 0.6 : 1,
    },
    copyButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }]}>
      <View style={[styles.container, { flex: 0, height: '90%' }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Copier la séance</Text>
          <View style={styles.rightPlaceholder} />
        </View>

        <View style={styles.content}>
          <View style={styles.monthSelector}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.monthSelectorBtn}>
              <Feather name="chevron-left" size={20} color={theme.colors.text} />
            </TouchableOpacity>
            
            <Text style={styles.monthTitle}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>

            <TouchableOpacity onPress={handleNextMonth} style={styles.monthSelectorBtn}>
              <Feather name="chevron-right" size={20} color={theme.colors.text} />
            </TouchableOpacity>
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
                <TouchableOpacity
                  key={i}
                  style={styles.dayCellContainer}
                  onPress={() => handleSelectDate(date)}
                  disabled={isPast}
                  activeOpacity={0.7}
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
                        isSelected && styles.dayTextSelected,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.copyButton, (!selectedDate || isSubmitting) && { opacity: 0.6 }]}
            onPress={handleCopy}
            disabled={!selectedDate || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.copyButtonText}>Copier</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
