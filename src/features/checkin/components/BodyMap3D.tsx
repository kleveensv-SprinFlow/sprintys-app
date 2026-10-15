import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useTheme } from '../../../core/theme';
import { PressableScale } from '../../../shared/components/PressableScale';
import type { PainInfo } from '../../../services/checkInService';
import { MeshSide, painForMesh, parseMeshName } from '../bodyZones';
import { intensityColor } from '../painTaxonomy';

/*
 * Corps musculaire 3D touchable (modèle Z-Anatomy, CC BY-SA 4.0 — voir assets/models/LICENSE-body.txt).
 * Un doigt : tourner. Deux doigts : zoomer et déplacer. Toucher : choisir un muscle (tolérant pour les
 * petites zones). Le rendu ne se fait que quand quelque chose change (batterie).
 */

// GLTFLoader lit l'en-tête JSON du .glb avec TextDecoder, absent de certains moteurs JS mobiles.
if (typeof (globalThis as { TextDecoder?: unknown }).TextDecoder === 'undefined') {
  (globalThis as { TextDecoder?: unknown }).TextDecoder = class {
    decode(input?: ArrayBuffer | ArrayBufferView) {
      if (!input) return '';
      const b = input instanceof ArrayBuffer ? new Uint8Array(input) : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
      let out = '';
      for (let i = 0; i < b.length; ) {
        const c = b[i++];
        if (c < 0x80) out += String.fromCharCode(c);
        else if (c < 0xe0) out += String.fromCharCode(((c & 0x1f) << 6) | (b[i++] & 0x3f));
        else if (c < 0xf0) out += String.fromCharCode(((c & 0x0f) << 12) | ((b[i++] & 0x3f) << 6) | (b[i++] & 0x3f));
        else {
          const cp = (((c & 0x07) << 18) | ((b[i++] & 0x3f) << 12) | ((b[i++] & 0x3f) << 6) | (b[i++] & 0x3f)) - 0x10000;
          out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
        }
      }
      return out;
    }
  };
}

const MODEL = require('../../../../assets/models/body.glb');

const COLORS = { idle: 0xd3dae3, bone: 0xede6d8, selected: 0x4c93f0 };
const FOV = 26;
const VIEWS = { face: 0, dos: Math.PI, gauche: Math.PI / 2, droit: -Math.PI / 2 } as const; // +X = côté gauche du sujet
type ViewName = keyof typeof VIEWS;
const POLAR_MIN = Math.PI * 0.3;
const POLAR_MAX = Math.PI * 0.7;
/** Rayons (pt) des cercles de recherche quand le doigt tombe entre deux muscles ou sur un os. */
const PICK_RINGS = [14, 26, 40];

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

interface Orbit {
  az: number;
  polar: number;
  dist: number;
  target: THREE.Vector3;
}

export interface BodyMap3DHandle {
  reset: () => void;
}

interface BodyMap3DProps {
  pains: PainInfo[];
  selected?: { zoneId: string; side: MeshSide } | null;
  onSelectZone?: (zoneId: string, side: MeshSide) => void;
  /** Le rendu 3D est indisponible sur cet appareil : le parent bascule sur la liste. */
  onUnavailable?: () => void;
  disabled?: boolean;
  /**
   * `full` : un doigt tourne, deux doigts zooment (écran dédié).
   * `tapOnly` : seulement toucher + boutons de vue, pour une carte posée dans une page qui défile.
   */
  gestures?: 'full' | 'tapOnly';
  /** Hauteur fixe (page qui défile) ; sinon la carte prend la place disponible. */
  height?: number;
}

