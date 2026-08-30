import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Modal, TextInput, Alert, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../src/core/theme';
import { useCoachStore } from '../../src/store/coach/coachStore';
import { useAuthStore } from '../../src/store/authStore';

export default function CoachGroupsScreen() {
  const { user } = useAuthStore();
  const { 
    teams, fetchTeams, createTeam, updateTeam, deleteTeam,
    subgroups, fetchSubgroups, createSubgroup, updateSubgroup, deleteSubgroup,
    teamMembers, pendingMembers, fetchTeamMembers, approveAthlete, rejectAthlete, removeAthlete, assignSubgroup,
    subscribeToTeam, unsubscribe 
  } = useCoachStore();

  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'subgroups' | 'pending' | 'settings'>('members');
  
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  
  // States for Modals
  const [modalType, setModalType] = useState<'none' | 'rename_team' | 'create_sg' | 'rename_sg' | 'change_sg'>('none');
  const [tempValue, setTempValue] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  // Load initial teams
  useEffect(() => {
    fetchTeams();
  }, []);

  // Auto-create from signup if no teams exist
  useEffect(() => {
    if (teams.length === 0 && user?.groupName && !isCreatingTeam) {
      setIsCreatingTeam(true);
      createTeam(user.groupName).then((newTeam) => {
        if (newTeam && user.subgroups && user.subgroups.length > 0) {
          Promise.all(user.subgroups.map(sg => createSubgroup(newTeam.id, sg)));
        }
      }).finally(() => setIsCreatingTeam(false));
    }
  }, [teams.length, user?.groupName]);

  // Handle entering a team
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
    setIsCreatingTeam(true);
    await createTeam(newTeamName.trim());
    setNewTeamName('');
    setIsCreatingTeam(false);
    setModalType('none');
  };

  const handleDeleteTeam = () => {
    if (!activeTeamId) return;
    Alert.alert('Supprimer le groupe', 'Êtes-vous sûr ? Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        await deleteTeam(activeTeamId);
        setActiveTeamId(null);
      }}
    ]);
  };

  const handleRemoveAthlete = (userId: string) => {
    if (!activeTeamId) return;
    Alert.alert('Exclure l\'athlète', 'Voulez-vous vraiment exclure cet athlète du groupe ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Exclure', style: 'destructive', onPress: () => removeAthlete(userId, activeTeamId) }
    ]);
  };

  const renderTeamList = () => (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Mes Groupes</Text>
      
      {teams.map(team => (
        <TouchableOpacity 
          key={team.id} 
          style={styles.teamCard}
          activeOpacity={0.8}
          onPress={() => setActiveTeamId(team.id)}
        >
          <View style={styles.teamCardHeader}>
            <Text style={styles.teamCardTitle}>{team.name}</Text>
            <Feather name="chevron-right" size={20} color={theme.colors.textMuted} />
          </View>
          <View style={styles.teamCardFooter}>
            <View style={styles.teamCodeBadge}>
              <Feather name="key" size={12} color={theme.colors.accent} />
              <Text style={styles.teamCodeText}>{team.invite_code}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity 
        style={styles.createBtn}
        onPress={() => setModalType('create_sg')} // Wait, we use a single modal state. Let's use it for create team if no active team
      >
        <Feather name="plus" size={20} color={theme.colors.text} />
        <Text style={styles.createBtnText}>Nouveau Groupe</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const activeTeam = teams.find(t => t.id === activeTeamId);

  const renderTeamDetails = () => {
    if (!activeTeam) return null;

    return (
      <View style={{ flex: 1 }}>
        {/* Detail Header */}
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => setActiveTeamId(null)} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, paddingHorizontal: 16 }}>
            <Text style={styles.detailTitle}>{activeTeam.name}</Text>
            <Text style={styles.detailSubtitle}>Code: {activeTeam.invite_code}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'members' && styles.tabBtnActive]} onPress={() => setActiveTab('members')}>
            <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>Membres</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'subgroups' && styles.tabBtnActive]} onPress={() => setActiveTab('subgroups')}>
            <Text style={[styles.tabText, activeTab === 'subgroups' && styles.tabTextActive]}>Sous-groupes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'pending' && styles.tabBtnActive]} onPress={() => setActiveTab('pending')}>
            <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
              Demandes {pendingMembers.length > 0 && `(${pendingMembers.length})`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'settings' && styles.tabBtnActive]} onPress={() => setActiveTab('settings')}>
            <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>Paramètres</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          {activeTab === 'members' && (
            <>
              {teamMembers.length === 0 ? (
                <Text style={styles.emptyText}>Aucun athlète dans ce groupe.</Text>
              ) : (
                teamMembers.map(member => {
                  const sg = subgroups.find(s => s.id === member.subgroup_id);
                  return (
                    <View key={member.user_id} style={styles.rowCard}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{member.profile?.first_name?.charAt(0) || ''}</Text>
                      </View>
                      <View style={styles.rowInfo}>
                        <Text style={styles.rowTitle}>{member.profile?.full_name}</Text>
                        <Text style={styles.rowSubtitle}>{sg ? sg.name : 'Aucun sous-groupe'}</Text>
                      </View>
                      <TouchableOpacity 
                        onPress={() => {
                          setSelectedEntityId(member.user_id);
                          setModalType('change_sg');
                        }}
                        style={styles.actionBtnIcon}
                      >
                        <Feather name="layers" size={18} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleRemoveAthlete(member.user_id)} style={styles.actionBtnIcon}>
                        <Feather name="user-x" size={18} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </>
          )}

          {activeTab === 'subgroups' && (
            <>
              <TouchableOpacity 
                style={styles.createBtn}
                onPress={() => { setModalType('create_sg'); setTempValue(''); }}
              >
                <Feather name="plus" size={18} color={theme.colors.text} />
                <Text style={styles.createBtnText}>Ajouter un sous-groupe</Text>
              </TouchableOpacity>

              {subgroups.length === 0 ? (
                <Text style={styles.emptyText}>Aucun sous-groupe.</Text>
              ) : (
                subgroups.map(sg => (
                  <View key={sg.id} style={styles.rowCard}>
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowTitle}>{sg.name}</Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => { setSelectedEntityId(sg.id); setTempValue(sg.name); setModalType('rename_sg'); }}
                      style={styles.actionBtnIcon}
                    >
                      <Feather name="edit-2" size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => {
                        Alert.alert('Supprimer', 'Supprimer ce sous-groupe ?', [
                          { text: 'Annuler', style: 'cancel' },
                          { text: 'Supprimer', style: 'destructive', onPress: () => deleteSubgroup(sg.id) }
                        ]);
                      }}
                      style={styles.actionBtnIcon}
                    >
                      <Feather name="trash-2" size={18} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </>
          )}

          {activeTab === 'pending' && (
            <>
              {pendingMembers.length === 0 ? (
                <Text style={styles.emptyText}>Aucune demande en attente.</Text>
              ) : (
                pendingMembers.map(member => (
                  <View key={member.user_id} style={styles.rowCard}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{member.profile?.first_name?.charAt(0) || ''}</Text>
                    </View>
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowTitle}>{member.profile?.full_name}</Text>
                      <Text style={styles.rowSubtitle}>Demande d'accès</Text>
                    </View>
                    <TouchableOpacity onPress={() => approveAthlete(member.user_id, activeTeam.id)} style={[styles.actionBtnIcon, { backgroundColor: theme.colors.success + '20' }]}>
                      <Feather name="check" size={20} color={theme.colors.success} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => rejectAthlete(member.user_id, activeTeam.id)} style={[styles.actionBtnIcon, { backgroundColor: theme.colors.error + '20' }]}>
                      <Feather name="x" size={20} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </>
          )}

          {activeTab === 'settings' && (
            <View style={{ gap: 16 }}>
              <TouchableOpacity 
                style={styles.settingsBtn}
                onPress={() => { setTempValue(activeTeam.name); setModalType('rename_team'); }}
              >
                <Feather name="edit-3" size={20} color={theme.colors.text} />
                <Text style={styles.settingsBtnText}>Renommer le groupe</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.settingsBtn, { borderColor: theme.colors.error + '50' }]} onPress={handleDeleteTeam}>
                <Feather name="trash" size={20} color={theme.colors.error} />
                <Text style={[styles.settingsBtnText, { color: theme.colors.error }]}>Supprimer le groupe</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Équipe</Text>
      </View>

      {activeTeamId ? renderTeamDetails() : renderTeamList()}

      {/* REUSABLE MODAL FOR INPUTS */}
      <Modal visible={modalType !== 'none' && modalType !== 'change_sg'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={styles.modalTitle}>
              {modalType === 'rename_team' ? 'Renommer le groupe' :
               modalType === 'rename_sg' ? 'Renommer le sous-groupe' :
               'Nouveau nom'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
              value={tempValue}
              onChangeText={setTempValue}
              placeholder="Ex: Pôle Sprint"
              placeholderTextColor={theme.colors.textMuted}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalType('none')}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalSave, { backgroundColor: theme.colors.accent }]}
                onPress={async () => {
                  if (!tempValue.trim()) return;
                  if (modalType === 'rename_team' && activeTeamId) {
                    await updateTeam(activeTeamId, tempValue.trim());
                  } else if (modalType === 'rename_sg' && selectedEntityId) {
                    await updateSubgroup(selectedEntityId, tempValue.trim());
                  } else if (modalType === 'create_sg' && activeTeamId) {
                    await createSubgroup(activeTeamId, tempValue.trim());
                  } else if (modalType === 'create_sg' && !activeTeamId) {
                    // C'est la création de team
                    await createTeam(tempValue.trim());
                  }
                  setModalType('none');
                }}
              >
                <Text style={styles.modalSaveText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL FOR ASSIGNING SUBGROUP */}
      <Modal visible={modalType === 'change_sg'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={styles.modalTitle}>Assigner un sous-groupe</Text>
            
            <ScrollView style={{ maxHeight: 300, marginTop: 16 }}>
              <TouchableOpacity 
                style={[styles.sgOption, { borderColor: theme.colors.border }]}
                onPress={() => {
                  if (selectedEntityId && activeTeamId) assignSubgroup(selectedEntityId, activeTeamId, null);
                  setModalType('none');
                }}
              >
                <Text style={styles.sgOptionText}>Aucun sous-groupe</Text>
              </TouchableOpacity>

              {subgroups.map(sg => (
                <TouchableOpacity 
                  key={sg.id}
                  style={[styles.sgOption, { borderColor: theme.colors.border }]}
                  onPress={() => {
                    if (selectedEntityId && activeTeamId) assignSubgroup(selectedEntityId, activeTeamId, sg.id);
                    setModalType('none');
                  }}
                >
                  <Text style={styles.sgOptionText}>{sg.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={[styles.modalCancel, { marginTop: 16 }]} onPress={() => setModalType('none')}>
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 16,
    marginTop: 8,
  },
  teamCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  teamCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  teamCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  teamCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 8,
  },
  teamCodeText: {
    color: theme.colors.accent,
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 2,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  createBtnText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Detail View
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  detailSubtitle: {
    fontSize: 14,
    color: theme.colors.accent,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: theme.colors.accent,
  },
  tabText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: theme.colors.accent,
  },
  
  // Row Cards
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  avatar: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: theme.colors.textSecondary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  rowInfo: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  rowSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  actionBtnIcon: {
    width: 36, height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    marginLeft: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    marginTop: 40,
    fontStyle: 'italic',
  },

  // Settings
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  settingsBtnText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginLeft: 12,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  modalCancelText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  modalSave: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  sgOption: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  sgOptionText: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  }
});
