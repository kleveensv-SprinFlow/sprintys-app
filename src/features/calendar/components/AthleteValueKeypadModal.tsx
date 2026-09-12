import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';

import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../core/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

  // If user already typed explicit dot or colon
  if (raw.includes('.') || raw.includes(':')) {
    return raw;
  }

  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';

  if (mode === 'sprint') {
    // Sprint (< 800m):
    // 1-2 digits: e.g. "1" -> "1", "10" -> "10"
    // 3 digits: e.g. "985" -> for <=100m or first digit >= 6: "9.85", else "22.4"
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
  if (!visible) return null;
  const theme = useTheme();
  const [buffer, setBuffer] = useState('');
  const [repsOk, setRepsOk] = useState(true);

  useEffect(() => {
    if (visible) {
      setBuffer(initialValue || '');
      setRepsOk(initialRepsOk !== undefined ? initialRepsOk : true);
    }
  }, [visible, initialValue, initialRepsOk]);

  // Handle number press
  const handleDigitPress = (digit: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBuffer((prev) => {
      // Limit length to avoid absurd numbers
      if (prev.length >= 7) return prev;
      return prev + digit;
    });
  };

  // Handle dot or colon
  const handleDotPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const separator = mode === 'endurance' && !buffer.includes(':') ? ':' : '.';
    setBuffer((prev) => {
      if (prev.includes(separator)) return prev;
      if (!prev) return '0' + separator;
      return prev + separator;
    });
  };

  // Handle Backspace
  const handleBackspace = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBuffer((prev) => {
      if (prev.length === 0) return '';
      return prev.slice(0, -1);
    });
  };

  // Clear all
  const handleClear = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setBuffer('');
  };

  // Quick weight increments (for muscu)
  const handleAdjustWeight = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const current = parseFloat(buffer) || 0;
    const next = Math.max(0, current + delta);
    setBuffer(next === 0 ? '' : next % 1 === 0 ? String(next) : next.toFixed(1));
  };

  // Format the current display value
  const formattedDisplay = formatSmartValue(buffer, mode, distance);

  const getUnit = () => {
    if (mode === 'sprint') return 'sec';
    if (mode === 'endurance') return 'min';
    return 'kg';
  };

  const handleConfirm = (goNext: boolean = false) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSave(formattedDisplay, repsOk);
    if (goNext && onNext) {
      onNext();
    } else {
      onClose();
    }
  };

  const KEY_SIZE = Math.min(76, Math.floor((SCREEN_WIDTH - 80) / 3));

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 2000, elevation: 2000 }]}>
      <View style={styles.overlay}>
        {/* Blur / Darkened background */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />
        <View style={styles.darkDimmer} />

        <View style={styles.modalContent}>
          {/* Top Header */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Feather name="x" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>{title}</Text>
              {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
            </View>

            <TouchableOpacity onPress={handleClear} style={styles.clearBtn} activeOpacity={0.7}>
              <Text style={styles.clearBtnText}>Effacer</Text>
            </TouchableOpacity>
          </View>

          {/* Big Typography Display (Sans Carte, Minimalist Hero Display) */}
          <View style={styles.heroDisplayContainer}>
            <View style={styles.numberWithUnitRow}>
              <Text
                style={[
                  styles.heroNumber,
                  !formattedDisplay && styles.heroNumberPlaceholder,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formattedDisplay || (mode === 'endurance' ? '--:--' : mode === 'sprint' ? '--.--' : '0')}
              </Text>
              <Text style={styles.heroUnit}>{getUnit()}</Text>
            </View>

            {/* Reps Toggle (Musculation mode only) */}
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

          {/* Custom Numeric Keypad */}
          <View style={styles.keypadWrapper}>
            {/* Row 1 */}
            <View style={styles.keypadRow}>
              {['1', '2', '3'].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.keyButton, { width: KEY_SIZE, height: KEY_SIZE, borderRadius: KEY_SIZE / 2 }]}
                  onPress={() => handleDigitPress(d)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.keyText}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Row 2 */}
            <View style={styles.keypadRow}>
              {['4', '5', '6'].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.keyButton, { width: KEY_SIZE, height: KEY_SIZE, borderRadius: KEY_SIZE / 2 }]}
                  onPress={() => handleDigitPress(d)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.keyText}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Row 3 */}
            <View style={styles.keypadRow}>
              {['7', '8', '9'].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.keyButton, { width: KEY_SIZE, height: KEY_SIZE, borderRadius: KEY_SIZE / 2 }]}
                  onPress={() => handleDigitPress(d)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.keyText}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Row 4 */}
            <View style={styles.keypadRow}>
              <TouchableOpacity
                style={[styles.keyButton, styles.keyButtonSpecial, { width: KEY_SIZE, height: KEY_SIZE, borderRadius: KEY_SIZE / 2 }]}
                onPress={handleDotPress}
                activeOpacity={0.6}
              >
                <Text style={[styles.keyText, { fontSize: 24, fontWeight: '700' }]}>
                  {mode === 'endurance' ? ':' : '.'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.keyButton, { width: KEY_SIZE, height: KEY_SIZE, borderRadius: KEY_SIZE / 2 }]}
                onPress={() => handleDigitPress('0')}
                activeOpacity={0.6}
              >
                <Text style={styles.keyText}>0</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.keyButton, styles.keyButtonSpecial, { width: KEY_SIZE, height: KEY_SIZE, borderRadius: KEY_SIZE / 2 }]}
                onPress={handleBackspace}
                onLongPress={handleClear}
                activeOpacity={0.6}
              >
                <Feather name="delete" size={26} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Action Buttons */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.cancelActionBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelActionBtnText}>Annuler</Text>
            </TouchableOpacity>

            {hasNextSet ? (
              <TouchableOpacity
                style={[styles.confirmActionBtn, { backgroundColor: theme.colors.accent }]}
                onPress={() => handleConfirm(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmActionBtnText}>Suivant</Text>
                <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.confirmActionBtn, { backgroundColor: '#10B981' }]}
                onPress={() => handleConfirm(false)}
                activeOpacity={0.8}
              >
                <Feather name="check" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.confirmActionBtnText}>Valider</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  darkDimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    paddingTop: 16,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 12,
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
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
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
    paddingVertical: 20,
    minHeight: 140,
  },
  numberWithUnitRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  heroNumber: {
    fontSize: 60,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  heroNumberPlaceholder: {
    color: 'rgba(255, 255, 255, 0.25)',
  },
  heroUnit: {
    fontSize: 26,
    fontWeight: '700',
    color: '#818CF8',
    marginLeft: 10,
  },

  // Reps toggle
  repsToggleWrapper: {
    alignItems: 'center',
    marginTop: 14,
    gap: 12,
  },
  repsTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 9,
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

  // Keypad
  keypadWrapper: {
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
    alignSelf: 'center',
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
  },
  keyButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  keyButtonSpecial: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  keyText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '500',
  },

  // Bottom action bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  cancelActionBtn: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 16,
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
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmActionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});



