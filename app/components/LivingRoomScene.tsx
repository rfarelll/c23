"use client";

/* ═══════════════════════════════════════════════════════════════════
   TV_CHANNELS — "Channel 08: Eight Days to the 8th".

   public/video_greet/ is empty for now. Drop the eight videos in and
   make each `src` below match its filename exactly. Any channel whose
   file can't be loaded shows a little Swiss test card instead.
   ═══════════════════════════════════════════════════════════════════ */
const TV_CHANNELS = [
  { src: "/video_greet/day1.mp4", title: "Day One" },
  { src: "/video_greet/day2.mp4", title: "Day Two" },
  { src: "/video_greet/day3.mp4", title: "Day Three" },
  { src: "/video_greet/day4.mp4", title: "Day Four" },
  { src: "/video_greet/day5.mp4", title: "Day Five" },
  { src: "/video_greet/day6.mp4", title: "Day Six" },
  { src: "/video_greet/day7.mp4", title: "Day Seven" },
  { src: "/video_greet/day8.mp4", title: "Day Eight" },
] as const;

import {
  motion,
  useInView,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import { Pause, Play } from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { SPRING_TACTILE, usePrefersReducedMotion } from "../lib/motion";
import { Breeze, CallaLilyArt, MagnoliaSprigArt } from "./BotanicalAccents";

const CHANNEL_COUNT = TV_CHANNELS.length;
const pad2 = (n: number) => String(n).padStart(2, "0");

/* ───────────────────────────────────────────────────────────────
   Camera choreography across the 300vh track (scroll progress 0 → 1)
   ─────────────────────────────────────────────────────────────── */

/** 0 → 38%: through the window. 38 → 85%: push in on the TV. 85 → 100%: hold. */
const BEAT = { window: 0.38, zoom: 0.85 } as const;
const CAMERA = { far: 0.72, near: 1.55 } as const;
/**
 * The close-up frames one composition: cat ear-tips (room y ≈ 340) down to the
 * cabinet's hint plaque (y ≈ 830), the curled tail (x ≈ 270) out to the cabinet's
 * right edge (x ≈ 728) — 460 × 494 room units around (500, 583). The camera
 * scales about that point, then pans it to the centre of the free band below
 * the vinyl pill.
 */
const TV_FOCUS_Y = 0.583;
const TV_CENTRED = `${(-(TV_FOCUS_Y - 0.5) * 100).toFixed(2)}%`;

/**
 * Layout variables, all in viewport units so every aspect ratio frames the
 * same shot. `--tv` is the cabinet width (440 room units). At 1.55× the
 * composition is 1.62 × `--tv` wide and 1.74 × `--tv` tall, so it is sized to
 * fit the width less the orchid rails (5rem), and the height less the vinyl
 * pill on top (6rem) and a little floor (1.5rem). `--lift` drops the room box
 * by half that difference so the TV sits in the middle of the free band.
 */
const STAGE_VARS = {
  "--tv": "min(calc((100vw - 5rem) / 1.62), calc((100svh - 7.5rem) / 1.74))",
  "--room": "calc(var(--tv) * 25 / 11)",
  "--lift": "2.25rem",
  "--win-h": "min(52svh, 87.8vw)",
  "--win-w": "calc(var(--win-h) * 0.82)",
} as CSSProperties;

/* ───────────────────────────────────────────────────────────────
   Deterministic geometry — seeded so server and client paint the
   exact same room.
   ─────────────────────────────────────────────────────────────── */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n: number) => Number(n.toFixed(1));

/** A rounded rectangle as path data, so many can share one <path>. */
function pill(x: number, y: number, w: number, h: number, r: number) {
  const k = Math.min(r, w / 2, h / 2);
  const [x0, y0, x1, y1] = [r1(x), r1(y), r1(x + w), r1(y + h)];
  const [xa, xb, ya, yb] = [r1(x + k), r1(x + w - k), r1(y + k), r1(y + h - k)];
  return `M${xa} ${y0}H${xb}Q${x1} ${y0} ${x1} ${ya}V${yb}Q${x1} ${y1} ${xb} ${y1}H${xa}Q${x0} ${y1} ${x0} ${yb}V${ya}Q${x0} ${y0} ${xa} ${y0}Z`;
}

type Stones = { deep: string; mid: string; pale: string };

/** Rounded fieldstone courses, staggered row to row, in three tones. */
function stoneCourses(x0: number, x1: number, y0: number, y1: number, seed: number): Stones {
  const rand = mulberry32(seed);
  const deep: string[] = [];
  const mid: string[] = [];
  const pale: string[] = [];
  let y = y0;
  let row = 0;
  while (y < y1) {
    const h = 30 + rand() * 10;
    let x = x0 - 8 - (row % 2 === 0 ? rand() * 14 : 24 + rand() * 14);
    while (x < x1) {
      const w = 44 + rand() * 44;
      const t = rand();
      const bucket = t < 0.5 ? mid : t < 0.82 ? deep : pale;
      bucket.push(pill(x + 3, y + 3, w - 6, h - 6, 9 + rand() * 4));
      x += w;
    }
    y += h;
    row += 1;
  }
  return { deep: deep.join(""), mid: mid.join(""), pale: pale.join("") };
}

/** A scalloped ellipse: each lobe bulges by `puff(angle, lobe)` — fur, clouds, cheeks. */
function scallop(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  lobes: number,
  puff: (a: number, i: number) => number,
  from = 0,
  to = Math.PI * 2,
) {
  const at = (a: number, k = 1) => `${r1(cx + Math.cos(a) * rx * k)} ${r1(cy + Math.sin(a) * ry * k)}`;
  let d = `M${at(from)}`;
  for (let i = 1; i <= lobes; i++) {
    const a = from + ((to - from) * i) / lobes;
    const mid = from + ((to - from) * (i - 0.5)) / lobes;
    d += `Q${at(mid, 1 + puff(mid, i))} ${at(a)}`;
  }
  return `${d}Z`;
}

/** Seeded, uneven fur: every lobe a little different, so the edge reads as plush, not stamped. */
function furPuff(seed: number, base: number, jitter: number, extra: (a: number) => number = () => 0) {
  const rand = mulberry32(seed);
  const lobes = Array.from({ length: 64 }, () => base + rand() * jitter);
  return (a: number, i: number) => lobes[i % 64] + extra(a);
}

/** A tapered stripe hanging from (x, y): width `w` at the root, a soft point at (x + dx, y + dy). */
function stripe(x: number, y: number, dx: number, dy: number, w: number) {
  return `M${r1(x - w / 2)} ${r1(y)}Q${r1(x + dx * 0.3 - w * 0.6)} ${r1(y + dy * 0.55)} ${r1(x + dx)} ${r1(y + dy)}Q${r1(x + dx * 0.3 + w * 0.6)} ${r1(y + dy * 0.55)} ${r1(x + w / 2)} ${r1(y)}Z`;
}

/** A teardrop flame standing on `base`, its tip leaning by `lean`. */
function flamePath(cx: number, base: number, w: number, h: number, lean: number) {
  const hw = w / 2;
  return [
    `M${r1(cx - hw)} ${r1(base)}`,
    `C${r1(cx - hw)} ${r1(base - h * 0.42)} ${r1(cx - hw * 0.2 + lean * 0.5)} ${r1(base - h * 0.62)} ${r1(cx + lean)} ${r1(base - h)}`,
    `C${r1(cx + hw * 0.35 + lean * 0.5)} ${r1(base - h * 0.6)} ${r1(cx + hw)} ${r1(base - h * 0.4)} ${r1(cx + hw)} ${r1(base)}`,
    `Q${r1(cx)} ${r1(base + w * 0.22)} ${r1(cx - hw)} ${r1(base)}Z`,
  ].join(" ");
}

/**
 * A bulbous, fisheye CRT face. Corners are pulled in by `b`% and every edge
 * bows back out so its midpoint touches the box — the whole outline stays
 * inside (x, y, w, h), which keeps the CSS mask and the drawing identical.
 */
const BULGE = 5;
function barrel(x: number, y: number, w: number, h: number, b = BULGE) {
  const X = (p: number) => r1(x + (w * p) / 100);
  const Y = (p: number) => r1(y + (h * p) / 100);
  const n = 100 - b;
  return [
    `M${X(12)} ${Y(b)}`,
    `Q${X(50)} ${Y(-b)} ${X(88)} ${Y(b)}`,
    `Q${X(n + b * 0.2)} ${Y(b * 1.1)} ${X(n)} ${Y(12)}`,
    `Q${X(100 + b)} ${Y(50)} ${X(n)} ${Y(88)}`,
    `Q${X(n + b * 0.2)} ${Y(100 - b * 1.1)} ${X(88)} ${Y(n)}`,
    `Q${X(50)} ${Y(100 + b)} ${X(12)} ${Y(n)}`,
    `Q${X(b * 0.8)} ${Y(100 - b * 1.1)} ${X(b)} ${Y(88)}`,
    `Q${X(-b)} ${Y(50)} ${X(b)} ${Y(12)}`,
    `Q${X(b * 0.8)} ${Y(b * 1.1)} ${X(12)} ${Y(b)}Z`,
  ].join(" ");
}

/** Scanlines bent by the same barrel: flat through the middle, bowing toward the rim. */
const CRT_SCANLINES = Array.from({ length: 128 }, (_, i) => {
  const y = ((i + 0.5) / 128) * 100;
  const bow = ((y - 50) / 50) * BULGE;
  return `M0 ${r1(y)}Q50 ${r1(y + bow * 2)} 100 ${r1(y)}`;
}).join("");

/** Tiny four-point frost glints. */
function glints(points: ReadonlyArray<readonly [number, number, number]>) {
  return points
    .map(([x, y, s]) => {
      const k = s * 0.24;
      return `M${r1(x)} ${r1(y - s)}L${r1(x + k)} ${r1(y - k)}L${r1(x + s)} ${r1(y)}L${r1(x + k)} ${r1(y + k)}L${r1(x)} ${r1(y + s)}L${r1(x - k)} ${r1(y + k)}L${r1(x - s)} ${r1(y)}L${r1(x - k)} ${r1(y - k)}Z`;
    })
    .join("");
}

/* Room box: viewBox 0 0 1000 1000; the drawing spills far past it so any
   aspect ratio stays covered. Wall meets floor at y = 560. */

const CEILING = "M-1400 -1300H2400V40H2100L500 -760L-1100 40H-1400Z";
const CEILING_PLANKS = Array.from({ length: 9 }, (_, i) => {
  const d = 70 + i * 74;
  return `M500 ${-760 - d}L-1500 ${240 - d}M500 ${-760 - d}L2500 ${240 - d}`;
}).join("");
const PURLINS = [0.16, 0.36, 0.56, 0.76].flatMap((t) => [
  pill(500 - t * 1600 - 17, -760 + t * 800 - 84, 34, 34, 6),
  pill(500 + t * 1600 - 17, -760 + t * 800 - 84, 34, 34, 6),
]);

const UPPER_STONES = stoneCourses(318, 682, -640, 180, 801);
const BREAST_STONES = stoneCourses(232, 768, 176, 392, 802);
const PLINTH_STONES = stoneCourses(150, 850, 404, 560, 803);

/** Voussoirs around the firebox arch (centre 500 286, inner radii 150 × 74). */
const ARCH_STONES = Array.from({ length: 9 }, (_, i) => {
  const a0 = Math.PI + (i / 9) * Math.PI + 0.03;
  const a1 = Math.PI + ((i + 1) / 9) * Math.PI - 0.03;
  const p = (a: number, rx: number, ry: number) => `${r1(500 + Math.cos(a) * rx)} ${r1(286 + Math.sin(a) * ry)}`;
  return `M${p(a0, 150, 74)}L${p(a0, 184, 104)}L${p(a1, 184, 104)}L${p(a1, 150, 74)}Z`;
});
const JAMB_STONES = [
  [290, 32],
  [326, 30],
  [360, 24],
].flatMap(([y, h]) => [pill(318, y, 32, h - 4, 7), pill(650, y, 32, h - 4, 7)]);
const FIREBOX = "M352 384V286A148 72 0 0 1 648 286V384Z";
const FIREBOX_BRICKS =
  "M352 304H648M352 326H648M352 348H648M352 370H648M420 286V304M520 286V304M610 286V304M380 304V326M470 304V326M570 304V326M420 326V348M520 326V348M610 326V348M380 348V370M470 348V370M570 348V370";

const FLAMES = [
  { cx: 450, w: 66, h: 112, lean: -10, delay: 0.35, dur: 1.9 },
  { cx: 552, w: 60, h: 104, lean: 9, delay: 0.9, dur: 1.6 },
  { cx: 500, w: 86, h: 152, lean: 3, delay: 0, dur: 2.1 },
].map((f) => ({
  ...f,
  outer: flamePath(f.cx, 372, f.w, f.h, f.lean),
  mid: flamePath(f.cx, 372, f.w * 0.72, f.h * 0.78, f.lean * 0.8),
  inner: flamePath(f.cx, 372, f.w * 0.46, f.h * 0.55, f.lean * 0.6),
  core: flamePath(f.cx, 372, f.w * 0.22, f.h * 0.3, f.lean * 0.4),
}));

/** Split logs stacked in the two plinth niches, end grain out. */
const NICHE_LOGS = (() => {
  const rand = mulberry32(418);
  return [172, 724].flatMap((x0) =>
    Array.from({ length: 12 }, (_, k) => {
      const row = Math.floor(k / 3);
      const col = k % 3;
      return {
        id: `${x0}-${k}`,
        cx: r1(x0 + 18 + col * 34 + (row % 2 ? 2 : -2)),
        cy: r1(530 - row * 29),
        r: r1(14.5 + rand() * 1.6),
      };
    }),
  );
})();

const FLOOR_PLANKS = (() => {
  const rand = mulberry32(560);
  const parts: string[] = [];
  let y = 560;
  let gap = 15;
  while (y < 1500) {
    const next = y + gap;
    parts.push(`M-1400 ${r1(next)}H2400`);
    for (let x = -1400 + rand() * 260; x < 2400; x += 260 + rand() * 220) {
      parts.push(`M${r1(x)} ${r1(y)}V${r1(next)}`);
    }
    y = next;
    gap *= 1.17;
  }
  return parts.join("");
})();

const RUG_FRINGE = [
  ...Array.from({ length: 65 }, (_, i) => `M${180 + i * 10} 792v-9`),
  ...Array.from({ length: 74 }, (_, i) => `M${56 + i * 12} 1060v15`),
].join("");
const RUG_WEAVE = Array.from({ length: 12 }, (_, i) => {
  const t = (i + 1) / 13;
  const y = r1(816 + t * 210);
  const inset = r1(216 - t * 94);
  return `M${inset} ${y}H${r1(1000 - inset)}`;
}).join("");

const CHAIR_BACK = "M-104 -110V-210C-104 -262 -62 -282 0 -282C62 -282 104 -262 104 -210V-110Z";

const BEZEL_OUTER = barrel(300, 488, 302, 292);
const BEZEL_INNER = barrel(309, 496, 284, 274);
const GLASS_SEAT = barrel(318, 504, 266, 258);

/* Cats — local coordinates, y = 0 on the TV's top edge.
   Cream Persian (~5.5 kg) at room (404, 470); the broader, heavier white
   and tabby tom (~6.5 kg) at room (598, 470). Both are lineless: a firelit
   rim peeking above a velvety fill, seeded fur locks feathering every edge. */

type Pt = readonly [number, number];
type Sample = { x: number; y: number; nx: number; ny: number; tx: number; ty: number };

/** One pointed lock of fur rooted at (bx, by): it reaches along `n` and leans along `t` by `lean`. */
function lock(bx: number, by: number, n: Pt, t: Pt, len: number, w: number, lean: number) {
  const p = (along: number, side: number) =>
    `${r1(bx + n[0] * along + t[0] * side)} ${r1(by + n[1] * along + t[1] * side)}`;
  return `M${p(-w * 0.5, -w / 2)}Q${p(len * 0.55, -w * 0.5 + len * lean * 0.3)} ${p(len, len * lean)}Q${p(len * 0.5, w * 0.6 + len * lean * 0.65)} ${p(-w * 0.5, w / 2)}Z`;
}

/** Seeded locks fanned along an elliptical arc (angles run clockwise on screen); `lean` > 0 combs them clockwise. */
function furTufts(
  seed: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  from: number,
  to: number,
  count: number,
  len: number,
  w: number,
  lean = 0.3,
) {
  const rand = mulberry32(seed);
  const step = (to - from) / count;
  let d = "";
  for (let i = 0; i < count; i++) {
    const a = from + step * (i + 0.5 + (rand() - 0.5) * 0.6);
    const c = Math.cos(a);
    const s = Math.sin(a);
    const nl = Math.hypot(c / rx, s / ry);
    const tl = Math.hypot(s * rx, c * ry);
    const l = len * (0.65 + rand() * 0.6);
    const lw = w * (0.75 + rand() * 0.5);
    const ln = lean * (0.6 + rand() * 0.8);
    d += lock(cx + c * rx, cy + s * ry, [c / rx / nl, s / ry / nl], [(-s * rx) / tl, (c * ry) / tl], l, lw, ln);
  }
  return d;
}

