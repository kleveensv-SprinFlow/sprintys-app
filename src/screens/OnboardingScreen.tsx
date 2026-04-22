import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { signOutUser } from '../services/authService';
import { supabase } from '../services/supabaseClient';

const { width, height } = Dimensions.get('window');

const DISCIPLINES = ['60m', '100m', '200m', '400m', '60m Haies', '110m Haies'];

const OnboardingScreen = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const [seasonGoal, setSeasonGoal] = useState('');
  const [personalRecords, setPersonalRecords] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigation = useNavigation<any>();

  const handleToggleDiscipline = (discipline: string) => {
    if (selectedDisciplines.includes(discipline)) {
      setSelectedDisciplines(selectedDisciplines.filter(d => d !== discipline));
      const newRecords = { ...personalRecords };
      delete newRecords[discipline];
      setPersonalRecords(newRecords);
    } else {
      setSelectedDisciplines([...selectedDisciplines, discipline]);
    }
  };

  const handleRecordChange = (discipline: string, value: string) => {
    setPersonalRecords({ ...personalRecords, [discipline]: value });
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleNext = async () => {
    if (currentStep === 0 && selectedDisciplines.length === 0) {
      showAlert('Attention', 'Veuillez sélectionner au moins une discipline.');
      return;
    }

    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    } else {
      // Étape finale : Sauvegarde dans Supabase
      setIsSaving(true);
      
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) throw new Error('Utilisateur non trouvé.');

        const { error } = await supabase.from('profiles').upsert({
          id: user.id,
          disciplines: selectedDisciplines,
          season_goal: seasonGoal,
          personal_records: personalRecords,
          updated_at: new Date().toISOString(),
        });

        if (error) throw error;

        setIsSuccess(true);
        setTimeout(() => {
          navigation.replace('MainTabs');
        }, 1000);
      } catch (error: any) {
        showAlert('Erreur de sauvegarde', error.message || 'Une erreur est survenue.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderProgressBars = () => (
    <View style={styles.progressContainer}>
      {[0, 1, 2].map((step) => (
        <View key={step} style={styles.progressBarWrapper}>
          <View 
            style={[
              styles.progressBar, 
              step <= currentStep ? styles.progressBarActive : styles.progressBarInactive
            ]} 
          />
        </View>
      ))}
    </View>
  );

  const renderContent = () => {
    if (isSuccess) {
      return (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Profil Sauvegardé !</Text>
          <Text style={styles.stepDescription}>
            Tes informations ont été enregistrées avec succès. Préparation du Dashboard...
          </Text>
        </View>
      );
    }

    switch (currentStep) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Tes Disciplines</Text>
            <Text style={styles.stepDescription}>Sélectionne les épreuves que tu pratiques.</Text>
            <View style={styles.pillsContainer}>
              {DISCIPLINES.map((discipline) => {
                const isSelected = selectedDisciplines.includes(discipline);
                return (
                  <TouchableOpacity
                    key={discipline}
                    style={[styles.pill, isSelected && styles.pillSelected]}
                    onPress={() => handleToggleDiscipline(discipline)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                      {discipline}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Objectif de Saison</Text>
            <Text style={styles.stepDescription}>Qu'espères-tu accomplir cette année ?</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Ex: Passer sous les 11s au 100m..."
              placeholderTextColor="#8E8E93"
              multiline
              numberOfLines={4}
              value={seasonGoal}
              onChangeText={setSeasonGoal}
            />
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Records Personnels</Text>
            <Text style={styles.stepDescription}>Saisis tes meilleurs chronos.</Text>
            <ScrollView style={styles.recordsList} showsVerticalScrollIndicator={false}>
              {selectedDisciplines.map((discipline) => (
                <View key={discipline} style={styles.recordInputRow}>
                  <Text style={styles.recordLabel}>{discipline}</Text>
                  <TextInput
                    style={styles.recordInput}
                    placeholder="--:--"
                    placeholderTextColor="#8E8E93"
                    keyboardType="numeric"
                    value={personalRecords[discipline] || ''}
                    onChangeText={(val) => handleRecordChange(discipline, val)}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Background circles */}
      <View style={styles.lightBackground}>
        <View style={[styles.lightCircle, styles.cyanCircle]} />
        <View style={[styles.lightCircle, styles.purpleCircle]} />
      </View>
      <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />

      {/* Navigation Touch Zones (disabled when success) */}
      {!isSuccess && (
        <View style={styles.touchZonesContainer} pointerEvents="box-none">
          <TouchableOpacity 
            style={styles.touchZone} 
            onPress={handlePrev} 
            activeOpacity={1} 
          />
          <TouchableOpacity 
            style={styles.touchZone} 
            onPress={handleNext} 
            activeOpacity={1} 
          />
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        pointerEvents="box-none"
      >
        <View style={styles.mainContent} pointerEvents="box-none">
          {renderProgressBars()}

          <BlurView intensity={40} tint="default" style={styles.glassCard}>
            {renderContent()}

            {!isSuccess && (
              <TouchableOpacity 
                style={styles.mainButton} 
                onPress={handleNext}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator color="#000000" />
                ) : (
                  <Text style={styles.mainButtonText}>
                    {currentStep === 2 ? 'Terminer' : 'Suivant'}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.signOutButton} 
              onPress={() => signOutUser()}
            >
              <Text style={styles.signOutText}>Déconnexion</Text>
            </TouchableOpacity>
          </BlurView>
        </View>
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
    opacity: 0.5,
  },
  cyanCircle: {
    top: -50,
    left: -50,
    backgroundColor: '#32ADE6',
  },
  purpleCircle: {
    bottom: -50,
    right: -50,
    backgroundColor: '#BF5AF2',
  },
  touchZonesContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 1,
  },
  touchZone: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    zIndex: 2,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 10,
    marginBottom: 40,
    position: 'absolute',
    top: 60,
  },
  progressBarWrapper: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 2,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  progressBarActive: {
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
  progressBarInactive: {
    width: '0%',
  },
  glassCard: {
    width: '100%',
    maxWidth: 420,
    padding: 30,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  stepContent: {
    width: '100%',
    minHeight: 300,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  stepDescription: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 30,
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pillSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pillTextSelected: {
    color: '#000000',
  },
  textArea: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 17,
    height: 150,
    textAlignVertical: 'top',
  },
  recordsList: {
    maxHeight: 300,
  },
  recordInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  recordLabel: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  recordInput: {
    color: '#FFFFFF',
    fontSize: 17,
    textAlign: 'right',
    width: 100,
  },
  mainButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 30,
  },
  mainButtonText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '600',
  },
  signOutButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  signOutText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default OnboardingScreen;
