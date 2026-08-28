import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ActivityIndicator, FlatList, Alert, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';
import { useAuthStore } from '../../../store/authStore';
import { useCoachStore, Team, Subgroup } from '../../../store/coach/coachStore';
import { ProfileAvatar } from '../../../shared/components/ProfileAvatar';
import { useRouter } from 'expo-router';

export const CoachDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { teams, subgroups, isLoading, fetchTeams, createTeam, teamMembers, fetchTeamMembers, fetchSubgroups, createSubgroup, assignSubgroup } = useCoachStore();
  const router = useRouter();

  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [selectedAthlete, setSelectedAthlete] = useState<any | null>(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [newSubgroupName, setNewSubgroupName] = useState('');
  const [isCreatingSubgroup, setIsCreatingSubgroup] = useState(false);

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
    }
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

      <View style={styles.content}>
        {isLoading && teams.length === 0 ? (
          <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 40 }} />
        ) : teams.length === 0 || isCreating ? (
          <View style={styles.createTeamCard}>
            <View style={styles.iconCircle}>
              <Feather name="shield" size={32} color={theme.colors.accent} />
            </View>
            <Text style={styles.createTitle}>Créer un groupe d'entraînement</Text>
            <Text style={styles.createSubtitle}>
              Génère un code d'invitation pour que tes athlètes puissent rejoindre ton espace.
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
          <View style={styles.teamContainer}>
            <View style={styles.teamHeaderRow}>
              <View>
                <Text style={styles.teamName}>{activeTeam?.name}</Text>
                <View style={styles.codeBadge}>
                  <Text style={styles.codeText}>Code d'invitation : {activeTeam?.invite_code}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsCreating(true)} style={styles.addTeamButton}>
                <Feather name="plus" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.sectionHeader}>
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
              <FlatList
                data={teamMembers}
                keyExtractor={item => item.user_id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const subgroup = subgroups.find(s => s.id === item.subgroup_id);
                  return (
                    <TouchableOpacity 
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
                        <Text style={styles.subgroupBadge}>
                          {subgroup ? subgroup.name : 'Non assigné'}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={20} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        )}
      </View>

      {/* Assign Subgroup Modal */}
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
                  placeholder="Nom (ex: Sprint)" 
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
                  <Text style={{ color: '#fff' }}>OK</Text>
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
  header: { padding: 24, paddingTop: 32, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  welcome: { color: theme.colors.accent, fontSize: 12, fontWeight: 'bold', letterSpacing: 2 },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: 'bold', marginTop: 4 },
  content: { flex: 1, paddingHorizontal: 24 },
  
  createTeamCard: {
    backgroundColor: theme.colors.surface,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    marginTop: 20,
  },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  createTitle: { color: theme.colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  createSubtitle: { color: theme.colors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  input: {
    width: '100%', backgroundColor: theme.colors.surfaceLight,
    color: theme.colors.text, padding: 16, borderRadius: 12,
    fontSize: 16, marginBottom: 16,
  },
  createButton: {
    width: '100%', backgroundColor: theme.colors.accent,
    padding: 16, borderRadius: 12, alignItems: 'center',
  },
  createButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  teamContainer: { flex: 1 },
  teamHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    backgroundColor: theme.colors.surface, padding: 20, borderRadius: 16,
    borderWidth: 1, borderColor: theme.colors.border, marginBottom: 24,
  },
  teamName: { color: theme.colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  codeBadge: {
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start'
  },
  codeText: { color: theme.colors.accent, fontSize: 13, fontWeight: 'bold', letterSpacing: 1 },
  addTeamButton: {
    backgroundColor: theme.colors.surfaceLight, width: 40, height: 40,
    borderRadius: 20, alignItems: 'center', justifyContent: 'center'
  },

  sectionHeader: { marginBottom: 16 },
  sectionTitle: { color: theme.colors.text, fontSize: 18, fontWeight: 'bold' },
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
  subgroupBadge: { color: theme.colors.textMuted, fontSize: 12 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { 
    backgroundColor: theme.colors.surface, 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    padding: 24, 
    maxHeight: '80%' 
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  modalSubtitle: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 20 },
  subgroupOption: {
    padding: 16, backgroundColor: theme.colors.surfaceLight, 
    borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: 'transparent'
  },
  subgroupOptionSelected: {
    borderColor: theme.colors.accent, backgroundColor: theme.colors.accent + '20'
  },
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
