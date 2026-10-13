import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import * as Haptics from 'expo-haptics';
import { FeedbackHost } from '../../../shared/feedback/FeedbackHost';
import { PressableScale } from '../../../shared/components/PressableScale';
import { IconButton } from '../../../shared/components/IconButton';

interface RestTimePickerModalProps {
  visible: boolean;
  title: string;
  initialSeconds: number;
  onClose: () => void;
  onConfirm: (totalSeconds: number) => void;
}

const ITEM_HEIGHT = 50;
const MINUTES_LIST = Array.from({ length: 16 }, (_, i) => i); // 0 to 15 min
const SECONDS_LIST = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, 10, 15... 55 sec

export const RestTimePickerModal: React.FC<RestTimePickerModalProps> = ({
  visible,
  title,
  initialSeconds,
  onClose,
  onConfirm,
}) => {
  const theme = useTheme();

  const [selectedMinutes, setSelectedMinutes] = useState(1);
  const [selectedSeconds, setSelectedSeconds] = useState(0);

  const minScrollRef = useRef<ScrollView>(null);
  const secScrollRef = useRef<ScrollView>(null);

  const presets = [
    { label: '45 s', value: 45 },
    { label: '1 min', value: 60 },
    { label: '1m30', value: 90 },
    { label: '2 min', value: 120 },
    { label: '3 min', value: 180 },
  ];

  useEffect(() => {
    if (visible) {
      const mins = Math.floor(initialSeconds / 60);
      const secs = Math.floor((initialSeconds % 60) / 5) * 5;
      setSelectedMinutes(Math.min(15, Math.max(0, mins)));
      setSelectedSeconds(Math.min(55, Math.max(0, secs)));

      setTimeout(() => {
        const minIndex = MINUTES_LIST.indexOf(Math.min(15, Math.max(0, mins)));
        const secIndex = SECONDS_LIST.indexOf(Math.min(55, Math.max(0, secs)));
        if (minIndex >= 0) {
          minScrollRef.current?.scrollTo({ y: minIndex * ITEM_HEIGHT, animated: false });
        }
        if (secIndex >= 0) {
          secScrollRef.current?.scrollTo({ y: secIndex * ITEM_HEIGHT, animated: false });
        }
      }, 80);
    }
  }, [visible, initialSeconds]);

  const handleMinScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(MINUTES_LIST.length - 1, index));
    setSelectedMinutes(MINUTES_LIST[clamped]);
    Haptics.selectionAsync();
  };

  const handleSecScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(SECONDS_LIST.length - 1, index));
    setSelectedSeconds(SECONDS_LIST[clamped]);
    Haptics.selectionAsync();
  };

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const total = selectedMinutes * 60 + selectedSeconds;
    onConfirm(Math.max(5, total));
    onClose();
  };

  const handlePresetTap = (totalSeconds: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onConfirm(totalSeconds);
    onClose();
  };

  const format2Digits = (num: number) => String(num).padStart(2, '0');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <FeedbackHost />
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
            <IconButton icon="x" onPress={onClose} accessibilityLabel="Fermer" size={36} />
          </View>

          {/* Presets Row */}
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Raccourcis</Text>
          <View style={styles.presetsContainer}>
            {presets.map((preset) => (
              <PressableScale
                key={preset.value}
                haptic="none"
                accessibilityRole="button"
                accessibilityLabel={`Repos de ${preset.label}`}
                style={[styles.presetBtn, { backgroundColor: theme.colors.glassFill }]}
                onPress={() => handlePresetTap(preset.value)}
              >
                <Text style={[styles.presetText, { color: theme.colors.text }]}>{preset.label}</Text>
              </PressableScale>
            ))}
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: theme.colors.hairline }]} />

          {/* Column Headers */}
          <View style={styles.columnsHeader}>
            <Text style={[styles.columnLabel, { color: theme.colors.textSecondary }]}>Minutes</Text>
            <Text style={[styles.columnLabel, { color: theme.colors.textSecondary }]}>Secondes</Text>
          </View>

          {/* Wheel Selector Area */}
          <View style={styles.wheelsContainer}>
            <View
              style={[
                styles.activeHighlightBar,
                {
                  backgroundColor: 'rgba(0, 105, 232, 0.08)',
                  borderColor: theme.colors.sprintyBlue,
                  borderWidth: 1.5,
                },
              ]}
              pointerEvents="none"
            >
              <Text style={[styles.colonSeparator, { color: theme.colors.text }]}>:</Text>
            </View>

            <View style={styles.wheelColumn}>
              <ScrollView
                ref={minScrollRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={handleMinScrollEnd}
                contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
              >
                {MINUTES_LIST.map((min) => {
                  const isSelected = selectedMinutes === min;
                  return (
                    <PressableScale
                      key={min}
                      haptic="none"
                      activeScale={0.94}
                      accessibilityLabel={`${min} minute${min > 1 ? 's' : ''}`}
                      style={styles.itemRow}
                      onPress={() => {
                        setSelectedMinutes(min);
                        minScrollRef.current?.scrollTo({
                          y: MINUTES_LIST.indexOf(min) * ITEM_HEIGHT,
                          animated: true,
                        });
                        Haptics.selectionAsync();
                      }}
                    >
                      <Text
                        style={[
                          styles.itemText,
                          {
                            color: isSelected ? theme.colors.sprintyBlue : theme.colors.textMuted,
                            fontWeight: isSelected ? '800' : '400',
                            opacity: isSelected ? 1 : 0.4,
                          },
                        ]}
                      >
                        {format2Digits(min)}
                      </Text>
                    </PressableScale>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.wheelColumn}>
              <ScrollView
                ref={secScrollRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={handleSecScrollEnd}
                contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
              >
                {SECONDS_LIST.map((sec) => {
                  const isSelected = selectedSeconds === sec;
                  return (
                    <PressableScale
                      key={sec}
                      haptic="none"
                      activeScale={0.94}
                      accessibilityLabel={`${sec} seconde${sec > 1 ? 's' : ''}`}
                      style={styles.itemRow}
                      onPress={() => {
                        setSelectedSeconds(sec);
                        secScrollRef.current?.scrollTo({
                          y: SECONDS_LIST.indexOf(sec) * ITEM_HEIGHT,
                          animated: true,
                        });
                        Haptics.selectionAsync();
                      }}
                    >
                      <Text
                        style={[
                          styles.itemText,
                          {
                            color: isSelected ? theme.colors.sprintyBlue : theme.colors.textMuted,
                            fontWeight: isSelected ? '800' : '400',
                            opacity: isSelected ? 1 : 0.4,
                          },
                        ]}
                      >
                        {format2Digits(sec)}
                      </Text>
                    </PressableScale>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          <PressableScale
            haptic="none"
            accessibilityRole="button"
            containerStyle={styles.confirmBtnContainer}
            style={[styles.confirmBtn, { backgroundColor: theme.colors.sprintyBlue }]}
            onPress={handleConfirm}
          >
            <Feather name="check" size={18} color={theme.colors.surface} />
            <Text style={[styles.confirmBtnText, { color: theme.colors.surface }]}>
              Valider {format2Digits(selectedMinutes)}:{format2Digits(selectedSeconds)}
            </Text>
          </PressableScale>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 22,
    borderCurve: 'continuous',
    padding: 20,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
    flex: 1,
    marginRight: 12,
  },
  sectionLabel: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  presetBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetText: {
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    width: '100%',
    height: 1,
    marginBottom: 16,
  },
  columnsHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  columnLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textAlign: 'center',
    width: 100,
  },
  wheelsContainer: {
    width: '100%',
    height: ITEM_HEIGHT * 3, // Shows 3 visible rows
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 10,
  },
  activeHighlightBar: {
    position: 'absolute',
    top: ITEM_HEIGHT,
    left: 10,
    right: 10,
    height: ITEM_HEIGHT,
    borderRadius: 14,
    borderCurve: 'continuous',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colonSeparator: {
    fontSize: 26,
    fontWeight: '800',
  },
  wheelColumn: {
    width: 100,
    height: ITEM_HEIGHT * 3,
    zIndex: 2,
  },
  itemRow: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 30,
    letterSpacing: 1,
  },
  confirmBtnContainer: {
    width: '100%',
    marginTop: 10,
  },
  confirmBtn: {
    height: 52,
    borderRadius: 16,
    borderCurve: 'continuous',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
