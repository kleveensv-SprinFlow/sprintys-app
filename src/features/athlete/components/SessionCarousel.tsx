import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;
const SNAP_INTERVAL = CARD_WIDTH + 12; // theme.spacing.md is 12

const MOCK_SESSIONS = [
  { id: '1', date: 'J-3', title: 'Endurance', duration: '45 min', intensity: 'Faible' },
  { id: '2', date: 'J-2', title: 'Fractionné', duration: '60 min', intensity: 'Haute' },
  { id: '3', date: 'Hier', title: 'Récupération', duration: '30 min', intensity: 'Très Faible' },
  { id: '4', date: "Aujourd'hui", title: 'Séance Sprint', duration: '90 min', intensity: 'Maximale', active: true },
  { id: '5', date: 'Demain', title: 'Repos Actif', duration: '20 min', intensity: 'Faible' },
  { id: '6', date: 'J+2', title: 'Musculation', duration: '60 min', intensity: 'Moyenne' },
  { id: '7', date: 'J+3', title: 'Endurance Fondamentale', duration: '120 min', intensity: 'Moyenne' },
];

export const SessionCarousel = () => {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(3); // Default to Aujourd'hui

  const handleScroll = (event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / SNAP_INTERVAL);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const scrollTo = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const newIndex = direction === 'left' ? Math.max(0, activeIndex - 1) : Math.min(MOCK_SESSIONS.length - 1, activeIndex + 1);
    scrollRef.current.scrollTo({ x: newIndex * SNAP_INTERVAL, animated: true });
  };

  return (
    <View style={styles.container}>
      {/* Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => scrollTo('left')} style={[styles.navButton, { backgroundColor: theme.colors.surfaceLight }]}>
          <Feather name="chevron-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        
        <View style={styles.dateContainer}>
          <Text style={[styles.dateText, { color: theme.colors.text }]}>{MOCK_SESSIONS[activeIndex]?.date}</Text>
        </View>

        <TouchableOpacity onPress={() => scrollTo('right')} style={[styles.navButton, { backgroundColor: theme.colors.surfaceLight }]}>
          <Feather name="chevron-right" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
        onMomentumScrollEnd={handleScroll}
        // Center the active card initially by simulating offset
        contentOffset={{ x: 3 * SNAP_INTERVAL, y: 0 }}
      >
        {MOCK_SESSIONS.map((session, index) => {
          const isActive = index === activeIndex;
          return (
            <View key={session.id} style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: isActive ? theme.colors.accent : theme.colors.border }, isActive && styles.activeCard]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{session.title}</Text>
                <Feather name="activity" size={20} color={isActive ? theme.colors.accent : theme.colors.textMuted} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Feather name="clock" size={14} color={theme.colors.textSecondary} />
                  <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>{session.duration}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Feather name="zap" size={14} color={theme.colors.textSecondary} />
                  <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>{session.intensity}</Text>
                </View>
              </View>
              {isActive && (
                <View style={[styles.activeIndicator, { backgroundColor: theme.colors.accent }]} />
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateContainer: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  scrollContent: {
    paddingHorizontal: (width - CARD_WIDTH) / 2, // Center first and last items
    paddingVertical: 8,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
  },
  activeCard: {
    transform: [{ scale: 1.02 }],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -1,
    left: '20%',
    right: '20%',
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
});
