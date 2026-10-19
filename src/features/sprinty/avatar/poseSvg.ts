import type { PoseNode } from './poses.generated';

/** Attributs SVG qui gardent leur casse (les autres passent en kebab-case : strokeWidth → stroke-width). */
const KEEP_CASE = new Set(['viewBox', 'gradientUnits', 'gradientTransform', 'maskUnits', 'maskContentUnits', 'patternUnits', 'patternTransform']);
const TAGS = new Set(['g', 'path', 'ellipse', 'circle', 'mask', 'defs', 'radialGradient', 'linearGradient', 'stop', 'rect']);

const attrName = (k: string) => (KEEP_CASE.has(k) ? k : k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`));
const escAttr = (v: unknown) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function nodeToSvg(n: PoseNode): string {
  if (!TAGS.has(n.t)) return '';
  const attrs = Object.entries(n.a ?? {})
    .map(([k, v]) => ` ${attrName(k)}="${escAttr(v)}"`)
    .join('');
  const children = (n.c ?? []).map(nodeToSvg).join('');
  return children ? `<${n.t}${attrs}>${children}</${n.t}>` : `<${n.t}${attrs}/>`;
}

/** Sprinty en SVG autonome (PDF, partage) à partir des calques de l'avatar. */
export function poseToSvg(pose: PoseNode, size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${nodeToSvg(pose)}</svg>`;
}
