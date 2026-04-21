import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PrBadgeProps {
  type?: 'weight' | 'volume' | 'reps';
}

export const PrBadge: React.FC<PrBadgeProps> = ({ type = 'weight' }) => {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>🏆 PR</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#FFD700', // Gold
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  }
});