/** A Catmull-Rom centreline through `pts`, sampled `n + 1` times with unit tangents and normals. */
function spline(pts: readonly Pt[], n: number): Sample[] {
  const last = pts.length - 1;
  return Array.from({ length: n + 1 }, (_, k) => {
    const t = (k / n) * last;
    const i = Math.min(Math.floor(t), last - 1);
    const u = t - i;
    const a = pts[Math.max(i - 1, 0)];
    const b = pts[i];
    const c = pts[i + 1];
    const d = pts[Math.min(i + 2, last)];
    const at = (j: 0 | 1) =>
      0.5 * (2 * b[j] + (c[j] - a[j]) * u + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * u * u + (3 * b[j] - a[j] - 3 * c[j] + d[j]) * u ** 3);
    const slope = (j: 0 | 1) =>
      0.5 * (c[j] - a[j] + 2 * (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * u + 3 * (3 * b[j] - a[j] - 3 * c[j] + d[j]) * u * u);
    const dx = slope(0);
    const dy = slope(1);
    const l = Math.hypot(dx, dy) || 1;
    return { x: at(0), y: at(1), tx: dx / l, ty: dy / l, nx: -dy / l, ny: dx / l };
  });
}

/** A tapered, round-capped tube along samples k0…k1 — a tail, or one segment of it. */
function tube(s: readonly Sample[], width: (k: number) => number, k0: number, k1: number) {
  const left: string[] = [];
  const right: string[] = [];
  for (let k = k0; k <= k1; k++) {
    const h = width(k) / 2;
    const p = s[k];
    left.push(`${r1(p.x + p.nx * h)} ${r1(p.y + p.ny * h)}`);
    right.push(`${r1(p.x - p.nx * h)} ${r1(p.y - p.ny * h)}`);
  }
  right.reverse();
  const r = (k: number) => r1(width(k) / 2);
  return `M${left.join("L")}A${r(k1)} ${r(k1)} 0 0 0 ${right[0]}L${right.slice(1).join("L")}A${r(k0)} ${r(k0)} 0 0 0 ${left[0]}Z`;
}

/** Locks along both flanks of a tube, combed toward its tip — a long-haired plume. */
function tubeTufts(seed: number, s: readonly Sample[], width: (k: number) => number, k0: number, k1: number, len: number, w: number) {
  const rand = mulberry32(seed);
  let d = "";
  for (let k = k0; k <= k1; k += 2) {
    const p = s[k];
    const h = (width(k) / 2) * 0.9;
    for (const side of [1, -1]) {
      const l = len * (0.6 + rand() * 0.7);
      d += lock(p.x + p.nx * h * side, p.y + p.ny * h * side, [p.nx * side, p.ny * side], [p.tx, p.ty], l, w, 0.9 + rand() * 0.5);
    }
  }
  return d;
}

/** A band straight across a tube between samples k0 and k1; clipped to the tube it reads as a ring. */
function band(s: readonly Sample[], k0: number, k1: number, reach = 24) {
  const p = (q: Sample, h: number) => `${r1(q.x + q.nx * h)} ${r1(q.y + q.ny * h)}`;
  return `M${p(s[k0], reach)}L${p(s[k1], reach)}L${p(s[k1], -reach)}L${p(s[k0], -reach)}Z`;
}

/** An almond eye. `dir` = -1 puts the outer corner on the left; `slant` lifts it. */
function almond(cx: number, cy: number, hw: number, up: number, down: number, slant: number, dir: 1 | -1) {
  const o = `${r1(cx + dir * hw)} ${r1(cy - slant)}`;
  const i = `${r1(cx - dir * hw)} ${r1(cy + slant)}`;
  const x = (k: number) => r1(cx + dir * hw * k);
  return `M${o}C${x(0.5)} ${r1(cy - up)} ${x(-0.55)} ${r1(cy - up)} ${i}C${x(-0.5)} ${r1(cy + down)} ${x(0.5)} ${r1(cy + down)} ${o}Z`;
}

/** An upper lid lowered to a line running from the outer corner (cy + oy) to the inner (cy + iy), bowed by `sag`. */
function lid(cx: number, cy: number, hw: number, oy: number, iy: number, sag: number, dir: 1 | -1) {
  const ox = r1(cx + dir * (hw + 3));
  const ix = r1(cx - dir * (hw + 3));
  return `M${ox} ${r1(cy - 14)}L${ix} ${r1(cy - 14)}L${ix} ${r1(cy + iy)}Q${r1(cx)} ${r1(cy + sag)} ${ox} ${r1(cy + oy)}Z`;
}

/** Mirror an x coordinate across a face's centre line. */
const mirror = (axis: number) => (d: string) =>
  d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) => `${r1(axis * 2 - Number(x))} ${y}`);

/** Cheek tufts: only the lower flanks of the face (sin > 0 is downward) fluff out. */
const cheekTufts = (strength: number) => (a: number) =>
  Math.sin(a) > 0.15 && Math.abs(Math.cos(a)) > 0.42 ? strength * Math.abs(Math.cos(a)) : 0;

const TAIL_SAMPLES = 36;
/** Where each tail bends for its slow tip sway. */
const TAIL_JOINT = 22;

/* — Cream Persian: long, layered honey fur — */
const CREAM_BODY = scallop(6, 0, 94, 78, 14, furPuff(71, 0.03, 0.05), Math.PI, Math.PI * 2);
const CREAM_BACK_TUFTS = furTufts(711, 6, -2, 94, 78, Math.PI * 1.06, Math.PI * 1.97, 24, 9, 10, 0.9);
const CREAM_BODY_LIGHT = furTufts(712, 12, 6, 74, 58, Math.PI * 1.12, Math.PI * 1.88, 16, 17, 7, 0.6);
const CREAM_BODY_SHADE = furTufts(713, 18, 10, 58, 40, Math.PI * 1.15, Math.PI * 1.85, 12, 15, 6, 0.6);
const CREAM_HEAD = scallop(-38, -58, 48, 42, 24, furPuff(72, 0.015, 0.02, cheekTufts(0.22)));
const CREAM_CHEEK_TUFTS =
  furTufts(721, -38, -56, 54, 42, Math.PI * 0.06, Math.PI * 0.42, 7, 11, 10, -0.6) +
  furTufts(722, -38, -56, 54, 42, Math.PI * 0.58, Math.PI * 0.94, 7, 11, 10, 0.6);
const CREAM_CROWN_TUFTS = furTufts(723, -38, -60, 47, 41, Math.PI * 1.15, Math.PI * 1.85, 9, 6, 7, 0.2);
const CREAM_FACE_STRANDS = furTufts(724, -38, -56, 40, 32, Math.PI * 1.1, Math.PI * 1.9, 10, 10, 4, 0.5);
/** The heavy chest ruff: two tiers of long locks spilling down under the chin. */
const CREAM_RUFF_BACK = furTufts(731, -36, -26, 50, 22, Math.PI * 0.1, Math.PI * 0.9, 13, 11, 13, 0.25);
const CREAM_RUFF_FRONT = furTufts(732, -38, -30, 36, 16, Math.PI * 0.15, Math.PI * 0.85, 10, 9, 12, -0.25);
const CREAM_EAR_L = "M-88 -84C-92 -100 -90 -114 -84 -121C-76 -118 -64 -108 -56 -98Z";
const CREAM_EAR_L_IN = "M-82 -92C-84 -102 -83 -110 -80 -114C-75 -110 -69 -105 -64 -99Z";
const CREAM_EAR_R = "M-20 -98C-12 -108 0 -118 8 -121C14 -114 16 -100 12 -84Z";
const CREAM_EAR_R_IN = "M-12 -99C-7 -105 -1 -110 4 -114C7 -110 8 -102 6 -92Z";
const CREAM_EAR_L_TUFTS =
  lock(-74, -98, [-0.45, -0.89], [0.89, -0.45], 13, 5, 0.25) + lock(-70, -100, [-0.3, -0.95], [0.95, -0.3], 10, 4, 0.3);
const CREAM_EAR_R_TUFTS =
  lock(-2, -100, [0.45, -0.89], [0.89, 0.45], 13, 5, -0.25) + lock(-6, -102, [0.3, -0.95], [0.95, 0.3], 10, 4, -0.3);
/** Round Persian eyes under heavy, grumpy-sleepy lids, sagging toward the nose. */
const CREAM_EYES = ([[-56, -62, -1], [-20, -62, 1]] as const).map(([cx, cy, dir], i) => ({
  cx,
  cy,
  id: `lr-clip-cream-eye-${i}`,
  d: almond(cx, cy, 9, 8, 8, 0.5, dir),
  socket: almond(cx, cy, 10.4, 9.4, 9.2, 0.5, dir),
  lid: lid(cx, cy, 9, -1.4, 0.9, 1.6, dir),
}));
const CREAM_NOSE = "M-42.5 -52Q-38 -49.5 -33.5 -52Q-35 -46.5 -38 -46Q-41 -46.5 -42.5 -52Z";
/** A small downturned mouth: grumpy, not sad. */
const CREAM_MOUTH = "M-38 -46V-42.5M-43 -38.6Q-40.6 -40.6 -38 -42.5Q-35.4 -40.6 -33 -38.6";
const CREAM_WHISKERS_L = "M-48 -42Q-70 -48 -94 -48M-48 -39.5Q-72 -41 -96 -36M-47 -37Q-68 -34 -90 -25";
const CREAM_WHISKERS_R = mirror(-38)(CREAM_WHISKERS_L);
/** The thick foreleg draped over the bezel, its long hair feathering both flanks. */
const CREAM_LEG = "M-26 -14C-29 2 -27 16 -22 25C-17 32 1 32 6 25C10 16 9 2 6 -14Z";
const CREAM_LEG_TUFTS =
  furTufts(741, -10, 8, 17, 22, Math.PI * 0.55, Math.PI * 1.2, 5, 8, 6, 0.45) +
  furTufts(742, -10, 8, 17, 22, -Math.PI * 0.2, Math.PI * 0.45, 5, 8, 6, -0.45) +
  furTufts(743, -10, 26, 13, 4, Math.PI * 0.2, Math.PI * 0.8, 4, 4, 4, 0);
/** Plume tail, round the cabinet's rounded top-left corner (centre (-68, 48), r ≈ 46). */
const CREAM_TAIL = spline(
  [[-40, -12], [-62, -6], [-86, 4], [-104, 22], [-112, 44], [-108, 62], [-98, 70]],
  TAIL_SAMPLES,
);
const creamTailWidth = (k: number) => 26 - (12 * k) / TAIL_SAMPLES;
const CREAM_TAIL_BASE = tube(CREAM_TAIL, creamTailWidth, 0, TAIL_JOINT);
const CREAM_TAIL_TIP = tube(CREAM_TAIL, creamTailWidth, TAIL_JOINT - 1, TAIL_SAMPLES);
const CREAM_TAIL_BASE_TUFTS = tubeTufts(751, CREAM_TAIL, creamTailWidth, 6, TAIL_JOINT, 6, 7);
const CREAM_TAIL_TIP_TUFTS = tubeTufts(752, CREAM_TAIL, creamTailWidth, TAIL_JOINT, TAIL_SAMPLES, 7, 7);

/* — White & tabby tom: broad, dense, snowy, with dark saddle markings — */
const TABBY_BODY = "M-98 0C-106 -56 -76 -108 8 -110C92 -112 112 -58 102 0Z";
const TABBY_BACK_TUFTS = furTufts(901, 2, 0, 102, 110, Math.PI * 1.32, Math.PI * 1.94, 20, 4, 6, 0.8);
const TABBY_SHOULDER_TUFTS = furTufts(902, 2, 0, 102, 110, Math.PI * 1.04, Math.PI * 1.3, 7, 4, 6, 0.8);
const TABBY_BODY_STRANDS = furTufts(903, -20, -8, 60, 54, Math.PI * 1.1, Math.PI * 1.6, 9, 12, 5, 0.6);
const TABBY_SADDLE = scallop(46, -98, 72, 40, 18, furPuff(93, 0.02, 0.05));
const TABBY_HIP = scallop(86, -34, 34, 30, 12, furPuff(94, 0.03, 0.05));
/** Feathered spill where the dark patches give way to white. */
const TABBY_PATCH_EDGE =
  furTufts(95, 46, -98, 72, 40, Math.PI * 0.12, Math.PI * 0.88, 14, 8, 6, 0.3) +
  furTufts(96, 86, -34, 34, 30, Math.PI * 0.55, Math.PI * 1.25, 6, 6, 5, 0.3);
const TABBY_PATCH_STRIPES = [
  stripe(0, -114, -6, 30, 7),
  stripe(22, -116, 0, 38, 8),
  stripe(44, -116, 6, 42, 9),
  stripe(66, -112, 10, 40, 9),
  stripe(88, -100, 12, 32, 8),
  stripe(78, -60, 10, 22, 6),
  stripe(98, -54, 8, 24, 6),
].join("");
const TABBY_PATCH_STRANDS = furTufts(915, 46, -100, 56, 26, Math.PI * 1.1, Math.PI * 1.9, 12, 10, 4, 0.6);
/** A deep, broad white chest under the jowls. */
const TABBY_CHEST = scallop(-30, -18, 60, 26, 16, furPuff(97, 0.02, 0.04));
const TABBY_CHEST_TUFTS = furTufts(98, -30, -18, 60, 26, Math.PI * 0.7, Math.PI * 1.2, 7, 5, 7, 0.6);
const TABBY_CHEST_STRANDS = furTufts(914, -30, -16, 46, 18, Math.PI * 0.15, Math.PI * 0.85, 10, 8, 5, 0);
const TABBY_HEAD = scallop(-30, -64, 52, 46, 20, furPuff(91, 0.012, 0.02, cheekTufts(0.16)));
const TABBY_JOWL_TUFTS =
  furTufts(911, -30, -62, 60, 46, Math.PI * 0.06, Math.PI * 0.36, 6, 5.5, 9, -0.6) +
  furTufts(912, -30, -62, 60, 46, Math.PI * 0.64, Math.PI * 0.94, 6, 5.5, 9, 0.6);
const TABBY_CROWN_TUFTS = furTufts(913, -30, -66, 51, 45, Math.PI * 1.18, Math.PI * 1.82, 11, 3.5, 6, 0.5);
/** The dark tabby crown, ears to eye-line, split by a clean white blaze. */
const TABBY_CAP = scallop(-30, -98, 62, 40, 16, furPuff(99, 0.03, 0.05));
const TABBY_CAP_EDGE = furTufts(916, -30, -98, 62, 40, Math.PI * 0.08, Math.PI * 0.92, 16, 6, 6, 0.4);
const TABBY_BLAZE = "M-32.5 -114Q-30 -116 -27.5 -114L-23 -86Q-21 -72 -16 -60Q-30 -52 -44 -60Q-39 -72 -37 -86Z";
const TABBY_CAP_STRIPES = [
  stripe(-50, -114, -5, 22, 5),
  stripe(-41, -116, -2, 22, 4.5),
  stripe(-19, -116, 2, 22, 4.5),
  stripe(-10, -114, 5, 22, 5),
  stripe(-64, -104, -6, 16, 4),
  stripe(4, -104, 6, 16, 4),
].join("");
const TABBY_MASCARA = "M-60 -68Q-70 -66 -78 -58Q-70 -62 -60 -64Z M0 -68Q10 -66 18 -58Q10 -62 0 -64Z";
const TABBY_EAR_L = "M-82 -84C-86 -104 -82 -120 -74 -128C-62 -122 -50 -112 -44 -102Z";
const TABBY_EAR_L_IN = "M-76 -94C-78 -106 -75 -116 -71 -120C-64 -115 -57 -109 -53 -103Z";
const TABBY_EAR_R = "M-16 -102C-10 -112 2 -122 14 -128C22 -120 24 -104 20 -84Z";
const TABBY_EAR_R_IN = "M-8 -103C-3 -109 4 -115 10 -120C14 -114 15 -106 14 -94Z";
const TABBY_EAR_L_TUFTS = lock(-66, -102, [-0.4, -0.92], [0.92, -0.4], 11, 4.5, 0.25);
const TABBY_EAR_R_TUFTS = lock(6, -102, [0.4, -0.92], [0.92, 0.4], 11, 4.5, -0.25);
/** Low, heavy brow ridges angled down toward the nose: a serious, level stare. */
const TABBY_BROWS = "M-62 -78Q-51 -79 -37 -72.5Q-50 -74.5 -62 -75Z M2 -78Q-9 -79 -23 -72.5Q-10 -74.5 2 -75Z";
const TABBY_BROW_GLINT = "M-61 -81Q-51 -82.5 -40 -77.5Q-51 -80 -61 -81Z M1 -81Q-9 -82.5 -20 -77.5Q-9 -80 1 -81Z";
/** Pale green-hazel eyes, open and narrowed, outer corners lifted. */
const TABBY_EYES = ([[-49, -68, -1], [-11, -68, 1]] as const).map(([cx, cy, dir], i) => ({
  cx,
  cy,
  id: `lr-clip-tabby-eye-${i}`,
  d: almond(cx, cy, 9.5, 5, 7, 1.6, dir),
  socket: almond(cx, cy, 10.8, 6.6, 8.2, 1.6, dir),
  lid: lid(cx, cy, 9.5, -2.8, -0.4, -2.9, dir),
}));
const TABBY_NOSE = "M-35 -55Q-30 -52.5 -25 -55Q-26.5 -49.5 -30 -48.5Q-33.5 -49.5 -35 -55Z";
const TABBY_MOUTH = "M-30 -48.5V-45M-35.5 -41.2Q-32.8 -43 -30 -45Q-27.2 -43 -24.5 -41.2";
/** Dark freckles in the golden whisker pads, mirrored across the muzzle. */
const TABBY_FRECKLES = (
  [
    [-41, -45],
    [-37.5, -46.5],
    [-34, -45],
    [-40, -41.5],
    [-35.5, -42],
  ] as const
).flatMap(([x, y]): Pt[] => [[x, y], [-60 - x, y]]);
const TABBY_WHISKERS_L = "M-40 -44Q-60 -50 -82 -51M-40 -41.5Q-62 -43 -84 -39M-39.5 -39Q-58 -36 -78 -29";
const TABBY_WHISKERS_R = mirror(-30)(TABBY_WHISKERS_L);
/** Thick ringed tail over the cabinet's top-right corner (centre (66, 48)), hooking in clear of the controls. */
const TABBY_TAIL = spline(
  [[72, -16], [92, -6], [106, 10], [115, 32], [117, 54], [116, 70], [112, 82]],
  TAIL_SAMPLES,
);
const tabbyTailWidth = (k: number) => 22 - (10 * k) / TAIL_SAMPLES;
const TABBY_TAIL_BASE = tube(TABBY_TAIL, tabbyTailWidth, 0, TAIL_JOINT);
const TABBY_TAIL_TIP = tube(TABBY_TAIL, tabbyTailWidth, TAIL_JOINT - 1, TAIL_SAMPLES);
const tailRings = (spans: ReadonlyArray<readonly [number, number]>, soft = 0) =>
  spans.map(([a, b]) => band(TABBY_TAIL, Math.max(a - soft, 0), Math.min(b + soft, TAIL_SAMPLES))).join("");
