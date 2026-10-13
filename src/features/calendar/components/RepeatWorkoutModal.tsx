import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { theme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
import { workoutService } from '../../../services/workoutService';
import { useSprintyStore } from '../../../store/sprintyStore';
import { FeedbackHost } from '../../../shared/feedback/FeedbackHost';
import { IconButton } from '../../../shared/components/IconButton';
import { PressableScale } from '../../../shared/components/PressableScale';
import { Button } from '../../../shared/components/Button';

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
  const [countError, setCountError] = useState<string | null>(null);

  const handleModeSelect = (selectedMode: RepeatMode) => {
    Haptics.selectionAsync();
    setMode(selectedMode);
    setCountError(null);
  };

  const handleCountChange = (id: string, value: string) => {
    // Only allow numbers
    const cleanValue = value.replace(/[^0-9]/g, '');
    setCounts(prev => ({ ...prev, [id]: cleanValue }));
    setCountError(null);
  };

  const handlePlanifier = async () => {
    if (mode === 'none') {
      onClose();
      return;
    }
    
    const count = parseInt(counts[mode], 10);
    if (isNaN(count) || count <= 0) {
      setCountError('Indique un nombre de répétitions valide (au moins 1).');
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
      showFeedback('error', "Une erreur s’est produite lors de la planification.");
    } finally {
      setLoading(false);
    }
  };

  // Dynamic header text
  const getHeaderText = () => {
    if (mode === 'none') return 'Cette séance ne se répète pas.';
    const count = parseInt(counts[mode], 10) || 1;
    let periodStr = '';
    switch (mode) {
      case 'daily': periodStr = 'tous les jours'; break;
      case 'weekly': periodStr = 'toutes les semaines'; break;
      case 'monthly': periodStr = 'tous les mois'; break;
      case 'yearly': periodStr = 'tous les ans'; break;
    }
    return `Cette séance se répétera ${periodStr}, ${count} fois.`;
  };

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <FeedbackHost />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <IconButton icon="x" onPress={onClose} accessibilityLabel="Fermer" />
            <Text style={styles.title}>Répéter</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Description */}
          <Text style={styles.description}>{getHeaderText()}</Text>

          <Text style={styles.sectionLabel}>Fréquence</Text>

          {/* Options Card */}
          <View style={styles.card}>
            {REPEAT_OPTIONS.map((option, index) => {
              const isSelected = mode === option.id;
              const isLast = index === REPEAT_OPTIONS.length - 1;

              return (
                <PressableScale
                  key={option.id}
                  haptic="none"
                  activeScale={0.98}
                  style={[styles.optionRow, !isLast && styles.optionRowDivider]}
                  onPress={() => handleModeSelect(option.id as RepeatMode)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={option.label}
                >
                  <View style={styles.optionLeft}>
                    <View style={[styles.radio, isSelected && styles.radioSelected]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                      {option.label}
                    </Text>
                  </View>

                  {option.id !== 'none' && (
                    <View style={styles.optionRight}>
                      <TextInput
                        style={[
                          styles.numberInput,
                          isSelected && styles.numberInputActive,
                          isSelected && !!countError && styles.numberInputError,
                        ]}
                        keyboardType="number-pad"
                        value={counts[option.id]}
                        onChangeText={(val) => handleCountChange(option.id, val)}
                        maxLength={3}
                        selectTextOnFocus
                        accessibilityLabel={`Nombre de répétitions, ${option.label.toLowerCase()}`}
                        onFocus={() => { if (!isSelected) handleModeSelect(option.id as RepeatMode); }}
                      />
                      <Text style={styles.timesLabel}>fois</Text>
                    </View>
                  )}
                </PressableScale>
              );
            })}
          </View>

          {!!countError && (
            <View style={styles.errorNotice}>
              <Feather name="alert-circle" size={15} color={theme.colors.error} />
              <Text style={styles.errorText}>{countError}</Text>
            </View>
          )}

          <View style={{ flex: 1 }} />

          {/* Footer Button */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <Button
              title={mode === 'none' ? 'Fermer' : 'Planifier'}
              variant={mode === 'none' ? 'secondary' : 'primary'}
              onPress={handlePlanifier}
              loading={loading}
            />
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 14 : 20,
    paddingBottom: 12,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: theme.colors.text,
  },
  headerSpacer: {
    width: 38,
  },
  description: {
    fontSize: 15,
    lineHeight: 21,
    color: theme.colors.textSecondary,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  card: {
    ...glassCard,
    marginHorizontal: 16,
    paddingVertical: 0,
    paddingHorizontal: 0,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  optionRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: theme.colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  radioSelected: {
    borderWidth: 2,
    borderColor: theme.colors.sprintyBlue,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.sprintyBlue,
  },
  optionLabel: {
    fontSize: 15,
    color: theme.colors.text,
  },
  optionLabelSelected: {
    fontWeight: '700',
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  numberInput: {
    minWidth: 48,
    height: 36,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.glassFill,
    borderWidth: 1,
    borderColor: 'transparent',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    color: theme.colors.text,
  },
  numberInputActive: {
    backgroundColor: 'rgba(0, 105, 232, 0.08)',
    color: theme.colors.sprintyBlue,
  },
  numberInputError: {
    borderColor: theme.colors.error,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: theme.colors.error,
  },
  timesLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: 6,
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.error,
  },
  footer: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
});
