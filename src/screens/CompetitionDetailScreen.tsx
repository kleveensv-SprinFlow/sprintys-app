import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Workout } from '../features/workouts/types';

const { width, height } = Dimensions.get('window');

const TimelineItem = ({ time, title, description, isPassed, isCurrent, icon, color }: any) => {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timeContainer}>
        <Text style={[styles.timeText, isCurrent && styles.activeText]}>{time}</Text>
        <View style={[styles.dot, isPassed && styles.passedDot, isCurrent && { backgroundColor: color, scale: 1.2 }]} />
        <View style={styles.line} />
      </View>
      
      <View style={[styles.cardContainer, isCurrent && { borderColor: color, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.05)' }]}>
        <View style={[styles.iconBox, { backgroundColor: isPassed ? 'rgba(255,255,255,0.05)' : color + '20' }]}>
          <Ionicons name={icon} size={20} color={isPassed ? 'rgba(255,255,255,0.2)' : color} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.itemTitle, isPassed && styles.passedText]}>{title.toUpperCase()}</Text>
          <Text style={styles.itemDesc}>{description}</Text>
        </View>
      </View>
    </View>
  );
};

const CompetitionDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { competition } = route.params as { competition: Workout };

  // Logic to calculate timeline based on competition_time and call_room_time
  const generateTimeline = () => {
    const raceTime = competition.competition_time || "14:00";
    const callRoomTime = competition.call_room_time || "13:40";
    
    // Helper to subtract minutes from HH:mm
    const subtractMinutes = (timeStr: string, minutes: number) => {
      const [h, m] = timeStr.split(':').map(Number);
      const date = new Date();
      date.setHours(h, m - minutes, 0);
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    return [
      {
        time: subtractMinutes(raceTime, 240),
        title: "Dernier repas complet",
        description: "Focus glucides lents, évite les fibres et graisses.",
        icon: "restaurant",
        color: "#32ADE6"
      },
      {
        time: subtractMinutes(raceTime, 120),
        title: "Arrivée au stade",
        description: "Repérage, retrait dossard, début routine mentale.",
        icon: "location",
        color: "#32ADE6"
      },
      {
        time: subtractMinutes(raceTime, 90),
        title: "Début échauffement",
        description: "Footing, gammes, activation dynamique.",
        icon: "flash",
        color: "#BF5AF2"
      },
      {
        time: subtractMinutes(callRoomTime, 20),
        title: "Mise des pointes",
        description: "Dernières accélérations, passage en tenue de course.",
        icon: "speedometer",
        color: "#BF5AF2"
      },
      {
        time: callRoomTime,
        title: "Chambre d'appel",
        description: "Vérification dossard, pointes et sac.",
        icon: "exit",
        color: "#FF3B30"
      },
      {
        time: raceTime,
        title: "DÉPART COURSE",
        description: "C'est ton moment. Focus sur ta ligne.",
        icon: "trophy",
        color: "#FFD700"
      }
    ];
  };

  const timeline = generateTimeline();
  const now = new Date();
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#050505', '#0A0A0A']} style={StyleSheet.absoluteFill} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>PLAN DE BATAILLE</Text>
          <Text style={styles.headerSubtitle}>{competition.city?.toUpperCase() || 'COMPÉTITION'}</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <BlurView intensity={30} tint="default" style={styles.summaryBlur}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>COURSE</Text>
              <Text style={styles.summaryValue}>{competition.competition_time || "--:--"}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>CH. APPEL</Text>
              <Text style={styles.summaryValue}>{competition.call_room_time || "--:--"}</Text>
            </View>
          </BlurView>
        </View>

        <View style={styles.timelineContainer}>
          {timeline.map((item, index) => {
            const isPassed = item.time < currentTimeStr;
            const isNext = !isPassed && (index === 0 || timeline[index-1].time < currentTimeStr);
            
            return (
              <TimelineItem 
                key={index}
                {...item}
                isPassed={isPassed}
                isCurrent={isNext}
              />
            );
          })}
        </View>

        <View style={styles.footer}>
          <Ionicons name="shield-checkmark" size={24} color="rgba(0, 229, 255, 0.4)" />
          <Text style={styles.footerText}>SPRINTY VEILLE SUR TON TIMING</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    marginBottom: 20
  },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#BF5AF2', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  headerSubtitle: { color: '#FFF', fontSize: 20, fontWeight: '800', marginTop: 4 },
  placeholder: { width: 44 },
  scroll: { padding: 20 },
  summaryCard: { marginBottom: 40, borderRadius: 24, overflow: 'hidden' },
  summaryBlur: { flexDirection: 'row', padding: 24, alignItems: 'center', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  summaryValue: { color: '#00E5FF', fontSize: 28, fontWeight: '900' },
  divider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)' },
  timelineContainer: { paddingLeft: 10 },
  timelineRow: { flexDirection: 'row', marginBottom: 30, minHeight: 80 },
  timeContainer: { width: 60, alignItems: 'center', marginRight: 15 },
  timeText: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '800' },
  activeText: { color: '#FFF' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 10, zIndex: 2 },
  passedDot: { backgroundColor: 'rgba(255,255,255,0.05)' },
  line: { position: 'absolute', top: 20, width: 2, height: '120%', backgroundColor: 'rgba(255,255,255,0.05)', zIndex: 1 },
  cardContainer: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.02)',
    gap: 16
  },
  iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  textContainer: { flex: 1 },
  itemTitle: { color: '#FFF', fontSize: 13, fontWeight: '800', marginBottom: 4 },
  passedText: { opacity: 0.3 },
  itemDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '500', lineHeight: 16 },
  footer: { alignItems: 'center', marginTop: 40, marginBottom: 60, gap: 12 },
  footerText: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }
});

export default CompetitionDetailScreen;
