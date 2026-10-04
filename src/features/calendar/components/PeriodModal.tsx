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
  const [existingPeriods, setExistingPeriods] = useState<TrainingPeriod[]>([]);

  // Fetch coach's existing periods when modal opens
  useEffect(() => {
    if (visible && user?.id) {
      periodService.fetchAllCoachPeriods(user.id).then((periods) => {
        setExistingPeriods(periods);
      });
    }
  }, [visible, user?.id]);

  // Helper pour trouver si une date tombe dans une période existante
  const findConflictingPeriodForDate = (dateIso: string, periods: TrainingPeriod[]) => {
    return periods.find((p) => {
      if (periodToEdit && p.id === periodToEdit.id) return false;
      return dateIso >= p.start_date && dateIso <= p.end_date;
    });
  };

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
        // Smart initialization for new period:
        // Si la date cliquée est déjà couverte par une période existante,
        // on propose intelligemment de commencer le lendemain de la fin de cette période !
        const initialDateIso = formatDateToIso(selectedDate);
        const existingConflict = findConflictingPeriodForDate(initialDateIso, existingPeriods);

        let start: Date;
        if (existingConflict) {
          // Commencer le lendemain de la fin de la phase existante
          const conflictEndDate = new Date(existingConflict.end_date);
          start = addDays(conflictEndDate, 1);
        } else {
          start = new Date(selectedDate);
        }

        const end = addDays(start, 13); // Par défaut 2 semaines
        setName('');
        setColor(PERIOD_COLORS[0].hex);
        setStartDateStr(formatDateToIso(start));
        setEndDateStr(formatDateToIso(end));
        setTargetType('team');
        setSelectedSubgroupId(null);
        setSelectedAthleteId(null);
      }
    }
  }, [visible, periodToEdit, selectedDate, user?.id, existingPeriods.length]);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const startDateObj = startDateStr ? new Date(startDateStr) : new Date(selectedDate);
  const endDateObj = endDateStr ? new Date(endDateStr) : addDays(new Date(selectedDate), 13);

  // Détection en temps réel du chevauchement avec une phase existante
  const conflictInfo = useMemo(() => {
    if (!startDateStr || !endDateStr || startDateStr > endDateStr) return null;

    const activeTeamId = teams.length > 0 ? teams[0].id : null;

    for (const p of existingPeriods) {
      // Exclure la période en cours d'édition pour ne pas la croiser avec elle-même
      if (periodToEdit && p.id === periodToEdit.id) continue;

      // 1. Vérifier si les cibles se recoupent
      let targetsOverlap = false;

      if (targetType === 'team') {
        // Une phase générale d'équipe entre en conflit avec toute autre phase de cette équipe
        targetsOverlap = !p.team_id || p.team_id === activeTeamId;
      } else if (targetType === 'subgroup') {
        // Une phase de sous-groupe entre en conflit avec une phase générale OU une phase du même sous-groupe
        if (!p.subgroup_id && !p.athlete_id) {
          targetsOverlap = true;
        } else if (p.subgroup_id && p.subgroup_id === selectedSubgroupId) {
          targetsOverlap = true;
        }
      } else if (targetType === 'athlete') {
        // Une phase individuelle entre en conflit avec une phase d'équipe, de son sous-groupe ou de lui-même
        if (!p.subgroup_id && !p.athlete_id) {
          targetsOverlap = true;
        } else if (p.athlete_id && p.athlete_id === selectedAthleteId) {
          targetsOverlap = true;
        } else if (p.subgroup_id) {
          const athleteMember = teamMembers.find((m) => m.user_id === selectedAthleteId);
          if (athleteMember && athleteMember.subgroup_id === p.subgroup_id) {
            targetsOverlap = true;
          }
        }
      }

      if (!targetsOverlap) continue;

      // 2. Vérifier si les dates se croisent : start_A <= end_B ET end_A >= start_B
      const hasDateOverlap = startDateStr <= p.end_date && endDateStr >= p.start_date;

      if (hasDateOverlap) {
        // Intervalle exact de croisement : max(startA, startB) à min(endA, endB)
        const overlapStart = startDateStr > p.start_date ? startDateStr : p.start_date;
        const overlapEnd = endDateStr < p.end_date ? endDateStr : p.end_date;

        const formatFr = (iso: string) => {
          try {
            const parts = iso.split('-');
            if (parts.length === 3) {
              return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            return iso;
          } catch {
            return iso;
          }
        };

        return {
          conflictingPeriod: p,
          overlapStartStr: overlapStart,
          overlapEndStr: overlapEnd,
          formattedOverlap: `du ${formatFr(overlapStart)} au ${formatFr(overlapEnd)}`,
        };
      }
    }

    return null;
  }, [startDateStr, endDateStr, targetType, selectedSubgroupId, selectedAthleteId, existingPeriods, periodToEdit, teams, teamMembers]);

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

    if (conflictInfo) {
      Alert.alert(
        'Chevauchement interdit',
        `Cette phase chevauche la phase "${conflictInfo.conflictingPeriod.name}" ${conflictInfo.formattedOverlap}.\n\nVeuillez ajuster les dates pour que les phases ne se croisent pas.`
      );
      return;
    }

    if (targetType === 'subgroup' && !selectedSubgroupId) {
      Alert.alert('Sous-groupe requis', 'Veuillez sélectionner un sous-groupe.');
      return;
    }

    if (targetType === 'athlete' && !selectedAthleteId) {
      Alert.alert('Athlète requis', 'Veuillez sélectionner un athlète.');
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
                {periodToEdit ? 'Modifier la phase' : 'Nouvelle phase d\'entraînement'}
              </Text>
              <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                Cycle d'entraînement (ex : Vitesse, Affûtage, Aérobie)
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.colors.background }]}>
              <Feather name="x" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Field: Period Name */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>Nom de la phase (ou cycle)</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                placeholder="Ex. Vitesse, Affûtage, Force, Aérobie..."
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

              {/* Message d'avertissement et aide au repositionnement si chevauchement */}
              {conflictInfo && (
                <View style={[styles.conflictBanner, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}>
                  <View style={styles.conflictHeaderRow}>
                    <Ionicons name="alert-circle" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={styles.conflictTitle}>Période déjà occupée</Text>
                  </View>
                  <Text style={[styles.conflictMessage, { color: theme.colors.text }]}>
                    Cette période chevauche la phase{' '}
                    <Text style={{ fontWeight: '700', color: '#DC2626' }}>« {conflictInfo.conflictingPeriod.name} »</Text>{' '}
                    ({conflictInfo.formattedOverlap}).
                  </Text>

                  {/* Bouton d'action en 1 clic pour résoudre le conflit */}
                  <TouchableOpacity
                    style={styles.conflictQuickFixBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      const nextAvailableStart = addDays(new Date(conflictInfo.conflictingPeriod.end_date), 1);
                      const durationInDays = Math.max(1, Math.round((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)));
                      const nextAvailableEnd = addDays(nextAvailableStart, durationInDays);
                      setStartDateStr(formatDateToIso(nextAvailableStart));
                      setEndDateStr(formatDateToIso(nextAvailableEnd));
                    }}
                    activeOpacity={0.8}
                  >
                    <Feather name="fast-forward" size={14} color="#B91C1C" />
                    <Text style={styles.conflictQuickFixText}>
                      Positionner juste après « {conflictInfo.conflictingPeriod.name} »
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

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

              {/* Raccourcis de durée rapide (Apple Fitness / Athletic presets) */}
              <View style={styles.presetsRow}>
                {[
                  { label: '1 sem.', days: 6 },
                  { label: '2 sem.', days: 13 },
                  { label: '3 sem.', days: 20 },
                  { label: '4 sem.', days: 27 },
                  { label: '6 sem.', days: 41 },
                ].map((preset) => {
                  const targetEnd = addDays(startDateObj, preset.days);
                  const isCurrentPreset =
                    startDateStr &&
                    endDateStr &&
                    formatDateToIso(targetEnd) === endDateStr;

                  return (
                    <TouchableOpacity
                      key={preset.label}
                      style={[
                        styles.presetBtn,
                        {
                          backgroundColor: isCurrentPreset ? theme.colors.accent + '15' : theme.colors.background,
                          borderColor: isCurrentPreset ? theme.colors.accent : theme.colors.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setEndDateStr(formatDateToIso(targetEnd));
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.presetBtnText,
                          { color: isCurrentPreset ? theme.colors.accent : theme.colors.textSecondary },
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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
                        if (t.id === 'subgroup' && !selectedSubgroupId && subgroups.length > 0) {
                          setSelectedSubgroupId(subgroups[0].id);
                        }
                        if (t.id === 'athlete' && !selectedAthleteId && approvedMembers.length > 0) {
                          setSelectedAthleteId(approvedMembers[0].user_id);
                        }
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
                        const prof = (Array.isArray(m.profile) ? m.profile[0] : m.profile) as any;
                        const nameDisplay =
                          prof?.full_name?.trim() ||
                          `${prof?.first_name || ''} ${prof?.last_name || ''}`.trim() ||
                          prof?.first_name?.trim() ||
                          prof?.last_name?.trim() ||
                          'Athlète';
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
                style={[
                  styles.saveBtn,
                  { backgroundColor: conflictInfo ? theme.colors.border : color },
                  conflictInfo && { opacity: 0.55 },
                ]}
                onPress={handleSave}
                disabled={isSubmitting || isDeleting || !!conflictInfo}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="check" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.saveBtnText}>
                      {periodToEdit ? 'Enregistrer les modifications' : 'Créer la phase'}
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
  conflictBanner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  conflictHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  conflictTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.3,
  },
  conflictMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  conflictQuickFixBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#F87171',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
    marginTop: 4,
  },
  conflictQuickFixText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
  },
});
