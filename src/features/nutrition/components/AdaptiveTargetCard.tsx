import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
import { GlassSheen } from '../../../shared/components/GlassSheen';
import { PressableScale } from '../../../shared/components/PressableScale';
import { Button } from '../../../shared/components/Button';
import { toast } from '../../../shared/feedback/appAlert';
import { supabase } from '../../../services/supabase';
import { bodyService } from '../../../services/bodyService';
import { useAuthStore } from '../../../store/authStore';
import { useEntitlementStore } from '../../../store/entitlementStore';
import { adaptTarget, MIN_WEIGHINS } from '../adaptTarget';
import { ageOn } from '../../../legal/age';

const BLUE = theme.colors.sprintyBlue;
const WEEK = 7 * 86400000;
const fmt = (n: number, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toString().replace('.', ',');

/**
 * "Objectif qui s'adapte" (Plus): once a week at most, compares the real weight trend with the wanted pace and offers a
 * small change of the daily calories. Always the person's choice.
 */
export const AdaptiveTargetCard: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const reloadProfile = useAuthStore((s) => s.reloadProfile);
  const plan = useEntitlementStore((s) => s.info);
  const [weights, setWeights] = useState<{ date: string; weight: number }[] | null>(null);
  const [snoozed, setSnoozed] = useState(true);
  const [busy, setBusy] = useState(false);
  const key = user?.id ? `@sprintys_adapt:${user.id}` : null;

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    bodyService
      .fetchMetrics(user.id)
      .then((rows: any[]) => alive && setWeights((rows || []).filter((r) => r?.weight != null).map((r) => ({ date: r.created_at, weight: Number(r.weight) }))))
      .catch(() => undefined);
    if (key) {
      AsyncStorage.getItem(key)
        .then((v) => alive && setSnoozed(!!v && Date.now() - Number(v) < WEEK))
        .catch(() => alive && setSnoozed(false));
    }
    return () => {
      alive = false;
    };
  }, [user?.id]);

  if (!user || !plan || !weights || snoozed) return null;
  const goal = user.manualKcalGoal;
  if (!goal || weights.length < MIN_WEIGHINS) return null;

  // Not in the plan: a quiet one-line invitation (only once billing is on)
  if (plan.billing_enabled && !plan.adaptive_target) {
    return (
      <PressableScale haptic="selection" onPress={() => useEntitlementStore.getState().openPaywall('adaptive_target')} style={[glassCard, styles.card, styles.row]} accessibilityRole="button">
        <GlassSheen radius={22} />
        <Feather name="trending-up" size={16} color={BLUE} />
        <Text style={styles.teaser}>Objectif calorique qui s’adapte à ta courbe de poids</Text>
        <View style={styles.pro}>
          <Text style={styles.proText}>PLUS</Text>
        </View>
      </PressableScale>
    );
  }

  const athleteAge = ageOn(user.dateOfBirth);
  const isMinor = athleteAge < 18 || !user.dateOfBirth;

  if (isMinor) return null;

  const r = adaptTarget({
    objective: user.objective,
    currentTarget: goal,
    weeklyKg: user.weeklyWeightGoal,
    weights,
    floor: user.gender === 'femme' || user.gender === 'female' ? 1200 : 1500,
    isMinor,
  });
  if (r.status !== 'adjust' || r.observed == null) return null;

  const snooze = async () => {
    setSnoozed(true);
    if (key) AsyncStorage.setItem(key, String(Date.now())).catch(() => undefined);
  };

  const apply = async () => {
    setBusy(true);
    const { error } = await supabase.from('profiles').update({ manual_kcal_goal: r.newTarget }).eq('id', user.id);
    setBusy(false);
    if (error) {
      toast('error', 'Le changement n’a pas été enregistré. Réessaie.', 'Oups');
      return;
    }
    await snooze();
    await reloadProfile();
    toast('success', `Ton objectif est maintenant de ${r.newTarget.toLocaleString('fr-FR')} kcal par jour.`, 'Objectif ajusté');
  };

  const more = r.deltaKcal > 0;
  return (
    <View style={[glassCard, styles.card, { gap: 10 }]}>
      <GlassSheen radius={22} />
      <View style={styles.row}>
        <View style={styles.badge}>
          <Feather name="trending-up" size={16} color={BLUE} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>OBJECTIF QUI S’ADAPTE</Text>
          <Text style={styles.title}>
            {more ? '+' : '−'} {Math.abs(r.deltaKcal)} kcal par jour ?
          </Text>
        </View>
      </View>
      <Text style={styles.text}>
        Ton poids évolue de {fmt(r.observed, 2)} kg par semaine, pour {fmt(r.expected, 2)} voulu. En passant de {goal.toLocaleString('fr-FR')} à{' '}
        {r.newTarget.toLocaleString('fr-FR')} kcal, tu te rapproches de ton rythme. Un changement à la fois : on regarde de nouveau dans une semaine.
      </Text>
      <View style={styles.actions}>
        <Button title="Appliquer" onPress={apply} loading={busy} style={{ flex: 1 }} />
        <PressableScale haptic="selection" onPress={snooze} style={styles.later} accessibilityRole="button">
          <Text style={styles.laterText}>Plus tard</Text>
        </PressableScale>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 12, padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(0, 105, 232, 0.1)', alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 11, fontWeight: '800', color: BLUE, letterSpacing: 0.6 },
  title: { fontSize: 17, fontWeight: '800', color: theme.colors.text },
  text: { fontSize: 13, lineHeight: 19, color: theme.colors.textSecondary },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  later: { minHeight: 44, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  laterText: { fontSize: 14, fontWeight: '800', color: BLUE },
  teaser: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.colors.text },
  pro: { backgroundColor: 'rgba(0, 105, 232, 0.12)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  proText: { fontSize: 10, fontWeight: '800', color: BLUE, letterSpacing: 0.5 },
});
