import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, LayoutAnimation } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
import { Feather } from '@expo/vector-icons';
import { useCheckInStore } from '../../../store/checkInStore';
import Slider from '@react-native-community/slider';
import { useConsentStore } from '../../../store/consentStore';
import { ConsentCheck } from '../../legal/ConsentCheck';
import { CONSENT_TEXTS } from '../../../legal/consents';
import { PressableScale } from '../../../shared/components/PressableScale';
import { Button } from '../../../shared/components/Button';
import { BottomSheet } from '../../../shared/components/BottomSheet';
import { StepFooter } from './StepFooter';

interface PainStepProps {
  onBack: () => void;
  onSubmit: () => void;
}

const BODY_SECTIONS = [
  {
    id: 'jambes',
    name: 'Jambes',
    icon: 'activity',
    zones: [
      { id: 'quadriceps', name: 'Quadriceps', sides: true },
      { id: 'ischios', name: 'Ischio-jambiers', sides: true },
      { id: 'mollets', name: 'Mollets', sides: true },
      { id: 'adducteurs', name: 'Adducteurs', sides: true },
      { id: 'fessiers', name: 'Fessiers', sides: true },
      { id: 'hanches', name: 'Hanches', sides: true },
      { id: 'genoux', name: 'Genoux', sides: true },
      { id: 'chevilles', name: 'Chevilles', sides: true },
      { id: 'pieds', name: 'Pieds', sides: true }
    ]
  },
  {
    id: 'tronc',
    name: 'Tronc',
    icon: 'server',
    zones: [
      { id: 'lombaires', name: 'Lombaires', sides: true },
      { id: 'abdominaux', name: 'Abdominaux', sides: false },
      { id: 'obliques', name: 'Obliques', sides: true },
      { id: 'pectoraux', name: 'Pectoraux', sides: true },
      { id: 'haut_dos', name: 'Haut du dos', sides: false },
      { id: 'cotes', name: 'Côtes', sides: true }
    ]
  },
  {
    id: 'epaules_bras',
    name: 'Épaules & bras',
    icon: 'git-commit',
    zones: [
      { id: 'epaules', name: 'Épaules', sides: true },
      { id: 'biceps', name: 'Biceps', sides: true },
      { id: 'triceps', name: 'Triceps', sides: true },
      { id: 'avant_bras', name: 'Avant-bras', sides: true },
      { id: 'poignets', name: 'Poignets', sides: true },
      { id: 'mains', name: 'Mains', sides: true }
    ]
  },
  {
    id: 'cou_tete',
    name: 'Cou & tête',
    icon: 'smile',
    zones: [
      { id: 'cou', name: 'Cou', sides: false },
      { id: 'machoire', name: 'Mâchoire', sides: true },
      { id: 'tete', name: 'Tête', sides: false }
    ]
  }
];

const PAIN_TYPES = [
  'Courbature', 'Contracture', 'Élongation', 'Déchirure', 'Articulaire', 'Autre'
];

const SIDES = ['Gauche', 'Droit', 'Bilatéral'] as const;

