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

  All per-shard work runs in the vertex shader. The CPU only updates a handful
  of uniforms per frame, so the main thread stays free for scrolling.
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
const FOG: [number, number] = [7, 17];
// resolution steps the canvas drops through when frames run long
const PIXEL_STEPS = [1.5, 1.25, 1, 0.85, 0.7];
const SLOW_FRAME_MS = 24;
// behind the console and portal the shards stay put and only turn, slowly
const CALM_SPEED = 0.18;

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

const SHARED_GLSL = /* glsl */ `
  float sm(float t) { t = clamp(t, 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
  mat3 rotAxis(vec3 a, float ang) {
    float s = sin(ang), c = cos(ang), oc = 1.0 - c;
    return mat3(
      oc * a.x * a.x + c,       oc * a.x * a.y + a.z * s, oc * a.z * a.x - a.y * s,
      oc * a.x * a.y - a.z * s, oc * a.y * a.y + c,       oc * a.y * a.z + a.x * s,
      oc * a.z * a.x + a.y * s, oc * a.y * a.z - a.x * s, oc * a.z * a.z + c
    );
  }
`;

const RING_VERTEX = /* glsl */ `
  attribute vec3 aLoop;
  attribute vec3 aScatter;
  attribute vec3 aNormal;
  attribute vec3 aColor;
  attribute vec4 aSpin;   // xyz tumble axis, w tumble speed
  attribute vec4 aMisc;   // x size, y scatter delay, z orbit radius, w orbit speed
  attribute float aPhase;

  uniform float uTime;
  uniform float uScatter;
  uniform float uPresence;
  uniform float uReach;
  uniform float uGrow;
  uniform vec2 uSwing;
  uniform vec3 uRayO;
  uniform vec3 uRayD;
  uniform vec3 uRight;
  uniform vec3 uUp;
  uniform vec3 uEye;
  uniform vec3 uRim;

  varying vec3 vColor;
  varying float vDepth;

  ${SHARED_GLSL}

  void main() {
    // each shard leaves and returns at its own moment, so the shape tears rather than fades
    float s = sm(uScatter * 1.6 - aMisc.y * 0.6);
    vec3 p = mix(aLoop, aScatter, s);

    float near = 0.0;
    if (uPresence > 0.001) {
      vec3 o = p - uRayO;
      float d = length(o - uRayD * dot(o, uRayD));
      near = sm(1.0 - d / uReach) * uPresence * (1.0 - s);
      // circle in the screen plane; a flick stretches the circle along the flick
      float a = uTime * aMisc.w + aPhase;
      p += (uRight * sin(a) * (aMisc.z + uSwing.x) + uUp * cos(a) * (aMisc.z + uSwing.y)) * near;
    }

    // edge-on shards go amber; the band fades as the loop breaks up
    vec3 v = uEye - p;
    float facing = abs(dot(aNormal, v)) / length(v);
    float rim = sm((0.5 - facing) / 0.35) * 0.85 * (1.0 - s);
    vColor = mix(aColor, uRim, rim);

    float scale = aMisc.x * (1.0 + s * 0.35 + near * uGrow);
    vec3 local = rotAxis(aSpin.xyz, uTime * aSpin.w + aPhase) * position * scale + p;
    vec4 mv = modelViewMatrix * vec4(local, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const BG_VERTEX = /* glsl */ `
  attribute vec3 aPos;
  attribute vec3 aAxis;
  attribute vec3 aColor;
  attribute vec4 aBg;   // x parallax depth, y drift radius, z rate, w size

  uniform float uTime;
  uniform vec2 uDrift;
  uniform float uWander;

  varying vec3 vColor;
  varying float vDepth;

  ${SHARED_GLSL}

  void main() {
    float w = aBg.z * 0.5;
    vec3 p = aPos;
    p.xy += -uDrift * aBg.x * 4.0 + vec2(sin(uTime * w), cos(uTime * w)) * aBg.y * uWander;
    vec3 local = rotAxis(aAxis, uTime * aBg.z * 0.15) * position * aBg.w + p;
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(local, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  uniform vec2 uFog;
  uniform float uLight;
  varying vec3 vColor;
  varying float vDepth;

  void main() {
    float fog = smoothstep(uFog.x, uFog.y, vDepth);
    // on black, distance darkens a shard; on a light page it fades it out instead
    gl_FragColor = vec4(vColor * (1.0 - fog * (1.0 - uLight)), uOpacity * (1.0 - fog * uLight));
    #include <colorspace_fragment>
  }
`;

export function ShardField({ ring: showRing = true }: { ring?: boolean }) {
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
      let pixelStep = PIXEL_STEPS.findIndex((r) => r <= window.devicePixelRatio);
      if (pixelStep < 0) pixelStep = PIXEL_STEPS.length - 1;
      renderer.setPixelRatio(PIXEL_STEPS[pixelStep]);
      renderer.setSize(window.innerWidth, window.innerHeight, false);

      const scene = new THREE.Scene();
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

      const tetra = new THREE.TetrahedronGeometry(1, 0);
      const color = new THREE.Color();
      const amber = new THREE.Color("#ffb829");
      const randomAxis = (out: Float32Array, at: number) => {
        const z = Math.random() * 2 - 1;
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(1 - z * z);
        out[at] = r * Math.cos(a);
        out[at + 1] = r * Math.sin(a);
        out[at + 2] = z;
      };

      // Ring: per-shard data lives in instanced attributes, written once.
      const loop = new Float32Array(COUNT * 3);
      const scatter = new Float32Array(COUNT * 3);
      const normal = new Float32Array(COUNT * 3);
      const tint = new Float32Array(COUNT * 3);
      const spinData = new Float32Array(COUNT * 4);
      const misc = new Float32Array(COUNT * 4);
      const phase = new Float32Array(COUNT);
      const R = 2.35;
      for (let i = 0; i < COUNT; i++) {
        // torus shell, slightly thick so it reads as a volume
        const u = Math.random() * Math.PI * 2;
        const v = Math.random() * Math.PI * 2;
        const r = 0.62 * (0.82 + Math.random() * 0.22);
        const j = i * 3;
        loop[j] = (R + r * Math.cos(v)) * Math.cos(u);
        loop[j + 1] = r * Math.sin(v);
        loop[j + 2] = (R + r * Math.cos(v)) * Math.sin(u);
        normal[j] = Math.cos(v) * Math.cos(u);
        normal[j + 1] = Math.sin(v);
        normal[j + 2] = Math.cos(v) * Math.sin(u);
        scatter[j] = (Math.random() - 0.5) * 20;
        scatter[j + 1] = (Math.random() - 0.5) * 12;
        scatter[j + 2] = (Math.random() - 0.5) * 12 - 1;
        color.set(pickColor());
        tint[j] = color.r;
        tint[j + 1] = color.g;
        tint[j + 2] = color.b;
        randomAxis(spinData, i * 4);
        spinData[i * 4 + 3] = 0.3 + Math.random() * 0.9;
        misc[i * 4] = 0.022 + Math.random() * 0.036;
        misc[i * 4 + 1] = Math.random();
        misc[i * 4 + 2] = Math.random() * ORBIT;
        misc[i * 4 + 3] = 1.5 + Math.random() * 3;
        phase[i] = Math.random() * Math.PI * 2;
      }
      const ringGeometry = new THREE.InstancedBufferGeometry();
      ringGeometry.setAttribute("position", tetra.getAttribute("position"));
      ringGeometry.setAttribute("aLoop", new THREE.InstancedBufferAttribute(loop, 3));
      ringGeometry.setAttribute("aScatter", new THREE.InstancedBufferAttribute(scatter, 3));
      ringGeometry.setAttribute("aNormal", new THREE.InstancedBufferAttribute(normal, 3));
      ringGeometry.setAttribute("aColor", new THREE.InstancedBufferAttribute(tint, 3));
      ringGeometry.setAttribute("aSpin", new THREE.InstancedBufferAttribute(spinData, 4));
      ringGeometry.setAttribute("aMisc", new THREE.InstancedBufferAttribute(misc, 4));
      ringGeometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phase, 1));
      ringGeometry.instanceCount = COUNT;

      // follows the console's theme toggle; the landing has no data-theme and stays dark
      const themed = canvas.closest<HTMLElement>("[data-theme]");
      const light = { value: 0 };
      const readTheme = () => {
        light.value = themed?.dataset.theme === "light" ? 1 : 0;
      };
      readTheme();
      const themeWatch = new MutationObserver(readTheme);
      if (themed) themeWatch.observe(themed, { attributes: true, attributeFilter: ["data-theme"] });

      const ringUniforms = {
        uTime: { value: 0 },
        uScatter: { value: 0 },
        uPresence: { value: 0 },
        uReach: { value: HOVER_RADIUS },
        uGrow: { value: HOVER_GROW },
        uSwing: { value: new THREE.Vector2() },
        uRayO: { value: new THREE.Vector3() },
        uRayD: { value: new THREE.Vector3(0, 0, -1) },
        uRight: { value: new THREE.Vector3(1, 0, 0) },
        uUp: { value: new THREE.Vector3(0, 1, 0) },
        uEye: { value: new THREE.Vector3() },
        uRim: { value: new THREE.Vector3(amber.r, amber.g, amber.b) },
        uOpacity: { value: 0.9 },
        uFog: { value: new THREE.Vector2(...FOG) },
        uLight: light,
      };
      const ringMaterial = new THREE.ShaderMaterial({
        vertexShader: RING_VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: ringUniforms,
        wireframe: true,
        transparent: true,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      // instances are placed in the shader, so the base geometry's bounds mean nothing
      ring.frustumCulled = false;
      ring.visible = showRing;
      spin.add(ring);

      // Background layer: larger, dimmer shards spread through the whole view, each with its own depth.
      const bgPos = new Float32Array(BG_COUNT * 3);
      const bgAxis = new Float32Array(BG_COUNT * 3);
      const bgTint = new Float32Array(BG_COUNT * 3);
      const bgData = new Float32Array(BG_COUNT * 4);
      for (let i = 0; i < BG_COUNT; i++) {
        const j = i * 3;
        const z = -7 + Math.random() * 10;
        bgPos[j] = (Math.random() - 0.5) * 24;
        bgPos[j + 1] = (Math.random() - 0.5) * 14;
        bgPos[j + 2] = z;
        randomAxis(bgAxis, j);
        color.set(pickColor()).multiplyScalar(0.45);
        bgTint[j] = color.r;
        bgTint[j + 1] = color.g;
        bgTint[j + 2] = color.b;
        // nearer shards slide further with the pointer
        bgData[i * 4] = 0.2 + ((z + 7) / 10) * 0.8;
        bgData[i * 4 + 1] = 0.05 + Math.random() * 0.25;
        bgData[i * 4 + 2] = 1 + Math.random() * 3;
        bgData[i * 4 + 3] = 0.06 + Math.random() * 0.16;
      }
      const bgGeometry = new THREE.InstancedBufferGeometry();
      bgGeometry.setAttribute("position", tetra.getAttribute("position"));
      bgGeometry.setAttribute("aPos", new THREE.InstancedBufferAttribute(bgPos, 3));
      bgGeometry.setAttribute("aAxis", new THREE.InstancedBufferAttribute(bgAxis, 3));
      bgGeometry.setAttribute("aColor", new THREE.InstancedBufferAttribute(bgTint, 3));
      bgGeometry.setAttribute("aBg", new THREE.InstancedBufferAttribute(bgData, 4));
      bgGeometry.instanceCount = BG_COUNT;
      const bgUniforms = {
        uTime: { value: 0 },
        uDrift: { value: new THREE.Vector2() },
        uWander: { value: showRing ? 1 : 0 },
        uOpacity: { value: 0.7 },
        uFog: { value: new THREE.Vector2(...FOG) },
        uLight: light,
      };
      const bgMaterial = new THREE.ShaderMaterial({
        vertexShader: BG_VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: bgUniforms,
        wireframe: true,
        transparent: true,
        depthWrite: false,
      });
      const bg = new THREE.Mesh(bgGeometry, bgMaterial);
      bg.frustumCulled = false;
      scene.add(bg);

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

      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      const toLocal = new THREE.Matrix4();
      let last = performance.now();
      let clock = 0;
      // skip the first frames after start or a tab return, they're always slow
      let sampled = -30;
      let sampleMs = 0;

      const frame = () => {
        const now = performance.now();
        const raw = now - last;
        const dt = Math.min(raw / 1000, 0.05);
        last = now;

        if (pixelStep < PIXEL_STEPS.length - 1 && ++sampled > 0) {
          sampleMs += raw;
          if (sampled === 60) {
            if (sampleMs / 60 > SLOW_FRAME_MS) renderer.setPixelRatio(PIXEL_STEPS[++pixelStep]);
            sampled = -10;
            sampleMs = 0;
          }
        }
        if (!reduceMotion) clock += dt;
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

        // Pointer ray, camera position and screen axes in the ring's own space.
        camera.updateMatrixWorld();
        ring.updateWorldMatrix(true, false);
        toLocal.copy(ring.matrixWorld).invert();
        const u = ringUniforms;
        u.uEye.value.copy(camera.position).applyMatrix4(toLocal);
        u.uRight.value.set(1, 0, 0).applyQuaternion(camera.quaternion).transformDirection(toLocal);
        u.uUp.value.set(0, 1, 0).applyQuaternion(camera.quaternion).transformDirection(toLocal);
        if (presence > 0.001) {
          ndc.set(eased.x, eased.y);
          raycaster.setFromCamera(ndc, camera);
          raycaster.ray.applyMatrix4(toLocal);
          u.uRayO.value.copy(raycaster.ray.origin);
          u.uRayD.value.copy(raycaster.ray.direction);
        }
        u.uTime.value = clock;
        u.uScatter.value = current.scatter;
        u.uPresence.value = presence;
        u.uReach.value = HOVER_RADIUS + HOVER_WIDEN * Math.max(Math.abs(flick.x), Math.abs(flick.y));
        u.uSwing.value.set(flick.x * DRAG, flick.y * DRAG);
        const still = reduceMotion || !showRing;
        bgUniforms.uTime.value = showRing ? clock : clock * CALM_SPEED;
        bgUniforms.uDrift.value.set(still ? 0 : drift.x, still ? 0 : drift.y);

        renderer.render(scene, camera);
      };

      // Background tabs get no frames anyway; stop the loop so we don't burn the battery on return.
      const onVisibility = () => {
        last = performance.now();
        sampled = -30;
        sampleMs = 0;
        renderer.setAnimationLoop(document.hidden ? null : frame);
      };

      measure();
      // Compile both shaders now, under the intro loader, rather than on the first visible frame.
      renderer.compile(scene, camera);
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
        themeWatch.disconnect();
        window.removeEventListener("resize", onResize);
        window.removeEventListener("pointermove", onMove);
        document.documentElement.removeEventListener("pointerleave", onLeave);
        document.removeEventListener("visibilitychange", onVisibility);
        renderer.setAnimationLoop(null);
        tetra.dispose();
        ringGeometry.dispose();
        bgGeometry.dispose();
        ringMaterial.dispose();
        bgMaterial.dispose();
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [showRing]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 h-screen w-screen opacity-0 transition-opacity duration-[1200ms]"
    />
  );
}
