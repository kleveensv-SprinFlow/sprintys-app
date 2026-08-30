import React, { useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PanResponder, Animated, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../core/theme';
import * as Haptics from 'expo-haptics';

interface MonthlyCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  markedDates?: Date[];
}

const DAYS_OF_WEEK = ['LUN.', 'MAR.', 'MER.', 'JEU.', 'VEN.', 'SAM.', 'DIM.'];
const { width } = Dimensions.get('window');

export const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({ selectedDate, onSelectDate, markedDates = [] }) => {
  const theme = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handleSwipe = (direction: 'left' | 'right') => {
    const toValue = direction === 'left' ? -50 : 50;
    
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue, duration: 150, useNativeDriver: true })
    ]).start(() => {
      if (direction === 'left') {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
      } else {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
      }
      
      slideAnim.setValue(-toValue);
      
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true })
      ]).start();
    });
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Swipe detection using PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only claim the gesture if it's a significant horizontal swipe
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 50) {
          handleSwipe('right');
        } else if (gestureState.dx < -50) {
          handleSwipe('left');
        }
      },
    })
  ).current;

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    let startingDayOfWeek = firstDay.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;
    
    const days = [];
    
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }
    
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }
    
    return days;
  }, [currentMonth]);

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const handleSelectDate = (date: Date) => {
    onSelectDate(date);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (date.getMonth() !== currentMonth.getMonth()) {
      const isNext = date > currentMonth;
      handleSwipe(isNext ? 'left' : 'right');
    }
  };

  const monthNames = [
    'JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN',
    'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE'
  ];

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* Month text */}
      <View style={styles.monthContainer}>
        <Text style={[styles.monthText, { color: theme.colors.text }]}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Text>
      </View>

      {/* Days of Week */}
      <View style={styles.daysOfWeek}>
        {DAYS_OF_WEEK.map((day, index) => (
          <Text 
            key={index} 
            style={[
              styles.dayOfWeekText, 
              { color: index === 6 ? '#E74C3C' : theme.colors.textMuted }
            ]}
          >
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <Animated.View style={[styles.grid, { opacity: opacityAnim, transform: [{ translateX: slideAnim }] }]}>
        {calendarDays.map((item, index) => {
          const isSelected = isSameDay(item.date, selectedDate);
          const hasEvent = markedDates.some(d => isSameDay(d, item.date));
          const isSunday = item.date.getDay() === 0;
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.cell,
                isSelected && { borderColor: theme.colors.text, borderWidth: 1 }
              ]}
              onPress={() => handleSelectDate(item.date)}
            >
              <Text style={[
                styles.dayText,
                { color: item.isCurrentMonth 
                    ? (isSunday ? '#E74C3C' : theme.colors.text) 
                    : theme.colors.border }
              ]}>
                {item.date.getDate()}
              </Text>
              
              {/* Event Icon/Dot at the bottom */}
              {hasEvent && (
                <View style={styles.eventIndicator}>
                  <Feather name="smile" size={16} color={theme.colors.textMuted} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 8,
  },
  monthContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  monthText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  daysOfWeek: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  dayOfWeekText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  cell: {
    width: '14.28%', // 100% / 7
    height: '16.66%', // 100% / 6 rows
    alignItems: 'center',
    paddingTop: 8,
    borderRadius: 12,
    position: 'relative',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '600',
  },
  eventIndicator: {
    position: 'absolute',
    bottom: 8,
  }
});
