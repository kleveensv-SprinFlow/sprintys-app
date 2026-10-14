import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../core/theme';
import { PressableScale } from '../../../shared/components/PressableScale';
import { IconButton } from '../../../shared/components/IconButton';

export interface AthleteValueKeypadModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (value: string, repsOk?: boolean) => void;
  onNext?: () => void;
  hasNextSet?: boolean;
  /** Changes with each set so the sheet starts from that set's own value when moving on with « Suivante » */
  resetKey?: number;
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
  hasNextSet,
  resetKey,
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
      const targetHeight = e.endCoordinates.height + (Platform.OS === 'android' ? (insets.bottom || 0) + 8 : 0);
      Animated.timing(keyboardHeightAnim, {
        toValue: targetHeight,
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
  }, [visible, initialValue, initialRepsOk, title, resetKey]);

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
    onSave(buffer, repsOk);
    // On to the next set with the keyboard still up, or close after the last one
    if (hasNextSet && onNext) {
      onNext();
    } else {
      Keyboard.dismiss();
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
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15, 23, 42, 0.45)' }]} />
      </TouchableWithoutFeedback>

      {/* Sheet dynamically hoisted above keyboard via Animated marginBottom, adhering to App Theme */}
      <Animated.View
        style={[
          styles.sheetContent,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.hairline,
            marginBottom: keyboardHeightAnim,
            paddingBottom: isKeyboardVisible ? 16 : Math.max(insets.bottom, 20),
          },
        ]}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <IconButton icon="x" onPress={handleCancel} accessibilityLabel="Fermer" />

          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{title}</Text>
            {subtitle ? (
              <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          <PressableScale
            haptic="none"
            onPress={handleClear}
            accessibilityRole="button"
            accessibilityLabel="Effacer la valeur"
            hitSlop={4}
            style={[styles.clearBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
          >
            <Feather name="delete" size={14} color={theme.colors.error} />
            <Text style={[styles.clearBtnText, { color: theme.colors.error }]}>Effacer</Text>
          </PressableScale>
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
                selectionColor={theme.colors.sprintyBlue}
              />
              <Text style={[styles.heroUnit, { color: theme.colors.sprintyBlue }]}>{getUnit()}</Text>
            </View>

            {/* Reps not completed (Musculation mode) */}
            {mode === 'weight' && (
              <PressableScale
                haptic="selection"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: !repsOk }}
                accessibilityLabel="Je n’ai pas tenu toutes les répétitions"
                style={[
                  styles.quickWeightChip,
                  { backgroundColor: !repsOk ? 'rgba(239, 68, 68, 0.12)' : theme.colors.glassFill, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
                ]}
                onPress={() => setRepsOk((v) => !v)}
              >
                <Feather name={!repsOk ? 'check-square' : 'square'} size={14} color={!repsOk ? theme.colors.error : theme.colors.textSecondary} />
                <Text style={[styles.quickWeightChipText, { color: !repsOk ? theme.colors.error : theme.colors.textSecondary }]}>
                  Reps non tenues
                </Text>
              </PressableScale>
            )}

            {/* Quick Weight Chips (Musculation mode) */}
            {mode === 'weight' && (
              <View style={styles.quickWeightRow}>
                {[-5, -2.5, +2.5, +5].map((delta) => (
                  <PressableScale
                    key={delta}
                    haptic="none"
                    accessibilityRole="button"
                    accessibilityLabel={`${delta > 0 ? 'Ajouter' : 'Retirer'} ${Math.abs(delta)} kg`}
                    style={[styles.quickWeightChip, { backgroundColor: theme.colors.glassFill }]}
                    onPress={() => handleAdjustWeight(delta)}
                  >
                    <Text style={[styles.quickWeightChipText, { color: theme.colors.text }]}>
                      {delta > 0 ? `+${delta}` : `\u2212${Math.abs(delta)}`}
                    </Text>
                  </PressableScale>
                ))}
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>

        {/* Bottom Action Bar: Only Annuler & Valider */}
        <View style={styles.bottomBar}>
          <PressableScale
            haptic="light"
            accessibilityRole="button"
            containerStyle={styles.cancelActionContainer}
            style={[styles.cancelActionBtn, { backgroundColor: theme.colors.glassFill }]}
            onPress={handleCancel}
          >
            <Text style={[styles.cancelActionBtnText, { color: theme.colors.textSecondary }]}>
              Annuler
            </Text>
          </PressableScale>

          <PressableScale
            haptic="none"
            accessibilityRole="button"
            containerStyle={styles.confirmActionContainer}
            style={[styles.confirmActionBtn, { backgroundColor: theme.colors.sprintyBlue }]}
            onPress={handleConfirm}
          >
            <Feather name="check" size={18} color={theme.colors.surface} style={{ marginRight: 8 }} />
            <Text style={[styles.confirmActionBtnText, { color: theme.colors.surface }]}>
              {hasNextSet && onNext ? 'Suivante' : 'Valider'}
            </Text>
          </PressableScale>
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
    borderCurve: 'continuous',
    borderWidth: 1,
    shadowColor: '#0F172A',
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
  headerInfo: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '700',
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
    fontVariant: ['tabular-nums'],
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

  // Quick weight adjuster chips
  quickWeightRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  quickWeightChip: {
    minWidth: 56,
    height: 44,
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickWeightChipText: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Bottom action bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  cancelActionContainer: {
    flex: 1,
  },
  cancelActionBtn: {
    height: 52,
    borderRadius: 16,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelActionBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmActionContainer: {
    flex: 2,
  },
  confirmActionBtn: {
    height: 52,
    borderRadius: 16,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0069E8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmActionBtnText: {
    fontSize: 16,
    fontWeight: '800',
  },
});
