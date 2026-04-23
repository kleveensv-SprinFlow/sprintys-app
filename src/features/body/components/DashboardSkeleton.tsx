import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { SkeletonItem } from '../../../shared/components/SkeletonItem';

const { width } = Dimensions.get('window');

export const DashboardSkeleton = () => {
  return (
    <View style={styles.container}>
      {/* Background circles (static/blurred) */}
      <View style={styles.lightBackground}>
        <View style={[styles.lightCircle, styles.cyanCircle]} />
        <View style={[styles.lightCircle, styles.purpleCircle]} />
      </View>
      <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Skeleton */}
        <View style={styles.header}>
          <View style={styles.welcomeRow}>
            <SkeletonItem width={width * 0.6} height={32} borderRadius={8} />
            <SkeletonItem width={80} height={24} borderRadius={20} style={{ marginLeft: 12 }} />
          </View>
          <SkeletonItem width={44} height={44} borderRadius={22} />
        </View>

        {/* Form State Card Skeleton */}
        <View style={styles.mainCard}>
          <SkeletonItem width={100} height={12} borderRadius={4} style={{ marginBottom: 16 }} />
          <View style={styles.scoreRow}>
            <SkeletonItem width={80} height={50} borderRadius={8} />
            <SkeletonItem width={40} height={20} borderRadius={4} style={{ marginLeft: 8 }} />
          </View>
          <SkeletonItem width="100%" height={6} borderRadius={3} style={{ marginVertical: 20 }} />
          <SkeletonItem width="100%" height={48} borderRadius={12} />
        </View>

        {/* Sprinty Analysis Card Skeleton */}
        <View style={[styles.mainCard, { borderColor: 'rgba(0, 229, 255, 0.1)' }]}>
          <SkeletonItem width={120} height={12} borderRadius={4} style={{ marginBottom: 16 }} />
          <SkeletonItem width="100%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />
          <SkeletonItem width="80%" height={16} borderRadius={4} />
        </View>

        {/* Second Card Placeholder */}
        <View style={styles.mainCard}>
          <SkeletonItem width={100} height={12} borderRadius={4} style={{ marginBottom: 16 }} />
          <SkeletonItem width="100%" height={80} borderRadius={16} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  lightBackground: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  lightCircle: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.1, backgroundColor: 'rgba(255,255,255,0.05)' },
  cyanCircle: { top: -50, left: -50 },
  purpleCircle: { bottom: 100, right: -50 },
  scrollContent: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  mainCard: { width: '100%', borderRadius: 24, padding: 24, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 0.5, borderColor: 'rgba(255, 255, 255, 0.1)', marginBottom: 20 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline' },
});