const TABBY_RINGS_BASE = [[6, 8], [11, 13], [16, 18]] as const;
const TABBY_RINGS_TIP = [[24, 26], [29, 31], [34, 36]] as const;
const TABBY_RINGS_BASE_D = tailRings(TABBY_RINGS_BASE);
const TABBY_RINGS_BASE_SOFT = tailRings(TABBY_RINGS_BASE, 1);
const TABBY_RINGS_TIP_D = tailRings(TABBY_RINGS_TIP);
const TABBY_RINGS_TIP_SOFT = tailRings(TABBY_RINGS_TIP, 1);

/* ───────────────────────────────────────────────────────────────
   Exterior window — viewBox 0 0 410 500 is exactly the glass opening.
   ─────────────────────────────────────────────────────────────── */

const WALL_WITH_HOLE = "M-3200 -3200H3610V3700H-3200Z M0 0V500H410V0Z";
const LINTEL = (() => {
  let d = "M-66 -86H476V-46";
  const n = 10;
  for (let i = 0; i < n; i++) {
    const xa = 476 - (542 * i) / n;
    const xb = 476 - (542 * (i + 1)) / n;
    d += `Q${r1((xa + xb) / 2)} -24 ${r1(xb)} -46`;
  }
  return `${d}Z`;
})();
const SASH_PANES = [
  [14, 160],
  [170, 320],
  [330, 486],
] as const;
const SASH_GLINTS = (() => {
  const rand = mulberry32(1225);
  const pts: [number, number, number][] = [];
  for (const [, bottom] of SASH_PANES) {
    for (let i = 0; i < 7; i++) {
      const edge = rand() > 0.5;
      pts.push([
        edge ? 18 + rand() * 50 : 130 + rand() * 56,
        bottom - 4 - rand() * 30,
        2.5 + rand() * 3,
      ]);
    }
  }
  return glints(pts);
})();
const BOX_BLOOMS = (() => {
  const rand = mulberry32(552);
  return Array.from({ length: 48 }, (_, i) => ({
    id: i,
    cx: r1(-30 + rand() * 470),
    cy: r1(516 + rand() * 34),
    r: r1(4 + rand() * 4),
    tone: rand(),
  }));
})();
const BOX_LEAVES = (() => {
  const rand = mulberry32(553);
  return Array.from({ length: 26 }, (_, i) => ({
    id: i,
    cx: r1(-28 + rand() * 466),
    cy: r1(536 + rand() * 16),
    angle: r1(-40 + rand() * 80),
  }));
})();

/* Ambient particles */

const MOTES = (() => {
  const rand = mulberry32(1108);
  return Array.from({ length: 16 }, (_, i) => ({
    id: i,
    left: r1(8 + rand() * 84),
    top: r1(12 + rand() * 70),
    size: rand() > 0.7 ? 4 : 2.5,
    mx: `${r1((rand() - 0.5) * 60)}px`,
    my: `${r1(-20 - rand() * 50)}px`,
    duration: r1(13 + rand() * 9),
    delay: r1(rand() * 12),
  }));
})();

const EAVE_STARS = (() => {
  const rand = mulberry32(2208);
  return Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: r1(rand() * 100),
    top: r1(38 + rand() * 40),
    size: rand() > 0.8 ? 2 : 1,
    delay: r1(rand() * 4.8),
  }));
})();

/* ───────────────────────────────────────────────────────────────
   CRT overlay geometry (room units → CSS percentages of the box)
   ─────────────────────────────────────────────────────────────── */

type Rect = { x: number; y: number; w: number; h: number };
const place = ({ x, y, w, h }: Rect): CSSProperties => ({
  left: `${x / 10}%`,
  top: `${y / 10}%`,
  width: `${w / 10}%`,
  height: `${h / 10}%`,
});

const GLASS: Rect = { x: 318, y: 504, w: 266, h: 258 };
const LED: Rect = { x: 625, y: 507, w: 62, h: 38 };
const CH_UP: Rect = { x: 620, y: 559, w: 72, h: 50 };
const CH_DOWN: Rect = { x: 620, y: 617, w: 72, h: 50 };
/** Nameplate lip beneath the bezel, centred under the glass. */
const PLAQUE: Rect = { x: 312, y: 786, w: 278, h: 28 };

/** The same barrel outline as the glass seat, as a stretchable mask. */
const GLASS_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><path d='${barrel(0, 0, 100, 100)}'/></svg>`,
)}")`;
const GLASS_STYLE: CSSProperties = {
  ...place(GLASS),
  WebkitMaskImage: GLASS_MASK,
  maskImage: GLASS_MASK,
  WebkitMaskSize: "100% 100%",
  maskSize: "100% 100%",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
};
const LED_GLOW =
  "0 0 0.5cqw var(--color-dusk-amber), 0 0 1.4cqw color-mix(in oklab, var(--color-ember-gold) 65%, transparent)";
const OSD_GLOW =
  "0 0 0.4cqw color-mix(in oklab, var(--color-linen) 70%, transparent), 0 0 1.2cqw color-mix(in oklab, var(--color-ember-gold) 45%, transparent)";

/* ═══════════════════════════════════════════════════════════════════
   Pieces of the room
   ═══════════════════════════════════════════════════════════════════ */

function Stop({ offset, color, opacity = 1 }: Readonly<{ offset: string; color: string; opacity?: number }>) {
  return <stop offset={offset} style={{ stopColor: `var(--color-${color})`, stopOpacity: opacity }} />;
}

function RoomDefs() {
  return (
    <defs>
      <pattern id="lr-boards" width="112" height="60" patternUnits="userSpaceOnUse">
        <rect width="112" height="60" fill="var(--color-chalet-cedar)" />
        <rect x="56" width="56" height="60" fill="var(--color-ink)" fillOpacity={0.1} />
        <path d="M1 0V60M57 0V60" stroke="var(--color-ink)" strokeOpacity={0.45} strokeWidth={2} />
        <path d="M4.5 0V60M60.5 0V60" stroke="var(--color-ember-gold)" strokeOpacity={0.1} strokeWidth={1.5} />
      </pattern>
      <pattern id="lr-stripes" width="28" height="40" patternUnits="userSpaceOnUse">
        <rect width="28" height="40" fill="var(--color-linen-deep)" />
        <rect width="14" height="40" fill="var(--color-bruised-lavender)" />
        <rect x="12" width="2" height="40" fill="var(--color-velvet-plum)" fillOpacity={0.35} />
      </pattern>

      <radialGradient id="lr-wall-glow" gradientUnits="userSpaceOnUse" cx="500" cy="330" r="1000">
        <Stop offset="0%" color="ember-gold" opacity={0.55} />
        <Stop offset="35%" color="dusk-amber" opacity={0.18} />
        <Stop offset="100%" color="twilight-indigo" opacity={0.6} />
      </radialGradient>
      <linearGradient id="lr-floor" gradientUnits="userSpaceOnUse" x1="0" y1="560" x2="0" y2="1400">
        <Stop offset="0%" color="chalet-cedar" />
        <Stop offset="100%" color="twilight-indigo" />
      </linearGradient>
      <linearGradient id="lr-floor-seam" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" color="ink" opacity={0.5} />
        <Stop offset="100%" color="ink" opacity={0} />
      </linearGradient>
      <linearGradient id="lr-beam-shadow" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" color="ink" opacity={0.4} />
        <Stop offset="100%" color="ink" opacity={0} />
      </linearGradient>
      <radialGradient id="lr-pool">
        <Stop offset="0%" color="ember-gold" opacity={0.55} />
        <Stop offset="60%" color="dusk-amber" opacity={0.16} />
        <Stop offset="100%" color="dusk-amber" opacity={0} />
      </radialGradient>
      <radialGradient id="lr-halo">
        <Stop offset="0%" color="ember-gold" opacity={0.85} />
        <Stop offset="40%" color="ember-gold" opacity={0.28} />
        <Stop offset="100%" color="ember-gold" opacity={0} />
      </radialGradient>
      <radialGradient id="lr-hearth-glow" gradientUnits="userSpaceOnUse" cx="500" cy="320" r="430">
        <Stop offset="0%" color="ember-gold" opacity={0.6} />
        <Stop offset="50%" color="dusk-amber" opacity={0.2} />
        <Stop offset="100%" color="dusk-amber" opacity={0} />
      </radialGradient>
      <radialGradient id="lr-firebox" gradientUnits="userSpaceOnUse" cx="500" cy="372" r="190">
        <Stop offset="0%" color="ember-gold" />
        <Stop offset="30%" color="dusk-amber" />
        <Stop offset="62%" color="hearth-terracotta" opacity={0.9} />
        <Stop offset="100%" color="ink" />
      </radialGradient>
      <linearGradient id="lr-shade" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" color="linen-deep" />
        <Stop offset="100%" color="ember-gold" />
      </linearGradient>
      <linearGradient id="lr-depth" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" color="ink" opacity={0} />
        <Stop offset="100%" color="ink" opacity={0.3} />
      </linearGradient>
      <linearGradient id="lr-sheen" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" color="ember-gold" opacity={0.35} />
        <Stop offset="30%" color="ember-gold" opacity={0} />
        <Stop offset="100%" color="ink" opacity={0.3} />
      </linearGradient>
      <linearGradient id="lr-tv-face" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" color="hearth-terracotta" />
        <Stop offset="65%" color="hearth-terracotta" />
        <Stop offset="100%" color="chalet-cedar" />
      </linearGradient>
      <linearGradient id="lr-sky" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" color="twilight-indigo" />
        <Stop offset="55%" color="velvet-plum" />
        <Stop offset="100%" color="dusk-amber" />
      </linearGradient>
      <radialGradient id="lr-frost-in">
        <Stop offset="0%" color="orchid-white" opacity={0.55} />
        <Stop offset="100%" color="orchid-white" opacity={0} />
      </radialGradient>

      {/* Cats: velvety fills, soft shading pools and a firelit rim from the hearth behind */}
      <linearGradient id="lr-cat-rim" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" color="orchid-white" opacity={0.95} />
        <Stop offset="35%" color="ember-gold" />
        <Stop offset="100%" color="dusk-amber" />
      </linearGradient>
      <linearGradient id="lr-cream-body" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" color="ember-gold" />
        <Stop offset="55%" color="ember-gold" />
        <Stop offset="100%" color="dusk-amber" />
      </linearGradient>
      <linearGradient id="lr-cream-head" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" color="ember-gold" />
        <Stop offset="45%" color="ember-gold" />
        <Stop offset="90%" color="linen-deep" />
      </linearGradient>
      <linearGradient id="lr-cream-fur" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" color="linen-deep" />
        <Stop offset="35%" color="ember-gold" />
        <Stop offset="100%" color="dusk-amber" />
      </linearGradient>
      <linearGradient id="lr-cream-ruff" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" color="ember-gold" />
        <Stop offset="45%" color="linen-deep" />
        <Stop offset="100%" color="ember-gold" />
      </linearGradient>
      <linearGradient id="lr-cream-ear" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" color="dusk-amber" />
        <Stop offset="100%" color="ember-gold" />
      </linearGradient>
      <radialGradient id="lr-cream-iris" cx="0.5" cy="0.5" r="0.5">
        <Stop offset="0%" color="ember-gold" />
        <Stop offset="45%" color="dusk-amber" />
        <Stop offset="85%" color="dusk-amber" />
        <Stop offset="100%" color="hearth-terracotta" />
      </radialGradient>
      <radialGradient id="lr-soft-linen">
        <Stop offset="0%" color="linen-deep" opacity={0.95} />
        <Stop offset="55%" color="linen-deep" opacity={0.55} />
        <Stop offset="100%" color="linen-deep" opacity={0} />
      </radialGradient>
      <radialGradient id="lr-soft-cream">
        <Stop offset="0%" color="linen" />
        <Stop offset="55%" color="linen" opacity={0.7} />
        <Stop offset="100%" color="linen" opacity={0} />
      </radialGradient>
      <radialGradient id="lr-soft-white">
        <Stop offset="0%" color="orchid-white" />
        <Stop offset="60%" color="orchid-white" opacity={0.7} />
        <Stop offset="100%" color="orchid-white" opacity={0} />
      </radialGradient>
      <radialGradient id="lr-soft-amber">
        <Stop offset="0%" color="dusk-amber" opacity={0.6} />
        <Stop offset="100%" color="dusk-amber" opacity={0} />
      </radialGradient>
      <radialGradient id="lr-soft-blush">
        <Stop offset="0%" color="hearth-terracotta" opacity={0.4} />
        <Stop offset="100%" color="hearth-terracotta" opacity={0} />
      </radialGradient>
      <radialGradient id="lr-soft-lavender">
        <Stop offset="0%" color="bruised-lavender" opacity={0.75} />
        <Stop offset="100%" color="bruised-lavender" opacity={0} />
      </radialGradient>
      <linearGradient id="lr-cat-contact" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" color="ink" opacity={0} />
        <Stop offset="100%" color="ink" opacity={0.3} />
      </linearGradient>
      <linearGradient id="lr-lid-shadow" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" color="ink" opacity={0.6} />
        <Stop offset="100%" color="ink" opacity={0} />
      </linearGradient>
      <linearGradient id="lr-tabby-body" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" color="orchid-white" />
        <Stop offset="55%" color="linen" />
        <Stop offset="100%" color="linen-deep" />
      </linearGradient>
      <linearGradient id="lr-tabby-head" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" color="linen" />
        <Stop offset="60%" color="orchid-white" />
        <Stop offset="100%" color="linen" />
      </linearGradient>
      <linearGradient id="lr-tabby-patch" x1="0" y1="0" x2="0.3" y2="1">
        <Stop offset="0%" color="chalet-cedar" />
        <Stop offset="65%" color="twilight-indigo" />
        <Stop offset="100%" color="twilight-indigo" />
      </linearGradient>
      <linearGradient id="lr-tabby-ear" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" color="twilight-indigo" />
        <Stop offset="100%" color="chalet-cedar" />
      </linearGradient>
      <radialGradient id="lr-tabby-iris" cx="0.5" cy="0.5" r="0.5">
        <Stop offset="0%" color="linen" />
        <Stop offset="24%" color="alpine-sage" opacity={0.5} />
        <Stop offset="66%" color="alpine-sage" />
        <Stop offset="100%" color="twilight-indigo" />
      </radialGradient>
      <radialGradient id="lr-tabby-hazel">
        <Stop offset="0%" color="dusk-amber" opacity={0.75} />
        <Stop offset="100%" color="dusk-amber" opacity={0} />
      </radialGradient>
      <radialGradient id="lr-tabby-pad">
        <Stop offset="0%" color="ember-gold" opacity={0.95} />
        <Stop offset="55%" color="dusk-amber" opacity={0.55} />
        <Stop offset="100%" color="dusk-amber" opacity={0} />
      </radialGradient>

      {/* CRT: a deep, curved bezel */}
      <linearGradient id="lr-bezel" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" color="ember-gold" opacity={0.28} />
        <Stop offset="22%" color="twilight-indigo" opacity={0} />
        <Stop offset="78%" color="ink" opacity={0.15} />
        <Stop offset="100%" color="ink" opacity={0.6} />
      </linearGradient>
      <radialGradient id="lr-bezel-well" cx="0.5" cy="0.48" r="0.56">
        <Stop offset="78%" color="ink" opacity={0.35} />
        <Stop offset="100%" color="ink" opacity={0.85} />
      </radialGradient>
      <linearGradient id="lr-plaque" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" color="ink" opacity={0.55} />
        <Stop offset="100%" color="ink" opacity={0.3} />
      </linearGradient>

      {/* Stoneware vase on the mantel */}
      <radialGradient id="lr-vase" cx="0.34" cy="0.42" r="0.8">
        <Stop offset="0%" color="dusk-amber" />
        <Stop offset="38%" color="hearth-terracotta" />
        <Stop offset="100%" color="chalet-cedar" />
      </radialGradient>

      <clipPath id="lr-clip-ceiling">
        <path d={CEILING} />
      </clipPath>
      <clipPath id="lr-clip-upper">
        <rect x={318} y={-860} width={364} height={1040} />
      </clipPath>
      <clipPath id="lr-clip-breast">
        <rect x={232} y={176} width={536} height={216} />
      </clipPath>
      <clipPath id="lr-clip-plinth">
        <rect x={150} y={392} width={700} height={168} />
      </clipPath>
      <clipPath id="lr-clip-firebox">
        <path d={FIREBOX} />
      </clipPath>
      <clipPath id="lr-clip-cream-body">
        <path d={CREAM_BODY} />
      </clipPath>
      <clipPath id="lr-clip-cream-head">
        <path d={CREAM_HEAD} />
      </clipPath>
      <clipPath id="lr-clip-cream-leg">
        <path d={CREAM_LEG} />
      </clipPath>
      <clipPath id="lr-clip-cream-tail-base">
        <path d={CREAM_TAIL_BASE} />
      </clipPath>
      <clipPath id="lr-clip-cream-tail-tip">
        <path d={CREAM_TAIL_TIP} />
      </clipPath>
      <clipPath id="lr-clip-tabby">
        <path d={TABBY_BODY} />
      </clipPath>
      <clipPath id="lr-clip-tabby-patches">
        <path d={TABBY_SADDLE} />
        <path d={TABBY_HIP} />
      </clipPath>
      <clipPath id="lr-clip-tabby-head">
        <path d={TABBY_HEAD} />
      </clipPath>
      <clipPath id="lr-clip-tabby-tail-base">
        <path d={TABBY_TAIL_BASE} />
      </clipPath>
      <clipPath id="lr-clip-tabby-tail-tip">
        <path d={TABBY_TAIL_TIP} />
      </clipPath>
      {[...CREAM_EYES, ...TABBY_EYES].map((eye) => (
        <clipPath key={eye.id} id={eye.id}>
          <path d={eye.d} />
        </clipPath>
      ))}
    </defs>
  );
}

