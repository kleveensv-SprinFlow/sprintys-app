import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../core/theme';
import * as Haptics from 'expo-haptics';
import { useCoachStore } from '../../store/coach/coachStore';

export interface MultiTarget {
  subgroups: string[];
  athletes: string[];
}

interface MultiTargetSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (target: MultiTarget) => void;
  initialTarget?: MultiTarget;
  title?: string;
}

export const MultiTargetSelectorModal: React.FC<MultiTargetSelectorModalProps> = ({
  visible,
  onClose,
  onSave,
  initialTarget,
  title = 'Cibler des athlètes',
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { subgroups, teamMembers } = useCoachStore();

  const [selectedSubgroups, setSelectedSubgroups] = useState<Set<string>>(new Set());
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set());

  // Les athlètes approuvés uniquement
  const approvedMembers = teamMembers.filter(m => m.status === 'approved');

  useEffect(() => {
    if (visible) {
      if (initialTarget) {
        setSelectedSubgroups(new Set(initialTarget.subgroups || []));
        setSelectedAthletes(new Set(initialTarget.athletes || []));
      } else {
        setSelectedSubgroups(new Set());
        setSelectedAthletes(new Set());
      }
    }
  }, [visible, initialTarget]);

  const handleToggleSubgroup = (id: string) => {
    Haptics.selectionAsync();
    const newSet = new Set(selectedSubgroups);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedSubgroups(newSet);
  };

  const handleToggleAthlete = (id: string) => {
    Haptics.selectionAsync();
    const newSet = new Set(selectedAthletes);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedAthletes(newSet);
  };

  const handleSelectAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSubgroups(new Set());
    setSelectedAthletes(new Set());
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSave({
      subgroups: Array.from(selectedSubgroups),
      athletes: Array.from(selectedAthletes),
    });
    onClose();
  };

  const isAllSelected = selectedSubgroups.size === 0 && selectedAthletes.size === 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? Math.max(insets.top, 16) : 16 }]}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="x" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{title}</Text>
          <TouchableOpacity onPress={handleSave} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.saveButtonText, { color: theme.colors.accent }]}>Valider</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Option: Tout le groupe */}
          <TouchableOpacity
            style={[
              styles.optionRow,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              isAllSelected && { borderColor: theme.colors.accent, backgroundColor: theme.colors.accent + '10' }
            ]}
            onPress={handleSelectAll}
            activeOpacity={0.7}
          >
            <View style={styles.optionContent}>
              <View style={[styles.iconBox, { backgroundColor: theme.colors.accent + '20' }]}>
                <Feather name="users" size={18} color={theme.colors.accent} />
              </View>
              <Text style={[styles.optionName, { color: theme.colors.text }]}>Tout le groupe</Text>
            </View>
            <View style={[styles.checkbox, isAllSelected && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }]}>
              {isAllSelected && <Feather name="check" size={14} color="#FFF" />}
            </View>
          </TouchableOpacity>

          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>SOUS-GROUPES</Text>
          <View style={styles.sectionContainer}>
            {subgroups.map((sg, index) => {
              const isSelected = selectedSubgroups.has(sg.id);
              const isLast = index === subgroups.length - 1;
              return (
                <TouchableOpacity
                  key={sg.id}
                  style={[
                    styles.itemRow,
                    !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }
                  ]}
                  onPress={() => handleToggleSubgroup(sg.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.itemName, { color: theme.colors.text }]}>{sg.name}</Text>
                  <View style={[styles.checkbox, isSelected && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }]}>
                    {isSelected && <Feather name="check" size={14} color="#FFF" />}
                  </View>
                </TouchableOpacity>
              );
            })}
            {subgroups.length === 0 && (
              <Text style={{ padding: 16, color: theme.colors.textMuted, fontStyle: 'italic' }}>Aucun sous-groupe disponible.</Text>
            )}
          </View>

          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, marginTop: 24 }]}>ATHLÈTES</Text>
          <View style={styles.sectionContainer}>
            {approvedMembers.map((member, index) => {
              const isSelected = selectedAthletes.has(member.user_id);
              const isLast = index === approvedMembers.length - 1;
              const name = `${member.profile?.first_name || ''} ${member.profile?.last_name || ''}`.trim() || 'Athlète';
              
              return (
                <TouchableOpacity
                  key={member.user_id}
                  style={[
                    styles.itemRow,
                    !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }
                  ]}
                  onPress={() => handleToggleAthlete(member.user_id)}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={[styles.itemName, { color: theme.colors.text, marginLeft: 12 }]}>{name}</Text>
                  </View>
                  <View style={[styles.checkbox, isSelected && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }]}>
                    {isSelected && <Feather name="check" size={14} color="#FFF" />}
                  </View>
                </TouchableOpacity>
              );
            })}
            {approvedMembers.length === 0 && (
              <Text style={{ padding: 16, color: theme.colors.textMuted, fontStyle: 'italic' }}>Aucun athlète disponible.</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 80,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF', // Overridden by theme usually but let's assume it matches surface
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
});

