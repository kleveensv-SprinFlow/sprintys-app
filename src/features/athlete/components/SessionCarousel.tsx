import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;
const SNAP_INTERVAL = CARD_WIDTH + theme.spacing.md;

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
        <TouchableOpacity onPress={() => scrollTo('left')} style={styles.navButton}>
          <Feather name="chevron-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>{MOCK_SESSIONS[activeIndex]?.date}</Text>
        </View>

        <TouchableOpacity onPress={() => scrollTo('right')} style={styles.navButton}>
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
            <View key={session.id} style={[styles.card, isActive && styles.activeCard]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{session.title}</Text>
                <Feather name="activity" size={20} color={isActive ? theme.colors.accent : theme.colors.textMuted} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Feather name="clock" size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.infoText}>{session.duration}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Feather name="zap" size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.infoText}>{session.intensity}</Text>
                </View>
              </View>
              {isActive && (
                <View style={styles.activeIndicator} />
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
    marginVertical: theme.spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateContainer: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  scrollContent: {
    paddingHorizontal: (width - CARD_WIDTH) / 2, // Center first and last items
    paddingVertical: theme.spacing.sm,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginRight: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  activeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: theme.colors.accent,
    transform: [{ scale: 1.02 }],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardBody: {
    gap: theme.spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  infoText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -1,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: theme.colors.accent,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
});
