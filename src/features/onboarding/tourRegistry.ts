/**
 * Registry of the on-screen elements the guided tour can point at.
 * Elements attach a ref with `tourRef('id')`; the overlay measures them when their step comes up.
 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const nodes = new Map<string, any>();

/** Callback ref: `<View ref={tourRef('athlete.checkin')} />`. */
export const tourRef = (id: string) => (node: any) => {
  if (node) nodes.set(id, node);
  else nodes.delete(id);
};

export const measureTarget = (id: string): Promise<Rect | null> =>
  new Promise((resolve) => {
    const node = nodes.get(id);
    if (!node || typeof node.measureInWindow !== 'function') return resolve(null);
    try {
      node.measureInWindow((x: number, y: number, width: number, height: number) => {
        resolve(width > 0 && height > 0 && Number.isFinite(x) && Number.isFinite(y) ? { x, y, width, height } : null);
      });
    } catch {
      resolve(null);
    }
  });
