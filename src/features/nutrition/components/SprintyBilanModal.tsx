import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNutritionStore } from '../../../store/nutritionStore';
import { analyzeBilan, BilanAnswers } from '../utils/nutritionAlgorithm';

const { width, height } = Dimensions.get('window');

interface SprintyBilanModalProps {
  visible: boolean;
  onClose: () => void;
}

const QUESTIONS = [
  {
    id: 'perf',
    title: 'PERFORMANCES',
    options: [
      { label: 'EN PROGRESSION', value: 1 },
      { label: 'STAGNATION', value: 0 },
      { label: 'RÉGRESSION', value: -1 },
    ],
  },
  {
    id: 'energy',
    title: 'ÉNERGIE',
    options: [
      { label: 'JAMAIS DE BAISSE', value: 1 },
      { label: 'BAISSE L\'APRÈS-MIDI', value: 0 },
      { label: 'BAISSE LE SOIR', value: -1 },
    ],
  },
  {
    id: 'recov',
    title: 'RÉCUPÉRATION',
    options: [
      { label: 'NORMALE', value: 1 },
      { label: 'PERSISTANTE', value: -1 },
    ],
  },
  {
    id: 'sleep',
    title: 'SOMMEIL',
    options: [
      { label: 'RÉPARATEUR', value: 1 },
      { label: 'AGITÉ', value: -1 },
    ],
  },
  {
    id: 'weight',
    title: 'POIDS',
    options: [
      { label: 'STABLE', value: 0 },
      { label: 'EN HAUSSE', value: 1 },
      { label: 'EN BAISSE', value: -1 },
    ],
  },
];

export const SprintyBilanModal = ({ visible, onClose }: SprintyBilanModalProps) => {
  const setLastBilanDate = useNutritionStore((state) => state.setLastBilanDate);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentStep, setCurrentStep] = useState(0);

  const handleSelect = (questionId: string, value: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleFinish = () => {
    if (Object.keys(answers).length < QUESTIONS.length) {
      Alert.alert('Incomplet', 'Veuillez répondre à toutes les questions.');
      return;
    }

    const result = analyzeBilan(answers as unknown as BilanAnswers);

    Alert.alert(result.title, `${result.diagnostic}\n\nACTION : ${result.action}`, [
      {
        text: 'COMPRIS',
        onPress: () => {
          setLastBilanDate(new Date().toISOString());
          onClose();
          // Reset for next time
          setCurrentStep(0);
          setAnswers({});
        },
      },
    ]);
  };

  const progress = (Object.keys(answers).length / QUESTIONS.length) * 100;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <BlurView intensity={100} tint="dark" style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>BILAN HEBDOMADAIRE</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>

        <View style={styles.content}>
          <View style={styles.questionCard}>
            <Text style={styles.questionNumber}>QUESTION {currentStep + 1}/{QUESTIONS.length}</Text>
            <Text style={styles.questionTitle}>{QUESTIONS[currentStep].title}</Text>
            
            <View style={styles.optionsContainer}>
              {QUESTIONS[currentStep].options.map((opt, idx) => {
                const isSelected = answers[QUESTIONS[currentStep].id] === opt.value;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.optionBtn, isSelected && styles.optionBtnSelected]}
                    onPress={() => handleSelect(QUESTIONS[currentStep].id, opt.value)}
                  >
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {currentStep === QUESTIONS.length - 1 && answers[QUESTIONS[currentStep].id] !== undefined && (
            <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
              <LinearGradient
                colors={['#00E5FF', '#BF5AF2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientBtn}
              >
                <Text style={styles.finishBtnText}>GÉNÉRER MON DIAGNOSTIC</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {currentStep > 0 && (
            <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentStep(prev => prev - 1)}>
              <Text style={styles.backBtnText}>RETOUR</Text>
            </TouchableOpacity>
          )}
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  headerTitle: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  closeBtn: { padding: 4 },
  progressContainer: { height: 2, backgroundColor: 'rgba(255,255,255,0.1)', width: '100%' },
  progressBar: { height: '100%', backgroundColor: '#00E5FF' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  questionCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 32,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 40,
  },
  questionNumber: { color: '#8E8E93', fontSize: 10, fontWeight: '900', marginBottom: 16, letterSpacing: 1.5 },
  questionTitle: { color: '#FFF', fontSize: 28, fontWeight: '900', marginBottom: 40 },
  optionsContainer: { gap: 16 },
  optionBtn: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  optionBtnSelected: {
    borderColor: '#00E5FF',
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
  },
  optionLabel: { color: '#8E8E93', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  optionLabelSelected: { color: '#FFF' },
  finishBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  gradientBtn: {
    padding: 22,
    alignItems: 'center',
  },
  finishBtnText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  backBtn: { alignSelf: 'center', padding: 10 },
  backBtnText: { color: '#8E8E93', fontSize: 12, fontWeight: '700' },
});
