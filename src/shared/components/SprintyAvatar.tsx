import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

interface SprintyAvatarProps {
  state: 'happy' | 'cold' | 'hot' | 'neutral';
}

const SprintyAvatar: React.FC<SprintyAvatarProps> = ({ state }) => {
  // Mapping des couleurs par état
  const colors = {
    happy: '#00E5FF',
    cold: '#5AC8FA',
    hot: '#FF3B30',
    neutral: '#8E8E93',
  };

  return (
    <View style={styles.container}>
      <Svg height="100" width="100" viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="45" fill={colors[state]} opacity="0.2" stroke={colors[state]} strokeWidth="2" />
        {/* Simple face placeholder */}
        <Circle cx="35" cy="40" r="5" fill={colors[state]} />
        <Circle cx="65" cy="40" r="5" fill={colors[state]} />
        {state === 'happy' && (
          <Path d="M 30 60 Q 50 80 70 60" stroke={colors[state]} strokeWidth="3" fill="none" />
        )}
        {state === 'cold' && (
          <Path d="M 30 70 Q 50 60 70 70" stroke={colors[state]} strokeWidth="3" fill="none" />
        )}
        {state === 'hot' && (
          <Circle cx="50" cy="70" r="8" stroke={colors[state]} strokeWidth="3" fill="none" />
        )}
        {state === 'neutral' && (
          <Path d="M 30 65 L 70 65" stroke={colors[state]} strokeWidth="3" fill="none" />
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SprintyAvatar;
