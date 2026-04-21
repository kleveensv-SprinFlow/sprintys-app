import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Location {
  name: string;
  lat: number;
  lon: number;
}

const PRESET_LOCATIONS: Location[] = [
  { name: 'Paris', lat: 48.8566, lon: 2.3522 },
  { name: 'London', lat: 51.5074, lon: -0.1278 },
  { name: 'New York', lat: 40.7128, lon: -74.0060 },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
];

interface LocationSelectorProps {
  currentLocation: Location;
  onSelect: (location: Location) => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({ currentLocation, onSelect }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Training Ground</Text>
      <View style={styles.row}>
        {PRESET_LOCATIONS.map((loc) => (
          <TouchableOpacity
            key={loc.name}
            style={[styles.chip, currentLocation.name === loc.name && styles.activeChip]}
            onPress={() => onSelect(loc)}
          >
            <Text style={[styles.chipText, currentLocation.name === loc.name && styles.activeChipText]}>
              {loc.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  label: {
    color: '#666',
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  activeChip: {
    backgroundColor: '#ff4444',
    borderColor: '#ff4444',
  },
  chipText: {
    color: '#aaa',
    fontSize: 12,
  },
  activeChipText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
