import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, Animated, Image } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme, theme } from '../../src/core/theme';
import { Header } from '../../src/shared/components/Header';
import { supabase } from '../../src/services/supabase';
import { useCoachStore } from '../../src/store/coach/coachStore';
import { useAuthStore } from '../../src/store/authStore';
import { useRouter } from 'expo-router';

export default function CoachGroupsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { 
    teams, fetchTeams, createTeam, updateTeam, deleteTeam,
    subgroups, fetchSubgroups, createSubgroup, updateSubgroup, deleteSubgroup,
    teamMembers, pendingMembers, fetchTeamMembers, approveAthlete, rejectAthlete, removeAthlete, assignSubgroup,
    subscribeToTeam, unsubscribe,
    hasFetchedTeams
  } = useCoachStore();

  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'subgroups' | 'pending' | 'settings'>('members');
  
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  
  // States for Modals
  const [modalType, setModalType] = useState<'none' | 'rename_team' | 'create_sg' | 'rename_sg' | 'change_sg' | 'athlete_profile'>('none');
  const [tempValue, setTempValue] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedAthlete, setSelectedAthlete] = useState<any>(null);

  // Load initial teams
  useEffect(() => {
    fetchTeams();
  }, []);

  

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

  const copyToClipboard = async (code: string) => {
    await Clipboard.setStringAsync(code);
    Alert.alert('Code copié', 'Le code d\'invitation a été copié dans le presse-papier.');
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
            <View style={{ flex: 1 }}>
              <Text style={styles.teamCardTitle}>{team.name}</Text>
              <Text style={styles.teamCardSub}>Groupe d'entraînement</Text>
            </View>
            <View style={styles.teamCardChevron}>
              <Feather name="chevron-right" size={18} color="#0F172A" />
            </View>
          </View>
          <View style={styles.teamCardFooter}>
            <TouchableOpacity style={styles.teamCodeBadge} onPress={() => copyToClipboard(team.invite_code)} activeOpacity={0.7}>
              <Feather name="copy" size={12} color="#0069E8" />
              <Text style={styles.teamCodeText}>Code : {team.invite_code}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity 
        style={styles.createBtn}
        onPress={() => setModalType('create_sg')}
        activeOpacity={0.8}
      >
        <View style={styles.createBtnIconWrap}>
          <Feather name="plus" size={18} color="#0069E8" />
        </View>
        <Text style={styles.createBtnText}>Créer un nouveau groupe</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const activeTeam = teams.find(t => t.id === activeTeamId);

  const renderTeamDetails = () => {
    if (!activeTeam) return null;
    const currentTeamPending = pendingMembers.filter(m => m.team_id === activeTeam.id);

    return (
      <View style={{ flex: 1 }}>
        {/* Detail Header */}
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => setActiveTeamId(null)} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, paddingHorizontal: 16 }}>
            <Text style={styles.detailTitle}>{activeTeam.name}</Text>
            <TouchableOpacity onPress={() => copyToClipboard(activeTeam.invite_code)} activeOpacity={0.7}>
              <Text style={styles.detailSubtitle}>Code: {activeTeam.invite_code} <Feather name="copy" size={12} /></Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
             onPress={() => router.push(`/chat/team/${activeTeam.id}`)}
             style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surfaceLight, alignItems: 'center', justifyContent: 'center' }}
          >
             <Feather name="message-circle" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'members' && styles.tabBtnActive]} onPress={() => setActiveTab('members')}>
              <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>Membres</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'subgroups' && styles.tabBtnActive]} onPress={() => setActiveTab('subgroups')}>
              <Text style={[styles.tabText, activeTab === 'subgroups' && styles.tabTextActive]}>Sous-groupes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'pending' && styles.tabBtnActive]} onPress={() => setActiveTab('pending')}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
                  Demandes {currentTeamPending.length > 0 && `(${currentTeamPending.length})`}
                </Text>
                {currentTeamPending.length > 0 && (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.warning }} />
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'settings' && styles.tabBtnActive]} onPress={() => setActiveTab('settings')}>
              <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>Paramètres</Text>
            </TouchableOpacity>
          </ScrollView>
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
                    <TouchableOpacity 
                      key={member.user_id} 
                      style={styles.rowCard}
                      onPress={() => {
                        setSelectedEntityId(member.user_id);
                        setSelectedAthlete(member);
                        setModalType('athlete_profile');
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.avatar}>
                        {member.profile?.avatar_url ? (
                          <Image source={{ uri: member.profile.avatar_url }} style={styles.avatarImage} />
                        ) : (
                          <Ionicons name="person" size={22} color={theme.colors.textMuted} />
                        )}
                      </View>
                      <View style={styles.rowInfo}>
                        <Text style={styles.rowTitle}>
                          {member.profile?.full_name || `${member.profile?.first_name || ''} ${member.profile?.last_name || ''}`.trim() || 'Athlète'}
                        </Text>
                        <Text style={styles.rowSubtitle}>{sg ? sg.name : 'Aucun sous-groupe'}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity 
                          onPress={(e) => { e.stopPropagation(); router.push(`/chat/direct/${member.user_id}`); }} 
                          style={styles.actionBtnIcon}
                        >
                          <Feather name="message-circle" size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={(e) => { e.stopPropagation(); handleRemoveAthlete(member.user_id); }} 
                          style={[styles.actionBtnIcon, { backgroundColor: theme.colors.error + '15' }]}
                        >
                          <Feather name="user-x" size={18} color={theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
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
                activeOpacity={0.8}
              >
                <View style={styles.createBtnIconWrap}>
                  <Feather name="plus" size={18} color="#0069E8" />
                </View>
                <Text style={styles.createBtnText}>Ajouter un sous-groupe</Text>
              </TouchableOpacity>

              {subgroups.length === 0 ? (
                <View style={styles.emptyStateBox}>
                  <View style={styles.emptyStateIconCircle}>
                    <Feather name="layers" size={24} color="#0069E8" />
                  </View>
                  <Text style={styles.emptyStateTitle}>Aucun sous-groupe configuré</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    Créez des sous-groupes (ex: 100m/200m, Haies, Relais) pour segmenter vos programmes d'entraînement.
                  </Text>
                </View>
              ) : (
                subgroups.map(sg => (
                  <View key={sg.id} style={styles.rowCard}>
                    <View style={styles.sgTagIcon}>
                      <Feather name="tag" size={16} color="#0069E8" />
                    </View>
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowTitle}>{sg.name}</Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => { setSelectedEntityId(sg.id); setTempValue(sg.name); setModalType('rename_sg'); }}
                      style={styles.actionBtnIcon}
                      activeOpacity={0.7}
                    >
                      <Feather name="edit-2" size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => {
                        Alert.alert('Supprimer', 'Supprimer ce sous-groupe ?', [
                          { text: 'Annuler', style: 'cancel' },
                          { text: 'Supprimer', style: 'destructive', onPress: () => deleteSubgroup(sg.id) }
                        ]);
                      }}
                      style={[styles.actionBtnIcon, { backgroundColor: '#FEE2E2' }]}
                      activeOpacity={0.7}
                    >
                      <Feather name="trash-2" size={16} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </>
          )}

          {activeTab === 'pending' && (
            <>
              {currentTeamPending.length === 0 ? (
                <View style={styles.emptyStateBox}>
                  <View style={[styles.emptyStateIconCircle, { backgroundColor: '#DCFCE7' }]}>
                    <Feather name="check-circle" size={24} color="#16A34A" />
                  </View>
                  <Text style={styles.emptyStateTitle}>Toutes les demandes sont traitées</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    Aucun athlète en attente de validation pour le moment.
                  </Text>
                </View>
              ) : (
                currentTeamPending.map(member => (
                  <View key={member.user_id} style={styles.rowCard}>
                    <View style={styles.avatar}>
                      {member.profile?.avatar_url ? (
                        <Image source={{ uri: member.profile.avatar_url }} style={styles.avatarImage} />
                      ) : (
                        <Ionicons name="person" size={22} color={theme.colors.textMuted} />
                      )}
                    </View>
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowTitle}>
                        {member.profile?.full_name || `${member.profile?.first_name || ''} ${member.profile?.last_name || ''}`.trim() || 'Athlète'}
                      </Text>
                      <Text style={styles.rowSubtitle}>Demande d'accès au groupe</Text>
                    </View>
                    <TouchableOpacity onPress={() => approveAthlete(member.user_id, activeTeam.id)} style={[styles.actionBtnIcon, { backgroundColor: '#DCFCE7' }]} activeOpacity={0.7}>
                      <Feather name="check" size={18} color="#16A34A" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => rejectAthlete(member.user_id, activeTeam.id)} style={[styles.actionBtnIcon, { backgroundColor: '#FEE2E2' }]} activeOpacity={0.7}>
                      <Feather name="x" size={18} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </>
          )}

          {activeTab === 'settings' && (
            <View style={{ gap: 14 }}>
              {/* Card Group Info */}
              <View style={styles.settingsCard}>
                <View style={styles.settingsCardHeader}>
                  <Feather name="info" size={18} color="#0069E8" />
                  <Text style={styles.settingsCardTitle}>Informations du groupe</Text>
                </View>
                <View style={styles.settingsRow}>
                  <Text style={styles.settingsLabel}>Nom</Text>
                  <Text style={styles.settingsValue}>{activeTeam.name}</Text>
                </View>
                <View style={styles.settingsDivider} />
                <View style={styles.settingsRow}>
                  <Text style={styles.settingsLabel}>Code d'accès</Text>
                  <TouchableOpacity onPress={() => copyToClipboard(activeTeam.invite_code)} style={styles.settingsCodeBadge} activeOpacity={0.7}>
                    <Text style={styles.settingsCodeText}>{activeTeam.invite_code}</Text>
                    <Feather name="copy" size={12} color="#0069E8" />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.settingsBtn}
                onPress={() => { setTempValue(activeTeam.name); setModalType('rename_team'); }}
                activeOpacity={0.7}
              >
                <Feather name="edit-3" size={18} color="#0F172A" />
                <Text style={styles.settingsBtnText}>Renommer le groupe</Text>
                <Feather name="chevron-right" size={16} color="#94A3B8" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.settingsBtn, styles.settingsDeleteBtn]} 
                onPress={handleDeleteTeam}
                activeOpacity={0.7}
              >
                <Feather name="trash-2" size={18} color="#DC2626" />
                <Text style={[styles.settingsBtnText, { color: '#DC2626' }]}>Supprimer le groupe</Text>
                <Feather name="chevron-right" size={16} color="#DC2626" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            </View>
          )}
          
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Équipe" />

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

      {/* MODAL FOR ATHLETE PROFILE (Proposition B) */}
      <Modal visible={modalType === 'athlete_profile' && !!selectedAthlete} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            
            <View style={{ alignItems: 'center', marginBottom: 24 }}>                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.surfaceLight, justifyContent: 'center', alignItems: 'center', marginBottom: 12, overflow: 'hidden' }}>
                  {selectedAthlete?.profile?.avatar_url ? (
                    <Image source={{ uri: selectedAthlete.profile.avatar_url }} style={{ width: 80, height: 80, borderRadius: 40 }} />
                  ) : (
                    <Ionicons name="person" size={40} color={theme.colors.textMuted} />
                  )}
                </View>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.colors.text }}>
                {selectedAthlete?.profile?.full_name || `${selectedAthlete?.profile?.first_name || ''} ${selectedAthlete?.profile?.last_name || ''}`.trim() || 'Athlète'}
              </Text>
              <Text style={{ fontSize: 14, color: theme.colors.textMuted, marginTop: 4 }}>Athlète de l'équipe</Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', marginBottom: 24 }}>
              {/* Sous-groupe */}
              <TouchableOpacity style={styles.actionSquareBtn} onPress={() => setModalType('change_sg')}>
                <View style={[styles.actionSquareIcon, { backgroundColor: theme.colors.accent + '20' }]}>
                  <Feather name="users" size={24} color={theme.colors.accent} />
                </View>
                <Text style={styles.actionSquareText}>Sous-groupe</Text>
              </TouchableOpacity>

              {/* Sprinty */}
              <TouchableOpacity 
                style={styles.actionSquareBtn} 
                onPress={() => {
                  setModalType('none');
                  router.navigate({ 
                    pathname: '/(coach)/chat', 
                    params: {
                      athleteId: selectedAthlete?.user_id,
                      athleteName: selectedAthlete?.profile?.full_name || `${selectedAthlete?.profile?.first_name || ''} ${selectedAthlete?.profile?.last_name || ''}`.trim() || 'Athlète',
                      avatarUrl: selectedAthlete?.profile?.avatar_url || '',
                      domains: 'training,nutrition,wellness,body',
                      ts: String(Date.now()),
                    } 
                  });
                }}
              >
                <View style={[styles.actionSquareIcon, { backgroundColor: '#8B5CF620' }]}>
                  <Feather name="cpu" size={24} color="#8B5CF6" />
                </View>
                <Text style={styles.actionSquareText}>Sprinty IA</Text>
              </TouchableOpacity>

            </View>

            <TouchableOpacity style={styles.modalCancel} onPress={() => { setModalType('none'); setSelectedAthlete(null); }}>
              <Text style={styles.modalCancelText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL FOR ASSIGNING SUBGROUP */}
      <Modal visible={modalType === 'change_sg'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={styles.modalTitle}>Assigner un sous-groupe</Text>
            
            {subgroups.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 32, gap: 12 }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.accent + '15', alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="layers" size={32} color={theme.colors.accent} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text, textAlign: 'center' }}>Aucun sous-groupe créé</Text>
                <Text style={{ fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', paddingHorizontal: 16 }}>
                  Rendez-vous dans l'onglet "Sous-groupes" pour en créer un, et organisez vos athlètes !
                </Text>
              </View>
            ) : (
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
            )}

            <TouchableOpacity style={[styles.modalCancel, { marginTop: 16 }]} onPress={() => setModalType('none')}>
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  teamCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  teamCardSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  teamCardChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 6,
  },
  teamCodeText: {
    color: '#0369A1',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
    marginBottom: 14,
  },
  createBtnIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0069E815',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  createBtnText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  
  // Detail View
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
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
  tabsContainer: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 24, // Adds spacing between tabs
  },
  tabBtn: {
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
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

  // Empty State Box (Athletic clean look)
  emptyStateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  emptyStateIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0069E815',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  emptyStateSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  sgTagIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#0069E815',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  // Settings Card & Buttons
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 4,
  },
  settingsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  settingsCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  settingsValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  settingsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  settingsCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  settingsCodeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  settingsDeleteBtn: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FFF5F5',
  },
  settingsBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
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
    color: theme.colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    color: theme.colors.text,
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
    backgroundColor: theme.colors.surfaceLight,
  },
  modalCancelText: {
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  modalSave: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
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
    backgroundColor: theme.colors.surfaceLight,
  },
  sgOptionText: {
    color: theme.colors.text,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  actionSquareBtn: {
    width: '47%',
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionSquareIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionSquareText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  }
});


