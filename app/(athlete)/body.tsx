import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/core/theme';
import { useBodyStore } from '../../src/store/bodyStore';
import { useAuthStore } from '../../src/store/authStore';
import { LineChart } from 'react-native-chart-kit';
import { useSprintyStore } from '../../src/store/sprintyStore';

const screenWidth = Dimensions.get('window').width;

type ScaleType = 'none' | '4_electrodes' | '8_electrodes';

export default function BodyCompositionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { metrics, addMetric, loadMetrics, isLoading } = useBodyStore();
  const { showFeedback } = useSprintyStore();

  const [weight, setWeight] = useState('');
  const [scaleType, setScaleType] = useState<ScaleType>('none');
  const [bodyFat, setBodyFat] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [water, setWater] = useState('');

  const [chartMetric, setChartMetric] = useState<'weight' | 'fat' | 'muscle'>('weight');

  useEffect(() => {
    if (user?.id) {
      loadMetrics(user.id);
    }
  }, [user]);

  const formatSmartDecimal = (text: string) => {
    const digits = text.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length <= 2) return digits;
    if (digits.length === 3) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    return `${digits.slice(0, digits.length - 1)}.${digits.slice(digits.length - 1)}`;
  };

  const handleSave = async () => {
    if (!user?.id) return;
    if (!weight) {
      showFeedback('error', 'Le poids est obligatoire.');
      return;
    }

    try {
      const parseNum = (val: string) => {
        if (!val) return null;
        const parsed = parseFloat(val.replace(',', '.'));
        return isNaN(parsed) ? null : parsed;
      };

      const payload: any = {
        athlete_id: user.id,
        weight: parseNum(weight)!,
        scale_type: scaleType,
      };

      const bf = parseNum(bodyFat);
      if (bf !== null) payload.body_fat = bf;

      const mm = parseNum(muscleMass);
      if (mm !== null) payload.muscle_mass_kg = mm;

      const wp = parseNum(water);
      if (wp !== null) payload.water_percentage = wp;

      await addMetric(payload);
      showFeedback('success', 'Données enregistrées !');
      router.back();
    } catch (err) {
      console.error(err);
    }
  };

  const getChartData = () => {
    if (metrics.length === 0) return { labels: ['Aucune'], datasets: [{ data: [0] }] };
    
    // Simplification for the chart: just take the last 7 points for now
    const recentMetrics = metrics.slice(-7);
    
    const labels = recentMetrics.map(m => {
      const d = new Date(m.created_at || '');
      return `${d.getDate()}/${d.getMonth()+1}`;
    });

    let dataPoints = [];
    if (chartMetric === 'weight') dataPoints = recentMetrics.map(m => m.weight);
    else if (chartMetric === 'fat') dataPoints = recentMetrics.map(m => m.body_fat || 0);
    else if (chartMetric === 'muscle') dataPoints = recentMetrics.map(m => m.muscle_mass_kg || 0);

    if (dataPoints.length === 0 || dataPoints.every(d => d === 0)) {
      dataPoints = [0];
      labels.length = 1;
      labels[0] = 'N/A';
    }

    return {
      labels,
      datasets: [
        {
          data: dataPoints,
          color: (opacity = 1) => chartMetric === 'weight' ? theme.colors.accent : chartMetric === 'fat' ? theme.colors.warning : theme.colors.success,
          strokeWidth: 2
        }
      ]
    };
  };

  const isFirstWeighIn = metrics.length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Ma Composition</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {isFirstWeighIn && (
          <View style={[styles.welcomeCard, { backgroundColor: theme.colors.accent + '10' }]}>
            <Feather name="activity" size={32} color={theme.colors.accent} style={{ marginBottom: 12 }} />
            <Text style={[styles.welcomeTitle, { color: theme.colors.text }]}>Bienvenue dans votre espace composition !</Text>
            <Text style={[styles.welcomeText, { color: theme.colors.textSecondary }]}>
              Renseignez votre première pesée ci-dessous pour commencer à suivre votre évolution physique de manière détaillée.
            </Text>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Nouvelle pesée</Text>
          
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Poids (kg) *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
            keyboardType="numeric"
            placeholder="Ex: 75.5"
            placeholderTextColor={theme.colors.textMuted}
            value={weight}
            onChangeText={(text) => setWeight(formatSmartDecimal(text))}
          />

          <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: 16 }]}>Moyen de pesée</Text>
          <View style={styles.scaleSelector}>
            {(['none', '4_electrodes', '8_electrodes'] as ScaleType[]).map((type) => {
              const isSelected = scaleType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.scaleTile, 
                    { borderColor: theme.colors.border },
                    isSelected && { backgroundColor: theme.colors.accent + '15', borderColor: theme.colors.accent }
                  ]}
                  onPress={() => setScaleType(type)}
                >
                  <Feather 
                    name={type === 'none' ? 'target' : type === '4_electrodes' ? 'smartphone' : 'monitor'} 
                    size={20} 
                    color={isSelected ? theme.colors.accent : theme.colors.textSecondary} 
                    style={{ marginBottom: 8 }}
                  />
                  <Text style={[
                    styles.scaleText, 
                    { color: isSelected ? theme.colors.accent : theme.colors.textSecondary }
                  ]}>
                    {type === 'none' ? 'Classique' : type === '4_electrodes' ? '4 Électrodes' : '8 Électrodes'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.helperText, { color: theme.colors.textMuted }]}>
            {scaleType === '4_electrodes' && "Balance classique avec capteurs aux pieds. Mesure surtout le bas du corps."}
            {scaleType === '8_electrodes' && "Balance avec poignée. Mesure complète (bras, tronc, jambes) plus précise."}
          </Text>

          {scaleType !== 'none' && (
            <View style={styles.advancedGrid}>
              <View style={styles.gridItem}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Masse Grasse (%)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                  keyboardType="numeric"
                  placeholder="%"
                  value={bodyFat}
                  onChangeText={(text) => setBodyFat(formatSmartDecimal(text))}
                />
              </View>
              <View style={styles.gridItem}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Masse Muscu (kg)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                  keyboardType="numeric"
                  placeholder="kg"
                  value={muscleMass}
                  onChangeText={(text) => setMuscleMass(formatSmartDecimal(text))}
                />
              </View>
              <View style={styles.gridItem}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Eau (%)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                  keyboardType="numeric"
                  placeholder="%"
                  value={water}
                  onChangeText={(text) => setWater(formatSmartDecimal(text))}
                />
              </View>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.saveBtn, { backgroundColor: theme.colors.accent, opacity: isLoading ? 0.7 : 1 }]} 
            onPress={handleSave}
            disabled={isLoading || !weight}
          >
            <Text style={styles.saveBtnText}>{isLoading ? 'Enregistrement...' : 'Enregistrer'}</Text>
          </TouchableOpacity>
        </View>

        {!isFirstWeighIn && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginTop: 16 }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Évolution</Text>
            
            <View style={styles.chartFilters}>
              <TouchableOpacity onPress={() => setChartMetric('weight')} style={[styles.metricFilter, chartMetric === 'weight' && { backgroundColor: theme.colors.accent + '20' }]}>
                <Text style={{ color: chartMetric === 'weight' ? theme.colors.accent : theme.colors.textSecondary, fontWeight: 'bold' }}>Poids</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setChartMetric('fat')} style={[styles.metricFilter, chartMetric === 'fat' && { backgroundColor: theme.colors.warning + '20' }]}>
                <Text style={{ color: chartMetric === 'fat' ? theme.colors.warning : theme.colors.textSecondary, fontWeight: 'bold' }}>Gras</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setChartMetric('muscle')} style={[styles.metricFilter, chartMetric === 'muscle' && { backgroundColor: theme.colors.success + '20' }]}>
                <Text style={{ color: chartMetric === 'muscle' ? theme.colors.success : theme.colors.textSecondary, fontWeight: 'bold' }}>Muscle</Text>
              </TouchableOpacity>
            </View>

            <LineChart
              data={getChartData()}
              width={screenWidth - 64}
              height={220}
              chartConfig={{
                backgroundColor: theme.colors.surface,
                backgroundGradientFrom: theme.colors.surface,
                backgroundGradientTo: theme.colors.surface,
                decimalPlaces: 1,
                color: (opacity = 1) => chartMetric === 'weight' ? theme.colors.accent : chartMetric === 'fat' ? theme.colors.warning : theme.colors.success,
                labelColor: (opacity = 1) => theme.colors.textSecondary,
                style: { borderRadius: 16 },
                propsForDots: { r: "4", strokeWidth: "2", stroke: theme.colors.surface },
                fillShadowGradientFrom: chartMetric === 'weight' ? theme.colors.accent : chartMetric === 'fat' ? theme.colors.warning : theme.colors.success,
                fillShadowGradientFromOpacity: 0.3,
                fillShadowGradientToOpacity: 0.0,
              }}
              bezier
              style={{ marginVertical: 8, borderRadius: 16 }}
              withInnerLines={false}
              withOuterLines={true}
            />
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  backButton: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  welcomeCard: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  scaleSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  scaleTile: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  helperText: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  advancedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
  },
  gridItem: {
    width: '47%',
  },
  saveBtn: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chartFilters: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricFilter: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  }
});
