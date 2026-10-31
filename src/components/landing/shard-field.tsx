"use client";

import { useEffect, useRef } from "react";

/*
  Thousands of wireframe tetrahedra. Each one stands for a subscription.
  Sections on the page carry data-shards="loop-right | loop-left | loop | scatter";
  as the page scrolls the field eases between those states, so the loop breaks
  apart over the "how it runs today" section and pulls back together after.
  Shards edge-on to the camera turn amber so the outline reads at any angle.
  Shards near the pointer circle their own spot and swell; a fast flick of the
  mouse swings them wider in that direction and widens the area it reaches.
  A separate layer of larger, dimmer shards floats behind and slides against
  the pointer with depth parallax.
*/

type Pose = { scatter: number; x: number; scale: number };

const POSES: Record<string, Pose> = {
  "loop-right": { scatter: 0, x: 2.1, scale: 1 },
  "loop-left": { scatter: 0, x: -3.2, scale: 0.74 },
  loop: { scatter: 0, x: 0, scale: 1.05 },
  scatter: { scatter: 1, x: 0, scale: 1 },
};

// amber, violet, teal, pale, pink, blue, weighted like the reference
const PALETTE: [string, number][] = [
  ["#ffb829", 0.34],
  ["#8052ff", 0.22],
  ["#edebff", 0.2],
  ["#2fd3a7", 0.1],
  ["#ff7a9c", 0.08],
  ["#5b8cff", 0.06],
];

const HOVER_RADIUS = 2;
const HOVER_WIDEN = 0.6;
const HOVER_GROW = 0.75;
const ORBIT = 0.22;
const DRAG = 0.35;
const PARALLAX = 0.25;

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function pickColor(): string {
  let pick = Math.random();
  for (const [c, w] of PALETTE) {
    if ((pick -= w) <= 0) return c;
  }
  return PALETTE[0][0];
}

