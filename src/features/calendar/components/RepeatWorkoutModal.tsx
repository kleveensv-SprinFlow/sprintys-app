import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../../core/theme';
import { workoutService } from '../../../services/workoutService';
import { useSprintyStore } from '../../../store/sprintyStore';

interface RepeatWorkoutModalProps {
  visible: boolean;
  onClose: () => void;
  workout: any;
  onRepeated: () => void;
}

type RepeatMode = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

const REPEAT_OPTIONS = [
  { id: 'none', label: 'Ne pas répéter' },
  { id: 'daily', label: 'Tous les jours' },
  { id: 'weekly', label: 'Toutes les semaines' },
  { id: 'monthly', label: 'Tous les mois' },
  { id: 'yearly', label: 'Tous les ans' },
] as const;

export const RepeatWorkoutModal: React.FC<RepeatWorkoutModalProps> = ({
  visible,
  onClose,
  workout,
  onRepeated,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const showFeedback = useSprintyStore((state) => state.showFeedback);

  const [mode, setMode] = useState<RepeatMode>('none');
  const [counts, setCounts] = useState<Record<string, string>>({
    daily: '1',
    weekly: '1',
    monthly: '1',
    yearly: '1',
  });
  const [loading, setLoading] = useState(false);

  const handleModeSelect = (selectedMode: RepeatMode) => {
    Haptics.selectionAsync();
    setMode(selectedMode);
  };

  const handleCountChange = (id: string, value: string) => {
    // Only allow numbers
    const cleanValue = value.replace(/[^0-9]/g, '');
    setCounts(prev => ({ ...prev, [id]: cleanValue }));
  };

  const handlePlanifier = async () => {
    if (mode === 'none') {
      onClose();
      return;
    }
    
    const count = parseInt(counts[mode], 10);
    if (isNaN(count) || count <= 0) {
      showFeedback('error', 'Veuillez entrer un nombre valide.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    
    try {
      const copiesCreated = await workoutService.repeatWorkout(workout, mode, count);
      showFeedback('success', `${copiesCreated} séance(s) planifiée(s) avec succès.`);
      onRepeated();
      onClose();
    } catch (error) {
      console.error('Failed to repeat workout:', error);
      showFeedback('error', "Une erreur s'est produite lors de la planification.");
    } finally {
      setLoading(false);
    }
  };

  // Dynamic header text
  const getHeaderText = () => {
    if (mode === 'none') return 'Cet événement ne se répète pas.';
    const count = parseInt(counts[mode], 10) || 1;
    let periodStr = '';
    switch (mode) {
      case 'daily': periodStr = 'tous les jours'; break;
      case 'weekly': periodStr = 'toutes les semaines'; break;
      case 'monthly': periodStr = 'tous les mois'; break;
      case 'yearly': periodStr = 'tous les ans'; break;
    }
    return `Cet événement se répètera ${periodStr}, ${count} fois.`;
  };

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
          style={[styles.container, { backgroundColor: theme.colors.background }]} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="chevron-left" size={28} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.colors.text }]}>Répéter</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Description */}
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
            {getHeaderText()}
          </Text>

          {/* Options Card */}
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            {REPEAT_OPTIONS.map((option, index) => {
              const isSelected = mode === option.id;
              const isLast = index === REPEAT_OPTIONS.length - 1;

              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.optionRow, !isLast && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
                  onPress={() => handleModeSelect(option.id as RepeatMode)}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionLeft}>
                    {isSelected ? (
                      <View style={styles.radioSelected}>
                        <View style={[styles.radioInner, { backgroundColor: '#3B82F6' }]} />
                      </View>
                    ) : (
                      <View style={[styles.radioUnselected, { borderColor: theme.colors.textMuted }]} />
                    )}
                    <Text style={[styles.optionLabel, { color: theme.colors.text }]}>
                      {option.label}
                    </Text>
                  </View>

                  {option.id !== 'none' && (
                    <View style={styles.optionRight}>
                      <Text style={{ color: theme.colors.textMuted, fontSize: 16 }}>( </Text>
                      <TextInput
                        style={[
                          styles.numberInput, 
                          { color: theme.colors.text, borderBottomColor: theme.colors.border }
                        ]}
                        keyboardType="number-pad"
                        value={counts[option.id]}
                        onChangeText={(val) => handleCountChange(option.id, val)}
                        maxLength={3}
                        onFocus={() => { if (!isSelected) handleModeSelect(option.id as RepeatMode); }}
                      />
                      <Text style={{ color: theme.colors.textMuted, fontSize: 16 }}> )</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ flex: 1 }} />

          {/* Footer Button */}
          <View style={[
            styles.footer, 
            { 
              paddingBottom: Math.max(insets.bottom, 24), 
              backgroundColor: theme.colors.background
            }
          ]}>
            <TouchableOpacity
              style={[
                styles.submitButton, 
                { backgroundColor: theme.colors.accent }, 
                loading && { opacity: 0.6 }
              ]}
              onPress={handlePlanifier}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>{mode === 'none' ? 'Fermer' : 'Planifier'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
  },
  headerSpacer: {
    width: 28,
  },
  description: {
    fontSize: 15,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioSelected: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioUnselected: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    marginRight: 16,
  },
  optionLabel: {
    fontSize: 16,
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberInput: {
    fontSize: 16,
    width: 30,
    textAlign: 'center',
    borderBottomWidth: 1,
    paddingBottom: 2,
    marginHorizontal: 4,
  },
  footer: {
    paddingTop: 16,
    paddingHorizontal: 24,
  },
  submitButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
