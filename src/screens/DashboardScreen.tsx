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
  KeyboardAvoidingView,
  Modal,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { supabase } from '../services/supabaseClient';
import { signOutUser } from '../services/authService';
import { weatherService } from '../services/weatherService';
import WeatherBadge from '../shared/components/WeatherBadge';
import PerformanceCard from '../shared/components/PerformanceCard';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useRef } from 'react';

const { width } = Dimensions.get('window');

const BAG_CHECKLIST_ITEMS = [
  'Pointes & Pointes de rechange',
  'Maillot & Épingles',
  'Chaussures d\'échauffement',
  'Bouteille d\'eau & Boisson d\'effort',
  'Goûter / Barres',
  'Rouleau / Elastiques'
];

const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const [profile, setProfile] = useState<any>(null);
  const [userName, setUserName] = useState<string>('');
  const [dailyScore, setDailyScore] = useState<number | null>(null);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [lastWorkout, setLastWorkout] = useState<any>(null);
  const [todayCompetition, setTodayCompetition] = useState<any>(null);
  const [pendingDebrief, setPendingDebrief] = useState<any>(null);
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bagChecked, setBagChecked] = useState<Record<string, boolean>>({});

  // États Modal Débriefing
  const [showDebriefModal, setShowDebriefModal] = useState(false);
  const [debriefData, setDebriefData] = useState<any[]>([]);
  const [debriefNotes, setDebriefNotes] = useState('');
  const [isSubmittingDebrief, setIsSubmittingDebrief] = useState(false);

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

        const now = new Date().toISOString();
        const todayStr = now.split('T')[0];

        // Détection Compétition Aujourd'hui (Focus Persistant)
        const { data: compData } = await supabase
          .from('workouts')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_competition', true)
          .gte('created_at', `${todayStr}T00:00:00`)
          .lte('created_at', `${todayStr}T23:59:59`)
          .limit(1);

        const activeComp = compData?.[0];
        if (activeComp) {
          // Calculer si la compétition est "finie" pour aujourd'hui
          const lastEvent = activeComp.competition_schedule?.reduce((prev: any, current: any) => {
            return (prev.time > current.time) ? prev : current;
          });
          
          if (lastEvent) {
            const [hours, minutes] = lastEvent.time.split(':').map(Number);
            const eventDate = new Date();
            eventDate.setHours(hours, minutes, 0, 0);
            
            if (new Date() < eventDate) {
              setTodayCompetition(activeComp);
            } else {
              setTodayCompetition(null); // On ne l'affiche plus dans "Focus" mais on n'affiche pas encore le debrief
            }
          } else {
            setTodayCompetition(activeComp);
          }
        } else {
          setTodayCompetition(null);
        }

        // Détection Compétition Passée sans Résultats (J+1)
        const { data: pastCompData } = await supabase
          .from('workouts')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_competition', true)
          .lt('created_at', `${todayStr}T00:00:00`) // Uniquement à partir du lendemain
          .filter('notes', 'not.ilike', '%RÉSULTATS OFFICIELS :%')
          .order('created_at', { ascending: false })
          .limit(1);

        if (pastCompData && pastCompData.length > 0) {
          setPendingDebrief(pastCompData[0]);
          const initialResults = pastCompData[0].competition_schedule?.map((item: any) => ({
            event: item.event,
            time: '',
            perf: '',
            wind: '',
            place: '',
          })) || [];
          setDebriefData(initialResults);
        } else {
          setPendingDebrief(null);
        }

        const { data: workoutData } = await supabase
          .from('workouts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        setLastWorkout(workoutData?.[0] || null);
      }
    } catch (error) {
      console.error('Erreur data:', error);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  const handleSaveDebrief = async () => {
    if (isSubmittingDebrief) return;
    setIsSubmittingDebrief(true);
    try {
      // 1. Sauvegarder les résultats dans le workout
      const { error: updateError } = await supabase
        .from('workouts')
        .update({ 
          results: debriefData,
          notes: `${pendingDebrief.notes}\n\nRÉSULTATS OFFICIELS :\n${debriefData.map(d => `${d.event} : ${d.perf} (${d.wind}m/s) - ${d.place}`).join('\n')}\n\nDÉBRIEFING : ${debriefNotes}`
        })
        .eq('id', pendingDebrief.id);

      if (updateError) throw updateError;

      // 2. Logique de Record Personnel (PB)
      let updatedRecords = { ...(profile?.personal_records || {}) };
      let pbFound = false;

      debriefData.forEach(res => {
        const dist = res.event.toLowerCase();
        if (['60m', '100m', '200m'].includes(dist)) {
          const currentPB = parseFloat(updatedRecords[dist]);
          const newPerf = parseFloat(res.perf.replace(',', '.').replace('"', ''));
          const wind = parseFloat(res.wind.replace(',', '.'));

          if (!isNaN(newPerf) && (isNaN(currentPB) || newPerf < currentPB)) {
            if (wind <= 2.0) {
              updatedRecords[dist] = newPerf.toFixed(2);
              pbFound = true;
            } else {
              console.log(`PB non homologué pour ${dist} (Vent: ${wind}m/s)`);
            }
          }
        }
      });

      if (pbFound) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ personal_records: updatedRecords })
          .eq('id', profile.id);
        if (profileError) throw profileError;
        Alert.alert('FÉLICITATIONS !', 'De nouveaux records personnels ont été enregistrés dans ta Record Room.');
      }

      setShowDebriefModal(false);
      setPendingDebrief(null);
      fetchUserData();
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setIsSubmittingDebrief(false);
    }
  };

  const toggleBagItem = (item: string) => {
    setBagChecked(prev => ({ ...prev, [item]: !prev[item] }));
  };

  const getSprintyAdvice = (shapeScore: number | null, workout: any) => {
    if (todayCompetition) return "JOUR DE COURSE. C'est le moment de tout donner. Concentre-toi sur ton processus d'échauffement et reste dans ta bulle.";
    if (pendingDebrief) return "ANALYSE REQUISE. Une compétition est terminée. Saisis tes résultats pour mettre à jour ta Record Room.";
    if (!hasCheckedInToday || shapeScore === null) return "Fais ton check-in pour recevoir ton analyse de performance.";
    
    const lastRpe = workout?.rpe || 0;
    if (shapeScore >= 85 && lastRpe < 7) return "ÉTAT OPTIMAL. Journée idéale pour une séance de haute intensité ou un test de vitesse.";
    if (shapeScore >= 80 && lastRpe >= 8) return "FORCE ET FATIGUE. Ton système nerveux est prêt, mais tes muscles ont subi une grosse charge hier. Focus sur la technique pure, évite le lactique aujourd'hui.";
    if (shapeScore < 65 && lastRpe >= 8) return "ALERTE RÉCUPÉRATION. Dette de sommeil et charge élevée détectées. Risque de blessure accru. Priorise une séance de récupération active (mobilité) ou un repos complet.";
    if (shapeScore < 65 && lastRpe < 5) return "FATIGUE NERVEUSE. Malgré un repos relatif hier, ta forme reste basse. Vérifie ton hydratation et ta nutrition avant ta séance.";
    return "MAINTIEN. Séance modérée possible. Écoute tes sensations sur tes premières accélérations.";
  };

  const viewRef = useRef<View>(null);

  const handleSharePerformance = async (item: any) => {
    try {
      const uri = await captureRef(viewRef, {
        format: 'png',
        quality: 1.0,
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Partager ma performance',
        UTI: 'public.png',
      });
    } catch (error) {
      console.error('Erreur partage:', error);
      Alert.alert('Erreur', 'Impossible de générer la carte de performance.');
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
      <View style={styles.lightBackground}>
        <View style={[styles.lightCircle, styles.cyanCircle]} />
        <View style={[styles.lightCircle, styles.purpleCircle]} />
      </View>
      <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
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

        {/* Action Requise : Débriefing */}
        {pendingDebrief && (
          <TouchableOpacity onPress={() => setShowDebriefModal(true)}>
            <BlurView intensity={60} tint="default" style={[styles.mainCard, styles.debriefCard]}>
              <Text style={styles.debriefTitle}>ACTION REQUISE</Text>
              <Text style={styles.debriefMain}>SAISIR MES RÉSULTATS - {pendingDebrief.city?.toUpperCase()}</Text>
              <Text style={styles.debriefSub}>La compétition est terminée. Mets à jour tes records.</Text>
            </BlurView>
          </TouchableOpacity>
        )}

        {/* Focus Compétition (Jour J) */}
        {todayCompetition && (
          <BlurView intensity={60} tint="default" style={[styles.mainCard, styles.compFocusCard]}>
            <Text style={styles.compFocusTitle}>FOCUS COMPÉTITION</Text>
            <Text style={styles.compFocusMain}>JOUR DE COURSE - {todayCompetition.city?.toUpperCase() || 'STADE'}</Text>
            
            {todayCompetition.address && (
              <TouchableOpacity 
                style={styles.addressBtn} 
                onPress={() => Linking.openURL(`geo:0,0?q=${todayCompetition.address}`)}
              >
                <Text style={styles.addressText}>📍 {todayCompetition.address.toUpperCase()}</Text>
              </TouchableOpacity>
            )}

            <View style={styles.bagSection}>
              <Text style={styles.bagTitle}>MON SAC</Text>
              {BAG_CHECKLIST_ITEMS.map((item, idx) => (
                <TouchableOpacity key={idx} style={styles.checkItem} onPress={() => toggleBagItem(item)}>
                  <View style={[styles.checkbox, bagChecked[item] && styles.checkboxActive]}>
                    {bagChecked[item] && <View style={styles.checkInner} />}
                  </View>
                  <Text style={[styles.checkText, bagChecked[item] && styles.checkTextActive]}>{item.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </BlurView>
        )}

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

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal Débriefing */}
      <Modal visible={showDebriefModal} animationType="slide" transparent>
        <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>DÉBRIEFING : {pendingDebrief?.city?.toUpperCase()}</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {debriefData.map((item, index) => (
                  <View key={index} style={styles.debriefItem}>
                    <Text style={styles.debriefItemTitle}>{item.event.toUpperCase()}</Text>
                    <View style={styles.debriefGrid}>
                      <View style={styles.debriefInputGroup}>
                        <Text style={styles.debriefLabel}>CHRONO</Text>
                        <TextInput 
                          style={styles.debriefInput} 
                          value={item.perf} 
                          onChangeText={(val) => {
                            const newD = [...debriefData];
                            newD[index].perf = val;
                            setDebriefData(newD);
                          }} 
                          placeholder='10"85' 
                          placeholderTextColor="#555"
                        />
                      </View>
                      <View style={styles.debriefInputGroup}>
                        <Text style={styles.debriefLabel}>VENT (M/S)</Text>
                        <TextInput 
                          style={styles.debriefInput} 
                          value={item.wind} 
                          onChangeText={(val) => {
                            const newD = [...debriefData];
                            newD[index].wind = val;
                            setDebriefData(newD);
                          }} 
                          placeholder="+1.2" 
                          placeholderTextColor="#555"
                        />
                      </View>
                      <View style={styles.debriefInputGroup}>
                        <Text style={styles.debriefLabel}>PLACE</Text>
                        <TextInput 
                          style={styles.debriefInput} 
                          value={item.place} 
                          onChangeText={(val) => {
                            const newD = [...debriefData];
                            newD[index].place = val;
                            setDebriefData(newD);
                          }} 
                          placeholder="2ÈME" 
                          placeholderTextColor="#555"
                        />
                      </View>
                    </View>
                    {item.perf && (
                      <TouchableOpacity 
                        style={styles.sharePerfBtn} 
                        onPress={() => handleSharePerformance(item)}
                      >
                        <Text style={styles.sharePerfText}>PARTAGER CETTE PERFORMANCE</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <Text style={styles.debriefLabel}>SENSATIONS / NOTES</Text>
                <TextInput 
                  style={styles.debriefTextArea} 
                  value={debriefNotes} 
                  onChangeText={setDebriefNotes} 
                  multiline 
                  placeholder="Comment t'es-tu senti ?" 
                  placeholderTextColor="#555"
                />
                
                <TouchableOpacity style={styles.debriefSaveBtn} onPress={handleSaveDebrief} disabled={isSubmittingDebrief}>
                  {isSubmittingDebrief ? <ActivityIndicator color="#000" /> : <Text style={styles.debriefSaveText}>ENREGISTRER MES RÉSULTATS</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.debriefCancelBtn} onPress={() => setShowDebriefModal(false)}>
                  <Text style={styles.debriefCancelText}>ANNULER</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </BlurView>
      </Modal>

      {/* Rendu off-screen pour la capture */}
      <View style={{ position: 'absolute', left: -5000 }} collapsable={false}>
        <View ref={viewRef}>
          {debriefData.length > 0 && (
            <PerformanceCard 
              event={debriefData[0].event}
              perf={debriefData[0].perf || '--" --'}
              wind={debriefData[0].wind || '0.0'}
              city={pendingDebrief?.city || 'STADE'}
              date={new Date(pendingDebrief?.created_at || Date.now()).toLocaleDateString('fr-FR')}
            />
          )}
        </View>
      </View>
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
  mainCard: { width: '100%', borderRadius: 24, padding: 24, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 0.5, borderColor: 'rgba(0, 229, 255, 0.2)', marginBottom: 20, overflow: 'hidden' },
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
  weatherGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  weatherStat: { flex: 1 },
  statLabel: { color: '#8E8E93', fontSize: 9, fontWeight: '800', marginBottom: 4 },
  statValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  statDesc: { color: '#00E5FF', fontSize: 10, fontWeight: '700', marginTop: 2 },
  weatherAdviceContainer: { borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.05)', paddingTop: 16 },
  weatherAdvice: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  compFocusCard: { borderColor: '#FFD700', backgroundColor: 'rgba(255, 215, 0, 0.05)' },
  compFocusTitle: { fontSize: 12, fontWeight: '900', color: '#FFD700', marginBottom: 12, letterSpacing: 1 },
  compFocusMain: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', marginBottom: 24 },
  bagSection: { borderTopWidth: 1, borderTopColor: 'rgba(255, 215, 0, 0.2)', paddingTop: 16 },
  bagTitle: { fontSize: 10, fontWeight: '900', color: '#FFD700', marginBottom: 12, letterSpacing: 1.5 },
  checkItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#00E5FF', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: '#00E5FF' },
  checkInner: { width: 8, height: 8, backgroundColor: '#000000', borderRadius: 2 },
  checkText: { color: '#8E8E93', fontSize: 11, fontWeight: '700' },
  checkTextActive: { color: '#FFFFFF' },
  debriefCard: { borderColor: '#00E5FF', backgroundColor: 'rgba(0, 229, 255, 0.05)' },
  debriefTitle: { fontSize: 12, fontWeight: '900', color: '#00E5FF', marginBottom: 12, letterSpacing: 1 },
  debriefMain: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 },
  debriefSub: { fontSize: 12, color: '#8E8E93', fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1C1C1E', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, height: '90%' },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', marginBottom: 24, letterSpacing: 1 },
  debriefItem: { marginBottom: 24, backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  debriefItemTitle: { color: '#00E5FF', fontSize: 14, fontWeight: '900', marginBottom: 16, letterSpacing: 1 },
  debriefGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  debriefInputGroup: { width: '30%' },
  debriefLabel: { color: '#8E8E93', fontSize: 9, fontWeight: '800', marginBottom: 6, textTransform: 'uppercase' },
  debriefInput: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 10, padding: 10, color: '#FFFFFF', fontSize: 15, fontWeight: '700', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  debriefTextArea: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 16, padding: 16, color: '#FFFFFF', fontSize: 15, height: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', marginTop: 8 },
  debriefSaveBtn: { backgroundColor: '#00E5FF', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 32 },
  debriefSaveText: { color: '#000000', fontSize: 16, fontWeight: '900' },
  debriefCancelBtn: { alignItems: 'center', marginTop: 16, paddingBottom: 20 },
  debriefCancelText: { color: '#8E8E93', fontSize: 14, fontWeight: '700' },
  sharePerfBtn: { marginTop: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#00E5FF', alignItems: 'center', backgroundColor: 'rgba(0, 229, 255, 0.05)' },
  sharePerfText: { color: '#00E5FF', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  addressBtn: { backgroundColor: 'rgba(255, 255, 255, 0.05)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  addressText: { color: '#00E5FF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
});

export default DashboardScreen;