function StoneCourses({ stones, clip }: Readonly<{ stones: Stones; clip: string }>) {
  return (
    <g clipPath={`url(#${clip})`}>
      <path d={stones.mid} fill="var(--color-bruised-lavender)" fillOpacity={0.6} />
      <path d={stones.deep} fill="var(--color-bruised-lavender)" fillOpacity={0.36} />
      <path d={stones.pale} fill="var(--color-petal-lilac)" fillOpacity={0.55} />
    </g>
  );
}

/** A small mullioned window on the side wall: dusk, peaks and a little frost. */
function SideWindow({ x }: Readonly<{ x: number }>) {
  return (
    <g transform={`translate(${x} 150)`}>
      <rect x={-40} y={-28} width={290} height={6} rx={3} fill="var(--color-dusk-amber)" />
      <rect x={-14} y={-14} width={238} height={298} rx={6} fill="var(--color-chalet-cedar)" />
      <rect x={-14} y={-14} width={238} height={298} rx={6} fill="var(--color-ink)" fillOpacity={0.18} />
      <rect x={0} y={0} width={210} height={270} fill="url(#lr-sky)" />
      {[
        [30, 30],
        [72, 54],
        [150, 24],
        [184, 70],
        [118, 88],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.8} fill="var(--color-orchid-white)" fillOpacity={0.8} />
      ))}
      <path d="M0 210L40 178L70 192L112 150L150 186L178 170L210 190V270H0Z" fill="var(--color-bruised-lavender)" fillOpacity={0.55} />
      <path d="M112 150L100 162L108 160L114 166L120 160L126 162Z" fill="var(--color-orchid-white)" fillOpacity={0.7} />
      <path d="M0 238C40 222 90 230 130 220C170 212 190 226 210 222V270H0Z" fill="var(--color-twilight-indigo)" />
      <ellipse cx={0} cy={270} rx={60} ry={42} fill="url(#lr-frost-in)" />
      <ellipse cx={210} cy={270} rx={54} ry={38} fill="url(#lr-frost-in)" />
      <rect x={100} y={0} width={10} height={270} fill="var(--color-chalet-cedar)" />
      <rect x={0} y={128} width={210} height={10} fill="var(--color-chalet-cedar)" />
      <rect x={0} y={0} width={210} height={270} fill="none" stroke="var(--color-ink)" strokeOpacity={0.5} strokeWidth={3} />
      <rect x={-24} y={270} width={258} height={16} rx={3} fill="var(--color-chalet-cedar)" />
      <path d="M-22 271H232" stroke="var(--color-ember-gold)" strokeOpacity={0.45} strokeWidth={2} />
      {/* Curtains, tied back */}
      <path d="M-32 -22H26C20 80 32 160 8 236C2 250 -10 260 -26 262Z" fill="var(--color-petal-lilac)" fillOpacity={0.9} />
      <path d="M242 -22H184C190 80 178 160 202 236C208 250 220 260 236 262Z" fill="var(--color-petal-lilac)" fillOpacity={0.9} />
      <path d="M-14 -20C-12 60 -16 150 -14 250M6 -20C8 60 2 150 -2 230M224 -20C222 60 226 150 224 250M204 -20C202 60 208 150 212 230" stroke="var(--color-velvet-plum)" strokeOpacity={0.22} strokeWidth={2} fill="none" />
      <rect x={-30} y={168} width={44} height={9} rx={4.5} fill="var(--color-dusk-amber)" />
      <rect x={196} y={168} width={44} height={9} rx={4.5} fill="var(--color-dusk-amber)" />
    </g>
  );
}

function FloorLamp({ x }: Readonly<{ x: number }>) {
  return (
    <g>
      <circle cx={x} cy={290} r={250} fill="url(#lr-halo)" className="animate-ember" />
      <path d={`M${x - 56} 330L${x - 170} 712H${x + 170}L${x + 56} 330Z`} fill="var(--color-ember-gold)" fillOpacity={0.07} />
      <ellipse cx={x} cy={712} rx={40} ry={9} fill="var(--color-chalet-cedar)" />
      <rect x={x - 4} y={320} width={8} height={390} rx={4} fill="var(--color-dusk-amber)" />
      <path d={`M${x - 58} 330L${x - 38} 240H${x + 38}L${x + 58} 330Z`} fill="url(#lr-shade)" stroke="var(--color-linen-deep)" strokeWidth={4} strokeLinejoin="round" />
      <ellipse cx={x} cy={330} rx={54} ry={7} fill="var(--color-ember-gold)" />
    </g>
  );
}

function TableLamp({ x }: Readonly<{ x: number }>) {
  return (
    <g>
      <circle cx={x} cy={64} r={135} fill="url(#lr-halo)" className="animate-ember" style={{ animationDelay: `-${(x % 7) / 2}s` }} />
      <path d={`M${x - 15} 148C${x - 22} 132 ${x - 18} 112 ${x - 8} 106H${x + 8}C${x + 18} 112 ${x + 22} 132 ${x + 15} 148Z`} fill="var(--color-velvet-plum)" />
      <path d={`M${x - 9} 114C${x - 13} 124 ${x - 12} 136 ${x - 8} 144`} stroke="var(--color-petal-lilac)" strokeOpacity={0.4} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <rect x={x - 3} y={88} width={6} height={20} fill="var(--color-dusk-amber)" />
      <path d={`M${x - 34} 92L${x - 22} 44H${x + 22}L${x + 34} 92Z`} fill="url(#lr-shade)" stroke="var(--color-linen-deep)" strokeWidth={4} strokeLinejoin="round" />
      <ellipse cx={x} cy={92} rx={30} ry={5} fill="var(--color-ember-gold)" />
    </g>
  );
}

/** A white orchid on the mantel, a nod to the vines outside. */
function MantelOrchid() {
  const bloom = (cx: number, cy: number, s: number) => (
    <g key={`${cx}-${cy}`} transform={`translate(${cx} ${cy}) scale(${s})`}>
      {[-90, 30, 150].map((a) => (
        <ellipse key={a} rx={4} ry={9} transform={`rotate(${a + 90}) translate(0 -8)`} fill="var(--color-orchid-white)" />
      ))}
      {[-25, 25].map((a) => (
        <ellipse key={a} rx={6} ry={8} transform={`rotate(${a * 3}) translate(0 -7)`} fill="var(--color-orchid-white)" />
      ))}
      <ellipse cy={5} rx={4.5} ry={3.6} fill="var(--color-petal-lilac)" />
      <circle cy={1} r={1.8} fill="var(--color-dusk-amber)" />
    </g>
  );
  return (
    <g>
      <path d="M392 122C386 90 394 66 414 58C430 52 440 60 446 70" stroke="var(--color-alpine-sage)" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <ellipse cx={378} cy={122} rx={18} ry={6} transform="rotate(-18 378 122)" fill="var(--color-alpine-sage)" />
      <ellipse cx={406} cy={124} rx={17} ry={5.5} transform="rotate(14 406 124)" fill="var(--color-alpine-sage)" />
      {bloom(410, 60, 1)}
      {bloom(434, 64, 0.85)}
      {bloom(448, 80, 0.7)}
      <path d="M376 148L372 124H412L408 148Z" fill="var(--color-hearth-terracotta)" />
      <rect x={369} y={120} width={46} height={7} rx={3} fill="var(--color-hearth-terracotta)" />
      <rect x={369} y={120} width={46} height={7} rx={3} fill="var(--color-ink)" fillOpacity={0.15} />
    </g>
  );
}

function Candles() {
  return (
    <g>
      {[
        { x: 470, top: 112 },
        { x: 495, top: 122 },
      ].map(({ x, top }, i) => (
        <g key={x}>
          <circle cx={x} cy={top - 12} r={26} fill="url(#lr-halo)" className="animate-flicker" style={{ animationDelay: `-${i * 1.7}s` }} />
          <rect x={x - 8} y={top} width={16} height={148 - top} rx={3} fill="var(--color-linen-deep)" />
          <path d={`M${x - 4} ${top + 4}V${top + 22}`} stroke="var(--color-orchid-white)" strokeOpacity={0.7} strokeWidth={2} strokeLinecap="round" />
          <path d={`M${x} ${top}V${top - 5}`} stroke="var(--color-ink)" strokeWidth={1.5} />
          <g className="animate-flame origin-bottom transform-fill" style={{ animationDelay: `-${i * 0.6}s` }}>
            <path d={flamePath(x, top - 4, 9, 18, i ? -1.5 : 1.5)} fill="var(--color-ember-gold)" />
            <path d={flamePath(x, top - 4, 4, 9, 0)} fill="var(--color-orchid-white)" fillOpacity={0.8} />
          </g>
        </g>
      ))}
    </g>
  );
}

/** Calla lilies and a magnolia sprig in a speckled hearth-terracotta stoneware vase. */
function StonewareVase() {
  return (
    <g>
      {/* Stems go in first, so the vase's neck hides where they meet */}
      <g transform="translate(398 112) rotate(-30) scale(0.6) translate(-6 -168)">
        <Breeze delay={1.4} duration={8.5}>
          <MagnoliaSprigArt />
        </Breeze>
      </g>
      {[
        { x: 386, r: -24, s: 0.5, d: 0 },
        { x: 392, r: -6, s: 0.58, d: 0.9 },
        { x: 396, r: 12, s: 0.46, d: 2.1 },
      ].map((c) => (
        <g key={c.x} transform={`translate(${c.x} 114) rotate(${c.r}) scale(${c.s}) translate(-60 -240)`}>
          <Breeze delay={c.d} duration={7 + c.d}>
            <CallaLilyArt leaf={c.x === 386} />
          </Breeze>
        </g>
      ))}

      <ellipse cx={392} cy={149} rx={30} ry={4} fill="var(--color-ink)" fillOpacity={0.3} />
      <path d="M378 148C366 140 364 124 372 116C376 112 382 110 382 106H402C402 110 408 112 412 116C420 124 418 140 406 148Z" fill="url(#lr-vase)" />
      <path d="M404 112C414 118 418 130 412 142C410 146 408 147 406 148C414 138 414 124 404 112Z" fill="var(--color-ink)" fillOpacity={0.3} />
      <path d="M374 124C374 118 378 114 382 112C378 118 377 124 378 132Z" fill="var(--color-ember-gold)" fillOpacity={0.6} />
      <path d="M371 120C380 116 404 116 413 120C404 123 380 123 371 120Z" fill="var(--color-chalet-cedar)" fillOpacity={0.35} />
      {[
        [378, 132],
        [386, 138],
        [397, 128],
        [404, 140],
        [390, 126],
        [409, 131],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={0.9} fill="var(--color-linen-deep)" fillOpacity={0.45} />
      ))}
      <rect x={380} y={102} width={24} height={6} rx={3} fill="var(--color-hearth-terracotta)" />
      <rect x={380} y={102} width={24} height={2.5} rx={1.25} fill="var(--color-ember-gold)" fillOpacity={0.4} />
    </g>
  );
}

/** A little embroidery hoop on the mantel, stitched for the day. */
function BirthdayHoop() {
  return (
    <g transform="translate(642 116)">
      <rect x={-5} y={-41} width={10} height={9} rx={2} fill="var(--color-dusk-amber)" />
      <circle r={31} fill="var(--color-linen-deep)" />
      <circle r={25} fill="none" stroke="var(--color-dusk-amber)" strokeOpacity={0.6} strokeWidth={1.2} strokeDasharray="3 3" />
      <circle r={31} fill="none" stroke="var(--color-chalet-cedar)" strokeWidth={5} />
      <text
        y={9}
        textAnchor="middle"
        className="font-serif"
        fontSize={26}
        fontStyle="italic"
        fill="var(--color-velvet-plum)"
        style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 36' }}
      >
        23
      </text>
    </g>
  );
}

function Hearth() {
  return (
    <g>
      {/* Chimney: plinth, breast and stack, all fieldstone over dark mortar */}
      <rect x={318} y={-860} width={364} height={1040} fill="var(--color-twilight-indigo)" />
      <StoneCourses stones={UPPER_STONES} clip="lr-clip-upper" />
      <rect x={232} y={176} width={536} height={216} fill="var(--color-twilight-indigo)" />
      <StoneCourses stones={BREAST_STONES} clip="lr-clip-breast" />
      <rect x={150} y={392} width={700} height={168} fill="var(--color-twilight-indigo)" />
      <StoneCourses stones={PLINTH_STONES} clip="lr-clip-plinth" />
      <path d="M318 -860V180M682 -860V180M232 176V392M768 176V392" stroke="var(--color-ink)" strokeOpacity={0.35} strokeWidth={4} />

      {/* Living firelight across the stones */}
      <g className="animate-flicker">
        <rect x={60} y={-140} width={880} height={720} fill="url(#lr-hearth-glow)" />
      </g>

      {/* Firebox */}
      <path d={FIREBOX} fill="url(#lr-firebox)" />
      <g clipPath="url(#lr-clip-firebox)">
        <path d={FIREBOX_BRICKS} stroke="var(--color-ink)" strokeOpacity={0.22} strokeWidth={2} fill="none" />
        <ellipse cx={500} cy={246} rx={150} ry={46} fill="var(--color-ink)" fillOpacity={0.45} />
      </g>
      {ARCH_STONES.map((d, i) => (
        <path
          key={d}
          d={d}
          fill={i === 4 ? "var(--color-petal-lilac)" : "var(--color-bruised-lavender)"}
          fillOpacity={i === 4 ? 0.95 : i % 2 ? 0.7 : 0.88}
          stroke="var(--color-ink)"
          strokeOpacity={0.3}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      ))}
      {JAMB_STONES.map((d, i) => (
        <path key={d} d={d} fill="var(--color-bruised-lavender)" fillOpacity={i % 3 === 1 ? 0.7 : 0.88} />
      ))}

      {/* Logs, grate and embers */}
      <path d="M404 380H596M414 384V370M586 384V370" stroke="var(--color-ink)" strokeOpacity={0.8} strokeWidth={4} strokeLinecap="round" />
      <rect x={418} y={350} width={170} height={24} rx={12} fill="var(--color-chalet-cedar)" transform="rotate(-7 503 362)" />
      <rect x={414} y={352} width={176} height={24} rx={12} fill="var(--color-chalet-cedar)" transform="rotate(6 502 364)" />
      <circle cx={421} cy={372} r={10} fill="var(--color-dusk-amber)" />
      <circle cx={421} cy={372} r={5} fill="none" stroke="var(--color-hearth-terracotta)" strokeWidth={1.5} />
      <circle cx={584} cy={373} r={10} fill="var(--color-dusk-amber)" />
      <circle cx={584} cy={373} r={5} fill="none" stroke="var(--color-hearth-terracotta)" strokeWidth={1.5} />
      {[440, 468, 500, 530, 562].map((cx, i) => (
        <circle
          key={cx}
          cx={cx}
          cy={378 - (i % 2) * 3}
          r={4 + (i % 3)}
          fill={i % 2 ? "var(--color-dusk-amber)" : "var(--color-ember-gold)"}
          className="animate-ember"
          style={{ animationDelay: `-${i * 1.3}s` }}
        />
      ))}

      {/* Flames */}
      {FLAMES.map((f) => (
        <g
          key={f.cx}
          className="animate-flame origin-bottom transform-fill"
          style={{ animationDelay: `-${f.delay}s`, animationDuration: `${f.dur}s` }}
        >
          <path d={f.outer} fill="var(--color-hearth-terracotta)" fillOpacity={0.92} />
          <path d={f.mid} fill="var(--color-dusk-amber)" />
          <path d={f.inner} fill="var(--color-ember-gold)" />
          <path d={f.core} fill="var(--color-orchid-white)" fillOpacity={0.75} />
        </g>
      ))}

      {/* Hearthstone ledge, warm where the fire spills over it */}
      <rect x={136} y={380} width={728} height={24} rx={8} fill="var(--color-bruised-lavender)" />
      <path d="M144 381.5H856" stroke="var(--color-petal-lilac)" strokeOpacity={0.8} strokeWidth={2.5} strokeLinecap="round" />
      <rect x={136} y={398} width={728} height={6} rx={3} fill="var(--color-ink)" fillOpacity={0.3} />
      <ellipse cx={500} cy={386} rx={190} ry={22} fill="url(#lr-pool)" className="animate-flicker" />

      {/* Log niches either side of the plinth */}
      {[172, 724].map((x) => (
        <g key={x}>
          <rect x={x} y={418} width={104} height={128} rx={12} fill="var(--color-ink)" />
          <rect x={x} y={418} width={104} height={20} rx={10} fill="var(--color-ink)" fillOpacity={0.6} />
        </g>
      ))}
      {NICHE_LOGS.map((log) => (
        <g key={log.id}>
          <circle cx={log.cx} cy={log.cy} r={log.r} fill="var(--color-dusk-amber)" stroke="var(--color-chalet-cedar)" strokeWidth={3.5} />
          <circle cx={log.cx} cy={log.cy} r={log.r * 0.6} fill="none" stroke="var(--color-ember-gold)" strokeOpacity={0.85} strokeWidth={1.3} />
          <circle cx={log.cx} cy={log.cy} r={2} fill="var(--color-hearth-terracotta)" />
        </g>
      ))}

      {/* Mantel beam with carved corbels */}
      <path d="M226 180H262L256 214C252 220 244 220 240 214Z M738 180H774L760 214C756 220 748 220 744 214Z" fill="var(--color-chalet-cedar)" />
      <rect x={196} y={148} width={608} height={34} rx={6} fill="var(--color-chalet-cedar)" />
      <rect x={196} y={166} width={608} height={16} rx={6} fill="var(--color-ink)" fillOpacity={0.22} />
      <path d="M202 149.5H798" stroke="var(--color-ember-gold)" strokeOpacity={0.55} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M240 160H330M420 158H560M640 160H760" stroke="var(--color-ink)" strokeOpacity={0.14} strokeWidth={1.5} strokeLinecap="round" />

      {/* On the mantel */}
      <TableLamp x={252} />
      <TableLamp x={748} />
      <StonewareVase />
      <Candles />
      <g transform="translate(150 0)">
        <MantelOrchid />
      </g>
      <BirthdayHoop />
    </g>
  );
}

