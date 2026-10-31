"use client";

import { useEffect, useRef } from "react";

/*
  Thousands of wireframe tetrahedra. Each one stands for a subscription.
  Sections on the page carry data-shards="loop-right | loop-left | loop | scatter";
  as the page scrolls the field eases between those states, so the loop breaks
  apart over the "how it runs today" section and pulls back together after.
  Shards edge-on to the camera turn amber so the outline reads at any angle,
  and shards under the pointer stay put but spin and jitter hard, lit white,
  calming down over about a second.
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

const HOVER_RADIUS = 1.1;
const JITTER = 0.05;
const JITTER_SPEED = 22;
const HYPER_SPIN = 14;

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

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
      const floater = new Uint8Array(COUNT);
      const rot = new Float32Array(COUNT * 3);
      const rotSpeed = new Float32Array(COUNT * 3);
      const normal = new Float32Array(COUNT * 3);
      const base = new Float32Array(COUNT * 3);
      const heat = new Float32Array(COUNT);
      const phase = new Float32Array(COUNT * 3);

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

        floater[i] = Math.random() < 0.012 ? 1 : 0;
        size[i] = floater[i] ? 0.1 + Math.random() * 0.16 : 0.022 + Math.random() * 0.036;
        delay[i] = Math.random();

        for (let k = 0; k < 3; k++) {
          rot[i * 3 + k] = Math.random() * Math.PI * 2;
          rotSpeed[i * 3 + k] = (Math.random() - 0.5) * (floater[i] ? 0.5 : 1.4);
          phase[i * 3 + k] = Math.random() * Math.PI * 2;
        }

        let pick = Math.random();
        let hex = PALETTE[0][0];
        for (const [c, w] of PALETTE) {
          if ((pick -= w) <= 0) {
            hex = c;
            break;
          }
        }
        color.set(hex);
        if (floater[i]) color.multiplyScalar(0.4);
        mesh.setColorAt(i, color);
        base[i * 3] = color.r;
        base[i * 3 + 1] = color.g;
        base[i * 3 + 2] = color.b;
      }
      const colors = mesh.instanceColor!;
      colors.setUsage(THREE.DynamicDrawUsage);
      colors.needsUpdate = true;

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
      const mouse = { x: 0, y: 0, inside: false };
      const onMove = (e: PointerEvent) => {
        mouse.x = e.clientX / window.innerWidth - 0.5;
        mouse.y = e.clientY / window.innerHeight - 0.5;
        mouse.inside = true;
      };
      const onLeave = () => {
        mouse.inside = false;
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
      let last = performance.now();

      const frame = () => {
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        const goal = reduceMotion ? { ...target(), scatter: 0 } : target();
        const ease = reduceMotion ? 1 : 1 - Math.pow(0.002, dt);
        current.scatter += (goal.scatter - current.scatter) * ease;
        current.x += (goal.x - current.x) * ease;
        current.scale += (goal.scale - current.scale) * ease;

        rig.position.x = current.x;
        rig.scale.setScalar(current.scale);
        if (!reduceMotion) {
          spin.rotation.y += dt * 0.07;
          camera.position.x += (mouse.x * 0.6 - camera.position.x) * 0.04;
          camera.position.y += (-mouse.y * 0.4 - camera.position.y) * 0.04;
          camera.lookAt(0, 0, 0);
        }

        // Pointer ray and camera position in the shards' own space, so distances and facing are cheap per shard.
        camera.updateMatrixWorld();
        mesh.updateWorldMatrix(true, false);
        toLocal.copy(mesh.matrixWorld).invert();
        eye.copy(camera.position).applyMatrix4(toLocal);
        const hovering = mouse.inside && !reduceMotion;
        if (hovering) {
          ndc.set(mouse.x * 2, -mouse.y * 2);
          raycaster.setFromCamera(ndc, camera);
          raycaster.ray.applyMatrix4(toLocal);
        }
        const { origin: ro, direction: rd } = raycaster.ray;
        const cool = Math.pow(0.18, dt);
        const t = now / 1000;
        const col = colors.array as Float32Array;

        for (let i = 0; i < COUNT; i++) {
          // each shard leaves and returns at its own moment, so the shape tears rather than fades
          const s = floater[i] ? 1 : smooth(clamp01(current.scatter * 1.6 - delay[i] * 0.6));
          const j = i * 3;
          const px = loop[j] + (scatter[j] - loop[j]) * s;
          const py = loop[j + 1] + (scatter[j + 1] - loop[j + 1]) * s;
          const pz = loop[j + 2] + (scatter[j + 2] - loop[j + 2]) * s;

          // Heat jumps up under the pointer and cools over about a second, leaving a short trail.
          let h = heat[i] * cool;
          if (hovering && !floater[i]) {
            const ox = px - ro.x;
            const oy = py - ro.y;
            const oz = pz - ro.z;
            const along = ox * rd.x + oy * rd.y + oz * rd.z;
            const qx = ox - rd.x * along;
            const qy = oy - rd.y * along;
            const qz = oz - rd.z * along;
            const d = Math.sqrt(qx * qx + qy * qy + qz * qz);
            if (d < HOVER_RADIUS) {
              const k = 1 - d / HOVER_RADIUS;
              if (k * k > h) h = k * k;
            }
          }
          heat[i] = h;
          // Hot shards buzz around their own spot instead of moving out of the way.
          const buzz = JITTER * h;
          dummy.position.set(
            px + Math.sin(t * JITTER_SPEED + phase[j]) * buzz,
            py + Math.sin(t * JITTER_SPEED * 1.13 + phase[j + 1]) * buzz,
            pz + Math.sin(t * JITTER_SPEED * 0.87 + phase[j + 2]) * buzz,
          );

          // Edge-on shards go amber; the band fades as the loop breaks up.
          let rim = 0;
          if (!floater[i]) {
            const vx = eye.x - px;
            const vy = eye.y - py;
            const vz = eye.z - pz;
            const facing = Math.abs(normal[j] * vx + normal[j + 1] * vy + normal[j + 2] * vz) / Math.sqrt(vx * vx + vy * vy + vz * vz);
            rim = smooth(clamp01((0.5 - facing) / 0.35)) * 0.85 * (1 - s);
          }
          for (let c = 0; c < 3; c++) {
            const tinted = base[j + c] + (RIM[c] - base[j + c]) * rim;
            col[j + c] = tinted + (1 - tinted) * h;
          }
          if (!reduceMotion) {
            const spinUp = 1 + h * HYPER_SPIN;
            rot[j] += rotSpeed[j] * dt * spinUp;
            rot[j + 1] += rotSpeed[j + 1] * dt * spinUp;
            rot[j + 2] += rotSpeed[j + 2] * dt * spinUp;
          }
          dummy.rotation.set(rot[j], rot[j + 1], rot[j + 2]);
          dummy.scale.setScalar(size[i] * (1 + s * 0.35 + heat[i] * 0.4));
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
        colors.needsUpdate = true;
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
        mesh.dispose();
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
