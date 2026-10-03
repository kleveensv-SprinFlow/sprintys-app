import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../core/theme';
import * as Haptics from 'expo-haptics';
import {
  CompetitionSearchParams,
  FRENCH_REGIONS,
  COMPETITION_LEVELS,
  ATHLETICS_DISCIPLINES,
} from '../../services/competitionSearchService';

interface CompetitionSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSearch: (params: CompetitionSearchParams) => void;
}

export const CompetitionSearchModal: React.FC<CompetitionSearchModalProps> = ({
  visible,
  onClose,
  onSearch,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Helper pour formater une date en YYYY-MM-DD
  const toDateString = (d: Date) => d.toISOString().split('T')[0];

  const now = new Date();
  const threeMonthsLater = new Date();
  threeMonthsLater.setMonth(now.getMonth() + 3);

  const [startDate, setStartDate] = useState(toDateString(now));
  const [endDate, setEndDate] = useState(toDateString(threeMonthsLater));
  const [selectedRegion, setSelectedRegion] = useState('Toute la France');
  const [selectedLevel, setSelectedLevel] = useState('Tous niveaux');
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>(['Sprint (60m, 100m, 200m, 400m)']);

  // États pour les sous-sélecteurs modaux
  const [regionModalVisible, setRegionModalVisible] = useState(false);
  const [levelModalVisible, setLevelModalVisible] = useState(false);

  // Sélecteur de période rapide
  const applyPeriodPreset = (preset: 'month' | 'three_months' | 'season') => {
    Haptics.selectionAsync();
    const start = new Date();
    const end = new Date();
    if (preset === 'month') {
      end.setMonth(start.getMonth() + 1);
    } else if (preset === 'three_months') {
      end.setMonth(start.getMonth() + 3);
    } else if (preset === 'season') {
      end.setMonth(start.getMonth() + 6);
    }
    setStartDate(toDateString(start));
    setEndDate(toDateString(end));
  };

  const toggleDiscipline = (disc: string) => {
    Haptics.selectionAsync();
    if (disc === 'Toutes épreuves') {
      setSelectedDisciplines(['Toutes épreuves']);
      return;
    }

    let next = selectedDisciplines.filter((d) => d !== 'Toutes épreuves');
    if (next.includes(disc)) {
      next = next.filter((d) => d !== disc);
      if (next.length === 0) next = ['Toutes épreuves'];
    } else {
      next.push(disc);
    }
    setSelectedDisciplines(next);
  };

  const handleValidate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSearch({
      startDate,
      endDate,
      region: selectedRegion,
      level: selectedLevel,
      disciplines: selectedDisciplines,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20), borderBottomColor: theme.colors.surfaceLight }]}>
          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.colors.surface }]} activeOpacity={0.7}>
            <Feather name="x" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Trouver une compétition</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted }]}>Recherche web intelligente par Sprinty</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
          {/* Section 1 : Période de recherche */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Feather name="calendar" size={16} color={theme.colors.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Période de recherche</Text>
            </View>

            {/* Raccourcis de période */}
            <View style={styles.presetsRow}>
              <TouchableOpacity
                style={[styles.presetChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.surfaceLight }]}
                onPress={() => applyPeriodPreset('month')}
              >
                <Text style={[styles.presetChipText, { color: theme.colors.text }]}>Ce mois-ci</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.presetChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.accent }]}
                onPress={() => applyPeriodPreset('three_months')}
              >
                <Text style={[styles.presetChipText, { color: theme.colors.accent, fontWeight: '700' }]}>3 prochains mois</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.presetChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.surfaceLight }]}
                onPress={() => applyPeriodPreset('season')}
              >
                <Text style={[styles.presetChipText, { color: theme.colors.text }]}>Saison complète</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.datesCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.surfaceLight }]}>
              <View style={styles.dateBlock}>
                <Text style={[styles.dateLabel, { color: theme.colors.textMuted }]}>DU</Text>
                <Text style={[styles.dateValue, { color: theme.colors.text }]}>{startDate}</Text>
              </View>
              <Feather name="arrow-right" size={16} color={theme.colors.textMuted} />
              <View style={styles.dateBlock}>
                <Text style={[styles.dateLabel, { color: theme.colors.textMuted }]}>AU</Text>
                <Text style={[styles.dateValue, { color: theme.colors.text }]}>{endDate}</Text>
              </View>
            </View>
          </View>

          {/* Section 2 : Région géographique */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="location-outline" size={18} color={theme.colors.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Zone géographique</Text>
            </View>
            <TouchableOpacity
              style={[styles.dropdownBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.surfaceLight }]}
              onPress={() => {
                Haptics.selectionAsync();
                setRegionModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.dropdownLabel, { color: theme.colors.textMuted }]}>Région sélectionnée</Text>
                <Text style={[styles.dropdownValue, { color: theme.colors.text }]}>{selectedRegion}</Text>
              </View>
              <Feather name="chevron-down" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Section 3 : Niveau de la compétition */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="trophy-outline" size={18} color={theme.colors.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Niveau de la compétition (Facultatif)</Text>
            </View>
            <TouchableOpacity
              style={[styles.dropdownBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.surfaceLight }]}
              onPress={() => {
                Haptics.selectionAsync();
                setLevelModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.dropdownLabel, { color: theme.colors.textMuted }]}>Label / Niveau</Text>
                <Text style={[styles.dropdownValue, { color: theme.colors.text }]}>{selectedLevel}</Text>
              </View>
              <Feather name="chevron-down" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Section 4 : Disciplines */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Feather name="activity" size={16} color={theme.colors.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Discipline(s)</Text>
            </View>
            <View style={styles.tagsContainer}>
              {ATHLETICS_DISCIPLINES.map((disc) => {
                const isSelected = selectedDisciplines.includes(disc);
                return (
                  <TouchableOpacity
                    key={disc}
                    style={[
                      styles.tagChip,
                      {
                        backgroundColor: isSelected ? theme.colors.accent : theme.colors.surface,
                        borderColor: isSelected ? theme.colors.accent : theme.colors.surfaceLight,
                      },
                    ]}
                    onPress={() => toggleDiscipline(disc)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        {
                          color: isSelected ? '#09090D' : theme.colors.text,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {disc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Floating Submit Button */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: theme.colors.background }]}>
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: theme.colors.accent }]}
            onPress={handleValidate}
            activeOpacity={0.8}
          >
            <Feather name="search" size={18} color="#09090D" style={{ marginRight: 8 }} />
            <Text style={styles.submitBtnText}>Lancer la recherche avec Sprinty</Text>
          </TouchableOpacity>
        </View>

        {/* Sous-Modal Sélection Région */}
        <Modal visible={regionModalVisible} animationType="fade" transparent onRequestClose={() => setRegionModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.pickerModalContent, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.pickerModalTitle, { color: theme.colors.text }]}>Choisir une région</Text>
              <ScrollView style={{ maxHeight: 350 }}>
                {FRENCH_REGIONS.map((reg) => (
                  <TouchableOpacity
                    key={reg}
                    style={[styles.pickerOption, selectedRegion === reg && { backgroundColor: theme.colors.surfaceLight }]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedRegion(reg);
                      setRegionModalVisible(false);
                    }}
                  >
                    <Text style={[styles.pickerOptionText, { color: selectedRegion === reg ? theme.colors.accent : theme.colors.text }]}>
                      {reg}
                    </Text>
                    {selectedRegion === reg && <Feather name="check" size={18} color={theme.colors.accent} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.pickerCloseBtn} onPress={() => setRegionModalVisible(false)}>
                <Text style={{ color: theme.colors.textMuted, fontWeight: '600' }}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Sous-Modal Sélection Niveau */}
        <Modal visible={levelModalVisible} animationType="fade" transparent onRequestClose={() => setLevelModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.pickerModalContent, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.pickerModalTitle, { color: theme.colors.text }]}>Choisir un niveau</Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {COMPETITION_LEVELS.map((lvl) => (
                  <TouchableOpacity
                    key={lvl}
                    style={[styles.pickerOption, selectedLevel === lvl && { backgroundColor: theme.colors.surfaceLight }]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedLevel(lvl);
                      setLevelModalVisible(false);
                    }}
                  >
                    <Text style={[styles.pickerOptionText, { color: selectedLevel === lvl ? theme.colors.accent : theme.colors.text }]}>
                      {lvl}
                    </Text>
                    {selectedLevel === lvl && <Feather name="check" size={18} color={theme.colors.accent} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.pickerCloseBtn} onPress={() => setLevelModalVisible(false)}>
                <Text style={{ color: theme.colors.textMuted, fontWeight: '600' }}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  scrollContent: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 12,
  },
  datesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  dateBlock: {
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  dropdownLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  dropdownValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 13,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#09090D',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  pickerModalContent: {
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  pickerModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  pickerOptionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  pickerCloseBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 10,
  },
});
