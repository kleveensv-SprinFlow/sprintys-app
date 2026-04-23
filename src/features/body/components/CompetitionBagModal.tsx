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
  Animated,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const AnimatedBagItem = ({ item, onTogglePrepared, onDelete }: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const checkAnim = useRef(new Animated.Value(item.is_prepared ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(checkAnim, {
      toValue: item.is_prepared ? 1 : 0,
      useNativeDriver: true,
      friction: 4
    }).start();
  }, [item.is_prepared]);

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true })
    ]).start();
    onTogglePrepared(item.name);
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.8} 
      onPress={handlePress}
      style={styles.bagItemWrapper}
    >
      <Animated.View style={[
        styles.bagItem, 
        item.is_prepared && styles.bagItemPrepared,
        { transform: [{ scale: scaleAnim }] }
      ]}>
        <View style={styles.itemHeader}>
          <View style={[styles.iconCircleSmall, item.is_prepared && styles.iconCircleSmallActive]}>
            <Ionicons 
              name={item.icon || 'cube-outline'} 
              size={18} 
              color={item.is_prepared ? '#000' : 'rgba(255,255,255,0.4)'} 
            />
          </View>
          <TouchableOpacity onPress={() => onDelete(item)} style={styles.deleteMiniBtn}>
            <Ionicons name="trash-outline" size={16} color="rgba(255,59,48,0.5)" />
          </TouchableOpacity>
        </View>

        <Text style={[styles.itemName, item.is_prepared && styles.itemNamePrepared]}>
          {item.name.toUpperCase()}
        </Text>

        <View style={styles.checkIndicator}>
          <Animated.View style={{ 
            transform: [{ scale: checkAnim }],
            opacity: checkAnim 
          }}>
            <LinearGradient
              colors={['#00E5FF', '#00B4D8']}
              style={styles.checkCircle}
            >
              <Ionicons name="checkmark" size={12} color="#000" />
            </LinearGradient>
          </Animated.View>
          {!item.is_prepared && (
            <View style={styles.emptyCircle}>
              <View style={styles.emptyCircleInner} />
            </View>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
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
    
    // S'assurer que bagItems est bien un tableau
    const currentItems = Array.isArray(bagItems) ? [...bagItems] : [];
    
    if (currentItems.some((i: any) => i.name.toLowerCase() === trimmed.toLowerCase())) {
      setNewItemName('');
      setShowAddModule(false);
      return;
    }

    const newItem = { 
      id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`, 
      name: trimmed, 
      icon: 'cube-outline', 
      is_prepared: false 
    };

    const updatedItems = [...currentItems, newItem];
    onUpdateBag(updatedItems);
    
    setNewItemName('');
    setShowAddModule(false);
  };

  const renderPreparedProgress = () => {
    if (bagItems.length === 0) return null;
    const prepared = bagItems.filter((i: any) => i.is_prepared).length;
    const total = bagItems.length;
    const progress = (prepared / total) * 100;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>TAUX DE PRÉPARATION</Text>
          <Text style={styles.progressValue}>{Math.round(progress)}%</Text>
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
                <Ionicons name="list" size={20} color="#00E5FF" />
              </View>
              <Text style={styles.title}>MES ACCESSOIRES</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.triggerAddBtn} onPress={() => setShowAddModule(true)}>
            <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']} style={styles.triggerGradient}>
              <Ionicons name="add-circle" size={24} color="#00E5FF" />
              <Text style={styles.triggerText}>AJOUTER UN ACCESSOIRE</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 12 }} />

          <ScrollView 
            style={styles.scroll} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {bagItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cube-outline" size={64} color="rgba(255,255,255,0.05)" />
                <Text style={styles.emptyTitle}>AUCUN ACCESSOIRE</Text>
                <Text style={styles.emptySub}>Ajoute tes objets pour ne rien oublier le jour J</Text>
              </View>
            ) : (
              <View style={styles.itemsGrid}>
                {bagItems.map((item: any, idx: number) => (
                  <AnimatedBagItem 
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

        {/* MODULE DE CRÉATION */}
        <Modal visible={showAddModule} transparent animationType="fade">
          <BlurView intensity={80} tint="dark" style={styles.moduleOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', alignItems: 'center' }}>
              <View style={styles.moduleContent}>
                <Text style={styles.moduleTitle}>NOUVEL OBJET</Text>
                <TextInput
                  ref={inputRef}
                  style={styles.moduleInput}
                  placeholder="Nom de l'accessoire..."
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={newItemName}
                  onChangeText={setNewItemName}
                  onSubmitEditing={addItem}
                />
                <View style={styles.moduleActions}>
                  <TouchableOpacity style={styles.moduleCancel} onPress={() => setShowAddModule(false)}>
                    <Text style={styles.moduleCancelText}>ANNULER</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.moduleConfirm} onPress={addItem}>
                    <Text style={styles.moduleConfirmText}>CRÉER</Text>
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
    height: height * 0.85, 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  iconCircle: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(0, 229, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  title: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  closeBtn: { padding: 8 },

  progressContainer: { marginBottom: 24, backgroundColor: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 20 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  progressLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  progressValue: { color: '#00E5FF', fontSize: 14, fontWeight: '900' },
  progressBarBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 2 },

  scroll: { flex: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyTitle: { color: 'rgba(255,255,255,0.2)', fontSize: 14, fontWeight: '900', marginTop: 16, letterSpacing: 1 },
  emptySub: { color: 'rgba(255,255,255,0.1)', fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },

  itemsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  bagItemWrapper: { width: (width - 48 - 12) / 2 },
  bagItem: { 
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)', 
    borderRadius: 24, 
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'space-between',
    minHeight: 130,
  },
  bagItemPrepared: {
    backgroundColor: 'rgba(0,229,255,0.05)',
    borderColor: 'rgba(0,229,255,0.2)',
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconCircleSmall: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  iconCircleSmallActive: { backgroundColor: '#00E5FF' },
  deleteMiniBtn: { padding: 4 },
  itemName: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900', marginTop: 12, letterSpacing: 1 },
  itemNamePrepared: { color: '#FFF' },
  checkIndicator: { alignItems: 'flex-end', marginTop: 12 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  emptyCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  emptyCircleInner: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)' },

  triggerAddBtn: { marginBottom: 24, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  triggerGradient: { padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  triggerText: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },

  moduleOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  moduleContent: { backgroundColor: '#111', borderRadius: 32, width: '90%', padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
  moduleTitle: { color: '#00E5FF', fontSize: 16, fontWeight: '900', letterSpacing: 2, marginBottom: 20, textAlign: 'center' },
  moduleInput: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 18, color: '#FFF', fontSize: 14, fontWeight: '700', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 24 },
  moduleActions: { flexDirection: 'row', gap: 12 },
  moduleCancel: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  moduleCancelText: { color: '#FF3B30', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  moduleConfirm: { flex: 1, backgroundColor: '#00E5FF', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  moduleConfirmText: { color: '#000', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
});
