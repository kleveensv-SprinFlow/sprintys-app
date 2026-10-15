/**
 * Moteur de mouvement de Sprinty (pur, sans React ni SVG) : à chaque image il calcule l'orientation de la tête,
 * le regard, le clignement, l'oreille qui frétille et les petits gestes propres à chaque humeur.
 * Le composant SprintyAvatar applique ensuite ces valeurs aux calques du dessin.
 */
import type { MoodKey } from './poses.generated';

export interface RigInput {
  mood: MoodKey;
  /** Où regarde Sprinty, de -1 à 1 (doigt posé sur lui) ; null = il regarde un peu partout. */
  look: { x: number; y: number } | null;
  /** « Réduire les animations » : plus aucun mouvement spontané, il suit seulement le doigt. */
  reduced: boolean;
  /** Secondes depuis le dernier changement d'humeur (rebond, secousse). */
  moodAge: number;
}

export interface RigFrame {
  /** Orientation de la tête, de -1 (à droite de l'écran) à 1. */
  yaw: number;
  pitch: number;
  /** Regard (arrive avant la tête). */
  gx: number;
  gy: number;
  /** Ouverture des paupières : 1 = ouvert, ~0.08 = fermé. */
  lid: number;
  /** Rotation des oreilles, en degrés. */
  earR: number;
  earL: number;
  /** Rebond vers le haut, en unités du dessin (1024). */
  bounce: number;
  /** Respiration : écart autour de 1. */
  breathe: number;
  /** Inclinaison de la tête, en degrés. */
  roll: number;
  /** Temps écoulé, pour les éléments flottants. */
  t: number;
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Ce que fait chaque humeur en plus du comportement de base. */
export function moodOffset(mood: MoodKey, t: number, moodAge: number): { x: number; y: number; roll: number } {
  switch (mood) {
    case 'perplexed': // penche la tête d'un côté et lève les yeux
      return { x: Math.sin(t * 0.8) * 0.25, y: -0.25, roll: Math.sin(t * 0.8) * 1.5 };
    case 'caution': // sursaut : une secousse qui s'éteint en 0,7 s
      return { x: Math.sin(t * 22) * 0.18 * Math.max(0, 1 - moodAge / 0.7), y: 0, roll: 0 };
    case 'sleep': // tête basse, respiration lente
      return { x: 0, y: 0.45 + Math.sin(t * 0.9) * 0.1, roll: 0 };
    case 'success': // petits hochements joyeux
      return { x: 0, y: -Math.max(0, Math.sin(t * 3)) * 0.1, roll: 0 };
    default:
      return { x: 0, y: 0, roll: 0 };
  }
}

export function createRig(random: () => number = Math.random) {
  let t = 0;
  let yaw = 0;
  let pitch = 0;
  let gx = 0;
  let gy = 0;
  let blink = 0;
  let nextBlink = 2;
  let ear = 0;
  let earSide = 0;
  let nextEar = 4;
  let forcedBlink = false;

  return {
    /** Fait cligner Sprinty tout de suite (appui sur lui). */
    blinkNow() {
      forcedBlink = true;
    },
    step(dt: number, input: RigInput): RigFrame {
      dt = clamp(dt, 0, 0.05);
      t += dt;
      const { mood, look, reduced, moodAge } = input;

      let tx = look ? look.x : 0;
      let ty = look ? look.y : 0;
      if (!look && !reduced) {
        tx = Math.sin(t * 0.43) * 0.28; // le regard vagabonde doucement
        ty = Math.sin(t * 0.31 + 1) * 0.12;
      }
      const m = reduced ? { x: 0, y: 0, roll: 0 } : moodOffset(mood, t, moodAge);
      tx += m.x;
      ty += m.y;
      if (mood === 'sleep') tx *= 0.4;

      const k = 1 - Math.pow(0.0006, dt); // lissage indépendant de la cadence
      yaw += (tx - yaw) * k * 0.55;
      pitch += (ty - pitch) * k * 0.55;
      gx += (tx - gx) * k * 1.1; // les yeux arrivent avant la tête
      gy += (ty - gy) * k * 1.1;

      if ((!reduced && t > nextBlink && mood !== 'sleep') || forcedBlink) {
        blink = 1;
        nextBlink = t + 2.5 + random() * 3.5;
        forcedBlink = false;
      }
      blink = Math.max(0, blink - dt * 7);
      const lid = blink > 0 ? 1 - Math.sin((1 - blink) * Math.PI) * 0.92 : 1;

      if (!reduced && t > nextEar) {
        ear = 1;
        earSide = random() < 0.5 ? 0 : 1;
        nextEar = t + 4 + random() * 6;
      }
      ear = Math.max(0, ear - dt * 3.2);
      const wag = Math.sin(ear * Math.PI * 3) * ear * 9;

      const bounce = !reduced && moodAge < 0.3 ? Math.sin((moodAge / 0.3) * Math.PI) * 14 : 0;

      return {
        yaw,
        pitch,
        gx,
        gy,
        lid,
        earR: (earSide === 0 ? wag : 0) + yaw * 2,
        earL: (earSide === 1 ? wag : 0) - yaw * 2,
        bounce,
        breathe: reduced ? 0 : Math.sin(t * 1.6) * 0.006,
        roll: yaw * 3.2 + m.roll,
        t,
      };
    },
  };
}
