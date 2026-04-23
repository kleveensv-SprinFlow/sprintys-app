import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Dimensions,
  Alert
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const PREDEFINED_ITEMS = [
  { id: 'spikes', name: 'Pointes', icon: 'flash' },
  { id: 'pins', name: 'Épingles', icon: 'pin' },
  { id: 'jersey', name: 'Maillot du club', icon: 'shirt' },
  { id: 'drink', name: 'Boisson d\'effort', icon: 'water' },
  { id: 'shoes', name: 'Baskets d\'échauffement', icon: 'walk' },
  { id: 'warmup', name: 'Survêtement', icon: 'body' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  bagItems: any[];
  onUpdateBag: (items: any[]) => void;
}

export const CompetitionBagModal = ({ visible, onClose, bagItems, onUpdateBag }: Props) => {
  const [showLibrary, setShowLibrary] = useState(false);
  const [customItemName, setCustomItemName] = useState('');

  const toggleItem = (item: any) => {
    const exists = bagItems.find(i => i.name === item.name);
    if (exists) {
      onUpdateBag(bagItems.filter(i => i.name !== item.name));
    } else {
      onUpdateBag([...bagItems, { ...item, is_prepared: false }]);
    }
  };

  const togglePrepared = (name: string) => {
    const updated = bagItems.map(i => 
      i.name === name ? { ...i, is_prepared: !i.is_prepared } : i
    );
    onUpdateBag(updated);
  };

  const addCustomItem = () => {
    if (!customItemName.trim()) return;
    const newItem = { id: Date.now().toString(), name: customItemName, icon: 'cube', is_custom: true, is_prepared: false };
    onUpdateBag([...bagItems, newItem]);
    setCustomItemName('');
    setShowLibrary(false);
  };

  const renderPreparedProgress = () => {
    if (bagItems.length === 0) return null;
    const prepared = bagItems.filter(i => i.is_prepared).length;
    const total = bagItems.length;
    const progress = (prepared / total) * 100;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>PRÉPARATION DU SAC</Text>
          <Text style={styles.progressValue}>{prepared}/{total}</Text>
        </View>
        <View style={styles.progressBarBg}>
          <LinearGradient
            colors={['#00E5FF', '#00B4D8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${progress}%` }]}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.iconCircle}>
                <Ionicons name="briefcase" size={20} color="#00E5FF" />
              </View>
              <Text style={styles.title}>SAC DE COMPÉTITION</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {renderPreparedProgress()}

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {bagItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cart-outline" size={64} color="rgba(255,255,255,0.05)" />
                <Text style={styles.emptyTitle}>TON SAC EST VIDE</Text>
                <Text style={styles.emptySub}>Prépare tes accessoires pour ne rien oublier le jour J</Text>
              </View>
            ) : (
              <View style={styles.itemsGrid}>
                {bagItems.map((item, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={[styles.bagItem, item.is_prepared && styles.bagItemPrepared]}
                    onPress={() => togglePrepared(item.name)}
                  >
                    <View style={styles.itemHeader}>
                      <Ionicons 
                        name={item.icon as any} 
                        size={20} 
                        color={item.is_prepared ? '#00E5FF' : 'rgba(255,255,255,0.3)'} 
                      />
                      <TouchableOpacity onPress={() => toggleItem(item)}>
                        <Ionicons name="trash-outline" size={16} color="rgba(255,255,255,0.2)" />
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.itemName, item.is_prepared && styles.itemNamePrepared]}>
                      {item.name.toUpperCase()}
                    </Text>
                    <View style={styles.checkIndicator}>
                      <Ionicons 
                        name={item.is_prepared ? "checkmark-circle" : "ellipse-outline"} 
                        size={18} 
                        color={item.is_prepared ? "#00E5FF" : "rgba(255,255,255,0.1)"} 
                      />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.addBtn} onPress={() => setShowLibrary(true)}>
            <LinearGradient
              colors={['#00E5FF', '#00B4D8']}
              style={styles.addGradient}
            >
              <Ionicons name="library" size={20} color="#000" style={{ marginRight: 8 }} />
              <Text style={styles.addText}>BIBLIOTHÈQUE D'ACCESSOIRES</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Modal Bibliothèque */}
        <Modal visible={showLibrary} animationType="fade" transparent>
          <BlurView intensity={100} tint="dark" style={styles.libraryOverlay}>
            <View style={styles.libraryContent}>
              <View style={styles.libraryHeader}>
                <Text style={styles.libraryTitle}>MES ACCESSOIRES</Text>
                <TouchableOpacity onPress={() => setShowLibrary(false)}>
                  <Ionicons name="close" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>

              <ScrollView>
                <Text style={styles.libSection}>PRÉ-DÉFINIS</Text>
                <View style={styles.libGrid}>
                  {PREDEFINED_ITEMS.map(item => {
                    const isAdded = bagItems.some(i => i.name === item.name);
                    return (
                      <TouchableOpacity 
                        key={item.id} 
                        style={[styles.libItem, isAdded && styles.libItemActive]}
                        onPress={() => toggleItem(item)}
                      >
                        <Ionicons name={item.icon as any} size={24} color={isAdded ? '#00E5FF' : '#FFF'} />
                        <Text style={[styles.libItemText, isAdded && styles.libItemTextActive]}>{item.name}</Text>
                        {isAdded && <Ionicons name="checkmark-circle" size={16} color="#00E5FF" style={styles.checkPos} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.libSection, { marginTop: 32 }]}>AJOUTER UN AUTRE OBJET</Text>
                <View style={styles.customInputContainer}>
                  <TextInput
                    style={styles.customInput}
                    placeholder="Ex: Chaussettes de récup..."
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={customItemName}
                    onChangeText={setCustomItemName}
                  />
                  <TouchableOpacity style={styles.customAddBtn} onPress={addCustomItem}>
                    <Ionicons name="add" size={24} color="#000" />
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </BlurView>
        </Modal>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  iconCircle: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(0, 229, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  title: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  closeBtn: { padding: 8 },
  
  progressContainer: { marginBottom: 24 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800' },
  progressValue: { color: '#00E5FF', fontSize: 10, fontWeight: '900' },
  progressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },

  scroll: { flex: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyTitle: { color: 'rgba(255,255,255,0.2)', fontSize: 14, fontWeight: '900', marginTop: 16, letterSpacing: 1 },
  emptySub: { color: 'rgba(255,255,255,0.1)', fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },

  itemsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  bagItem: { 
    width: (width - 48 - 12) / 2, 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    borderRadius: 20, 
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'space-between',
    minHeight: 120,
  },
  bagItemPrepared: {
    backgroundColor: 'rgba(0,229,255,0.05)',
    borderColor: 'rgba(0,229,255,0.2)',
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900', marginTop: 12, letterSpacing: 1 },
  itemNamePrepared: { color: '#FFF' },
  checkIndicator: { alignItems: 'flex-end', marginTop: 8 },

  addBtn: { marginTop: 24, borderRadius: 16, overflow: 'hidden' },
  addGradient: { paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  addText: { color: '#000', fontSize: 13, fontWeight: '900', letterSpacing: 1 },

  libraryOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  libraryContent: { backgroundColor: '#111', borderRadius: 32, width: '100%', maxHeight: '80%', padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  libraryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  libraryTitle: { color: '#00E5FF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  libSection: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', marginBottom: 16 },
  libGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  libItem: { width: (width - 48 - 60 - 24) / 3, height: 90, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 8 },
  libItemActive: { backgroundColor: 'rgba(0,229,255,0.1)', borderColor: 'rgba(0,229,255,0.3)', borderWidth: 1 },
  libItemText: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '700', textAlign: 'center' },
  libItemTextActive: { color: '#00E5FF' },
  checkPos: { position: 'absolute', top: 8, right: 8 },

  customInputContainer: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  customInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, color: '#FFF', fontSize: 14, fontWeight: '700' },
  customAddBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#00E5FF', justifyContent: 'center', alignItems: 'center' },
});
