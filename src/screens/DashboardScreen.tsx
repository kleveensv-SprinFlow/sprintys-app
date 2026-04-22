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
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { supabase } from '../services/supabaseClient';
import { signOutUser } from '../services/authService';
import { weatherService } from '../services/weatherService';
import WeatherBadge from '../shared/components/WeatherBadge';

const { width } = Dimensions.get('window');

const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const [profile, setProfile] = useState<any>(null);
  const [userName, setUserName] = useState<string>('');
  const [dailyScore, setDailyScore] = useState<number | null>(null);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [lastWorkout, setLastWorkout] = useState<any>(null);
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFocused) {
      fetchUserData();
      loadWeather();
    }
  }, [isFocused]);

  const loadWeather = async () => {
    const data = await weatherService.fetchWeather();
    setWeather(data);
  };

  const fetchUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (user) {
        setUserName(user.email?.split('@')[0] || 'Athlète');
        
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileData) setProfile(profileData);

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
      console.error('Erreur data:', error);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  const getSprintyAdvice = (shapeScore: number | null, workout: any) => {
    if (!hasCheckedInToday || shapeScore === null) {
      return "Fais ton check-in pour recevoir ton analyse de performance.";
    }
    const lastRpe = workout?.rpe || 0;
    if (shapeScore >= 85 && lastRpe < 7) return "ÉTAT OPTIMAL. Journée idéale pour une séance de haute intensité ou un test de vitesse.";
    if (shapeScore >= 80 && lastRpe >= 8) return "FORCE ET FATIGUE. Ton système nerveux est prêt, mais tes muscles ont subi une grosse charge hier. Focus sur la technique pure, évite le lactique aujourd'hui.";
    if (shapeScore < 65 && lastRpe >= 8) return "ALERTE RÉCUPÉRATION. Dette de sommeil et charge élevée détectées. Risque de blessure accru. Priorise une séance de récupération active (mobilité) ou un repos complet.";
    if (shapeScore < 65 && lastRpe < 5) return "FATIGUE NERVEUSE. Malgré un repos relatif hier, ta forme reste basse. Vérifie ton hydratation et ta nutrition avant ta séance.";
    return "MAINTIEN. Séance modérée possible. Écoute tes sensations sur tes premières accélérations.";
  };

  const formatDate = () => {
    const options: any = { weekday: 'long', day: 'numeric', month: 'long' };
    const date = new Date().toLocaleDateString('fr-FR', options);
    return date.charAt(0).toUpperCase() + date.slice(1);
  };

  const renderHubCard = (title: string, subtitle: string, icon: string, onPress: () => void) => (
    <TouchableOpacity style={styles.hubCardWrapper} onPress={onPress}>
      <BlurView intensity={40} tint="default" style={styles.hubCard}>
        <Text style={styles.hubIcon}>{icon}</Text>
        <Text style={styles.hubTitle}>{title}</Text>
        <Text style={styles.hubSubtitle}>{subtitle}</Text>
      </BlurView>
    </TouchableOpacity>
  );

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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.dateText}>{formatDate()}</Text>
            <View style={styles.welcomeRow}>
              <Text style={styles.welcomeText}>SALUT, {userName.toUpperCase()}</Text>
              {weather && <WeatherBadge temp={weather.temp} condition={weather.condition} />}
            </View>
          </View>
          <TouchableOpacity onPress={() => signOutUser()} style={styles.profileButton}>
            <View style={styles.profileInitial}>
              <Text style={styles.profileInitialText}>{userName.charAt(0).toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* État de Forme */}
        <BlurView intensity={40} tint="default" style={styles.mainCard}>
          <Text style={styles.cardTitle}>ÉTAT DE FORME</Text>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreValue}>{hasCheckedInToday ? dailyScore : '--'}</Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: hasCheckedInToday ? `${dailyScore}%` : '0%' }]} />
          </View>
          {!hasCheckedInToday ? (
            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('CheckIn')}>
              <Text style={styles.actionButtonText}>FAIRE MON CHECK-IN</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.completedBadge}><Text style={styles.completedBadgeText}>CHECK-IN TERMINÉ</Text></View>
          )}
        </BlurView>

        {/* Analyse Sprinty */}
        <BlurView intensity={60} tint="default" style={[styles.mainCard, styles.sprintyCard]}>
          <Text style={styles.sprintyTitle}>ANALYSE SPRINTY</Text>
          <Text style={styles.sprintyAdvice}>{getSprintyAdvice(dailyScore, lastWorkout)}</Text>
        </BlurView>

        {/* Grid Hub 2x2 */}
        <View style={styles.hubGrid}>
          {renderHubCard('ENTRAÎNEMENT', 'PROGRAMME DU JOUR', '🏃', () => navigation.navigate('Entraînement'))}
          {renderHubCard('MON CORPS', 'RECORDS ET FORME', '👤', () => navigation.navigate('Profil'))}
          {renderHubCard('SOMMEIL', 'RÉCUPÉRATION', '💤', () => navigation.navigate('CheckIn'))}
          {renderHubCard('STATS', 'ANALYSE DE SAISON', '📊', () => Alert.alert('Stats', 'Analyse de saison bientôt disponible'))}
        </View>

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
  purpleCircle: { bottom: 100, right: -50, backgroundColor: '#BF5AF2' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  dateText: { fontSize: 12, color: '#8E8E93', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5 },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 12 },
  welcomeText: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  profileButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  profileInitial: { width: '100%', height: '100%', borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  profileInitialText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  mainCard: { width: '100%', borderRadius: 24, padding: 24, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)', marginBottom: 20, overflow: 'hidden' },
  cardTitle: { fontSize: 11, fontWeight: '900', color: '#8E8E93', marginBottom: 16, letterSpacing: 1.5, textTransform: 'uppercase' },
  scoreContainer: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 },
  scoreValue: { fontSize: 48, fontWeight: '900', color: '#FFFFFF' },
  scoreMax: { fontSize: 20, fontWeight: '600', color: '#8E8E93', marginLeft: 4 },
  progressTrack: { height: 6, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 3, marginBottom: 20 },
  progressFill: { height: '100%', backgroundColor: '#00E5FF', borderRadius: 3 },
  actionButton: { backgroundColor: '#FFFFFF', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  actionButtonText: { color: '#000000', fontSize: 13, fontWeight: '900' },
  completedBadge: { backgroundColor: 'rgba(0, 229, 255, 0.1)', paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 229, 255, 0.2)' },
  completedBadgeText: { color: '#00E5FF', fontSize: 11, fontWeight: '900' },
  sprintyCard: { borderColor: 'rgba(0, 229, 255, 0.4)', backgroundColor: 'rgba(0, 229, 255, 0.05)' },
  sprintyTitle: { fontSize: 12, fontWeight: '900', color: '#00E5FF', marginBottom: 12, letterSpacing: 1 },
  sprintyAdvice: { fontSize: 15, color: '#FFFFFF', lineHeight: 22, fontWeight: '600' },
  hubGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  hubCardWrapper: { width: (width - 40 - 15) / 2, marginBottom: 15 },
  hubCard: { padding: 20, borderRadius: 24, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 0.5, borderColor: 'rgba(0, 229, 255, 0.2)', height: 140, justifyContent: 'center' },
  hubIcon: { fontSize: 24, marginBottom: 12 },
  hubTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 0.5, marginBottom: 4 },
  hubSubtitle: { color: '#8E8E93', fontSize: 10, fontWeight: '700' },
});

export default DashboardScreen;
