import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../core/theme';
import * as Haptics from 'expo-haptics';

interface MonthlyCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  markedDates?: Date[];
}

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({ selectedDate, onSelectDate, markedDates = [] }) => {
  const theme = useTheme();
  
  // Current month being viewed
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  // Generate days for the grid
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Day of the week for the first day (0 = Sun, 1 = Mon, ... 6 = Sat)
    // We want Monday = 0, Sunday = 6
    let startingDayOfWeek = firstDay.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6; // Sunday
    
    const days = [];
    
    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }
    
    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }
    
    // Next month padding to fill 6 rows of 7 days (42 cells)
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }
    
    return days;
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const handleSelectDate = (date: Date) => {
    onSelectDate(date);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // If selecting a date outside current month, change the viewed month
    if (date.getMonth() !== currentMonth.getMonth()) {
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  };

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceLight }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.arrowButton}>
          <Feather name="chevron-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.monthText, { color: theme.colors.text }]}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Text>
        
        <TouchableOpacity onPress={handleNextMonth} style={styles.arrowButton}>
          <Feather name="chevron-right" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Days of Week */}
      <View style={styles.daysOfWeek}>
        {DAYS_OF_WEEK.map((day, index) => (
          <Text key={index} style={[styles.dayOfWeekText, { color: theme.colors.textMuted }]}>
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.grid}>
        {calendarDays.map((item, index) => {
          const isSelected = isSameDay(item.date, selectedDate);
          const isToday = isSameDay(item.date, new Date());
          const hasEvent = markedDates.some(d => isSameDay(d, item.date));
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.cell,
                isSelected && { backgroundColor: theme.colors.accent }
              ]}
              onPress={() => handleSelectDate(item.date)}
            >
              <View style={[
                styles.dayCircle,
                isToday && !isSelected && { backgroundColor: theme.colors.border }
              ]}>
                <Text style={[
                  styles.dayText,
                  { color: item.isCurrentMonth ? theme.colors.text : theme.colors.textMuted },
                  isSelected && { color: '#FFF', fontWeight: 'bold' }
                ]}>
                  {item.date.getDate()}
                </Text>
              </View>
              
              {/* Event Dot */}
              {hasEvent && (
                <View style={[
                  styles.eventDot,
                  { backgroundColor: isSelected ? '#FFF' : theme.colors.accent }
                ]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  arrowButton: {
    padding: 8,
  },
  daysOfWeek: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayOfWeekText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.28%', // 100% / 7
    aspectRatio: 1, // Make it square
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    position: 'relative',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 14,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 4,
  }
});
