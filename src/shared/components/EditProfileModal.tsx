import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../core/theme';
import { useAuthStore } from '../../store/authStore';
import { Input } from './Input';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { FeedbackHost } from '../feedback/FeedbackHost';
import { toast } from '../feedback/appAlert';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const MIN_HEIGHT_CM = 100;
const MAX_HEIGHT_CM = 250;

export const EditProfileModal = ({ visible, onClose }: Props) => {
  const { user, updateProfile } = useAuthStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [height, setHeight] = useState('');
  const [heightError, setHeightError] = useState<string | undefined>();

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && visible) {
      setFirstName(user.firstName || user.name?.split(' ')[0] || '');
      setLastName(user.lastName || (user.name?.includes(' ') ? user.name.split(' ').slice(1).join(' ') : ''));
      setHeight(user.height ? String(user.height) : '');
      setHeightError(undefined);
    }
  }, [user, visible]);

  const isAthlete = user?.role === 'athlete';

  const validateHeight = (value: string): string | undefined => {
    const trimmed = value.trim().replace(',', '.');
    if (!trimmed) return undefined;
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return 'Indique ta taille en chiffres (ex. : 180).';
    if (n < MIN_HEIGHT_CM || n > MAX_HEIGHT_CM) return `Ta taille doit être comprise entre ${MIN_HEIGHT_CM} et ${MAX_HEIGHT_CM} cm.`;
    return undefined;
  };

  const handleSave = async () => {
    if (isAthlete) {
      const err = validateHeight(height);
      if (err) {
        setHeightError(err);
        return;
      }
    }

    setIsSaving(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const normalizedHeight = height.trim().replace(',', '.');

    const ok = await updateProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      name: fullName || 'Athlète',
      height: normalizedHeight ? Number(normalizedHeight) : null,
    });

    setIsSaving(false);
    if (ok) {
      toast('success', 'Tes informations sont à jour.');
      onClose();
    } else {
      toast('error', 'Impossible d’enregistrer tes informations. Vérifie ta connexion et réessaie.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <FeedbackHost />
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
          <View style={styles.content}>
            <View style={styles.grabber} />

            <View style={styles.header}>
              <IconButton icon="x" onPress={onClose} accessibilityLabel="Fermer" />
              <Text style={styles.title}>Mes informations</Text>
              <View style={styles.headerSpacer} />
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Input
                label="Prénom"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Ton prénom"
                autoCapitalize="words"
                textContentType="givenName"
                autoComplete="given-name"
                returnKeyType="next"
              />

              <Input
                label="Nom"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Ton nom"
                autoCapitalize="words"
                textContentType="familyName"
                autoComplete="family-name"
              />

              {isAthlete ? (
                <Input
                  label="Taille (cm)"
                  value={height}
                  onChangeText={(v) => {
                    setHeight(v);
                    if (heightError) setHeightError(undefined);
                  }}
                  onBlur={() => setHeightError(validateHeight(height))}
                  placeholder="Ex. : 180"
                  keyboardType="numeric"
                  maxLength={5}
                  error={heightError}
                />
              ) : (
                <View style={styles.coachRoleBadgeRow}>
                  <View style={styles.coachRoleIconBox}>
                    <Feather name="shield" size={16} color={theme.colors.sprintyBlue} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.coachRoleLabel}>Rôle du compte</Text>
                    <Text style={styles.coachRoleValue}>Entraîneur / Coach</Text>
                  </View>
                </View>
              )}

              <Button
                title="Enregistrer"
                onPress={handleSave}
                loading={isSaving}
                disabled={isSaving}
                style={styles.saveBtn}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderCurve: 'continuous',
    maxHeight: '90%',
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.15)',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
  },
  headerSpacer: {
    width: 38,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: theme.colors.text,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  saveBtn: {
    marginTop: 8,
  },
  coachRoleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 105, 232, 0.08)',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  coachRoleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachRoleLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: theme.colors.textSecondary,
  },
  coachRoleValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 2,
  },
});