function Armchair({ x, flip = false, throwBlanket = false }: Readonly<{ x: number; flip?: boolean; throwBlanket?: boolean }>) {
  return (
    <g transform={`translate(${x} 776) scale(${flip ? -0.94 : 0.94} 0.94)`}>
      <ellipse cx={0} cy={2} rx={152} ry={13} fill="var(--color-ink)" fillOpacity={0.35} />
      <path d="M-108 -36L-100 0H-90L-92 -36Z M108 -36L100 0H90L92 -36Z" fill="var(--color-chalet-cedar)" />
      <path d={CHAIR_BACK} fill="url(#lr-stripes)" />
      <path d={CHAIR_BACK} fill="url(#lr-depth)" />
      <path d={CHAIR_BACK} fill="none" stroke="var(--color-velvet-plum)" strokeWidth={4} />
      {[-50, 0, 50].map((bx) => (
        <circle key={bx} cx={bx} cy={-208} r={3.5} fill="var(--color-velvet-plum)" />
      ))}
      <path d="M-98 -122C-98 -140 -80 -148 0 -148C80 -148 98 -140 98 -122V-100H-98Z" fill="var(--color-petal-lilac)" stroke="var(--color-velvet-plum)" strokeOpacity={0.5} strokeWidth={2} />
      <rect x={-118} y={-104} width={236} height={70} rx={18} fill="url(#lr-stripes)" />
      <rect x={-118} y={-104} width={236} height={70} rx={18} fill="url(#lr-depth)" />
      <rect x={-118} y={-104} width={236} height={70} rx={18} fill="none" stroke="var(--color-velvet-plum)" strokeWidth={4} />
      {[-1, 1].map((s) => (
        <g key={s}>
          <rect x={s < 0 ? -142 : 90} y={-182} width={52} height={150} rx={26} fill="var(--color-velvet-plum)" />
          <rect x={s < 0 ? -142 : 90} y={-182} width={52} height={150} rx={26} fill="url(#lr-depth)" />
          <path d={`M${s < 0 ? -132 : 100} -168Q${s < 0 ? -116 : 116} -180 ${s < 0 ? -100 : 132} -168`} stroke="var(--color-petal-lilac)" strokeOpacity={0.35} strokeWidth={3} fill="none" strokeLinecap="round" />
        </g>
      ))}
      {/* Firelight on the arm that faces the hearth */}
      <rect x={90} y={-182} width={52} height={150} rx={26} fill="none" stroke="var(--color-ember-gold)" strokeOpacity={0.4} strokeWidth={2.5} />
      {throwBlanket ? (
        <g>
          <path d="M80 -188C102 -198 130 -196 148 -182L152 -98C142 -90 130 -94 122 -86C112 -94 100 -90 90 -98Z" fill="var(--color-dusk-amber)" />
          <path d="M96 -186C94 -160 98 -130 96 -102M112 -190C110 -160 114 -126 112 -94M128 -190C126 -160 130 -126 128 -92M142 -184C140 -160 144 -126 144 -96" stroke="var(--color-ember-gold)" strokeOpacity={0.6} strokeWidth={2} fill="none" strokeLinecap="round" />
          <path d="M92 -96v10M104 -92v10M116 -88v10M128 -88v10M140 -92v10M150 -96v10" stroke="var(--color-dusk-amber)" strokeWidth={2.5} strokeLinecap="round" />
        </g>
      ) : (
        <g transform="rotate(-8 0 -170)">
          <rect x={-40} y={-200} width={80} height={62} rx={20} fill="var(--color-ember-gold)" />
          <rect x={-32} y={-192} width={64} height={46} rx={14} fill="none" stroke="var(--color-dusk-amber)" strokeWidth={2} strokeDasharray="4 4" />
        </g>
      )}
    </g>
  );
}

function Rug() {
  return (
    <g>
      <path d="M170 792L830 792L950 1060L50 1060Z" fill="var(--color-velvet-plum)" />
      <path d="M190 802L810 802L918 1046L82 1046Z" fill="var(--color-ember-gold)" fillOpacity={0.85} />
      <path d="M198 807L802 807L906 1040L94 1040Z" fill="var(--color-velvet-plum)" />
      <path d="M216 816L784 816L878 1026L122 1026Z" fill="var(--color-bruised-lavender)" />
      <path d={RUG_WEAVE} stroke="var(--color-linen-deep)" strokeOpacity={0.14} strokeWidth={2} fill="none" />
      <path d="M500 846L650 920L500 994L350 920Z" fill="var(--color-petal-lilac)" />
      <path d="M500 872L596 920L500 968L404 920Z" fill="var(--color-velvet-plum)" fillOpacity={0.7} />
      <path d="M500 898L544 920L500 942L456 920Z" fill="var(--color-ember-gold)" />
      {[
        [262, 862],
        [232, 980],
        [738, 862],
        [768, 980],
      ].map(([cx, cy]) => (
        <path key={`${cx}-${cy}`} d={`M${cx} ${cy - 16}L${cx + 22} ${cy}L${cx} ${cy + 16}L${cx - 22} ${cy}Z`} fill="var(--color-linen-deep)" fillOpacity={0.8} />
      ))}
      {Array.from({ length: 13 }, (_, i) => {
        const t = (i + 0.5) / 13;
        const cx = r1(214 + t * 572);
        return <path key={cx} d={`M${cx} 806l6 4.5l-6 4.5l-6 -4.5Z`} fill="var(--color-linen-deep)" fillOpacity={0.75} />;
      })}
      <path d={RUG_FRINGE} stroke="var(--color-linen-deep)" strokeOpacity={0.75} strokeWidth={2.5} strokeLinecap="round" />
    </g>
  );
}

function TvCabinet() {
  return (
    <g>
      <ellipse cx={500} cy={884} rx={240} ry={16} fill="var(--color-ink)" fillOpacity={0.45} />
      <path d="M330 818H354L332 884H318Z M646 818H670L682 884H668Z" fill="var(--color-chalet-cedar)" />
      <path d="M318 877H332V884H318Z M668 877H682V884H668Z" fill="var(--color-dusk-amber)" />

      {/* Cedar shell, a touch deeper below for the nameplate lip */}
      <rect x={280} y={462} width={440} height={368} rx={56} fill="var(--color-chalet-cedar)" />
      <rect x={280} y={462} width={440} height={368} rx={56} fill="url(#lr-sheen)" />
      <path d="M288 540Q283 650 290 790M712 540Q717 650 710 790" stroke="var(--color-ink)" strokeOpacity={0.15} strokeWidth={2} fill="none" />
      <path d="M338 463H662" stroke="var(--color-ember-gold)" strokeOpacity={0.55} strokeWidth={3} strokeLinecap="round" />

      {/* Terracotta face */}
      <rect x={292} y={476} width={416} height={342} rx={44} fill="url(#lr-tv-face)" />
      <rect x={292} y={800} width={416} height={18} rx={9} fill="var(--color-ink)" fillOpacity={0.12} />

      {/* The bulbous bezel: lit along its upper curve, falling into shadow below, a deep well round the glass */}
      <path d={BEZEL_OUTER} fill="var(--color-twilight-indigo)" />
      <path d={BEZEL_OUTER} fill="url(#lr-bezel)" />
      <path d={BEZEL_INNER} fill="url(#lr-bezel-well)" />
      <path d={GLASS_SEAT} fill="var(--color-ink)" />
      <path d="M326 498Q451 476 576 498Q451 488 326 498Z" fill="var(--color-orchid-white)" fillOpacity={0.16} />
      <path d="M330 772Q451 790 572 772Q451 782 330 772Z" fill="var(--color-ink)" fillOpacity={0.4} />

      {/* Recessed nameplate under the bezel; the live hint is laid over it */}
      <rect x={PLAQUE.x} y={PLAQUE.y} width={PLAQUE.w} height={PLAQUE.h} rx={PLAQUE.h / 2} fill="url(#lr-plaque)" />
      <rect x={PLAQUE.x + 6} y={PLAQUE.y + PLAQUE.h - 2.5} width={PLAQUE.w - 12} height={1.5} rx={0.75} fill="var(--color-ember-gold)" fillOpacity={0.3} />

      {/* Control panel */}
      <rect x={610} y={488} width={92} height={292} rx={20} fill="var(--color-chalet-cedar)" />
      <rect x={610} y={488} width={92} height={292} rx={20} fill="var(--color-ink)" fillOpacity={0.2} />
      <rect x={621} y={503} width={70} height={46} rx={9} fill="var(--color-ink)" />
      <rect x={625} y={507} width={62} height={38} rx={6} fill="var(--color-twilight-indigo)" />
      <rect x={617} y={556} width={78} height={56} rx={13} fill="var(--color-ink)" fillOpacity={0.45} />
      <rect x={617} y={614} width={78} height={56} rx={13} fill="var(--color-ink)" fillOpacity={0.45} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={628} y={686 + i * 9} width={56} height={4.5} rx={2.25} fill="var(--color-ink)" fillOpacity={0.55} />
      ))}
      <circle cx={656} cy={752} r={15} fill="var(--color-dusk-amber)" />
      <circle cx={656} cy={752} r={10.5} fill="var(--color-ember-gold)" />
      <path d="M656 743V749" stroke="var(--color-ink)" strokeOpacity={0.6} strokeWidth={2.5} strokeLinecap="round" />

      {/* Where the cats rest, the cabinet top darkens a touch */}
      <ellipse cx={500} cy={466} rx={206} ry={7} fill="var(--color-ink)" fillOpacity={0.35} />
    </g>
  );
}

/** An empty square centred on a tail joint: it sizes the group's fill-box so `origin-center` pivots exactly there. */
function Pivot({ at, r = 64 }: Readonly<{ at: Sample; r?: number }>) {
  return <rect x={r1(at.x - r)} y={r1(at.y - r)} width={r * 2} height={r * 2} fill="none" />;
}

/** One segment of a tail: a soft cast shadow, feathered locks behind, then a rim-lit fill. */
function TailPart({
  d,
  clip,
  fill,
  tufts,
  rim = false,
  children,
}: Readonly<{ d: string; clip: string; fill: string; tufts?: string; rim?: boolean; children?: ReactNode }>) {
  return (
    <>
      <path d={d} transform="translate(2.5 3.5)" fill="var(--color-ink)" fillOpacity={0.24} />
      {tufts && <path d={tufts} fill={fill} />}
      <g clipPath={`url(#${clip})`}>
        {rim && <path d={d} fill="url(#lr-cat-rim)" />}
        <g transform={rim ? "translate(1.5 3)" : undefined}>
          <path d={d} fill={fill} />
          {children}
        </g>
      </g>
    </>
  );
}

/** Whiskers on one side, rooted at the muzzle, with an occasional twitch. */
function Whiskers({ d, side, delay }: Readonly<{ d: string; side: "left" | "right"; delay: string }>) {
  return (
    <g
      className={`animate-whisker transform-fill ${side === "left" ? "origin-right" : "origin-left"}`}
      style={{ "--twitch": side === "left" ? "-4deg" : "4deg", animationDelay: delay } as CSSProperties}
    >
      <path d={d} stroke="var(--color-orchid-white)" strokeOpacity={0.65} strokeWidth={0.8} fill="none" strokeLinecap="round" />
    </g>
  );
}

/**
 * Left: a plush cream Persian (~5.5 kg) — long honey-and-linen fur in
 * layered locks, a heavy chest ruff, grumpy half-lidded amber eyes, one
 * fluffy foreleg over the bezel and a plume tail round the corner.
 */