export const PainStep = ({ onBack, onSubmit }: PainStepProps) => {
  const theme = useTheme();
  const { currentCheckIn, addPain, removePain, isLoading } = useCheckInStore();
  const currentPains = currentCheckIn?.pains || [];

  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  // Modal State
  const [selectedZone, setSelectedZone] = useState<{ id: string, name: string, sides: boolean } | null>(null);
  const [activeType, setActiveType] = useState<string>('Courbature');
  const [activeSide, setActiveSide] = useState<'Gauche' | 'Droit' | 'Bilatéral'>('Gauche');
  const [intensity, setIntensity] = useState<number>(3);
  const [comment, setComment] = useState<string>('');
  const painConsent = useConsentStore((s) => !!s.active?.has('health_data'));
  const grantConsent = useConsentStore((s) => s.grant);
  const [consentTicked, setConsentTicked] = useState(false);
  const [granting, setGranting] = useState(false);
  const [commentFocused, setCommentFocused] = useState(false);
  const finish = () => {
    onSubmit();
  };

  const handleZonePress = (zone: any) => {
    const existingPain = currentPains.find(p => p.muscle_id === zone.id);
    if (existingPain) {
      setActiveType(existingPain.type);
      setActiveSide((existingPain.side as any) || 'Gauche');
      setIntensity(existingPain.intensity || 3);
      setComment(existingPain.comment || '');
    } else {
      setActiveType('Courbature');
      setActiveSide('Gauche');
      setIntensity(3);
      setComment('');
    }
    setSelectedZone(zone);
  };

  const handleSaveZone = () => {
    if (!selectedZone) return;

    addPain({
      muscle_id: selectedZone.id,
      muscle_name: selectedZone.name,
      type: activeType,
      intensity,
      side: selectedZone.sides ? activeSide : undefined,
      comment: comment.trim() !== '' ? comment.trim() : undefined
    });

    setSelectedZone(null);
  };

  const getIntensityColor = (level: number) => {
    if (level <= 3) return theme.colors.warning;
    if (level <= 7) return '#F97316';
    return theme.colors.error;
  };

  const toggleSection = (id: string, isExpanded: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));
    setExpandedSection(isExpanded ? null : id);
  };

  const handleIntensityChange = (value: number) => {
    if (value !== intensity) {
      try {
        Haptics.selectionAsync();
      } catch {
        // haptics unavailable
      }
    }
    setIntensity(value);
  };

  const zoneHasPain = currentPains.some(p => p.muscle_id === selectedZone?.id);

  return (
    <View style={styles.container}>
      {!painConsent ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Corps & douleurs</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Signale les zones douloureuses avec précision (optionnel).
          </Text>
          <View style={[glassCard, styles.consentCard]}>
            <View style={styles.consentIcon}>
              <Feather name="lock" size={20} color={theme.colors.sprintyBlue} />
            </View>
            <Text style={[styles.consentTitle, { color: theme.colors.text }]}>Activer le suivi des douleurs</Text>
            <Text style={[styles.consentText, { color: theme.colors.textSecondary }]}>
              Les douleurs sont des données de santé : nous ne les enregistrons qu’avec ton accord. Tu peux passer cette étape.
            </Text>
            <ConsentCheck checked={consentTicked} onToggle={() => setConsentTicked((v) => !v)}>
              {CONSENT_TEXTS.health_data}
            </ConsentCheck>
            <Button
              title="Activer"
              style={styles.consentButton}
              disabled={!consentTicked || granting}
              loading={granting}
              onPress={async () => {
                setGranting(true);
                await grantConsent(['health_data']);
                setGranting(false);
              }}
            />
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Corps & douleurs</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Signale les zones douloureuses avec précision (optionnel).
          </Text>

          {currentPains.length > 0 && (
            <View style={styles.summaryContainer}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
                Zones signalées ({currentPains.length})
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryList}>
                {currentPains.map(pain => (
                  <View key={pain.muscle_id} style={[styles.painChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.hairline }]}>
                    <View style={[styles.intensityDot, { backgroundColor: getIntensityColor(pain.intensity) }]} />
                    <Text style={[styles.painChipText, { color: theme.colors.text }]}>{pain.muscle_name}</Text>
                    <PressableScale
                      haptic="selection"
                      onPress={() => removePain(pain.muscle_id)}
                      style={[styles.removePainBtn, { backgroundColor: theme.colors.glassFill }]}
                      hitSlop={12}
                      accessibilityRole="button"
                      accessibilityLabel={`Retirer ${pain.muscle_name}`}
                    >
                      <Feather name="x" size={12} color={theme.colors.textSecondary} />
                    </PressableScale>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {BODY_SECTIONS.map((section) => {
            const isExpanded = expandedSection === section.id;
            const painsInSection = currentPains.filter(p => section.zones.some(z => z.id === p.muscle_id));

            return (
              <View key={section.id} style={[glassCard, styles.sectionCard, isExpanded && { borderColor: 'rgba(0, 105, 232, 0.35)' }]}>
                <PressableScale
                  haptic="selection"
                  activeScale={0.98}
                  style={styles.sectionHeader}
                  onPress={() => toggleSection(section.id, isExpanded)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isExpanded }}
                >
                  <View style={styles.sectionHeaderLeft}>
                    <View style={[styles.iconBox, { backgroundColor: isExpanded ? theme.colors.sprintyBlue : 'rgba(0, 105, 232, 0.1)' }]}>
                      <Feather name={section.icon as any} size={17} color={isExpanded ? '#FFFFFF' : theme.colors.sprintyBlue} />
                    </View>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{section.name}</Text>
                    {painsInSection.length > 0 && (
                      <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
                        <Text style={styles.badgeText}>{painsInSection.length}</Text>
                      </View>
                    )}
                  </View>
                  <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textMuted} />
                </PressableScale>

                {isExpanded && (
                  <View style={[styles.zonesContainer, { borderTopColor: theme.colors.hairline }]}>
                    {section.zones.map((zone, index) => {
                      const pain = currentPains.find(p => p.muscle_id === zone.id);
                      const isLast = index === section.zones.length - 1;

                      return (
                        <PressableScale
                          key={zone.id}
                          haptic="selection"
                          activeScale={0.98}
                          style={[styles.zoneRow, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.hairline }]}
                          onPress={() => handleZonePress(zone)}
                          accessibilityRole="button"
                          accessibilityLabel={pain ? `${zone.name}, ${pain.intensity} sur 10, ${pain.type}` : `Signaler ${zone.name}`}
                        >
                          <Text style={[styles.zoneName, { color: theme.colors.text }]}>{zone.name}</Text>

                          {pain ? (
                            <View style={[styles.zoneStateBadge, { backgroundColor: theme.colors.glassFill }]}>
                              <View style={[styles.intensityDot, { backgroundColor: getIntensityColor(pain.intensity) }]} />
                              <Text style={[styles.zoneStateText, { color: theme.colors.textSecondary }]}>
                                {pain.intensity}/10 · {pain.type}
                              </Text>
                            </View>
                          ) : (
                            <Feather name="plus-circle" size={20} color={theme.colors.textMuted} />
                          )}
                        </PressableScale>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      <StepFooter title="Terminer le check-in" onPress={finish} onBack={onBack} loading={isLoading} />

      <BottomSheet visible={!!selectedZone} onClose={() => setSelectedZone(null)} title={selectedZone?.name}>
        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Intensity Slider */}
          <View style={styles.sliderSection}>
            <View style={styles.sliderHeader}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>Intensité</Text>
              <Text style={[styles.sliderValue, { color: getIntensityColor(intensity) }]}>{intensity}/10</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={10}
              step={1}
              value={intensity}
              onValueChange={handleIntensityChange}
              minimumTrackTintColor={getIntensityColor(intensity)}
              maximumTrackTintColor={theme.colors.border}
              thumbTintColor={getIntensityColor(intensity)}
            />
          </View>

          {/* Type Selection */}
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Type de gêne</Text>
          <View style={styles.typesGrid}>
            {PAIN_TYPES.map(type => {
              const isActive = activeType === type;
              return (
                <PressableScale
                  key={type}
                  haptic="selection"
                  style={[styles.typeChip, { backgroundColor: isActive ? theme.colors.sprintyBlue : theme.colors.glassFill }]}
                  onPress={() => setActiveType(type)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text style={[styles.chipText, { color: isActive ? '#FFFFFF' : theme.colors.text }, isActive && styles.chipTextActive]}>
                    {type}
                  </Text>
                </PressableScale>
              );
            })}
          </View>

          {/* Side Selection */}
          {selectedZone?.sides && (
            <View style={styles.sideSection}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Côté affecté</Text>
              <View style={[styles.sideGrid, { backgroundColor: theme.colors.glassFill }]}>
                {[
                  { id: 'Gauche', label: 'Gauche' },
                  { id: 'Bilatéral', label: 'Les deux' },
                  { id: 'Droit', label: 'Droit' }
                ].map(sideItem => {
                  const isActive = activeSide === sideItem.id;
                  return (
                    <PressableScale
                      key={sideItem.id}
                      haptic="selection"
                      containerStyle={styles.sideCell}
                      style={[styles.sideChip, isActive && { backgroundColor: theme.colors.sprintyBlue }]}
                      onPress={() => setActiveSide(sideItem.id as any)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isActive }}
                    >
                      <Text style={[styles.chipText, { color: isActive ? '#FFFFFF' : theme.colors.text }, isActive && styles.chipTextActive]}>
                        {sideItem.label}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
            </View>
          )}

          {/* Comment */}
          <Text style={[styles.sectionLabel, { color: commentFocused ? theme.colors.sprintyBlue : theme.colors.textSecondary }]}>
            {intensity > 5 ? 'Précision pour ton coach (recommandé)' : 'Détail ou ressenti (optionnel)'}
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                color: theme.colors.text,
                backgroundColor: commentFocused ? theme.colors.surface : theme.colors.glassFill,
                borderColor: commentFocused ? theme.colors.sprintyBlue : 'transparent',
              },
            ]}
            placeholder={intensity > 5 ? 'Dis-lui ce que tu ressens pour qu’il adapte ta séance…' : 'Ex. : tiraillement après les accélérations…'}
            placeholderTextColor={theme.colors.textMuted}
            selectionColor={theme.colors.sprintyBlue}
            value={comment}
            onChangeText={setComment}
            onFocus={() => setCommentFocused(true)}
            onBlur={() => setCommentFocused(false)}
            multiline
            textAlignVertical="top"
          />

          <View style={styles.modalActions}>
            {zoneHasPain && (
              <Button
                title="Supprimer"
                variant="ghost"
                textStyle={{ color: theme.colors.error }}
                style={styles.removeBtn}
                onPress={() => {
                  removePain(selectedZone!.id);
                  setSelectedZone(null);
                }}
              />
            )}
            <Button title="Enregistrer cette zone" onPress={handleSaveZone} style={styles.saveBtn} />
          </View>
        </ScrollView>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6, marginBottom: 4 },
  subtitle: { fontSize: 15, lineHeight: 21, marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 },

  consentCard: { padding: 18 },
  consentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  consentTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, marginBottom: 4 },
  consentText: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  consentButton: { marginTop: 14 },

  sectionCard: { padding: 0, marginBottom: 12, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, minHeight: 56 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  iconBox: { width: 34, height: 34, borderRadius: 10, borderCurve: 'continuous', justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  zonesContainer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16 },
  zoneRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 48, paddingVertical: 12 },
  zoneName: { fontSize: 15, fontWeight: '500' },
  zoneStateBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  intensityDot: { width: 8, height: 8, borderRadius: 4 },
  zoneStateText: { fontSize: 12, fontWeight: '600' },

  summaryContainer: { marginBottom: 16 },
  summaryList: { gap: 8 },
  painChip: { flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 6, paddingVertical: 6, borderRadius: 12, borderCurve: 'continuous', borderWidth: 1, gap: 8 },
  painChipText: { fontSize: 13, fontWeight: '600' },
  removePainBtn: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

  sheetScroll: { flexGrow: 0, marginTop: 16 },
  sliderSection: { marginBottom: 20 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sliderValue: { fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  slider: { width: '100%', height: 40 },

  typesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  typeChip: { paddingHorizontal: 14, minHeight: 40, justifyContent: 'center', borderRadius: 12, borderCurve: 'continuous' },
  chipText: { fontSize: 14, fontWeight: '600' },
  chipTextActive: { fontWeight: '800' },

  sideSection: { marginBottom: 20 },
  sideGrid: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 14, borderCurve: 'continuous' },
  sideCell: { flex: 1 },
  sideChip: { minHeight: 40, borderRadius: 10, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },

  textInput: {
    minHeight: 100,
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    marginBottom: 20,
  },

  modalActions: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  removeBtn: { paddingHorizontal: 20, backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  saveBtn: { flex: 1 },
});
