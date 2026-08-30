import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useCheckInStore } from '../../../store/checkInStore';
import { useAuthStore } from '../../../store/authStore';

interface Props {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export const CheckInSummaryModal = ({ visible, onClose, onEdit }: Props) => {
  const theme = useTheme();
  const { history, todayHealthScore } = useCheckInStore();
  const { user } = useAuthStore();
  
  const today = new Date().toISOString().split('T')[0];
  const todayCheckIn = history.find(c => c.date === today);

  if (!todayCheckIn) return null;

  const getScoreColor = (score: number) => {
    if (score >= 70) return theme.colors.success;
    if (score >= 40) return theme.colors.warning;
    return theme.colors.error;
  };

  const overallColor = getScoreColor(todayHealthScore || 0);

  const ScoreGauge = ({ label, score, icon }: { label: string, score: number, icon: any }) => (
    <View style={[styles.gaugeCard, { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border }]}>
      <View style={styles.gaugeHeader}>
        <Feather name={icon} size={20} color={theme.colors.textSecondary} />
        <Text style={[styles.gaugeLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[styles.gaugeScore, { color: getScoreColor(score) }]}>{Math.round(score)} / 100</Text>
      <View style={[styles.progressBarBg, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.progressBarFill, { width: `${score}%`, backgroundColor: getScoreColor(score) }]} />
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.colors.text }]}>Bilan du Jour</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            <View style={styles.overallContainer}>
              <View style={[styles.overallCircle, { borderColor: overallColor }]}>
                <Text style={[styles.overallScoreText, { color: overallColor }]}>{todayHealthScore}</Text>
              </View>
              <Text style={[styles.overallTitle, { color: theme.colors.text }]}>Forme Globale</Text>
              <Text style={[styles.overallDesc, { color: theme.colors.textSecondary }]}>
                {todayHealthScore! >= 70 ? 'Excellente disposition pour s\'entraîner fort aujourd\'hui.' :
                 todayHealthScore! >= 40 ? 'Forme moyenne, adapte l\'intensité si besoin.' :
                 'Fatigue prononcée, privilégie la récupération ou le repos.'}
              </Text>
            </View>

            <View style={styles.gaugesContainer}>
              <ScoreGauge label="Sommeil" score={todayCheckIn.sleep_score || 0} icon="moon" />
              <ScoreGauge label="Physique" score={todayCheckIn.physical_score || 0} icon="activity" />
              <ScoreGauge label="Mental" score={todayCheckIn.mental_score || 0} icon="smile" />
            </View>

            <TouchableOpacity 
              style={[styles.editButton, { backgroundColor: theme.colors.accent }]} 
              onPress={() => {
                onClose();
                onEdit();
              }}
            >
              <Feather name="edit-2" size={20} color="#FFF" />
              <Text style={styles.editButtonText}>Modifier mon Check-In</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '90%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  closeBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 24,
  },
  overallContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  overallCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  overallScoreText: {
    fontSize: 42,
    fontWeight: 'bold',
  },
  overallTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  overallDesc: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  gaugesContainer: {
    gap: 16,
    marginBottom: 32,
  },
  gaugeCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  gaugeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  gaugeLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  gaugeScore: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
  },
  editButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
