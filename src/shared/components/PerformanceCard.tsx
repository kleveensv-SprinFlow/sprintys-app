import React from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface PerformanceCardProps {
  event: string;
  perf: string;
  wind: string;
  city: string;
  date: string;
}

const PerformanceCard = ({ event, perf, wind, city, date }: PerformanceCardProps) => {
  return (
    <View style={styles.captureContainer}>
      <LinearGradient
        colors={['#000000', '#001A1F', '#00333D']}
        style={styles.card}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>SPRINTY</Text>
          <Text style={styles.tagline}>ELITE PERFORMANCE HUB</Text>
        </View>

        <View style={styles.mainContent}>
          <Text style={styles.eventLabel}>{event.toUpperCase()}</Text>
          <Text style={styles.chronoText}>{perf}</Text>
          <View style={styles.divider} />
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>VENT</Text>
              <Text style={styles.statValue}>{wind} M/S</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>DATE</Text>
              <Text style={styles.statValue}>{date}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.cityText}>{city.toUpperCase()}</Text>
          <Text style={styles.officialLabel}>RÉSULTAT OFFICIEL</Text>
        </View>

        <View style={styles.accentBorder} />
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  captureContainer: {
    width: 1080,
    height: 1080,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    height: '100%',
    padding: 80,
    justifyContent: 'space-between',
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    color: '#00E5FF',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 4,
  },
  tagline: {
    color: '#8E8E93',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  mainContent: {
    alignItems: 'center',
  },
  eventLabel: {
    color: '#00E5FF',
    fontSize: 60,
    fontWeight: '900',
    letterSpacing: 10,
    marginBottom: 20,
  },
  chronoText: {
    color: '#FFFFFF',
    fontSize: 220,
    fontWeight: '900',
    letterSpacing: -5,
  },
  divider: {
    width: 200,
    height: 4,
    backgroundColor: '#00E5FF',
    marginVertical: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 100,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#8E8E93',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 8,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  footer: {
    alignItems: 'flex-start',
  },
  cityText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  officialLabel: {
    color: '#00E5FF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  accentBorder: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 15,
    backgroundColor: '#00E5FF',
  },
});

export default PerformanceCard;
