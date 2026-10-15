import type { RigFrame } from './avatarRig';

/** Profondeur de chaque calque : plus c'est grand, plus il se décale quand la tête tourne (effet de relief). */
export const DEPTH: Record<string, number> = { back: 0.45, earR: 0.45, earL: 0.45, face: 1, cap: 1.4, nose: 1.22, eyeR: 1.14, eyeL: 1.14 };
const HEAD_CENTER: [number, number] = [512, 600];
const LEO_ORIGIN: [number, number] = [512, 700];

export interface RigTarget {
  role: string;
  /** Point autour duquel on pivote / écrase (oreilles, yeux). */
  origin?: [number, number];
  /** Élément react-native-svg (setNativeProps) */
  el: { setNativeProps?: (p: Record<string, unknown>) => void } | null;
}

/** Les propriétés de transformation de react-native-svg : x / y = décalage, origin = centre de l'échelle et de la rotation. */
export function propsFor(target: Pick<RigTarget, 'role' | 'origin'>, f: RigFrame, index: number): Record<string, unknown> | null {
  const d = DEPTH[target.role];
  const [ox, oy] = target.origin ?? HEAD_CENTER;
  switch (target.role) {
    case 'leo':
      return { x: 0, y: 0, originX: LEO_ORIGIN[0], originY: LEO_ORIGIN[1], scaleX: 1 + f.breathe, scaleY: 1 + f.breathe, rotation: f.roll };
    case 'ball':
      return { x: f.gx * 20, y: f.gy * 13, originX: 0, originY: 0, scaleX: 1, scaleY: 1, rotation: 0 };
    case 'fx':
      return { x: 0, y: Math.sin(f.t * 2.2 + index) * 7, originX: ox, originY: oy, scaleX: 1, scaleY: 1, rotation: Math.sin(f.t * 1.7 + index) * 2 };
    default: {
      if (d === undefined) return null;
      const bounceK = d > 1 ? 1.15 : 1;
      const isEye = target.role === 'eyeR' || target.role === 'eyeL';
      const ear = target.role === 'earR' ? f.earR : target.role === 'earL' ? f.earL : 0;
      return {
        x: f.yaw * d * 30,
        y: f.pitch * d * 20 - f.bounce * bounceK,
        originX: ox,
        originY: oy,
        scaleX: 1 - Math.abs(f.yaw) * 0.035 * d,
        scaleY: isEye ? f.lid : 1,
        rotation: ear,
      };
    }
  }
}

/** Applique une image du moteur à tous les calques enregistrés. */
export function applyFrame(targets: Iterable<RigTarget>, f: RigFrame, sleeping: boolean) {
  let i = 0;
  for (const t of targets) {
    i += 1;
    if (!t.el?.setNativeProps) continue;
    const p = propsFor(t, sleeping && (t.role === 'eyeR' || t.role === 'eyeL') ? { ...f, lid: 1 } : f, i);
    if (p) t.el.setNativeProps(p);
  }
}