export const BodyMap3D = forwardRef<BodyMap3DHandle, BodyMap3DProps>(
  ({ pains, selected, onSelectZone, onUnavailable, disabled, gestures = 'full', height }, ref) => {
    const theme = useTheme();
    const [ready, setReady] = useState(false);
    const [view, setView] = useState<ViewName | null>('face');
    const [zoomed, setZoomed] = useState(false);
    const [front, setFront] = useState(true);

    const size = useRef({ w: 1, h: 1 });
    const three = useRef<{
      gl: ExpoWebGLRenderingContext;
      renderer: THREE.WebGLRenderer;
      scene: THREE.Scene;
      camera: THREE.PerspectiveCamera;
      meshes: THREE.Mesh[];
      boxes: Map<THREE.Mesh, THREE.Box3>;
      bounds: THREE.Box3;
      baseDist: number;
    } | null>(null);
    const orbit = useRef<Orbit>({ az: 0, polar: Math.PI / 2, dist: 4, target: new THREE.Vector3() });
    const tween = useRef<{ from: Orbit; to: Orbit; t0: number; dur: number } | null>(null);
    const dirty = useRef(true);
    const raf = useRef<number | null>(null);
    const props = useRef({ pains, selected, onSelectZone, disabled, gestures });
    props.current = { pains, selected, onSelectZone, disabled, gestures };

    const syncUi = useCallback(() => {
      const t = three.current;
      if (!t) return;
      const o = orbit.current;
      setZoomed(o.dist < t.baseDist * 0.85 || o.target.length() > 0.05);
      setFront(Math.cos(o.az) >= 0);
    }, []);

    const animateTo = useCallback((to: Partial<Orbit>, dur = 450) => {
      const o = orbit.current;
      const from = { ...o, target: o.target.clone() };
      let az = to.az ?? o.az;
      az = o.az + Math.atan2(Math.sin(az - o.az), Math.cos(az - o.az)); // plus court chemin
      tween.current = {
        from,
        to: { az, polar: to.polar ?? o.polar, dist: to.dist ?? o.dist, target: (to.target ?? o.target).clone() },
        t0: Date.now(),
        dur,
      };
      dirty.current = true;
    }, []);

    const reset = useCallback(() => {
      const t = three.current;
      if (!t) return;
      animateTo({ dist: t.baseDist, polar: Math.PI / 2, target: new THREE.Vector3() });
    }, [animateTo]);
    useImperativeHandle(ref, () => ({ reset }), [reset]);

    const goView = (name: ViewName) => {
      const t = three.current;
      if (!t) return;
      setView(name);
      animateTo({ az: VIEWS[name], polar: Math.PI / 2, dist: t.baseDist, target: new THREE.Vector3() }, 520);
    };

    // Couleurs : douleur (selon l'intensité), sélection, repos
    useEffect(() => {
      const t = three.current;
      if (!t) return;
      for (const m of t.meshes) {
        const z = parseMeshName(m.name)!;
        const mat = m.material as THREE.MeshStandardMaterial;
        const isSel = !!selected && selected.zoneId === z.zoneId && (selected.side === z.side || z.side === 'X');
        const pain = painForMesh(pains, z.zoneId, z.side);
        mat.color.setHex(isSel ? COLORS.selected : pain ? intensityColor(pain.intensity).hex : COLORS.idle);
        mat.emissive.setHex(isSel ? 0x0a2a5a : 0x000000);
      }
      dirty.current = true;
    }, [pains, selected, ready]);

    const applyCamera = () => {
      const t = three.current!;
      const o = orbit.current;
      const s = Math.sin(o.polar);
      t.camera.position.set(
        o.target.x + o.dist * s * Math.sin(o.az),
        o.target.y + o.dist * Math.cos(o.polar),
        o.target.z + o.dist * s * Math.cos(o.az)
      );
      t.camera.lookAt(o.target);
      t.camera.updateMatrixWorld();
    };

    const pickAt = (x: number, y: number): THREE.Mesh | null => {
      const t = three.current;
      if (!t) return null;
      applyCamera();
      const ray = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      const castOne = (px: number, py: number) => {
        ndc.set((px / size.current.w) * 2 - 1, -(py / size.current.h) * 2 + 1);
        ray.setFromCamera(ndc, t.camera);
        const hit = ray.intersectObjects(t.scene.children, true).find((h) => (h.object as THREE.Mesh).isMesh);
        return hit && t.meshes.includes(hit.object as THREE.Mesh) ? (hit.object as THREE.Mesh) : null;
      };
      const direct = castOne(x, y);
      if (direct) return direct;
      // Doigt entre deux muscles ou sur un os : on cherche la zone touchable la plus proche autour du point
      for (const r of PICK_RINGS) {
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          const m = castOne(x + Math.cos(a) * r, y + Math.sin(a) * r);
          if (m) return m;
        }
      }
      return null;
    };

    const focusMesh = (m: THREE.Mesh) => {
      const t = three.current!;
      const box = t.boxes.get(m)!;
      const c = box.getCenter(new THREE.Vector3());
      const span = box.getSize(new THREE.Vector3()).length();
      animateTo({ target: c, dist: clamp(span * 2.2, t.baseDist * 0.2, t.baseDist * 0.7) });
    };

    // --- Gestes -----------------------------------------------------------------------------------------
    const g = useRef({ x0: 0, y0: 0, lx: 0, ly: 0, t0: 0, moved: false, pinch: 0, pinchDist: 0, mx: 0, my: 0, locX: 0, locY: 0 });
    const pan = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => !props.current.disabled,
        onMoveShouldSetPanResponder: () => !props.current.disabled && props.current.gestures === 'full',
        // En mode « toucher seulement », la page qui défile peut reprendre le geste
        onPanResponderTerminationRequest: () => props.current.gestures === 'tapOnly',
        onPanResponderGrant: (e) => {
          tween.current = null;
          const n = e.nativeEvent;
          Object.assign(g.current, { x0: n.pageX, y0: n.pageY, lx: n.pageX, ly: n.pageY, t0: Date.now(), moved: false, pinch: 0, locX: n.locationX, locY: n.locationY });
        },
        onPanResponderMove: (e) => {
          const t = three.current;
          if (!t) return;
          const st = g.current;
          const o = orbit.current;
          const touches = e.nativeEvent.touches;
          if (props.current.gestures === 'tapOnly') {
            if (Math.hypot(e.nativeEvent.pageX - st.x0, e.nativeEvent.pageY - st.y0) > 8) st.moved = true;
            return;
          }
          if (touches.length >= 2) {
            const [a, b] = touches;
            const d = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
            const mx = (a.pageX + b.pageX) / 2;
            const my = (a.pageY + b.pageY) / 2;
            if (!st.pinch) {
              Object.assign(st, { pinch: d, pinchDist: o.dist, mx, my, moved: true });
              return;
            }
            o.dist = clamp((st.pinchDist * st.pinch) / Math.max(d, 1), t.baseDist * 0.18, t.baseDist * 1.25);
            // Glisser à deux doigts : déplace le point visé dans le plan de l'écran
            const wpp = (2 * o.dist * Math.tan(THREE.MathUtils.degToRad(FOV / 2))) / size.current.h;
            const right = new THREE.Vector3(Math.cos(o.az), 0, -Math.sin(o.az));
            o.target.addScaledVector(right, -(mx - st.mx) * wpp);
            o.target.y += (my - st.my) * wpp;
            o.target.clamp(t.bounds.min, t.bounds.max);
            st.mx = mx;
            st.my = my;
            dirty.current = true;
            return;
          }
          if (st.pinch) return; // fin d'un pincement : on ignore le doigt restant
          const x = touches[0]?.pageX ?? e.nativeEvent.pageX;
          const y = touches[0]?.pageY ?? e.nativeEvent.pageY;
          if (!st.moved && Math.hypot(x - st.x0, y - st.y0) > 8) st.moved = true;
          if (st.moved) {
            o.az -= (x - st.lx) * 0.009;
            o.polar = clamp(o.polar - (y - st.ly) * 0.006, POLAR_MIN, POLAR_MAX);
            dirty.current = true;
          }
          st.lx = x;
          st.ly = y;
        },
        onPanResponderRelease: () => {
          const st = g.current;
          if (st.moved) {
            setView(null);
            syncUi();
            return;
          }
          if (Date.now() - st.t0 > 500) return;
          const m = pickAt(st.locX, st.locY);
          if (!m) return;
          const z = parseMeshName(m.name)!;
          focusMesh(m);
          props.current.onSelectZone?.(z.zoneId, z.side);
        },
      })
    ).current;

    // --- GL -------------------------------------------------------------------------------------------
    const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
      try {
        const w = gl.drawingBufferWidth;
        const h = gl.drawingBufferHeight;
        const canvas = {
          width: w,
          height: h,
          style: {},
          clientWidth: w,
          clientHeight: h,
          addEventListener: () => {},
          removeEventListener: () => {},
          getContext: () => gl,
        } as unknown as HTMLCanvasElement;
        const renderer = new THREE.WebGLRenderer({ canvas, context: gl as unknown as WebGL2RenderingContext, antialias: true, alpha: true });
        renderer.setPixelRatio(1);
        renderer.setSize(w, h, false);
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.95;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(FOV, w / h, 0.05, 60);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x8e9aab, 1.15));
        const key = new THREE.DirectionalLight(0xffffff, 2.3);
        key.position.set(1.6, 2.4, 2.6);
        const fill = new THREE.DirectionalLight(0xdde8ff, 0.7);
        fill.position.set(-2.2, 0.8, 1.4);
        const rim = new THREE.DirectionalLight(0xffffff, 1.4);
        rim.position.set(0, 2.2, -3);
        scene.add(key, fill, rim, camera);
        camera.add(new THREE.DirectionalLight(0xffffff, 0.35));

        const asset = Asset.fromModule(MODEL);
        await asset.downloadAsync();
        const bytes = await new File(asset.localUri ?? asset.uri).bytes();
        const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
        const gltf = await new GLTFLoader().parseAsync(buffer, '');

        const root = gltf.scene;
        const box = new THREE.Box3().setFromObject(root);
        root.position.sub(box.getCenter(new THREE.Vector3()));
        root.updateMatrixWorld(true);
        const meshes: THREE.Mesh[] = [];
        const boxes = new Map<THREE.Mesh, THREE.Box3>();
        root.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          const touchable = !!parseMeshName(m.name);
          m.material = new THREE.MeshStandardMaterial({ color: touchable ? COLORS.idle : COLORS.bone, roughness: 0.58, metalness: 0 });
          if (touchable) {
            meshes.push(m);
            boxes.set(m, new THREE.Box3().setFromObject(m));
          }
        });
        scene.add(root);
        const bounds = new THREE.Box3().setFromObject(root);
        const height = bounds.getSize(new THREE.Vector3()).y;
        const baseDist = (height / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2))) * 1.08;
        orbit.current = { az: 0, polar: Math.PI / 2, dist: baseDist, target: new THREE.Vector3() };
        three.current = { gl, renderer, scene, camera, meshes, boxes, bounds, baseDist };

        const loop = () => {
          raf.current = requestAnimationFrame(loop);
          const tw = tween.current;
          if (tw) {
            const k = Math.min(1, (Date.now() - tw.t0) / tw.dur);
            const e = 1 - Math.pow(1 - k, 3);
            const o = orbit.current;
            o.az = tw.from.az + (tw.to.az - tw.from.az) * e;
            o.polar = tw.from.polar + (tw.to.polar - tw.from.polar) * e;
            o.dist = tw.from.dist + (tw.to.dist - tw.from.dist) * e;
            o.target.lerpVectors(tw.from.target, tw.to.target, e);
            dirty.current = true;
            if (k >= 1) {
              tween.current = null;
              syncUi();
            }
          }
          if (!dirty.current) return;
          dirty.current = false;
          applyCamera();
          renderer.render(scene, camera);
          gl.endFrameEXP();
        };
        loop();
        setReady(true);
      } catch (err) {
        console.warn('BodyMap3D indisponible', err);
        onUnavailable?.();
      }
    };

    useEffect(
      () => () => {
        if (raf.current !== null) cancelAnimationFrame(raf.current);
        const t = three.current;
        if (!t) return;
        t.scene.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.geometry.dispose();
            (m.material as THREE.Material).dispose();
          }
        });
        t.renderer.dispose();
        three.current = null;
      },
      []
    );

    const onLayout = (e: LayoutChangeEvent) => {
      size.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
    };

    const sideLeft = front ? 'DROITE' : 'GAUCHE';
    const sideRight = front ? 'GAUCHE' : 'DROITE';

    return (
      <View style={[styles.stage, { borderColor: theme.colors.hairline }, height ? { flex: 0, height, minHeight: height } : null]}>
        <View style={StyleSheet.absoluteFill} onLayout={onLayout} {...pan.panHandlers}>
          <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} msaaSamples={4} />
        </View>

        {!ready && (
          <View style={styles.loading} pointerEvents="none">
            <ActivityIndicator color={theme.colors.sprintyBlue} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Chargement du corps…</Text>
          </View>
        )}

        <Text style={[styles.sideTag, styles.sideLeft, { color: theme.colors.textMuted }]} pointerEvents="none">{sideLeft}</Text>
        <Text style={[styles.sideTag, styles.sideRight, { color: theme.colors.textMuted }]} pointerEvents="none">{sideRight}</Text>

        {zoomed && (
          <PressableScale
            haptic="selection"
            onPress={reset}
            style={[styles.recenter, { backgroundColor: theme.colors.surface }]}
            accessibilityRole="button"
            accessibilityLabel="Recentrer le corps"
          >
            <Text style={[styles.recenterText, { color: theme.colors.text }]}>Recentrer</Text>
          </PressableScale>
        )}

        <View style={[styles.views, { borderColor: theme.colors.hairline }]}>
          {(
            [
              ['face', 'Face'],
              ['dos', 'Dos'],
              ['gauche', 'Côté G'],
              ['droit', 'Côté D'],
            ] as [ViewName, string][]
          ).map(([id, label]) => {
            const active = view === id;
            return (
              <PressableScale
                key={id}
                haptic="selection"
                containerStyle={styles.viewCell}
                style={[styles.viewBtn, active && { backgroundColor: theme.colors.surface }]}
                onPress={() => goView(id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Vue ${label}`}
              >
                <Text style={[styles.viewText, { color: active ? theme.colors.text : theme.colors.textSecondary }, active && styles.viewTextActive]}>
                  {label}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </View>
    );
  }
);
BodyMap3D.displayName = 'BodyMap3D';

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    minHeight: 320,
    borderRadius: 24,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 13, fontWeight: '600' },
  sideTag: { position: 'absolute', top: 12, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  sideLeft: { left: 14 },
  sideRight: { right: 14 },
  recenter: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    paddingHorizontal: 14,
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: 17,
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  recenterText: { fontSize: 13, fontWeight: '700' },
  views: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
  },
  viewCell: { flex: 1 },
  viewBtn: { minHeight: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  viewText: { fontSize: 13, fontWeight: '600' },
  viewTextActive: { fontWeight: '800' },
});
