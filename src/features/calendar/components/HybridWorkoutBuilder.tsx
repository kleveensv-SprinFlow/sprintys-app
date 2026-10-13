import { workoutService } from '../../../services/workoutService';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useCoachStore } from '../../../store/coach/coachStore';
import { appAlert, confirmAsync, toast } from '../../../shared/feedback/appAlert';
import { IconButton } from '../../../shared/components/IconButton';
import { Input } from '../../../shared/components/Input';
import { ListRow } from '../../../shared/components/ListRow';
import { PressableScale } from '../../../shared/components/PressableScale';
import { BottomSheet } from '../../../shared/components/BottomSheet';

interface HybridWorkoutBuilderProps {
  date: Date;
  onClose: () => void;
  onSave: () => void;
  defaultTitle?: string;
}

type TargetType = 'team' | 'subgroup' | 'athlete';
type BlockMode = 'structured' | 'free';
type DistanceUnit = 'm' | 'sec' | 'min' | 'km';

interface CourseEffort {
  id: string;
  sets: string;
  reps: string;
  distance: string;
  unit: DistanceUnit;
  target: string;
  rest_rep: string;
  rest_set: string;
}

interface CourseBlock {
  id: string;
  name: string;
  mode: BlockMode;
  free_text: string;
  efforts: CourseEffort[];
}

