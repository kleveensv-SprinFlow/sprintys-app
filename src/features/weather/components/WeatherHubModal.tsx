import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { weatherAdviceService } from '../../../services/weatherAdviceService';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Props {
  visible: boolean;
  onClose: () => void;
  currentWeather: any; 
}

const CACHE_KEY = '@sprintys_weather_ai_cache';
const LOCATION_KEY = '@sprintys_weather_location';

export const WeatherHubModal = ({ visible, onClose, currentWeather }: Props) => {
  const theme = useTheme();
  
  const [location, setLocation] = useState('INSEP, Paris');
  const [isEditingLoc, setIsEditingLoc] = useState(false);
  
  const [trainingTime, setTrainingTime] = useState('18:00');
  const [showPicker, setShowPicker] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<any>(null);

  useEffect(() => {
    loadSavedData();
  }, [visible]);

  const loadSavedData = async () => {
    try {
      const savedLoc = await AsyncStorage.getItem(LOCATION_KEY);
      if (savedLoc) setLocation(savedLoc);

      const cachedStr = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedStr) {
        const cache = JSON.parse(cachedStr);
        const today = new Date().toISOString().split('T')[0];
        if (cache.date === today && cache.time === trainingTime && cache.location === (savedLoc || location)) {
          setAiAdvice(cache.advice);
        } else {
          setAiAdvice(null);
        }
      } else {
        setAiAdvice(null);
      }
    } catch (e) {}
  };

  const saveLocation = async (text: string) => {
    setLocation(text);
    setIsEditingLoc(false);
    setAiAdvice(null); // Invalidate cache for new location
    await AsyncStorage.setItem(LOCATION_KEY, text);
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selectedDate && event.type !== 'dismissed') {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      setTrainingTime(`${hours}:${minutes}`);
      setAiAdvice(null); // Invalidate cache for new time
    }
  };

  const parseTimeStringToDate = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const generateAdvice = async () => {
    if (!currentWeather) return;
    setIsLoading(true);
    try {
      // Create a simulated future weather state if we don't have hourly forecast API connected
      const mockFutureWeather = { ...currentWeather }; 
      
      const advice = await weatherAdviceService.generateAIAdvice(mockFutureWeather, trainingTime);
      setAiAdvice(advice);
      
      const today = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
        date: today,
        time: trainingTime,
        location,
        advice
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: theme.colors.surface }]}>
          
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="chevron-down" size={28} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.colors.text }]}>Hub Météo</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            
            {/* Location Section */}
            <View style={[styles.card, { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border }]}>
              <View style={styles.locRow}>
                <Feather name="map-pin" size={20} color={theme.colors.accent} />
                {isEditingLoc ? (
                  <TextInput
                    style={[styles.locInput, { color: theme.colors.text, borderBottomColor: theme.colors.accent }]}
                    value={location}
                    onChangeText={setLocation}
                    onBlur={() => saveLocation(location)}
                    onSubmitEditing={() => saveLocation(location)}
                    autoFocus
                  />
                ) : (
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => setIsEditingLoc(true)}>
                    <Text style={[styles.locText, { color: theme.colors.text }]}>{location}</Text>
                  </TouchableOpacity>
                )}
                {!isEditingLoc && (
                  <TouchableOpacity onPress={() => setIsEditingLoc(true)}>
                    <Feather name="edit-2" size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Time Section */}
            <View style={[styles.card, { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border }]}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Heure d'entraînement</Text>
              <TouchableOpacity style={[styles.timeButton, { backgroundColor: theme.colors.background }]} onPress={() => setShowPicker(true)}>
                <Feather name="clock" size={20} color={theme.colors.textSecondary} />
                <Text style={[styles.timeText, { color: theme.colors.text }]}>{trainingTime}</Text>
              </TouchableOpacity>
            </View>

            {/* AI Generation Section */}
            <View style={styles.aiSection}>
              {!aiAdvice && !isLoading ? (
                <TouchableOpacity style={[styles.aiButton, { backgroundColor: theme.colors.accent }]} onPress={generateAdvice}>
                  <Text style={styles.aiButtonText}>🧠 Générer stratégie ({trainingTime})</Text>
                </TouchableOpacity>
              ) : isLoading ? (
                <View style={[styles.aiLoading, { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.accent }]}>
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                  <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Analyse des conditions en cours...</Text>
                </View>
              ) : (
                <View style={styles.adviceContainer}>
                  <View style={styles.adviceHeader}>
                    <Text style={[styles.adviceTitle, { color: theme.colors.text }]}>✨ Stratégie Météo</Text>
                    <TouchableOpacity onPress={generateAdvice}>
                      <Feather name="refresh-cw" size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.adviceBox, { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border }]}>
                    <View style={styles.adviceRow}>
                      <Text style={styles.adviceIcon}>👕</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.adviceCat, { color: theme.colors.text }]}>Tenue</Text>
                        <Text style={[styles.adviceDesc, { color: theme.colors.textSecondary }]}>{aiAdvice.tenue}</Text>
                      </View>
                    </View>
                    <View style={styles.separator} />
                    
                    <View style={styles.adviceRow}>
                      <Text style={styles.adviceIcon}>🏃</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.adviceCat, { color: theme.colors.text }]}>Échauffement</Text>
                        <Text style={[styles.adviceDesc, { color: theme.colors.textSecondary }]}>{aiAdvice.echauffement}</Text>
                      </View>
                    </View>
                    <View style={styles.separator} />
                    
                    <View style={styles.adviceRow}>
                      <Text style={styles.adviceIcon}>💧</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.adviceCat, { color: theme.colors.text }]}>Hydratation</Text>
                        <Text style={[styles.adviceDesc, { color: theme.colors.textSecondary }]}>{aiAdvice.hydratation}</Text>
                      </View>
                    </View>
                    <View style={styles.separator} />
                    
                    <View style={styles.adviceRow}>
                      <Text style={styles.adviceIcon}>👟</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.adviceCat, { color: theme.colors.text }]}>Terrain / Piste</Text>
                        <Text style={[styles.adviceDesc, { color: theme.colors.textSecondary }]}>{aiAdvice.terrain}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>

          </ScrollView>

          {Platform.OS === 'ios' && showPicker && (
            <Modal transparent animationType="slide">
              <View style={styles.pickerOverlay}>
                <View style={[styles.pickerContainer, { backgroundColor: theme.colors.surface }]}>
                  <View style={styles.pickerHeader}>
                    <TouchableOpacity onPress={() => setShowPicker(false)}>
                      <Text style={{ color: theme.colors.accent, fontWeight: 'bold', fontSize: 16 }}>OK</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={parseTimeStringToDate(trainingTime)}
                    mode="time"
                    is24Hour={true}
                    display="spinner"
                    onChange={handleTimeChange}
                    textColor={theme.colors.text}
                  />
                </View>
              </View>
            </Modal>
          )}

          {Platform.OS === 'android' && showPicker && (
            <DateTimePicker
              value={parseTimeStringToDate(trainingTime)}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={handleTimeChange}
            />
          )}

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  content: { borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '85%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: 'bold' },
  scrollArea: { padding: 20 },
  
  card: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  locText: { fontSize: 18, fontWeight: 'bold' },
  locInput: { flex: 1, fontSize: 18, fontWeight: 'bold', borderBottomWidth: 1, padding: 0 },
  
  cardTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  timeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 12 },
  timeText: { fontSize: 24, fontWeight: 'bold' },
  
  aiSection: { marginTop: 16, marginBottom: 40 },
  aiButton: { padding: 18, borderRadius: 16, alignItems: 'center' },
  aiButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  
  aiLoading: { padding: 24, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 14 },
  
  adviceContainer: { marginTop: 8 },
  adviceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  adviceTitle: { fontSize: 18, fontWeight: 'bold' },
  adviceBox: { padding: 20, borderRadius: 20, borderWidth: 1, gap: 16 },
  adviceRow: { flexDirection: 'row', gap: 16 },
  adviceIcon: { fontSize: 24 },
  adviceCat: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  adviceDesc: { fontSize: 14, lineHeight: 20 },
  separator: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginVertical: 4 },
  
  // DatePicker Overlay
  pickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  pickerContainer: { paddingBottom: 40, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'flex-end', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }
});
