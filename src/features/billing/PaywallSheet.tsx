import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, View, Text, StyleSheet, ScrollView, Animated, Easing, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '../../core/theme';
import { PressableScale } from '../../shared/components/PressableScale';
import { Button } from '../../shared/components/Button';
import { toast } from '../../shared/feedback/appAlert';
import { useEntitlementStore } from '../../store/entitlementStore';
import { loadOffers, purchaseOffer, redeemPromoCode, restorePurchases, purchasesAvailable, type Offer } from '../../services/purchases';
import { FALLBACK_PRICES, tierOf, type Feature, type Period } from './plans';

const BLUE = theme.colors.sprintyBlue;

interface Reason {
  title: string;
  text: string;
  icon: keyof typeof Feather.glyphMap;
}

const reasonFor = (feature: Feature | 'profile', detail?: string): Reason => {
  switch (feature) {
    case 'photo':
      return { title: 'Analyse tes repas sans compter', text: detail || 'Tu as utilisé tes 3 analyses de repas de la semaine. Avec Plus, plus de limite.', icon: 'camera' };
    case 'text':
      return { title: 'Dis ce que tu as mangé, c’est noté', text: detail || 'Tu as utilisé tes 3 analyses de repas de la semaine. Avec Plus, plus de limite.', icon: 'edit-3' };
    case 'chat':
      return { title: 'Sprinty a encore des choses à te dire', text: detail || 'Tu as utilisé tes 7 messages de la semaine. Avec Plus, Sprinty te répond jusqu’à 60 fois par jour.', icon: 'message-circle' };
    case 'pdf':
      return { title: 'Garde tes plans et analyses', text: 'L’export en PDF est inclus avec Plus.', icon: 'download' };
    case 'plan_long':
      return { title: 'Un plan sur la durée', text: detail || 'Ton plan gratuit de 2 semaines est utilisé. Avec Plus : des plans jusqu’à 12 semaines, ajustés chaque semaine.', icon: 'flag' };
    case 'weekly_report':
      return { title: 'Ton bilan de la semaine', text: 'Séances, nutrition, sommeil et poids résumés, avec 3 actions concrètes, en PDF. C’est dans Plus.', icon: 'bar-chart-2' };
    case 'adaptive_target':
      return { title: 'Un objectif qui s’adapte à toi', text: 'Chaque semaine, tes calories s’ajustent à ta vraie courbe de poids. C’est dans Plus.', icon: 'trending-up' };
    case 'competitions':
      return { title: 'Trouve ta prochaine compétition', text: 'La recherche de compétitions est dans Plus.', icon: 'award' };
    default:
      return { title: 'Sprintys Plus', text: 'Tout ce que tu fais déjà, en allant plus vite, avec un coach IA qui te connaît.', icon: 'zap' };
  }
};

const BENEFITS = [
  { icon: 'camera', text: 'Photo et saisie en une phrase, sans limite' },
  { icon: 'message-circle', text: 'Sprinty : 60 messages par jour' },
  { icon: 'trending-up', text: 'Objectif calorique qui s’adapte à ta courbe de poids' },
  { icon: 'bar-chart-2', text: 'Bilan de la semaine, en PDF' },
  { icon: 'flag', text: 'Plans coach IA jusqu’à 12 semaines' },
  { icon: 'award', text: 'Recherche de compétitions' },
  { icon: 'download', text: 'Export PDF de tes plans et analyses' },
] as const;

const COMPARE: { label: string; free: string; plus: string }[] = [
  { label: 'Recherche d’aliments', free: 'Libre', plus: 'Libre' },
  { label: 'Scan de code-barres', free: 'Libre', plus: 'Libre' },
  { label: 'Photo ou phrase (IA)', free: '3 / semaine', plus: 'Sans limite' },
  { label: 'Messages Sprinty', free: '7 / semaine', plus: '60 / jour' },
  { label: 'Plan coach IA', free: '1 plan, 2 sem.', plus: 'Jusqu’à 12 sem.' },
  { label: 'Objectif calorique adaptatif', free: '—', plus: 'Oui' },
  { label: 'Bilan de la semaine', free: '—', plus: 'Oui' },
  { label: 'Recherche de compétitions', free: '—', plus: 'Oui' },
  { label: 'Export PDF', free: '—', plus: 'Oui' },
];

