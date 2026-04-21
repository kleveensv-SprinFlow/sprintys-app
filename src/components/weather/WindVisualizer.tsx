import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Svg, Path } from 'react-native-svg';

interface WindVisualizerProps {
  speed: number;
  direction: number;
}

export const WindVisualizer: React.FC<WindVisualizerProps> = ({ speed, direction }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.arrowContainer, { transform: [{ rotate: `${direction}deg` }] }]}>
          <Svg height="40" width="40" viewBox="0 0 24 24">
            <Path
              d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"
              fill="#ff4444"
            />
          </Svg>
        </View>
        <View style={styles.info}>
          <Text style={styles.speedText}>{speed} km/h</Text>
          <Text style={styles.directionLabel}>Wind Direction</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  arrowContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  speedText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  directionLabel: {
    color: '#666',
    fontSize: 12,
  },
});
