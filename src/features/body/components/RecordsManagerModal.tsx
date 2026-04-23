import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Platform,
  Dimensions,
  Alert
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const ATHLETICS_DISCIPLINES = ['60m', '100m', '200m', '400m', 'Longueur', 'Triple'];
const MUSCU_EXERCISES = ['Squat', 'Power Clean', 'Bench Press', 'Deadlift', 'Hip Thrust'];

interface Props {
  visible: boolean;
  onClose: () => void;
  records: any;
  onSave: (newRecords: any) => void;
  onQuickAdd: () => void;
}

export const RecordsManagerModal = ({ visible, onClose, records, onSave, onQuickAdd }: Props) => {
  const [activeTab, setActiveTab] = useState<'official' | 'training'>('official');
  const [activeTrainingSubTab, setActiveTrainingSubTab] = useState<'athle' | 'muscu'>('athle');

  const renderOfficialItem = (discipline: string) => {
    const history = records?.official?.[discipline] || [];
    // Si c'est encore l'ancien format (objet simple), on simule un historique
    const entries = Array.isArray(history) ? history : [history];
    
    // Meilleur record (temps le plus bas)
    const best = entries.length > 0 
      ? entries.reduce((prev, curr) => parseFloat(curr.value) < parseFloat(prev.value) ? curr : prev)
      : { value: '--', wind: '' };

    return (
      <TouchableOpacity 
        key={discipline} 
        activeOpacity={0.8}
        onPress={() => onQuickAdd({ type: 'official', discipline, history: entries })}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.05)', 'rgba(0,229,255,0.02)']}
          style={styles.premiumRecordCard}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.premiumDiscipline}>{discipline.toUpperCase()}</Text>
            <View style={styles.pbBadge}>
              <Text style={styles.pbText}>BEST</Text>
            </View>
          </View>
          
          <View style={styles.performanceRow}>
            <View style={styles.mainPerf}>
              <Text style={styles.perfValue}>{best.value}</Text>
              <Text style={styles.perfUnit}>SEC</Text>
            </View>
            
            {best.wind && (
              <View style={styles.windContainer}>
                <Ionicons name="flag" size={12} color="rgba(255,255,255,0.4)" />
                <Text style={styles.windText}>{parseFloat(best.wind) > 0 ? `+${best.wind}` : best.wind} m/s</Text>
              </View>
            )}
          </View>
          
          <View style={styles.cardFooter}>
            <Text style={styles.competitionLabel}>HISTORIQUE & PROGRESSION</Text>
            <Ionicons name="stats-chart" size={14} color="rgba(0,229,255,0.3)" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderTrainingItem = (discipline: string, isMuscu = false) => {
    const cat = isMuscu ? 'muscu' : 'athle';
    const history = records?.training?.[cat]?.[discipline] || [];
    const entries = Array.isArray(history) ? history : [typeof history === 'string' ? { value: history } : history];

    // Meilleur record (max pour muscu, min pour athle)
    const best = entries.length > 0
      ? entries.reduce((prev, curr) => {
          const vP = parseFloat(prev.value);
          const vC = parseFloat(curr.value);
          if (isMuscu) return vC > vP ? curr : prev;
          return vC < vP ? curr : prev;
        })
      : { value: '--' };

    return (
      <TouchableOpacity 
        key={discipline} 
        activeOpacity={0.8}
        onPress={() => onQuickAdd({ 
          type: isMuscu ? 'training_muscu' : 'training_athle', 
          discipline, 
          history: entries 
        })}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.05)', 'rgba(191,90,242,0.02)']}
          style={[styles.premiumRecordCard, isMuscu && styles.muscuCard]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.premiumDiscipline, isMuscu && { color: '#BF5AF2' }]}>{discipline.toUpperCase()}</Text>
            <Ionicons name={isMuscu ? "barbell" : "timer"} size={16} color="rgba(255,255,255,0.1)" />
          </View>

          <View style={styles.performanceRow}>
            <View style={styles.mainPerf}>
              <Text style={styles.perfValue}>{best.value}</Text>
              <Text style={styles.perfUnit}>{isMuscu ? 'KG' : 'SEC'}</Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.competitionLabel}>HISTORIQUE & PROGRESSION</Text>
            <Ionicons name="stats-chart" size={14} color="rgba(255,255,255,0.1)" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <BlurView intensity={100} tint="dark" style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={styles.title}>MES RECORDS</Text>
              <TouchableOpacity onPress={onQuickAdd} style={styles.headerAddBtn}>
                <Ionicons name="add" size={22} color="#00E5FF" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Main Tabs */}
          <View style={styles.tabBar}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'official' && styles.activeTab]}
              onPress={() => setActiveTab('official')}
            >
              <Text style={[styles.tabText, activeTab === 'official' && styles.activeTabText]}>OFFICIEL</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'training' && styles.activeTab]}
              onPress={() => setActiveTab('training')}
            >
              <Text style={[styles.tabText, activeTab === 'training' && styles.activeTabText]}>ENTRAÎNEMENT</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'training' && (
            <View style={styles.subTabBar}>
              <TouchableOpacity 
                style={[styles.subTab, activeTrainingSubTab === 'athle' && styles.activeSubTab]}
                onPress={() => setActiveTrainingSubTab('athle')}
              >
                <Text style={[styles.subTabText, activeTrainingSubTab === 'athle' && styles.activeSubTabText]}>ATHLÉ</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.subTab, activeTrainingSubTab === 'muscu' && styles.activeSubTab]}
                onPress={() => setActiveTrainingSubTab('muscu')}
              >
                <Text style={[styles.subTabText, activeTrainingSubTab === 'muscu' && styles.activeSubTabText]}>MUSCU</Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.grid}>
              {activeTab === 'official' 
                ? ATHLETICS_DISCIPLINES.filter(d => records?.official?.[d] && (Array.isArray(records.official[d]) ? records.official[d].length > 0 : true)).map(renderOfficialItem)
                : activeTrainingSubTab === 'athle' 
                  ? ATHLETICS_DISCIPLINES.filter(d => records?.training?.athle?.[d] && (Array.isArray(records.training.athle[d]) ? records.training.athle[d].length > 0 : true)).map(d => renderTrainingItem(d))
                  : MUSCU_EXERCISES.filter(e => records?.training?.muscu?.[e] && (Array.isArray(records.training.muscu[e]) ? records.training.muscu[e].length > 0 : true)).map(e => renderTrainingItem(e, true))
              }
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>

          <TouchableOpacity style={styles.saveBtn} onPress={() => onQuickAdd()}>
            <LinearGradient
              colors={['#00E5FF', '#00B4D8']}
              style={styles.saveGradient}
            >
              <Text style={styles.saveText}>AJOUTER UN RECORD</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  content: { 
    backgroundColor: '#0A0A0A', 
    height: height * 0.85, 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32,
    padding: 24,
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 24,
  },
  title: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  closeBtn: { padding: 8 },
  tabBar: { 
    flexDirection: 'row', 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  activeTab: { backgroundColor: 'rgba(255,255,255,0.1)' },
  tabText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  activeTabText: { color: '#00E5FF' },
  
  subTabBar: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  subTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  activeSubTab: { borderColor: '#00E5FF', backgroundColor: 'rgba(0,229,255,0.1)' },
  subTabText: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800' },
  activeSubTabText: { color: '#00E5FF' },

  scroll: { flex: 1 },
  grid: { gap: 16 },
  recordItem: { 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    borderRadius: 20, 
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  disciplineLabel: { color: '#00E5FF', fontSize: 10, fontWeight: '900', marginBottom: 12, letterSpacing: 1 },
  inputsRow: { flexDirection: 'row', gap: 12 },
  inputWrapper: { gap: 6 },
  microLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: '800' },
  textInput: { 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    borderRadius: 10, 
    padding: 12, 
    color: '#FFF', 
    fontSize: 16, 
    fontWeight: '700' 
  },
  saveBtn: { marginTop: 16, borderRadius: 16, overflow: 'hidden' },
  saveGradient: { paddingVertical: 18, alignItems: 'center' },
  saveText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  displayRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  displayItem: { flex: 1, gap: 4 },
  displayText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  headerAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },
  premiumRecordCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 12,
  },
  muscuCard: {
    borderColor: 'rgba(191,90,242,0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  premiumDiscipline: {
    color: '#00E5FF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  pbBadge: {
    backgroundColor: 'rgba(0,229,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.3)',
  },
  pbText: {
    color: '#00E5FF',
    fontSize: 8,
    fontWeight: '900',
  },
  performanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  mainPerf: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  perfValue: {
    color: '#FFF',
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 42,
    textShadow: '0px 2px 4px rgba(0, 0, 0, 0.8)',
  },
  perfUnit: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  windContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 6,
  },
  windText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  competitionLabel: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  }
});
