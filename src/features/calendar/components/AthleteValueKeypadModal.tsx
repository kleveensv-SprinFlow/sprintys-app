import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';

import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../core/theme';

export interface AthleteValueKeypadModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (value: string, repsOk?: boolean) => void;
  onNext?: () => void;
  hasNextSet?: boolean;
  initialValue?: string;
  initialRepsOk?: boolean;
  mode: 'sprint' | 'endurance' | 'weight';
  distance?: number;
  title: string;
  subtitle?: string;
}

/**
 * Format raw typed digits into smart athletic display values
 */
export function formatSmartValue(
  raw: string,
  mode: 'sprint' | 'endurance' | 'weight',
  distance?: number
): string {
  if (!raw || raw.trim() === '') return '';

  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';

  if (mode === 'sprint') {
    // Sprint (< 800m):
    // 1-2 digits: e.g. "1" -> "1", "10" -> "10"
    // 3 digits: e.g. "985" -> for <=100m or first digit >= 6: "9.85", else "10.8"
    // 4 digits: e.g. "1055" -> "10.55", "2180" -> "21.80"
    // 5+ digits: e.g. "10245" -> "1:02.45"
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length === 3) {
      if ((distance && distance <= 100) || parseInt(digits[0], 10) >= 6) {
        return `${digits[0]}.${digits.slice(1)}`;
      } else {
        return `${digits.slice(0, 2)}.${digits[2]}`;
      }
    } else if (digits.length === 4) {
      return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    } else {
      const hundredths = digits.slice(-2);
      const secs = digits.slice(-4, -2);
      const mins = digits.slice(0, -4);
      return `${mins}:${secs}.${hundredths}`;
    }
  } else if (mode === 'endurance') {
    // Endurance (>= 800m, e.g. 5000m):
    // 1-2 digits: "1" -> "1", "14" -> "14"
    // 3 digits: "152" -> "1:52", "345" -> "3:45"
    // 4 digits: "1435" -> "14:35" (14 min 35 s)
    // 5+ digits: "14352" -> "14:35.2" or "143520" -> "14:35.20"
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length === 3) {
      return `${digits[0]}:${digits.slice(1)}`;
    } else if (digits.length === 4) {
      return `${digits.slice(0, 2)}:${digits.slice(2)}`;
    } else if (digits.length === 5) {
      return `${digits.slice(0, 2)}:${digits.slice(2, 4)}.${digits[4]}`;
    } else {
      const hundredths = digits.slice(-2);
      const secs = digits.slice(-4, -2);
      const mins = digits.slice(0, -4);
      return `${mins}:${secs}.${hundredths}`;
    }
  } else {
    // Weight mode: e.g. "80", "82.5"
    return digits;
  }
}

