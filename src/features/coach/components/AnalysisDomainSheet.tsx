import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  AnalysisDomain,
  ALL_DOMAINS,
  getAthleteDomainAvailability,
} from '../../../services/athleteAnalysisContext';
import { theme } from '../../../core/theme';
import { BottomSheet } from '../../../shared/components/BottomSheet';
import { IconButton } from '../../../shared/components/IconButton';
import { PressableScale } from '../../../shared/components/PressableScale';
import { Skeleton } from '../../../shared/components/Skeleton';

export interface AnalysisAthlete {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatarUrl?: string | null;
}

interface Props {
  visible: boolean;
  athlete: AnalysisAthlete | null;
  onClose: () => void;
  onLaunch: (athlete: AnalysisAthlete, domains: AnalysisDomain[]) => void;
}

const DOMAIN_META: Record<AnalysisDomain, { title: string; subtitle: string; icon: keyof typeof Feather.glyphMap; color: string; bg: string; empty: string }> = {
  training: { title: 'Entraînements', subtitle: 'Séances, charges, chronos, assiduité', icon: 'zap', color: '#0069E8', bg: '#EFF6FF', empty: 'Aucune séance' },
  nutrition: { title: 'Nutrition', subtitle: 'Kcal, macros, repas', icon: 'coffee', color: '#EA580C', bg: '#FFF7ED', empty: 'Aucun repas saisi' },
  wellness: { title: 'Forme', subtitle: 'Sommeil, fatigue, stress, douleurs', icon: 'heart', color: '#059669', bg: '#ECFDF5', empty: 'Aucun ressenti saisi' },
  body: { title: 'Poids / Compo', subtitle: 'Poids, masse grasse, muscle', icon: 'bar-chart-2', color: '#7C3AED', bg: '#F5F3FF', empty: 'Aucune pesée' },
};

export const AnalysisDomainSheet = ({ visible, athlete, onClose, onLaunch }: Props) => {
  const [selected, setSelected] = useState<AnalysisDomain[]>([]);
  const [availability, setAvailability] = useState<Record<AnalysisDomain, boolean> | null>(null);

  useEffect(() => {
    if (!visible || !athlete) return;
    setSelected([]);
    setAvailability(null);
    let cancelled = false;
    getAthleteDomainAvailability(athlete.id)
      .then(av => { if (!cancelled) setAvailability(av); })
      .catch(() => { if (!cancelled) setAvailability({ training: true, nutrition: true, wellness: true, body: true }); });
    return () => { cancelled = true; };
  }, [visible, athlete?.id]);

  const isAvailable = (d: AnalysisDomain) => availability === null || availability[d];
  const availableDomains = ALL_DOMAINS.filter(isAvailable);

  const toggle = (d: AnalysisDomain) => {
    if (!isAvailable(d)) return;
    setSelected(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]));
  };

  const allSelected = availableDomains.length > 0 && availableDomains.every(d => selected.includes(d));

  const selectAll = () => {
    setSelected(allSelected ? [] : availableDomains);
  };

  const launch = () => {
    if (!athlete || selected.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLaunch(athlete, ALL_DOMAINS.filter(d => selected.includes(d)));
  };

  const canLaunch = selected.length > 0;

  return (
    <BottomSheet visible={visible && !!athlete} onClose={onClose}>
      {athlete && (
        <>
          {/* Athlète */}
          <View style={styles.athleteRow}>
            {athlete.avatarUrl ? (
              <Image source={{ uri: athlete.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{(athlete.fullName || 'A').charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>Analyser</Text>
              <Text style={styles.athleteName} numberOfLines={1}>{athlete.fullName}</Text>
            </View>
            <IconButton icon="x" accessibilityLabel="Fermer" onPress={onClose} />
          </View>

          <View style={styles.titleRow}>
            <Text style={styles.question}>Que veux-tu analyser ?</Text>
            {availability === null && <Skeleton width={72} height={12} />}
          </View>

          {/* Tuiles domaines */}
          <View style={styles.grid}>
            {ALL_DOMAINS.map(d => {
              const meta = DOMAIN_META[d];
              const active = selected.includes(d);
              const available = isAvailable(d);
              return (
                <PressableScale
                  key={d}
                  haptic={available ? 'selection' : 'none'}
                  activeScale={available ? 0.97 : 1}
                  onPress={() => toggle(d)}
                  containerStyle={styles.tileCell}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active, disabled: !available }}
                  accessibilityLabel={meta.title}
                  style={[
                    styles.tile,
                    active && { borderColor: meta.color, backgroundColor: meta.bg },
                    !available && styles.tileDisabled,
                  ]}
                >
                  <View style={styles.tileTop}>
                    <View style={[styles.tileIcon, { backgroundColor: available ? meta.bg : theme.colors.glassFill }]}>
                      <Feather name={meta.icon} size={18} color={available ? meta.color : theme.colors.textMuted} />
                    </View>
                    <View style={[styles.check, active && { backgroundColor: meta.color, borderColor: meta.color }]}>
                      {active && <Feather name="check" size={12} color="#FFFFFF" />}
                    </View>
                  </View>
                  <Text style={[styles.tileTitle, !available && { color: theme.colors.textMuted }]}>{meta.title}</Text>
                  <Text style={styles.tileSubtitle} numberOfLines={2}>
                    {available ? meta.subtitle : meta.empty}
                  </Text>
                </PressableScale>
              );
            })}
          </View>

          {/* Actions */}
          <PressableScale
            haptic="selection"
            style={[styles.allBtn, availableDomains.length === 0 && { opacity: 0.5 }]}
            onPress={selectAll}
            disabled={availableDomains.length === 0}
            accessibilityRole="button"
          >
            <Feather name={allSelected ? 'minus-square' : 'layers'} size={16} color={theme.colors.sprintyBlue} />
            <Text style={styles.allBtnText}>{allSelected ? 'Tout désélectionner' : 'Analyse complète'}</Text>
          </PressableScale>

          <PressableScale
            haptic="none"
            style={[styles.launchBtn, !canLaunch && styles.launchBtnDisabled]}
            onPress={launch}
            disabled={!canLaunch}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canLaunch }}
          >
            <Feather name="cpu" size={18} color={canLaunch ? '#FFFFFF' : theme.colors.textMuted} />
            <Text style={[styles.launchText, !canLaunch && { color: theme.colors.textMuted }]}>
              {canLaunch ? `Lancer l’analyse (${selected.length})` : 'Choisis au moins un domaine'}
            </Text>
          </PressableScale>
        </>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  athleteRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(0, 105, 232, 0.1)', overflow: 'hidden' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 22, fontWeight: '800', color: theme.colors.sprintyBlue },
  kicker: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, letterSpacing: 0.6, textTransform: 'uppercase' },
  athleteName: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, color: theme.colors.text, marginTop: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  question: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  tileCell: { width: '48.5%' },
  tile: {
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 14,
  },
  tileDisabled: { backgroundColor: theme.colors.backdrop, borderStyle: 'dashed' },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tileIcon: { width: 36, height: 36, borderRadius: 12, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 3 },
  tileSubtitle: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 16 },
  allBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(0, 105, 232, 0.08)',
    marginBottom: 10,
  },
  allBtnText: { fontSize: 15, fontWeight: '700', color: theme.colors.sprintyBlue },
  launchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.sprintyBlue,
  },
  launchBtnDisabled: { backgroundColor: theme.colors.glassFill },
  launchText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
