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
  const [lastWorkout, setLastWorkout] = useState<any>(null);
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

        // 3. Charger la séance la plus récente
        const { data: workoutData } = await supabase
          .from('workouts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (workoutData && workoutData.length > 0) {
          setLastWorkout(workoutData[0]);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  const getSprintyAdvice = (shapeScore: number | null, workout: any) => {
    if (!hasCheckedInToday || shapeScore === null) {
      return "Fais ton check-in pour recevoir ton analyse de performance.";
    }

    const lastRpe = workout?.rpe || 0;

    if (shapeScore >= 85 && lastRpe < 7) {
      return "ÉTAT OPTIMAL. Journée idéale pour une séance de haute intensité ou un test de vitesse.";
    }
    if (shapeScore >= 80 && lastRpe >= 8) {
      return "FORCE ET FATIGUE. Ton système nerveux est prêt, mais tes muscles ont subi une grosse charge hier. Focus sur la technique pure, évite le lactique aujourd'hui.";
    }
    if (shapeScore < 65 && lastRpe >= 8) {
      return "ALERTE RÉCUPÉRATION. Dette de sommeil et charge élevée détectées. Risque de blessure accru. Priorise une séance de récupération active (mobilité) ou un repos complet.";
    }
    if (shapeScore < 65 && lastRpe < 5) {
      return "FATIGUE NERVEUSE. Malgré un repos relatif hier, ta forme reste basse. Vérifie ton hydratation et ta nutrition avant ta séance.";
    }

    return "MAINTIEN. Séance modérée possible. Écoute tes sensations sur tes premières accélérations.";
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
        <View style={styles.header}>
          <View>
            <Text style={styles.dateText}>{formatDate()}</Text>
            <Text style={styles.welcomeText}>Salut, {userName}</Text>
          </View>
          <TouchableOpacity onPress={() => signOutUser()} style={styles.profileButton}>
            <View style={styles.profileInitial}>
              <Text style={styles.profileInitialText}>{userName.charAt(0).toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Card 1: État de Forme */}
        <BlurView intensity={40} tint="default" style={styles.card}>
          <Text style={styles.cardTitle}>ÉTAT DE FORME</Text>
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
              <Text style={styles.actionButtonText}>FAIRE MON CHECK-IN</Text>
            </TouchableOpacity>
          )}
          {hasCheckedInToday && (
            <View style={styles.completedBadge}>
              <Text style={styles.completedBadgeText}>CHECK-IN TERMINÉ</Text>
            </View>
          )}
        </BlurView>

        {/* Card 2: Analyse Sprinty */}
        <BlurView intensity={60} tint="default" style={[styles.card, styles.sprintyCard]}>
          <Text style={styles.sprintyTitle}>ANALYSE SPRINTY</Text>
          <Text style={styles.sprintyAdvice}>
            {getSprintyAdvice(dailyScore, lastWorkout)}
          </Text>
        </BlurView>

        {/* Card 3: Objectif de Saison */}
        <BlurView intensity={40} tint="default" style={styles.card}>
          <Text style={styles.cardTitle}>MON OBJECTIF</Text>
          <Text style={styles.goalText}>
            {profile?.season_goal || "Aucun objectif défini pour le moment. Remplis ton onboarding !"}
          </Text>
        </BlurView>

        {/* Card 4: Météo */}
        <BlurView intensity={40} tint="default" style={styles.card}>
          <Text style={styles.cardTitle}>CONDITIONS D'ENTRAÎNEMENT</Text>
          <View style={styles.weatherRow}>
            <View style={styles.weatherItem}>
              <Text style={styles.weatherValue}>24°C</Text>
              <Text style={styles.weatherLabel}>TEMPÉRATURE</Text>
            </View>
            <View style={styles.weatherDivider} />
            <View style={styles.weatherItem}>
              <Text style={styles.weatherValue}>+1.2m/s</Text>
              <Text style={styles.weatherLabel}>VENT (FAVORABLE)</Text>
            </View>
          </View>
        </BlurView>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' },
  lightBackground: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  lightCircle: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.4 },
  cyanCircle: { top: -50, left: -50, backgroundColor: '#00E5FF' },
  purpleCircle: { bottom: 200, right: -50, backgroundColor: '#BF5AF2' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  dateText: { fontSize: 13, color: '#8E8E93', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5 },
  welcomeText: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', marginTop: 4, letterSpacing: -0.5, textTransform: 'uppercase' },
  profileButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  profileInitial: { width: '100%', height: '100%', borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  profileInitialText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  card: { width: '100%', borderRadius: 24, padding: 24, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)', marginBottom: 20, overflow: 'hidden' },
  cardTitle: { fontSize: 12, fontWeight: '900', color: '#8E8E93', marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase' },
  scoreContainer: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 },
  scoreValue: { fontSize: 48, fontWeight: '900', color: '#FFFFFF' },
  scoreMax: { fontSize: 20, fontWeight: '600', color: '#8E8E93', marginLeft: 4 },
  progressTrack: { height: 6, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 3, marginBottom: 20 },
  progressFill: { height: '100%', backgroundColor: '#00E5FF', borderRadius: 3 },
  actionButton: { backgroundColor: '#FFFFFF', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  actionButtonText: { color: '#000000', fontSize: 14, fontWeight: '900' },
  completedBadge: { backgroundColor: 'rgba(0, 229, 255, 0.1)', paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 229, 255, 0.2)' },
  completedBadgeText: { color: '#00E5FF', fontSize: 12, fontWeight: '900' },
  sprintyCard: { borderColor: '#00E5FF', backgroundColor: 'rgba(0, 229, 255, 0.05)' },
  sprintyTitle: { fontSize: 13, fontWeight: '900', color: '#00E5FF', marginBottom: 12, letterSpacing: 1 },
  sprintyAdvice: { fontSize: 16, color: '#FFFFFF', lineHeight: 24, fontWeight: '600' },
  goalText: { fontSize: 17, color: '#FFFFFF', lineHeight: 26, fontWeight: '500' },
  weatherRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  weatherItem: { alignItems: 'center' },
  weatherValue: { fontSize: 24, fontWeight: '900', color: '#FFFFFF' },
  weatherLabel: { fontSize: 10, color: '#8E8E93', marginTop: 4, fontWeight: '800' },
  weatherDivider: { width: 1, height: 40, backgroundColor: 'rgba(255, 255, 255, 0.1)' },
});

export default DashboardScreen;
