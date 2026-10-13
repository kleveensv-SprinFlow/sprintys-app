import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
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
import { FeedbackHost } from '../../../shared/feedback/FeedbackHost';
import { appAlert, confirmAsync, toast } from '../../../shared/feedback/appAlert';
import { IconButton } from '../../../shared/components/IconButton';
import { PressableScale } from '../../../shared/components/PressableScale';
import { Input } from '../../../shared/components/Input';

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
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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
      setNameError(null);
      setFormError(null);
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

  // Une erreur de formulaire disparaît dès que l'utilisateur modifie les champs concernés
  useEffect(() => {
    setFormError(null);
  }, [startDateStr, endDateStr, targetType, selectedSubgroupId, selectedAthleteId]);

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError('Donne un nom à la phase.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (!startDateStr || !endDateStr) {
      setFormError('Vérifie les dates de début et de fin.');
      return;
    }

    if (startDateStr > endDateStr) {
      setFormError('La date de fin doit être postérieure à la date de début.');
      return;
    }

    if (conflictInfo) {
      setFormError(
        `Cette phase chevauche « ${conflictInfo.conflictingPeriod.name} » ${conflictInfo.formattedOverlap}. Ajuste les dates pour que les phases ne se croisent pas.`
      );
      return;
    }

    if (targetType === 'subgroup' && !selectedSubgroupId) {
      setFormError('Choisis un sous-groupe.');
      return;
    }

    if (targetType === 'athlete' && !selectedAthleteId) {
      setFormError('Choisis un athlète.');
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

      toast('success', periodToEdit ? 'Phase mise à jour' : 'Phase créée');
      onSuccess();
      onClose();
    } catch (err) {
      appAlert('Erreur', 'Impossible d’enregistrer la phase. Réessaie dans un instant.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!periodToEdit) return;

    const confirmed = await confirmAsync({
      title: 'Supprimer la phase ?',
      message: `La phase « ${periodToEdit.name} » sera supprimée du calendrier.`,
      confirmText: 'Supprimer',
      destructive: true,
      icon: 'trash-2',
    });
    if (!confirmed) return;

    setIsDeleting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    try {
      await periodService.deletePeriod(periodToEdit.id);
      toast('success', 'Phase supprimée');
      onSuccess();
      onClose();
    } catch (err) {
      appAlert('Erreur', 'Impossible de supprimer cette phase. Réessaie dans un instant.');
    } finally {
      setIsDeleting(false);
    }
  };

  const approvedMembers = useMemo(
    () => teamMembers.filter((m) => m.status === 'approved'),
    [teamMembers]
  );

  const busy = isSubmitting || isDeleting;
  const saveDisabled = busy || !!conflictInfo;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <FeedbackHost />
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />
        <View style={styles.modalContent}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderText}>
              <Text style={styles.modalTitle}>
                {periodToEdit ? 'Modifier la phase' : 'Nouvelle phase d’entraînement'}
              </Text>
              <Text style={styles.modalSubtitle}>
                Cycle d’entraînement (ex. Vitesse, Affûtage, Aérobie)
              </Text>
            </View>

            <IconButton icon="x" onPress={onClose} accessibilityLabel="Fermer" />
          </View>

          <ScrollView
            style={styles.scrollBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Field: Period Name */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Nom de la phase</Text>
              <Input
                placeholder="Ex. Vitesse, Affûtage, Force, Aérobie…"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (nameError) setNameError(null);
                }}
                maxLength={35}
                error={nameError ?? undefined}
                containerStyle={styles.inputContainer}
                returnKeyType="done"
              />
            </View>

            {/* Field: 8 Signature Color Swatches */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Couleur</Text>
              <View style={styles.colorsRow}>
                {PERIOD_COLORS.map((col, i) => {
                  const isColorActive = color.toLowerCase() === col.hex.toLowerCase();
                  return (
                    <PressableScale
                      key={i}
                      haptic="selection"
                      activeScale={0.9}
                      hitSlop={4}
                      style={[styles.colorSwatchRing, isColorActive && { borderColor: col.hex }]}
                      onPress={() => setColor(col.hex)}
                      accessibilityRole="radio"
                      accessibilityLabel={col.name}
                      accessibilityState={{ selected: isColorActive }}
                    >
                      <View style={[styles.colorSwatch, { backgroundColor: col.hex }]}>
                        {isColorActive && <Feather name="check" size={16} color="#FFFFFF" />}
                      </View>
                    </PressableScale>
                  );
                })}
              </View>
            </View>

            {/* Field: Dates & Quick Duration Presets */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Dates</Text>

              {/* Message d'avertissement et aide au repositionnement si chevauchement */}
              {conflictInfo && (
                <View style={styles.conflictBanner}>
                  <View style={styles.conflictHeaderRow}>
                    <Feather name="alert-circle" size={16} color={theme.colors.error} />
                    <Text style={styles.conflictTitle}>Période déjà occupée</Text>
                  </View>
                  <Text style={styles.conflictMessage}>
                    Cette période chevauche la phase{' '}
                    <Text style={styles.conflictName}>« {conflictInfo.conflictingPeriod.name} »</Text>{' '}
                    ({conflictInfo.formattedOverlap}).
                  </Text>

                  {/* Bouton d'action en 1 clic pour résoudre le conflit */}
                  <PressableScale
                    haptic="medium"
                    containerStyle={styles.conflictQuickFixContainer}
                    style={styles.conflictQuickFixBtn}
                    onPress={() => {
                      const nextAvailableStart = addDays(new Date(conflictInfo.conflictingPeriod.end_date), 1);
                      const durationInDays = Math.max(1, Math.round((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)));
                      const nextAvailableEnd = addDays(nextAvailableStart, durationInDays);
                      setStartDateStr(formatDateToIso(nextAvailableStart));
                      setEndDateStr(formatDateToIso(nextAvailableEnd));
                    }}
                    accessibilityRole="button"
                  >
                    <Feather name="fast-forward" size={14} color={theme.colors.error} />
                    <Text style={styles.conflictQuickFixText} numberOfLines={1}>
                      Placer juste après « {conflictInfo.conflictingPeriod.name} »
                    </Text>
                  </PressableScale>
                </View>
              )}

              <View style={styles.datesCard}>
                <View style={styles.dateInputsRow}>
                  <View style={styles.dateInputCol}>
                    <Text style={styles.dateSubLabel}>Début</Text>
                    {Platform.OS === 'android' ? (
                      <>
                        <PressableScale
                          haptic="selection"
                          style={styles.dateInput}
                          onPress={() => setShowStartPicker(true)}
                          accessibilityRole="button"
                          accessibilityLabel={`Date de début, ${startDateObj.toLocaleDateString('fr-FR')}`}
                        >
                          <Feather name="calendar" size={14} color={theme.colors.textSecondary} />
                          <Text style={styles.dateInputText}>{startDateObj.toLocaleDateString('fr-FR')}</Text>
                        </PressableScale>
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
                        locale="fr-FR"
                        accentColor={theme.colors.sprintyBlue}
                        onChange={(event, date) => {
                          if (date) {
                            setStartDateStr(formatDateToIso(date));
                            if (date > endDateObj) setEndDateStr(formatDateToIso(date));
                          }
                        }}
                        style={styles.iosPicker}
                      />
                    )}
                  </View>

                  <Feather name="arrow-right" size={18} color={theme.colors.textMuted} style={styles.dateArrow} />

                  <View style={styles.dateInputCol}>
                    <Text style={styles.dateSubLabel}>Fin</Text>
                    {Platform.OS === 'android' ? (
                      <>
                        <PressableScale
                          haptic="selection"
                          style={styles.dateInput}
                          onPress={() => setShowEndPicker(true)}
                          accessibilityRole="button"
                          accessibilityLabel={`Date de fin, ${endDateObj.toLocaleDateString('fr-FR')}`}
                        >
                          <Feather name="calendar" size={14} color={theme.colors.textSecondary} />
                          <Text style={styles.dateInputText}>{endDateObj.toLocaleDateString('fr-FR')}</Text>
                        </PressableScale>
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
                        locale="fr-FR"
                        accentColor={theme.colors.sprintyBlue}
                        minimumDate={startDateObj}
                        onChange={(event, date) => {
                          if (date) {
                            setEndDateStr(formatDateToIso(date));
                          }
                        }}
                        style={styles.iosPicker}
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
                      !!startDateStr &&
                      !!endDateStr &&
                      formatDateToIso(targetEnd) === endDateStr;

                    return (
                      <PressableScale
                        key={preset.label}
                        haptic="selection"
                        containerStyle={styles.presetBtnContainer}
                        style={[styles.presetBtn, isCurrentPreset && styles.presetBtnActive]}
                        onPress={() => setEndDateStr(formatDateToIso(targetEnd))}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isCurrentPreset }}
                      >
                        <Text style={[styles.presetBtnText, isCurrentPreset && styles.presetBtnTextActive]}>
                          {preset.label}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Field: Target (Groupe, Sous-groupe, Athlète) */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Pour qui ?</Text>

              <View style={styles.targetTypeRow}>
                {[
                  { id: 'team', label: 'Tout le groupe', icon: 'users' },
                  { id: 'subgroup', label: 'Sous-groupe', icon: 'layers' },
                  { id: 'athlete', label: 'Athlète', icon: 'user' },
                ].map((t) => {
                  const isSelected = targetType === t.id;
                  return (
                    <PressableScale
                      key={t.id}
                      haptic="selection"
                      containerStyle={styles.targetTypeBtnContainer}
                      style={[styles.targetTypeBtn, isSelected && styles.targetTypeBtnActive]}
                      onPress={() => {
                        setTargetType(t.id as any);
                        if (t.id === 'subgroup' && !selectedSubgroupId && subgroups.length > 0) {
                          setSelectedSubgroupId(subgroups[0].id);
                        }
                        if (t.id === 'athlete' && !selectedAthleteId && approvedMembers.length > 0) {
                          setSelectedAthleteId(approvedMembers[0].user_id);
                        }
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Feather
                        name={t.icon as any}
                        size={14}
                        color={isSelected ? '#FFFFFF' : theme.colors.textSecondary}
                      />
                      <Text
                        style={[styles.targetTypeBtnText, isSelected && styles.targetTypeBtnTextActive]}
                        numberOfLines={1}
                      >
                        {t.label}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>

              {/* Subgroup selector if chosen */}
              {targetType === 'subgroup' && (
                <View style={styles.subSelectorContainer}>
                  {subgroups.length === 0 ? (
                    <Text style={styles.emptyHintText}>
                      Aucun sous-groupe configuré dans ton équipe.
                    </Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                      {subgroups.map((sg) => {
                        const isSubSelected = selectedSubgroupId === sg.id;
                        return (
                          <PressableScale
                            key={sg.id}
                            haptic="selection"
                            style={[styles.chip, isSubSelected && styles.chipActive]}
                            onPress={() => setSelectedSubgroupId(sg.id)}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: isSubSelected }}
                          >
                            <Text style={[styles.chipText, isSubSelected && styles.chipTextActive]}>
                              {sg.name}
                            </Text>
                          </PressableScale>
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
                    <Text style={styles.emptyHintText}>
                      Aucun athlète dans ton équipe.
                    </Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
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
                          <PressableScale
                            key={m.user_id}
                            haptic="selection"
                            style={[styles.chip, isAthSelected && styles.chipActive]}
                            onPress={() => setSelectedAthleteId(m.user_id)}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: isAthSelected }}
                          >
                            <Text style={[styles.chipText, isAthSelected && styles.chipTextActive]}>
                              {nameDisplay}
                            </Text>
                          </PressableScale>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              )}
            </View>

            {!!formError && (
              <View style={styles.errorNotice}>
                <Feather name="alert-circle" size={15} color={theme.colors.error} />
                <Text style={styles.errorNoticeText}>{formError}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <PressableScale
                haptic="none"
                style={[
                  styles.saveBtn,
                  { backgroundColor: conflictInfo ? theme.colors.textMuted : color },
                  saveDisabled && styles.btnDisabled,
                ]}
                onPress={handleSave}
                disabled={saveDisabled}
                accessibilityRole="button"
                accessibilityState={{ disabled: saveDisabled, busy: isSubmitting }}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="check" size={18} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>
                      {periodToEdit ? 'Enregistrer les modifications' : 'Créer la phase'}
                    </Text>
                  </>
                )}
              </PressableScale>

              {periodToEdit && (
                <PressableScale
                  style={[styles.deleteBtn, busy && styles.btnDisabled]}
                  onPress={handleDelete}
                  disabled={busy}
                  accessibilityRole="button"
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color={theme.colors.error} />
                  ) : (
                    <>
                      <Feather name="trash-2" size={16} color={theme.colors.error} />
                      <Text style={styles.deleteBtnText}>Supprimer cette phase</Text>
                    </>
                  )}
                </PressableScale>
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
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '90%',
    backgroundColor: theme.colors.backdrop,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
  },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.15)',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: theme.colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
    color: theme.colors.textSecondary,
  },
  scrollBody: {
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  inputContainer: {
    marginBottom: 0,
  },
  colorsRow: {
    ...glassCard,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  colorSwatchRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datesCard: {
    ...glassCard,
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
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  dateInput: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.glassFill,
    paddingHorizontal: 10,
  },
  dateInputText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  iosPicker: {
    alignSelf: 'flex-start',
    marginLeft: -8,
  },
  dateArrow: {
    marginTop: 22,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
  },
  presetBtnContainer: {
    flex: 1,
  },
  presetBtn: {
    minHeight: 36,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.glassFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetBtnActive: {
    backgroundColor: 'rgba(0, 105, 232, 0.12)',
  },
  presetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  presetBtnTextActive: {
    color: theme.colors.sprintyBlue,
  },
  targetTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  targetTypeBtnContainer: {
    flex: 1,
  },
  targetTypeBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.glassFill,
    gap: 6,
  },
  targetTypeBtnActive: {
    backgroundColor: theme.colors.sprintyBlue,
  },
  targetTypeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    flexShrink: 1,
  },
  targetTypeBtnTextActive: {
    color: '#FFFFFF',
  },
  subSelectorContainer: {
    marginTop: 10,
  },
  chipsRow: {
    gap: 8,
    paddingHorizontal: 2,
  },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.glassFill,
  },
  chipActive: {
    backgroundColor: 'rgba(0, 105, 232, 0.12)',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  chipTextActive: {
    color: theme.colors.sprintyBlue,
  },
  emptyHintText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    marginBottom: 4,
  },
  errorNoticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: theme.colors.error,
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
    gap: 6,
    height: 52,
    borderRadius: 16,
    borderCurve: 'continuous',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.error,
  },
  conflictBanner: {
    borderRadius: 14,
    borderCurve: 'continuous',
    padding: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  conflictHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  conflictTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.error,
  },
  conflictMessage: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.text,
    marginBottom: 8,
  },
  conflictName: {
    fontWeight: '700',
    color: theme.colors.error,
  },
  conflictQuickFixContainer: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  conflictQuickFixBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingHorizontal: 12,
    gap: 6,
    marginTop: 4,
  },
  conflictQuickFixText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.error,
    flexShrink: 1,
  },
});
