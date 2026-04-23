import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Dimensions,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const BagItemRow = ({ item, onTogglePrepared, onDelete }: any) => {
  return (
    <View style={styles.itemRow}>
      <TouchableOpacity 
        style={styles.itemMain}
        onPress={() => onTogglePrepared(item.name)}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={item.is_prepared ? "checkmark-circle" : "ellipse-outline"} 
          size={24} 
          color={item.is_prepared ? "#00E5FF" : "rgba(255,255,255,0.2)"} 
        />
        <Text style={[
          styles.itemText,
          item.is_prepared && styles.itemTextPrepared
        ]}>
          {item.name.toUpperCase()}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => onDelete(item)} style={styles.deleteBtn}>
        <Ionicons name="close" size={20} color="rgba(255,59,48,0.4)" />
      </TouchableOpacity>
    </View>
  );
};

export const CompetitionBagModal = ({ visible, onClose, bagItems, onUpdateBag }: any) => {
  const [showAddModule, setShowAddModule] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const inputRef = useRef<any>(null);

  useEffect(() => {
    if (showAddModule) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [showAddModule]);

  const toggleItem = (item: any) => {
    onUpdateBag(bagItems.filter((i: any) => i.name !== item.name));
  };

  const togglePrepared = (name: string) => {
    const updated = bagItems.map((i: any) => 
      i.name === name ? { ...i, is_prepared: !i.is_prepared } : i
    );
    onUpdateBag(updated);
  };

  const addItem = () => {
    const trimmed = newItemName.trim();
    if (!trimmed) return;
    
    const currentItems = Array.isArray(bagItems) ? [...bagItems] : [];
    
    if (currentItems.some((i: any) => i.name.toLowerCase() === trimmed.toLowerCase())) {
      setNewItemName('');
      setShowAddModule(false);
      return;
    }

    const newItem = { 
      id: `item-${Date.now()}`, 
      name: trimmed, 
      is_prepared: false 
    };

    onUpdateBag([...currentItems, newItem]);
    setNewItemName('');
    setShowAddModule(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <BlurView intensity={100} tint="dark" style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="briefcase" size={20} color="#BF5AF2" />
              </View>
              <Text style={styles.title}>MES ACCESSOIRES</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeHeaderBtn}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.addTrigger} onPress={() => setShowAddModule(true)}>
            <Ionicons name="add" size={24} color="#00E5FF" />
            <Text style={styles.addTriggerText}>AJOUTER UN ACCESSOIRE</Text>
          </TouchableOpacity>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {bagItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>AUCUN ACCESSOIRE ENREGISTRÉ</Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {bagItems.map((item: any, idx: number) => (
                  <BagItemRow 
                    key={item.id || idx} 
                    item={item} 
                    onTogglePrepared={togglePrepared}
                    onDelete={toggleItem}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        </View>

        {/* Modal d'ajout rapide */}
        <Modal visible={showAddModule} transparent animationType="fade">
          <BlurView intensity={80} tint="dark" style={styles.overlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
              <View style={styles.modalBody}>
                <Text style={styles.modalTitle}>NOUVEL OBJET</Text>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  placeholder="EX: POINTES, CHRONO..."
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={newItemName}
                  onChangeText={setNewItemName}
                  onSubmitEditing={addItem}
                  autoCapitalize="characters"
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelAction} onPress={() => setShowAddModule(false)}>
                    <Text style={styles.cancelActionText}>ANNULER</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmAction} onPress={addItem}>
                    <Text style={styles.confirmActionText}>AJOUTER</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
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
    height: height * 0.8, 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(191, 90, 242, 0.1)', justifyContent: 'center', alignItems: 'center' },
  title: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 1.5 },
  closeHeaderBtn: { padding: 8 },
  addTrigger: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    padding: 16, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 24
  },
  addTriggerText: { color: '#00E5FF', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  scroll: { flex: 1 },
  listContainer: { gap: 4 },
  itemRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)'
  },
  itemMain: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
  itemText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '700' },
  itemTextPrepared: { color: '#FFF' },
  deleteBtn: { padding: 8 },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: 'rgba(255,255,255,0.1)', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  keyboardView: { width: '100%', alignItems: 'center' },
  modalBody: { backgroundColor: '#111', borderRadius: 24, width: '100%', padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', boxShadow: '0px 10px 30px rgba(0,0,0,0.5)' },
  modalTitle: { color: '#BF5AF2', fontSize: 14, fontWeight: '900', letterSpacing: 2, marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, color: '#FFF', fontSize: 14, fontWeight: '800', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelAction: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  cancelActionText: { color: '#FF3B30', fontSize: 12, fontWeight: '800' },
  confirmAction: { flex: 1, backgroundColor: '#00E5FF', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  confirmActionText: { color: '#000', fontSize: 12, fontWeight: '900' },
});