export function ShardField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      if (disposed) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const small = window.innerWidth < 768;
      const COUNT = small ? 1600 : 5200;
      const BG_COUNT = small ? 110 : 250;

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.setSize(window.innerWidth, window.innerHeight, false);

      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(0x000000, 7, 17);
      const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 60);
      camera.position.set(0, 0, 9);

      // outer group moves/scales with the page, tilt shows the ring in perspective, spin turns it
      const rig = new THREE.Group();
      const tilt = new THREE.Group();
      tilt.rotation.set(1.05, 0, 0.35);
      const spin = new THREE.Group();
      rig.add(tilt);
      tilt.add(spin);
      scene.add(rig);

      const geometry = new THREE.TetrahedronGeometry(1, 0);
      const material = new THREE.MeshBasicMaterial({
        wireframe: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });
      const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      spin.add(mesh);

      const loop = new Float32Array(COUNT * 3);
      const scatter = new Float32Array(COUNT * 3);
      const size = new Float32Array(COUNT);
      const delay = new Float32Array(COUNT);
      const rot = new Float32Array(COUNT * 3);
      const rotSpeed = new Float32Array(COUNT * 3);
      const normal = new Float32Array(COUNT * 3);
      const base = new Float32Array(COUNT * 3);
      const orbitAmp = new Float32Array(COUNT);
      const orbitRate = new Float32Array(COUNT);
      const phase = new Float32Array(COUNT);

      const R = 2.35;
      const color = new THREE.Color();
      const amber = new THREE.Color("#ffb829");
      const RIM = [amber.r, amber.g, amber.b];
      for (let i = 0; i < COUNT; i++) {
        // torus shell, slightly thick so it reads as a volume
        const u = Math.random() * Math.PI * 2;
        const v = Math.random() * Math.PI * 2;
        const r = 0.62 * (0.82 + Math.random() * 0.22);
        loop[i * 3] = (R + r * Math.cos(v)) * Math.cos(u);
        loop[i * 3 + 1] = r * Math.sin(v);
        loop[i * 3 + 2] = (R + r * Math.cos(v)) * Math.sin(u);
        normal[i * 3] = Math.cos(v) * Math.cos(u);
        normal[i * 3 + 1] = Math.sin(v);
        normal[i * 3 + 2] = Math.cos(v) * Math.sin(u);

        scatter[i * 3] = (Math.random() - 0.5) * 20;
        scatter[i * 3 + 1] = (Math.random() - 0.5) * 12;
        scatter[i * 3 + 2] = (Math.random() - 0.5) * 12 - 1;

        size[i] = 0.022 + Math.random() * 0.036;
        delay[i] = Math.random();
        orbitAmp[i] = Math.random() * ORBIT;
        orbitRate[i] = 1.5 + Math.random() * 3;
        phase[i] = Math.random() * Math.PI * 2;

        for (let k = 0; k < 3; k++) {
          rot[i * 3 + k] = Math.random() * Math.PI * 2;
          rotSpeed[i * 3 + k] = (Math.random() - 0.5) * 1.4;
        }

        color.set(pickColor());
        mesh.setColorAt(i, color);
        base[i * 3] = color.r;
        base[i * 3 + 1] = color.g;
        base[i * 3 + 2] = color.b;
      }
      const colors = mesh.instanceColor!;
      colors.setUsage(THREE.DynamicDrawUsage);
      colors.needsUpdate = true;

      // Background layer: larger, dimmer shards spread through the whole view, each with its own depth.
      const bgMaterial = new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 0.7, depthWrite: false });
      const bgMesh = new THREE.InstancedMesh(geometry, bgMaterial, BG_COUNT);
      bgMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(bgMesh);
      const bgPos = new Float32Array(BG_COUNT * 3);
      const bgDepth = new Float32Array(BG_COUNT);
      const bgDrift = new Float32Array(BG_COUNT);
      const bgRate = new Float32Array(BG_COUNT);
      const bgAxis: InstanceType<typeof THREE.Vector3>[] = [];
      const bgSize = new Float32Array(BG_COUNT);
      for (let i = 0; i < BG_COUNT; i++) {
        const z = -7 + Math.random() * 10;
        bgPos[i * 3] = (Math.random() - 0.5) * 24;
        bgPos[i * 3 + 1] = (Math.random() - 0.5) * 14;
        bgPos[i * 3 + 2] = z;
        // nearer shards slide further with the pointer
        bgDepth[i] = 0.2 + ((z + 7) / 10) * 0.8;
        bgDrift[i] = 0.05 + Math.random() * 0.25;
        bgRate[i] = 1 + Math.random() * 3;
        bgAxis.push(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize());
        bgSize[i] = 0.06 + Math.random() * 0.16;
        color.set(pickColor()).multiplyScalar(0.45);
        bgMesh.setColorAt(i, color);
      }
      bgMesh.instanceColor!.needsUpdate = true;

      // Section anchors: document Y of each section's middle and its pose.
      let anchors: { y: number; pose: Pose }[] = [];
      const measure = () => {
        anchors = [...document.querySelectorAll<HTMLElement>("[data-shards]")]
          .map((el) => {
            const rect = el.getBoundingClientRect();
            const pose = { ...(POSES[el.dataset.shards ?? "loop"] ?? POSES.loop) };
            if (window.innerWidth < 1024) {
              pose.x = 0;
              pose.scale *= 0.72;
            }
            return { y: rect.top + window.scrollY + rect.height / 2, pose };
          })
          .sort((a, b) => a.y - b.y);
      };

      const target = (): Pose => {
        if (!anchors.length) return POSES.loop;
        const y = window.scrollY + window.innerHeight / 2;
        if (y <= anchors[0].y) return anchors[0].pose;
        for (let i = 0; i < anchors.length - 1; i++) {
          const a = anchors[i];
          const b = anchors[i + 1];
          if (y <= b.y) {
            const t = smooth(clamp01((y - a.y) / (b.y - a.y)));
            return {
              scatter: a.pose.scatter + (b.pose.scatter - a.pose.scatter) * t,
              x: a.pose.x + (b.pose.x - a.pose.x) * t,
              scale: a.pose.scale + (b.pose.scale - a.pose.scale) * t,
            };
          }
        }
        return anchors[anchors.length - 1].pose;
      };

      const current: Pose = { ...target() };
      // Pointer in normalised device coords (-1..1, y up), plus a flick vector from how fast it moved.
      const mouse = { x: 0, y: 0, seen: false, inside: false };
      const flickTarget = { x: 0, y: 0 };
      const flick = { x: 0, y: 0 };
      const eased = { x: 0, y: 0 };
      const drift = { x: 0, y: 0 };
      let presence = 0;
      const onMove = (e: PointerEvent) => {
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = 1 - (e.clientY / window.innerHeight) * 2;
        if (mouse.seen) {
          flickTarget.x = clamp(50 * (nx - mouse.x), -2, 2);
          flickTarget.y = clamp(50 * (ny - mouse.y), -2, 2);
        } else {
          eased.x = nx;
          eased.y = ny;
        }
        mouse.x = nx;
        mouse.y = ny;
        mouse.seen = true;
        mouse.inside = true;
      };
      const onLeave = () => {
        mouse.inside = false;
        flickTarget.x = 0;
        flickTarget.y = 0;
      };
      const onResize = () => {
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        measure();
      };

      const dummy = new THREE.Object3D();
      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      const toLocal = new THREE.Matrix4();
      const eye = new THREE.Vector3();
      const right = new THREE.Vector3();
      const up = new THREE.Vector3();
      let last = performance.now();

      const frame = () => {
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        const t = now / 1000;
        // per-frame easing factors from the reference, made frame-rate independent
        const f60 = dt * 60;
        const follow = 1 - Math.pow(1 - 0.075, f60);
        const settle = 1 - Math.pow(1 - 0.1, f60);

        const goal = reduceMotion ? { ...target(), scatter: 0 } : target();
        const ease = reduceMotion ? 1 : 1 - Math.pow(0.002, dt);
        current.scatter += (goal.scatter - current.scatter) * ease;
        current.x += (goal.x - current.x) * ease;
        current.scale += (goal.scale - current.scale) * ease;

        rig.position.x = current.x;
        rig.scale.setScalar(current.scale);
        if (!reduceMotion) spin.rotation.y += dt * 0.07;

        flickTarget.x -= flickTarget.x * settle;
        flickTarget.y -= flickTarget.y * settle;
        flick.x += (flickTarget.x - flick.x) * follow;
        flick.y += (flickTarget.y - flick.y) * follow;
        eased.x += (mouse.x - eased.x) * follow;
        eased.y += (mouse.y - eased.y) * follow;
        drift.x += (PARALLAX * mouse.x - drift.x) * settle;
        drift.y += (PARALLAX * mouse.y - drift.y) * settle;
        presence += ((mouse.inside && !reduceMotion ? 1 : 0) - presence) * settle;

        // Pointer ray, camera position and screen axes in the shards' own space, so per-shard work stays cheap.
        camera.updateMatrixWorld();
        mesh.updateWorldMatrix(true, false);
        toLocal.copy(mesh.matrixWorld).invert();
        eye.copy(camera.position).applyMatrix4(toLocal);
        right.set(1, 0, 0).applyQuaternion(camera.quaternion).transformDirection(toLocal);
        up.set(0, 1, 0).applyQuaternion(camera.quaternion).transformDirection(toLocal);
        const hovering = presence > 0.001;
        if (hovering) {
          ndc.set(eased.x, eased.y);
          raycaster.setFromCamera(ndc, camera);
          raycaster.ray.applyMatrix4(toLocal);
        }
        const { origin: ro, direction: rd } = raycaster.ray;
        const reach = HOVER_RADIUS + HOVER_WIDEN * Math.max(Math.abs(flick.x), Math.abs(flick.y));
        const swingX = flick.x * DRAG;
        const swingY = flick.y * DRAG;
        const col = colors.array as Float32Array;

        for (let i = 0; i < COUNT; i++) {
          // each shard leaves and returns at its own moment, so the shape tears rather than fades
          const s = smooth(clamp01(current.scatter * 1.6 - delay[i] * 0.6));
          const j = i * 3;
          let px = loop[j] + (scatter[j] - loop[j]) * s;
          let py = loop[j + 1] + (scatter[j + 1] - loop[j + 1]) * s;
          let pz = loop[j + 2] + (scatter[j + 2] - loop[j + 2]) * s;

          let near = 0;
          if (hovering && s < 1) {
            const ox = px - ro.x;
            const oy = py - ro.y;
            const oz = pz - ro.z;
            const along = ox * rd.x + oy * rd.y + oz * rd.z;
            const qx = ox - rd.x * along;
            const qy = oy - rd.y * along;
            const qz = oz - rd.z * along;
            const d = Math.sqrt(qx * qx + qy * qy + qz * qz);
            if (d < reach) {
              near = smooth(1 - d / reach) * presence * (1 - s);
              // circle in the screen plane; a flick stretches the circle along the flick
              const a = t * orbitRate[i] + phase[i];
              const cx = Math.sin(a) * (orbitAmp[i] + swingX) * near;
              const cy = Math.cos(a) * (orbitAmp[i] + swingY) * near;
              px += right.x * cx + up.x * cy;
              py += right.y * cx + up.y * cy;
              pz += right.z * cx + up.z * cy;
            }
          }
          dummy.position.set(px, py, pz);

          // Edge-on shards go amber; the band fades as the loop breaks up.
          const vx = eye.x - px;
          const vy = eye.y - py;
          const vz = eye.z - pz;
          const facing = Math.abs(normal[j] * vx + normal[j + 1] * vy + normal[j + 2] * vz) / Math.sqrt(vx * vx + vy * vy + vz * vz);
          const rim = smooth(clamp01((0.5 - facing) / 0.35)) * 0.85 * (1 - s);
          for (let c = 0; c < 3; c++) {
            col[j + c] = base[j + c] + (RIM[c] - base[j + c]) * rim;
          }

          if (!reduceMotion) {
            rot[j] += rotSpeed[j] * dt;
            rot[j + 1] += rotSpeed[j + 1] * dt;
            rot[j + 2] += rotSpeed[j + 2] * dt;
          }
          dummy.rotation.set(rot[j], rot[j + 1], rot[j + 2]);
          dummy.scale.setScalar(size[i] * (1 + s * 0.35 + near * HOVER_GROW));
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
        colors.needsUpdate = true;

        const bt = reduceMotion ? 0 : t;
        for (let i = 0; i < BG_COUNT; i++) {
          const j = i * 3;
          const w = bgRate[i] * 0.5;
          dummy.position.set(
            bgPos[j] - drift.x * bgDepth[i] * 4 + Math.sin(bt * w) * bgDrift[i],
            bgPos[j + 1] - drift.y * bgDepth[i] * 4 + Math.cos(bt * w) * bgDrift[i],
            bgPos[j + 2],
          );
          dummy.quaternion.setFromAxisAngle(bgAxis[i], (bt * bgRate[i] * 0.15) % (Math.PI * 2));
          dummy.scale.setScalar(bgSize[i]);
          dummy.updateMatrix();
          bgMesh.setMatrixAt(i, dummy.matrix);
        }
        bgMesh.instanceMatrix.needsUpdate = true;

        renderer.render(scene, camera);
      };

      // Background tabs get no frames anyway; stop the loop so we don't burn the battery on return.
      const onVisibility = () => renderer.setAnimationLoop(document.hidden ? null : frame);

      measure();
      // Fonts and images shift layout after first paint; re-measure once things settle.
      const remeasure = window.setTimeout(measure, 800);
      window.addEventListener("resize", onResize);
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
      document.addEventListener("visibilitychange", onVisibility);
      renderer.setAnimationLoop(frame);
      canvas.style.opacity = "1";

      cleanup = () => {
        window.clearTimeout(remeasure);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("pointermove", onMove);
        document.documentElement.removeEventListener("pointerleave", onLeave);
        document.removeEventListener("visibilitychange", onVisibility);
        renderer.setAnimationLoop(null);
        geometry.dispose();
        material.dispose();
        bgMaterial.dispose();
        mesh.dispose();
        bgMesh.dispose();
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 h-screen w-screen opacity-0 transition-opacity duration-[1500ms]"
    />
  );
}
