import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useBodyMetricsStore } from '../../../store/useBodyMetricsStore';
import { TrendIndicator } from '../components/TrendIndicator';

export const MetricsHistoryScreen = () => {
  const { metrics } = useBodyMetricsStore();

  if (metrics.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.title}>Evolution</Text>
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>No metrics logged.</Text>
          <Text style={styles.emptySubText}>Enter your weight to start tracking.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Evolution</Text>
      
      <FlatList
        data={metrics}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          // Get the previous metric (older in time). Since array is newest first, it's index + 1
          const previousMetric = metrics[index + 1];
          
          return (
            <View style={styles.card}>
              <View style={styles.dateRow}>
                <Text style={styles.dateText}>
                  {new Date(item.date).toLocaleDateString(undefined, { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </Text>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBlock}>
                  <Text style={styles.statLabel}>Weight</Text>
                  <View style={styles.statValueContainer}>
                    <Text style={styles.statValue}>{item.weight} kg</Text>
                    <TrendIndicator 
                      currentValue={item.weight} 
                      previousValue={previousMetric?.weight} 
                      inverseColors={true}
                    />
                  </View>
                </View>

                {item.bodyFatPercentage && (
                  <View style={styles.statBlock}>
                    <Text style={styles.statLabel}>Body Fat</Text>
                    <View style={styles.statValueContainer}>
                      <Text style={styles.statValue}>{item.bodyFatPercentage}%</Text>
                      <TrendIndicator 
                        currentValue={item.bodyFatPercentage} 
                        previousValue={previousMetric?.bodyFatPercentage}
                        inverseColors={true}
                      />
                    </View>
                  </View>
                )}
              </View>

              {item.notes && (
                <Text style={styles.notesText}>{item.notes}</Text>
              )}
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#000',
    padding: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  list: {
    paddingBottom: 20,
  },
  emptyText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubText: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  dateRow: {
    marginBottom: 12,
  },
  dateText: {
    color: '#888',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  statBlock: {
    flex: 1,
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 4,
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  notesText: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 12,
    fontStyle: 'italic',
  },
});
