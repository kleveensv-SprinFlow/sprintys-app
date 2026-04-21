import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface ToastProps {
  message: string;
  type?: 'error' | 'success' | 'info';
  onHide?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'error', onHide }) => {
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onHide) onHide();
    });
  }, [message]);

  const getBackgroundColor = () => {
    switch (type) {
      case 'error': return colors.error;
      case 'success': return colors.primary;
      default: return colors.surface;
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, backgroundColor: getBackgroundColor() }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  text: {
    color: '#FFF',
    fontSize: typography.sizes.sm,
    fontWeight: 'bold',
  },
});
