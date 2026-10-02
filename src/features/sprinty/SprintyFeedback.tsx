import React, { useEffect, useRef } from 'react';
import { 
  Animated, 
  Text, 
  StyleSheet, 
  View, 
  Dimensions 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSprintyStore, SprintyStatus } from '../../store/sprintyStore';
import { theme } from '../../core/theme';
import { GlassView } from '../../shared/components/GlassView';
import { GlowView } from '../../shared/components/GlowView';

const { width } = Dimensions.get('window');

export const SprintyFeedback: React.FC = () => {
  const { status, message, isVisible } = useSprintyStore();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'active') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.9,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  useEffect(() => {
    if (isVisible || status === 'active') {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: Math.max(insets.top, 20) + 10,
          useNativeDriver: true,
          tension: 40,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, status, insets.top]);

  if (!isVisible && status === 'idle') return null;

  const getStatusColor = (s: SprintyStatus) => {
    switch (s) {
      case 'success': return '#10B981'; // Emerald 500 for better visibility
      case 'error': return theme.colors.error;
      case 'warning': return theme.colors.warning;
      case 'active': return theme.colors.text;
      case 'info': return '#3B82F6'; // Blue 500
      default: return theme.colors.textSecondary;
    }
  };

  const getBgColor = (s: SprintyStatus) => {
    switch (s) {
      case 'success': return '#D1FAE5'; // Emerald 100
      case 'error': return '#FEE2E2'; // Red 100
      case 'warning': return '#FEF3C7'; // Amber 100
      case 'info': return '#DBEAFE'; // Blue 100
      case 'active': return theme.colors.surface;
      default: return theme.colors.surface;
    }
  };

  const getTextColor = (s: SprintyStatus) => {
    switch (s) {
      case 'success': return '#065F46'; // Emerald 900
      case 'error': return '#991B1B'; // Red 900
      case 'warning': return '#92400E'; // Amber 900
      case 'info': return '#1E3A8A'; // Blue 900
      case 'active': return theme.colors.text;
      default: return theme.colors.text;
    }
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          transform: [
            { translateY: slideAnim },
            { scale: pulseAnim }
          ],
          opacity: opacityAnim 
        }
      ]}
    >
      <View style={[styles.solidContainer, { backgroundColor: getBgColor(status), borderColor: getStatusColor(status) + '40' }]}>
        <View style={styles.content}>
          <View style={[styles.indicator, { backgroundColor: getStatusColor(status) }]} />
          <View style={styles.textContainer}>
            <Text style={[styles.statusLabel, { color: getStatusColor(status) }]}>
              {status === 'active' ? 'ANALYSE EN COURS...' : 
               status === 'info' ? 'INFORMATION' : 
               status.toUpperCase()}
            </Text>
            {message && <Text style={[styles.messageText, { color: getTextColor(status) }]}>{message}</Text>}
            {status === 'active' && !message && (
              <Text style={[styles.messageText, { color: getTextColor(status) }]}>Calcul de vos insights de performance...</Text>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    width: width * 0.9,
    maxWidth: 400,
    zIndex: 9999,
    elevation: 10,
  },
  solidContainer: {
    padding: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    width: 4,
    height: 30,
    borderRadius: 2,
    marginRight: theme.spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  statusLabel: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 1,
    marginBottom: 2,
  },
  messageText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: theme.typography.fontWeights.medium as any,
  },
});
