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
import DateTimePicker from '@react-native-community/datetimepicker';
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
  const insets = useSafeAreaInsets();

  // Helper pour formater une date en YYYY-MM-DD
  const toDateString = (d: Date) => d.toISOString().split('T')[0];

  const now = new Date();
  const [startDate, setStartDate] = useState(toDateString(now));
  const [endDate, setEndDate] = useState(toDateString(now)); // Journée unique par défaut
  const [selectedRegion, setSelectedRegion] = useState('Toute la France');
  const [selectedLevel, setSelectedLevel] = useState('Tous niveaux');
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>(['Sprint (60m, 100m, 200m, 400m)']);

  // États pour les pickers de calendrier
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // États pour les sous-sélecteurs modaux
  const [regionModalVisible, setRegionModalVisible] = useState(false);
  const [levelModalVisible, setLevelModalVisible] = useState(false);

  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  const isSingleDay = startDate === endDate;

  // Calcul du nombre de jours de l'intervalle
  const intervalDays = Math.max(
    1,
    Math.round((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  const formatDisplayDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  // Sélecteur de période rapide
  const applyPeriodPreset = (preset: 'today' | 'weekend' | 'month' | 'three_months') => {
    Haptics.selectionAsync();
    const start = new Date();
    const end = new Date();

    if (preset === 'today') {
      setStartDate(toDateString(start));
      setEndDate(toDateString(start));
    } else if (preset === 'weekend') {
      const day = start.getDay();
      const diffToSat = (6 - day + 7) % 7;
      start.setDate(start.getDate() + diffToSat);
      end.setDate(start.getDate() + 1);
      setStartDate(toDateString(start));
      setEndDate(toDateString(end));
    } else if (preset === 'month') {
      end.setMonth(start.getMonth() + 1);
      setStartDate(toDateString(start));
      setEndDate(toDateString(end));
    } else if (preset === 'three_months') {
      end.setMonth(start.getMonth() + 3);
      setStartDate(toDateString(start));
      setEndDate(toDateString(end));
    }
  };

  const handleStartDateChange = (event: any, selected?: Date) => {
    if (Platform.OS === 'android') setShowStartPicker(false);
    if (selected && event.type !== 'dismissed') {
      const iso = toDateString(selected);
      setStartDate(iso);
      // AUTOMATIQUE : synchroniser la date de fin sur la même date pour faire une recherche sur cette journée précise
      setEndDate(iso);
      Haptics.selectionAsync();
    }
  };

  const handleEndDateChange = (event: any, selected?: Date) => {
    if (Platform.OS === 'android') setShowEndPicker(false);
    if (selected && event.type !== 'dismissed') {
      const iso = toDateString(selected);
      if (iso < startDate) {
        setStartDate(iso);
      }
      setEndDate(iso);
      Haptics.selectionAsync();
    }
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
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Feather name="x" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Trouver une compétition</Text>
            <Text style={styles.headerSubtitle}>Recherche web officielle & IA par Sprinty</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
          {/* Section 1 : Période de recherche */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Feather name="calendar" size={16} color="#0F172A" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Période de recherche</Text>
            </View>

            {/* Raccourcis de période */}
            <View style={styles.presetsRow}>
              <TouchableOpacity
                style={[styles.presetChip, isSingleDay && styles.presetChipActive]}
                onPress={() => applyPeriodPreset('today')}
              >
                <Text style={[styles.presetChipText, isSingleDay && styles.presetChipTextActive]}>Aujourd'hui</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => applyPeriodPreset('weekend')}
              >
                <Text style={styles.presetChipText}>Ce week-end</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => applyPeriodPreset('month')}
              >
                <Text style={styles.presetChipText}>Ce mois-ci</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => applyPeriodPreset('three_months')}
              >
                <Text style={styles.presetChipText}>3 prochains mois</Text>
              </TouchableOpacity>
            </View>

            {/* Badge interactif indiquant l'état de la recherche */}
            <View style={[styles.statusBadge, isSingleDay ? styles.statusBadgeSingle : styles.statusBadgeInterval]}>
              <Ionicons
                name={isSingleDay ? "radio-button-on" : "calendar-outline"}
                size={14}
                color={isSingleDay ? "#2563EB" : "#0D9488"}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.statusBadgeText, { color: isSingleDay ? "#1E40AF" : "#0F766E" }]}>
                {isSingleDay
                  ? "🎯 Recherche sur cette journée précise"
                  : `🗓️ Recherche sur un intervalle de ${intervalDays} jours`}
              </Text>
            </View>

            {/* Cartes interactives pour choisir les dates via le calendrier */}
            <View style={styles.datesContainer}>
              {/* Carte Date de Début (DU) */}
              <TouchableOpacity
                style={styles.dateCard}
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowStartPicker(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.dateCardHeader}>
                  <Text style={styles.dateCardLabel}>DU (DÉBUT)</Text>
                  <Feather name="calendar" size={14} color="#64748B" />
                </View>
                <Text style={styles.dateCardValue}>{formatDisplayDate(startDate)}</Text>
                <Text style={styles.dateCardSubhint}>Toucher pour changer</Text>
              </TouchableOpacity>

              <View style={styles.arrowIconWrap}>
                <Feather name="arrow-right" size={16} color="#64748B" />
              </View>

              {/* Carte Date de Fin (AU) */}
              <TouchableOpacity
                style={[styles.dateCard, isSingleDay && styles.dateCardSameDay]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowEndPicker(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.dateCardHeader}>
                  <Text style={styles.dateCardLabel}>AU (FIN)</Text>
                  <Feather name="calendar" size={14} color="#64748B" />
                </View>
                <Text style={styles.dateCardValue}>{formatDisplayDate(endDate)}</Text>
                <Text style={styles.dateCardSubhint}>
                  {isSingleDay ? "Même journée" : "Toucher pour ajuster"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* DateTimePicker Début */}
            {showStartPicker && (
              <DateTimePicker
                value={startDateObj}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleStartDateChange}
              />
            )}

            {/* DateTimePicker Fin */}
            {showEndPicker && (
              <DateTimePicker
                value={endDateObj}
                mode="date"
                minimumDate={startDateObj}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleEndDateChange}
              />
            )}
          </View>

          {/* Section 2 : Région géographique */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="location-outline" size={18} color="#0F172A" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Zone géographique</Text>
            </View>
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => {
                Haptics.selectionAsync();
                setRegionModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.dropdownLabel}>Région sélectionnée</Text>
                <Text style={styles.dropdownValue}>{selectedRegion}</Text>
              </View>
              <Feather name="chevron-down" size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {/* Section 3 : Niveau de la compétition */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="trophy-outline" size={18} color="#0F172A" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Niveau de la compétition (Facultatif)</Text>
            </View>
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => {
                Haptics.selectionAsync();
                setLevelModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.dropdownLabel}>Label / Niveau</Text>
                <Text style={styles.dropdownValue}>{selectedLevel}</Text>
              </View>
              <Feather name="chevron-down" size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {/* Section 4 : Disciplines */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Feather name="activity" size={16} color="#0F172A" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Discipline(s)</Text>
            </View>
            <View style={styles.tagsContainer}>
              {ATHLETICS_DISCIPLINES.map((disc) => {
                const isSelected = selectedDisciplines.includes(disc);
                return (
                  <TouchableOpacity
                    key={disc}
                    style={[
                      styles.tagChip,
                      isSelected && styles.tagChipSelected,
                    ]}
                    onPress={() => toggleDiscipline(disc)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        isSelected && styles.tagTextSelected,
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

        {/* Floating Submit Button (Contraste maximal : fond noir #0F172A, texte blanc #FFFFFF) */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleValidate}
            activeOpacity={0.8}
          >
            <Feather name="search" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.submitBtnText}>Lancer la recherche avec Sprinty</Text>
          </TouchableOpacity>
        </View>

        {/* Sous-Modal Sélection Région */}
        <Modal visible={regionModalVisible} animationType="fade" transparent onRequestClose={() => setRegionModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.pickerModalContent}>
              <Text style={styles.pickerModalTitle}>Choisir une région</Text>
              <ScrollView style={{ maxHeight: 350 }}>
                {FRENCH_REGIONS.map((reg) => (
                  <TouchableOpacity
                    key={reg}
                    style={[styles.pickerOption, selectedRegion === reg && styles.pickerOptionActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedRegion(reg);
                      setRegionModalVisible(false);
                    }}
                  >
                    <Text style={[styles.pickerOptionText, selectedRegion === reg && styles.pickerOptionTextActive]}>
                      {reg}
                    </Text>
                    {selectedRegion === reg && <Feather name="check" size={18} color="#0F172A" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.pickerCloseBtn} onPress={() => setRegionModalVisible(false)}>
                <Text style={{ color: '#64748B', fontWeight: '700' }}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Sous-Modal Sélection Niveau */}
        <Modal visible={levelModalVisible} animationType="fade" transparent onRequestClose={() => setLevelModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.pickerModalContent}>
              <Text style={styles.pickerModalTitle}>Choisir un niveau</Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {COMPETITION_LEVELS.map((lvl) => (
                  <TouchableOpacity
                    key={lvl}
                    style={[styles.pickerOption, selectedLevel === lvl && styles.pickerOptionActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedLevel(lvl);
                      setLevelModalVisible(false);
                    }}
                  >
                    <Text style={[styles.pickerOptionText, selectedLevel === lvl && styles.pickerOptionTextActive]}>
                      {lvl}
                    </Text>
                    {selectedLevel === lvl && <Feather name="check" size={18} color="#0F172A" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.pickerCloseBtn} onPress={() => setLevelModalVisible(false)}>
                <Text style={{ color: '#64748B', fontWeight: '700' }}>Fermer</Text>
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
    backgroundColor: '#F8FAFC', // Fond blanc bleuté propre haute lisibilité
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
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
    color: '#0F172A',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    borderColor: '#0F172A',
    backgroundColor: '#F1F5F9',
  },
  presetChipText: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '500',
  },
  presetChipTextActive: {
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 10,
  },
  statusBadgeSingle: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
  statusBadgeInterval: {
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  datesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  dateCardSameDay: {
    borderColor: '#CBD5E1',
  },
  dateCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  dateCardValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginVertical: 2,
  },
  dateCardSubhint: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  arrowIconWrap: {
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  dropdownLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  dropdownValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tagChipSelected: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
  },
  tagTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#0F172A', // Fond sombre noble
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF', // Texte blanc étincelant, 100% lisible
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  pickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  pickerModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
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
  pickerOptionActive: {
    backgroundColor: '#F1F5F9',
  },
  pickerOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
  },
  pickerOptionTextActive: {
    fontWeight: '700',
  },
  pickerCloseBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 10,
  },
});
