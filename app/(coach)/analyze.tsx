import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ScrollView,
  TextInput,
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
import { GlowBackground } from '../../src/shared/components/GlowBackground';
import { glassSurface } from '../../src/core/glass';
import { theme } from '../../src/core/theme';
import { PressableScale } from '../../src/shared/components/PressableScale';
import { IconButton } from '../../src/shared/components/IconButton';
import { Skeleton } from '../../src/shared/components/Skeleton';

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
      <PressableScale
        containerStyle={styles.cardCell}
        style={styles.card}
        onPress={() => setSelectedAthlete(item)}
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
            <Ionicons name="person" size={38} color={theme.colors.textMuted} />
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
          <Feather name="cpu" size={12} color={theme.colors.text} />
          <Text style={styles.analyzeHintText}>Analyser</Text>
        </View>
      </PressableScale>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <GlowBackground />
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="chevron-left" size={40} accessibilityLabel="Retour" onPress={() => router.navigate('/(coach)/chat')} style={styles.backBtn} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Analyser un athlète</Text>
          <Text style={styles.subtitle}>
            {athletes.length} athlète{athletes.length > 1 ? 's' : ''} · touche une carte pour lancer Sprinty
          </Text>
        </View>
      </View>

      {/* Recherche */}
      <View style={styles.searchBox}>
        <Feather name="search" size={16} color={theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un athlète…"
          placeholderTextColor={theme.colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <IconButton icon="x-circle" tone="plain" size={32} color={theme.colors.textMuted} accessibilityLabel="Effacer la recherche" onPress={() => setSearch('')} />
        )}
      </View>

      {/* Onglets équipes */}
      {tabs.length > 0 && (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
            {tabs.map(tab => {
              const active = tab.id === activeTab;
              return (
                <PressableScale
                  key={tab.id}
                  haptic="selection"
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => setActiveTab(tab.id)}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.name}</Text>
                  <View style={[styles.tabCount, active && styles.tabCountActive]}>
                    <Text style={[styles.tabCountText, active && { color: theme.colors.sprintyBlue }]}>{countForTab(tab.id)}</Text>
                  </View>
                </PressableScale>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Grille 2x2 */}
      {isLoading ? (
        <View style={styles.skeletonGrid}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width="48.5%" height={170} radius={22} />
          ))}
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
                <Feather name="users" size={26} color={theme.colors.textMuted} />
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
  container: { flex: 1, backgroundColor: theme.colors.backdrop },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 },
  backBtn: {
    ...glassSurface,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
  subtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  searchBox: {
    ...glassSurface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 14,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.text },
  tabs: { paddingHorizontal: 20, gap: 8, paddingBottom: 14 },
  tab: {
    ...glassSurface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabActive: { backgroundColor: theme.colors.sprintyBlue, borderColor: theme.colors.sprintyBlue },
  tabText: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary },
  tabTextActive: { color: '#FFFFFF' },
  tabCount: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: theme.colors.glassFill, alignItems: 'center', justifyContent: 'center' },
  tabCountActive: { backgroundColor: '#FFFFFF' },
  tabCountText: { fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  row: { gap: 12, marginBottom: 12 },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, paddingHorizontal: 20, paddingTop: 4 },
  cardCell: { flex: 1, maxWidth: '48.5%' },
  card: {
    ...glassSurface,
    flex: 1,
    alignItems: 'center',
    borderRadius: 22,
    paddingTop: 20,
    paddingBottom: 14,
    paddingHorizontal: 10,
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
  cardAvatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: theme.colors.glassFill, borderWidth: 2, borderColor: theme.colors.glassBorder, marginBottom: 10 },
  cardAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  firstName: { fontSize: 15, fontWeight: '800', color: theme.colors.text, maxWidth: '100%' },
  lastName: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary, marginTop: 1, maxWidth: '100%' },
  teamLabel: { fontSize: 10, fontWeight: '600', color: theme.colors.textSecondary, marginTop: 4, maxWidth: '100%' },
  analyzeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: theme.colors.glassFill,
  },
  analyzeHintText: { fontSize: 11, fontWeight: '700', color: theme.colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 30 },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: theme.colors.glassFill, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 6 },
  emptyText: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 19 },
});
