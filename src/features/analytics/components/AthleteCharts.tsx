import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { analyticsService } from '../../../services/analyticsService';
import { theme } from '../../../core/theme';
import { useAuthStore } from '../../../store/authStore';

export const AthleteCharts: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [runData, setRunData] = useState<any[]>([]);
  
  useEffect(() => {
    if (!user) return;
    
    const loadCharts = async () => {
      try {
        setLoading(true);
        // Ex: Progession sur 30m
        const sprints30m = await analyticsService.getExerciseProgression(user.id, 'run', 30);
        setRunData(sprints30m);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadCharts();
  }, [user]);

  if (loading) {
    return <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 40 }} />;
  }

  // Préparation des données pour le Graphique de Vitesse (30m)
  let runChartData = {
    labels: [] as string[],
    datasets: [{ data: [0] }] // Valeur par défaut pour éviter un crash si vide
  };

  if (runData.length > 0) {
    runChartData = {
      labels: runData.map(d => {
        const date = new Date(d.date_achieved);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      }),
      datasets: [
        {
          data: runData.map(d => d.daily_best_time_ms / 1000)
        }
      ]
    };
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Progression 30m Sprint</Text>
      
      {runData.length < 2 ? (
        <Text style={styles.emptyText}>Pas assez de données pour générer un graphique d'évolution sur 30m.</Text>
      ) : (
        <View style={styles.chartWrapper}>
          <LineChart
            data={runChartData}
            width={Dimensions.get('window').width - 32} 
            height={220}
            yAxisSuffix="s"
            yAxisInterval={1} 
            chartConfig={{
              backgroundColor: theme.colors.surface,
              backgroundGradientFrom: theme.colors.surface,
              backgroundGradientTo: theme.colors.surfaceLight,
              decimalPlaces: 2,
              color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
              labelColor: (opacity = 1) => theme.colors.textSecondary,
              style: { borderRadius: 16 },
              propsForDots: { r: "4", strokeWidth: "2", stroke: theme.colors.accent }
            }}
            bezier
            style={{ marginVertical: 8, borderRadius: 16 }}
          />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 16 },
  title: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  chartWrapper: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 8, borderWidth: 1, borderColor: theme.colors.border },
  emptyText: { color: theme.colors.textMuted, fontStyle: 'italic' }
});
