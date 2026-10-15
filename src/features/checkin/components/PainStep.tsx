import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, LayoutAnimation } from 'react-native';
import { useTheme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
import { Feather } from '@expo/vector-icons';
import { useCheckInStore } from '../../../store/checkInStore';
import { useConsentStore } from '../../../store/consentStore';
import { ConsentCheck } from '../../legal/ConsentCheck';
import { CONSENT_TEXTS } from '../../../legal/consents';
import { PressableScale } from '../../../shared/components/PressableScale';
import { Button } from '../../../shared/components/Button';
import { BottomSheet } from '../../../shared/components/BottomSheet';
import type { PainInfo } from '../../../services/checkInService';
import { StepFooter } from './StepFooter';
import { BodyMap3D, BodyMap3DHandle } from './BodyMap3D';
import { BODY_ZONES, MeshSide, SECTIONS, meshSideToPainSide, zoneById, zoneLabel } from '../bodyZones';
import { PAIN_TYPES, PAIN_TYPE_UNSPECIFIED, intensityColor, painKey } from '../painTaxonomy';

interface PainStepProps {
  onBack: () => void;
  onSubmit: () => void;
}

type Side = PainInfo['side'];
const SIDE_OPTIONS: { id: NonNullable<Side>; label: string }[] = [
  { id: 'Gauche', label: 'Gauche' },
  { id: 'Bilatéral', label: 'Les deux' },
  { id: 'Droit', label: 'Droit' },
];
const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const PainStep = ({ onBack, onSubmit }: PainStepProps) => {
  const theme = useTheme();
  const { currentCheckIn, addPain, removePain, isLoading } = useCheckInStore();
  const currentPains = currentCheckIn?.pains || [];

  const painConsent = useConsentStore((s) => !!s.active?.has('health_data'));
  const grantConsent = useConsentStore((s) => s.grant);
  const [consentTicked, setConsentTicked] = useState(false);
  const [granting, setGranting] = useState(false);

  const [mode, setMode] = useState<'3d' | 'list'>('3d');
  const [noPain, setNoPain] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const map = useRef<BodyMap3DHandle>(null);

  // Feuille d'une zone
  const [sheet, setSheet] = useState<{ zoneId: string; side: Side } | null>(null);
  const [intensity, setIntensity] = useState<number | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [showComment, setShowComment] = useState(false);

  const keyOf = (zoneId: string, side: Side) => painKey({ muscle_id: zoneId, side });

  const loadPair = (zoneId: string, side: Side) => {
    const existing = currentPains.find((p) => painKey(p) === keyOf(zoneId, side));
    setSheet({ zoneId, side });
    setIntensity(existing?.intensity ?? null);
    setType(existing && existing.type !== PAIN_TYPE_UNSPECIFIED ? existing.type : null);
    setComment(existing?.comment ?? '');
    setShowComment(!!existing?.comment);
  };

  const openFromMap = (zoneId: string, side: MeshSide) => {
    setNoPain(false);
    loadPair(zoneId, meshSideToPainSide(zoneId, side));
  };

  const openFromList = (zoneId: string) => {
    setNoPain(false);
    const zone = zoneById(zoneId);
    if (!zone?.sides) return loadPair(zoneId, undefined);
    // Premier côté encore libre, pour pouvoir noter gauche ET droite
    const free = (['Gauche', 'Droit', 'Bilatéral'] as const).find((s) => !currentPains.some((p) => painKey(p) === keyOf(zoneId, s)));
    loadPair(zoneId, free ?? 'Gauche');
  };

  const closeSheet = () => setSheet(null);

  const save = () => {
    if (!sheet || intensity === null) return;
    const zone = zoneById(sheet.zoneId);
    addPain({
      muscle_id: sheet.zoneId,
      muscle_name: zone?.name ?? sheet.zoneId,
      type: type ?? PAIN_TYPE_UNSPECIFIED,
      intensity,
      side: sheet.side,
      comment: comment.trim() !== '' ? comment.trim() : undefined,
    });
    closeSheet();
  };

  const toggleNoPain = () => {
    const next = !noPain;
    if (next) currentPains.forEach((p) => removePain(painKey(p)));
    setNoPain(next);
    if (next) map.current?.reset();
  };

  const toggleSection = (id: string, isExpanded: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));
    setExpandedSection(isExpanded ? null : id);
  };

  const sheetZone = sheet ? zoneById(sheet.zoneId) : undefined;
  const sheetHasPain = !!sheet && currentPains.some((p) => painKey(p) === keyOf(sheet.zoneId, sheet.side));
  const selectedOnMap = useMemo(() => {
    if (!sheet) return null;
    const side: MeshSide = sheet.side === 'Gauche' ? 'G' : sheet.side === 'Droit' ? 'D' : 'X';
    return { zoneId: sheet.zoneId, side };
  }, [sheet]);
  const intColor = intensity !== null ? intensityColor(intensity).css : theme.colors.textMuted;

  if (!painConsent) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Corps & douleurs</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Signale les zones douloureuses (optionnel).</Text>
          <View style={[glassCard, styles.consentCard]}>
            <View style={[styles.consentIcon, { backgroundColor: theme.colors.sprintyMuted }]}>
              <Feather name="lock" size={20} color={theme.colors.sprintyBlue} />
            </View>
            <Text style={[styles.consentTitle, { color: theme.colors.text }]}>Activer le suivi des douleurs</Text>
            <Text style={[styles.consentText, { color: theme.colors.textSecondary }]}>
              Les douleurs sont des données de santé : nous ne les enregistrons qu’avec ton accord. Tu peux passer cette étape.
            </Text>
            <ConsentCheck checked={consentTicked} onToggle={() => setConsentTicked((v) => !v)}>
              {CONSENT_TEXTS.health_data}
            </ConsentCheck>
            <Button
              title="Activer"
              style={styles.consentButton}
              disabled={!consentTicked || granting}
              loading={granting}
              onPress={async () => {
                setGranting(true);
                await grantConsent(['health_data']);
                setGranting(false);
              }}
            />
          </View>
        </ScrollView>
        <StepFooter title="Terminer le check-in" onPress={onSubmit} onBack={onBack} loading={isLoading} />
      </View>
    );
  }

  const header = (
    <>
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Corps & douleurs</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {mode === '3d' ? 'Touche le muscle qui te gêne. Un doigt pour tourner, deux pour zoomer.' : 'Choisis la zone qui te gêne.'}
          </Text>
        </View>
        <PressableScale
          haptic="selection"
          onPress={() => setMode(mode === '3d' ? 'list' : '3d')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={mode === '3d' ? 'Afficher la liste des zones' : 'Afficher le corps en 3D'}
        >
          <Text style={[styles.modeLink, { color: theme.colors.sprintyBlue }]}>{mode === '3d' ? 'Vue liste' : 'Vue 3D'}</Text>
        </PressableScale>
      </View>

      <PressableScale
        haptic="medium"
        onPress={toggleNoPain}
        style={[
          styles.noneBtn,
          noPain
            ? { backgroundColor: theme.colors.success }
            : { backgroundColor: theme.colors.surface, borderColor: theme.colors.hairline, borderWidth: StyleSheet.hairlineWidth },
        ]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: noPain }}
      >
        <View style={[styles.noneDot, { backgroundColor: noPain ? 'rgba(255,255,255,0.3)' : theme.colors.border }]}>
          <Feather name="check" size={14} color="#FFFFFF" />
        </View>
        <Text style={[styles.noneText, { color: noPain ? '#FFFFFF' : theme.colors.text }]}>Rien à signaler aujourd’hui</Text>
      </PressableScale>
    </>
  );

  const chips = (
    <View style={styles.chipsRow}>
      {currentPains.length === 0 ? (
        <Text style={[styles.chipsHint, { color: theme.colors.textMuted }]}>
          {noPain ? 'Aucune douleur aujourd’hui. Tu peux terminer.' : 'Aucune zone signalée pour l’instant.'}
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsList}>
          {currentPains.map((p) => (
            <PressableScale
              key={painKey(p)}
              haptic="selection"
              onPress={() => loadPair(p.muscle_id, p.side)}
              style={[styles.painChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.hairline }]}
              accessibilityRole="button"
              accessibilityLabel={`${zoneLabel(p.muscle_id, p.side)}, ${p.intensity} sur 10. Modifier`}
            >
              <View style={[styles.intensityDot, { backgroundColor: intensityColor(p.intensity).css }]} />
              <Text style={[styles.painChipText, { color: theme.colors.text }]}>
                {zoneById(p.muscle_id)?.name ?? p.muscle_name}
                {p.side && p.side !== 'Aucun' ? ` ${p.side === 'Bilatéral' ? 'G+D' : p.side[0]}` : ''} · {p.intensity}/10
              </Text>
            </PressableScale>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {mode === '3d' ? (
        <View style={styles.mapLayout}>
          {header}
          <View style={[styles.mapWrap, noPain && styles.dimmed]}>
            <BodyMap3D
              ref={map}
              pains={currentPains}
              selected={selectedOnMap}
              onSelectZone={openFromMap}
              onUnavailable={() => setMode('list')}
              disabled={noPain}
            />
          </View>
          {chips}
          <Text style={[styles.credit, { color: theme.colors.textMuted }]}>Modèle 3D : Z-Anatomy (CC BY-SA 4.0), d’après BodyParts3D © DBCLS.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {header}
          {chips}
          {SECTIONS.map((section) => {
            const zones = BODY_ZONES.filter((z) => z.section === section.id);
            const isExpanded = expandedSection === section.id;
            const painsInSection = currentPains.filter((p) => zones.some((z) => z.id === p.muscle_id));
            return (
              <View key={section.id} style={[glassCard, styles.sectionCard, isExpanded && { borderColor: theme.colors.sprintyBlue }]}>
                <PressableScale
                  haptic="selection"
                  activeScale={0.98}
                  style={styles.sectionHeader}
                  onPress={() => toggleSection(section.id, isExpanded)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isExpanded }}
                >
                  <View style={styles.sectionHeaderLeft}>
                    <View style={[styles.iconBox, { backgroundColor: isExpanded ? theme.colors.sprintyBlue : theme.colors.sprintyMuted }]}>
                      <Feather name={section.icon as keyof typeof Feather.glyphMap} size={17} color={isExpanded ? '#FFFFFF' : theme.colors.sprintyBlue} />
                    </View>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{section.name}</Text>
                    {painsInSection.length > 0 && (
                      <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
                        <Text style={styles.badgeText}>{painsInSection.length}</Text>
                      </View>
                    )}
                  </View>
                  <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textMuted} />
                </PressableScale>

                {isExpanded && (
                  <View style={[styles.zonesContainer, { borderTopColor: theme.colors.hairline }]}>
                    {zones.map((zone, index) => {
                      const zonePains = currentPains.filter((p) => p.muscle_id === zone.id);
                      const isLast = index === zones.length - 1;
                      return (
                        <PressableScale
                          key={zone.id}
                          haptic="selection"
                          activeScale={0.98}
                          style={[styles.zoneRow, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.hairline }]}
                          onPress={() => openFromList(zone.id)}
                          accessibilityRole="button"
                          accessibilityLabel={
                            zonePains.length
                              ? `${zone.name}, ${zonePains.map((p) => `${zoneLabel(p.muscle_id, p.side)} ${p.intensity} sur 10`).join(' ; ')}`
                              : `Signaler ${zone.name}`
                          }
                        >
                          <Text style={[styles.zoneName, { color: theme.colors.text }]}>{zone.name}</Text>
                          {zonePains.length > 0 ? (
                            <View style={styles.zoneBadges}>
                              {zonePains.map((p) => (
                                <View key={painKey(p)} style={[styles.zoneStateBadge, { backgroundColor: theme.colors.glassFill }]}>
                                  <View style={[styles.intensityDot, { backgroundColor: intensityColor(p.intensity).css }]} />
                                  <Text style={[styles.zoneStateText, { color: theme.colors.textSecondary }]}>
                                    {p.side && p.side !== 'Aucun' ? `${p.side === 'Bilatéral' ? 'G+D' : p.side[0]} · ` : ''}
                                    {p.intensity}/10
                                  </Text>
                                </View>
                              ))}
                            </View>
                          ) : (
                            <Feather name="plus-circle" size={20} color={theme.colors.textMuted} />
                          )}
                        </PressableScale>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      <StepFooter title="Terminer le check-in" onPress={onSubmit} onBack={onBack} loading={isLoading} />

      <BottomSheet visible={!!sheet} onClose={closeSheet} title={sheetZone?.name} subtitle={sheet?.side ? zoneLabel(sheet.zoneId, sheet.side).split(' · ')[1] : undefined}>
        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {sheetZone?.sides && (
            <View style={styles.block}>
              <View style={[styles.sideGrid, { backgroundColor: theme.colors.glassFill }]}>
                {SIDE_OPTIONS.map((s) => {
                  const active = sheet?.side === s.id;
                  return (
                    <PressableScale
                      key={s.id}
                      haptic="selection"
                      containerStyle={styles.sideCell}
                      style={[styles.sideChip, active && { backgroundColor: theme.colors.surface }]}
                      onPress={() => sheet && loadPair(sheet.zoneId, s.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.chipText, { color: active ? theme.colors.text : theme.colors.textSecondary }, active && styles.chipTextActive]}>
                        {s.label}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.block}>
            <View style={styles.labelRow}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Intensité</Text>
              <Text style={[styles.intValue, { color: intColor }]}>{intensity !== null ? `${intensity}/10` : 'Choisis'}</Text>
            </View>
            <View style={styles.levels}>
              {LEVELS.map((n) => {
                const reached = intensity !== null && n <= intensity;
                return (
                  <PressableScale
                    key={n}
                    haptic="selection"
                    containerStyle={styles.levelCell}
                    style={[styles.level, { backgroundColor: reached ? intColor : theme.colors.glassFill }]}
                    onPress={() => setIntensity(n)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: intensity === n }}
                    accessibilityLabel={`Intensité ${n} sur 10`}
                  >
                    <Text style={[styles.levelText, { color: reached ? '#FFFFFF' : theme.colors.text }, intensity === n && styles.chipTextActive]}>{n}</Text>
                  </PressableScale>
                );
              })}
            </View>
            <View style={styles.scale}>
              <Text style={[styles.scaleText, { color: theme.colors.textMuted }]}>Gêne</Text>
              <Text style={[styles.scaleText, styles.scaleMid, { color: theme.colors.textMuted }]}>Douleur</Text>
              <Text style={[styles.scaleText, styles.scaleEnd, { color: theme.colors.textMuted }]}>Forte · ton coach est prévenu</Text>
            </View>
          </View>

          <View style={styles.block}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
              Type <Text style={[styles.optional, { color: theme.colors.textMuted }]}>(facultatif)</Text>
            </Text>
            <View style={styles.typesGrid}>
              {PAIN_TYPES.map((t) => {
                const active = type === t;
                return (
                  <PressableScale
                    key={t}
                    haptic="selection"
                    style={[styles.typeChip, { backgroundColor: active ? theme.colors.sprintyBlue : theme.colors.glassFill }]}
                    onPress={() => setType(active ? null : t)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.chipText, { color: active ? '#FFFFFF' : theme.colors.text }, active && styles.chipTextActive]}>{t}</Text>
                  </PressableScale>
                );
              })}
            </View>
          </View>

          {showComment || (intensity !== null && intensity >= 5) ? (
            <View style={styles.block}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
                {intensity !== null && intensity >= 5 ? 'Précision pour ton coach (recommandé)' : 'Précision pour ton coach'}
              </Text>
              <TextInput
                style={[styles.textInput, { color: theme.colors.text, backgroundColor: theme.colors.glassFill }]}
                placeholder="Ex. : tiraillement après les accélérations…"
                placeholderTextColor={theme.colors.textMuted}
                selectionColor={theme.colors.sprintyBlue}
                value={comment}
                onChangeText={setComment}
                multiline
                textAlignVertical="top"
              />
            </View>
          ) : (
            <PressableScale haptic="selection" onPress={() => setShowComment(true)} style={styles.addComment} accessibilityRole="button">
              <Text style={[styles.addCommentText, { color: theme.colors.sprintyBlue }]}>+ Ajouter une précision pour ton coach</Text>
            </PressableScale>
          )}

          <View style={styles.modalActions}>
            {sheetHasPain && (
              <Button
                title="Retirer"
                variant="ghost"
                textStyle={{ color: theme.colors.error }}
                style={styles.removeBtn}
                onPress={() => {
                  if (sheet) removePain(keyOf(sheet.zoneId, sheet.side));
                  closeSheet();
                }}
              />
            )}
            <Button title="Enregistrer cette zone" onPress={save} disabled={intensity === null} style={styles.saveBtn} />
          </View>
        </ScrollView>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, gap: 12 },
  mapLayout: { flex: 1, paddingHorizontal: 20, paddingTop: 12, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  titleBlock: { flex: 1 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { fontSize: 14, lineHeight: 19, marginTop: 2 },
  modeLink: { fontSize: 13, fontWeight: '700', paddingVertical: 6 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 },
  optional: { textTransform: 'none', letterSpacing: 0, fontWeight: '500' },

  noneBtn: { minHeight: 50, borderRadius: 16, borderCurve: 'continuous', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  noneDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  noneText: { fontSize: 15, fontWeight: '700' },

  mapWrap: { flex: 1 },
  dimmed: { opacity: 0.35 },
  credit: { fontSize: 10, lineHeight: 13, marginBottom: 4 },

  chipsRow: { minHeight: 36, justifyContent: 'center' },
  chipsHint: { fontSize: 13 },
  chipsList: { gap: 8 },
  painChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 36, borderRadius: 12, borderCurve: 'continuous', borderWidth: 1, gap: 8 },
  painChipText: { fontSize: 13, fontWeight: '600' },
  intensityDot: { width: 8, height: 8, borderRadius: 4 },

  consentCard: { padding: 18 },
  consentIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  consentTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, marginBottom: 4 },
  consentText: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  consentButton: { marginTop: 14 },

  sectionCard: { padding: 0, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, minHeight: 56 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  iconBox: { width: 34, height: 34, borderRadius: 10, borderCurve: 'continuous', justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  zonesContainer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16 },
  zoneRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 48, paddingVertical: 12, gap: 12 },
  zoneName: { fontSize: 15, fontWeight: '500', flexShrink: 1 },
  zoneBadges: { alignItems: 'flex-end', gap: 4 },
  zoneStateBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  zoneStateText: { fontSize: 12, fontWeight: '600' },

  sheetScroll: { flexGrow: 0, marginTop: 16 },
  block: { marginBottom: 20 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  intValue: { fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  levels: { flexDirection: 'row', gap: 4 },
  levelCell: { flex: 1 },
  level: { height: 44, borderRadius: 10, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  levelText: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  scale: { flexDirection: 'row', marginTop: 6 },
  scaleText: { flex: 3, fontSize: 11, fontWeight: '600' },
  scaleMid: { textAlign: 'center' },
  scaleEnd: { flex: 4, textAlign: 'right' },

  typesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 14, minHeight: 40, justifyContent: 'center', borderRadius: 12, borderCurve: 'continuous' },
  chipText: { fontSize: 14, fontWeight: '600' },
  chipTextActive: { fontWeight: '800' },

  sideGrid: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 14, borderCurve: 'continuous' },
  sideCell: { flex: 1 },
  sideChip: { minHeight: 40, borderRadius: 10, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },

  addComment: { minHeight: 44, justifyContent: 'center', marginTop: -8, marginBottom: 12 },
  addCommentText: { fontSize: 14, fontWeight: '700' },
  textInput: { minHeight: 90, borderRadius: 14, borderCurve: 'continuous', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, fontSize: 15 },

  modalActions: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  removeBtn: { paddingHorizontal: 20, backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  saveBtn: { flex: 1 },
});
