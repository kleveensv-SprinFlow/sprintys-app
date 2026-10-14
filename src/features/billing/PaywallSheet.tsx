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
import { FALLBACK_PRICES, TIER_NAMES, tierOf, type Feature, type PaidTier, type Period } from './plans';

const BLUE = theme.colors.sprintyBlue;

interface Reason {
  title: string;
  text: string;
  /** Tier that solves the problem. */
  tier: PaidTier;
  icon: keyof typeof Feather.glyphMap;
}

const reasonFor = (feature: Feature | 'profile', detail?: string): Reason => {
  switch (feature) {
    case 'photo':
      return { title: 'Analyse tes repas sans compter', text: detail || 'Tu as utilisé tes analyses photo du jour. Avec Plus, plus de limite.', tier: 'plus', icon: 'camera' };
    case 'text':
      return { title: 'Dis ce que tu as mangé, c’est noté', text: detail || 'Tu as utilisé tes saisies en une phrase du jour. Avec Plus, plus de limite.', tier: 'plus', icon: 'edit-3' };
    case 'scan':
      return { title: 'Scanne autant que tu veux', text: detail || 'Tu as utilisé tes scans du jour. Avec Plus, plus de limite.', tier: 'plus', icon: 'maximize' };
    case 'chat':
      return { title: 'Sprinty a encore des choses à te dire', text: detail || 'Tu as utilisé tes messages du jour. Plus et Pro en donnent beaucoup plus.', tier: 'plus', icon: 'message-circle' };
    case 'pdf':
      return { title: 'Garde tes plans et analyses', text: 'L’export en PDF est inclus avec Plus et Pro.', tier: 'plus', icon: 'download' };
    case 'plan_long':
      return { title: 'Un plan sur la durée', text: 'Les plans jusqu’à 12 semaines, avec ajustement chaque semaine, sont dans Pro.', tier: 'pro', icon: 'flag' };
    case 'weekly_report':
      return { title: 'Ton bilan de la semaine', text: 'Séances, nutrition, sommeil et poids résumés, avec 3 actions concrètes, en PDF. C’est dans Pro.', tier: 'pro', icon: 'bar-chart-2' };
    case 'adaptive_target':
      return { title: 'Un objectif qui s’adapte à toi', text: 'Chaque semaine, tes calories s’ajustent à ta vraie courbe de poids. C’est dans Pro.', tier: 'pro', icon: 'trending-up' };
    case 'competitions':
      return { title: 'Trouve ta prochaine compétition', text: 'La recherche de compétitions est dans Pro.', tier: 'pro', icon: 'award' };
    default:
      return { title: 'Sprintys Plus et Pro', text: 'Tout ce que tu fais déjà, en allant plus vite, avec un coach IA qui te connaît.', tier: 'plus', icon: 'zap' };
  }
};

const PLUS_BENEFITS = [
  { icon: 'camera', text: 'Photo, phrase et scan sans limite' },
  { icon: 'message-circle', text: 'Sprinty : 40 messages par jour' },
  { icon: 'download', text: 'Export PDF de tes plans et analyses' },
] as const;

const PRO_BENEFITS = [
  { icon: 'check-circle', text: 'Tout ce qu’il y a dans Plus' },
  { icon: 'trending-up', text: 'Objectif calorique qui s’adapte à ta courbe de poids' },
  { icon: 'bar-chart-2', text: 'Bilan de la semaine en PDF' },
  { icon: 'flag', text: 'Coach IA complet : plans de 12 semaines, ajustés chaque semaine' },
  { icon: 'aperture', text: 'Analyse photo plus précise, Sprinty : 150 messages par jour' },
] as const;

const COMPARE: { label: string; free: string; plus: string; pro: string }[] = [
  { label: 'Photo IA du repas', free: '3 / jour', plus: 'Sans limite', pro: 'Sans limite, plus précise' },
  { label: 'Saisie en une phrase', free: '5 / jour', plus: 'Sans limite', pro: 'Sans limite' },
  { label: 'Scan de code-barres', free: '5 / jour', plus: 'Sans limite', pro: 'Sans limite' },
  { label: 'Messages Sprinty', free: '10 / jour', plus: '40 / jour', pro: '150 / jour' },
  { label: 'Export PDF', free: '—', plus: 'Oui', pro: 'Oui' },
  { label: 'Plan coach IA', free: '4 semaines', plus: '4 semaines', pro: '12 sem., ajusté' },
  { label: 'Objectif calorique adaptatif', free: '—', plus: '—', pro: 'Oui' },
  { label: 'Bilan de la semaine', free: '—', plus: '—', pro: 'Oui' },
  { label: 'Recherche de compétitions', free: '—', plus: '—', pro: 'Oui' },
];

