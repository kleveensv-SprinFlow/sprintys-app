import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  initialValue = '',
  initialRepsOk = true,
  mode,
  distance,
  title,
  subtitle,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [buffer, setBuffer] = useState('');
  const [repsOk, setRepsOk] = useState(true);

  // Animated keyboard height tracker to place sheet above keyboard on ALL devices
  const keyboardHeightAnim = useRef(new Animated.Value(0)).current;
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setIsKeyboardVisible(true);
      Animated.timing(keyboardHeightAnim, {
        toValue: e.endCoordinates.height,
        duration: Platform.OS === 'ios' ? (e.duration || 250) : 150,
        useNativeDriver: false,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      setIsKeyboardVisible(false);
      Animated.timing(keyboardHeightAnim, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? (e.duration || 250) : 150,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setBuffer(initialValue || '');
      setRepsOk(initialRepsOk !== undefined ? initialRepsOk : true);
      // Focus native keyboard on open
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
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

  // Confirm and close
  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();
    onSave(buffer, repsOk);
    onClose();
  };

  const handleCancel = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]}>
      {/* Darkened Backdrop - tapping outside dismisses keyboard/closes */}
      <TouchableWithoutFeedback onPress={handleCancel}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.45)' }]} />
      </TouchableWithoutFeedback>

      {/* Sheet dynamically hoisted above keyboard via Animated marginBottom, adhering to App Theme */}
      <Animated.View
        style={[
          styles.sheetContent,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            marginBottom: keyboardHeightAnim,
            paddingBottom: isKeyboardVisible ? 16 : Math.max(insets.bottom, 20),
          },
        ]}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={handleCancel}
            style={[styles.closeBtn, { backgroundColor: theme.colors.surfaceLight }]}
            activeOpacity={0.7}
          >
            <Feather name="x" size={20} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{title}</Text>
            {subtitle ? (
              <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={handleClear}
            style={[styles.clearBtn, { backgroundColor: theme.colors.surfaceLight }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.clearBtnText, { color: theme.colors.error }]}>Effacer</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Typography Display: Native TextInput with Big Digits + Unit */}
        <TouchableWithoutFeedback onPress={() => inputRef.current?.focus()}>
          <View style={styles.heroDisplayContainer}>
            <View style={styles.numberWithUnitRow}>
              <TextInput
                ref={inputRef}
                style={[styles.heroNumberInput, { color: theme.colors.text }]}
                value={buffer}
                onChangeText={handleTextChange}
                keyboardType="decimal-pad"
                autoFocus={true}
                placeholder={mode === 'endurance' ? '--:--' : mode === 'sprint' ? '--.--' : '0'}
                placeholderTextColor={theme.colors.textMuted}
                returnKeyType="done"
                onSubmitEditing={handleConfirm}
                selectTextOnFocus={true}
                selectionColor={theme.colors.accent}
              />
              <Text style={[styles.heroUnit, { color: theme.colors.accent }]}>{getUnit()}</Text>
            </View>

            {/* Quick Weight Chips (Musculation mode) */}
            {mode === 'weight' && (
              <View style={styles.quickWeightRow}>
                {[-5, -2.5, +2.5, +5].map((delta) => (
                  <TouchableOpacity
                    key={delta}
                    style={[
                      styles.quickWeightChip,
                      {
                        backgroundColor: theme.colors.surfaceLight,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    onPress={() => handleAdjustWeight(delta)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.quickWeightChipText, { color: theme.colors.text }]}>
                      {delta > 0 ? `+${delta}` : delta}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>

        {/* Bottom Action Bar: Only Annuler & Valider */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.cancelActionBtn, { backgroundColor: theme.colors.surfaceLight }]}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelActionBtnText, { color: theme.colors.textSecondary }]}>
              Annuler
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmActionBtn, { backgroundColor: theme.colors.accent }]}
            onPress={handleConfirm}
            activeOpacity={0.8}
          >
            <Feather name="check" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.confirmActionBtnText}>Valider</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
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
  sheetContent: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Big Typographic Hero Display
  heroDisplayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  numberWithUnitRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  heroNumberInput: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -1,
    textAlign: 'center',
    minWidth: 130,
    padding: 0,
    margin: 0,
  },
  heroUnit: {
    fontSize: 24,
    fontWeight: '700',
    marginLeft: 8,
  },

  // Reps toggle
  repsToggleWrapper: {
    alignItems: 'center',
    marginTop: 14,
    gap: 10,
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
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  quickWeightChipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Bottom action bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  cancelActionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelActionBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmActionBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmActionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
