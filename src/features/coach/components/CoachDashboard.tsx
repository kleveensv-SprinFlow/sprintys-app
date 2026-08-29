import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ActivityIndicator, FlatList, Alert, Modal, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';
import { useAuthStore } from '../../../store/authStore';
import { useCoachStore, Team, Subgroup } from '../../../store/coach/coachStore';
import { ProfileAvatar } from '../../../shared/components/ProfileAvatar';
import { useRouter } from 'expo-router';

export const CoachDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    teams, subgroups, isLoading, 
    fetchTeams, createTeam, 
    teamMembers, pendingMembers, fetchTeamMembers, 
    fetchSubgroups, createSubgroup, assignSubgroup,
    approveAthlete, rejectAthlete,
    subscribeToTeam, unsubscribe
  } = useCoachStore();
  const router = useRouter();

  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [selectedAthlete, setSelectedAthlete] = useState<any | null>(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [newSubgroupName, setNewSubgroupName] = useState('');
  const [isCreatingSubgroup, setIsCreatingSubgroup] = useState(false);

  const [qrModalVisible, setQrModalVisible] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (teams.length > 0 && !activeTeamId) {
      setActiveTeamId(teams[0].id);
    }
  }, [teams]);

  useEffect(() => {
    if (activeTeamId) {
      fetchTeamMembers(activeTeamId);
      fetchSubgroups(activeTeamId);
      subscribeToTeam(activeTeamId);
    }
    return () => {
      unsubscribe();
    };
  }, [activeTeamId]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    const newTeam = await createTeam(newTeamName.trim());
    if (newTeam) {
      setNewTeamName('');
      setIsCreating(false);
      setActiveTeamId(newTeam.id);
    }
  };

  const handleApprove = async (userId: string) => {
    if (!activeTeamId) return;
    await approveAthlete(userId, activeTeamId);
  };

  const handleReject = async (userId: string) => {
    if (!activeTeamId) return;
    Alert.alert('Refuser', 'Veux-tu refuser cette demande ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Refuser', style: 'destructive', onPress: () => rejectAthlete(userId, activeTeamId) }
    ]);
  };

  const activeTeam = teams.find(t => t.id === activeTeamId);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={styles.headerTop}>
            <Text style={styles.welcome}>ESPACE COACH</Text>
          </View>
          <Text style={styles.title}>Salut, {user?.name?.split(' ')[0]}</Text>
        </View>
        <ProfileAvatar onPress={() => router.push('/(coach)/profile')} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading && teams.length === 0 ? (
          <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 40 }} />
        ) : teams.length === 0 || isCreating ? (
          /* === CRÉATION DE GROUPE === */
          <View style={styles.createTeamCard}>
            <View style={styles.iconCircle}>
              <Feather name="shield" size={32} color={theme.colors.accent} />
            </View>
            <Text style={styles.createTitle}>Créer un groupe d'entraînement</Text>
            <Text style={styles.createSubtitle}>
              Un code à 8 chiffres sera généré automatiquement pour inviter tes athlètes.
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="Nom du groupe (ex: UAVH, Pôle France)"
              placeholderTextColor={theme.colors.textSecondary}
              value={newTeamName}
              onChangeText={setNewTeamName}
            />
            
            <TouchableOpacity style={styles.createButton} onPress={handleCreateTeam}>
              <Text style={styles.createButtonText}>Créer le groupe</Text>
            </TouchableOpacity>
            
            {isCreating && teams.length > 0 && (
              <TouchableOpacity style={{ marginTop: 15 }} onPress={() => setIsCreating(false)}>
                <Text style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>Annuler</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          /* === TABLEAU DE BORD DU GROUPE === */
          <View style={styles.teamContainer}>

            {/* En-tête du groupe avec code */}
            <View style={styles.teamHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.teamName}>{activeTeam?.name}</Text>
                <TouchableOpacity 
                  style={styles.codeBadge}
                  onPress={() => setQrModalVisible(true)}
                >
                  <Feather name="key" size={14} color={theme.colors.accent} />
                  <Text style={styles.codeText}>{activeTeam?.invite_code}</Text>
                  <Feather name="maximize" size={14} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => setIsCreating(true)} style={styles.addTeamButton}>
                <Feather name="plus" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* === SECTION DEMANDES EN ATTENTE === */}
            {pendingMembers.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <View style={styles.pendingBadge}>
                    <Feather name="bell" size={16} color={theme.colors.warning} />
                    <Text style={styles.pendingSectionTitle}>
                      Demandes en attente ({pendingMembers.length})
                    </Text>
                  </View>
                </View>

                {pendingMembers.map(member => (
                  <View key={member.user_id} style={styles.pendingCard}>
                    <View style={styles.pendingAvatar}>
                      <Text style={styles.pendingInitials}>
                        {member.profile?.first_name?.charAt(0) || '?'}
                        {member.profile?.last_name?.charAt(0) || ''}
                      </Text>
                    </View>
                    <View style={styles.pendingInfo}>
                      <Text style={styles.pendingName}>
                        {member.profile?.full_name || 'Athlète inconnu'}
                      </Text>
                      <Text style={styles.pendingStatus}>Souhaite rejoindre le groupe</Text>
                    </View>
                    <View style={styles.pendingActions}>
                      <TouchableOpacity 
                        style={styles.approveBtn}
                        onPress={() => handleApprove(member.user_id)}
                      >
                        <Feather name="check" size={20} color="#FFF" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.rejectBtn}
                        onPress={() => handleReject(member.user_id)}
                      >
                        <Feather name="x" size={20} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* === SECTION ATHLÈTES APPROUVÉS === */}
            <View style={[styles.sectionHeader, { marginTop: pendingMembers.length > 0 ? 24 : 0 }]}>
              <Text style={styles.sectionTitle}>Athlètes ({teamMembers.length})</Text>
            </View>

            {teamMembers.length === 0 ? (
              <View style={styles.emptyAthletes}>
                <Feather name="users" size={32} color={theme.colors.textMuted} style={{ marginBottom: 10 }} />
                <Text style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>
                  Aucun athlète dans ce groupe. Partage-leur le code {activeTeam?.invite_code}.
                </Text>
              </View>
            ) : (
              teamMembers.map(item => {
                const subgroup = subgroups.find(s => s.id === item.subgroup_id);
                return (
                  <TouchableOpacity 
                    key={item.user_id}
                    style={styles.athleteCard}
                    onPress={() => {
                      setSelectedAthlete(item);
                      setAssignModalVisible(true);
                    }}
                  >
                    <View style={styles.athleteAvatar}>
                      <Text style={styles.athleteInitials}>
                        {item.profile?.first_name?.charAt(0) || 'A'}
                        {item.profile?.last_name?.charAt(0) || ''}
                      </Text>
                    </View>
                    <View style={styles.athleteInfo}>
                      <Text style={styles.athleteName}>{item.profile?.full_name || 'Athlète inconnu'}</Text>
                      <Text style={styles.subgroupBadgeText}>
                        {subgroup ? subgroup.name : 'Non assigné'}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={20} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                );
              })
            )}

            {/* Espace pour la tabbar */}
            <View style={{ height: 120 }} />
          </View>
        )}
      </ScrollView>

      {/* === MODAL QR CODE === */}
      <Modal visible={qrModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Code d'invitation</Text>
              <TouchableOpacity onPress={() => setQrModalVisible(false)}>
                <Feather name="x" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.qrDesc}>
              Montre ce code ou dicte-le à tes athlètes pour qu'ils rejoignent "{activeTeam?.name}".
            </Text>
            <View style={styles.bigCodeContainer}>
              <Text style={styles.bigCode}>{activeTeam?.invite_code}</Text>
            </View>
            <Text style={styles.qrHint}>
              L'athlète entre ce code dans l'application et tu recevras une demande d'approbation.
            </Text>
          </View>
        </View>
      </Modal>

      {/* === MODAL ASSIGNATION SOUS-GROUPE === */}
      <Modal visible={assignModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Assigner {selectedAthlete?.profile?.first_name}
              </Text>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                <Feather name="x" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Choisis un sous-groupe :</Text>

            <ScrollView style={{ maxHeight: 200, marginBottom: 16 }}>
              <TouchableOpacity 
                style={[styles.subgroupOption, !selectedAthlete?.subgroup_id && styles.subgroupOptionSelected]}
                onPress={() => {
                  assignSubgroup(selectedAthlete.user_id, activeTeamId!, null);
                  setAssignModalVisible(false);
                }}
              >
                <Text style={styles.subgroupOptionText}>Aucun (Global)</Text>
              </TouchableOpacity>
              
              {subgroups.map(sg => (
                <TouchableOpacity 
                  key={sg.id}
                  style={[styles.subgroupOption, selectedAthlete?.subgroup_id === sg.id && styles.subgroupOptionSelected]}
                  onPress={() => {
                    assignSubgroup(selectedAthlete.user_id, activeTeamId!, sg.id);
                    setAssignModalVisible(false);
                  }}
                >
                  <Text style={styles.subgroupOptionText}>{sg.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {isCreatingSubgroup ? (
              <View style={styles.createSgRow}>
                <TextInput 
                  style={styles.sgInput} 
                  placeholder="Nom (ex: Sprint Court)" 
                  placeholderTextColor={theme.colors.textMuted}
                  value={newSubgroupName}
                  onChangeText={setNewSubgroupName}
                  autoFocus
                />
                <TouchableOpacity 
                  style={styles.sgSaveBtn}
                  onPress={async () => {
                    if (newSubgroupName.trim() && activeTeamId) {
                      await createSubgroup(activeTeamId, newSubgroupName.trim());
                      setNewSubgroupName('');
                      setIsCreatingSubgroup(false);
                    }
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>OK</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.createSgBtn} onPress={() => setIsCreatingSubgroup(true)}>
                <Feather name="plus" size={16} color={theme.colors.accent} />
                <Text style={styles.createSgText}>Créer un sous-groupe</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { padding: 24, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  welcome: { color: theme.colors.accent, fontSize: 12, fontWeight: 'bold', letterSpacing: 2 },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: 'bold', marginTop: 4 },
  content: { flex: 1, paddingHorizontal: 24 },
  
  // Création
  createTeamCard: {
    backgroundColor: theme.colors.surface, padding: 24, borderRadius: 20,
    borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', marginTop: 20,
  },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  createTitle: { color: theme.colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  createSubtitle: { color: theme.colors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  input: {
    width: '100%', backgroundColor: theme.colors.surfaceLight, color: theme.colors.text,
    padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 16,
  },
  createButton: { width: '100%', backgroundColor: theme.colors.accent, padding: 16, borderRadius: 12, alignItems: 'center' },
  createButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  // Groupe
  teamContainer: { flex: 1 },
  teamHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    backgroundColor: theme.colors.surface, padding: 20, borderRadius: 16,
    borderWidth: 1, borderColor: theme.colors.border, marginBottom: 24,
  },
  teamName: { color: theme.colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  codeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.colors.surfaceLight, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    alignSelf: 'flex-start',
  },
  codeText: { color: theme.colors.accent, fontSize: 16, fontWeight: 'bold', letterSpacing: 2 },
  addTeamButton: {
    backgroundColor: theme.colors.surfaceLight, width: 40, height: 40,
    borderRadius: 20, alignItems: 'center', justifyContent: 'center'
  },

  // Pending
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { color: theme.colors.text, fontSize: 18, fontWeight: 'bold' },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendingSectionTitle: { color: theme.colors.warning, fontSize: 16, fontWeight: 'bold' },
  pendingCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface,
    padding: 14, borderRadius: 14, marginBottom: 10,
    borderWidth: 1, borderColor: theme.colors.warning + '30',
  },
  pendingAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.warning + '20',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  pendingInitials: { color: theme.colors.warning, fontWeight: 'bold', fontSize: 16 },
  pendingInfo: { flex: 1 },
  pendingName: { color: theme.colors.text, fontSize: 15, fontWeight: '600', marginBottom: 2 },
  pendingStatus: { color: theme.colors.textMuted, fontSize: 12 },
  pendingActions: { flexDirection: 'row', gap: 8 },
  approveBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: theme.colors.success,
    alignItems: 'center', justifyContent: 'center',
  },
  rejectBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: theme.colors.error + '15',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.error + '30',
  },

  // Athlètes approuvés
  emptyAthletes: {
    padding: 30, backgroundColor: theme.colors.surface, borderRadius: 16,
    alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, borderStyle: 'dashed'
  },
  athleteCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface,
    padding: 16, borderRadius: 12, marginBottom: 10,
  },
  athleteAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  athleteInitials: { color: theme.colors.text, fontWeight: 'bold', fontSize: 16 },
  athleteInfo: { flex: 1 },
  athleteName: { color: theme.colors.text, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  subgroupBadgeText: { color: theme.colors.textMuted, fontSize: 12 },

  // Modales
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { 
    backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, 
    padding: 24, maxHeight: '80%' 
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  modalSubtitle: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 20 },

  // QR Modal
  qrModalContent: {
    backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, alignItems: 'center',
  },
  qrDesc: { color: theme.colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 8, marginBottom: 30 },
  bigCodeContainer: {
    backgroundColor: theme.colors.background, borderRadius: 20, padding: 30,
    borderWidth: 2, borderColor: theme.colors.accent, marginBottom: 20, width: '100%', alignItems: 'center'
  },
  bigCode: { fontSize: 40, fontWeight: 'bold', color: theme.colors.accent, letterSpacing: 6 },
  qrHint: { color: theme.colors.textMuted, fontSize: 12, textAlign: 'center', marginBottom: 30 },

  // Sous-groupes (modale)
  subgroupOption: {
    padding: 16, backgroundColor: theme.colors.surfaceLight,
    borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: 'transparent'
  },
  subgroupOptionSelected: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accent + '20' },
  subgroupOptionText: { color: theme.colors.text, fontSize: 16, fontWeight: '500' },
  createSgBtn: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    padding: 16, backgroundColor: theme.colors.surfaceLight, borderRadius: 12, 
    marginTop: 8, borderStyle: 'dashed', borderWidth: 1, borderColor: theme.colors.border 
  },
  createSgText: { color: theme.colors.accent, marginLeft: 8, fontWeight: 'bold' },
  createSgRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  sgInput: { 
    flex: 1, backgroundColor: theme.colors.surfaceLight, color: theme.colors.text, 
    paddingHorizontal: 16, height: 50, borderRadius: 12 
  },
  sgSaveBtn: { 
    backgroundColor: theme.colors.accent, paddingHorizontal: 20, 
    justifyContent: 'center', alignItems: 'center', borderRadius: 12 
  }
});
