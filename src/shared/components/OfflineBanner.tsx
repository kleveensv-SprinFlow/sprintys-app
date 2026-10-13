import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../core/theme';

/** Small pill that slides in from the top while the phone has no connection. */
export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);
  const y = useRef(new Animated.Value(0)).current;

  useEffect(
    () =>
      NetInfo.addEventListener((state) => {
        // isInternetReachable is null while unknown: only trust an explicit false
        setOffline(state.isConnected === false || state.isInternetReachable === false);
      }),
    []
  );

  useEffect(() => {
    Animated.spring(y, { toValue: offline ? 1 : 0, useNativeDriver: true, speed: 14, bounciness: 6 }).start();
  }, [offline]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pill,
        {
          top: insets.top + 6,
          opacity: y,
          transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] }) }],
        },
      ]}
    >
      <Feather name="wifi-off" size={13} color="#FFFFFF" />
      <Text style={styles.text}>Hors ligne · vérifie ta connexion</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.text,
    zIndex: 1000,
    elevation: 10,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