/** The offer page. Opened only when someone touches a limited feature or taps "Découvrir Premium". */
export function PaywallSheet() {
  const router = useRouter();
  const paywall = useEntitlementStore((s) => s.paywall);
  const info = useEntitlementStore((s) => s.info);
  const close = useEntitlementStore((s) => s.closePaywall);

  const reason = useMemo(() => reasonFor(paywall?.feature ?? 'profile', paywall?.detail), [paywall]);
  const currentTier = tierOf(info?.plan);

  const [period, setPeriod] = useState<Period>('yearly');
  const [selected, setSelected] = useState<PaidTier>('plus');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!paywall) return;
    setSelected(currentTier === 'plus' ? 'pro' : reason.tier);
    setShowCompare(false);
    enter.setValue(0);
    Animated.timing(enter, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    loadOffers().then((r) => {
      setOffers(r.offers);
      setLive(r.live);
    });
  }, [paywall]);

  if (!paywall) return null;

  const offerOf = (tier: PaidTier, p: Period) => offers.find((o) => o.tier === tier && o.period === p);
  const priceOf = (tier: PaidTier, p: Period) => offerOf(tier, p)?.price || FALLBACK_PRICES[tier][p];
  const monthlyEquivalent = (tier: PaidTier) => offerOf(tier, 'yearly')?.perMonth;
  const selectedOffer = offerOf(selected, period);
  const trial = selectedOffer?.trialDays ?? (live ? undefined : 7);
  const canBuy = purchasesAvailable() && live && !!selectedOffer?.pkg;

  const choose = (tier: PaidTier) => {
    if (tier === currentTier) return;
    Haptics.selectionAsync().catch(() => undefined);
    setSelected(tier);
  };

  const buy = async () => {
    if (!selectedOffer) return;
    setBusy(true);
    const result = await purchaseOffer(selectedOffer);
    setBusy(false);
    if (result.status === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      toast('success', `Bienvenue dans ${TIER_NAMES[selected]}. Tout est déjà débloqué.`, 'Merci !');
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

  const card = (tier: PaidTier) => {
    const on = selected === tier;
    const owned = currentTier === tier;
    const benefits = tier === 'plus' ? PLUS_BENEFITS : PRO_BENEFITS;
    const yearly = period === 'yearly';
    return (
      <PressableScale
        key={tier}
        haptic="none"
        onPress={() => choose(tier)}
        style={[styles.plan, on && styles.planOn, owned && styles.planOwned]}
        accessibilityRole="radio"
        accessibilityState={{ selected: on, disabled: owned }}
        accessibilityLabel={`Formule ${TIER_NAMES[tier]}`}
      >
        {tier === 'pro' && (
          <LinearGradient colors={['#0069E8', '#00B4D8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ribbon}>
            <Feather name="star" size={11} color="#FFFFFF" />
            <Text style={styles.ribbonText}>Le plus complet</Text>
          </LinearGradient>
        )}
        <View style={styles.planHead}>
          <View style={[styles.radio, on && styles.radioOn]}>{on && <Feather name="check" size={13} color="#FFFFFF" />}</View>
          <Text style={styles.planName}>{TIER_NAMES[tier]}</Text>
          {owned && <Text style={styles.owned}>Ta formule</Text>}
          <View style={{ flex: 1 }} />
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.price}>
              {yearly ? priceOf(tier, 'yearly') : priceOf(tier, 'monthly')}
              <Text style={styles.priceUnit}>{yearly ? ' / an' : ' / mois'}</Text>
            </Text>
            {yearly && <Text style={styles.perMonth}>{monthlyEquivalent(tier) ? `soit ${monthlyEquivalent(tier)} / mois` : '2 mois offerts'}</Text>}
          </View>
        </View>
        <View style={styles.benefits}>
          {benefits.map((b) => (
            <View key={b.text} style={styles.benefit}>
              <Feather name={b.icon as any} size={15} color={BLUE} />
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>
      </PressableScale>
    );
  };

  const cta = currentTier === 'pro' ? null : trial ? `Essayer ${trial} jours gratuits` : `Choisir ${TIER_NAMES[selected]}`;

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

              {card('plus')}
              {card('pro')}

              <PressableScale haptic="selection" onPress={() => setShowCompare((v) => !v)} style={styles.compareBtn} accessibilityRole="button">
                <Text style={styles.compareText}>{showCompare ? 'Masquer la comparaison' : 'Comparer Gratuit, Plus et Pro'}</Text>
                <Feather name={showCompare ? 'chevron-up' : 'chevron-down'} size={16} color={BLUE} />
              </PressableScale>
              {showCompare && (
                <View style={styles.table}>
                  <View style={[styles.tr, styles.thead]}>
                    <Text style={[styles.td, styles.tdLabel]} />
                    <Text style={[styles.td, styles.th]}>Gratuit</Text>
                    <Text style={[styles.td, styles.th]}>Plus</Text>
                    <Text style={[styles.td, styles.th, { color: BLUE }]}>Pro</Text>
                  </View>
                  {COMPARE.map((r) => (
                    <View key={r.label} style={styles.tr}>
                      <Text style={[styles.td, styles.tdLabel]}>{r.label}</Text>
                      <Text style={styles.td}>{r.free}</Text>
                      <Text style={styles.td}>{r.plus}</Text>
                      <Text style={[styles.td, styles.tdPro]}>{r.pro}</Text>
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
