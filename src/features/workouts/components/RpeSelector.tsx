import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface RpeSelectorProps {
  value?: number;
  onChange: (rpe: number) => void;
}

const RPE_VALUES = [6, 7, 8, 9, 10];

export const RpeSelector: React.FC<RpeSelectorProps> = ({ value, onChange }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>RPE (Rate of Perceived Exertion)</Text>
      <View style={styles.row}>
        {RPE_VALUES.map((rpe) => (
          <TouchableOpacity
            key={rpe}
            style={[styles.rpeBtn, value === rpe && styles.rpeBtnSelected]}
            onPress={() => onChange(rpe)}
          >
            <Text style={[styles.rpeText, value === rpe && styles.rpeTextSelected]}>
              {rpe}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  label: {
    color: '#aaa',
    marginBottom: 8,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rpeBtn: {
    backgroundColor: '#222',
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rpeBtnSelected: {
    backgroundColor: '#ff4444',
  },
  rpeText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  rpeTextSelected: {
    color: '#fff',
  },
});
