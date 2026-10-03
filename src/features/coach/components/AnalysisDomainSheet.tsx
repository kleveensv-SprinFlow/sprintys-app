import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  AnalysisDomain,
  ALL_DOMAINS,
  getAthleteDomainAvailability,
} from '../../../services/athleteAnalysisContext';

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
  training: { title: 'Entraînements', subtitle: 'Séances, charges, chronos, assiduité', icon: 'zap', color: '#2563EB', bg: '#EFF6FF', empty: 'Aucune séance' },
  nutrition: { title: 'Nutrition', subtitle: 'Kcal, macros, repas', icon: 'coffee', color: '#EA580C', bg: '#FFF7ED', empty: 'Aucun repas saisi' },
  wellness: { title: 'Forme', subtitle: 'Sommeil, fatigue, stress, douleurs', icon: 'heart', color: '#059669', bg: '#ECFDF5', empty: 'Aucun check-in' },
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

  if (!athlete) return null;

  const isAvailable = (d: AnalysisDomain) => availability === null || availability[d];
  const availableDomains = ALL_DOMAINS.filter(isAvailable);

  const toggle = (d: AnalysisDomain) => {
    if (!isAvailable(d)) return;
    Haptics.selectionAsync();
    setSelected(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]));
  };

  const allSelected = availableDomains.length > 0 && availableDomains.every(d => selected.includes(d));

  const selectAll = () => {
    Haptics.selectionAsync();
    setSelected(allSelected ? [] : availableDomains);
  };

  const launch = () => {
    if (selected.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLaunch(athlete, ALL_DOMAINS.filter(d => selected.includes(d)));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Athlète */}
          <View style={styles.athleteRow}>
            {athlete.avatarUrl ? (
              <Image source={{ uri: athlete.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="person" size={28} color="#94A3B8" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>ANALYSER</Text>
              <Text style={styles.athleteName} numberOfLines={1}>{athlete.fullName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={18} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <View style={styles.titleRow}>
            <Text style={styles.question}>Que veux-tu analyser ?</Text>
            {availability === null && <ActivityIndicator size="small" color="#94A3B8" />}
          </View>

          {/* Tuiles domaines */}
          <View style={styles.grid}>
            {ALL_DOMAINS.map(d => {
              const meta = DOMAIN_META[d];
              const active = selected.includes(d);
              const available = isAvailable(d);
              return (
                <TouchableOpacity
                  key={d}
                  activeOpacity={available ? 0.8 : 1}
                  onPress={() => toggle(d)}
                  style={[
                    styles.tile,
                    active && { borderColor: meta.color, backgroundColor: meta.bg },
                    !available && styles.tileDisabled,
                  ]}
                >
                  <View style={styles.tileTop}>
                    <View style={[styles.tileIcon, { backgroundColor: available ? meta.bg : '#F1F5F9' }]}>
                      <Feather name={meta.icon} size={18} color={available ? meta.color : '#CBD5E1'} />
                    </View>
                    <View style={[styles.check, active && { backgroundColor: meta.color, borderColor: meta.color }]}>
                      {active && <Feather name="check" size={12} color="#FFF" />}
                    </View>
                  </View>
                  <Text style={[styles.tileTitle, !available && { color: '#94A3B8' }]}>{meta.title}</Text>
                  <Text style={styles.tileSubtitle} numberOfLines={2}>
                    {available ? meta.subtitle : meta.empty}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Actions */}
          <TouchableOpacity style={styles.allBtn} onPress={selectAll} activeOpacity={0.8} disabled={availableDomains.length === 0}>
            <Feather name={allSelected ? 'minus-square' : 'layers'} size={16} color="#0F172A" />
            <Text style={styles.allBtnText}>{allSelected ? 'Tout désélectionner' : 'Analyse complète'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.launchBtn, selected.length === 0 && styles.launchBtnDisabled]}
            onPress={launch}
            activeOpacity={0.85}
            disabled={selected.length === 0}
          >
            <Feather name="cpu" size={18} color={selected.length === 0 ? '#94A3B8' : '#FFFFFF'} />
            <Text style={[styles.launchText, selected.length === 0 && { color: '#94A3B8' }]}>
              {selected.length === 0 ? 'Choisis au moins un domaine' : `Lancer l'analyse (${selected.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 34,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 16 },
  athleteRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F1F5F9', borderWidth: 2, borderColor: '#E2E8F0' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 1 },
  athleteName: { fontSize: 19, fontWeight: '800', color: '#0F172A', marginTop: 2 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  question: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  tile: {
    width: '48.5%',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  tileDisabled: { backgroundColor: '#F8FAFC', borderStyle: 'dashed' },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tileIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  tileTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 3 },
  tileSubtitle: { fontSize: 11, color: '#64748B', lineHeight: 15 },
  allBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    marginBottom: 10,
  },
  allBtnText: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  launchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#0F172A',
  },
  launchBtnDisabled: { backgroundColor: '#E2E8F0' },
  launchText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
});
