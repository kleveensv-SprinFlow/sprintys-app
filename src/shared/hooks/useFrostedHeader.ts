import { useRef } from 'react';
import { Animated } from 'react-native';

/**
 * iOS-like header behaviour: transparent at rest, frosted once content scrolls
 * under it. Spread `onScroll` + `scrollEventThrottle` on an Animated scroll view
 * and give `barOpacity` to <FrostedBar /> (or `scrollY` to <Header />).
 */
export const useFrostedHeader = () => {
  const scrollY = useRef(new Animated.Value(0)).current;
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true });
  const barOpacity = scrollY.interpolate({ inputRange: [0, 16], outputRange: [0, 1], extrapolate: 'clamp' });
  return { scrollY, barOpacity, scrollProps: { onScroll, scrollEventThrottle: 16 } };
};