/** The offer page. Opened only when someone touches a limited feature or taps "Découvrir Premium". */
export function PaywallSheet() {
  const router = useRouter();
  const paywall = useEntitlementStore((s) => s.paywall);
  const info = useEntitlementStore((s) => s.info);
  const close = useEntitlementStore((s) => s.closePaywall);

  const reason = useMemo(() => reasonFor(paywall?.feature ?? 'profile', paywall?.detail), [paywall]);
  const owned = tierOf(info?.plan) !== null;

  const [period, setPeriod] = useState<Period>('yearly');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!paywall) return;
    setShowCompare(false);
    enter.setValue(0);
    Animated.timing(enter, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    loadOffers().then((r) => {
      setOffers(r.offers);
      setLive(r.live);
    });
  }, [paywall]);

  if (!paywall) return null;

  const offerOf = (p: Period) => offers.find((o) => o.tier === 'plus' && o.period === p);
  const priceOf = (p: Period) => offerOf(p)?.price || FALLBACK_PRICES.plus[p];
  const monthlyEquivalent = offerOf('yearly')?.perMonth;
  const selectedOffer = offerOf(period);
  const trial = selectedOffer?.trialDays ?? (live ? undefined : 7);
  const canBuy = purchasesAvailable() && live && !!selectedOffer?.pkg;

  const buy = async () => {
    if (!selectedOffer) return;
    setBusy(true);
    const result = await purchaseOffer(selectedOffer);
    setBusy(false);
    if (result.status === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      toast('success', 'Bienvenue dans Plus. Tout est déjà débloqué.', 'Merci !');
      close();
      useEntitlementStore.getState().refreshAfterPurchase();
    } else if (result.status === 'error') {
      toast('error', result.message, 'Oups');
    }
  };

  const restore = async () => {
    setBusy(true);
    const r = await restorePurchases();
    setBusy(false);
    if (r.status === 'success') {
      toast('success', 'Si tu as un abonnement, il apparaît dans quelques secondes.', 'Achats restaurés');
      useEntitlementStore.getState().refreshAfterPurchase();
    } else if (r.status === 'error') toast('error', r.message, 'Oups');
  };

  const openDoc = (doc: string) => {
    close();
    router.push({ pathname: '/legal/[doc]', params: { doc } });
  };

  const yearly = period === 'yearly';
  const card = (
    <View style={[styles.plan, styles.planOn]} accessibilityLabel="Formule Plus">
      <LinearGradient colors={['#0069E8', '#00B4D8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ribbon}>
        <Feather name="star" size={11} color="#FFFFFF" />
        <Text style={styles.ribbonText}>{owned ? 'Ta formule' : 'Tout débloqué'}</Text>
      </LinearGradient>
      <View style={styles.planHead}>
        <Text style={styles.planName}>Plus</Text>
        <View style={{ flex: 1 }} />
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.price}>
            {priceOf(period)}
            <Text style={styles.priceUnit}>{yearly ? ' / an' : ' / mois'}</Text>
          </Text>
          {yearly && <Text style={styles.perMonth}>{monthlyEquivalent ? `soit ${monthlyEquivalent} / mois` : '2 mois offerts'}</Text>}
        </View>
      </View>
      <View style={styles.benefits}>
        {BENEFITS.map((b) => (
          <View key={b.text} style={styles.benefit}>
            <Feather name={b.icon as any} size={15} color={BLUE} />
            <Text style={styles.benefitText}>{b.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const cta = owned ? null : trial ? `Essayer ${trial} jours gratuits` : 'Choisir Plus';

  return (
    <Modal visible animationType="slide" presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined} onRequestClose={close}>
      <View style={styles.root}>
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <LinearGradient colors={['#0069E8', '#00B4D8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
              <PressableScale haptic="selection" onPress={close} style={styles.close} accessibilityLabel="Plus tard" hitSlop={8}>
                <Feather name="x" size={20} color="#FFFFFF" />
              </PressableScale>
              <Animated.View style={{ opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
                <View style={styles.heroIcon}>
                  <Feather name={reason.icon} size={26} color={BLUE} />
                </View>
                <Text style={styles.heroTitle}>{reason.title}</Text>
                <Text style={styles.heroText}>{reason.text}</Text>
              </Animated.View>
            </LinearGradient>

            <View style={styles.body}>
              <View style={styles.toggle} accessibilityRole="radiogroup">
                {(['monthly', 'yearly'] as Period[]).map((p) => (
                  <Pressable key={p} onPress={() => { Haptics.selectionAsync().catch(() => {}); setPeriod(p); }} style={[styles.toggleItem, period === p && styles.toggleOn]} accessibilityRole="radio" accessibilityState={{ selected: period === p }}>
                    <Text style={[styles.toggleText, period === p && styles.toggleTextOn]}>{p === 'monthly' ? 'Mensuel' : 'Annuel'}</Text>
                    {p === 'yearly' && <Text style={[styles.save, period === p && styles.saveOn]}>2 mois offerts</Text>}
                  </Pressable>
                ))}
              </View>

              {card}

              <PressableScale haptic="selection" onPress={() => setShowCompare((v) => !v)} style={styles.compareBtn} accessibilityRole="button">
                <Text style={styles.compareText}>{showCompare ? 'Masquer la comparaison' : 'Comparer Gratuit et Plus'}</Text>
                <Feather name={showCompare ? 'chevron-up' : 'chevron-down'} size={16} color={BLUE} />
              </PressableScale>
              {showCompare && (
                <View style={styles.table}>
                  <View style={[styles.tr, styles.thead]}>
                    <Text style={[styles.td, styles.tdLabel]} />
                    <Text style={[styles.td, styles.th]}>Gratuit</Text>
                    <Text style={[styles.td, styles.th, { color: BLUE }]}>Plus</Text>
                  </View>
                  {COMPARE.map((r) => (
                    <View key={r.label} style={styles.tr}>
                      <Text style={[styles.td, styles.tdLabel]}>{r.label}</Text>
                      <Text style={styles.td}>{r.free}</Text>
                      <Text style={[styles.td, styles.tdPro]}>{r.plus}</Text>
                    </View>
                  ))}
                </View>
              )}

              {cta && (
                <Button
                  title={cta}
                  onPress={buy}
                  loading={busy}
                  disabled={!canBuy}
                  style={styles.cta}
                />
              )}
              {!canBuy && cta && (
                <Text style={styles.soon}>Les abonnements ne sont pas encore ouverts sur cet appareil. Tout reste utilisable en attendant.</Text>
              )}

              <Text style={styles.legal}>
                {Platform.OS === 'ios' ? 'Le paiement est prélevé sur ton compte Apple' : 'Le paiement est prélevé sur ton compte Google Play'} à la fin de l’essai
                gratuit, puis à chaque période. L’abonnement se renouvelle automatiquement, sauf annulation au moins 24 h avant la fin de la période en cours. Tu le gères
                ou l’annules à tout moment dans les réglages de ton compte {Platform.OS === 'ios' ? 'Apple' : 'Google Play'}. Rien de ce que tu as saisi n’est supprimé si tu arrêtes.
              </Text>
              <View style={styles.links}>
                <PressableScale haptic="selection" onPress={restore} hitSlop={8}>
                  <Text style={styles.link}>Restaurer mes achats</Text>
                </PressableScale>
                <PressableScale haptic="selection" onPress={() => redeemPromoCode()} hitSlop={8}>
                  <Text style={styles.link}>J’ai un code</Text>
                </PressableScale>
              </View>
              <View style={styles.links}>
                <PressableScale haptic="selection" onPress={() => openDoc('terms')} hitSlop={8}>
                  <Text style={styles.linkMuted}>Conditions</Text>
                </PressableScale>
                <PressableScale haptic="selection" onPress={() => openDoc('privacy')} hitSlop={8}>
                  <Text style={styles.linkMuted}>Confidentialité</Text>
                </PressableScale>
              </View>
              <PressableScale haptic="selection" onPress={close} style={styles.later} accessibilityRole="button">
                <Text style={styles.laterText}>Plus tard</Text>
              </PressableScale>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.backdrop },
  content: { paddingBottom: 24 },
  hero: { paddingTop: Platform.OS === 'ios' ? 28 : 54, paddingBottom: 28, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  close: { alignSelf: 'flex-end', width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  heroIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  heroText: { fontSize: 15, lineHeight: 21, color: 'rgba(255,255,255,0.92)', marginTop: 6 },
  body: { paddingHorizontal: 16, paddingTop: 18, gap: 12 },

  toggle: { flexDirection: 'row', backgroundColor: theme.colors.glassFill, borderRadius: 16, padding: 4 },
  toggleItem: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toggleOn: { backgroundColor: '#FFFFFF', shadowColor: '#0F172A', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  toggleText: { fontSize: 14, fontWeight: '700', color: theme.colors.textSecondary },
  toggleTextOn: { color: theme.colors.text },
  save: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted },
  saveOn: { color: theme.colors.success },

  plan: { backgroundColor: theme.colors.surface, borderRadius: 20, borderCurve: 'continuous', borderWidth: 2, borderColor: 'transparent', padding: 16, gap: 12, overflow: 'hidden' },
  planOn: { borderColor: BLUE },
  planOwned: { opacity: 0.6 },
  ribbon: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginBottom: -2 },
  ribbonText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  planHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: BLUE, borderColor: BLUE },
  planName: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
  owned: { fontSize: 12, fontWeight: '700', color: theme.colors.success },
  price: { fontSize: 20, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.4 },
  priceUnit: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  perMonth: { fontSize: 12, fontWeight: '700', color: theme.colors.success },
  benefits: { gap: 9 },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  benefitText: { flex: 1, fontSize: 14, lineHeight: 19, color: theme.colors.text, fontWeight: '600' },

  compareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 },
  compareText: { fontSize: 14, fontWeight: '700', color: BLUE },
  table: { backgroundColor: theme.colors.surface, borderRadius: 18, padding: 10 },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.hairline },
  thead: { borderBottomColor: theme.colors.border },
  td: { flex: 1, fontSize: 11.5, fontWeight: '600', color: theme.colors.textSecondary, paddingHorizontal: 3 },
  tdLabel: { flex: 1.35, color: theme.colors.text, fontWeight: '700' },
  tdPro: { color: theme.colors.text, fontWeight: '800' },
  th: { fontSize: 12, fontWeight: '800', color: theme.colors.text },

  cta: { marginTop: 4 },
  soon: { fontSize: 12, lineHeight: 17, color: theme.colors.textMuted, textAlign: 'center' },
  legal: { fontSize: 11, lineHeight: 16, color: theme.colors.textMuted, textAlign: 'center', marginTop: 4 },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 22 },
  link: { fontSize: 14, fontWeight: '700', color: BLUE, paddingVertical: 8 },
  linkMuted: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, paddingVertical: 6 },
  later: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 24 },
  laterText: { fontSize: 15, fontWeight: '700', color: theme.colors.textSecondary },
});