function CreamCat() {
  return (
    <g transform="translate(404 470)">
      {/* Plume tail draped round the cabinet's top-left corner; only the tip sways */}
      <TailPart d={CREAM_TAIL_BASE} clip="lr-clip-cream-tail-base" fill="url(#lr-cream-fur)" tufts={CREAM_TAIL_BASE_TUFTS} rim />
      <g className="animate-tail origin-center transform-fill" style={{ "--sway": "4deg", animationDuration: "7.4s", animationDelay: "-1.2s" } as CSSProperties}>
        <Pivot at={CREAM_TAIL[TAIL_JOINT]} />
        <TailPart d={CREAM_TAIL_TIP} clip="lr-clip-cream-tail-tip" fill="url(#lr-cream-body)" tufts={CREAM_TAIL_TIP_TUFTS} />
      </g>

      {/* The fluffy foreleg slipped over the bezel from under the ruff, a soft shadow beneath */}
      <ellipse cx={-9} cy={31} rx={17} ry={4} fill="var(--color-ink)" fillOpacity={0.35} />
      <path d={CREAM_LEG_TUFTS} fill="url(#lr-cream-fur)" />
      <g clipPath="url(#lr-clip-cream-leg)">
        <path d={CREAM_LEG} fill="url(#lr-cream-body)" />
        <ellipse cx={-10} cy={22} rx={15} ry={9} fill="url(#lr-soft-linen)" />
        <ellipse cx={-14} cy={27} rx={1.6} ry={3.4} fill="var(--color-dusk-amber)" fillOpacity={0.5} />
        <ellipse cx={-6} cy={27.5} rx={1.6} ry={3.4} fill="var(--color-dusk-amber)" fillOpacity={0.5} />
        <ellipse cx={2} cy={27} rx={1.6} ry={3.2} fill="var(--color-dusk-amber)" fillOpacity={0.45} />
      </g>

      <g className="animate-breathe origin-bottom transform-fill" style={{ animationDuration: "4.6s" }}>
        {/* Body: long locks feathering a rim-lit, velvety loaf */}
        <path d={CREAM_BACK_TUFTS} transform="translate(0 -1)" fill="var(--color-orchid-white)" fillOpacity={0.3} />
        <path d={CREAM_BACK_TUFTS} fill="url(#lr-cream-body)" />
        <g clipPath="url(#lr-clip-cream-body)">
          <path d={CREAM_BODY} fill="url(#lr-cat-rim)" />
          <path d={CREAM_BODY} transform="translate(-2.5 5)" fill="url(#lr-cream-body)" />
          <path d={CREAM_BODY_LIGHT} fill="var(--color-linen-deep)" fillOpacity={0.22} />
          <path d={CREAM_BODY_SHADE} fill="var(--color-dusk-amber)" fillOpacity={0.35} />
          <ellipse cx={46} cy={-56} rx={64} ry={22} fill="url(#lr-soft-linen)" opacity={0.55} />
          <ellipse cx={90} cy={-20} rx={34} ry={38} fill="url(#lr-soft-amber)" />
          <ellipse cx={-64} cy={-16} rx={34} ry={24} fill="url(#lr-soft-lavender)" opacity={0.3} />
          <rect x={-100} y={-26} width={210} height={26} fill="url(#lr-cat-contact)" />
        </g>

        {/* The ruff's back tier, spilling round the chest */}
        <ellipse cx={-36} cy={-22} rx={46} ry={20} fill="url(#lr-cream-ruff)" />
        <path d={CREAM_RUFF_BACK} fill="url(#lr-cream-ruff)" />

        {/* Ears, set low in the fluff, long furnishings catching the fire */}
        <g className="animate-ear origin-bottom-right transform-fill" style={{ animationDelay: "-3s" }}>
          <path d={CREAM_EAR_L} fill="url(#lr-cream-ear)" />
          <path d={CREAM_EAR_L_IN} fill="var(--color-hearth-terracotta)" fillOpacity={0.32} />
          <path d={CREAM_EAR_L_TUFTS} fill="var(--color-linen-deep)" fillOpacity={0.85} />
        </g>
        <g className="animate-ear origin-bottom-left transform-fill" style={{ animationDelay: "-7.4s", animationDuration: "11s" }}>
          <path d={CREAM_EAR_R} fill="url(#lr-cream-ear)" />
          <path d={CREAM_EAR_R_IN} fill="var(--color-hearth-terracotta)" fillOpacity={0.32} />
          <path d={CREAM_EAR_R_TUFTS} fill="var(--color-linen-deep)" fillOpacity={0.85} />
        </g>

        {/* Head: a round, flat face in a halo of long cheek locks */}
        <path d={CREAM_CHEEK_TUFTS} fill="url(#lr-cream-head)" />
        <path d={CREAM_CROWN_TUFTS} transform="translate(0 -1)" fill="var(--color-orchid-white)" fillOpacity={0.35} />
        <path d={CREAM_CROWN_TUFTS} fill="var(--color-ember-gold)" />
        <g clipPath="url(#lr-clip-cream-head)">
          <path d={CREAM_HEAD} fill="url(#lr-cat-rim)" />
          <path d={CREAM_HEAD} transform="translate(-1.5 4)" fill="url(#lr-cream-head)" />
          <path d={CREAM_FACE_STRANDS} fill="var(--color-dusk-amber)" fillOpacity={0.3} />
          <ellipse cx={-84} cy={-40} rx={18} ry={20} fill="url(#lr-soft-amber)" />
          <ellipse cx={8} cy={-40} rx={18} ry={20} fill="url(#lr-soft-amber)" />
          <ellipse cx={-38} cy={-36} rx={30} ry={18} fill="url(#lr-soft-linen)" />
        </g>
        <path d={CREAM_RUFF_FRONT} fill="url(#lr-cream-ruff)" />

        {/* Face: heavy lids sagging toward the nose, grumpily half awake */}
        <ellipse cx={-66} cy={-46} rx={10} ry={6} fill="url(#lr-soft-blush)" />
        <ellipse cx={-10} cy={-46} rx={10} ry={6} fill="url(#lr-soft-blush)" />
        {CREAM_EYES.map((eye) => (
          <g key={eye.id}>
            <path d={eye.socket} fill="var(--color-chalet-cedar)" fillOpacity={0.16} />
            <g clipPath={`url(#${eye.id})`}>
              <path d={eye.d} fill="var(--color-dusk-amber)" />
              <circle cx={eye.cx} cy={eye.cy + 1} r={8.4} fill="url(#lr-cream-iris)" />
              <ellipse cx={eye.cx} cy={eye.cy + 1.2} rx={2.1} ry={4.8} fill="var(--color-twilight-indigo)" />
              <circle cx={eye.cx + 2.4} cy={eye.cy + 2.4} r={1.1} fill="var(--color-orchid-white)" fillOpacity={0.85} />
              <path d={eye.lid} transform="translate(0 1.8)" fill="var(--color-ink)" fillOpacity={0.35} />
              <path d={eye.lid} fill="var(--color-dusk-amber)" />
              <path d={eye.lid} transform="translate(0 -1.1)" fill="var(--color-ember-gold)" />
            </g>
          </g>
        ))}
        <ellipse cx={-38} cy={-56} rx={4} ry={5} fill="url(#lr-soft-amber)" />
        <ellipse cx={-44.5} cy={-41} rx={8} ry={6} fill="url(#lr-soft-cream)" />
        <ellipse cx={-31.5} cy={-41} rx={8} ry={6} fill="url(#lr-soft-cream)" />
        <path d={CREAM_NOSE} fill="var(--color-hearth-terracotta)" />
        <ellipse cx={-39.5} cy={-50.6} rx={1.6} ry={0.9} fill="var(--color-orchid-white)" fillOpacity={0.45} />
        <path d={CREAM_MOUTH} stroke="var(--color-chalet-cedar)" strokeOpacity={0.5} strokeWidth={1.1} fill="none" strokeLinecap="round" />
        <Whiskers d={CREAM_WHISKERS_L} side="left" delay="-2.2s" />
        <Whiskers d={CREAM_WHISKERS_R} side="right" delay="-5.6s" />
      </g>

    </g>
  );
}

/**
 * Right: the heavier white-and-tabby tom (~6.5 kg) — broad snowy chest,
 * dark cedar-and-indigo saddle and hip patches, a white blaze between
 * pale green-hazel eyes, golden whisker pads, a ringed tail over the corner.
 */
function TabbyCat() {
  return (
    <g transform="translate(598 470)">
      <g className="animate-breathe origin-bottom transform-fill" style={{ animationDelay: "-1.9s", animationDuration: "5.1s" }}>
        {/* Body: dense white fur, short dark locks along the saddle line */}
        <path d={TABBY_BACK_TUFTS} transform="translate(0 -1)" fill="var(--color-ember-gold)" fillOpacity={0.4} />
        <path d={TABBY_BACK_TUFTS} fill="url(#lr-tabby-patch)" />
        <path d={TABBY_SHOULDER_TUFTS} fill="var(--color-orchid-white)" />
        <g clipPath="url(#lr-clip-tabby)">
          <path d={TABBY_BODY} fill="url(#lr-cat-rim)" />
          <g transform="translate(2.5 5)">
            <path d={TABBY_BODY} fill="url(#lr-tabby-body)" />
            <path d={TABBY_BODY_STRANDS} fill="var(--color-linen-deep)" fillOpacity={0.7} />
            <ellipse cx={-72} cy={-30} rx={40} ry={34} fill="url(#lr-soft-lavender)" opacity={0.3} />
            {/* Dark tabby saddle and hip, feathering into the white */}
            <path d={TABBY_PATCH_EDGE} fill="url(#lr-tabby-patch)" />
            <path d={TABBY_SADDLE} fill="url(#lr-tabby-patch)" />
            <path d={TABBY_HIP} fill="url(#lr-tabby-patch)" />
            <g clipPath="url(#lr-clip-tabby-patches)">
              <ellipse cx={30} cy={-114} rx={66} ry={22} fill="url(#lr-soft-lavender)" />
              <path d={TABBY_PATCH_STRIPES} fill="var(--color-twilight-indigo)" fillOpacity={0.75} />
              <path d={TABBY_PATCH_STRANDS} fill="var(--color-bruised-lavender)" fillOpacity={0.35} />
            </g>
          </g>
          <ellipse cx={104} cy={-28} rx={30} ry={36} fill="url(#lr-soft-lavender)" opacity={0.45} />
          <rect x={-110} y={-24} width={224} height={24} fill="url(#lr-cat-contact)" />
        </g>

        {/* A deep white chest under the jowls */}
        <path d={TABBY_CHEST_TUFTS} fill="var(--color-orchid-white)" />
        <path d={TABBY_CHEST} fill="url(#lr-tabby-body)" />
        <path d={TABBY_CHEST_STRANDS} fill="var(--color-linen-deep)" fillOpacity={0.75} />

        {/* Dark ears with pale furnishings */}
        <path d={TABBY_EAR_L} fill="url(#lr-tabby-ear)" />
        <path d={TABBY_EAR_L_IN} fill="var(--color-petal-lilac)" fillOpacity={0.4} />
        <path d={TABBY_EAR_L_IN} fill="var(--color-hearth-terracotta)" fillOpacity={0.2} />
        <path d={TABBY_EAR_L_TUFTS} fill="var(--color-orchid-white)" fillOpacity={0.75} />
        <g className="animate-ear origin-bottom-left transform-fill" style={{ animationDelay: "-6.2s", animationDuration: "10s" }}>
          <path d={TABBY_EAR_R} fill="url(#lr-tabby-ear)" />
          <path d={TABBY_EAR_R_IN} fill="var(--color-petal-lilac)" fillOpacity={0.4} />
          <path d={TABBY_EAR_R_IN} fill="var(--color-hearth-terracotta)" fillOpacity={0.2} />
          <path d={TABBY_EAR_R_TUFTS} fill="var(--color-orchid-white)" fillOpacity={0.75} />
        </g>

        {/* Head: broad jowls, dark crown split by a clean white blaze */}
        <path d={TABBY_JOWL_TUFTS} fill="var(--color-orchid-white)" />
        <path d={TABBY_CROWN_TUFTS} transform="translate(0 -1.2)" fill="var(--color-ember-gold)" fillOpacity={0.55} />
        <path d={TABBY_CROWN_TUFTS} fill="url(#lr-tabby-patch)" />
        <g clipPath="url(#lr-clip-tabby-head)">
          <path d={TABBY_HEAD} fill="url(#lr-cat-rim)" />
          <g transform="translate(1.5 4)">
            <path d={TABBY_HEAD} fill="url(#lr-tabby-head)" />
            <path d={TABBY_CAP_EDGE} fill="var(--color-twilight-indigo)" />
            <path d={TABBY_CAP} fill="url(#lr-tabby-patch)" />
          </g>
          <ellipse cx={-30} cy={-108} rx={50} ry={18} fill="url(#lr-soft-lavender)" opacity={0.8} />
          <path d={TABBY_CAP_STRIPES} fill="var(--color-twilight-indigo)" fillOpacity={0.7} />
          <path d={TABBY_BLAZE} fill="var(--color-orchid-white)" />
          <ellipse cx={-62} cy={-42} rx={20} ry={16} fill="url(#lr-soft-white)" />
          <ellipse cx={2} cy={-42} rx={20} ry={16} fill="url(#lr-soft-white)" />
          <ellipse cx={-30} cy={-40} rx={22} ry={14} fill="url(#lr-soft-white)" />
          <ellipse cx={-30} cy={-26} rx={16} ry={9} fill="url(#lr-soft-white)" />
          <path d={TABBY_MASCARA} fill="var(--color-twilight-indigo)" fillOpacity={0.4} />
        </g>

        {/* A level, serious stare under low brows */}
        <path d={TABBY_BROW_GLINT} fill="var(--color-ember-gold)" fillOpacity={0.3} />
        <path d={TABBY_BROWS} fill="var(--color-twilight-indigo)" fillOpacity={0.75} />
        {TABBY_EYES.map((eye) => (
          <g key={eye.id}>
            <path d={eye.socket} fill="var(--color-twilight-indigo)" fillOpacity={0.35} />
            <g clipPath={`url(#${eye.id})`}>
              <path d={eye.d} fill="var(--color-alpine-sage)" />
              <circle cx={eye.cx} cy={eye.cy + 0.6} r={8.6} fill="url(#lr-tabby-iris)" />
              <circle cx={eye.cx} cy={eye.cy + 0.6} r={3.4} fill="url(#lr-tabby-hazel)" />
              <ellipse cx={eye.cx} cy={eye.cy + 0.6} rx={1.25} ry={5.6} fill="var(--color-twilight-indigo)" />
              <rect x={eye.cx - 12} y={eye.cy - 6} width={24} height={6} fill="url(#lr-lid-shadow)" />
              <path d={eye.lid} fill="var(--color-twilight-indigo)" fillOpacity={0.85} />
              <circle cx={eye.cx + 2.3} cy={eye.cy - 0.8} r={1.25} fill="var(--color-orchid-white)" />
              <circle cx={eye.cx - 2.4} cy={eye.cy + 2.8} r={0.6} fill="var(--color-orchid-white)" fillOpacity={0.6} />
            </g>
          </g>
        ))}

        {/* Golden whisker pads, freckled, framing a small terracotta nose */}
        <ellipse cx={-37.5} cy={-44.5} rx={9.5} ry={7} fill="url(#lr-tabby-pad)" />
        <ellipse cx={-22.5} cy={-44.5} rx={9.5} ry={7} fill="url(#lr-tabby-pad)" />
        {TABBY_FRECKLES.map(([cx, cy]) => (
          <circle key={`${cx}${cy}`} cx={cx} cy={cy} r={0.8} fill="var(--color-chalet-cedar)" fillOpacity={0.55} />
        ))}
        <path d={TABBY_NOSE} fill="var(--color-hearth-terracotta)" />
        <ellipse cx={-31.5} cy={-53.4} rx={1.6} ry={0.9} fill="var(--color-orchid-white)" fillOpacity={0.45} />
        <path d={TABBY_MOUTH} stroke="var(--color-chalet-cedar)" strokeOpacity={0.55} strokeWidth={1.1} fill="none" strokeLinecap="round" />
        <Whiskers d={TABBY_WHISKERS_L} side="left" delay="-4.1s" />
        <Whiskers d={TABBY_WHISKERS_R} side="right" delay="-0.8s" />
      </g>

      {/* Big tucked front paws */}
      {[-66, -28].map((cx) => (
        <g key={cx}>
          <ellipse cx={cx} cy={-1} rx={17} ry={4} fill="var(--color-ink)" fillOpacity={0.22} />
          <ellipse cx={cx} cy={-6} rx={17} ry={9} fill="var(--color-orchid-white)" />
          <ellipse cx={cx} cy={-2.5} rx={14} ry={4.5} fill="var(--color-linen-deep)" fillOpacity={0.85} />
        </g>
      ))}

      {/* Thick ringed tail over the top-right corner, hooking in clear of the controls; the tip sways */}
      <TailPart d={TABBY_TAIL_BASE} clip="lr-clip-tabby-tail-base" fill="url(#lr-tabby-patch)">
        <path d={TABBY_RINGS_BASE_SOFT} fill="var(--color-twilight-indigo)" fillOpacity={0.35} />
        <path d={TABBY_RINGS_BASE_D} fill="var(--color-twilight-indigo)" fillOpacity={0.85} />
      </TailPart>
      <g className="animate-tail origin-center transform-fill" style={{ "--sway": "-3.5deg", animationDuration: "6.1s" } as CSSProperties}>
        <Pivot at={TABBY_TAIL[TAIL_JOINT]} />
        <TailPart d={TABBY_TAIL_TIP} clip="lr-clip-tabby-tail-tip" fill="url(#lr-tabby-patch)">
          <path d={TABBY_RINGS_TIP_SOFT} fill="var(--color-twilight-indigo)" fillOpacity={0.35} />
          <path d={TABBY_RINGS_TIP_D} fill="var(--color-twilight-indigo)" fillOpacity={0.85} />
        </TailPart>
      </g>
    </g>
  );
}

