import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useBodyStore } from '../store/bodyStore';
import { useNutritionStore, MealType, FoodLog } from '../store/nutritionStore';
import { FoodSearchModal } from '../features/nutrition/components/FoodSearchModal';
import { SprintyBilanModal } from '../features/nutrition/components/SprintyBilanModal';

const { width } = Dimensions.get('window');

const MacroProgressBar = ({ label, consumed, target, unit = 'g' }: { label: string, consumed: number, target: number, unit?: string }) => {
  const progress = target > 0 ? Math.min(consumed / target, 1) : 0;
  
  return (
    <View style={styles.macroRow}>
      <View style={styles.macroLabelRow}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue}>
          {Math.round(consumed)} / {Math.round(target)} {unit}
        </Text>
      </View>
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
};

const MealCard = ({ 
  title, 
  logs, 
  onAdd, 
  onRemove 
}: { 
  title: MealType, 
  logs: FoodLog[], 
  onAdd: (type: MealType) => void,
  onRemove: (id: string) => void
}) => {
  const mealCalories = logs.reduce((acc, log) => acc + log.calories, 0);

  return (
    <BlurView intensity={20} tint="dark" style={styles.mealCard}>
      <View style={styles.mealHeader}>
        <View>
          <Text style={styles.mealTitle}>{title}</Text>
          <Text style={styles.mealCalories}>{mealCalories} KCAL</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => onAdd(title)}>
          <Ionicons name="add" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {logs.length > 0 && (
        <View style={styles.foodList}>
          {logs.map((log) => (
            <View key={log.id} style={styles.foodItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.foodName}>{log.name.toUpperCase()}</Text>
                <Text style={styles.foodMacros}>
                  {log.quantity}G • {log.calories}KCAL • P:{log.protein} C:{log.carbs} L:{log.fats}
                </Text>
              </View>
              <TouchableOpacity onPress={() => onRemove(log.id)}>
                <Ionicons name="trash-outline" size={16} color="#FF453A" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </BlurView>
  );
};

const NutritionScreen = () => {
  const { profile } = useBodyStore();
  const { dailyLog, getTotals, removeFoodLog, fetchDailyLogs, lastBilanDate } = useNutritionStore();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [bilanVisible, setBilanVisible] = useState(false);
  const [activeMealType, setActiveMealType] = useState<MealType>('PETIT-DÉJEUNER');

  useEffect(() => {
    fetchDailyLogs();
  }, []);

  const showBilanButton = useMemo(() => {
    if (!lastBilanDate) return true;
    
    const now = new Date();
    const day = now.getDay(); // 0: Sunday, 6: Saturday
    const isWeekend = day === 0 || day === 6;
    
    if (isWeekend) {
      const lastBilan = new Date(lastBilanDate);
      const diffTime = Math.abs(now.getTime() - lastBilan.getTime());
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays > 2; // Plus de 2 jours depuis le dernier bilan
    }
    
    return false;
  }, [lastBilanDate]);

  const totals = useMemo(() => getTotals(), [dailyLog]);

  const openSearch = (type: MealType) => {
    setActiveMealType(type);
    setModalVisible(true);
  };

  const getMealLogs = (type: MealType) => {
    const today = new Date().setHours(0, 0, 0, 0);
    return dailyLog.filter(log => 
      log.mealType === type && 
      new Date(log.timestamp).setHours(0, 0, 0, 0) === today
    );
  };

  return (
    <View style={styles.container}>
      <BlurView 
        intensity={Platform.OS === 'android' ? 80 : 100} 
        tint="dark" 
        style={[StyleSheet.absoluteFill, Platform.OS === 'android' && { backgroundColor: 'rgba(0,0,0,0.7)' }]} 
      />
      
      {/* Background Glows */}
      <View style={[styles.lightCircle, styles.cyanCircle]} />
      <View style={[styles.lightCircle, styles.purpleCircle]} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>NUTRITION</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {showBilanButton && (
          <TouchableOpacity 
            style={styles.bilanTrigger} 
            onPress={() => setBilanVisible(true)}
          >
            <LinearGradient
              colors={['rgba(0, 229, 255, 0.2)', 'rgba(191, 90, 242, 0.2)']}
              style={styles.bilanGradient}
            >
              <Ionicons name="sparkles" size={18} color="#00E5FF" />
              <Text style={styles.bilanText}>FAIRE LE POINT AVEC SPRINTY</Text>
              <Ionicons name="chevron-forward" size={16} color="#00E5FF" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        <BlurView intensity={30} tint="dark" style={styles.summaryCard}>
          <Text style={styles.cardTitle}>RÉSUMÉ DU JOUR</Text>
          
          <MacroProgressBar 
            label="ÉNERGIE" 
            consumed={totals.calories} 
            target={profile?.target_calories || 0} 
            unit="KCAL" 
          />
          <MacroProgressBar 
            label="PROTÉINES" 
            consumed={totals.protein} 
            target={profile?.target_protein || 0} 
          />
          <MacroProgressBar 
            label="GLUCIDES" 
            consumed={totals.carbs} 
            target={profile?.target_carbs || 0} 
          />
          <MacroProgressBar 
            label="LIPIDES" 
            consumed={totals.fats} 
            target={profile?.target_fats || 0} 
          />
        </BlurView>

        <View style={styles.mealsSection}>
          <MealCard 
            title="PETIT-DÉJEUNER" 
            logs={getMealLogs('PETIT-DÉJEUNER')} 
            onAdd={openSearch}
            onRemove={removeFoodLog}
          />
          <MealCard 
            title="DÉJEUNER" 
            logs={getMealLogs('DÉJEUNER')} 
            onAdd={openSearch}
            onRemove={removeFoodLog}
          />
          <MealCard 
            title="COLLATION / PRÉ-WORKOUT" 
            logs={getMealLogs('COLLATION / PRÉ-WORKOUT')} 
            onAdd={openSearch}
            onRemove={removeFoodLog}
          />
          <MealCard 
            title="DÎNER" 
            logs={getMealLogs('DÎNER')} 
            onAdd={openSearch}
            onRemove={removeFoodLog}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <FoodSearchModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        mealType={activeMealType} 
      />

      <SprintyBilanModal 
        visible={bilanVisible} 
        onClose={() => setBilanVisible(false)} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
    paddingBottom: 10,
    alignItems: 'center',
  },
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 3 },
  scrollContent: { padding: 24 },
  summaryCard: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
    overflow: 'hidden',
    marginBottom: 32,
  },
  cardTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', marginBottom: 24, letterSpacing: 1.5 },
  macroRow: { marginBottom: 20 },
  macroLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  macroLabel: { color: '#8E8E93', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  macroValue: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  progressBg: { height: 6, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#00E5FF', borderRadius: 3 },
  mealsSection: { gap: 16 },
  mealCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealTitle: { color: '#8E8E93', fontSize: 10, fontWeight: '900', marginBottom: 4, letterSpacing: 1 },
  mealCalories: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00E5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodList: { marginTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.05)', paddingTop: 12 },
  foodItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  foodName: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', marginBottom: 2 },
  foodMacros: { color: '#8E8E93', fontSize: 9, fontWeight: '600' },
  lightCircle: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.3 },
  cyanCircle: { top: -50, left: -50, backgroundColor: '#00E5FF' },
  purpleCircle: { bottom: 100, right: -50, backgroundColor: '#BF5AF2' },
  bilanTrigger: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  bilanGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  bilanText: {
    flex: 1,
    color: '#00E5FF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
});

export default NutritionScreen;
