import React from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import { useSprintyStore } from '../../../store/useSprintyStore';
import { SprintyAvatar } from './SprintyAvatar';
import { colors } from '../../../../src/shared/theme/colors';
import { typography } from '../../../../src/shared/theme/typography';
import { shadows } from '../../../../src/shared/theme/shadows';

export const SprintyWidget: React.FC = () => {
  const { isVisible, currentEmotion, message, hideSprinty } = useSprintyStore();
  const [fadeAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (isVisible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  if (!isVisible && fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) === 0) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <TouchableOpacity 
        style={styles.content} 
        activeOpacity={0.9} 
        onPress={() => hideSprinty()}
      >
        <SprintyAvatar emotion={currentEmotion} size={48} />
        {message && (
          <View style={styles.bubble}>
            <Text style={styles.message}>{message}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    alignItems: 'flex-end',
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bubble: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomRightRadius: 4,
    marginRight: 12,
    marginBottom: 12,
    maxWidth: 220,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  message: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
});
