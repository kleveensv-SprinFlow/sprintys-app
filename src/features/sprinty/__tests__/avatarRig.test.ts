import { createRig, moodOffset, RigInput } from '../avatar/avatarRig';
import { propsFor } from '../avatar/applyFrame';

const base: RigInput = { mood: 'neutral', look: null, reduced: false, moodAge: 5 };
const run = (rig: ReturnType<typeof createRig>, seconds: number, input: RigInput) => {
  let f = rig.step(0.016, input);
  for (let i = 0; i < Math.round(seconds / 0.016); i++) f = rig.step(0.016, input);
  return f;
};

describe('moteur de mouvement de Sprinty', () => {
  it('la tête et le regard suivent le doigt, le regard arrive avant', () => {
    const rig = createRig(() => 0.5);
    const early = rig.step(0.016, { ...base, look: { x: 1, y: -1 } });
    const f = run(rig, 0.1, { ...base, look: { x: 1, y: -1 } });
    expect(f.gx).toBeGreaterThan(f.yaw);
    expect(f.gx).toBeGreaterThan(early.gx);
    const settled = run(rig, 3, { ...base, look: { x: 1, y: -1 } });
    expect(settled.yaw).toBeGreaterThan(0.9);
    expect(settled.pitch).toBeLessThan(-0.9);
  });

  it('revient au centre quand on lâche (animations réduites)', () => {
    const rig = createRig(() => 0.5);
    run(rig, 2, { ...base, reduced: true, look: { x: 1, y: 1 } });
    const f = run(rig, 4, { ...base, reduced: true, look: null });
    expect(Math.abs(f.yaw)).toBeLessThan(0.02);
    expect(f.breathe).toBe(0);
  });

  it('cligne : les paupières se ferment puis se rouvrent', () => {
    const rig = createRig(() => 0.5);
    rig.blinkNow();
    const closed = rig.step(0.05, base);
    expect(closed.lid).toBeLessThan(1);
    const open = run(rig, 0.6, base);
    expect(open.lid).toBeGreaterThan(0.99);
  });

  it('ne cligne jamais spontanément en mode réduit', () => {
    const rig = createRig(() => 0.5);
    let min = 1;
    for (let i = 0; i < 1500; i++) min = Math.min(min, rig.step(0.016, { ...base, reduced: true }).lid);
    expect(min).toBe(1);
  });

  it('chaque humeur a son geste', () => {
    expect(moodOffset('sleep', 0, 0).y).toBeGreaterThan(0.3);
    expect(moodOffset('perplexed', 0, 0).y).toBeLessThan(0);
    expect(Math.abs(moodOffset('caution', 0.03, 0).x)).toBeGreaterThan(0);
    expect(moodOffset('caution', 0.03, 1).x).toBe(0); // la secousse s'éteint
  });

  it('rebondit à chaque changement d’humeur', () => {
    const rig = createRig(() => 0.5);
    expect(rig.step(0.016, { ...base, moodAge: 0.15 }).bounce).toBeGreaterThan(5);
    expect(rig.step(0.016, { ...base, moodAge: 1 }).bounce).toBe(0);
  });
});

describe('transformations appliquées aux calques', () => {
  const frame = { yaw: 1, pitch: 0, gx: 0, gy: 0, lid: 0.5, earR: 4, earL: -4, bounce: 0, breathe: 0, roll: 0, t: 0 };

  it('la casquette se décale plus que la tête (relief)', () => {
    const cap = propsFor({ role: 'cap' }, frame, 0)!;
    const face = propsFor({ role: 'face' }, frame, 0)!;
    expect(cap.x as number).toBeGreaterThan(face.x as number);
  });

  it('les paupières n’écrasent que les yeux', () => {
    expect(propsFor({ role: 'eyeR', origin: [354, 622] }, frame, 0)!.scaleY).toBe(0.5);
    expect(propsFor({ role: 'face' }, frame, 0)!.scaleY).toBe(1);
  });

  it('les oreilles pivotent autour de leur base', () => {
    const p = propsFor({ role: 'earR', origin: [203, 564] }, frame, 0)!;
    expect(p.rotation).toBe(4);
    expect(p.originX).toBe(203);
  });

  it('un rôle inconnu est ignoré', () => {
    expect(propsFor({ role: 'inconnu' }, frame, 0)).toBeNull();
  });
});
