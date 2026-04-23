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
}

export const RecordsManagerModal = ({ visible, onClose, records, onSave }: Props) => {
  const [activeTab, setActiveTab] = useState<'official' | 'training'>('official');
  const [activeTrainingSubTab, setActiveTrainingSubTab] = useState<'athle' | 'muscu'>('athle');
  const [showAddList, setShowAddList] = useState(false);
  
  // Local state for editing
  const [localRecords, setLocalRecords] = useState(records || { official: {}, training: { athle: {}, muscu: {} } });

  const handleUpdateRecord = (category: string, sub: string | null, key: string, value: string, wind?: string) => {
    const updated = { ...localRecords };
    if (!updated[category]) updated[category] = {};
    
    if (sub) {
      if (!updated[category][sub]) updated[category][sub] = {};
      if (wind !== undefined) {
         updated[category][sub][key] = { ...(updated[category][sub][key] || {}), value, wind };
      } else {
         updated[category][sub][key] = value;
      }
    } else {
      if (wind !== undefined) {
        updated[category][key] = { ...(updated[category][key] || {}), value, wind };
      } else {
        updated[category][key] = value;
      }
    }
    setLocalRecords(updated);
  };

  const renderOfficialItem = (discipline: string) => {
    const data = localRecords.official?.[discipline] || { value: '', wind: '' };
    return (
      <View key={discipline} style={styles.recordItem}>
        <Text style={styles.disciplineLabel}>{discipline.toUpperCase()}</Text>
        <View style={styles.inputsRow}>
          <View style={[styles.inputWrapper, { flex: 2 }]}>
            <Text style={styles.microLabel}>TEMPS</Text>
            <TextInput
              style={styles.textInput}
              value={data.value}
              onChangeText={(v) => handleUpdateRecord('official', null, discipline, v, data.wind)}
              placeholder="00.00"
              placeholderTextColor="rgba(255,255,255,0.2)"
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.inputWrapper, { flex: 1 }]}>
            <Text style={styles.microLabel}>VENT</Text>
            <TextInput
              style={styles.textInput}
              value={data.wind}
              onChangeText={(v) => handleUpdateRecord('official', null, discipline, data.value, v)}
              placeholder="+0.0"
              placeholderTextColor="rgba(255,255,255,0.2)"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>
      </View>
    );
  };

  const renderTrainingItem = (discipline: string, isMuscu = false) => {
    const cat = isMuscu ? 'muscu' : 'athle';
    const data = localRecords.training?.[cat]?.[discipline] || '';
    return (
      <View key={discipline} style={styles.recordItem}>
        <Text style={styles.disciplineLabel}>{discipline.toUpperCase()}</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.microLabel}>{isMuscu ? 'CHARGE (KG)' : 'CHRONO'}</Text>
          <TextInput
            style={styles.textInput}
            value={data}
            onChangeText={(v) => handleUpdateRecord('training', cat, discipline, v)}
            placeholder={isMuscu ? "0" : "00.00"}
            placeholderTextColor="rgba(255,255,255,0.2)"
            keyboardType="numeric"
          />
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <BlurView intensity={100} tint="dark" style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>MES RECORDS</Text>
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
              {activeTab === 'official' ? (
                ATHLETICS_DISCIPLINES.filter(d => localRecords.official?.[d]?.value?.length > 0).map(renderOfficialItem)
              ) : (
                activeTrainingSubTab === 'athle' 
                  ? ATHLETICS_DISCIPLINES.filter(d => localRecords.training?.athle?.[d]?.length > 0).map(d => renderTrainingItem(d))
                  : MUSCU_EXERCISES.filter(e => localRecords.training?.muscu?.[e]?.length > 0).map(e => renderTrainingItem(e, true))
              )}
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>

          <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(localRecords)}>
            <LinearGradient
              colors={['#00E5FF', '#00B4D8']}
              style={styles.saveGradient}
            >
              <Text style={styles.saveText}>ENREGISTRER MES RECORDS</Text>
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    borderStyle: 'dashed',
    gap: 8,
    marginTop: 8,
  },
  addBtnText: { color: '#00E5FF', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  addListContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 20,
    marginTop: 8,
  },
  addListTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', marginBottom: 16, textAlign: 'center', letterSpacing: 1 },
  addGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  addItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  addItemText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  cancelAddBtn: { marginTop: 20, alignItems: 'center' },
  cancelAddText: { color: '#FF453A', fontSize: 11, fontWeight: '800' },
});
