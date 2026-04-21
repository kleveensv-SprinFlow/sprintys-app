import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
  return <View style={[styles.container, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.glass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    // Note: Expo for web/Android does not support standard CSS backdrop-filter natively 
    // without specific packages (like expo-blur). 
    // For performance and simplicity, we simulate the glass effect with a semi-transparent background 
    // and a subtle border as per the requirements.
  },
});
