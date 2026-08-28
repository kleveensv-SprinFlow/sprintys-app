import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '../../core/theme';
import * as Haptics from 'expo-haptics';

interface HorizontalCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  markedDates?: Date[];
}

const { width } = Dimensions.get('window');
const DAY_ITEM_WIDTH = 56;
const DAYS_TO_SHOW = 15; // 7 days before, today, 7 days after

export const HorizontalCalendar: React.FC<HorizontalCalendarProps> = ({ selectedDate, onSelectDate, markedDates = [] }) => {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [days, setDays] = useState<Date[]>([]);

  useEffect(() => {
    // Generate days around the currently selected date
    const generatedDays = [];
    for (let i = -7; i <= 7; i++) {
      const d = new Date(selectedDate);
      d.setDate(selectedDate.getDate() + i);
      generatedDays.push(d);
    }
    setDays(generatedDays);
  }, []);

  // When days are loaded, center on the 7th item (today/selected)
  useEffect(() => {
    if (days.length > 0 && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: 7 * DAY_ITEM_WIDTH - (width / 2) + (DAY_ITEM_WIDTH / 2), animated: false });
      }, 50);
    }
  }, [days]);

  const handleSelect = (date: Date, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectDate(date);
    scrollRef.current?.scrollTo({ x: index * DAY_ITEM_WIDTH - (width / 2) + (DAY_ITEM_WIDTH / 2), animated: true });
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  };

  const isMarked = (date: Date) => {
    return markedDates.some(markedDate => isSameDay(date, markedDate));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.monthText, { color: theme.colors.text }]}>
          {getMonthName(selectedDate).charAt(0).toUpperCase() + getMonthName(selectedDate).slice(1)}
        </Text>
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={DAY_ITEM_WIDTH}
      >
        {days.map((date, index) => {
          const isSelected = isSameDay(date, selectedDate);
          const hasMark = isMarked(date);
          const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short' });

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayItem,
                isSelected && { backgroundColor: theme.colors.text }
              ]}
              onPress={() => handleSelect(date, index)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.dayName,
                { color: isSelected ? theme.colors.background : theme.colors.textMuted }
              ]}>
                {dayName.charAt(0).toUpperCase() + dayName.slice(1, 3)}
              </Text>
              <Text style={[
                styles.dayNumber,
                { color: isSelected ? theme.colors.background : theme.colors.text }
              ]}>
                {date.getDate()}
              </Text>
              {hasMark && !isSelected && (
                <View style={[styles.dot, { backgroundColor: theme.colors.accent }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  monthText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 16, // Space on edges
  },
  dayItem: {
    width: DAY_ITEM_WIDTH,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 36,
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 8,
  },
});
