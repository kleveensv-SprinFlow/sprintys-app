import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useBodyStore } from '../../../store/bodyStore';

const { width } = Dimensions.get('window');

export const AthleteIdentityCard = ({ onEdit }: { onEdit?: () => void }) => {
  const { profile, metrics } = useBodyStore();
  
  const currentWeight = metrics[0]?.weight || '--';
  const age = profile?.dob ? new Date().getFullYear() - new Date(profile.dob).getFullYear() : '--';
  
  const goalLabel = {
    maintain: 'MAINTIEN',
    loss: 'PERTE',
    gain: 'PRISE DE MASSE'
  }[profile?.nutrition_goal || 'maintain'];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(0, 229, 255, 0.15)', 'rgba(191, 90, 242, 0.05)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBorder}
      >
        <BlurView intensity={30} tint="dark" style={styles.cardContent}>
          {/* Header ID */}
          <View style={styles.header}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarContainer}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                ) : (
                  <Text style={styles.avatarText}>{(profile?.first_name || 'A').charAt(0)}</Text>
                )}
              </View>
              <View style={styles.statusIndicator} />
            </View>
            
            <View style={styles.nameSection}>
              <Text style={styles.idLabel}>CARTE D'IDENTITÉ ATHLÈTE</Text>
              <Text style={styles.fullName}>
                {profile?.first_name?.toUpperCase() || 'PRENOM'} {profile?.last_name?.toUpperCase() || 'NOM'}
              </Text>
              <Text style={styles.memberSince}>MEMBRE DEPUIS {new Date(profile?.created_at || Date.now()).getFullYear()}</Text>
            </View>
            
            <TouchableOpacity style={styles.chipBtn} onPress={onEdit}>
              <Ionicons name="pencil-outline" size={18} color="#00E5FF" />
            </TouchableOpacity>
          </View>

          {/* Body Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>TAILLE</Text>
              <Text style={styles.statValue}>{profile?.height || '--'} <Text style={styles.unit}>CM</Text></Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>POIDS</Text>
              <Text style={styles.statValue}>{currentWeight} <Text style={styles.unit}>KG</Text></Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>ÂGE</Text>
              <Text style={styles.statValue}>{age} <Text style={styles.unit}>ANS</Text></Text>
            </View>
          </View>

          {/* Nutrition Summary */}
          <View style={styles.nutritionBox}>
            <View style={styles.nutritionHeader}>
              <Text style={styles.nutriLabel}>PROFIL NUTRITIONNEL</Text>
              <Text style={styles.goalBadge}>{goalLabel}</Text>
            </View>
            
            <View style={styles.macroGrid}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{profile?.target_calories || '--'}</Text>
                <Text style={styles.macroLabel}>KCAL</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{profile?.target_protein || '--'}g</Text>
                <Text style={styles.macroLabel}>PRO</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{profile?.target_carbs || '--'}g</Text>
                <Text style={styles.macroLabel}>GLU</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{profile?.target_fats || '--'}g</Text>
                <Text style={styles.macroLabel}>LIP</Text>
              </View>
            </View>
          </View>

          {/* Hologram Effect (pointerEvents="none" pour ne pas bloquer le bouton) */}
          <View style={styles.hologram} pointerEvents="none" />
        </BlurView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  gradientBorder: {
    padding: 1.5,
    borderRadius: 24,
  },
  cardContent: {
    padding: 20,
    borderRadius: 23,
    backgroundColor: 'rgba(10, 10, 10, 0.9)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: '#00E5FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CD964',
    borderWidth: 2,
    borderColor: '#000',
  },
  nameSection: {
    flex: 1,
  },
  idLabel: {
    color: '#00E5FF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  fullName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  memberSince: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 8,
    fontWeight: '700',
    marginTop: 2,
  },
  chipBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    color: '#8E8E93',
    fontSize: 8,
    fontWeight: '900',
    marginBottom: 4,
    letterSpacing: 1,
  },
  statValue: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },
  unit: {
    fontSize: 9,
    color: '#8E8E93',
  },
  nutritionBox: {
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.1)',
  },
  nutritionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nutriLabel: {
    color: '#00E5FF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  goalBadge: {
    color: '#FFF',
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 8,
    fontWeight: '900',
  },
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
  },
  macroLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 7,
    fontWeight: '800',
    marginTop: 2,
  },
  hologram: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 100,
    height: 100,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderRadius: 50,
    transform: [{ scale: 2 }],
    opacity: 0.3,
  }
});
