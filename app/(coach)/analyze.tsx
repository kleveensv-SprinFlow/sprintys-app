import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/store/authStore';
import { AnalysisDomain } from '../../src/services/athleteAnalysisContext';
import { AnalysisDomainSheet, AnalysisAthlete } from '../../src/features/coach/components/AnalysisDomainSheet';

interface TeamTab {
  id: string;
  name: string;
}

interface GridAthlete extends AnalysisAthlete {
  teamIds: string[];
  healthScore: number | null;
}

const ALL_TAB = '__all__';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const scoreTheme = (score: number | null) => {
  if (score === null) return null;
  if (score >= 70) return { text: '#059669', bg: '#ECFDF5' };
  if (score >= 40) return { text: '#D97706', bg: '#FFFBEB' };
  return { text: '#DC2626', bg: '#FEF2F2' };
};

export default function AnalyzeAthleteScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [teams, setTeams] = useState<TeamTab[]>([]);
  const [athletes, setAthletes] = useState<GridAthlete[]>([]);
  const [activeTab, setActiveTab] = useState<string>(ALL_TAB);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<AnalysisAthlete | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: teamRows } = await supabase
        .from('teams')
        .select('id, name')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: true });

      const teamList: TeamTab[] = (teamRows || []).map(t => ({ id: t.id, name: t.name }));
      setTeams(teamList);
      if (teamList.length === 1) setActiveTab(teamList[0].id);

      if (teamList.length === 0) {
        setAthletes([]);
        return;
      }

      const { data: members } = await supabase
        .from('team_members')
        .select('user_id, team_id, profiles:user_id (id, first_name, last_name, full_name, avatar_url)')
        .in('team_id', teamList.map(t => t.id))
        .eq('status', 'approved');

      // Un athlète peut être dans plusieurs équipes : on dédoublonne
      const byId = new Map<string, GridAthlete>();
      (members || []).forEach((m: any) => {
        const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        const existing = byId.get(m.user_id);
        if (existing) {
          existing.teamIds.push(m.team_id);
          return;
        }
        const firstName = prof?.first_name || (prof?.full_name ? String(prof.full_name).split(' ')[0] : 'Athlète');
        const lastName = prof?.last_name || (prof?.full_name ? String(prof.full_name).split(' ').slice(1).join(' ') : '');
        byId.set(m.user_id, {
          id: m.user_id,
          firstName,
          lastName,
          fullName: prof?.full_name || `${firstName} ${lastName}`.trim(),
          avatarUrl: prof?.avatar_url || null,
          teamIds: [m.team_id],
          healthScore: null,
        });
      });

      const ids = Array.from(byId.keys());
      if (ids.length > 0) {
        const { data: checkins } = await supabase
          .from('check_ins')
          .select('athlete_id, health_score')
          .in('athlete_id', ids)
          .eq('date', todayStr());
        (checkins || []).forEach((c: any) => {
          const a = byId.get(c.athlete_id);
          if (a && c.health_score !== null) a.healthScore = Math.round(Number(c.health_score));
        });
      }

      const sorted = Array.from(byId.values()).sort((a, b) =>
        a.firstName.localeCompare(b.firstName, 'fr', { sensitivity: 'base' })
      );
      setAthletes(sorted);
    } catch (e) {
      console.error('Error loading athletes for analysis:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return athletes.filter(a => {
      if (activeTab !== ALL_TAB && !a.teamIds.includes(activeTab)) return false;
      if (q && !a.fullName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [athletes, activeTab, search]);

  const countForTab = (tabId: string) =>
    tabId === ALL_TAB ? athletes.length : athletes.filter(a => a.teamIds.includes(tabId)).length;

  const handleLaunch = (athlete: AnalysisAthlete, domains: AnalysisDomain[]) => {
    setSelectedAthlete(null);
    router.navigate({
      pathname: '/(coach)/chat',
      params: {
        athleteId: athlete.id,
        athleteName: athlete.fullName,
        avatarUrl: athlete.avatarUrl || '',
        domains: domains.join(','),
        ts: String(Date.now()),
      },
    });
  };

  const tabs: TeamTab[] = teams.length > 1 ? [{ id: ALL_TAB, name: 'Toutes' }, ...teams] : teams;
  const teamName = (id: string) => teams.find(t => t.id === id)?.name || '';

  const renderAthlete = ({ item }: { item: GridAthlete }) => {
    const st = scoreTheme(item.healthScore);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedAthlete(item);
        }}
      >
        {st && (
          <View style={[styles.scoreBadge, { backgroundColor: st.bg }]}>
            <Feather name="activity" size={10} color={st.text} />
            <Text style={[styles.scoreText, { color: st.text }]}>{item.healthScore}%</Text>
          </View>
        )}
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.cardAvatar} />
        ) : (
          <View style={[styles.cardAvatar, styles.cardAvatarFallback]}>
            <Ionicons name="person" size={38} color="#94A3B8" />
          </View>
        )}
        <Text style={styles.firstName} numberOfLines={1}>{item.firstName}</Text>
        <Text style={styles.lastName} numberOfLines={1}>{item.lastName || ' '}</Text>
        {activeTab === ALL_TAB && teams.length > 1 && (
          <Text style={styles.teamLabel} numberOfLines={1}>
            {item.teamIds.map(teamName).join(' · ')}
          </Text>
        )}
        <View style={styles.analyzeHint}>
          <Feather name="cpu" size={12} color="#0F172A" />
          <Text style={styles.analyzeHintText}>Analyser</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.navigate('/(coach)/chat')}>
          <Feather name="chevron-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Analyser un athlète</Text>
          <Text style={styles.subtitle}>
            {athletes.length} athlète{athletes.length > 1 ? 's' : ''} · touche une carte pour lancer Sprinty
          </Text>
        </View>
      </View>

      {/* Recherche */}
      <View style={styles.searchBox}>
        <Feather name="search" size={16} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un athlète…"
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Feather name="x-circle" size={16} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Onglets équipes */}
      {tabs.length > 0 && (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
            {tabs.map(tab => {
              const active = tab.id === activeTab;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActiveTab(tab.id);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.name}</Text>
                  <View style={[styles.tabCount, active && styles.tabCountActive]}>
                    <Text style={[styles.tabCountText, active && { color: '#0F172A' }]}>{countForTab(tab.id)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Grille 2x2 */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0F172A" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderAthlete}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true);
                loadData();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Feather name="users" size={26} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>
                {teams.length === 0 ? 'Aucune équipe' : search ? 'Aucun résultat' : 'Aucun athlète'}
              </Text>
              <Text style={styles.emptyText}>
                {teams.length === 0
                  ? 'Crée une équipe et invite tes athlètes pour pouvoir les analyser.'
                  : search
                    ? 'Aucun athlète ne correspond à ta recherche.'
                    : 'Aucun athlète approuvé dans cette équipe pour le moment.'}
              </Text>
            </View>
          }
        />
      )}

      <AnalysisDomainSheet
        visible={!!selectedAthlete}
        athlete={selectedAthlete}
        onClose={() => setSelectedAthlete(null)}
        onLaunch={handleLaunch}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A' },
  tabs: { paddingHorizontal: 20, gap: 8, paddingBottom: 14 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  tabTextActive: { color: '#FFFFFF' },
  tabCount: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  tabCountActive: { backgroundColor: '#FFFFFF' },
  tabCountText: { fontSize: 11, fontWeight: '800', color: '#64748B' },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  row: { gap: 12, marginBottom: 12 },
  card: {
    flex: 1,
    maxWidth: '48.5%',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingTop: 20,
    paddingBottom: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  scoreBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  scoreText: { fontSize: 10, fontWeight: '800' },
  cardAvatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#F1F5F9', borderWidth: 2, borderColor: '#E2E8F0', marginBottom: 10 },
  cardAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  firstName: { fontSize: 15, fontWeight: '800', color: '#0F172A', maxWidth: '100%' },
  lastName: { fontSize: 13, fontWeight: '500', color: '#64748B', marginTop: 1, maxWidth: '100%' },
  teamLabel: { fontSize: 10, fontWeight: '600', color: '#94A3B8', marginTop: 4, maxWidth: '100%' },
  analyzeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  analyzeHintText: { fontSize: 11, fontWeight: '700', color: '#0F172A' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 30 },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 19 },
});
