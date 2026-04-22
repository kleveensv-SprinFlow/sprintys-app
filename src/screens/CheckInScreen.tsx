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

const { height } = Dimensions.get('window');

const CheckInScreen = () => {
  const navigation = useNavigation<any>();
  const [sleepScore, setSleepScore] = useState(5);
  const [energyScore, setEnergyScore] = useState(5);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      const { error } = await supabase.from('daily_checkins').insert({
        user_id: session.user.id,
        sleep_score: sleepScore,
        energy_score: energyScore,
        notes: notes,
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
              {renderScorePills(sleepScore, setSleepScore)}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Niveau d'énergie</Text>
              {renderScorePills(energyScore, setEnergyScore)}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Notes / Douleurs</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Ex: Légère tension ischios, bien dormi..."
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
