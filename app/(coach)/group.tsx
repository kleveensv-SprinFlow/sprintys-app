import { useAuthStore } from '../../src/store/authStore';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Image, Share, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { theme } from '../../src/core/theme';
import { glassCard } from '../../src/core/glass';
import { Header } from '../../src/shared/components/Header';
import { useCoachStore, TeamMember } from '../../src/store/coach/coachStore';
import { GlassScreen } from '../../src/shared/components/GlassScreen';
import { GlassSheen } from '../../src/shared/components/GlassSheen';
import { PressableScale } from '../../src/shared/components/PressableScale';
import { SegmentedControl } from '../../src/shared/components/SegmentedControl';
import { IconButton } from '../../src/shared/components/IconButton';
import { ListRow } from '../../src/shared/components/ListRow';
import { EmptyState } from '../../src/shared/components/EmptyState';
import { SkeletonCard } from '../../src/shared/components/Skeleton';
import { BottomSheet } from '../../src/shared/components/BottomSheet';
import { Input } from '../../src/shared/components/Input';
import { Button } from '../../src/shared/components/Button';
import { useTabBarSpace } from '../../src/shared/hooks/useTabBarSpace';
import { useFrostedHeader } from '../../src/shared/hooks/useFrostedHeader';
import { useRefresh } from '../../src/shared/hooks/useRefresh';
import { appAlert, confirmAsync, toast } from '../../src/shared/feedback/appAlert';

import { tourRef } from '../../src/features/onboarding/tourRegistry';
type Tab = 'members' | 'subgroups' | 'pending' | 'settings';
type NameSheet = { kind: 'create_team' | 'rename_team' | 'create_sg' | 'rename_sg'; id?: string; value: string } | null;

const NAME_SHEETS = {
  create_team: { title: 'Nouveau groupe', placeholder: 'Ex. Groupe sprint', cta: 'Créer le groupe' },
  rename_team: { title: 'Renommer le groupe', placeholder: 'Nom du groupe', cta: 'Enregistrer' },
  create_sg: { title: 'Nouveau sous-groupe', placeholder: 'Ex. Juniors, 100 m, Haies', cta: 'Ajouter' },
  rename_sg: { title: 'Renommer le sous-groupe', placeholder: 'Nom du sous-groupe', cta: 'Enregistrer' },
};

const nameOf = (m?: TeamMember | null) =>
  m?.profile?.full_name || `${m?.profile?.first_name || ''} ${m?.profile?.last_name || ''}`.trim() || 'Athlète';

const Avatar = ({ member, size = 44 }: { member: TeamMember; size?: number }) => (
  <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
    {member.profile?.avatar_url ? (
      <Image source={{ uri: member.profile.avatar_url }} style={{ width: size, height: size }} />
    ) : (
      <Text style={[styles.avatarInitial, { fontSize: size * 0.38 }]}>{nameOf(member).charAt(0).toUpperCase()}</Text>
    )}
  </View>
);

/** Runs a store action, then shows a toast based on the store's error flag (actions never throw). */
const runAction = async (action: () => Promise<unknown>, success: string, failure: string) => {
  useCoachStore.setState({ error: null });
  await action();
  if (useCoachStore.getState().error) toast('error', failure, 'Oups');
  else toast('success', success);
};

