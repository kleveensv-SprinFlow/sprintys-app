import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useBodyMetricsStore } from '../../../store/useBodyMetricsStore';

export const MetricsInputScreen = () => {
  const { addMetric, getLatestMetric } = useBodyMetricsStore();
  const latestMetric = getLatestMetric();
  
  const [weight, setWeight] = useState(latestMetric ? latestMetric.weight.toString() : '');
  const [bodyFat, setBodyFat] = useState(latestMetric?.bodyFatPercentage ? latestMetric.bodyFatPercentage.toString() : '');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    const parsedWeight = parseFloat(weight);
    const parsedBodyFat = bodyFat ? parseFloat(bodyFat) : undefined;
    
    if (!isNaN(parsedWeight) && parsedWeight > 0) {
      addMetric(parsedWeight, parsedBodyFat, notes);
      // Reset inputs after save (optional, or just show a success message)
      setNotes('');
      alert('Metrics saved successfully!');
    } else {
      alert('Please enter a valid weight.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log Body Metrics</Text>
      
      <View style={styles.card}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Weight (kg)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="e.g. 75.5"
            placeholderTextColor="#666"
            value={weight}
            onChangeText={setWeight}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Body Fat (%)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="Optional"
            placeholderTextColor="#666"
            value={bodyFat}
            onChangeText={setBodyFat}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={styles.input}
            placeholder="How are you feeling today?"
            placeholderTextColor="#666"
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save Entry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 16,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#111',
    padding: 20,
    borderRadius: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#222',
    color: '#fff',
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: '#ff4444',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
