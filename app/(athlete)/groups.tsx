import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, Alert, FlatList, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../src/core/theme';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/store/authStore';
import { useRouter } from 'expo-router';

export default function GroupsScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMyGroups();
  }, []);

  const fetchMyGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          team_id,
          teams ( name, invite_code ),
          subgroups ( name )
        `)
        .eq('user_id', user?.id);

      if (error) throw error;
      setMyGroups(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) return;
    setIsJoining(true);

    try {
      // 1. Find the team by invite code
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('invite_code', inviteCode.trim().toUpperCase())
        .single();

      if (teamError || !teamData) {
        Alert.alert('Erreur', 'Code d\'invitation invalide ou groupe introuvable.');
        setIsJoining(false);
        return;
      }

      // 2. Check if already a member
      const isAlreadyMember = myGroups.some(g => g.team_id === teamData.id);
      if (isAlreadyMember) {
        Alert.alert('Info', 'Tu fais déjà partie de ce groupe.');
        setIsJoining(false);
        return;
      }

      // 3. Insert into team_members
      const { error: insertError } = await supabase
        .from('team_members')
        .insert([{ team_id: teamData.id, user_id: user?.id }]);

      if (insertError) throw insertError;

      Alert.alert('Succès !', `Tu as rejoint le groupe ${teamData.name} 🎉`);
      setInviteCode('');
      fetchMyGroups(); // Refresh list

    } catch (err: any) {
      Alert.alert('Erreur', 'Impossible de rejoindre le groupe.');
      console.error(err);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Mes Groupes</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.joinCard}>
          <Text style={styles.cardTitle}>Rejoindre un coach</Text>
          <Text style={styles.cardDesc}>Entre le code d'invitation fourni par ton coach pour intégrer son groupe d'entraînement.</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Code (ex: UAVH-A7X)"
              placeholderTextColor={theme.colors.textMuted}
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity 
              style={[styles.joinBtn, !inviteCode.trim() && { opacity: 0.5 }]} 
              onPress={handleJoinGroup}
              disabled={!inviteCode.trim() || isJoining}
            >
              {isJoining ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.joinBtnText}>Rejoindre</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Mes équipes ({myGroups.length})</Text>
        
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 20 }} />
        ) : myGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="users" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>Tu n'es dans aucun groupe.</Text>
          </View>
        ) : (
          <FlatList
            data={myGroups}
            keyExtractor={(item) => item.team_id}
            renderItem={({ item }) => (
              <View style={styles.groupCard}>
                <View style={styles.groupIcon}>
                  <Feather name="shield" size={24} color={theme.colors.accent} />
                </View>
                <View style={styles.groupInfo}>
                  <Text style={styles.groupName}>{item.teams?.name}</Text>
                  <Text style={styles.groupSub}>
                    {item.subgroups ? `Sous-groupe: ${item.subgroups.name}` : 'En attente d\'assignation'}
                  </Text>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { padding: 8, marginLeft: -8 },
  title: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  content: { flex: 1, paddingHorizontal: 20 },
  joinCard: {
    backgroundColor: theme.colors.surface, padding: 20, borderRadius: 16,
    borderWidth: 1, borderColor: theme.colors.border, marginBottom: 30,
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 8 },
  cardDesc: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 16 },
  inputRow: { flexDirection: 'row', gap: 10 },
  input: {
    flex: 1, backgroundColor: theme.colors.surfaceLight, color: theme.colors.text,
    paddingHorizontal: 16, height: 50, borderRadius: 12, fontSize: 16,
  },
  joinBtn: {
    backgroundColor: theme.colors.accent, paddingHorizontal: 20, height: 50,
    borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  joinBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { color: theme.colors.textSecondary, marginTop: 12, fontSize: 16 },
  groupCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface,
    padding: 16, borderRadius: 12, marginBottom: 12,
  },
  groupIcon: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center', justifyContent: 'center', marginRight: 16,
  },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 4 },
  groupSub: { fontSize: 14, color: theme.colors.textMuted },
});