export default function CoachGroupsScreen() {
  const router = useRouter();
  const tabBarSpace = useTabBarSpace();
  const { scrollY, scrollProps } = useFrostedHeader();
  const {
    teams, fetchTeams, createTeam, updateTeam, deleteTeam,
    subgroups, fetchSubgroups, createSubgroup, updateSubgroup, deleteSubgroup,
    teamMembers, pendingMembers, fetchTeamMembers, approveAthlete, rejectAthlete, removeAthlete, assignSubgroup,
    subscribeToTeam, unsubscribe, hasFetchedTeams,
  } = useCoachStore();

  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('members');
  const [nameSheet, setNameSheet] = useState<NameSheet>(null);
  const [saving, setSaving] = useState(false);
  const [athlete, setAthlete] = useState<TeamMember | null>(null);
  const [pickSubgroup, setPickSubgroup] = useState(false);
  useEffect(() => {
    if (!athlete) setPickSubgroup(false);
  }, [athlete]);
  const [busyIds, setBusyIds] = useState<string[]>([]);

  // Reloaded once the account is known (a cold start can mount this tab before the session is restored)
  const userId = useAuthStore((st) => st.user?.id);
  useEffect(() => {
    if (userId) fetchTeams();
  }, [userId]);

  useEffect(() => {
    if (!activeTeamId) return;
    // The group opened here becomes the one the rest of the app works on
    useCoachStore.setState({ selectedTeamId: activeTeamId });
    setTab('members');
    fetchTeamMembers(activeTeamId);
    fetchSubgroups(activeTeamId);
    subscribeToTeam(activeTeamId);
    return () => unsubscribe();
  }, [activeTeamId]);

  const refreshControl = useRefresh(async () => {
    await fetchTeams();
    if (activeTeamId) await Promise.all([fetchTeamMembers(activeTeamId), fetchSubgroups(activeTeamId)]);
  });

  const activeTeam = teams.find((t) => t.id === activeTeamId);
  const teamPending = pendingMembers.filter((m) => m.team_id === activeTeamId);

  const copyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    toast('success', 'Code copié');
  };

  const shareCode = (name: string, code: string) =>
    Share.share({ message: `Rejoins le groupe « ${name} » sur Sprintys avec le code ${code}` }).catch(() => undefined);

  const saveName = async () => {
    if (!nameSheet || !nameSheet.value.trim() || saving) return;
    const value = nameSheet.value.trim();
    setSaving(true);
    const { kind, id } = nameSheet;
    if (kind === 'create_team') await runAction(() => createTeam(value), 'Groupe créé', 'Impossible de créer le groupe.');
    if (kind === 'rename_team' && activeTeamId) await runAction(() => updateTeam(activeTeamId, value), 'Groupe renommé', 'Impossible de renommer le groupe.');
    if (kind === 'create_sg' && activeTeamId) await runAction(() => createSubgroup(activeTeamId, value), 'Sous-groupe ajouté', 'Impossible d’ajouter le sous-groupe.');
    if (kind === 'rename_sg' && id) await runAction(() => updateSubgroup(id, value), 'Sous-groupe renommé', 'Impossible de renommer le sous-groupe.');
    setSaving(false);
    setNameSheet(null);
  };

  const withBusy = async (id: string, fn: () => Promise<void>) => {
    setBusyIds((b) => [...b, id]);
    await fn();
    setBusyIds((b) => b.filter((x) => x !== id));
  };

  const handleDeleteTeam = async () => {
    if (!activeTeam) return;
    const ok = await confirmAsync({
      title: `Supprimer « ${activeTeam.name} » ?`,
      message: 'Le groupe, ses sous-groupes et les accès des athlètes seront supprimés. C’est définitif.',
      confirmText: 'Supprimer le groupe',
      destructive: true,
    });
    if (!ok) return;
    await runAction(() => deleteTeam(activeTeam.id), 'Groupe supprimé', 'Impossible de supprimer le groupe.');
    setActiveTeamId(null);
  };

  const handleRemove = async (member: TeamMember) => {
    if (!activeTeamId) return;
    const ok = await confirmAsync({
      title: `Exclure ${nameOf(member)} ?`,
      message: 'Il n’aura plus accès au groupe ni à tes séances.',
      confirmText: 'Exclure',
      destructive: true,
      icon: 'user-x',
    });
    if (!ok) return;
    setAthlete(null);
    await runAction(() => removeAthlete(member.user_id, activeTeamId), 'Athlète retiré du groupe', 'Impossible d’exclure cet athlète.');
  };

  // ---------- List of groups ----------
  const renderTeamList = () => (
    <Animated.ScrollView
      {...scrollProps}
      refreshControl={refreshControl}
      contentContainerStyle={[styles.content, { paddingBottom: tabBarSpace }]}
      showsVerticalScrollIndicator={false}
    >
      {!hasFetchedTeams ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : teams.length === 0 ? (
        <View style={[glassCard, styles.card]}>
          <GlassSheen radius={22} />
          <EmptyState
            icon="users"
            title="Aucun groupe pour l’instant"
            message="Crée un groupe : tes athlètes le rejoignent avec son code d’invitation."
            actionLabel="Créer un groupe"
            onAction={() => setNameSheet({ kind: 'create_team', value: '' })}
          />
        </View>
      ) : (
        teams.map((team) => (
          <PressableScale key={team.id} onPress={() => setActiveTeamId(team.id)} style={[glassCard, styles.teamCard]}>
            <GlassSheen radius={22} />
            <View style={styles.teamIcon}>
              <Feather name="users" size={20} color={theme.colors.sprintyBlue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.teamName} numberOfLines={1}>
                {team.name}
              </Text>
              <PressableScale haptic="selection" onPress={() => copyCode(team.invite_code)} style={styles.codeChip} hitSlop={8}>
                <Text style={styles.codeChipText}>{team.invite_code}</Text>
                <Feather name="copy" size={12} color={theme.colors.sprintyBlue} />
              </PressableScale>
            </View>
            <Feather name="chevron-right" size={20} color={theme.colors.textMuted} />
          </PressableScale>
        ))
      )}
    </Animated.ScrollView>
  );

  // ---------- One group ----------
  const renderMembers = () =>
    teamMembers.length === 0 ? (
      <EmptyState
        icon="user-plus"
        title="Personne pour l’instant"
        message="Partage le code du groupe : chaque athlète qui le saisit t’envoie une demande."
        actionLabel="Partager le code"
        onAction={() => activeTeam && shareCode(activeTeam.name, activeTeam.invite_code)}
      />
    ) : (
      <View style={[glassCard, styles.listCard]}>
        {teamMembers.map((m, i) => {
          const sg = subgroups.find((s) => s.id === m.subgroup_id);
          return (
            <PressableScale
              key={m.user_id}
              activeScale={0.985}
              onPress={() => setAthlete(m)}
              style={[styles.memberRow, i < teamMembers.length - 1 && styles.divider]}
            >
              <Avatar member={m} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.memberName} numberOfLines={1}>
                  {nameOf(m)}
                </Text>
                <Text style={styles.memberSub} numberOfLines={1}>
                  {sg ? sg.name : 'Sans sous-groupe'}
                </Text>
              </View>
              <Feather name="more-horizontal" size={20} color={theme.colors.textMuted} />
            </PressableScale>
          );
        })}
      </View>
    );

  const renderSubgroups = () => (
    <>
      {subgroups.length === 0 ? (
        <EmptyState
          icon="layers"
          title="Aucun sous-groupe"
          message="Crée des sous-groupes (100 m, Haies, Juniors…) pour adapter tes séances à chacun."
          actionLabel="Ajouter un sous-groupe"
          onAction={() => setNameSheet({ kind: 'create_sg', value: '' })}
        />
      ) : (
        <>
          <View style={[glassCard, styles.listCard]}>
            {subgroups.map((sg, i) => {
              const count = teamMembers.filter((m) => m.subgroup_id === sg.id).length;
              return (
                <View key={sg.id} style={[styles.memberRow, i < subgroups.length - 1 && styles.divider]}>
                  <View style={styles.sgIcon}>
                    <Feather name="tag" size={16} color={theme.colors.sprintyBlue} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {sg.name}
                    </Text>
                    <Text style={styles.memberSub}>{count === 0 ? 'Aucun athlète' : `${count} athlète${count > 1 ? 's' : ''}`}</Text>
                  </View>
                  <IconButton
                    icon="edit-2"
                    size={36}
                    tone="plain"
                    accessibilityLabel={`Renommer ${sg.name}`}
                    onPress={() => setNameSheet({ kind: 'rename_sg', id: sg.id, value: sg.name })}
                  />
                  <IconButton
                    icon="trash-2"
                    size={36}
                    tone="danger"
                    accessibilityLabel={`Supprimer ${sg.name}`}
                    onPress={async () => {
                      const ok = await confirmAsync({
                        title: `Supprimer « ${sg.name} » ?`,
                        message: 'Les athlètes restent dans le groupe, sans sous-groupe.',
                        confirmText: 'Supprimer',
                        destructive: true,
                      });
                      if (ok) await runAction(() => deleteSubgroup(sg.id), 'Sous-groupe supprimé', 'Impossible de supprimer ce sous-groupe.');
                    }}
                  />
                </View>
              );
            })}
          </View>
          <PressableScale onPress={() => setNameSheet({ kind: 'create_sg', value: '' })} style={styles.addRow}>
            <Feather name="plus" size={16} color={theme.colors.sprintyBlue} />
            <Text style={styles.addText}>Ajouter un sous-groupe</Text>
          </PressableScale>
        </>
      )}
    </>
  );

  const renderPending = () =>
    teamPending.length === 0 ? (
      <EmptyState icon="check-circle" title="Tout est à jour" message="Aucune demande en attente pour ce groupe." />
    ) : (
      <View style={[glassCard, styles.listCard]}>
        {teamPending.map((m, i) => {
          const busy = busyIds.includes(m.user_id);
          return (
            <View key={m.user_id} style={[styles.memberRow, i < teamPending.length - 1 && styles.divider]}>
              <Avatar member={m} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.memberName} numberOfLines={1}>
                  {nameOf(m)}
                </Text>
                <Text style={styles.memberSub}>Souhaite rejoindre le groupe</Text>
              </View>
              {busy ? (
                <ActivityIndicator color={theme.colors.sprintyBlue} style={{ width: 84 }} />
              ) : (
                <View style={styles.pendingActions}>
                  <IconButton
                    icon="x"
                    tone="danger"
                    accessibilityLabel={`Refuser ${nameOf(m)}`}
                    onPress={() =>
                      withBusy(m.user_id, () =>
                        runAction(() => rejectAthlete(m.user_id, m.team_id), 'Demande refusée', 'Impossible de refuser la demande.'),
                      )
                    }
                  />
                  <IconButton
                    icon="check"
                    tone="blue"
                    accessibilityLabel={`Accepter ${nameOf(m)}`}
                    onPress={() =>
                      withBusy(m.user_id, () =>
                        runAction(
                          () => approveAthlete(m.user_id, m.team_id),
                          `${nameOf(m)} a rejoint le groupe`,
                          'Impossible d’accepter la demande.',
                        ),
                      )
                    }
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>
    );

  const renderSettings = () =>
    activeTeam && (
      <>
        <View style={[glassCard, styles.listCard]}>
          <ListRow
            icon="edit-3"
            title="Renommer le groupe"
            subtitle={activeTeam.name}
            onPress={() => setNameSheet({ kind: 'rename_team', value: activeTeam.name })}
          />
          <ListRow icon="share-2" title="Partager le code d’invitation" onPress={() => shareCode(activeTeam.name, activeTeam.invite_code)} last />
        </View>
        <View style={[glassCard, styles.listCard]}>
          <ListRow icon="trash-2" title="Supprimer le groupe" destructive onPress={handleDeleteTeam} last chevron={false} />
        </View>
      </>
    );

  const renderTeamDetails = () =>
    activeTeam && (
      <Animated.ScrollView
        {...scrollProps}
        refreshControl={refreshControl}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarSpace }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[glassCard, styles.codeCard]}>
          <GlassSheen radius={22} />
          <View style={{ flex: 1 }}>
            <Text style={styles.codeLabel}>CODE D’INVITATION</Text>
            <Text style={styles.codeValue} selectable>
              {activeTeam.invite_code}
            </Text>
          </View>
          <IconButton icon="copy" tone="blue" size={42} accessibilityLabel="Copier le code" onPress={() => copyCode(activeTeam.invite_code)} />
          <IconButton
            icon="share-2"
            tone="blue"
            size={42}
            accessibilityLabel="Partager le code"
            onPress={() => shareCode(activeTeam.name, activeTeam.invite_code)}
          />
        </View>

        <SegmentedControl
          style={styles.segments}
          options={[
            { key: 'members' as Tab, label: 'Athlètes' },
            { key: 'subgroups' as Tab, label: 'Groupes' },
            { key: 'pending' as Tab, label: teamPending.length ? `Demandes ${teamPending.length}` : 'Demandes' },
            { key: 'settings' as Tab, label: 'Réglages' },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'members' && renderMembers()}
        {tab === 'subgroups' && renderSubgroups()}
        {tab === 'pending' && renderPending()}
        {tab === 'settings' && renderSettings()}
      </Animated.ScrollView>
    );

  const sheetCfg = nameSheet ? NAME_SHEETS[nameSheet.kind] : null;
  const currentSg = athlete ? subgroups.find((s) => s.id === athlete.subgroup_id) : null;

  return (
    <GlassScreen scrollY={scrollY}>
      {activeTeam ? (
        <Header
          title={activeTeam.name}
          showBackButton
          onBackPress={() => setActiveTeamId(null)}
          scrollY={scrollY}
          rightComponent={
            <IconButton icon="message-circle" accessibilityLabel="Discussion du groupe" onPress={() => router.push(`/chat/team/${activeTeam.id}`)} />
          }
        />
      ) : (
        <Header
          title="Équipe"
          large
          scrollY={scrollY}
          rightComponent={
            <IconButton
              icon="plus"
              tone="blue"
              accessibilityLabel="Créer un groupe"
              onPress={() => setNameSheet({ kind: 'create_team', value: '' })}
              targetRef={tourRef('coach.createGroup')}
            />
          }
        />
      )}

      {activeTeam ? renderTeamDetails() : renderTeamList()}

      {/* Create / rename */}
      <BottomSheet visible={!!nameSheet} onClose={() => setNameSheet(null)} title={sheetCfg?.title}>
        <View style={{ marginTop: 16 }}>
          <Input
            placeholder={sheetCfg?.placeholder}
            value={nameSheet?.value ?? ''}
            onChangeText={(v) => setNameSheet((s) => (s ? { ...s, value: v } : s))}
            autoFocus
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={saveName}
          />
          <Button title={sheetCfg?.cta ?? 'Enregistrer'} onPress={saveName} loading={saving} disabled={!nameSheet?.value.trim()} />
        </View>
      </BottomSheet>

      {/* Athlete actions, then subgroup picker inside the same sheet (two native modals cannot overlap on iOS) */}
      <BottomSheet
        visible={!!athlete}
        onClose={() => (pickSubgroup ? setPickSubgroup(false) : setAthlete(null))}
        title={pickSubgroup ? 'Sous-groupe' : undefined}
        subtitle={pickSubgroup && athlete ? `Pour ${nameOf(athlete)}` : undefined}
      >
        {athlete && !pickSubgroup && (
          <>
            <View style={styles.athleteHead}>
              <Avatar member={athlete} size={56} />
              <View style={{ flex: 1 }}>
                <Text style={styles.athleteName} numberOfLines={1}>
                  {nameOf(athlete)}
                </Text>
                <Text style={styles.memberSub}>{currentSg ? currentSg.name : 'Sans sous-groupe'}</Text>
              </View>
            </View>
            <ListRow
              icon="heart"
              title="Voir sa forme"
              onPress={() => {
                const id = athlete.user_id;
                setAthlete(null);
                router.push(`/(coach)/athlete/${id}`);
              }}
            />
            <ListRow
              icon="message-circle"
              title="Envoyer un message"
              onPress={() => {
                const id = athlete.user_id;
                setAthlete(null);
                router.push(`/chat/direct/${id}`);
              }}
            />
            <ListRow
              icon="cpu"
              iconColor="#8B5CF6"
              title="Analyser avec Sprinty"
              onPress={() => {
                const a = athlete;
                setAthlete(null);
                router.navigate({
                  pathname: '/(coach)/chat',
                  params: {
                    athleteId: a.user_id,
                    athleteName: nameOf(a),
                    avatarUrl: a.profile?.avatar_url || '',
                    domains: 'training,nutrition,wellness,body',
                    ts: String(Date.now()),
                  },
                });
              }}
            />
            <ListRow icon="layers" title="Changer de sous-groupe" value={currentSg?.name} onPress={() => setPickSubgroup(true)} />
            <ListRow icon="user-x" title="Exclure du groupe" destructive chevron={false} onPress={() => handleRemove(athlete)} last />
          </>
        )}
        {athlete && pickSubgroup && (
          <View style={{ marginTop: 12 }}>
            {subgroups.length === 0 ? (
              <EmptyState compact icon="layers" title="Aucun sous-groupe" message="Crée-en un depuis l’onglet « Groupes »." />
            ) : (
              [{ id: null as string | null, name: 'Sans sous-groupe' }, ...subgroups].map((sg, i, all) => {
                const on = (athlete.subgroup_id ?? null) === sg.id;
                return (
                  <ListRow
                    key={sg.id ?? 'none'}
                    title={sg.name}
                    chevron={false}
                    last={i === all.length - 1}
                    value={on ? <Feather name="check" size={20} color={theme.colors.sprintyBlue} /> : undefined}
                    onPress={async () => {
                      if (!activeTeamId) return;
                      const target = athlete;
                      setAthlete(null);
                      if (!on)
                        await runAction(
                          () => assignSubgroup(target.user_id, activeTeamId, sg.id),
                          'Sous-groupe mis à jour',
                          'Impossible de changer le sous-groupe.',
                        );
                    }}
                  />
                );
              })
            )}
          </View>
        )}
      </BottomSheet>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4 },
  card: { marginBottom: 12 },
  teamCard: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, marginBottom: 12 },
  teamIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamName: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, color: theme.colors.text },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 105, 232, 0.08)',
  },
  codeChipText: { fontSize: 13, fontWeight: '700', letterSpacing: 1, color: theme.colors.sprintyBlue },
  codeCard: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16, marginBottom: 14 },
  codeLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: theme.colors.textSecondary },
  codeValue: { fontSize: 26, fontWeight: '800', letterSpacing: 3, color: theme.colors.text, marginTop: 2 },
  segments: { marginBottom: 14 },
  listCard: { paddingVertical: 4, marginBottom: 12 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 10 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.hairline },
  avatar: {
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInitial: { fontWeight: '800', color: theme.colors.sprintyBlue },
  memberName: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  memberSub: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  sgIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 105, 232, 0.08)',
  },
  addText: { fontSize: 15, fontWeight: '700', color: theme.colors.sprintyBlue },
  pendingActions: { flexDirection: 'row', gap: 10 },
  athleteHead: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  athleteName: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, color: theme.colors.text },
});
