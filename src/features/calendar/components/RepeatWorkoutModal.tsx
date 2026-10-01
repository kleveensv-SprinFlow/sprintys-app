import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../../core/theme';
import { workoutService } from '../../../services/workoutService';
import { useSprintyStore } from '../../../store/sprintyStore';

interface RepeatWorkoutModalProps {
  visible: boolean;
  onClose: () => void;
  workout: any;
  onRepeated: () => void;
}

const DAYS = [
  { label: 'Lun', value: 1 },
  { label: 'Mar', value: 2 },
  { label: 'Mer', value: 3 },
  { label: 'Jeu', value: 4 },
  { label: 'Ven', value: 5 },
  { label: 'Sam', value: 6 },
  { label: 'Dim', value: 0 },
];

const WEEKS = [2, 4, 6, 8, 12];

export const RepeatWorkoutModal: React.FC<RepeatWorkoutModalProps> = ({
  visible,
  onClose,
  workout,
  onRepeated,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const showFeedback = useSprintyStore((state) => state.showFeedback);

  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedWeeks, setSelectedWeeks] = useState<number>(4);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && workout) {
      let day = new Date().getDay();
      
      // Try to parse the workout date to pre-select its day
      if (workout.date) {
        const parsed = new Date(workout.date);
        if (!isNaN(parsed.getTime())) day = parsed.getDay();
      } else if (workout.plannedDate) {
        const parsed = new Date(workout.plannedDate);
        if (!isNaN(parsed.getTime())) day = parsed.getDay();
      }
      
      setSelectedDays([day]);
      setSelectedWeeks(4);
    }
  }, [visible, workout]);

  const toggleDay = (dayValue: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDays(prev => {
      if (prev.includes(dayValue)) {
        // Prevent deselecting the last day to always have at least one day
        if (prev.length === 1) return prev;
        return prev.filter(d => d !== dayValue);
      } else {
        return [...prev, dayValue].sort((a, b) => {
          // Sort visually based on Monday-start (1-6, 0)
          const valA = a === 0 ? 7 : a;
          const valB = b === 0 ? 7 : b;
          return valA - valB;
        });
      }
    });
  };

  const selectWeeks = (weeks: number) => {
    Haptics.selectionAsync();
    setSelectedWeeks(weeks);
  };

  const handlePlanifier = async () => {
    if (selectedDays.length === 0) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    
    try {
      const copiesCreated = await workoutService.repeatWorkout(workout, selectedDays, selectedWeeks);
      showFeedback('success', `${copiesCreated} séances planifiées avec succès.`);
      onRepeated();
      onClose();
    } catch (error) {
      console.error('Failed to repeat workout:', error);
      showFeedback('error', "Une erreur s'est produite lors de la planification.");
    } finally {
      setLoading(false);
    }
  };

  const copiesCount = selectedDays.length * selectedWeeks;

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={[styles.title, { color: theme.colors.text }]}>Répéter la séance</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={24} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Days Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Jours de la semaine</Text>
            <View style={styles.daysRow}>
              {DAYS.map((day) => {
                const isSelected = selectedDays.includes(day.value);
                return (
                  <TouchableOpacity
                    key={day.value}
                    activeOpacity={0.7}
                    style={[
                      styles.dayButton,
                      { backgroundColor: theme.colors.surface },
                      isSelected && { backgroundColor: theme.colors.accent },
                    ]}
                    onPress={() => toggleDay(day.value)}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { color: theme.colors.textMuted },
                        isSelected && { color: '#FFFFFF', fontWeight: 'bold' },
                      ]}
                    >
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Weeks Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Durée</Text>
            <View style={styles.weeksRow}>
              {WEEKS.map((week) => {
                const isSelected = selectedWeeks === week;
                return (
                  <TouchableOpacity
                    key={week}
                    activeOpacity={0.7}
                    style={[
                      styles.weekPill,
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                      isSelected && { 
                        backgroundColor: `${theme.colors.accent}15`, 
                        borderColor: theme.colors.accent 
                      },
                    ]}
                    onPress={() => selectWeeks(week)}
                  >
                    <Text
                      style={[
                        styles.weekText,
                        { color: theme.colors.text },
                        isSelected && { color: theme.colors.accent, fontWeight: 'bold' },
                      ]}
                    >
                      {week} sem
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Preview / Info */}
          <View style={[styles.infoContainer, { backgroundColor: `${theme.colors.accent}15` }]}>
            <Feather name="info" size={20} color={theme.colors.accent} style={styles.infoIcon} />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>
              La séance sera copiée sur <Text style={styles.infoTextHighlight}>{copiesCount} dates</Text>. 
              {'\n'}Elle apparaîtra dans votre calendrier aux jours sélectionnés pour les {selectedWeeks} prochaines semaines.
            </Text>
          </View>
        </ScrollView>

        <View style={[
          styles.footer, 
          { 
            paddingBottom: Math.max(insets.bottom, 24), 
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.background
          }
        ]}>
          <TouchableOpacity
            style={[
              styles.submitButton, 
              { backgroundColor: theme.colors.accent }, 
              (loading || selectedDays.length === 0) && { opacity: 0.6 }
            ]}
            onPress={handlePlanifier}
            disabled={loading || selectedDays.length === 0}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Planifier</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  weeksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  weekPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  weekText: {
    fontSize: 15,
    fontWeight: '500',
  },
  infoContainer: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  infoIcon: {
    marginTop: 2,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },
  infoTextHighlight: {
    fontWeight: 'bold',
  },
  footer: {
    paddingTop: 16,
    paddingHorizontal: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  submitButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
