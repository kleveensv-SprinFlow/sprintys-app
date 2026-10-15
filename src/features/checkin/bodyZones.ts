/**
 * Catalogue unique des zones du corps du check-in, partagé par la carte 3D et la vue liste.
 * Les `id` sont stockés dans `check_ins.pains[].muscle_id` : ne jamais renommer un id existant.
 * Les mailles du modèle 3D s'appellent `<id>__<G|D|X>` (voir tools/3d/build_body.py).
 */
import type { PainInfo } from '../../services/checkInService';

export type BodySection = 'jambes' | 'tronc' | 'epaules_bras' | 'cou_tete';

export interface BodyZone {
  id: string;
  name: string;
  /** La zone existe à gauche et à droite. */
  sides: boolean;
  section: BodySection;
}

export const BODY_ZONES: BodyZone[] = [
  { id: 'quadriceps', name: 'Quadriceps', sides: true, section: 'jambes' },
  { id: 'ischios', name: 'Ischio-jambiers', sides: true, section: 'jambes' },
  { id: 'adducteurs', name: 'Adducteurs', sides: true, section: 'jambes' },
  { id: 'fessiers', name: 'Fessiers', sides: true, section: 'jambes' },
  { id: 'hanches', name: 'Hanches', sides: true, section: 'jambes' },
  { id: 'genoux', name: 'Genoux', sides: true, section: 'jambes' },
  { id: 'mollets', name: 'Mollets', sides: true, section: 'jambes' },
  { id: 'tibias', name: 'Tibias', sides: true, section: 'jambes' },
  { id: 'chevilles', name: 'Chevilles', sides: true, section: 'jambes' },
  { id: 'pieds', name: 'Pieds', sides: true, section: 'jambes' },

  { id: 'lombaires', name: 'Lombaires', sides: true, section: 'tronc' },
  { id: 'dorsaux', name: 'Grand dorsal', sides: true, section: 'tronc' },
  { id: 'haut_dos', name: 'Haut du dos (trapèzes)', sides: true, section: 'tronc' },
  { id: 'abdominaux', name: 'Abdominaux', sides: false, section: 'tronc' },
  { id: 'obliques', name: 'Obliques', sides: true, section: 'tronc' },
  { id: 'pectoraux', name: 'Pectoraux', sides: true, section: 'tronc' },
  { id: 'cotes', name: 'Côtes', sides: true, section: 'tronc' },

  { id: 'epaules', name: 'Épaules', sides: true, section: 'epaules_bras' },
  { id: 'biceps', name: 'Biceps', sides: true, section: 'epaules_bras' },
  { id: 'triceps', name: 'Triceps', sides: true, section: 'epaules_bras' },
  { id: 'avant_bras', name: 'Avant-bras', sides: true, section: 'epaules_bras' },
  { id: 'poignets', name: 'Poignets', sides: true, section: 'epaules_bras' },
  { id: 'mains', name: 'Mains', sides: true, section: 'epaules_bras' },

  { id: 'cou', name: 'Cou', sides: false, section: 'cou_tete' },
  { id: 'machoire', name: 'Mâchoire', sides: true, section: 'cou_tete' },
  { id: 'tete', name: 'Tête', sides: false, section: 'cou_tete' },
];

const BY_ID = new Map(BODY_ZONES.map((z) => [z.id, z]));
export const zoneById = (id: string) => BY_ID.get(id);

export const SECTIONS: { id: BodySection; name: string; icon: string }[] = [
  { id: 'jambes', name: 'Jambes', icon: 'activity' },
  { id: 'tronc', name: 'Tronc', icon: 'server' },
  { id: 'epaules_bras', name: 'Épaules & bras', icon: 'git-commit' },
  { id: 'cou_tete', name: 'Cou & tête', icon: 'smile' },
];

export type MeshSide = 'G' | 'D' | 'X';
export type PainSideValue = NonNullable<PainInfo['side']>;

/** Nom d'une maille 3D -> zone + côté. `null` pour ce qui n'est pas touchable (os neutres, inconnu). */
export const parseMeshName = (name: string): { zoneId: string; side: MeshSide } | null => {
  const [zoneId, rawSide] = name.split('__');
  const side = (rawSide || 'X').charAt(0) as MeshSide;
  if (!BY_ID.has(zoneId) || !['G', 'D', 'X'].includes(side)) return null;
  return { zoneId, side };
};

export const meshSideToPainSide = (zoneId: string, side: MeshSide): PainInfo['side'] => {
  if (!zoneById(zoneId)?.sides) return undefined;
  return side === 'G' ? 'Gauche' : side === 'D' ? 'Droit' : undefined;
};

/**
 * Douleur à afficher sur une maille : celle du même côté, sinon « Bilatéral »,
 * sinon une ancienne douleur enregistrée sans côté. La plus forte gagne.
 */
export const painForMesh = (pains: PainInfo[], zoneId: string, side: MeshSide): PainInfo | undefined => {
  const wanted = side === 'G' ? 'Gauche' : side === 'D' ? 'Droit' : null;
  const candidates = pains.filter(
    (p) => p.muscle_id === zoneId && (side === 'X' || !p.side || p.side === 'Aucun' || p.side === 'Bilatéral' || p.side === wanted)
  );
  return candidates.sort((a, b) => b.intensity - a.intensity)[0];
};

/** Libellé pour l'interface : « Genoux · côté gauche ». */
export const zoneLabel = (zoneId: string, side?: PainInfo['side']) => {
  const name = zoneById(zoneId)?.name ?? zoneId;
  if (!side || side === 'Aucun') return name;
  return `${name} · ${side === 'Bilatéral' ? 'les deux côtés' : side === 'Gauche' ? 'côté gauche' : 'côté droit'}`;
};
