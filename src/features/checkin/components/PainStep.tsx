import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useTheme } from '../../../core/theme';
import { Feather } from '@expo/vector-icons';
import { useCheckInStore } from '../../../store/checkInStore';

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

const PAIN_STATES = [
  { label: 'Aucun problème', intensity: 0, color: '#10B981' },
  { label: 'Légère gêne', intensity: 3, color: '#FBBF24' },
  { label: 'Gêne modérée', intensity: 5, color: '#F59E0B' },
  { label: 'Douleur', intensity: 7, color: '#F97316' },
  { label: 'Douleur importante', intensity: 9, color: '#EF4444' }
];

const SIDES = ['Gauche', 'Droit', 'Les deux'] as const;

export const PainStep = ({ onBack, onSubmit }: PainStepProps) => {
  const theme = useTheme();
  const { currentCheckIn, addPain, removePain } = useCheckInStore();
  const currentPains = currentCheckIn?.pains || [];

  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  // Modal State
  const [selectedZone, setSelectedZone] = useState<{ id: string, name: string, sides: boolean } | null>(null);
  const [activeState, setActiveState] = useState<string>('Aucun problème');
  const [activeSide, setActiveSide] = useState<'Gauche' | 'Droit' | 'Les deux' | null>(null);

  const handleZonePress = (zone: any) => {
    const existingPain = currentPains.find(p => p.muscle_id === zone.id);
    if (existingPain) {
      setActiveState(existingPain.type);
      setActiveSide(existingPain.side || null);
    } else {
      setActiveState('Aucun problème');
      setActiveSide(null);
    }
    setSelectedZone(zone);
  };

  const handleSaveZone = () => {
    if (!selectedZone) return;

    if (activeState === 'Aucun problème') {
      removePain(selectedZone.id);
    } else {
      const stateObj = PAIN_STATES.find(s => s.label === activeState);
      const intensity = stateObj ? stateObj.intensity : 0;
      
      addPain({
        muscle_id: selectedZone.id,
        muscle_name: selectedZone.name,
        type: activeState,
        intensity,
        side: (selectedZone.sides && activeState !== 'Aucun problème') ? (activeSide || undefined) : undefined
      });
    }

    setSelectedZone(null);
  };

  const getIntensityColor = (level: number) => {
    if (level <= 3) return theme.colors.warning;
    if (level <= 7) return '#F97316';
    return theme.colors.error;
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Corps & Douleurs</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Signalez rapidement toute gêne musculaire ou articulaire.
      </Text>

      <ScrollView style={styles.sectionsList} showsVerticalScrollIndicator={false}>
        {BODY_SECTIONS.map((section) => {
          const isExpanded = expandedSection === section.id;
          const painsInSection = currentPains.filter(p => section.zones.some(z => z.id === p.muscle_id));

          return (
            <View key={section.id} style={styles.sectionContainer}>
              <TouchableOpacity 
                style={[
                  styles.sectionHeader, 
                  { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border },
                  isExpanded && { borderColor: theme.colors.accent, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }
                ]}
                activeOpacity={0.7}
                onPress={() => setExpandedSection(isExpanded ? null : section.id)}
              >
                <View style={styles.sectionHeaderLeft}>
                  <View style={[styles.iconBox, { backgroundColor: theme.colors.background }]}>
                    <Feather name={section.icon as any} size={20} color={theme.colors.text} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{section.name}</Text>
                  {painsInSection.length > 0 && (
                    <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
                      <Text style={styles.badgeText}>{painsInSection.length}</Text>
                    </View>
                  )}
                </View>
                <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>

              {isExpanded && (
                <View style={[styles.zonesContainer, { borderColor: theme.colors.border, borderTopWidth: 0 }]}>
                  {section.zones.map((zone, index) => {
                    const pain = currentPains.find(p => p.muscle_id === zone.id);
                    const isLast = index === section.zones.length - 1;

                    return (
                      <TouchableOpacity 
                        key={zone.id} 
                        style={[styles.zoneRow, !isLast && { borderBottomWidth: 1, borderBottomColor: theme.colors.background }]}
                        onPress={() => handleZonePress(zone)}
                      >
                        <Text style={[styles.zoneName, { color: theme.colors.text }]}>{zone.name}</Text>
                        
                        {pain ? (
                          <View style={styles.zoneStateBadge}>
                            <View style={[styles.intensityDot, { backgroundColor: getIntensityColor(pain.intensity) }]} />
                            <Text style={[styles.zoneStateText, { color: theme.colors.textSecondary }]}>
                              {pain.type} {pain.side ? `(${pain.side})` : ''}
                            </Text>
                          </View>
                        ) : (
                          <Feather name="plus-circle" size={20} color={theme.colors.textMuted} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Selected zones summary chips */}
      {currentPains.length > 0 && (
        <View style={styles.summaryContainer}>
          <Text style={[styles.summaryTitle, { color: theme.colors.textSecondary }]}>Zones signalées ({currentPains.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryList}>
            {currentPains.map(pain => (
              <View key={pain.muscle_id} style={[styles.painChip, { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border }]}>
                <View style={[styles.intensityDot, { backgroundColor: getIntensityColor(pain.intensity) }]} />
                <Text style={[styles.painChipText, { color: theme.colors.text }]}>{pain.muscle_name}</Text>
                <TouchableOpacity onPress={() => removePain(pain.muscle_id)} style={styles.removePainBtn}>
                  <Feather name="x" size={14} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Feather name="arrow-left" size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.submitBtn, { backgroundColor: theme.colors.success }]} 
          onPress={onSubmit}
        >
          <Text style={styles.submitBtnText}>Terminer le Check-In</Text>
        </TouchableOpacity>
      </View>

      {/* Zone Details Modal */}
      <Modal visible={!!selectedZone} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{selectedZone?.name}</Text>
              <TouchableOpacity onPress={() => setSelectedZone(null)}>
                <Feather name="x" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>État de la zone</Text>
            <View style={styles.statesList}>
              {PAIN_STATES.map(state => {
                const isActive = activeState === state.label;
                return (
                  <TouchableOpacity 
                    key={state.label}
                    style={[
                      styles.stateRow, 
                      { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border },
                      isActive && { borderColor: state.color, backgroundColor: state.color + '15' }
                    ]}
                    onPress={() => setActiveState(state.label)}
                  >
                    <View style={[styles.stateIndicator, { backgroundColor: state.color }]} />
                    <Text style={[
                      styles.stateText, 
                      { color: theme.colors.textSecondary },
                      isActive && { color: theme.colors.text, fontWeight: 'bold' }
                    ]}>
                      {state.label}
                    </Text>
                    {isActive && <Feather name="check" size={18} color={state.color} style={{ marginLeft: 'auto' }} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Conditionally show Side selection if there is a problem AND it's a bilateral zone */}
            {(activeState !== 'Aucun problème' && selectedZone?.sides) && (
              <View style={styles.sideSection}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Côté affecté</Text>
                <View style={styles.sideGrid}>
                  {SIDES.map(side => (
                    <TouchableOpacity 
                      key={side}
                      style={[
                        styles.sideChip, 
                        { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border },
                        activeSide === side && { backgroundColor: theme.colors.accent + '20', borderColor: theme.colors.accent }
                      ]}
                      onPress={() => setActiveSide(side)}
                    >
                      <Text style={[
                        styles.sideChipText, 
                        { color: theme.colors.textSecondary },
                        activeSide === side && { color: theme.colors.accent, fontWeight: 'bold' }
                      ]}>
                        {side}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.saveBtn, { backgroundColor: theme.colors.accent }]} 
                onPress={handleSaveZone}
              >
                <Text style={styles.saveBtnText}>Valider</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
  },
  sectionsList: {
    flex: 1,
  },
  sectionContainer: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  zonesContainer: {
    borderWidth: 1,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  zoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  zoneName: {
    fontSize: 16,
    fontWeight: '500',
  },
  zoneStateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  intensityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  zoneStateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  summaryContainer: {
    marginTop: 16,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  summaryList: {
    maxHeight: 50,
  },
  painChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    gap: 8,
  },
  painChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  removePainBtn: {
    padding: 2,
  },

  footer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
    marginTop: 'auto',
  },
  backBtn: {
    width: 60,
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtn: {
    flex: 1,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 48,
    borderTopWidth: 1,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  statesList: {
    gap: 8,
    marginBottom: 24,
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  stateIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stateText: {
    fontSize: 15,
  },
  sideSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  sideGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  sideChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  sideChipText: {
    fontSize: 14,
  },
  modalActions: {
    marginTop: 16,
  },
  saveBtn: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