export const HybridWorkoutBuilder: React.FC<HybridWorkoutBuilderProps> = ({ date, onClose, onSave, defaultTitle }) => {
  const { user } = useAuthStore();
  const { teams, subgroups, teamMembers } = useCoachStore();
  const insets = useSafeAreaInsets();
  const safeTop = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight || 24) + 8
    : (insets.top > 0 ? insets.top + 6 : 16);

  const [title, setTitle] = useState(defaultTitle || 'Séance Course');
  const [intensity, setIntensity] = useState<number>(3);
  
  const [targetType, setTargetType] = useState<TargetType>('team');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(teams.length > 0 ? teams[0].id : null);
  const [selectedSubgroupId, setSelectedSubgroupId] = useState<string | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);

  const [blocks, setBlocks] = useState<CourseBlock[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [targetError, setTargetError] = useState<string | null>(null);

  const getNextBlockName = () => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nextIndex = blocks.length % 26;
    return `Bloc ${alphabet[nextIndex]}`;
  };

  const handleAddBlock = () => {
    const newBlock: CourseBlock = {
      id: Math.random().toString(36).substring(2, 9),
      name: getNextBlockName(),
      mode: 'structured',
      free_text: '',
      efforts: [
        { id: Math.random().toString(36).substring(2, 9), sets: '1', reps: '1', distance: '', unit: 'm', target: '', rest_rep: '', rest_set: '' }
      ]
    };
    setBlocks([...blocks, newBlock]);
  };

  const removeBlock = (blockId: string) => {
    setBlocks(blocks.filter(b => b.id !== blockId));
  };

  const handleAddEffortToBlock = (blockId: string) => {
    setBlocks(blocks.map(b => {
      if (b.id === blockId) {
        const lastEffort = b.efforts[b.efforts.length - 1];
        const newEffort: CourseEffort = lastEffort 
          ? { ...lastEffort, id: Math.random().toString(36).substring(2, 9) }
          : { id: Math.random().toString(36).substring(2, 9), sets: '1', reps: '1', distance: '', unit: 'm', target: '', rest_rep: '', rest_set: '' };
        return { ...b, efforts: [...b.efforts, newEffort] };
      }
      return b;
    }));
  };

  const removeEffort = (blockId: string, effortId: string) => {
    setBlocks(blocks.map(b => {
      if (b.id === blockId) {
        return { ...b, efforts: b.efforts.filter(e => e.id !== effortId) };
      }
      return b;
    }));
  };

  const cycleDistanceUnit = (unit: DistanceUnit): DistanceUnit => {
    const units: DistanceUnit[] = ['m', 'sec', 'min', 'km'];
    const idx = units.indexOf(unit);
    return units[(idx + 1) % units.length];
  };

  const updateBlock = (blockId: string, field: keyof CourseBlock, value: any) => {
    setBlocks(blocks.map(b => b.id === blockId ? { ...b, [field]: value } : b));
  };

  const updateEffort = (blockId: string, effortId: string, field: keyof CourseEffort, value: any) => {
    setBlocks(blocks.map(b => {
      if (b.id === blockId) {
        return {
          ...b,
          efforts: b.efforts.map(e => e.id === effortId ? { ...e, [field]: value } : e)
        };
      }
      return b;
    }));
  };

  const hasValidTarget =
    (targetType === 'athlete' && !!selectedAthleteId) ||
    (targetType === 'team' && !!selectedTeamId) ||
    (targetType === 'subgroup' && !!selectedSubgroupId);

  const handleSave = async () => {
    if (!user?.id) return;
    let hasError = false;
    if (!title.trim()) {
      setTitleError('Donne un titre à ta séance.');
      hasError = true;
    }
    if (!hasValidTarget) {
      setTargetError('Choisis à qui envoyer la séance.');
      hasError = true;
    }
    if (hasError) return;

    setIsSaving(true);
    try {
      const baseWorkoutData = {
        coach_id: user.id,
        date_prevue: date.toISOString(),
        type_seance: title.trim(),
        intensity,
        blocks, // JSONB mapping for the running blocks
        status: 'planned'
      };

      if (targetType === 'athlete' && selectedAthleteId) {
        await workoutService.createPlannedWorkout({
          ...baseWorkoutData,
          athlete_id: selectedAthleteId,
        });
      } else if (targetType === 'team' && selectedTeamId) {
        await workoutService.assignWorkoutToGroup(baseWorkoutData, 'team', selectedTeamId);
      } else if (targetType === 'subgroup' && selectedSubgroupId) {
        await workoutService.assignWorkoutToGroup(baseWorkoutData, 'subgroup', selectedSubgroupId);
      } else {
        throw new Error('Cible invalide pour la séance');
      }
      toast('success', 'Séance enregistrée.');
      onSave();
    } catch (err: any) {
      appAlert('Erreur', 'Impossible d’enregistrer la séance : ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!user?.id) return;
    if (!title.trim()) {
      setTitleError('Donne un titre à ta séance avant de l’enregistrer comme modèle.');
      return;
    }
    const confirmed = await confirmAsync({
      title: 'Nouveau modèle',
      message: `Enregistrer « ${title.trim()} » dans ta bibliothèque ?`,
      confirmText: 'Enregistrer',
      icon: 'bookmark',
    });
    if (!confirmed) return;
    try {
      await workoutService.saveWorkoutTemplate({
        coach_id: user.id,
        name: title.trim(),
        description: null,
        type_seance: 'course',
        blocks,
      });
      toast('success', 'Modèle ajouté à ta bibliothèque.');
    } catch (err: any) {
      appAlert('Erreur', err.message);
    }
  };

  // Targeting variables
  const currentTeamSubgroups = subgroups.filter(sg => sg.team_id === selectedTeamId);
  const currentTeamAthletes = teamMembers.filter(tm => tm.team_id === selectedTeamId);
  let targetDisplay = 'Choisir…';
  if (targetType === 'team' && selectedTeamId) {
    targetDisplay = teams.find(t => t.id === selectedTeamId)?.name || targetDisplay;
  } else if (targetType === 'subgroup' && selectedSubgroupId) {
    targetDisplay = subgroups.find(sg => sg.id === selectedSubgroupId)?.name || targetDisplay;
  } else if (targetType === 'athlete' && selectedAthleteId) {
    targetDisplay = currentTeamAthletes.find(a => a.user_id === selectedAthleteId)?.profile?.full_name || targetDisplay;
  }
  const targetTypeLabel = targetType === 'team' ? 'Équipe entière' : targetType === 'subgroup' ? 'Sous-groupe' : 'Individuel';

  const pickTarget = (type: TargetType, id: string) => {
    if (type === 'team') setSelectedTeamId(id);
    if (type === 'subgroup') setSelectedSubgroupId(id);
    if (type === 'athlete') setSelectedAthleteId(id);
    setTargetType(type);
    setTargetError(null);
    setShowTargetModal(false);
  };

  const checkMark = <Feather name="check" size={18} color={theme.colors.sprintyBlue} />;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Sheet header (shared pattern with TechnicalWorkoutBuilder / CompetitionBuilder) */}
      <View style={[styles.header, { paddingTop: safeTop }]}>
        <IconButton icon="x" onPress={onClose} accessibilityLabel="Fermer" />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>Séance course</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </Text>
        </View>
        <PressableScale
          haptic="medium"
          onPress={handleSave}
          disabled={isSaving}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          accessibilityRole="button"
          accessibilityLabel="Enregistrer"
          style={[styles.headerSaveBtn, isSaving && styles.headerSaveBtnBusy]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={theme.colors.surface} />
          ) : (
            <Text style={styles.headerSaveBtnText}>Enregistrer</Text>
          )}
        </PressableScale>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Title + save as template */}
        <Text style={styles.sectionLabel}>Séance</Text>
        <View style={[glassCard, styles.section]}>
          <View style={styles.titleRow}>
            <Input
              label="Titre de la séance"
              value={title}
              onChangeText={(t) => {
                setTitle(t);
                if (titleError) setTitleError(null);
              }}
              placeholder="Ex. : VMA courte"
              error={titleError || undefined}
              containerStyle={styles.titleInputContainer}
            />
            <IconButton
              icon="bookmark"
              tone="blue"
              size={44}
              onPress={handleSaveAsTemplate}
              accessibilityLabel="Enregistrer comme modèle"
              style={styles.templateBtn}
            />
          </View>
        </View>

        {/* Target */}
        <Text style={styles.sectionLabel}>Destinataires</Text>
        <View style={[glassCard, styles.section, styles.targetCard]}>
          <ListRow
            icon="users"
            title={targetDisplay}
            subtitle={targetTypeLabel}
            onPress={() => setShowTargetModal(true)}
            last
          />
        </View>
        {targetError && <Text style={styles.sectionError}>{targetError}</Text>}

        {/* Blocks */}
        <Text style={styles.sectionLabel}>Programme</Text>

        {blocks.map((block) => (
          <View key={block.id} style={[glassCard, styles.blockCard]}>
            <View style={styles.blockHeader}>
              <TextInput
                style={styles.blockTitleInput}
                value={block.name}
                onChangeText={(t) => updateBlock(block.id, 'name', t)}
                placeholder="Nom du bloc"
                placeholderTextColor={theme.colors.textMuted}
                selectionColor={theme.colors.sprintyBlue}
              />

              <View style={styles.blockActions}>
                <PressableScale
                  haptic="selection"
                  hitSlop={{ top: 5, bottom: 5 }}
                  accessibilityRole="button"
                  accessibilityLabel={block.mode === 'structured' ? 'Passer en mode terrain' : 'Passer en mode piste'}
                  style={styles.modeToggleBtn}
                  onPress={() => updateBlock(block.id, 'mode', block.mode === 'structured' ? 'free' : 'structured')}
                >
                  <Feather name={block.mode === 'structured' ? 'list' : 'align-left'} size={15} color={theme.colors.sprintyBlue} />
                  <Text style={styles.modeToggleText}>{block.mode === 'structured' ? 'Piste' : 'Terrain'}</Text>
                </PressableScale>

                <IconButton
                  icon="trash-2"
                  tone="danger"
                  size={34}
                  onPress={() => removeBlock(block.id)}
                  accessibilityLabel={`Supprimer ${block.name || 'le bloc'}`}
                />
              </View>
            </View>

            {block.mode === 'free' ? (
              <View>
                <TextInput
                  style={styles.freeModeInput}
                  multiline
                  value={block.free_text}
                  onChangeText={(t) => updateBlock(block.id, 'free_text', t)}
                  placeholder="Ex. : 30 minutes de footing sur pelouse au feeling, puis gammes athlétiques…"
                  placeholderTextColor={theme.colors.textMuted}
                  selectionColor={theme.colors.sprintyBlue}
                  textAlignVertical="top"
                />
                <Text style={styles.freeModeHelper}>
                  Aucun champ de chrono ne sera proposé à tes athlètes sur ce bloc.
                </Text>
              </View>
            ) : (
              <View>
                {block.efforts.map((effort, eIdx) => (
                  <View key={effort.id} style={styles.effortCard}>
                    <View style={styles.effortHeader}>
                      <Text style={styles.effortTitle}>Groupe d’effort {eIdx + 1}</Text>
                      <IconButton
                        icon="x"
                        tone="plain"
                        size={32}
                        onPress={() => removeEffort(block.id, effort.id)}
                        accessibilityLabel={`Supprimer le groupe d’effort ${eIdx + 1}`}
                      />
                    </View>

                    {/* Sets x reps */}
                    <View style={styles.multiplierContainer}>
                      <View style={styles.multiplierBox}>
                        <Text style={styles.fieldCaption}>Séries</Text>
                        <TextInput
                          style={styles.multiplierInput}
                          value={effort.sets}
                          onChangeText={t => updateEffort(block.id, effort.id, 'sets', t)}
                          keyboardType="numeric"
                          selectionColor={theme.colors.sprintyBlue}
                        />
                      </View>
                      <Text style={styles.multiplierX}>×</Text>
                      <View style={styles.multiplierBox}>
                        <Text style={styles.fieldCaption}>Répétitions</Text>
                        <TextInput
                          style={styles.multiplierInput}
                          value={effort.reps}
                          onChangeText={t => updateEffort(block.id, effort.id, 'reps', t)}
                          keyboardType="numeric"
                          selectionColor={theme.colors.sprintyBlue}
                        />
                      </View>
                    </View>

                    {/* Distance & target */}
                    <View style={styles.twoColRow}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputGroupLabel}>Distance / temps</Text>
                        <View style={styles.smartInputContainer}>
                          <TextInput
                            style={styles.smartInput}
                            value={effort.distance}
                            onChangeText={t => updateEffort(block.id, effort.id, 'distance', t)}
                            placeholder="Ex. : 60"
                            placeholderTextColor={theme.colors.textMuted}
                            selectionColor={theme.colors.sprintyBlue}
                            keyboardType="numeric"
                          />
                          <PressableScale
                            haptic="selection"
                            accessibilityRole="button"
                            accessibilityLabel={`Unité : ${effort.unit}. Touche pour changer`}
                            style={styles.smartUnitBtn}
                            onPress={() => updateEffort(block.id, effort.id, 'unit', cycleDistanceUnit(effort.unit))}
                          >
                            <Text style={styles.smartUnitText}>{effort.unit}</Text>
                          </PressableScale>
                        </View>
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputGroupLabel}>Cible / intensité</Text>
                        <TextInput
                          style={styles.standardInput}
                          value={effort.target}
                          onChangeText={t => updateEffort(block.id, effort.id, 'target', t)}
                          placeholder="Ex. : 95 % ou 7.2 s"
                          placeholderTextColor={theme.colors.textMuted}
                          selectionColor={theme.colors.sprintyBlue}
                        />
                      </View>
                    </View>

                    {/* Rest */}
                    <View style={[styles.twoColRow, { marginBottom: 0 }]}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputGroupLabel}>Repos entre reps</Text>
                        <TextInput
                          style={styles.standardInput}
                          value={effort.rest_rep}
                          onChangeText={t => updateEffort(block.id, effort.id, 'rest_rep', t)}
                          placeholder="Ex. : 2:00"
                          placeholderTextColor={theme.colors.textMuted}
                          selectionColor={theme.colors.sprintyBlue}
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputGroupLabel}>Repos entre séries</Text>
                        <TextInput
                          style={styles.standardInput}
                          value={effort.rest_set}
                          onChangeText={t => updateEffort(block.id, effort.id, 'rest_set', t)}
                          placeholder="Ex. : 5:00"
                          placeholderTextColor={theme.colors.textMuted}
                          selectionColor={theme.colors.sprintyBlue}
                        />
                      </View>
                    </View>
                  </View>
                ))}

                <PressableScale
                  accessibilityRole="button"
                  style={styles.addEffortBtn}
                  onPress={() => handleAddEffortToBlock(block.id)}
                >
                  <Feather name="plus" size={16} color={theme.colors.sprintyBlue} />
                  <Text style={styles.addEffortText}>Ajouter un effort</Text>
                </PressableScale>
              </View>
            )}
          </View>
        ))}

        <PressableScale accessibilityRole="button" style={styles.addBlockBtn} onPress={handleAddBlock}>
          <View style={styles.addBlockIcon}>
            <Feather name="plus" size={18} color={theme.colors.sprintyBlue} />
          </View>
          <Text style={styles.addBlockText}>Ajouter un bloc</Text>
        </PressableScale>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Target picker */}
      <BottomSheet visible={showTargetModal} onClose={() => setShowTargetModal(false)} title="Cibler la séance">
        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.sheetSectionLabel}>Équipe entière</Text>
          {teams.map((t, i) => (
            <ListRow
              key={t.id}
              icon="users"
              title={t.name}
              value={targetType === 'team' && selectedTeamId === t.id ? checkMark : undefined}
              chevron={false}
              onPress={() => pickTarget('team', t.id)}
              last={i === teams.length - 1}
            />
          ))}

          {currentTeamSubgroups.length > 0 && <Text style={styles.sheetSectionLabel}>Sous-groupes</Text>}
          {currentTeamSubgroups.map((sg, i) => (
            <ListRow
              key={sg.id}
              icon="layers"
              title={sg.name}
              value={targetType === 'subgroup' && selectedSubgroupId === sg.id ? checkMark : undefined}
              chevron={false}
              onPress={() => pickTarget('subgroup', sg.id)}
              last={i === currentTeamSubgroups.length - 1}
            />
          ))}

          {currentTeamAthletes.length > 0 && <Text style={styles.sheetSectionLabel}>Individuel</Text>}
          {currentTeamAthletes.map((a, i) => (
            <ListRow
              key={a.user_id}
              icon="user"
              title={a.profile?.full_name || 'Athlète'}
              value={targetType === 'athlete' && selectedAthleteId === a.user_id ? checkMark : undefined}
              chevron={false}
              onPress={() => pickTarget('athlete', a.user_id)}
              last={i === currentTeamAthletes.length - 1}
            />
          ))}
        </ScrollView>
      </BottomSheet>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backdrop },

  // Sheet header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.hairline,
    backgroundColor: theme.colors.backdrop,
  },
  headerCenter: { flex: 1, alignItems: 'center', marginHorizontal: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, color: theme.colors.text },
  headerSubtitle: { fontSize: 13, marginTop: 1, fontWeight: '500', color: theme.colors.textSecondary, textTransform: 'capitalize' },
  headerSaveBtn: {
    height: 38, minWidth: 108, paddingHorizontal: 16, borderRadius: 19, borderCurve: 'continuous',
    alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.sprintyBlue,
  },
  headerSaveBtnBusy: { opacity: 0.7 },
  headerSaveBtnText: { color: theme.colors.surface, fontSize: 15, fontWeight: '700' },

  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary,
    marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.6,
  },
  sectionError: { fontSize: 12, fontWeight: '500', color: theme.colors.error, marginTop: -18, marginBottom: 24, marginLeft: 4 },
  fieldCaption: {
    fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary,
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6,
  },

  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  titleInputContainer: { flex: 1, width: undefined, marginBottom: 0 },
  // Aligns with the 52 px input under its label
  templateBtn: { marginTop: 27 },
  targetCard: { paddingVertical: 4 },

  // Blocks
  blockCard: { marginBottom: 16 },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 8 },
  blockTitleInput: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, color: theme.colors.text, flex: 1, paddingVertical: 8 },
  blockActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modeToggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 34,
    backgroundColor: 'rgba(0, 105, 232, 0.1)', paddingHorizontal: 12, borderRadius: 12, borderCurve: 'continuous',
  },
  modeToggleText: { color: theme.colors.sprintyBlue, fontSize: 13, fontWeight: '700' },

  addBlockBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    minHeight: 60, padding: 14, borderRadius: 22, borderCurve: 'continuous',
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(0, 105, 232, 0.3)',
    backgroundColor: 'rgba(0, 105, 232, 0.05)',
  },
  addBlockIcon: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0, 105, 232, 0.12)',
  },
  addBlockText: { color: theme.colors.sprintyBlue, fontWeight: '700', fontSize: 15 },

  // Free mode
  freeModeInput: {
    backgroundColor: theme.colors.glassFill, color: theme.colors.text,
    padding: 14, borderRadius: 14, borderCurve: 'continuous', minHeight: 120, fontSize: 15, lineHeight: 22,
  },
  freeModeHelper: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 8, paddingHorizontal: 4 },

  // Structured mode (efforts)
  effortCard: {
    backgroundColor: theme.colors.glassFill,
    borderRadius: 16, borderCurve: 'continuous', padding: 14, marginBottom: 12,
  },
  effortHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  effortTitle: { fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },

  multiplierContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, gap: 12 },
  multiplierBox: { alignItems: 'center', flex: 1 },
  multiplierInput: {
    backgroundColor: theme.colors.surface, color: theme.colors.text,
    fontSize: 24, fontWeight: '800', textAlign: 'center',
    width: '100%', height: 56, borderRadius: 14, borderCurve: 'continuous',
  },
  multiplierX: { fontSize: 22, fontWeight: '800', color: theme.colors.textMuted, marginTop: 20 },

  twoColRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  inputGroup: { flex: 1 },
  inputGroupLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6, paddingLeft: 2 },
  standardInput: {
    backgroundColor: theme.colors.surface, color: theme.colors.text,
    height: 44, paddingHorizontal: 12, borderRadius: 12, borderCurve: 'continuous', fontSize: 15, fontWeight: '500',
  },

  smartInputContainer: { flexDirection: 'row', height: 44 },
  smartInput: {
    flex: 1, minWidth: 0, backgroundColor: theme.colors.surface, color: theme.colors.text,
    paddingHorizontal: 12, borderTopLeftRadius: 12, borderBottomLeftRadius: 12, fontSize: 15, fontWeight: '500',
  },
  smartUnitBtn: {
    height: 44, minWidth: 48, backgroundColor: 'rgba(0, 105, 232, 0.12)', paddingHorizontal: 10,
    borderTopRightRadius: 12, borderBottomRightRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  smartUnitText: { color: theme.colors.sprintyBlue, fontSize: 13, fontWeight: '700' },

  addEffortBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    alignSelf: 'center', minHeight: 44, paddingHorizontal: 20,
  },
  addEffortText: { color: theme.colors.sprintyBlue, fontSize: 15, fontWeight: '700' },

  // Target sheet
  sheetScroll: { maxHeight: 420, marginTop: 4 },
  sheetSectionLabel: {
    fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary,
    marginTop: 16, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.6,
  },
});
