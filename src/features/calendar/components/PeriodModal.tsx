import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import * as Haptics from 'expo-haptics';
import {
  TrainingPeriod,
  PERIOD_COLORS,
  PeriodTemplate,
} from '../../../types/period';
import DateTimePicker from '@react-native-community/datetimepicker';
import { periodService } from '../../../services/periodService';
import { useAuthStore } from '../../../store/authStore';
import { useCoachStore } from '../../../store/coach/coachStore';

interface PeriodModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: Date;
  periodToEdit?: TrainingPeriod | null;
  onSuccess: () => void;
}

const formatDateToIso = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (d: Date, days: number): Date => {
  const res = new Date(d);
  res.setDate(res.getDate() + days);
  return res;
};

export const PeriodModal: React.FC<PeriodModalProps> = ({
  visible,
  onClose,
  selectedDate,
  periodToEdit,
  onSuccess,
}) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { teams, subgroups, teamMembers } = useCoachStore();

  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(PERIOD_COLORS[0].hex);
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');
  const [targetType, setTargetType] = useState<'team' | 'subgroup' | 'athlete'>('team');
  const [selectedSubgroupId, setSelectedSubgroupId] = useState<string | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize or reset modal data
  useEffect(() => {
    if (visible) {
      if (periodToEdit) {
        setName(periodToEdit.name);
        setColor(periodToEdit.color);
        setStartDateStr(periodToEdit.start_date);
        setEndDateStr(periodToEdit.end_date);
        if (periodToEdit.athlete_id) {
          setTargetType('athlete');
          setSelectedAthleteId(periodToEdit.athlete_id);
        } else if (periodToEdit.subgroup_id) {
          setTargetType('subgroup');
          setSelectedSubgroupId(periodToEdit.subgroup_id);
        } else {
          setTargetType('team');
        }
      } else {
        // New period defaults
        const start = new Date(selectedDate);
        const end = addDays(start, 13); // Default 2 weeks
        setName('');
        setColor(PERIOD_COLORS[0].hex);
        setStartDateStr(formatDateToIso(start));
        setEndDateStr(formatDateToIso(end));
        setTargetType('team');
        setSelectedSubgroupId(null);
        setSelectedAthleteId(null);
      }
    }
  }, [visible, periodToEdit, selectedDate, user?.id]);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const startDateObj = startDateStr ? new Date(startDateStr) : new Date(selectedDate);
  const endDateObj = endDateStr ? new Date(endDateStr) : addDays(new Date(selectedDate), 13);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Nom requis', 'Veuillez saisir un intitulé pour la période.');
      return;
    }

    if (!startDateStr || !endDateStr) {
      Alert.alert('Dates requises', 'Veuillez vérifier les dates de début et de fin.');
      return;
    }

    if (startDateStr > endDateStr) {
      Alert.alert('Dates invalides', 'La date de fin doit être postérieure à la date de début.');
      return;
    }

    if (!user?.id) return;

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const activeTeamId = teams.length > 0 ? teams[0].id : null;

    try {
      if (periodToEdit) {
        await periodService.updatePeriod(periodToEdit.id, {
          name: name.trim(),
          color,
          start_date: startDateStr,
          end_date: endDateStr,
          team_id: targetType === 'team' ? activeTeamId : null,
          subgroup_id: targetType === 'subgroup' ? selectedSubgroupId : null,
          athlete_id: targetType === 'athlete' ? selectedAthleteId : null,
        });
      } else {
        await periodService.createPeriod(user.id, {
          name: name.trim(),
          color,
          start_date: startDateStr,
          end_date: endDateStr,
          team_id: targetType === 'team' ? activeTeamId : null,
          subgroup_id: targetType === 'subgroup' ? selectedSubgroupId : null,
          athlete_id: targetType === 'athlete' ? selectedAthleteId : null,
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      Alert.alert('Erreur', "Impossible d'enregistrer la période. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!periodToEdit) return;

    Alert.alert(
      'Supprimer la période',
      `Êtes-vous sûr de vouloir supprimer la phase "${periodToEdit.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            try {
              await periodService.deletePeriod(periodToEdit.id);
              onSuccess();
              onClose();
            } catch (err) {
              Alert.alert('Erreur', 'Impossible de supprimer cette période.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const activeTeam = teams[0];
  const approvedMembers = useMemo(
    () => teamMembers.filter((m) => m.status === 'approved'),
    [teamMembers]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {periodToEdit ? 'Modifier la période' : 'Planifier une période'}
              </Text>
              <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                Périodisation et cycles d'entraînement
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.colors.background }]}>
              <Feather name="x" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Field: Period Name */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>Nom de la période</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                placeholder="Ex. Aérobie, Affûtage, Vitesse..."
                placeholderTextColor={theme.colors.textMuted}
                value={name}
                onChangeText={setName}
                maxLength={35}
              />


            </View>

            {/* Field: 8 Signature Color Swatches */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>Couleur de la période</Text>
              <View style={styles.colorsRow}>
                {PERIOD_COLORS.map((col, i) => {
                  const isColorActive = color.toLowerCase() === col.hex.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: col.hex },
                        isColorActive && styles.colorSwatchActive,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setColor(col.hex);
                      }}
                      activeOpacity={0.8}
                    >
                      {isColorActive && <Feather name="check" size={16} color="#FFFFFF" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Field: Dates & Quick Duration Presets */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>Plage de dates</Text>

              <View style={styles.dateInputsRow}>
                <View style={styles.dateInputCol}>
                  <Text style={[styles.dateSubLabel, { color: theme.colors.textSecondary }]}>Début</Text>
                  {Platform.OS === 'android' ? (
                    <>
                      <TouchableOpacity
                        style={[styles.dateInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                        onPress={() => setShowStartPicker(true)}
                      >
                        <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{startDateObj.toLocaleDateString('fr-FR')}</Text>
                      </TouchableOpacity>
                      {showStartPicker && (
                        <DateTimePicker
                          value={startDateObj}
                          mode="date"
                          display="default"
                          onChange={(event, date) => {
                            setShowStartPicker(false);
                            if (event.type === 'set' && date) {
                              setStartDateStr(formatDateToIso(date));
                              if (date > endDateObj) setEndDateStr(formatDateToIso(date));
                            }
                          }}
                        />
                      )}
                    </>
                  ) : (
                    <DateTimePicker
                      value={startDateObj}
                      mode="date"
                      display="default"
                      onChange={(event, date) => {
                        if (date) {
                          setStartDateStr(formatDateToIso(date));
                          if (date > endDateObj) setEndDateStr(formatDateToIso(date));
                        }
                      }}
                      style={{ marginTop: 4 }}
                    />
                  )}
                </View>

                <Feather name="arrow-right" size={18} color={theme.colors.textMuted} style={{ marginTop: 22 }} />

                <View style={styles.dateInputCol}>
                  <Text style={[styles.dateSubLabel, { color: theme.colors.textSecondary }]}>Fin</Text>
                  {Platform.OS === 'android' ? (
                    <>
                      <TouchableOpacity
                        style={[styles.dateInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                        onPress={() => setShowEndPicker(true)}
                      >
                        <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{endDateObj.toLocaleDateString('fr-FR')}</Text>
                      </TouchableOpacity>
                      {showEndPicker && (
                        <DateTimePicker
                          value={endDateObj}
                          mode="date"
                          display="default"
                          minimumDate={startDateObj}
                          onChange={(event, date) => {
                            setShowEndPicker(false);
                            if (event.type === 'set' && date) {
                              setEndDateStr(formatDateToIso(date));
                            }
                          }}
                        />
                      )}
                    </>
                  ) : (
                    <DateTimePicker
                      value={endDateObj}
                      mode="date"
                      display="default"
                      minimumDate={startDateObj}
                      onChange={(event, date) => {
                        if (date) {
                          setEndDateStr(formatDateToIso(date));
                        }
                      }}
                      style={{ marginTop: 4 }}
                    />
                  )}
                </View>
              </View>
            </View>

            {/* Field: Target (Groupe, Sous-groupe, Athlète) */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>Cible de la période</Text>

              <View style={styles.targetTypeRow}>
                {[
                  { id: 'team', label: 'Tout le groupe', icon: 'users' },
                  { id: 'subgroup', label: 'Sous-groupe', icon: 'layers' },
                  { id: 'athlete', label: 'Athlète', icon: 'user' },
                ].map((t) => {
                  const isSelected = targetType === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.targetTypeBtn,
                        {
                          backgroundColor: isSelected ? theme.colors.accent : theme.colors.background,
                          borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setTargetType(t.id as any);
                      }}
                    >
                      <Feather
                        name={t.icon as any}
                        size={14}
                        color={isSelected ? '#FFFFFF' : theme.colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.targetTypeBtnText,
                          { color: isSelected ? '#FFFFFF' : theme.colors.text },
                        ]}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Subgroup selector if chosen */}
              {targetType === 'subgroup' && (
                <View style={styles.subSelectorContainer}>
                  {subgroups.length === 0 ? (
                    <Text style={[styles.emptyHintText, { color: theme.colors.textMuted }]}>
                      Aucun sous-groupe configuré dans votre équipe.
                    </Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                      {subgroups.map((sg) => {
                        const isSubSelected = selectedSubgroupId === sg.id;
                        return (
                          <TouchableOpacity
                            key={sg.id}
                            style={[
                              styles.chip,
                              {
                                backgroundColor: isSubSelected ? theme.colors.accent + '22' : theme.colors.background,
                                borderColor: isSubSelected ? theme.colors.accent : theme.colors.border,
                                marginRight: 8,
                              },
                            ]}
                            onPress={() => setSelectedSubgroupId(sg.id)}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                { color: isSubSelected ? theme.colors.accent : theme.colors.text },
                              ]}
                            >
                              {sg.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              )}

              {/* Athlete selector if chosen */}
              {targetType === 'athlete' && (
                <View style={styles.subSelectorContainer}>
                  {approvedMembers.length === 0 ? (
                    <Text style={[styles.emptyHintText, { color: theme.colors.textMuted }]}>
                      Aucun athlète dans votre équipe.
                    </Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                      {approvedMembers.map((m) => {
                        const isAthSelected = selectedAthleteId === m.user_id;
                        const nameDisplay = `${m.profile?.first_name || ''} ${m.profile?.last_name || ''}`.trim() || 'Athlète';
                        return (
                          <TouchableOpacity
                            key={m.user_id}
                            style={[
                              styles.chip,
                              {
                                backgroundColor: isAthSelected ? theme.colors.accent + '22' : theme.colors.background,
                                borderColor: isAthSelected ? theme.colors.accent : theme.colors.border,
                                marginRight: 8,
                              },
                            ]}
                            onPress={() => setSelectedAthleteId(m.user_id)}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                { color: isAthSelected ? theme.colors.accent : theme.colors.text },
                              ]}
                            >
                              {nameDisplay}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: color }]}
                onPress={handleSave}
                disabled={isSubmitting || isDeleting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="check" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.saveBtnText}>
                      {periodToEdit ? 'Enregistrer les modifications' : 'Appliquer la période'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {periodToEdit && (
                <TouchableOpacity
                  style={[styles.deleteBtn, { borderColor: theme.colors.error + '40' }]}
                  onPress={handleDelete}
                  disabled={isSubmitting || isDeleting}
                  activeOpacity={0.7}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color={theme.colors.error} />
                  ) : (
                    <>
                      <Feather name="trash-2" size={16} color={theme.colors.error} style={{ marginRight: 6 }} />
                      <Text style={[styles.deleteBtnText, { color: theme.colors.error }]}>
                        Supprimer cette période
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '90%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  textInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  colorsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchActive: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  dateInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dateInputCol: {
    flex: 1,
  },
  dateSubLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  dateInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  targetTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  targetTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  targetTypeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  subSelectorContainer: {
    marginTop: 8,
  },
  emptyHintText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  actionsContainer: {
    marginTop: 12,
    gap: 10,
    paddingBottom: 20,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