/** The whole interior, drawn once: one SVG the camera glides through. */
function RoomArt() {
  return (
    <svg viewBox="0 0 1000 1000" className="absolute inset-0 size-full overflow-visible" aria-hidden>
      <RoomDefs />

      {/* Gable wall, then the steep ceiling, rafters and tie beam */}
      <rect x={-1400} y={-1300} width={3800} height={1860} fill="url(#lr-boards)" />
      <path d={CEILING} fill="var(--color-chalet-cedar)" />
      <path d={CEILING} fill="var(--color-ink)" fillOpacity={0.5} />
      <g clipPath="url(#lr-clip-ceiling)">
        <path d={CEILING_PLANKS} stroke="var(--color-ink)" strokeOpacity={0.35} strokeWidth={2} fill="none" />
        <path d={PURLINS.join("")} fill="var(--color-chalet-cedar)" stroke="var(--color-ember-gold)" strokeOpacity={0.2} strokeWidth={2} />
      </g>
      <path d="M500 -792L-1180 48V98L500 -742Z M500 -792L2180 48V98L500 -742Z" fill="var(--color-chalet-cedar)" />
      <path d="M500 -792L-1180 48M500 -792L2180 48" stroke="var(--color-dusk-amber)" strokeOpacity={0.3} strokeWidth={2} fill="none" />
      <path d="M500 -742L-1180 98M500 -742L2180 98" stroke="var(--color-ink)" strokeOpacity={0.4} strokeWidth={3} fill="none" />
      <rect x={-1400} y={36} width={3800} height={48} fill="var(--color-chalet-cedar)" />
      <rect x={-1400} y={36} width={3800} height={48} fill="var(--color-ink)" fillOpacity={0.32} />
      <path d="M-1400 37.5H2400" stroke="var(--color-dusk-amber)" strokeOpacity={0.45} strokeWidth={2.5} />
      <rect x={-1400} y={84} width={3800} height={22} fill="url(#lr-beam-shadow)" />

      {/* Dried lavender hung from the beam */}
      {[140, 860].map((x) => (
        <g key={x}>
          <path d={`M${x} 84V122`} stroke="var(--color-linen-deep)" strokeOpacity={0.7} strokeWidth={1.5} />
          <path d={`M${x} 124L${x - 14} 196M${x} 124L${x - 5} 204M${x} 124L${x + 5} 204M${x} 124L${x + 14} 196`} stroke="var(--color-alpine-sage)" strokeWidth={2} strokeLinecap="round" />
          {[-14, -5, 5, 14].map((dx, i) => (
            <ellipse key={dx} cx={x + dx * 1.05} cy={i === 0 || i === 3 ? 204 : 212} rx={4.5} ry={11} fill={i % 2 ? "var(--color-petal-lilac)" : "var(--color-bruised-lavender)"} />
          ))}
          <rect x={x - 7} y={118} width={14} height={8} rx={3} fill="var(--color-dusk-amber)" />
        </g>
      ))}

      {/* Firelight warming the boards; side windows onto the dusk */}
      <rect x={-1400} y={-1300} width={3800} height={1860} fill="url(#lr-wall-glow)" />
      <SideWindow x={-400} />
      <SideWindow x={1190} />
      <rect x={-1400} y={468} width={3800} height={12} fill="var(--color-chalet-cedar)" />
      <rect x={-1400} y={474} width={3800} height={6} fill="var(--color-ink)" fillOpacity={0.25} />
      <path d="M-1400 469H2400" stroke="var(--color-ember-gold)" strokeOpacity={0.25} strokeWidth={1.5} />

      {/* Floor */}
      <rect x={-1400} y={560} width={3800} height={1100} fill="url(#lr-floor)" />
      <path d={FLOOR_PLANKS} stroke="var(--color-ink)" strokeOpacity={0.3} strokeWidth={2} fill="none" />
      <rect x={-1400} y={560} width={3800} height={70} fill="url(#lr-floor-seam)" />
      <g className="animate-flicker">
        <ellipse cx={500} cy={610} rx={580} ry={130} fill="url(#lr-pool)" />
      </g>
      <rect x={-1400} y={544} width={3800} height={16} fill="var(--color-chalet-cedar)" />
      <rect x={-1400} y={552} width={3800} height={8} fill="var(--color-ink)" fillOpacity={0.35} />

      <FloorLamp x={-110} />
      <FloorLamp x={1110} />
      <Hearth />
      <Armchair x={48} throwBlanket />
      <Armchair x={952} flip />
      <Rug />
      <TvCabinet />
      {/* Hearth glow haloing the sleepers from behind */}
      <ellipse cx={500} cy={420} rx={270} ry={92} fill="url(#lr-pool)" className="animate-flicker" />
      <TabbyCat />
      <CreamCat />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Outside: the eave, the wall, the window
   ═══════════════════════════════════════════════════════════════════ */

/** Walking up to the chalet: the garden's linen dims to dusk under the roofline. */
function ChaletEave() {
  return (
    <div aria-hidden className="pointer-events-none relative h-[40svh] overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-b from-linen via-petal-lilac/80 via-35% to-twilight-indigo" />
      {/* Picks up the garden's low honey glow and linen tooth, so the seam disappears */}
      <div className="absolute -top-48 left-1/2 h-72 w-[min(48rem,120vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-ember-gold)_30%,transparent),transparent)] blur-2xl" />
      <div className="paper-grain absolute inset-0 opacity-20 mix-blend-multiply" />
      {EAVE_STARS.map((s) => (
        <span
          key={s.id}
          className="absolute animate-twinkle rounded-full bg-orchid-white"
          style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `-${s.delay}s` }}
        />
      ))}
      <svg
        viewBox="0 0 1440 140"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-x-0 bottom-0 h-[clamp(4.5rem,10vw,7.5rem)] w-full"
      >
        <rect x={0} y={18} width={1440} height={40} fill="var(--color-ink)" />
        <path d="M0 19H1440" stroke="var(--color-dusk-amber)" strokeOpacity={0.6} strokeWidth={2} />
        <rect x={0} y={58} width={1440} height={40} fill="var(--color-chalet-cedar)" />
        <rect x={0} y={58} width={1440} height={40} fill="var(--color-ink)" fillOpacity={0.35} />
        {Array.from({ length: 16 }, (_, i) => (
          <rect key={i} x={30 + i * 92} y={58} width={22} height={44} rx={4} fill="var(--color-chalet-cedar)" />
        ))}
        <path
          d={`M0 96H1440V112${Array.from({ length: 30 }, (_, i) => `Q${1440 - i * 48 - 24} 128 ${1440 - (i + 1) * 48} 112`).join("")}Z`}
          fill="var(--color-chalet-cedar)"
        />
        <path d="M0 97H1440" stroke="var(--color-ember-gold)" strokeOpacity={0.35} strokeWidth={1.5} />
        {Array.from({ length: 30 }, (_, i) => (
          <circle
            key={i}
            cx={1440 - i * 48 - 24}
            cy={111}
            r={2.6}
            fill={i % 2 ? "var(--color-petal-lilac)" : "var(--color-orchid-white)"}
            fillOpacity={0.8}
          />
        ))}
        <path
          d={`M0 140V112${Array.from({ length: 30 }, (_, i) => `Q${i * 48 + 24} 128 ${(i + 1) * 48} 112`).join("")}V140Z`}
          fill="var(--color-twilight-indigo)"
        />
      </svg>
    </div>
  );
}

function Shutter({ x, hinge }: Readonly<{ x: number; hinge: number }>) {
  return (
    <g transform={`translate(${x} 0)`}>
      <rect x={0} y={-16} width={160} height={532} rx={6} fill="var(--color-velvet-plum)" />
      <rect x={12} y={-4} width={136} height={508} rx={4} fill="none" stroke="var(--color-ink)" strokeOpacity={0.35} strokeWidth={2} />
      <path
        d={Array.from({ length: 21 }, (_, i) => `M16 ${124 + i * 18}H144`).join("")}
        stroke="var(--color-ink)"
        strokeOpacity={0.32}
        strokeWidth={2.5}
      />
      <path
        d={Array.from({ length: 21 }, (_, i) => `M16 ${126.5 + i * 18}H144`).join("")}
        stroke="var(--color-petal-lilac)"
        strokeOpacity={0.14}
        strokeWidth={1.2}
      />
      <path d="M80 70C60 56 58 40 70 36C76 34 80 38 80 42C80 38 84 34 90 36C102 40 100 56 80 70Z" fill="var(--color-ink)" fillOpacity={0.85} />
      <path d="M80 70C60 56 58 40 70 36" fill="none" stroke="var(--color-ember-gold)" strokeOpacity={0.3} strokeWidth={1.5} />
      <path d={`M${hinge} 34V18M${hinge} 482V466`} stroke="var(--color-ink)" strokeOpacity={0.8} strokeWidth={7} strokeLinecap="round" />
    </g>
  );
}

