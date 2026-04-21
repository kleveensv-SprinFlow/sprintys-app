import React, { useEffect, useRef } from 'react';
import { 
  Animated, 
  Text, 
  StyleSheet, 
  View, 
  Dimensions 
} from 'react-native';
import { useSprintyStore, SprintyStatus } from '../../store/sprintyStore';
import { theme } from '../../core/theme';
import { GlassView } from '../../shared/components/GlassView';
import { GlowView } from '../../shared/components/GlowView';

const { width } = Dimensions.get('window');

export const SprintyFeedback: React.FC = () => {
  const { status, message, isVisible } = useSprintyStore();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'active') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
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
          toValue: 20,
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
  }, [isVisible, status]);

  if (!isVisible && status === 'idle') return null;

  const getStatusColor = (s: SprintyStatus) => {
    switch (s) {
      case 'success': return theme.colors.accent;
      case 'error': return theme.colors.error;
      case 'warning': return theme.colors.warning;
      case 'active': return theme.colors.text;
      default: return theme.colors.textSecondary;
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
      <GlowView variant={status === 'success' ? 'gold' : 'surface'}>
        <GlassView style={styles.glassContainer}>
          <View style={styles.content}>
            <View style={[styles.indicator, { backgroundColor: getStatusColor(status) }]} />
            <View style={styles.textContainer}>
              <Text style={styles.statusLabel}>
                {status === 'active' ? 'ANALYSE EN COURS...' : status.toUpperCase()}
              </Text>
              {message && <Text style={styles.messageText}>{message}</Text>}
              {status === 'active' && !message && (
                <Text style={styles.messageText}>Calcul de vos insights de performance...</Text>
              )}
            </View>
          </View>
        </GlassView>
      </GlowView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50, // Below potential status bar
    right: 20,
    width: width * 0.7,
    maxWidth: 300,
    zIndex: 1000,
  },
  glassContainer: {
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
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
