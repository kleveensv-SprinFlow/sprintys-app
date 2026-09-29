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

type ScaleType = 'none' | '4_electrodes' | '8_electrodes' | 'dexa';

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

  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [chartMetric, setChartMetric] = useState<'weight' | 'fat' | 'muscle'>('weight');

  useEffect(() => {
    if (user?.id) {
      loadMetrics(user.id);
    }
  }, [user]);

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

      await addMetric({
        athlete_id: user.id,
        weight: parseNum(weight)!,
        scale_type: scaleType,
        body_fat: parseNum(bodyFat) ?? undefined,
        muscle_mass_kg: parseNum(muscleMass) ?? undefined,
        water_percentage: parseNum(water) ?? undefined,
      });
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
        
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Nouvelle pesée</Text>
          
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Poids (kg) *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
            keyboardType="decimal-pad"
            placeholder="Ex: 75.5"
            placeholderTextColor={theme.colors.textMuted}
            value={weight}
            onChangeText={setWeight}
          />

          <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: 16 }]}>Moyen de pesée</Text>
          <View style={styles.scaleSelector}>
            {(['none', '4_electrodes', '8_electrodes', 'dexa'] as ScaleType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.scalePill, 
                  { borderColor: theme.colors.border },
                  scaleType === type && { backgroundColor: theme.colors.accentMuted, borderColor: theme.colors.accent }
                ]}
                onPress={() => setScaleType(type)}
              >
                <Text style={[
                  styles.scaleText, 
                  { color: scaleType === type ? theme.colors.accent : theme.colors.textSecondary }
                ]}>
                  {type === 'none' ? 'Classique' : type === '4_electrodes' ? '4 Électrodes' : type === '8_electrodes' ? '8 Électrodes' : 'DEXA'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.helperText, { color: theme.colors.textMuted }]}>
            {scaleType === '4_electrodes' && "Balance classique avec capteurs aux pieds. Mesure surtout le bas du corps."}
            {scaleType === '8_electrodes' && "Balance avec poignée. Mesure complète (bras, tronc, jambes) plus précise."}
            {scaleType === 'dexa' && "Scan médical DEXA. La référence la plus précise."}
          </Text>

          {scaleType !== 'none' && (
            <View style={styles.advancedGrid}>
              <View style={styles.gridItem}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Masse Grasse (%)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                  keyboardType="decimal-pad"
                  placeholder="%"
                  value={bodyFat}
                  onChangeText={setBodyFat}
                />
              </View>
              <View style={styles.gridItem}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Masse Muscu (kg)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                  keyboardType="decimal-pad"
                  placeholder="kg"
                  value={muscleMass}
                  onChangeText={setMuscleMass}
                />
              </View>
              <View style={styles.gridItem}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Eau (%)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                  keyboardType="decimal-pad"
                  placeholder="%"
                  value={water}
                  onChangeText={setWater}
                />
              </View>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.saveBtn, { backgroundColor: theme.colors.accent, opacity: isLoading ? 0.7 : 1 }]} 
            onPress={handleSave}
            disabled={isLoading}
          >
            <Text style={styles.saveBtnText}>{isLoading ? 'Enregistrement...' : 'Enregistrer'}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginTop: 16 }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Évolution</Text>
          
          <View style={styles.chartFilters}>
            <TouchableOpacity onPress={() => setChartMetric('weight')} style={[styles.metricFilter, chartMetric === 'weight' && { borderBottomColor: theme.colors.accent, borderBottomWidth: 2 }]}>
              <Text style={{ color: chartMetric === 'weight' ? theme.colors.accent : theme.colors.textSecondary, fontWeight: 'bold' }}>Poids</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setChartMetric('fat')} style={[styles.metricFilter, chartMetric === 'fat' && { borderBottomColor: theme.colors.warning, borderBottomWidth: 2 }]}>
              <Text style={{ color: chartMetric === 'fat' ? theme.colors.warning : theme.colors.textSecondary, fontWeight: 'bold' }}>Gras</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setChartMetric('muscle')} style={[styles.metricFilter, chartMetric === 'muscle' && { borderBottomColor: theme.colors.success, borderBottomWidth: 2 }]}>
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
              color: (opacity = 1) => theme.colors.textSecondary,
              labelColor: (opacity = 1) => theme.colors.textSecondary,
              style: { borderRadius: 16 },
              propsForDots: { r: "4" }
            }}
            bezier
            style={{ marginVertical: 8, borderRadius: 16 }}
          />
        </View>

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
    flexWrap: 'wrap',
    gap: 8,
  },
  scalePill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  scaleText: {
    fontSize: 13,
    fontWeight: '600',
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
    gap: 16,
    marginBottom: 16,
  },
  metricFilter: {
    paddingBottom: 4,
  }
});