export const AthleteValueKeypadModal: React.FC<AthleteValueKeypadModalProps> = ({
  visible,
  onClose,
  onSave,
  onNext,
  hasNextSet = false,
  initialValue = '',
  initialRepsOk = true,
  mode,
  distance,
  title,
  subtitle,
}) => {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);

  const [buffer, setBuffer] = useState('');
  const [repsOk, setRepsOk] = useState(true);

  useEffect(() => {
    if (visible) {
      setBuffer(initialValue || '');
      setRepsOk(initialRepsOk !== undefined ? initialRepsOk : true);
      // Auto-focus native keyboard on open
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [visible, initialValue, initialRepsOk]);

  // Hook rules: early return only after all hooks
  if (!visible) return null;

  const handleTextChange = (text: string) => {
    // Standardize decimal separator (French keyboard comma -> dot)
    const normalized = text.replace(',', '.');

    if (mode === 'weight') {
      // Weight mode: direct decimal numbers e.g. "80" or "82.5"
      const cleaned = normalized.replace(/[^0-9.]/g, '');
      const parts = cleaned.split('.');
      if (parts.length > 2) return;
      if (cleaned.length > 6) return;
      setBuffer(cleaned);
    } else if (mode === 'sprint') {
      // Sprint mode: smart athletic time formatting
      if (normalized.length > 7) return;
      const digits = normalized.replace(/[^0-9]/g, '');
      const formatted = formatSmartValue(digits, 'sprint', distance);
      setBuffer(formatted);
    } else {
      // Endurance mode: smart minute/second formatting
      if (normalized.length > 8) return;
      const digits = normalized.replace(/[^0-9]/g, '');
      const formatted = formatSmartValue(digits, 'endurance', distance);
      setBuffer(formatted);
    }
  };

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBuffer('');
    inputRef.current?.focus();
  };

  // Quick weight adjustment chips
  const handleAdjustWeight = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const current = parseFloat(buffer) || 0;
    const next = Math.max(0, current + delta);
    const str = next === 0 ? '' : next % 1 === 0 ? String(next) : next.toFixed(1);
    setBuffer(str);
    inputRef.current?.focus();
  };

  const getUnit = () => {
    if (mode === 'sprint') return 'sec';
    if (mode === 'endurance') return 'min';
    return 'kg';
  };

  // Confirm and close (or go next)
  const handleConfirm = (goNext: boolean = false) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();
    onSave(buffer, repsOk);
    if (goNext && onNext) {
      onNext();
    } else {
      onClose();
    }
  };

  const handleCancel = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]}>
      {/* Darkened Backdrop - tapping outside dismisses keyboard/closes */}
      <TouchableWithoutFeedback onPress={handleCancel}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.82)' }]} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingContainer}
      >
        <View style={styles.sheetContent}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={handleCancel} style={styles.closeBtn} activeOpacity={0.7}>
              <Feather name="x" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>{title}</Text>
              {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
            </View>

            <TouchableOpacity onPress={handleClear} style={styles.clearBtn} activeOpacity={0.7}>
              <Text style={styles.clearBtnText}>Effacer</Text>
            </TouchableOpacity>
          </View>

          {/* Hero Typography Display: Native TextInput with Big Digits + Unit */}
          <TouchableWithoutFeedback onPress={() => inputRef.current?.focus()}>
            <View style={styles.heroDisplayContainer}>
              <View style={styles.numberWithUnitRow}>
                <TextInput
                  ref={inputRef}
                  style={styles.heroNumberInput}
                  value={buffer}
                  onChangeText={handleTextChange}
                  keyboardType="decimal-pad"
                  autoFocus={true}
                  placeholder={mode === 'endurance' ? '--:--' : mode === 'sprint' ? '--.--' : '0'}
                  placeholderTextColor="rgba(255, 255, 255, 0.25)"
                  returnKeyType={hasNextSet ? 'next' : 'done'}
                  onSubmitEditing={() => handleConfirm(false)}
                  selectTextOnFocus={true}
                  selectionColor="#818CF8"
                />
                <Text style={styles.heroUnit}>{getUnit()}</Text>
              </View>

              {/* Reps Toggle & Quick Weight Chips (Musculation mode) */}
              {mode === 'weight' && (
                <View style={styles.repsToggleWrapper}>
                  <TouchableOpacity
                    style={[
                      styles.repsTogglePill,
                      repsOk ? styles.repsTogglePillSuccess : styles.repsTogglePillFailed,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setRepsOk(!repsOk);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={repsOk ? 'checkmark-circle' : 'close-circle'}
                      size={20}
                      color={repsOk ? '#10B981' : '#EF4444'}
                    />
                    <Text
                      style={[
                        styles.repsTogglePillText,
                        { color: repsOk ? '#10B981' : '#EF4444' },
                      ]}
                    >
                      {repsOk ? 'Reps réussies' : 'Reps non terminées'}
                    </Text>
                  </TouchableOpacity>

                  {/* Quick weight adjuster chips */}
                  <View style={styles.quickWeightRow}>
                    {[-5, -2.5, +2.5, +5].map((delta) => (
                      <TouchableOpacity
                        key={delta}
                        style={styles.quickWeightChip}
                        onPress={() => handleAdjustWeight(delta)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.quickWeightChipText}>
                          {delta > 0 ? `+${delta}` : delta}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>

          {/* Bottom Action Bar (Directly above native keyboard) */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.cancelActionBtn}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelActionBtnText}>Annuler</Text>
            </TouchableOpacity>

            {hasNextSet ? (
              <>
                {/* Valider (Enregistre et ferme) */}
                <TouchableOpacity
                  style={[styles.confirmActionBtn, { backgroundColor: 'rgba(255, 255, 255, 0.15)', flex: 0.85 }]}
                  onPress={() => handleConfirm(false)}
                  activeOpacity={0.8}
                >
                  <Feather name="check" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.confirmActionBtnText}>Valider</Text>
                </TouchableOpacity>

                {/* Suivant (Enregistre et passe à la série suivante) */}
                <TouchableOpacity
                  style={[styles.confirmActionBtn, { backgroundColor: theme.colors.accent, flex: 1.15 }]}
                  onPress={() => handleConfirm(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmActionBtnText}>Suivant</Text>
                  <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </>
            ) : (
              /* Dernier set : bouton Valider principal */
              <TouchableOpacity
                style={[styles.confirmActionBtn, { backgroundColor: '#10B981', flex: 1 }]}
                onPress={() => handleConfirm(false)}
                activeOpacity={0.8}
              >
                <Feather name="check" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.confirmActionBtnText}>Valider</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    zIndex: 2000,
    elevation: 2000,
  },
  keyboardAvoidingContainer: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    backgroundColor: '#161618',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  clearBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },

  // Big Typographic Hero Display
  heroDisplayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  numberWithUnitRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  heroNumberInput: {
    fontSize: 58,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    textAlign: 'center',
    minWidth: 140,
    padding: 0,
    margin: 0,
  },
  heroUnit: {
    fontSize: 26,
    fontWeight: '700',
    color: '#818CF8',
    marginLeft: 8,
  },

  // Reps toggle
  repsToggleWrapper: {
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  repsTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  repsTogglePillSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  repsTogglePillFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  repsTogglePillText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Quick weight adjuster chips
  quickWeightRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  quickWeightChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  quickWeightChipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // Bottom action bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  cancelActionBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelActionBtnText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 15,
    fontWeight: '600',
  },
  confirmActionBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
