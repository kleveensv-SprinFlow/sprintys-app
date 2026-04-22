import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

const WorkoutScreen = () => {
  return (
    <View style={styles.container}>
      {/* Background with light effects */}
      <View style={styles.lightBackground}>
        <View style={[styles.lightCircle, styles.cyanCircle]} />
        <View style={[styles.lightCircle, styles.purpleCircle]} />
      </View>
      <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Mes Séances</Text>
        </View>

        {/* Add Session Button */}
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>Ajouter une séance +</Text>
        </TouchableOpacity>

        {/* Empty State */}
        <View style={styles.emptyContainer}>
          <BlurView intensity={20} tint="default" style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🏃‍♂️</Text>
            <Text style={styles.emptyText}>
              Aucune séance enregistrée.{"\n"}Il est temps de transpirer !
            </Text>
          </BlurView>
        </View>

        {/* Space for bottom tabs */}
        <View style={{ height: 100 }} />
      </ScrollView>
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
    opacity: 0.3,
  },
  cyanCircle: {
    top: -50,
    right: -50,
    backgroundColor: '#32ADE6',
  },
  purpleCircle: {
    bottom: 100,
    left: -50,
    backgroundColor: '#BF5AF2',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  addButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  addButtonText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '700',
  },
  emptyContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  emptyCard: {
    padding: 40,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
});

export default WorkoutScreen;
