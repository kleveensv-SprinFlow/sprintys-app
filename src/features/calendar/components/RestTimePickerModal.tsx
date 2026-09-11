import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import * as Haptics from 'expo-haptics';

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

  useEffect(() => {
    if (visible) {
      const mins = Math.floor(initialSeconds / 60);
      const secs = Math.floor((initialSeconds % 60) / 5) * 5;
      setSelectedMinutes(Math.min(15, Math.max(0, mins)));
      setSelectedSeconds(Math.min(55, Math.max(0, secs)));

      // Auto-scroll to initial positions
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
    onConfirm(Math.max(5, total)); // minimum 5 seconds
    onClose();
  };

  const format2Digits = (num: number) => String(num).padStart(2, '0');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.colors.background }]}>
              <Feather name="x" size={18} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Column Headers */}
          <View style={styles.columnsHeader}>
            <Text style={[styles.columnLabel, { color: theme.colors.textSecondary }]}>Minutes</Text>
            <Text style={[styles.columnLabel, { color: theme.colors.textSecondary }]}>Secondes</Text>
          </View>

          {/* Wheel Selector Area */}
          <View style={styles.wheelsContainer}>
            {/* Center Active Highlight Bar */}
            <View
              style={[
                styles.activeHighlightBar,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                },
              ]}
              pointerEvents="none"
            >
              <Text style={[styles.colonSeparator, { color: theme.colors.text }]}>:</Text>
            </View>

            {/* Minutes Wheel */}
            <View style={styles.wheelColumn}>
              <ScrollView
                ref={minScrollRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={handleMinScrollEnd}
                contentContainerStyle={{
                  paddingVertical: ITEM_HEIGHT, // padding to center top and bottom items
                }}
              >
                {MINUTES_LIST.map((min) => {
                  const isSelected = selectedMinutes === min;
                  return (
                    <TouchableOpacity
                      key={min}
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
                            color: isSelected ? theme.colors.text : theme.colors.textMuted,
                            fontWeight: isSelected ? '800' : '400',
                            opacity: isSelected ? 1 : 0.4,
                          },
                        ]}
                      >
                        {format2Digits(min)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Secondes Wheel */}
            <View style={styles.wheelColumn}>
              <ScrollView
                ref={secScrollRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={handleSecScrollEnd}
                contentContainerStyle={{
                  paddingVertical: ITEM_HEIGHT,
                }}
              >
                {SECONDS_LIST.map((sec) => {
                  const isSelected = selectedSeconds === sec;
                  return (
                    <TouchableOpacity
                      key={sec}
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
                            color: isSelected ? theme.colors.text : theme.colors.textMuted,
                            fontWeight: isSelected ? '800' : '400',
                            opacity: isSelected ? 1 : 0.4,
                          },
                        ]}
                      >
                        {format2Digits(sec)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          {/* Quick Info */}
          <Text style={[styles.durationSummary, { color: theme.colors.textSecondary }]}>
            Durée sélectionnée :{' '}
            <Text style={{ color: theme.colors.accent, fontWeight: '800' }}>
              {selectedMinutes > 0 ? `${selectedMinutes} min ` : ''}
              {selectedSeconds > 0 || selectedMinutes === 0 ? `${selectedSeconds} s` : ''}
            </Text>
          </Text>

          {/* Valider Button */}
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: theme.colors.accent }]}
            onPress={handleConfirm}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmBtnText}>Valider</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
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
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
    flex: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  columnsHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  columnLabel: {
    fontSize: 13,
    fontWeight: '700',
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
    borderWidth: 1,
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
  durationSummary: {
    fontSize: 13,
    marginVertical: 14,
  },
  confirmBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
