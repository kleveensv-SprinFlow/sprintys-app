import React from 'react';
import { View, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import LottieView from 'lottie-react-native';
import { SprintyEmotion } from '../types';

interface SprintyAvatarProps {
  emotion: SprintyEmotion;
  size?: number;
}

export const SprintyAvatar: React.FC<SprintyAvatarProps> = ({ emotion, size = 60 }) => {
  const getAsset = () => {
    switch (emotion) {
      case 'neutral':
      case 'content':
        return { type: 'lottie', source: require('../../../../assets/sprinty/lottie/idle.json') };
      case 'celebration':
      case 'focus':
        return { type: 'lottie', source: require('../../../../assets/sprinty/lottie/active.json') };
      case 'fatigue':
        return { type: 'svg', source: require('../../../../assets/sprinty/svg/6_sleep.svg') };
      case 'caution':
        return { type: 'svg', source: require('../../../../assets/sprinty/svg/4_caution.svg') };
      case 'perplexed':
        return { type: 'svg', source: require('../../../../assets/sprinty/svg/3_perplexed.svg') };
      default:
        return { type: 'lottie', source: require('../../../../assets/sprinty/lottie/idle.json') };
    }
  };

  const asset = getAsset();

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {asset.type === 'lottie' ? (
        <LottieView
          source={asset.source}
          autoPlay
          loop
          style={{ width: size, height: size }}
        />
      ) : (
        <Image
          source={asset.source as ImageSourcePropType}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
