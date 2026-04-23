import React, { useEffect, useState, useMemo } from 'react';
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
  Linking,
  Image,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { supabase } from '../services/supabaseClient';
import { weatherService } from '../services/weatherService';
import WeatherBadge from '../shared/components/WeatherBadge';
import { useBodyStore } from '../store/bodyStore';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { DebriefModal } from '../features/competition/components/DebriefModal';

import { DashboardSkeleton } from '../features/body/components/DashboardSkeleton';

const { width } = Dimensions.get('window');

// Fonction utilitaire pour obtenir la date locale au format YYYY-MM-DD
const formatDateToYYYYMMDD = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatShortAddress = (address: string) => {
  if (!address) return '';
  const parts = address.split(',');
  if (parts.length <= 2) return address.toUpperCase();
  
  // Souvent format Google : "Numéro Rue, Code Ville, Pays"
  const street = parts[0].trim();
  const cityZip = parts[1].trim();
  return `${cityZip}, ${street}`.toUpperCase();
};

const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { 
    profile, 
    fetchProfile: fetchStoreProfile, 
    updateProfile: updateStoreProfile 
  } = useBodyStore();
  
  const [userName, setUserName] = useState<string>('');
  const [dailyScore, setDailyScore] = useState<number | null>(null);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [lastWorkout, setLastWorkout] = useState<any>(null);
  
  const [tomorrowCompetition, setTomorrowCompetition] = useState<any>(null);
  const [todayCompetition, setTodayCompetition] = useState<any>(null);
  const [yesterdayCompetition, setYesterdayCompetition] = useState<any>(null);
  
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [isDebriefModalVisible, setIsDebriefModalVisible] = useState(false);

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
        // Fetch via Store to keep everything synchronized
        await fetchStoreProfile(user.id);
        
        // The store is now updated, but we still need local states for specific logic
        const currentProfile = useBodyStore.getState().profile;
        if (currentProfile) {
          setUserName(currentProfile.first_name || user.email?.split('@')[0] || 'Athlète');
        }

        // Dates Logic (Local Time)
        const now = new Date();
        const todayStr = formatDateToYYYYMMDD(now);
        
        const yesterdayDate = new Date(now);
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = formatDateToYYYYMMDD(yesterdayDate);

        const tomorrowDate = new Date(now);
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrowStr = formatDateToYYYYMMDD(tomorrowDate);

        // Fetch Workouts
        const { data: workouts } = await supabase
          .from('workouts')
          .select('*')
          .eq('user_id', user.id);

        if (workouts) {
          const workoutsWithLocalDate = workouts.map(w => ({
            ...w,
            localDate: formatDateToYYYYMMDD(new Date(w.created_at))
          }));

          setTomorrowCompetition(workoutsWithLocalDate.find(w => w.is_competition && w.localDate === tomorrowStr) || null);
          setTodayCompetition(workoutsWithLocalDate.find(w => w.is_competition && w.localDate === todayStr) || null);
          setYesterdayCompetition(workoutsWithLocalDate.find(w => 
            w.is_competition && 
            w.localDate === yesterdayStr && 
            !w.results
          ) || null);

          const normalWorkouts = workoutsWithLocalDate
            .filter(w => !w.is_competition)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setLastWorkout(normalWorkouts[0] || null);
        }

        // Check-ins
        const { data: checkinData } = await supabase
          .from('daily_checkins')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (checkinData && checkinData.length > 0) {
          setHasCheckedInToday(todayStr === formatDateToYYYYMMDD(new Date(checkinData[0].created_at)));
          setDailyScore(Math.round(((checkinData[0].sleep_score + checkinData[0].energy_score) / 20) * 100));
        }
      }
    } catch (error) {
      console.error('Erreur data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMealTime = (schedule: any[]) => {
    if (!schedule || schedule.length === 0) return null;
    const sorted = [...schedule].sort((a, b) => a.time.localeCompare(b.time));
    const firstRace = sorted[0].time;
    const [hours, minutes] = firstRace.split(':').map(Number);
    let mealHours = hours - 4;
    if (mealHours < 0) mealHours += 24;
    return `${mealHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleDebriefSubmit = async (place: string, mark: string, feeling: string) => {
    if (!yesterdayCompetition) return;
    try {
      const results = [{ place, mark, feeling }];
      const { error } = await supabase
        .from('workouts')
        .update({ 
          results,
          notes: `${yesterdayCompetition.notes || ''}\n\nRÉSULTATS : ${mark} (${place}e) - Ressenti : ${feeling}`
        })
        .eq('id', yesterdayCompetition.id);

      if (error) throw error;
      setIsDebriefModalVisible(false);
      setYesterdayCompetition(null);
      Alert.alert('Succès', 'Ton débriefing a été enregistré.');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder le débriefing.');
    }
  };

  const toggleCheckItem = (item: string) => {
    setCheckedItems(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const toggleBagItem = async (itemName: string) => {
    if (!profile) return;
    try {
      const currentBag = profile.competition_bag || [];
      const updatedBag = currentBag.map((item: any) => {
        if (item.name === itemName) {
          return { ...item, is_prepared: !item.is_prepared };
        }
        return item;
      });
      
      // Use store action from hook for reliable re-rendering
      await updateStoreProfile(profile.id, { 
        competition_bag: updatedBag 
      });
    } catch (error) {
      console.error('Error toggling bag item:', error);
    }
  };

  const resetBag = async () => {
    if (!profile) return;
    try {
      const currentBag = profile.competition_bag || [];
      const updatedBag = currentBag.map((item: any) => ({ ...item, is_prepared: false }));
      
      await updateStoreProfile(profile.id, { 
        competition_bag: updatedBag 
      });
      Alert.alert('Liste réinitialisée', 'C\'est reparti pour un nouveau départ !');
    } catch (error) {
      console.error('Error resetting bag:', error);
    }
  };

  const renderChecklist = (checklist: any[]) => {
    if (checklist.length === 0) {
      return <Text style={styles.emptyText}>CONFIGURER MA LISTE DANS LE PROFIL</Text>;
    }

    const preparedCount = checklist.filter((i: any) => i.is_prepared).length;
    const totalCount = checklist.length;
    const percentage = Math.round((preparedCount / totalCount) * 100);
    const isAllReady = preparedCount === totalCount;

    return (
      <View style={styles.bagSection}>
        <View style={styles.bagHeaderRow}>
          <Text style={styles.bagTitle}>MA CHECK-LIST SAC</Text>
          <TouchableOpacity onPress={resetBag} style={styles.resetBtn}>
            <Ionicons name="refresh" size={14} color="rgba(255,255,255,0.4)" />
            <Text style={styles.resetBtnText}>RÉINITIALISER</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bagProgressContainer}>
          <View style={styles.bagProgressHeader}>
            <Text style={styles.bagProgressText}>
              {isAllReady ? '🔥 TOUT EST PRÊT !' : `${percentage}% PRÉPARÉ`}
            </Text>
            <Text style={styles.bagProgressCount}>{preparedCount}/{totalCount}</Text>
          </View>
          <View style={styles.bagProgressBarBg}>
            <View style={[
              styles.bagProgressBarFill, 
              { 
                width: `${percentage}%`, 
                backgroundColor: isAllReady ? '#00E5FF' : '#BF5AF2',
                shadowColor: isAllReady ? '#00E5FF' : '#BF5AF2',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: isAllReady ? 0.8 : 0,
                shadowRadius: 10,
              }
            ]} />
          </View>
        </View>

        <View style={styles.checklistItems}>
          {checklist.map((item: any, idx: number) => {
            const itemName = typeof item === 'string' ? item : item.name;
            const isPrepared = typeof item === 'string' ? false : !!item.is_prepared;
            
            return (
              <TouchableOpacity 
                key={`${itemName}-${idx}`} 
                style={styles.checkItem} 
                activeOpacity={0.6}
                onPress={() => toggleBagItem(itemName)}
              >
                <Ionicons 
                  name={isPrepared ? "checkmark-circle" : "ellipse-outline"} 
                  size={24} 
                  color={isPrepared ? "#00E5FF" : "rgba(255,255,255,0.2)"} 
                />
                <Text style={[styles.checkText, isPrepared && styles.checkTextActive]}>
                  {itemName.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.lightBackground}>
        <LinearGradient colors={['rgba(0, 229, 255, 0.4)', 'transparent']} style={[styles.lightCircle, styles.cyanCircle]} />
        <LinearGradient colors={['rgba(191, 90, 242, 0.4)', 'transparent']} style={[styles.lightCircle, styles.purpleCircle]} />
      </View>
      <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.welcomeRow}>
            <Text style={styles.welcomeText}>SALUT, {userName.toUpperCase()}</Text>
            {weather && (
              <TouchableOpacity onPress={() => navigation.navigate('WeatherDetail')}>
                <WeatherBadge temp={weather.temp} condition={weather.condition} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.profileButton}>
            <View style={styles.profileInitial}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.profileInitialText}>{userName.charAt(0).toUpperCase()}</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* --- SECTION COMPÉTITION (Si applicable) --- */}
        
        {/* J+1 : Débriefing */}
        {yesterdayCompetition && (
          <BlurView intensity={60} tint="default" style={[styles.mainCard, styles.debriefCard]}>
            <Text style={styles.debriefTitle}>DÉBRIEFING EN ATTENTE</Text>
            <Text style={styles.debriefText}>Comment s'est passée ta compétition hier ?</Text>
            <TouchableOpacity style={styles.debriefBtn} onPress={() => setIsDebriefModalVisible(true)}>
              <Text style={styles.debriefBtnText}>SAISIR MES RÉSULTATS</Text>
            </TouchableOpacity>
          </BlurView>
        )}

        {/* J-1 : Préparation */}
        {tomorrowCompetition && (
          <BlurView intensity={60} tint="default" style={[styles.mainCard, styles.prepCard]}>
            <Text style={styles.prepTitle}>PRÉPARATION J-1</Text>
            <Text style={styles.prepMain}>COMPÉTITION DEMAIN À {tomorrowCompetition.city?.toUpperCase()}</Text>
            {renderChecklist(profile?.competition_bag || [])}
          </BlurView>
        )}

        {/* Jour J : Game Day */}
        {todayCompetition && (
          <BlurView intensity={60} tint="default" style={[styles.mainCard, styles.compFocusCard]}>
            <Text style={styles.compFocusTitle}>🔥 JOUR DE COMPÉTITION</Text>
            <Text style={styles.compFocusMain}>{todayCompetition.city?.toUpperCase() || 'STADE'}</Text>
            
            {todayCompetition.address && (
              <TouchableOpacity style={styles.addressBtn} onPress={() => Linking.openURL(`geo:0,0?q=${todayCompetition.address}`)}>
                <Ionicons name="location" size={14} color="#00E5FF" />
                <Text style={styles.addressText}>{formatShortAddress(todayCompetition.address)}</Text>
              </TouchableOpacity>
            )}

            {renderChecklist(profile?.competition_bag || [])}

            <View style={styles.nutritionSection}>
              <View style={styles.nutriAlert}>
                <Text style={styles.nutriTime}>⏱️ {calculateMealTime(todayCompetition.competition_schedule) || 'H-4'}</Text>
                <Text style={styles.nutriAdvice}>DERNIER GROS REPAS (GLUCIDES)</Text>
              </View>
              <View style={styles.nutriAlert}>
                <Text style={styles.nutriTime}>⚡ H-1</Text>
                <Text style={styles.nutriAdvice}>BOISSON D'EFFORT & ÉCHAUFFEMENT</Text>
              </View>
            </View>
          </BlurView>
        )}

        {/* --- SECTION DASHBOARD NORMAL --- */}
        
        <BlurView intensity={40} tint="default" style={styles.mainCard}>
          <Text style={styles.cardTitle}>ÉTAT DE FORME</Text>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreValue}>{hasCheckedInToday ? dailyScore : '--'}</Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: hasCheckedInToday ? `${dailyScore}%` : '0%' }]} />
          </View>
          {!hasCheckedInToday && (
            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('CheckIn')}>
              <Text style={styles.actionButtonText}>FAIRE MON CHECK-IN</Text>
            </TouchableOpacity>
          )}
        </BlurView>

        <BlurView intensity={60} tint="default" style={[styles.mainCard, styles.sprintyCard]}>
          <Text style={styles.sprintyTitle}>ANALYSE SPRINTY</Text>
          <Text style={styles.sprintyAdvice}>
            {todayCompetition 
              ? "JOUR DE COURSE. C'est le moment de tout donner. Reste focus sur ton échauffement." 
              : hasCheckedInToday 
                ? "MAINTIEN. Séance modérée possible." 
                : "Fais ton check-in pour recevoir ton analyse."}
          </Text>
        </BlurView>

        <View style={{ height: 100 }} />
      </ScrollView>

      <DebriefModal 
        visible={isDebriefModalVisible}
        onClose={() => setIsDebriefModalVisible(false)}
        onSubmit={handleDebriefSubmit}
      />
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
  scrollContent: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  welcomeText: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5, flex: 1 },
  profileButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  profileInitial: { width: '100%', height: '100%', borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  profileInitialText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 22 },
  mainCard: { width: '100%', borderRadius: 24, padding: 24, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 0.5, borderColor: 'rgba(0, 229, 255, 0.2)', marginBottom: 20, overflow: 'hidden' },
  cardTitle: { fontSize: 11, fontWeight: '900', color: '#8E8E93', marginBottom: 16, letterSpacing: 1.5, textTransform: 'uppercase' },
  scoreContainer: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 },
  scoreValue: { fontSize: 48, fontWeight: '900', color: '#FFFFFF' },
  scoreMax: { fontSize: 20, fontWeight: '600', color: '#8E8E93', marginLeft: 4 },
  progressTrack: { height: 6, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 3, marginBottom: 20 },
  progressFill: { height: '100%', backgroundColor: '#00E5FF', borderRadius: 3 },
  actionButton: { backgroundColor: '#FFFFFF', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  actionButtonText: { color: '#000000', fontSize: 13, fontWeight: '900' },
  sprintyCard: { borderColor: 'rgba(0, 229, 255, 0.4)', backgroundColor: 'rgba(0, 229, 255, 0.05)' },
  sprintyTitle: { fontSize: 12, fontWeight: '900', color: '#00E5FF', marginBottom: 12, letterSpacing: 1 },
  sprintyAdvice: { fontSize: 15, color: '#FFFFFF', lineHeight: 22, fontWeight: '600' },
  debriefCard: { borderColor: '#00E5FF', backgroundColor: 'rgba(0, 229, 255, 0.1)' },
  debriefTitle: { color: '#00E5FF', fontSize: 12, fontWeight: '900', marginBottom: 8, letterSpacing: 1 },
  debriefText: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 16 },
  debriefBtn: { backgroundColor: '#00E5FF', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  debriefBtnText: { color: '#000', fontWeight: '900', fontSize: 13 },
  prepCard: { borderColor: '#BF5AF2', backgroundColor: 'rgba(191, 90, 242, 0.05)' },
  prepTitle: { color: '#BF5AF2', fontSize: 12, fontWeight: '900', marginBottom: 8, letterSpacing: 1 },
  prepMain: { color: '#FFF', fontSize: 20, fontWeight: '900', marginBottom: 20 },
  compFocusCard: { borderColor: '#00E5FF', borderWidth: 2 },
  compFocusTitle: { color: '#00E5FF', fontSize: 12, fontWeight: '900', marginBottom: 8, letterSpacing: 1 },
  compFocusMain: { color: '#FFF', fontSize: 28, fontWeight: '900', marginBottom: 16 },
  addressBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  addressText: { color: '#00E5FF', fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  bagSection: { borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)', paddingTop: 20, marginBottom: 20 },
  bagHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  bagTitle: { color: '#8E8E93', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  resetBtnText: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  readyBadge: { backgroundColor: 'rgba(0, 229, 255, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#00E5FF' },
  readyBadgeText: { color: '#00E5FF', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  bagProgressContainer: { marginBottom: 20 },
  bagProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  bagProgressText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  bagProgressCount: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700' },
  bagProgressBarBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' },
  bagProgressBarFill: { height: '100%', borderRadius: 2 },
  checklistItems: { gap: 10 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  checkText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600' },
  checkTextActive: { color: '#FFF', textDecorationLine: 'line-through', opacity: 0.6 },
  emptyText: { color: '#555', fontSize: 11, fontWeight: '800' },
  nutritionSection: { borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)', paddingTop: 20, gap: 12 },
  nutriAlert: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  nutriTime: { color: '#00E5FF', fontSize: 12, fontWeight: '900', width: 55 },
  nutriAdvice: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
});

export default DashboardScreen;