/** The wall around the window: siding, casing, painted lintel, shutters, flower box. */
function ChaletWall() {
  return (
    <svg viewBox="0 0 410 500" className="absolute inset-0 size-full overflow-visible" aria-hidden>
      <defs>
        <pattern id="lr-siding" width="300" height="36" patternUnits="userSpaceOnUse">
          <rect width="300" height="36" fill="var(--color-chalet-cedar)" />
          <rect width="300" height="6" fill="var(--color-orchid-white)" fillOpacity={0.05} />
          <path d="M0 35H300" stroke="var(--color-ink)" strokeOpacity={0.5} strokeWidth={2} />
          <path d="M118 0V34" stroke="var(--color-ink)" strokeOpacity={0.22} strokeWidth={1.5} />
        </pattern>
        <radialGradient id="lr-ex-shade" gradientUnits="userSpaceOnUse" cx="205" cy="270" r="1100">
          <Stop offset="0%" color="ember-gold" opacity={0.5} />
          <Stop offset="22%" color="dusk-amber" opacity={0.16} />
          <Stop offset="50%" color="twilight-indigo" opacity={0.4} />
          <Stop offset="100%" color="twilight-indigo" opacity={0.85} />
        </radialGradient>
        <radialGradient id="lr-frost">
          <Stop offset="0%" color="orchid-white" opacity={0.85} />
          <Stop offset="50%" color="petal-lilac" opacity={0.35} />
          <Stop offset="100%" color="orchid-white" opacity={0} />
        </radialGradient>
      </defs>

      <path d={WALL_WITH_HOLE} fillRule="evenodd" fill="url(#lr-siding)" />
      <path d={WALL_WITH_HOLE} fillRule="evenodd" fill="url(#lr-ex-shade)" />

      <Shutter x={-212} hinge={160} />
      <Shutter x={462} hinge={0} />

      {/* Casing */}
      <path d="M-30 -30H440V530H-30Z M0 0V500H410V0Z" fillRule="evenodd" fill="var(--color-chalet-cedar)" />
      <path d="M-30 -30H440V530H-30Z M0 0V500H410V0Z" fillRule="evenodd" fill="var(--color-ember-gold)" fillOpacity={0.1} />
      <rect x={0} y={0} width={410} height={500} fill="none" stroke="var(--color-ink)" strokeOpacity={0.6} strokeWidth={3} />
      <rect x={-30} y={-30} width={470} height={560} fill="none" stroke="var(--color-dusk-amber)" strokeOpacity={0.3} strokeWidth={1.5} />

      {/* Painted lintel */}
      <path d={LINTEL} fill="var(--color-chalet-cedar)" stroke="var(--color-ink)" strokeOpacity={0.4} strokeWidth={1.5} />
      <path d="M-64 -84.5H474" stroke="var(--color-dusk-amber)" strokeOpacity={0.55} strokeWidth={2} />
      {Array.from({ length: 15 }, (_, i) => (
        <circle key={i} cx={-44 + i * 36} cy={-64} r={3.4} fill={i % 2 ? "var(--color-petal-lilac)" : "var(--color-orchid-white)"} fillOpacity={0.85} />
      ))}
      <g transform="translate(205 -64)">
        {Array.from({ length: 8 }, (_, i) => (
          <ellipse key={i} rx={3.5} ry={9} transform={`rotate(${i * 45}) translate(0 -8)`} fill="var(--color-orchid-white)" />
        ))}
        <circle r={4.5} fill="var(--color-dusk-amber)" />
      </g>

      {/* Sill and flower box */}
      <rect x={-62} y={528} width={534} height={22} rx={4} fill="var(--color-chalet-cedar)" />
      <path d="M-60 529.5H470" stroke="var(--color-ember-gold)" strokeOpacity={0.5} strokeWidth={2} />
      <rect x={-62} y={546} width={534} height={6} fill="var(--color-ink)" fillOpacity={0.35} />
      {BOX_LEAVES.map((l) => (
        <ellipse key={l.id} cx={l.cx} cy={l.cy} rx={13} ry={5} transform={`rotate(${l.angle} ${l.cx} ${l.cy})`} fill="var(--color-alpine-sage)" />
      ))}
      {BOX_BLOOMS.map((b) => (
        <circle
          key={b.id}
          cx={b.cx}
          cy={b.cy}
          r={b.r}
          fill={
            b.tone < 0.45
              ? "var(--color-petal-lilac)"
              : b.tone < 0.8
                ? "var(--color-orchid-white)"
                : "var(--color-bruised-lavender)"
          }
        />
      ))}
      <rect x={-40} y={552} width={490} height={70} rx={10} fill="var(--color-hearth-terracotta)" />
      <rect x={-40} y={552} width={490} height={70} rx={10} fill="url(#lr-depth-ex)" />
      <rect x={-46} y={548} width={502} height={10} rx={4} fill="var(--color-chalet-cedar)" />
      <path
        d={Array.from({ length: 12 }, (_, i) => {
          const cx = -14 + i * 40;
          return `M${cx} 576L${cx + 9} 587L${cx} 598L${cx - 9} 587Z`;
        }).join("")}
        fill="var(--color-velvet-plum)"
        fillOpacity={0.4}
      />
      <path d="M14 556C8 576 20 594 10 612M120 556C128 574 116 590 124 604M300 556C294 572 306 588 298 606M396 556C404 576 392 592 400 610" stroke="var(--color-alpine-sage)" strokeWidth={3} fill="none" strokeLinecap="round" />
      <defs>
        <linearGradient id="lr-depth-ex" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" color="ink" opacity={0} />
          <Stop offset="100%" color="ink" opacity={0.35} />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** One casement sash: three frosted panes in a cedar frame. */
function Sash({ side }: Readonly<{ side: "left" | "right" }>) {
  const left = side === "left";
  return (
    <svg
      viewBox="0 0 205 500"
      preserveAspectRatio="none"
      className="absolute inset-0 size-full"
      style={left ? undefined : { transform: "scaleX(-1)" }}
      aria-hidden
    >
      <rect x={14} y={14} width={177} height={472} fill="var(--color-petal-lilac)" fillOpacity={0.14} />
      {SASH_PANES.map(([top, bottom]) => (
        <g key={top}>
          <ellipse cx={14} cy={bottom} rx={80} ry={58} fill="url(#lr-frost)" />
          <ellipse cx={191} cy={bottom} rx={66} ry={46} fill="url(#lr-frost)" />
          <ellipse cx={14} cy={top} rx={46} ry={34} fill="url(#lr-frost)" opacity={0.7} />
        </g>
      ))}
      <path d={SASH_GLINTS} fill="var(--color-orchid-white)" fillOpacity={0.75} />
      <path d="M40 14H92L22 210H14V96Z" fill="var(--color-orchid-white)" fillOpacity={0.1} />
      <path d="M0 0H205V500H0Z M14 14V486H191V14Z" fillRule="evenodd" fill="var(--color-chalet-cedar)" />
      <rect x={14} y={160} width={177} height={10} fill="var(--color-chalet-cedar)" />
      <rect x={14} y={320} width={177} height={10} fill="var(--color-chalet-cedar)" />
      <path d="M1 1.5H204M14 161.5H191M14 321.5H191" stroke="var(--color-dusk-amber)" strokeOpacity={0.35} strokeWidth={2} />
      <rect x={14} y={14} width={177} height={472} fill="none" stroke="var(--color-ink)" strokeOpacity={0.35} strokeWidth={2} />
      <rect x={189} y={232} width={8} height={36} rx={4} fill="var(--color-dusk-amber)" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   The CRT: test card, glass, controls
   ═══════════════════════════════════════════════════════════════════ */

const CARD_BARS = [
  "orchid-white",
  "ember-gold",
  "dusk-amber",
  "hearth-terracotta",
  "velvet-plum",
  "bruised-lavender",
  "petal-lilac",
  "alpine-sage",
] as const;
const CARD_WEDGE = ["twilight-indigo", "bruised-lavender", "petal-lilac", "linen-deep", "orchid-white"] as const;
const CARD_GRID = [
  ...Array.from({ length: 9 }, (_, i) => `M${40 + i * 40} 0V388`),
  ...Array.from({ length: 9 }, (_, i) => `M0 ${34 + i * 40}H400`),
].join("");

/** A retro Swiss broadcast test card, for a tape that hasn't arrived yet. */
function TestCard({ channel, title }: Readonly<{ channel: number; title: string }>) {
  return (
    <svg viewBox="0 0 400 388" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <clipPath id="lr-card-disc">
          <circle cx={200} cy={186} r={146} />
        </clipPath>
      </defs>
      <rect width={400} height={388} fill="var(--color-twilight-indigo)" />
      <path d={CARD_GRID} stroke="var(--color-bruised-lavender)" strokeOpacity={0.22} strokeWidth={1} fill="none" />
      <path d="M34 58V34H58M366 58V34H342M34 330V354H58M366 330V354H342" stroke="var(--color-orchid-white)" strokeOpacity={0.45} strokeWidth={3} fill="none" strokeLinecap="round" />
      <circle cx={200} cy={186} r={150} fill="var(--color-ink)" fillOpacity={0.35} stroke="var(--color-orchid-white)" strokeOpacity={0.6} strokeWidth={2.5} />
      <g clipPath="url(#lr-card-disc)">
        {CARD_BARS.map((c, i) => (
          <rect key={c} x={54 + i * 36.5} y={40} width={36.5} height={66} fill={`var(--color-${c})`} />
        ))}
        <rect x={40} y={106} width={320} height={110} fill="var(--color-velvet-plum)" fillOpacity={0.55} />
        <path d="M40 216L110 168L150 190L200 138L252 186L292 166L360 216Z" fill="var(--color-bruised-lavender)" fillOpacity={0.7} />
        <path d="M200 138L184 154L192 152L200 158L208 152L216 154Z" fill="var(--color-orchid-white)" />
        <path d="M110 168L100 176L106 175L112 179L120 175Z" fill="var(--color-orchid-white)" fillOpacity={0.8} />
        <rect x={40} y={216} width={320} height={130} fill="var(--color-ink)" fillOpacity={0.4} />
        {CARD_WEDGE.map((c, i) => (
          <rect key={c} x={110 + i * 36} y={298} width={36} height={30} fill={`var(--color-${c})`} />
        ))}
      </g>
      <rect x={178} y={160} width={44} height={44} rx={9} fill="var(--color-hearth-terracotta)" stroke="var(--color-orchid-white)" strokeOpacity={0.8} strokeWidth={2} />
      <path d="M195 167H205V177H215V187H205V197H195V187H185V177H195Z" fill="var(--color-orchid-white)" />
      <text x={200} y={250} textAnchor="middle" className="font-mono" fontSize={30} letterSpacing={4} fill="var(--color-ember-gold)">
        CH {pad2(channel + 1)}
      </text>
      <text
        x={200}
        y={284}
        textAnchor="middle"
        className="font-serif"
        fontSize={25}
        fontStyle="italic"
        fill="var(--color-linen)"
        style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 36' }}
      >
        {title}
      </text>
      <text x={200} y={366} textAnchor="middle" className="font-mono" fontSize={16} letterSpacing={3} fill="var(--color-petal-lilac)">
        TAPE ON ITS WAY
      </text>
    </svg>
  );
}

function ChannelButton({
  dir,
  rect,
  reduce,
  onPress,
}: Readonly<{ dir: 1 | -1; rect: Rect; reduce: boolean; onPress: () => void }>) {
  return (
    <motion.button
      type="button"
      onClick={onPress}
      aria-label={dir > 0 ? "Channel up" : "Channel down"}
      whileTap={reduce ? undefined : { scale: 0.95 }}
      transition={SPRING_TACTILE}
      className="absolute flex cursor-pointer items-center justify-center gap-[0.5cqw] rounded-[1.2cqw] border border-chalet-cedar/40 bg-linear-to-b from-orchid-white to-linen-deep font-mono text-[1.45cqw] font-medium tracking-[0.08em] text-velvet-plum shadow-[0_0.45cqw_0_var(--color-chalet-cedar)] transition-[translate,box-shadow,background-color] hover:to-petal-lilac/70 focus-visible:outline-[length:0.35cqw] focus-visible:outline-offset-[0.25cqw] focus-visible:outline-dusk-amber active:translate-y-[0.35cqw] active:shadow-[0_0.1cqw_0_var(--color-chalet-cedar)]"
      style={place(rect)}
    >
      <span aria-hidden>CH</span>
      <svg viewBox="0 0 10 9" className="h-[1.1cqw] w-[1.2cqw]" aria-hidden>
        <path
          d={dir > 0 ? "M5 1L9 8H1Z" : "M5 8L9 1H1Z"}
          fill="currentColor"
          stroke="currentColor"
          strokeWidth={1}
          strokeLinejoin="round"
        />
      </svg>
    </motion.button>
  );
}

type TvCallbacks = {
  onVideoPlay?: () => void;
  onVideoPause?: () => void;
  onVideoEnded?: () => void;
};

type CrtTvProps = TvCallbacks & {
  /** Mount the <video> once the room is near, so tapes don't load at the porch. */
  armed: boolean;
  /** The stage is on screen; when it leaves, the tape pauses. */
  visible: boolean;
  /** ← / → flip channels while she's watching. */
  keysLive: boolean;
  reduce: boolean;
};

/**
 * The live parts of the TV — glass, LED and channel buttons — laid over the
 * illustrated cabinet. Keyed by the story's reset key, so a rewind returns
 * it to CH 01 with the tape stopped.
 */
function CrtTv({ armed, visible, keysLive, reduce, onVideoPlay, onVideoPause, onVideoEnded }: Readonly<CrtTvProps>) {
  const videoRef = useRef<HTMLVideoElement>(null);
  /** She wants the set on: survives channel flips, so the next tape rolls by itself. */
  const wantsPlay = useRef(false);

  const [channel, setChannel] = useState(0);
  const [missing, setMissing] = useState<ReadonlySet<number>>(() => new Set());
  const [loaded, setLoaded] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [flips, setFlips] = useState(0);

  const show = TV_CHANNELS[channel];
  const isMissing = missing.has(channel);
  const hasFrame = loaded === channel;

  const flip = (dir: 1 | -1) => {
    setChannel((c) => (c + dir + CHANNEL_COUNT) % CHANNEL_COUNT);
    setFlips((n) => n + 1);
    setLoaded(null);
    setPlaying(false);
    setProgress(0);
  };

  const startPlayback = () => {
    videoRef.current?.play().catch((err: unknown) => {
      // A flip mid-load aborts the old request; the next tape will pick up from here.
      if (err instanceof DOMException && err.name === "AbortError") return;
      wantsPlay.current = false;
      setPlaying(false);
      onVideoPause?.();
    });
  };

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      wantsPlay.current = true;
      startPlayback();
    } else {
      video.pause();
    }
  };

  // Scrolling away from the room puts the tape on pause (and hands the music back).
  useEffect(() => {
    if (!visible) videoRef.current?.pause();
  }, [visible]);

  const onArrowKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const target = e.target;
    if (target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select"))) return;
    e.preventDefault();
    flip(e.key === "ArrowRight" ? 1 : -1);
  });

  useEffect(() => {
    if (!keysLive) return;
    const handler = (e: KeyboardEvent) => onArrowKey(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [keysLive]);

  let status = "Tap the screen to play.";
  if (isMissing) status = "This tape is still on its way.";
  else if (playing) status = "Playing.";

  return (
    <>
      <div className="absolute isolate overflow-hidden bg-ink" style={GLASS_STYLE}>
        {/* Snow while the set tunes in */}
        {!isMissing && !hasFrame && <div aria-hidden className="crt-snow absolute inset-0 opacity-35" />}

        {armed && (
          <video
            ref={videoRef}
            src={show.src}
            preload="metadata"
            playsInline
            aria-label={`Channel ${pad2(channel + 1)}: ${show.title}`}
            className={`absolute inset-0 size-full scale-[1.03] object-contain transition-opacity duration-300 ${isMissing ? "opacity-0" : "opacity-100"}`}
            onLoadedData={() => {
              setLoaded(channel);
              if (wantsPlay.current) startPlayback();
            }}
            onError={() => {
              setMissing((prev) => (prev.has(channel) ? prev : new Set(prev).add(channel)));
              setPlaying(false);
              // The set stays on for the next channel; meanwhile the record fills the silence.
              if (wantsPlay.current) onVideoPause?.();
            }}
            onPlay={() => {
              wantsPlay.current = true;
              setPlaying(true);
              onVideoPlay?.();
            }}
            onPause={() => {
              wantsPlay.current = false;
              setPlaying(false);
              onVideoPause?.();
            }}
            onEnded={() => {
              wantsPlay.current = false;
              setPlaying(false);
              onVideoEnded?.();
            }}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              setProgress(v.duration > 0 ? v.currentTime / v.duration : 0);
            }}
          />
        )}

        {isMissing && <TestCard channel={channel} title={show.title} />}

        {/* Quarter-second static between channels */}
        {flips > 0 && (
          <motion.div
            key={flips}
            aria-hidden
            className={`crt-snow pointer-events-none absolute inset-0 ${reduce ? "" : "animate-snow"}`}
            initial={{ opacity: reduce ? 0.45 : 0.95 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeIn" }}
          />
        )}

        {/* Fisheye glass: barrel-bent scanlines, a deep curved vignette, convex glare */}
        <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
          <path d={CRT_SCANLINES} stroke="var(--color-ink)" strokeOpacity={0.42} strokeWidth={1} fill="none" vectorEffect="non-scaling-stroke" />
        </svg>
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_46%,color-mix(in_oklab,var(--color-orchid-white)_7%,transparent),transparent_55%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_48%,transparent_44%,color-mix(in_oklab,var(--color-ink)_40%,transparent)_74%,color-mix(in_oklab,var(--color-ink)_85%,transparent)_100%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_30%_14%,color-mix(in_oklab,var(--color-orchid-white)_26%,transparent),transparent_70%)]" />
        <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
          <path d="M12 12Q28 3 52 4Q30 6 14 15Z" fill="var(--color-orchid-white)" fillOpacity={0.3} />
          <path d="M72 94Q86 92 92 82Q90 90 74 96Z" fill="var(--color-orchid-white)" fillOpacity={0.1} />
        </svg>

        {/* On-screen display, tucked into the top-left of the glass */}
        {!isMissing && (
          <motion.div
            key={`${flips}-${playing}`}
            aria-hidden
            className="pointer-events-none absolute top-[10%] left-[11%] max-w-[64%]"
            initial={{ opacity: 1 }}
            animate={{ opacity: playing ? 0 : 1 }}
            transition={{ delay: playing ? 1.6 : 0, duration: 0.5 }}
          >
            <p className="font-mono text-[1.5cqw] leading-none tracking-[0.14em] text-ember-gold tabular-nums" style={{ textShadow: LED_GLOW }}>
              CH {pad2(channel + 1)}
              <span className="text-ember-gold/55"> / {pad2(CHANNEL_COUNT)}</span>
            </p>
            <p
              className="mt-[0.6cqw] font-serif text-[2cqw] leading-none text-linen italic"
              style={{ textShadow: OSD_GLOW, fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 36' }}
            >
              {show.title}
            </p>
            <p className="mt-[0.6cqw] font-mono text-[1.05cqw] leading-none tracking-[0.2em] text-linen/60 uppercase">
              Eight Days to the 8th
            </p>
          </motion.div>
        )}
        {!isMissing && progress > 0 && (
          <div aria-hidden className="pointer-events-none absolute inset-x-[12%] bottom-[7%] h-[0.3cqw] overflow-hidden rounded-full bg-orchid-white/15">
            <div className="h-full rounded-full bg-dusk-amber" style={{ width: `${progress * 100}%` }} />
          </div>
        )}

        {armed && !isMissing && (
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? `Pause ${show.title}` : `Play ${show.title}`}
            className="group absolute inset-0 grid cursor-pointer place-items-center focus-visible:outline-none"
          >
            {playing ? (
              <span className="grid size-[6cqw] place-items-center rounded-full bg-linen/70 text-velvet-plum opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 group-focus-visible:ring-[length:0.4cqw] group-focus-visible:ring-dusk-amber">
                <Pause className="size-[2.4cqw] fill-current" aria-hidden />
              </span>
            ) : (
              <motion.span
                key="play"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={SPRING_TACTILE}
                className="grid size-[6cqw] place-items-center rounded-full bg-linen/85 text-velvet-plum shadow-lg shadow-ink/40 transition-colors group-hover:bg-orchid-white group-focus-visible:ring-[length:0.4cqw] group-focus-visible:ring-dusk-amber"
              >
                <Play className="ml-[0.4cqw] size-[2.6cqw] fill-current" aria-hidden />
              </motion.span>
            )}
          </button>
        )}
      </div>

      {/* LED channel readout, with the ghost segments behind */}
      <div aria-hidden className="pointer-events-none absolute grid place-items-center font-mono text-[2.5cqw] leading-none tabular-nums" style={place(LED)}>
        <span className="col-start-1 row-start-1 text-dusk-amber/12">88</span>
        <motion.span
          key={channel}
          className="col-start-1 row-start-1 text-dusk-amber"
          style={{ textShadow: LED_GLOW }}
          initial={reduce ? false : { opacity: 0.2 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18 }}
        >
          {pad2(channel + 1)}
        </motion.span>
      </div>

      <ChannelButton dir={1} rect={CH_UP} reduce={reduce} onPress={() => flip(1)} />
      <ChannelButton dir={-1} rect={CH_DOWN} reduce={reduce} onPress={() => flip(-1)} />

      <p className="sr-only" aria-live="polite">
        {`Channel ${channel + 1} of ${CHANNEL_COUNT}: ${show.title}. ${status}`}
      </p>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Section 3 — the living room
   ═══════════════════════════════════════════════════════════════════ */

type LivingRoomSceneProps = TvCallbacks & {
  /** Bumped by the story-wide rewind: the TV returns to CH 01, tape stopped. */
  resetKey?: number;
};

export default function LivingRoomScene({
  resetKey = 0,
  onVideoPlay,
  onVideoPause,
  onVideoEnded,
}: Readonly<LivingRoomSceneProps>) {
  const reduce = usePrefersReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [keysLive, setKeysLive] = useState(false);

  const { scrollYProgress: p } = useScroll({ target: trackRef, offset: ["start start", "end end"] });

  // Stage 1 — the window swings open, swells past the edges and fades.
  const windowScale = useTransform(p, [0, BEAT.window], [1, 2.6]);
  const windowOpacity = useTransform(p, [0.1, BEAT.window - 0.02], [1, 0]);
  const sashLeft = useTransform(p, [0.02, 0.26], [0, -78]);
  const sashRight = useTransform(p, [0.02, 0.26], [0, 78]);
  const introOpacity = useTransform(p, [0, 0.12], [1, 0]);
  const introY = useTransform(p, [0, 0.12], [0, -28]);

  // Stage 2 — a slow push in on the TV, then a steady hold.
  const cameraScale = useTransform(p, [0, BEAT.window, BEAT.zoom], [0.7, CAMERA.far, CAMERA.near]);
  const cameraY = useTransform(p, [0, BEAT.window, BEAT.zoom], ["3%", "3%", TV_CENTRED]);
  const moteOpacity = useTransform(p, [0.16, 0.42], [0, 1]);
  const hintOpacity = useTransform(p, [0.66, 0.82], [0, 1]);
  // The dusk floor steps aside for the close-up (so nothing under the bezel is veiled),
  // then returns for the last stretch to melt the stage into the closing note.
  const floorOpacity = useTransform(p, [0.45, 0.6, 0.92, 1], [1, 0.15, 0.15, 1]);

  useMotionValueEvent(p, "change", (v) => setKeysLive(v >= 0.6));

  const armed = useInView(trackRef, { once: true, margin: "0px 0px 60% 0px" });
  const stageVisible = useInView(stageRef, { amount: 0.35 });

  const camera = reduce
    ? { scale: CAMERA.near, y: TV_CENTRED }
    : { scale: cameraScale, y: cameraY };

  return (
    <section id="living-room" aria-labelledby="living-room-heading" className="relative">
      <ChaletEave />

      <div ref={trackRef} className="relative h-[300vh]">
        <div ref={stageRef} className="sticky top-0 h-svh w-full overflow-hidden bg-twilight-indigo" style={STAGE_VARS}>
          {/* ── The room, under the camera ─────────────────────────── */}
          <motion.div
            className="absolute @container"
            style={{
              width: "var(--room)",
              height: "var(--room)",
              left: "calc(50% - var(--room) / 2)",
              top: "calc(50% - var(--room) / 2 + var(--lift))",
              originX: 0.5,
              originY: TV_FOCUS_Y,
              ...camera,
            }}
          >
            <RoomArt />
            <CrtTv
              key={resetKey}
              armed={armed}
              visible={stageVisible}
              keysLive={keysLive && stageVisible}
              reduce={reduce}
              onVideoPlay={onVideoPlay}
              onVideoPause={onVideoPause}
              onVideoEnded={onVideoEnded}
            />
            {/* Control hint, engraved on the nameplate beneath the bezel */}
            <motion.p
              aria-hidden
              className="pointer-events-none absolute flex items-center justify-center font-sans text-[max(1.05cqw,6px)] leading-none font-medium whitespace-nowrap text-linen/80"
              style={{ ...place(PLAQUE), opacity: hintOpacity }}
            >
              {/* The long version only where there's a keyboard and the plaque is wide enough */}
              <span className="@2xl:pointer-fine:hidden">Tap to play · CH ▲▼ to flip</span>
              <span className="hidden @2xl:pointer-fine:inline">
                Tap the glass to play · CH ▲▼ to flip · <span className="text-ember-gold">← →</span>
              </span>
            </motion.p>
          </motion.div>

          {/* Golden dust in the firelight */}
          <motion.div aria-hidden style={{ opacity: moteOpacity }} className="pointer-events-none absolute inset-0">
            {MOTES.map((m) => (
              <span
                key={m.id}
                className="absolute animate-mote rounded-full bg-ember-gold shadow-[0_0_10px_2px] shadow-ember-gold/60"
                style={
                  {
                    left: `${m.left}%`,
                    top: `${m.top}%`,
                    width: m.size,
                    height: m.size,
                    "--mx": m.mx,
                    "--my": m.my,
                    animationDuration: `${m.duration}s`,
                    animationDelay: `-${m.delay}s`,
                  } as CSSProperties
                }
              />
            ))}
          </motion.div>

          {/* Soft corners and a dusk floor that melts into the closing note */}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,transparent_52%,color-mix(in_oklab,var(--color-twilight-indigo)_70%,transparent)_100%)]" />
          <motion.div
            aria-hidden
            style={{ opacity: floorOpacity }}
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[20%] bg-linear-to-b from-transparent to-twilight-indigo"
          />

          {/* ── Outside, looking in ───────────────────────────────── */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={
              reduce
                ? { opacity: windowOpacity }
                : { opacity: windowOpacity, scale: windowScale, originX: 0.5, originY: 0.42 }
            }
          >
            <div
              className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ width: "var(--win-w)", height: "var(--win-h)", perspective: "900px" }}
            >
              <ChaletWall />
              <motion.div className="absolute inset-y-0 left-0 w-1/2" style={reduce ? undefined : { rotateY: sashLeft, originX: 0 }}>
                <Sash side="left" />
              </motion.div>
              <motion.div className="absolute inset-y-0 right-0 w-1/2" style={reduce ? undefined : { rotateY: sashRight, originX: 1 }}>
                <Sash side="right" />
              </motion.div>
            </div>
            <div className="absolute inset-x-0 top-0 h-[18%] bg-linear-to-b from-twilight-indigo to-transparent" />
          </motion.div>

          <motion.div
            className="pointer-events-none absolute inset-x-0 px-16 text-center"
            style={{
              top: "calc(42% + var(--win-h) * 0.76 + 0.75rem)",
              opacity: introOpacity,
              y: reduce ? 0 : introY,
            }}
          >
            <p className="font-mono text-[0.64rem] tracking-[0.32em] text-ember-gold uppercase">Inside the chalet</p>
            <h2
              id="living-room-heading"
              className="mt-2 font-serif text-[clamp(1.7rem,5vw,2.8rem)] leading-[1.05] text-balance text-orchid-white"
              style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 144' }}
            >
              Come in, <em className="italic">the fire&rsquo;s lit</em>
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-linen/75">
              Keep scrolling. The cats saved you the warm spot.
            </p>
          </motion.div>

          {/* Now showing — the on-screen display and nameplate carry this visually */}
          <h3 className="sr-only">Channel 08: Eight Days to the 8th</h3>
          <p className="sr-only">
            Tap the screen to play. The channel up and down buttons, or the left and right arrow keys, change the tape.
          </p>

          <div aria-hidden className="paper-grain pointer-events-none absolute inset-0 opacity-15 mix-blend-multiply" />
        </div>
      </div>
    </section>
  );
}
