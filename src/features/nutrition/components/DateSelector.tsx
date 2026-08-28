import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useNutritionStore } from '../../../store/nutrition/nutritionStore';

export const DateSelector: React.FC = () => {
  const theme = useTheme();
  const { currentDate, setCurrentDate } = useNutritionStore();

  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(d);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === -1) return "Hier";
    if (diffDays === 1) return "Demain";

    return targetDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handlePrevDay} style={styles.arrowButton}>
        <Feather name="chevron-left" size={24} color={theme.colors.text} />
      </TouchableOpacity>

      <Text style={[styles.dateText, { color: theme.colors.text }]}>
        {formatDateLabel(currentDate)}
      </Text>

      <TouchableOpacity onPress={handleNextDay} style={styles.arrowButton}>
        <Feather name="chevron-right" size={24} color={theme.colors.text} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 20,
    minWidth: 100,
    textAlign: 'center',
  },
  arrowButton: {
    padding: 10,
  }
});
