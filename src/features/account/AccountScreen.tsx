import { goBack } from '../../core/navigation';
import React, { useCallback, useState } from 'react';
import Constants from 'expo-constants';
import { View, Text, StyleSheet, Image, Linking, Animated, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { theme } from '../../core/theme';
import { glassCard } from '../../core/glass';
import { useAuthStore } from '../../store/authStore';
import { useConsentStore } from '../../store/consentStore';
import { useOnboardingStore } from '../../store/onboardingStore';
import { supabase } from '../../services/supabase';
import { exportMyData } from '../../services/exportService';
import { moderationService } from '../../services/moderationService';
import { PUBLISHER } from '../../legal/publisher';
import { Header } from '../../shared/components/Header';
import { GlassScreen } from '../../shared/components/GlassScreen';
import { GlassSheen } from '../../shared/components/GlassSheen';
import { ListRow } from '../../shared/components/ListRow';
import { PressableScale } from '../../shared/components/PressableScale';
import { BottomSheet } from '../../shared/components/BottomSheet';
import { Button } from '../../shared/components/Button';
import { EmptyState } from '../../shared/components/EmptyState';
import { EditProfileModal } from '../../shared/components/EditProfileModal';
import { FaqModal } from '../../shared/components/FaqModal';
import { useFrostedHeader } from '../../shared/hooks/useFrostedHeader';
import { confirmAsync, toast } from '../../shared/feedback/appAlert';
import { getActivePlan, removePlan } from '../sprinty/proposalWriter';
import { useEntitlementStore } from '../../store/entitlementStore';
import { openManageSubscriptions, restorePurchases } from '../../services/purchases';
import { planLabel } from '../billing/plans';

const APP_VERSION = Constants.expoConfig?.version ?? '';

// Base64 → bytes for the avatar upload (fetch(uri).blob() is unreliable on Android)
function base64ToUint8Array(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
  let length = base64.length * 0.75;
  if (base64.endsWith('==')) length -= 2;
  else if (base64.endsWith('=')) length -= 1;
  const bytes = new Uint8Array(length);
  let p = 0;
  for (let i = 0; i < base64.length; i += 4) {
    const e1 = lookup[base64.charCodeAt(i)];
    const e2 = lookup[base64.charCodeAt(i + 1)];
    const e3 = lookup[base64.charCodeAt(i + 2)];
    const e4 = lookup[base64.charCodeAt(i + 3)];
    bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (base64[i + 2] !== '=') bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (base64[i + 3] !== '=') bytes[p++] = ((e3 & 3) << 6) | (e4 & 63);
  }
  return bytes;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Blocked = { id: string; name: string; avatarUrl: string | null };

/** Profile & settings, shared by athletes and coaches. */
export function AccountScreen({ role }: { role: 'athlete' | 'coach' }) {
  const router = useRouter();
  const { user, logout, updateProfile, reloadProfile } = useAuthStore();
  const { scrollY, scrollProps } = useFrostedHeader();
  const isAthlete = role === 'athlete';
  const plan = useEntitlementStore((st) => st.info);
  const showSubscription = isAthlete && !!plan?.billing_enabled;
  const paidOwn = !!plan?.subscription && plan.source === 'own';
  // Plus offered at launch: nothing to manage in the store, it simply ends
  const gifted = plan?.subscription?.source === 'promo';
  const renewal = plan?.subscription?.current_period_end
    ? new Date(plan.subscription.current_period_end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    : null;
  const month = plan?.usage_month;
  const valueLine = month && (month.photo || month.text || month.scan)
    ? [month.photo ? `${month.photo} photo${month.photo > 1 ? 's' : ''} IA` : null, month.text ? `${month.text} saisie${month.text > 1 ? 's' : ''} en une phrase` : null, month.scan ? `${month.scan} scan${month.scan > 1 ? 's' : ''}` : null]
        .filter(Boolean)
        .join(', ')
    : null;

  const aiConsent = useConsentStore((s) => !!s.active?.has('ai_processing'));
  const painConsent = useConsentStore((s) => !!s.active?.has('health_data'));
  const inTeam = useConsentStore((s) => s.inTeam);

  const [editVisible, setEditVisible] = useState(false);
  const [faqVisible, setFaqVisible] = useState(false);
  const [photoSheet, setPhotoSheet] = useState(false);
  const [pending, setPending] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [blockedSheet, setBlockedSheet] = useState(false);
  const [blocked, setBlocked] = useState<Blocked[] | null>(null);

  // Athletes coached by Sprinty: their current plan can be removed from here
  const [sprintyPlan, setSprintyPlan] = useState<{ id: string; title: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      reloadProfile();
      if (isAthlete) getActivePlan().then(setSprintyPlan).catch(() => setSprintyPlan(null));
    }, [isAthlete]),
  );

  const removeSprintyPlan = async () => {
    if (!sprintyPlan) return;
    const ok = await confirmAsync({
      title: 'Retirer ton plan Sprinty ?',
      message: `Les séances à venir de « ${sprintyPlan.title} » seront retirées de ton calendrier. Celles déjà faites restent.`,
      confirmText: 'Retirer',
      destructive: true,
    });
    if (!ok) return;
    try {
      await removePlan(sprintyPlan.id);
      setSprintyPlan(null);
      toast('success', 'Les séances à venir ont été retirées.', 'Plan retiré');
    } catch {
      toast('error', 'Le retrait n’a pas abouti. Réessaie.', 'Oups');
    }
  };

  const firstName = user?.firstName || user?.name?.split(' ')[0] || '';
  const lastName = user?.lastName || (user?.name?.includes(' ') ? user.name.split(' ').slice(1).join(' ') : '');
  const fullName = `${firstName} ${lastName}`.trim() || user?.name || (isAthlete ? 'Athlète' : 'Coach');
  const initials = (`${firstName.charAt(0)}${lastName.charAt(0)}` || fullName.charAt(0)).toUpperCase();
  const infoLine = [fullName, isAthlete && user?.height ? `${user.height} cm` : null].filter(Boolean).join(' · ');
  const openDoc = (doc: 'terms' | 'privacy' | 'notice') => router.push({ pathname: '/legal/[doc]', params: { doc } });

  // ---------- Photo ----------
  const pickImage = async (fromCamera: boolean) => {
    setPhotoSheet(false);
    await wait(350); // let the sheet finish closing before the system picker opens (iOS)
    try {
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        toast('warning', 'Autorise l’accès dans les réglages de ton téléphone pour choisir ou prendre une photo.', 'Accès refusé');
        return;
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      };
      const result = fromCamera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets?.length) setPending(result.assets[0]);
    } catch (err) {
      console.error('Error selecting image:', err);
      toast('error', 'Impossible d’ouvrir cette photo.');
    }
  };

  const confirmPhoto = async () => {
    if (!pending || !user?.id) return;
    setUploading(true);
    try {
      const filePath = `${user.id}/${Date.now()}.jpg`;
      const body: any = pending.base64 ? base64ToUint8Array(pending.base64) : await (await fetch(pending.uri)).blob();
      const { error } = await supabase.storage.from('avatars').upload(filePath, body, { contentType: 'image/jpeg', upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await updateProfile({ avatarUrl: data.publicUrl });
      setPending(null);
      toast('success', 'Ta nouvelle photo est en place.', 'Photo mise à jour');
    } catch (err) {
      console.error('Error uploading avatar:', err);
      toast('error', 'La photo n’a pas pu être enregistrée. Réessaie.');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    setPhotoSheet(false);
    const ok = await confirmAsync({
      title: 'Retirer ta photo ?',
      message: 'Tes initiales s’afficheront à la place.',
      confirmText: 'Retirer',
      destructive: true,
    });
    if (!ok) return;
    await updateProfile({ avatarUrl: null });
    toast('success', 'Photo retirée');
  };

  // ---------- Privacy ----------
  const toggleAI = async () => {
    if (!aiConsent) {
      if (await useConsentStore.getState().ensureAIConsent()) toast('success', 'Sprinty est activé.');
      return;
    }
    const ok = await confirmAsync({
      title: 'Désactiver l’IA ?',
      message: isAthlete
        ? 'Sprinty et l’analyse de repas seront désactivés. Tu pourras les réactiver à tout moment.'
        : 'Sprinty ne sera plus disponible pour toi. Tu pourras le réactiver à tout moment.',
      confirmText: 'Désactiver',
      destructive: true,
      icon: 'cpu',
    });
    if (!ok) return;
    const done = await useConsentStore.getState().revoke('ai_processing');
    toast(done ? 'success' : 'error', done ? 'L’IA est désactivée.' : 'Réessaie dans un instant.');
  };

  const togglePain = async () => {
    if (!painConsent) {
      toast('info', 'Tu pourras l’activer à l’étape « Douleurs » de ton prochain check-in.');
      return;
    }
    const ok = await confirmAsync({
      title: 'Arrêter le suivi des douleurs ?',
      message: 'Les prochaines douleurs ne seront plus enregistrées. Celles déjà notées restent dans ton historique.',
      confirmText: 'Arrêter',
      destructive: true,
      icon: 'shield',
    });
    if (!ok) return;
    const done = await useConsentStore.getState().revoke('health_data');
    toast(done ? 'success' : 'error', done ? 'Le suivi des douleurs est arrêté.' : 'Réessaie dans un instant.');
  };

  const exportData = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportMyData();
    } catch {
      toast('error', 'L’export n’a pas abouti. Réessaie dans un instant.');
    } finally {
      setExporting(false);
    }
  };

  const openBlocked = async () => {
    setBlocked(null);
    setBlockedSheet(true);
    const ids = Array.from(await moderationService.blockedIds());
    if (!ids.length) return setBlocked([]);
    const { data } = await supabase.from('profiles').select('id, full_name, first_name, last_name, avatar_url').in('id', ids);
    const byId = new Map((data || []).map((p: any) => [p.id, p]));
    setBlocked(
      ids.map((id) => {
        const p: any = byId.get(id);
        return {
          id,
          name: p?.full_name || `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || 'Utilisateur',
          avatarUrl: p?.avatar_url || null,
        };
      }),
    );
  };

  const unblock = async (b: Blocked) => {
    const ok = await moderationService.unblock(b.id);
    if (!ok) return toast('error', 'Réessaie dans un instant.');
    setBlocked((list) => (list || []).filter((x) => x.id !== b.id));
    toast('success', `${b.name} est débloqué.`);
  };

  // ---------- Account ----------
  const contactSupport = () => {
    const subject = encodeURIComponent(`Sprintys · ${isAthlete ? 'Athlète' : 'Coach'} · ${fullName}`);
    const body = encodeURIComponent(`Bonjour,\n\n\n\n---\nCompte : ${user?.email || ''}\nVersion : ${APP_VERSION}`);
    Linking.openURL(`mailto:${PUBLISHER.contactEmail}?subject=${subject}&body=${body}`).catch(() =>
      toast('info', `Écris-nous à ${PUBLISHER.contactEmail}`),
    );
  };

  const signOut = async () => {
    const ok = await confirmAsync({ title: 'Se déconnecter ?', confirmText: 'Se déconnecter', icon: 'log-out' });
    if (!ok) return;
    await logout();
    router.replace('/(auth)/login');
  };

  const deleteAccount = async () => {
    const ok = await confirmAsync({
      title: 'Supprimer ton compte ?',
      message: isAthlete
        ? 'Ton profil, tes séances, repas, pesées, check-ins et photos seront définitivement supprimés. Pense à exporter tes données avant si tu veux les garder.'
        : 'Ton profil, tes groupes, les séances que tu as planifiées, tes discussions et ta photo seront définitivement supprimés. Tes athlètes perdront l’accès à ton groupe. Pense à exporter tes données avant si tu veux les garder.',
      confirmText: 'Supprimer définitivement',
      destructive: true,
      icon: 'alert-triangle',
    });
    if (!ok) return;
    try {
      toast('info', 'Suppression de ton compte…');
      const { error } = await supabase.functions.invoke('delete_account_and_assets');
      if (error) throw error;
      await logout();
      router.replace('/(auth)/login');
      toast('success', 'Ton compte et tes données ont été supprimés.', 'Compte supprimé');
    } catch (err) {
      console.error('Error deleting account:', err);
      toast('error', 'La suppression n’a pas abouti. Réessaie ou contacte-nous.');
    }
  };

  return (
    <GlassScreen scrollY={scrollY}>
      <Header title="Mon profil" showBackButton onBackPress={() => goBack(router, '/')} scrollY={scrollY} />

      <Animated.ScrollView {...scrollProps} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <PressableScale onPress={() => setPhotoSheet(true)} accessibilityLabel="Changer ma photo de profil" style={styles.avatarWrap}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Feather name="camera" size={14} color="#FFFFFF" />
            </View>
          </PressableScale>
          <Text style={styles.name} numberOfLines={1}>
            {fullName}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {user?.email}
          </Text>
          <View style={styles.roleChip}>
            <Feather name={isAthlete ? 'activity' : 'clipboard'} size={12} color={theme.colors.sprintyBlue} />
            <Text style={styles.roleText}>{isAthlete ? 'Athlète' : 'Coach'}</Text>
          </View>
        </View>

        <Text style={styles.section}>COMPTE</Text>
        <View style={[glassCard, styles.card]}>
          <GlassSheen radius={22} />
          <ListRow icon="user" title="Mes informations" subtitle={infoLine} onPress={() => setEditVisible(true)} />
          <ListRow icon="image" title="Photo de profil" onPress={() => setPhotoSheet(true)} />
          <ListRow
            icon="users"
            title={isAthlete ? 'Mon groupe' : 'Mes groupes'}
            onPress={() => router.push(isAthlete ? '/(athlete)/groups' : '/(coach)/group')}
            last
          />
        </View>

        {showSubscription && plan && (
          <>
            <Text style={styles.section}>ABONNEMENT</Text>
            <View style={[glassCard, styles.card]}>
              <GlassSheen radius={22} />
              <ListRow
                icon="zap"
                iconColor={theme.colors.sprintyBlue}
                title={planLabel(plan)}
                subtitle={
                  plan.source === 'sponsored'
                    ? `Offert par ${plan.sponsor_name || 'ton coach'}, tant qu’il reste abonné`
                    : paidOwn && gifted
                      ? renewal ? `Offert jusqu’au ${renewal}, rien n’est supprimé ensuite` : 'Offert'
                    : paidOwn
                      ? renewal
                        ? plan.subscription!.will_renew
                          ? `Se renouvelle le ${renewal}`
                          : `Prend fin le ${renewal}, rien n’est supprimé`
                        : undefined
                      : 'Essai gratuit : 3 analyses de repas et 7 messages Sprinty par semaine'
                }
                chevron={!paidOwn}
                onPress={paidOwn ? undefined : () => useEntitlementStore.getState().openPaywall('profile')}
              />
              {paidOwn && valueLine && <ListRow icon="award" title="Ce que ça t’a apporté ce mois-ci" subtitle={valueLine} chevron={false} />}
              {paidOwn && !gifted && <ListRow icon="settings" title="Gérer mon abonnement" subtitle="Dans les réglages de ton compte du store" onPress={() => openManageSubscriptions()} />}
              <ListRow
                icon="refresh-cw"
                title="Restaurer mes achats"
                chevron={false}
                onPress={async () => {
                  const r = await restorePurchases();
                  if (r.status === 'success') {
                    toast('success', 'Si tu as un abonnement, il apparaît dans quelques secondes.', 'Achats restaurés');
                    useEntitlementStore.getState().refreshAfterPurchase();
                  } else if (r.status === 'error') toast('error', r.message, 'Oups');
                }}
                last
              />
            </View>
          </>
        )}

        {isAthlete && sprintyPlan && (
          <>
            <Text style={styles.section}>MON PLAN SPRINTY</Text>
            <View style={[glassCard, styles.card]}>
              <GlassSheen radius={22} />
              <ListRow icon="flag" title={sprintyPlan.title} subtitle="Proposé par Sprinty (IA)" onPress={() => router.push('/chat/sprinty')} />
              <ListRow icon="x-circle" title="Retirer le plan" subtitle="Supprime les séances à venir" destructive chevron={false} onPress={removeSprintyPlan} last />
            </View>
          </>
        )}

        <Text style={styles.section}>CONFIDENTIALITÉ</Text>
        <View style={[glassCard, styles.card]}>
          <GlassSheen radius={22} />
          <ListRow
            icon="cpu"
            iconColor="#8B5CF6"
            title="Assistant IA"
            subtitle={isAthlete ? 'Sprinty et analyse de repas' : 'Sprinty et analyses d’athlètes'}
            value={aiConsent ? 'Activé' : 'Désactivé'}
            onPress={toggleAI}
          />
          {isAthlete && (
            <ListRow
              icon="shield"
              title="Suivi des douleurs"
              subtitle="Données de santé sensibles"
              value={painConsent ? 'Activé' : 'Désactivé'}
              onPress={togglePain}
            />
          )}
          {isAthlete && inTeam && (
            <ListRow
              icon="eye"
              title="Partage avec mon coach"
              subtitle="Pour arrêter le partage, quitte ton groupe"
              value="Actif"
              onPress={() => router.push('/(athlete)/groups')}
            />
          )}
          <ListRow icon="slash" title="Utilisateurs bloqués" onPress={openBlocked} />
          <ListRow
            icon="download"
            title="Exporter mes données"
            subtitle="Fichier JSON de tout ce que Sprintys conserve"
            value={exporting ? <ActivityIndicator color={theme.colors.sprintyBlue} /> : undefined}
            onPress={exportData}
            last
          />
        </View>

        <Text style={styles.section}>AIDE</Text>
        <View style={[glassCard, styles.card]}>
          <GlassSheen radius={22} />
          <ListRow
            icon="compass"
            title="Revoir le tutoriel"
            subtitle="Le tour de bienvenue, en une minute"
            onPress={() => useOnboardingStore.getState().start()}
          />
          <ListRow icon="help-circle" title="Questions fréquentes" onPress={() => setFaqVisible(true)} />
          <ListRow icon="mail" title="Nous contacter" subtitle={PUBLISHER.contactEmail} onPress={contactSupport} />
          <ListRow icon="file-text" title="Conditions d’utilisation" onPress={() => openDoc('terms')} />
          <ListRow icon="lock" title="Politique de confidentialité" onPress={() => openDoc('privacy')} />
          <ListRow icon="info" title="Mentions légales" onPress={() => openDoc('notice')} last />
        </View>

        <View style={[glassCard, styles.card]}>
          <ListRow icon="log-out" iconColor={theme.colors.textSecondary} title="Se déconnecter" chevron={false} onPress={signOut} />
          <ListRow icon="trash-2" title="Supprimer mon compte" destructive chevron={false} onPress={deleteAccount} last />
        </View>

        <Text style={styles.version}>Sprintys · version {APP_VERSION}</Text>
      </Animated.ScrollView>

      {/* Photo source */}
      <BottomSheet visible={photoSheet} onClose={() => setPhotoSheet(false)} title="Photo de profil">
        <View style={{ marginTop: 8 }}>
          <ListRow icon="camera" title="Prendre une photo" onPress={() => pickImage(true)} chevron={false} />
          <ListRow icon="image" title="Choisir dans la galerie" onPress={() => pickImage(false)} chevron={false} last={!user?.avatarUrl} />
          {!!user?.avatarUrl && <ListRow icon="trash-2" title="Retirer la photo" destructive chevron={false} onPress={removePhoto} last />}
        </View>
      </BottomSheet>

      {/* Preview before upload */}
      <BottomSheet visible={!!pending} onClose={() => !uploading && setPending(null)} title="Ta nouvelle photo">
        <View style={styles.previewWrap}>
          {pending && <Image source={{ uri: pending.uri }} style={styles.preview} />}
        </View>
        <Button title="Utiliser cette photo" onPress={confirmPhoto} loading={uploading} />
        <PressableScale haptic="selection" onPress={() => setPending(null)} disabled={uploading} style={styles.secondary}>
          <Text style={styles.secondaryText}>Choisir une autre photo</Text>
        </PressableScale>
      </BottomSheet>

      {/* Blocked users */}
      <BottomSheet
        visible={blockedSheet}
        onClose={() => setBlockedSheet(false)}
        title="Utilisateurs bloqués"
        subtitle="Leurs messages sont masqués dans tes discussions."
      >
        <View style={{ marginTop: 8, minHeight: 120 }}>
          {blocked === null ? (
            <ActivityIndicator color={theme.colors.sprintyBlue} style={{ marginTop: 32 }} />
          ) : blocked.length === 0 ? (
            <EmptyState compact icon="smile" title="Personne n’est bloqué" />
          ) : (
            blocked.map((b, i) => (
              <ListRow
                key={b.id}
                icon="user"
                title={b.name}
                chevron={false}
                last={i === blocked.length - 1}
                value={
                  <PressableScale haptic="selection" onPress={() => unblock(b)} style={styles.unblock}>
                    <Text style={styles.unblockText}>Débloquer</Text>
                  </PressableScale>
                }
              />
            ))
          )}
        </View>
      </BottomSheet>

      <EditProfileModal visible={editVisible} onClose={() => setEditVisible(false)} />
      <FaqModal visible={faqVisible} onClose={() => setFaqVisible(false)} role={role} />
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 48 },
  hero: { alignItems: 'center', paddingTop: 4, paddingBottom: 20 },
  avatarWrap: { marginBottom: 12 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarFallback: { backgroundColor: 'rgba(0, 105, 232, 0.12)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 34, fontWeight: '800', color: theme.colors.sprintyBlue },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.sprintyBlue,
    borderWidth: 3,
    borderColor: theme.colors.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: theme.colors.text, maxWidth: '90%' },
  email: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 2, maxWidth: '90%' },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 105, 232, 0.08)',
  },
  roleText: { fontSize: 13, fontWeight: '700', color: theme.colors.sprintyBlue },
  section: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: theme.colors.textSecondary,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: { paddingVertical: 4, marginBottom: 14 },
  version: { textAlign: 'center', fontSize: 13, color: theme.colors.textMuted, marginTop: 8 },
  previewWrap: { alignItems: 'center', marginVertical: 20 },
  preview: { width: 180, height: 180, borderRadius: 90 },
  secondary: { alignItems: 'center', paddingVertical: 14 },
  secondaryText: { fontSize: 15, fontWeight: '700', color: theme.colors.textSecondary },
  unblock: { paddingHorizontal: 14, height: 34, borderRadius: 17, backgroundColor: 'rgba(0, 105, 232, 0.1)', justifyContent: 'center' },
  unblockText: { fontSize: 14, fontWeight: '700', color: theme.colors.sprintyBlue },
});
