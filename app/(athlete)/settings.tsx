import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../src/core/theme';
import { useAuthStore } from '../../src/store/authStore';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert('Déconnexion', 'Es-tu sûr de vouloir te déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
      }},
    ]);
  };

  const SettingsItem = ({ icon, title, value, onPress, isDestructive = false }: any) => (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={[styles.iconContainer, isDestructive && { backgroundColor: theme.colors.error + '20' }]}>
        <Feather name={icon} size={20} color={isDestructive ? theme.colors.error : theme.colors.accent} />
      </View>
      <View style={styles.itemTextContainer}>
        <Text style={[styles.itemTitle, isDestructive && { color: theme.colors.error }]}>{title}</Text>
        {value && <Text style={styles.itemValue}>{value}</Text>}
      </View>
      <Feather name="chevron-right" size={20} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Mon Profil</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'A'}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <Text style={styles.sectionTitle}>Données Athlétiques</Text>
        <View style={styles.card}>
          <SettingsItem icon="user" title="Taille" value="180 cm" onPress={() => {}} />
          <SettingsItem icon="target" title="Objectif Calories" value={`${user?.manualKcalGoal || 2000} kcal`} onPress={() => {}} />
        </View>

        <Text style={styles.sectionTitle}>Application</Text>
        <View style={styles.card}>
          <SettingsItem icon="help-circle" title="FAQ & Aide" onPress={() => {}} />
          <SettingsItem icon="mail" title="Nous contacter" onPress={() => {}} />
        </View>

        <View style={[styles.card, { marginTop: 30 }]}>
          <SettingsItem icon="log-out" title="Se déconnecter" isDestructive onPress={handleLogout} />
          <SettingsItem icon="trash-2" title="Supprimer mon compte" isDestructive onPress={() => {}} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { padding: 8, marginLeft: -8 },
  title: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  content: { flex: 1, paddingHorizontal: 20 },
  profileHeader: { alignItems: 'center', marginVertical: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#FFF' },
  name: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text, marginBottom: 4 },
  email: { fontSize: 14, color: theme.colors.textSecondary },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 20, marginBottom: 10, marginLeft: 10 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  item: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  iconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surfaceLight, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  itemTextContainer: { flex: 1 },
  itemTitle: { fontSize: 16, color: theme.colors.text, fontWeight: '500' },
  itemValue: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 },
});
