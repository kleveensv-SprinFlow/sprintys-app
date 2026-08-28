import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { FRONT_MUSCLES, BACK_MUSCLES } from 'body-muscles';
import { useTheme } from '../../../core/theme';
import { Feather } from '@expo/vector-icons';
import { useCheckInStore } from '../../../store/checkInStore';
import { PainInfo } from '../../../services/checkInService';
import { useSprintyStore } from '../../../store/sprintyStore';

interface PainStepProps {
  onBack: () => void;
  onSubmit: () => void;
}

const PAIN_TYPES = ['courbature', 'raideur', 'élongation', 'tendinite', 'claquage', 'déchirure', 'autre'];

export const PainStep = ({ onBack, onSubmit }: PainStepProps) => {
  const theme = useTheme();
  const { currentCheckIn, addPain, removePain } = useCheckInStore();
  const { isLoading } = useSprintyStore(); // or checkInStore loading

  const [viewSide, setViewSide] = useState<'front' | 'back'>('front');
  const [selectedMuscle, setSelectedMuscle] = useState<{ id: string, name: string } | null>(null);

  // Form state
  const [painType, setPainType] = useState('courbature');
  const [intensity, setIntensity] = useState(5);
  const [comment, setComment] = useState('');

  const muscles = viewSide === 'front' ? FRONT_MUSCLES : BACK_MUSCLES;
  const currentPains = currentCheckIn?.pains || [];

  const handleMusclePress = (id: string, name: string) => {
    // If it's already recorded, pre-fill the form
    const existingPain = currentPains.find(p => p.muscle_id === id);
    if (existingPain) {
      setPainType(existingPain.type);
      setIntensity(existingPain.intensity);
      setComment(existingPain.comment || '');
    } else {
      setPainType('courbature');
      setIntensity(5);
      setComment('');
    }
    setSelectedMuscle({ id, name });
  };

  const handleSavePain = () => {
    if (!selectedMuscle) return;
    
    addPain({
      muscle_id: selectedMuscle.id,
      muscle_name: selectedMuscle.name,
      type: painType,
      intensity,
      comment
    });
    setSelectedMuscle(null);
  };

  const handleRemovePain = (id: string) => {
    removePain(id);
    if (selectedMuscle?.id === id) {
      setSelectedMuscle(null);
    }
  };

  const getIntensityColor = (level: number) => {
    if (level <= 3) return theme.colors.warning; // Light yellow/orange
    if (level <= 7) return '#F97316'; // Orange
    return theme.colors.error; // Red
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Douleurs</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Touchez un muscle pour signaler une gêne ou douleur.
      </Text>

      <View style={[styles.toggleContainer, { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border }]}>
        <TouchableOpacity 
          style={[styles.toggleButton, viewSide === 'front' && { backgroundColor: theme.colors.surface }]}
          onPress={() => setViewSide('front')}
        >
          <Text style={[styles.toggleText, viewSide === 'front' ? { color: theme.colors.text, fontWeight: 'bold' } : { color: theme.colors.textMuted }]}>
            Avant
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleButton, viewSide === 'back' && { backgroundColor: theme.colors.surface }]}
          onPress={() => setViewSide('back')}
        >
          <Text style={[styles.toggleText, viewSide === 'back' ? { color: theme.colors.text, fontWeight: 'bold' } : { color: theme.colors.textMuted }]}>
            Arrière
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bodyMapContainer}>
        <Svg viewBox="0 0 200 400" width="100%" height="100%">
          {muscles.map((muscle) => {
            const pain = currentPains.find(p => p.muscle_id === muscle.id);
            const isSelected = selectedMuscle?.id === muscle.id;
            
            let fillColor = theme.colors.border;
            if (isSelected) fillColor = theme.colors.accent;
            else if (pain) fillColor = getIntensityColor(pain.intensity);

            return (
              <Path
                key={muscle.id}
                d={muscle.path}
                fill={fillColor}
                stroke={theme.colors.background}
                strokeWidth={1}
                onPress={() => handleMusclePress(muscle.id, muscle.name)}
              />
            );
          })}
        </Svg>
      </View>

      <ScrollView style={styles.painsList} horizontal showsHorizontalScrollIndicator={false}>
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

      <View style={styles.footer}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Feather name="arrow-left" size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.submitBtn, { backgroundColor: theme.colors.success }]} 
          onPress={onSubmit}
        >
          <Text style={styles.submitBtnText}>Enregistrer ({currentPains.length} douleur{currentPains.length !== 1 && 's'})</Text>
        </TouchableOpacity>
      </View>

      {/* Pain Details Modal */}
      <Modal visible={!!selectedMuscle} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{selectedMuscle?.name}</Text>
              <TouchableOpacity onPress={() => setSelectedMuscle(null)}>
                <Feather name="x" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Type de douleur</Text>
            <View style={styles.typeGrid}>
              {PAIN_TYPES.map(type => (
                <TouchableOpacity 
                  key={type}
                  style={[
                    styles.typeChip, 
                    { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border },
                    painType === type && { backgroundColor: theme.colors.accent + '20', borderColor: theme.colors.accent }
                  ]}
                  onPress={() => setPainType(type)}
                >
                  <Text style={[
                    styles.typeChipText, 
                    { color: theme.colors.textSecondary },
                    painType === type && { color: theme.colors.accent, fontWeight: 'bold' }
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: 24 }]}>Intensité ({intensity}/10)</Text>
            <View style={styles.intensityContainer}>
              {[1,2,3,4,5,6,7,8,9,10].map(val => (
                <TouchableOpacity 
                  key={val}
                  style={[
                    styles.intensityBox,
                    { backgroundColor: theme.colors.surfaceLight },
                    intensity === val && { backgroundColor: getIntensityColor(val) }
                  ]}
                  onPress={() => setIntensity(val)}
                >
                  <Text style={[
                    styles.intensityText, 
                    { color: intensity === val ? '#FFF' : theme.colors.textSecondary }
                  ]}>
                    {val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: 24 }]}>Commentaire (optionnel)</Text>
            <TextInput
              style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border }]}
              value={comment}
              onChangeText={setComment}
              placeholder="Ex: Douleur apparue pendant le squat"
              placeholderTextColor={theme.colors.textMuted}
            />

            <View style={styles.modalActions}>
              {currentPains.some(p => p.muscle_id === selectedMuscle?.id) && (
                <TouchableOpacity 
                  style={styles.deleteBtn} 
                  onPress={() => handleRemovePain(selectedMuscle!.id)}
                >
                  <Text style={[styles.deleteBtnText, { color: theme.colors.error }]}>Supprimer</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={[styles.saveBtn, { backgroundColor: theme.colors.accent }]} 
                onPress={handleSavePain}
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
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleText: {
    fontSize: 14,
  },
  bodyMapContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  painsList: {
    maxHeight: 50,
    marginBottom: 24,
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
  intensityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  painChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  removePainBtn: {
    padding: 2,
  },
  footer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 13,
  },
  intensityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  intensityBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intensityText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 32,
  },
  deleteBtn: {
    padding: 12,
  },
  deleteBtnText: {
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    flex: 1,
    alignItems: 'center',
    marginLeft: 16,
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
