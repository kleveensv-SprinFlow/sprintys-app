import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../services/supabaseClient';

const BODY_PARTS = ['Aucune', 'Ischios', 'Quadriceps', 'Mollets', 'Adducteurs', 'Dos', 'Pied/Cheville'];
const PAIN_TYPES = ['Courbatures', 'Raideur', 'Crampe', 'Gêne aiguë'];

const CheckInScreen = () => {
  const navigation = useNavigation<any>();
  const [bedTime, setBedTime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [idealSleep, setIdealSleep] = useState(8);
  const [latency, setLatency] = useState(30);
  const [energyScore, setEnergyScore] = useState(5);
  
  // États Douleurs
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>('Aucune');
  const [selectedPainType, setSelectedPainType] = useState<string | null>(null);
  
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatIdealSleep = (val: number) => {
    const h = Math.floor(val);
    const m = val % 1 !== 0 ? '30' : '00';
    return `${h}h${m}`;
  };

  const getMinutes = (time: string) => {
    const parts = time.split(':');
    if (parts.length !== 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  };

  const getSleepStats = () => {
    const bed = getMinutes(bedTime);
    const wake = getMinutes(wakeTime);
    
    if (bed === null || wake === null) return { hours: 0, mins: 0, score: 0 };

    let diff = wake - bed;
    if (diff <= 0) diff += 1440; // Ajouter 24h

    // Sommeil réel = Temps au lit - Latence
    const actualSleepMins = Math.max(0, diff - latency);
    const totalHours = actualSleepMins / 60;
    const h = Math.floor(totalHours);
    const m = Math.round((totalHours - h) * 60);

    // Score proportionnel au besoin idéal
    const idealSleepMins = idealSleep * 60;
    const score = Math.min(10, Math.round((actualSleepMins / idealSleepMins) * 10));

    return { hours: h, mins: m, score };
  };

  const renderScorePills = (currentValue: number, setter: (val: number) => void) => {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsContainer}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
          <TouchableOpacity
            key={score}
            style={[
              styles.scorePill,
              currentValue === score && styles.scorePillSelected
            ]}
            onPress={() => setter(score)}
          >
            <Text style={[
              styles.scoreText,
              currentValue === score && styles.scoreTextSelected
            ]}>
              {score}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Utilisateur non identifié');

      const { score: calculatedSleepScore } = getSleepStats();
      
      const finalNotes = selectedBodyPart && selectedBodyPart !== 'Aucune' 
        ? `[${selectedPainType || 'Douleur'} - ${selectedBodyPart}] ${notes}` 
        : notes;

      const { error } = await supabase.from('daily_checkins').insert({
        user_id: session.user.id,
        sleep_score: calculatedSleepScore,
        energy_score: energyScore,
        notes: finalNotes,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      if (Platform.OS === 'web') {
        alert('Check-in enregistré !');
      }
      navigation.goBack();
    } catch (error: any) {
      const msg = error.message || 'Erreur de sauvegarde';
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        // Alert handle logic would go here
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Light Background */}
      <View style={styles.lightBackground}>
        <View style={[styles.lightCircle, styles.cyanCircle]} />
        <View style={[styles.lightCircle, styles.purpleCircle]} />
      </View>
      <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Check-in Matinal</Text>
            <Text style={styles.subtitle}>Comment te sens-tu ce matin ?</Text>
          </View>

          <BlurView intensity={40} tint="default" style={styles.glassCard}>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Qualité du sommeil</Text>
              
              {/* Besoin Idéal */}
              <View style={styles.idealRow}>
                <Text style={styles.idealLabel}>Besoin idéal : {formatIdealSleep(idealSleep)}</Text>
                <View style={styles.counterRow}>
                  <TouchableOpacity 
                    style={styles.counterBtn} 
                    onPress={() => setIdealSleep(Math.max(6, idealSleep - 0.5))}
                  >
                    <Text style={styles.counterBtnText}>-</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.counterBtn} 
                    onPress={() => setIdealSleep(Math.min(12, idealSleep + 0.5))}
                  >
                    <Text style={styles.counterBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.timeInputRow}>
                <View style={styles.timeInputContainer}>
                  <Text style={styles.timeInputLabel}>Coucher</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={bedTime}
                    onChangeText={setBedTime}
                    placeholder="23:00"
                    placeholderTextColor="#8E8E93"
                  />
                </View>
                <View style={styles.timeInputContainer}>
                  <Text style={styles.timeInputLabel}>Lever</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={wakeTime}
                    onChangeText={setWakeTime}
                    placeholder="07:00"
                    placeholderTextColor="#8E8E93"
                  />
                </View>
              </View>

              {/* Latence */}
              <View style={styles.latencyContainer}>
                <Text style={styles.timeInputLabel}>Endormissement (Latence)</Text>
                <View style={styles.latencyRow}>
                  {[
                    { label: 'Rapide (15m)', val: 15 },
                    { label: 'Normal (30m)', val: 30 },
                    { label: 'Long (60m)', val: 60 }
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.val}
                      style={[
                        styles.latencyPill,
                        latency === item.val && styles.latencyPillSelected
                      ]}
                      onPress={() => setLatency(item.val)}
                    >
                      <Text style={[
                        styles.latencyText,
                        latency === item.val && styles.latencyTextSelected
                      ]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Text style={styles.sleepSummary}>
                Sommeil réel : {getSleepStats().hours}h {getSleepStats().mins}m (Score : {getSleepStats().score}/10)
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Niveau d'énergie</Text>
              {renderScorePills(energyScore, setEnergyScore)}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Douleurs ou remarques</Text>
              
              {/* Zone du corps */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll}>
                {BODY_PARTS.map((part) => (
                  <TouchableOpacity
                    key={part}
                    style={[
                      styles.tagPill,
                      selectedBodyPart === part && styles.tagPillSelected
                    ]}
                    onPress={() => {
                      setSelectedBodyPart(part);
                      if (part === 'Aucune') setSelectedPainType(null);
                    }}
                  >
                    <Text style={[styles.tagText, selectedBodyPart === part && styles.tagTextSelected]}>
                      {part}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Type de douleur (si zone sélectionnée) */}
              {selectedBodyPart && selectedBodyPart !== 'Aucune' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll}>
                  {PAIN_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.tagPill,
                        selectedPainType === type && styles.tagPillSelected
                      ]}
                      onPress={() => setSelectedPainType(type)}
                    >
                      <Text style={[styles.tagText, selectedPainType === type && styles.tagTextSelected]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <TextInput
                style={styles.textArea}
                placeholder="Précisions supplémentaires..."
                placeholderTextColor="#8E8E93"
                multiline
                numberOfLines={4}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.saveButtonText}>Valider le check-in</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </BlurView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  lightBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  lightCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.4,
  },
  cyanCircle: {
    top: -50,
    right: -50,
    backgroundColor: '#32ADE6',
  },
  purpleCircle: {
    bottom: -50,
    left: -50,
    backgroundColor: '#BF5AF2',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 80,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 17,
    color: '#8E8E93',
    marginTop: 8,
  },
  glassCard: {
    borderRadius: 28,
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  pillsContainer: {
    paddingRight: 10,
  },
  scorePill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  scorePillSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  scoreText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scoreTextSelected: {
    color: '#000000',
  },
  textArea: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    height: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  timeInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeInputContainer: {
    width: '48%',
  },
  timeInputLabel: {
    color: '#8E8E93',
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  timeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sleepSummary: {
    color: '#32ADE6',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  idealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 12,
  },
  idealLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  counterBtnText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  latencyContainer: {
    marginBottom: 16,
  },
  latencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  latencyPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  latencyPillSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  latencyText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
  },
  latencyTextSelected: {
    color: '#000000',
  },
  tagScroll: {
    marginBottom: 12,
  },
  tagPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  tagPillSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  tagText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '500',
  },
  tagTextSelected: {
    color: '#000000',
  },
  saveButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '700',
  },
  cancelButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  cancelButtonText: {
    color: '#8E8E93',
    fontSize: 15,
    fontWeight: '500',
  },
});

export default CheckInScreen;
