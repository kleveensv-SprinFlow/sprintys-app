import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export const BootScreen = () => {
  return (
    <View style={styles.container}>
      {/* Dynamic Background */}
      <View style={styles.background}>
        <LinearGradient
          colors={['#000000', '#050505', '#0A0A0A']}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(0, 229, 255, 0.1)', 'transparent']}
          style={[styles.lightCircle, styles.cyanCircle]}
        />
        <LinearGradient
          colors={['rgba(191, 90, 242, 0.1)', 'transparent']}
          style={[styles.lightCircle, styles.purpleCircle]}
        />
      </View>

      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

      <View style={styles.content}>
        <LottieView
          source={require('../assets/lottie/logo.json')}
          autoPlay
          loop
          style={styles.lottie}
          resizeMode="contain"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  lightCircle: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    opacity: 0.5,
  },
  cyanCircle: {
    top: -width * 0.3,
    left: -width * 0.3,
  },
  purpleCircle: {
    bottom: -width * 0.3,
    right: -width * 0.3,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    width: width * 0.6,
    height: width * 0.6,
  },
});
