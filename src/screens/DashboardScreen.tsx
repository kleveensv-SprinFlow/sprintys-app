import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { supabase } from '../services/supabaseClient';
import { signOutUser } from '../services/authService';

const { width } = Dimensions.get('window');

const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const [profile, setProfile] = useState<any>(null);
  const [userName, setUserName] = useState<string>('');
  const [dailyScore, setDailyScore] = useState<number | null>(null);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFocused) {
      fetchUserData();
    }
  }, [isFocused]);

  const fetchUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (user) {
        setUserName(user.email?.split('@')[0] || 'Athlète');
        
        // 1. Charger le profil
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileData) setProfile(profileData);

        // 2. Charger les 3 derniers check-ins
        const { data: checkinData } = await supabase
          .from('daily_checkins')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3);

        if (checkinData && checkinData.length > 0) {
          const today = new Date().toISOString().split('T')[0];
          const latestCheckinDate = checkinData[0].created_at.split('T')[0];
          setHasCheckedInToday(today === latestCheckinDate);

          // Calcul pondéré sur 3 jours (Dette de sommeil / Fatigue cumulée)
          const weights = [0.5, 0.3, 0.2];
          let totalScore = 0;
          let totalWeight = 0;

          checkinData.forEach((checkin, index) => {
            const dailyBaseScore = ((checkin.sleep_score + checkin.energy_score) / 20) * 100;
            totalScore += dailyBaseScore * weights[index];
            totalWeight += weights[index];
          });

          const finalScore = Math.round(totalScore / totalWeight);
          setDailyScore(finalScore);
        } else {
          setHasCheckedInToday(false);
          setDailyScore(null);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  const formatDate = () => {
    const options: any = { weekday: 'long', day: 'numeric', month: 'long' };
    const date = new Date().toLocaleDateString('fr-FR', options);
    return date.charAt(0).toUpperCase() + date.slice(1);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background with light effects */}
      <View style={styles.lightBackground}>
        <View style={[styles.lightCircle, styles.cyanCircle]} />
        <View style={[styles.lightCircle, styles.purpleCircle]} />
      </View>
      <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.dateText}>{formatDate()}</Text>
            <Text style={styles.welcomeText}>Salut, {userName} 👋</Text>
          </View>
          <TouchableOpacity onPress={() => signOutUser()} style={styles.profileButton}>
            <View style={styles.profileInitial}>
              <Text style={styles.profileInitialText}>{userName.charAt(0).toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Card 1: État de Forme */}
        <BlurView intensity={40} tint="default" style={styles.card}>
          <Text style={styles.cardTitle}>État de forme</Text>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreValue}>{hasCheckedInToday ? dailyScore : '--'}</Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: hasCheckedInToday ? `${dailyScore}%` : '0%' }]} />
          </View>
          
          {!hasCheckedInToday && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('CheckIn')}
            >
              <Text style={styles.actionButtonText}>Faire mon check-in</Text>
            </TouchableOpacity>
          )}
          {hasCheckedInToday && (
            <View style={styles.completedBadge}>
              <Text style={styles.completedBadgeText}>Check-in terminé pour aujourd'hui</Text>
            </View>
          )}
        </BlurView>

        {/* Card 2: Objectif de Saison */}
        <BlurView intensity={40} tint="default" style={styles.card}>
          <Text style={styles.cardTitle}>Mon Objectif</Text>
          <Text style={styles.goalText}>
            {profile?.season_goal || "Aucun objectif défini pour le moment. Remplis ton onboarding !"}
          </Text>
        </BlurView>

        {/* Card 3: Météo */}
        <BlurView intensity={40} tint="default" style={styles.card}>
          <Text style={styles.cardTitle}>Conditions d'entraînement</Text>
          <View style={styles.weatherRow}>
            <View style={styles.weatherItem}>
              <Text style={styles.weatherValue}>24°C</Text>
              <Text style={styles.weatherLabel}>Température</Text>
            </View>
            <View style={styles.weatherDivider} />
            <View style={styles.weatherItem}>
              <Text style={styles.weatherValue}>+1.2m/s</Text>
              <Text style={styles.weatherLabel}>Vent (favorable)</Text>
            </View>
          </View>
        </BlurView>

        {/* Space for bottom tabs */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  lightBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  lightCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.4,
  },
  cyanCircle: {
    top: -50,
    left: -50,
    backgroundColor: '#32ADE6',
  },
  purpleCircle: {
    bottom: 200,
    right: -50,
    backgroundColor: '#BF5AF2',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  dateText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  profileInitial: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitialText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  card: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 20,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 16,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scoreMax: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8E8E93',
    marginLeft: 4,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    marginBottom: 20,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#32ADE6',
    borderRadius: 3,
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '600',
  },
  goalText: {
    fontSize: 18,
    color: '#FFFFFF',
    lineHeight: 26,
    fontWeight: '500',
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  weatherItem: {
    alignItems: 'center',
  },
  weatherValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  weatherLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  weatherDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  completedBadge: {
    backgroundColor: 'rgba(50, 173, 230, 0.15)',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(50, 173, 230, 0.3)',
  },
  completedBadgeText: {
    color: '#32ADE6',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default DashboardScreen;
