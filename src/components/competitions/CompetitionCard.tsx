import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../core/theme';
import * as Haptics from 'expo-haptics';
import { FoundCompetition } from '../../services/competitionSearchService';

interface CompetitionCardProps {
  competition: FoundCompetition;
  onAddToCalendar: (competition: FoundCompetition) => void;
}

export const CompetitionCard: React.FC<CompetitionCardProps> = ({
  competition,
  onAddToCalendar,
}) => {
  const theme = useTheme();

  const handleOpenMaps = async () => {
    Haptics.selectionAsync();
    try {
      await Linking.openURL(competition.googleMapsUrl);
    } catch (e) {
      console.warn('Unable to open maps url:', e);
    }
  };

  const handleOpenTimetable = async () => {
    if (!competition.timetableUrl) return;
    Haptics.selectionAsync();
    try {
      await Linking.openURL(competition.timetableUrl);
    } catch (e) {
      console.warn('Unable to open timetable url:', e);
    }
  };

  const formattedDate = (() => {
    try {
      const d = new Date(competition.date);
      if (isNaN(d.getTime())) return competition.date;
      return d.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return competition.date;
    }
  })();

  const cleanLevel = (lvl?: string) => {
    if (!lvl) return 'Compétition';
    const l = lvl.toLowerCase();
    if (l.includes('world athletics')) return 'World Athletics';
    if (l.includes('national')) return 'National Élite';
    if (l.includes('interrégional') || l.includes('interregional')) return 'Interrégional';
    if (l.includes('régional') || l.includes('regional')) return 'Régional';
    if (l.includes('départemental') || l.includes('departemental')) return 'Départemental';
    return lvl.split('/')[0].trim();
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.surfaceLight }]}>
      {/* Header : Niveau / Label & Date */}
      <View style={styles.cardHeader}>
        <View style={[styles.badge, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
          <Ionicons name="trophy-outline" size={12} color="#3B82F6" style={{ marginRight: 4 }} />
          <Text style={[styles.badgeText, { color: '#3B82F6' }]} numberOfLines={1}>
            {cleanLevel(competition.level)}
          </Text>
        </View>

        <View style={styles.dateRow}>
          <Feather name="calendar" size={12} color={theme.colors.textMuted} style={{ marginRight: 4 }} />
          <Text style={[styles.dateText, { color: theme.colors.textMuted }]}>{formattedDate}</Text>
        </View>
      </View>

      {/* Titre de la compétition */}
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {competition.title}
      </Text>

      {/* Lieu : Nom du stade & Bouton Google Maps */}
      <View style={[styles.sectionRow, { backgroundColor: theme.colors.background }]}>
        <View style={styles.sectionIcon}>
          <Ionicons name="location" size={18} color="#EF4444" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {competition.stadiumName || 'Stade d\'Athlétisme'}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {competition.location}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.mapsBtn, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}
          onPress={handleOpenMaps}
          activeOpacity={0.7}
        >
          <Ionicons name="map-outline" size={14} color="#EF4444" style={{ marginRight: 4 }} />
          <Text style={styles.mapsBtnText}>Maps</Text>
        </TouchableOpacity>
      </View>

      {/* Horaires / PDF Pièce jointe */}
      <View style={[styles.sectionRow, { backgroundColor: theme.colors.background, marginTop: 8 }]}>
        <View style={styles.sectionIcon}>
          <MaterialCommunityIcons
            name={competition.timetableUrl ? "file-document-outline" : "clock-alert-outline"}
            size={18}
            color={competition.timetableUrl ? theme.colors.accent : theme.colors.textMuted}
          />
        </View>

        {competition.timetableUrl ? (
          <TouchableOpacity
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            onPress={handleOpenTimetable}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: theme.colors.accent }]}>
                Programme & Horaires (PDF / Web)
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]} numberOfLines={1}>
                Consulter les horaires officiels des épreuves
              </Text>
            </View>
            <Feather name="external-link" size={15} color={theme.colors.accent} />
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }}>
            <Text style={[styles.missingTimetableText, { color: theme.colors.textMuted }]}>
              Pas d'info sur les horaires pour le moment
            </Text>
          </View>
        )}
      </View>

      {/* Action : Ajouter au calendrier */}
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: '#0F172A' }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onAddToCalendar(competition);
        }}
        activeOpacity={0.8}
      >
        <Feather name="calendar" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={styles.actionBtnText}>Ajouter au calendrier de l'équipe</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 1,
    maxWidth: '56%',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 22,
    marginBottom: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
  },
  sectionIcon: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  mapsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  missingTimetableText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 14,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
