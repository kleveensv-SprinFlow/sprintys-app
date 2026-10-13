import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useNutritionStore, getLocalDateString } from '../../../store/nutrition/nutritionStore';
import { glassSurface } from '../../../core/glass';

interface DateSelectorProps {
  athleteId?: string;
}

export const DateSelector: React.FC<DateSelectorProps> = ({ athleteId }) => {
  const theme = useTheme();
  const { currentDate, setCurrentDate } = useNutritionStore();

  const handlePrevDay = () => {
    const parts = currentDate.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() - 1);
    setCurrentDate(getLocalDateString(d), athleteId);
  };

  const handleNextDay = () => {
    const parts = currentDate.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + 1);
    setCurrentDate(getLocalDateString(d), athleteId);
  };

  const formatDateLabel = (dateStr: string) => {
    const parts = dateStr.split('-').map(Number);
    const targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === -1) return "Hier";
    if (diffDays === 1) return "Demain";

    return targetDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const isToday = currentDate === getLocalDateString(new Date());

  return (
    <View style={styles.container}>
      {/* Glass capsule: previous day · label (tap = back to today) · next day */}
      <View style={[styles.capsule, glassSurface]}>
        <Pressable onPress={handlePrevDay} style={styles.arrowButton} hitSlop={8}>
          <Feather name="chevron-left" size={20} color={theme.colors.text} />
        </Pressable>

        <Pressable
          onPress={() => !isToday && setCurrentDate(getLocalDateString(new Date()), athleteId)}
          style={styles.labelButton}
        >
          <Text style={[styles.dateText, { color: theme.colors.text }]}>{formatDateLabel(currentDate)}</Text>
          {!isToday && <Text style={[styles.todayHint, { color: theme.colors.sprintyBlue }]}>Revenir à aujourd'hui</Text>}
        </Pressable>

        <Pressable onPress={handleNextDay} style={styles.arrowButton} hitSlop={8}>
          <Feather name="chevron-right" size={20} color={theme.colors.text} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 8,
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 4,
    minHeight: 44,
  },
  arrowButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  labelButton: {
    minWidth: 150,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  todayHint: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
});
