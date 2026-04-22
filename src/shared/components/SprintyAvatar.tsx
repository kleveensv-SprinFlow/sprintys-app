import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { SPRINTY_ASSETS } from '../../data/sprintyAssets';

interface SprintyAvatarProps {
  state: 'happy' | 'cold' | 'hot' | 'neutral';
}

const SprintyAvatar: React.FC<SprintyAvatarProps> = ({ state }) => {
  const xml = SPRINTY_ASSETS[state] || SPRINTY_ASSETS.neutral;

  return (
    <View style={styles.container}>
      <SvgXml xml={xml} width="120" height="120" />
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
