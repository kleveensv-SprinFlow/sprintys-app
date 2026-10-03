import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../core/theme';

export interface MetricOption {
  id: string;
  label: string;
  category?: 'sprint' | 'strength' | 'body' | 'wellness';
  count?: number;
}

interface InteractiveMetricPickerProps {
  question?: string;
  options: MetricOption[];
  onSelectOption: (option: MetricOption) => void;
}

export const InteractiveMetricPicker: React.FC<InteractiveMetricPickerProps> = ({
  question = 'De quelle métrique souhaites-tu tracer la courbe ?',
  options,
  onSelectOption,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons name="analytics" size={18} color="#0284C7" />
        <Text style={styles.questionText}>{question}</Text>
      </View>

      <View style={styles.optionsGrid}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={styles.optionBtn}
            activeOpacity={0.7}
            onPress={() => onSelectOption(opt)}
          >
            <View style={styles.btnLeft}>
              <Ionicons
                name={
                  opt.category === 'sprint'
                    ? 'stopwatch-outline'
                    : opt.category === 'strength'
                    ? 'barbell-outline'
                    : opt.category === 'body'
                    ? 'scale-outline'
                    : 'pulse-outline'
                }
                size={16}
                color={theme.colors.accent}
              />
              <Text style={styles.optionLabel}>{opt.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  questionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
    flex: 1,
  },
  optionsGrid: {
    gap: 8,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  btnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
});
