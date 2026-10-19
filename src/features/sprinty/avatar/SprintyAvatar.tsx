import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Mask, Path, RadialGradient, Stop } from 'react-native-svg';
import { POSES, MoodKey, PoseNode } from './poses.generated';
import { createRig } from './avatarRig';
import { applyFrame, RigTarget } from './applyFrame';

/*
 * Sprinty, le léopard des neiges : le dessin d'origine découpé en calques (oreilles, tête, casquette, nez, yeux)
 * qui bougent chacun un peu différemment : la tête suit le doigt, les yeux arrivent avant elle, il cligne et respire.
 * Rendu vectoriel (net à toutes les tailles). Pour les petites tailles et les listes : SprintyFace (image).
 */

const TAGS: Record<string, React.ComponentType<any>> = { g: G, path: Path, ellipse: Ellipse, circle: Circle, mask: Mask, defs: Defs, radialGradient: RadialGradient, stop: Stop };

type Register = (poseKey: string, path: string, node: PoseNode) => (el: unknown) => void;

// Bouche de la pose « neutre » (celle qu'il prend pour parler) : pivot en haut de la bouche, elle s'ouvre vers le bas
const MOUTH_ORIGIN: [number, number] = [525, 792];

function build(node: PoseNode, path: string, poseKey: string, reg: Register): React.ReactNode {
  const C = TAGS[node.t];
  if (!C) return null;
  const props: Record<string, unknown> = { ...(node.a ?? {}) };
  if (node.t === 'stop' && props.offset == null) props.offset = '0';
  if (node.r) props.ref = reg(poseKey, path, node);
  else if (poseKey === 'neutral' && node.i === 'mouth') props.ref = reg(poseKey, path, { ...node, r: 'mouth', o: MOUTH_ORIGIN });
  return React.createElement(
    C,
    { key: path, ...props },
    node.c?.map((c, i) => build(c, `${path}.${i}`, poseKey, reg))
  );
}

export interface SprintyAvatarProps {
  size?: number;
  mood?: MoodKey;
  /** Mouvements spontanés (respiration, clignements, regard). Faux = image fixe, aucun coût. */
  animated?: boolean;
  /** Le doigt posé sur Sprinty fait suivre sa tête et ses yeux. */
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** Sprinty parle (lecture à voix haute) : la bouche bouge et la tête hoche. */
  talking?: boolean;
}

function SprintyAvatarBase({ size = 96, mood = 'neutral', animated = true, interactive = false, style, accessibilityLabel, talking = false }: SprintyAvatarProps) {
  const talkingRef = useRef(talking);
  talkingRef.current = talking;
  const [shown, setShown] = useState<MoodKey>(mood);
  const [prev, setPrev] = useState<MoodKey | null>(null);
  const fade = useRef(new Animated.Value(1)).current;
  const targets = useRef(new Map<string, RigTarget>());
  const look = useRef<{ x: number; y: number } | null>(null);
  const lookTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moodAt = useRef(Date.now());
  const moodRef = useRef<MoodKey>(mood);
  const rig = useMemo(() => createRig(), []);
  const [reduced, setReduced] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    const app = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => {
      sub.remove();
      app.remove();
      if (lookTimer.current) clearTimeout(lookTimer.current);
    };
  }, []);

  // Changement d'humeur : fondu enchaîné entre les deux dessins
  useEffect(() => {
    moodRef.current = mood;
    if (mood === shown) return;
    moodAt.current = Date.now();
    setPrev(shown);
    setShown(mood);
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(({ finished }) => {
      if (finished) setPrev(null);
    });
  }, [mood]);

  const reg: Register = useCallback((poseKey, path, node) => (el) => {
    const id = `${poseKey}:${path}`;
    if (el) targets.current.set(id, { role: node.r!, origin: node.o, el: el as RigTarget['el'] });
    else targets.current.delete(id);
  }, []);

  // Les arbres SVG sont construits une seule fois par humeur et par instance (les refs des calques en dépendent)
  const trees = useRef(new Map<MoodKey, React.ReactNode>());
  const tree = (k: MoodKey) => {
    if (!trees.current.has(k)) trees.current.set(k, build(POSES[k], 'r', k, reg));
    return trees.current.get(k);
  };
  const one = useRef(new Animated.Value(1)).current;

  // Boucle d'animation : une seule, ~40 images par seconde, arrêtée quand l'app passe en arrière-plan
  useEffect(() => {
    if (!animated || !active) return;
    let raf = 0;
    let last = Date.now();
    let lastFrame: ReturnType<typeof rig.step> | null = null;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = Date.now();
      if (now - last < 24) return;
      const dt = (now - last) / 1000;
      last = now;
      const f = rig.step(dt, { mood: moodRef.current, look: look.current, reduced, moodAge: (now - moodAt.current) / 1000, talking: talkingRef.current });
      lastFrame = f;
      applyFrame(targets.current.values(), f, moodRef.current === 'sleep');
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      // Animation interrompue (app en arrière-plan, écran masqué) en plein clignement : on rouvre les yeux
      if (lastFrame && lastFrame.lid < 1) applyFrame(targets.current.values(), { ...lastFrame, lid: 1 }, false);
    };
  }, [animated, active, reduced, rig]);

  const onTouch = (e: any) => {
    if (!interactive) return;
    const { locationX, locationY } = e.nativeEvent;
    look.current = { x: Math.max(-1, Math.min(1, (locationX / size - 0.5) * 2)), y: Math.max(-1, Math.min(1, (locationY / size - 0.5) * 2)) };
    if (lookTimer.current) clearTimeout(lookTimer.current);
  };
  const onRelease = () => {
    if (!interactive) return;
    if (lookTimer.current) clearTimeout(lookTimer.current);
    lookTimer.current = setTimeout(() => (look.current = null), 1400);
  };

  const layer = (k: MoodKey, opacity: Animated.AnimatedInterpolation<number> | Animated.Value) => (
    <Animated.View key={k} style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, opacity }} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 1024 1024">
        {tree(k)}
      </Svg>
    </Animated.View>
  );

  return (
    <View
      style={[{ width: size, height: size }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? 'Sprinty, la mascotte de l’application'}
      onStartShouldSetResponder={() => interactive}
      onResponderGrant={onTouch}
      onResponderMove={onTouch}
      onResponderRelease={onRelease}
      onResponderTerminate={onRelease}
    >
      {prev && layer(prev, fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }))}
      {layer(shown, prev ? fade : one)}
    </View>
  );
}

export const SprintyAvatar = memo(SprintyAvatarBase);
