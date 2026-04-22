import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { weatherService } from '../services/weatherService';
import SprintyAvatar from '../shared/components/SprintyAvatar';

const WeatherDetailScreen = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<any>(null);
  const [advice, setAdvice] = useState<any>(null);
  const [searchCity, setSearchCity] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadInitialWeather();
  }, []);

  const loadInitialWeather = async () => {
    try {
      setLoading(true);
      // Par défaut on essaie de charger la météo standard
      const data = await weatherService.fetchWeather();
      setWeather(data);
      setAdvice(weatherService.getCoachingAdvice(data));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseGPS = async () => {
    try {
      setIsRefreshing(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'L\'accès à la position est nécessaire pour cette fonctionnalité.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const data = await weatherService.fetchWeather({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setWeather(data);
      setAdvice(weatherService.getCoachingAdvice(data));
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de récupérer votre position.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchCity.trim()) return;
    try {
      setIsRefreshing(true);
      const data = await weatherService.fetchWeather(searchCity);
      setWeather(data);
      setAdvice(weatherService.getCoachingAdvice(data));
      setSearchCity('');
    } catch (error) {
      Alert.alert('Erreur', 'Ville non trouvée.');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00E5FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>MÉTÉO COACHING</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Barre de Recherche / GPS */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Chercher une ville..."
              placeholderTextColor="#8E8E93"
              value={searchCity}
              onChangeText={setSearchCity}
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity onPress={handleSearch} style={styles.searchIcon}>
              <Ionicons name="search" size={20} color="#00E5FF" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handleUseGPS} style={styles.gpsButton}>
            <Ionicons name="location" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Carte Météo Actuelle */}
        {weather && (
          <BlurView intensity={40} tint="default" style={styles.weatherCard}>
            <Text style={styles.locationText}>{weather.location.toUpperCase()}</Text>
            <View style={styles.mainWeather}>
              <Text style={styles.tempText}>{weather.temp}°</Text>
              <View style={styles.conditionBox}>
                <Text style={styles.conditionText}>{weather.condition.toUpperCase()}</Text>
                <Text style={styles.windText}>💨 {weather.windSpeed} M/S {weather.windDirection}</Text>
              </View>
            </View>
          </BlurView>
        )}

        {/* Conseil Sprinty avec Avatar */}
        {advice && (
          <View style={styles.adviceContainer}>
            <View style={styles.avatarPlaceholder}>
              <SprintyAvatar state={advice.sprintyState} />
              <Text style={styles.sprintyLabel}>SPRINTY : {advice.sprintyState.toUpperCase()}</Text>
            </View>

            <BlurView intensity={60} tint="default" style={styles.adviceCard}>
              <View style={styles.adviceSection}>
                <View style={styles.adviceHeader}>
                  <Ionicons name="shirt" size={18} color="#00E5FF" />
                  <Text style={styles.adviceTitle}>TENUE CONSEILLÉE</Text>
                </View>
                <Text style={styles.adviceText}>{advice.clothes}</Text>
              </View>

              <View style={[styles.adviceSection, { borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.05)', paddingTop: 16 }]}>
                <View style={styles.adviceHeader}>
                  <Ionicons name="flame" size={18} color="#FFD700" />
                  <Text style={styles.adviceTitle}>ÉCHAUFFEMENT</Text>
                </View>
                <Text style={styles.adviceText}>{advice.warmup}</Text>
              </View>
            </BlurView>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' },
  scrollContent: { padding: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  searchSection: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  searchBar: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 16, alignItems: 'center', paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  searchInput: { flex: 1, height: 48, color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  searchIcon: { padding: 8 },
  gpsButton: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#00E5FF', justifyContent: 'center', alignItems: 'center' },
  weatherCard: { borderRadius: 24, padding: 24, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(0, 229, 255, 0.2)', marginBottom: 24 },
  locationText: { fontSize: 11, fontWeight: '900', color: '#00E5FF', letterSpacing: 2, marginBottom: 8 },
  mainWeather: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  tempText: { fontSize: 64, fontWeight: '900', color: '#FFFFFF' },
  conditionBox: { gap: 4 },
  conditionText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  windText: { fontSize: 13, fontWeight: '600', color: '#8E8E93' },
  adviceContainer: { gap: 20 },
  avatarPlaceholder: { alignItems: 'center', marginBottom: -10, zIndex: 1 },
  sprintyCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#00E5FF', backgroundColor: 'rgba(0, 229, 255, 0.1)' },
  sprinty_happy: { backgroundColor: '#00E5FF' },
  sprinty_cold: { backgroundColor: '#5AC8FA' },
  sprinty_hot: { backgroundColor: '#FF3B30' },
  sprinty_neutral: { backgroundColor: '#8E8E93' },
  sprintyLabel: { color: '#8E8E93', fontSize: 10, fontWeight: '900', marginTop: 8, letterSpacing: 1 },
  adviceCard: { borderRadius: 28, padding: 24, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)' },
  adviceSection: { gap: 12, marginBottom: 20 },
  adviceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  adviceTitle: { fontSize: 12, fontWeight: '900', color: '#8E8E93', letterSpacing: 1 },
  adviceText: { fontSize: 15, color: '#FFFFFF', lineHeight: 22, fontWeight: '600' },
});

export default WeatherDetailScreen;
