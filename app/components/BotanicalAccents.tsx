"use client";

/* ═══════════════════════════════════════════════════════════════════
   Botanical accents: five small flowers drawn in the same lineless,
   soft-gradient storybook style as the chalet and the chrysanthemum.

   Each flower comes in two forms:
   • `<CallaLily />` etc. — a decorative, absolutely-positionable <svg>
     (pass `className` for placement and width), swaying in a breeze.
   • `<CallaLilyArt />` etc. — the raw <g> artwork, for composing inside
     another SVG (the living-room vase). Wrap it in `<Breeze>` to sway.
   ═══════════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import { useId, type CSSProperties, type ReactNode } from "react";
import { usePrefersReducedMotion } from "../lib/motion";

/* ── Shared plumbing ───────────────────────────────────────────── */

const r1 = (n: number) => Number(n.toFixed(1));

function Stop({ at, c, o = 1 }: Readonly<{ at: string; c: string; o?: number }>) {
  return <stop offset={at} style={{ stopColor: `var(--color-${c})`, stopOpacity: o }} />;
}

/** A gradient-id prefix that is unique per instance and safe inside `url(#…)`. */
function usePrefix(name: string) {
  return `ba-${name}-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
}

const BREEZE = { rotate: [-1.5, 1.5, -1.5] };

type BreezeProps = {
  children: ReactNode;
  /** Seconds before this sprig joins the breeze, so neighbours never sway in unison. */
  delay?: number;
  duration?: number;
  /** Pivot, as a fraction of the artwork's box (0.5 / 1 = the stem base). */
  originX?: number;
  originY?: number;
  /** Pressed flowers hold still. */
  still?: boolean;
};

/** Gentle ambient sway for any SVG group. Holds still for reduced motion. */
export function Breeze({ children, delay = 0, duration = 7.5, originX = 0.5, originY = 1, still = false }: Readonly<BreezeProps>) {
  const reduce = usePrefersReducedMotion();
  const calm = reduce || still;
  return (
    <motion.g
      style={{ originX, originY }}
      initial={false}
      animate={calm ? { rotate: 0 } : BREEZE}
      transition={calm ? { duration: 0 } : { duration, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.g>
  );
}

export type AccentProps = {
  /** Placement and width, e.g. `absolute bottom-4 left-6 w-16`. */
  className?: string;
  style?: CSSProperties;
  /** Mirror left ↔ right. */
  flip?: boolean;
  delay?: number;
  duration?: number;
  still?: boolean;
};

function AccentFrame({
  viewBox,
  className = "",
  style,
  flip = false,
  children,
}: Readonly<{ viewBox: string; className?: string; style?: CSSProperties; flip?: boolean; children: ReactNode }>) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox={viewBox}
      className={`pointer-events-none block h-auto overflow-visible ${flip ? "-scale-x-100" : ""} ${className}`}
      style={style}
    >
      {children}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Calla lily — viewBox 0 0 120 240, stem base at (60 240)
   ═══════════════════════════════════════════════════════════════════ */

export function CallaLilyArt({ leaf = true }: Readonly<{ leaf?: boolean }>) {
  const p = usePrefix("calla");
  return (
    <g>
      <defs>
        <linearGradient id={`${p}-spathe`} x1="0.2" y1="0" x2="0.5" y2="1">
          <Stop at="0%" c="orchid-white" />
          <Stop at="45%" c="linen" />
          <Stop at="80%" c="linen-deep" />
          <Stop at="100%" c="alpine-sage" o={0.75} />
        </linearGradient>
        <linearGradient id={`${p}-throat`} x1="0" y1="0" x2="0" y2="1">
          <Stop at="0%" c="linen-deep" />
          <Stop at="60%" c="ember-gold" o={0.45} />
          <Stop at="100%" c="dusk-amber" o={0.6} />
        </linearGradient>
        <linearGradient id={`${p}-spadix`} x1="0" y1="0" x2="0" y2="1">
          <Stop at="0%" c="ember-gold" />
          <Stop at="100%" c="dusk-amber" />
        </linearGradient>
        <radialGradient id={`${p}-glow`}>
          <Stop at="0%" c="ember-gold" o={0.55} />
          <Stop at="100%" c="ember-gold" o={0} />
        </radialGradient>
        <linearGradient id={`${p}-stem`} x1="0" y1="0" x2="1" y2="0">
          <Stop at="0%" c="alpine-sage" />
          <Stop at="60%" c="alpine-sage" />
          <Stop at="100%" c="twilight-indigo" o={0.7} />
        </linearGradient>
        <linearGradient id={`${p}-leaf`} x1="0" y1="0" x2="0" y2="1">
          <Stop at="0%" c="alpine-sage" />
          <Stop at="100%" c="twilight-indigo" o={0.75} />
        </linearGradient>
      </defs>

      {leaf && (
        <g>
          <path d="M60 238C44 214 30 184 30 150C30 132 36 120 42 112C46 140 52 176 62 226Z" fill={`url(#${p}-leaf)`} />
          <path d="M60 232C50 204 42 170 42 118" fill="none" stroke="var(--color-orchid-white)" strokeOpacity={0.22} strokeWidth={1} strokeLinecap="round" />
        </g>
      )}
      <path d="M55.5 240C54 196 60 150 58.5 102L62.5 102C64 150 59 196 64.5 240Z" fill={`url(#${p}-stem)`} />

      {/* The spathe: back, cool shadow side, open throat, lit lip, front fold */}
      <path d="M60 106C50 96 42 80 40 60C38 40 46 20 62 12C76 5 94 8 106 20C100 19 93 21 89 26C94 44 90 70 78 88C72 97 65 103 60 106Z" fill={`url(#${p}-spathe)`} />
      <path d="M60 106C50 96 42 80 40 60C39 50 41 40 45 32C44 52 50 78 64 102Z" fill="var(--color-petal-lilac)" fillOpacity={0.32} />
      <path d="M47 54C47 36 58 22 74 18C86 15 98 17 106 20C97 21 90 26 86 34C80 48 70 66 62 86C54 76 47 66 47 54Z" fill={`url(#${p}-throat)`} />
      <ellipse cx={70} cy={52} rx={11} ry={22} transform="rotate(18 70 52)" fill={`url(#${p}-glow)`} />
      <ellipse cx={70} cy={52} rx={4.2} ry={17} transform="rotate(18 70 52)" fill={`url(#${p}-spadix)`} />
      <ellipse cx={68.6} cy={46} rx={1.4} ry={8} transform="rotate(18 68.6 46)" fill="var(--color-orchid-white)" fillOpacity={0.35} />
      <path d="M47 54C47 36 58 22 74 18C86 15 98 17 106 20C94 18 80 20 70 26C58 33 50 44 47 54Z" fill="var(--color-orchid-white)" />
      <path d="M106 20C96 22 90 28 88 36C86 56 80 74 68 94C78 84 88 66 92 46C94 34 98 26 106 20Z" fill="var(--color-orchid-white)" fillOpacity={0.9} />
    </g>
  );
}

export function CallaLily({ delay, duration, still, leaf, ...frame }: Readonly<AccentProps & { leaf?: boolean }>) {
  return (
    <AccentFrame viewBox="0 0 120 240" {...frame}>
      <Breeze delay={delay} duration={duration} still={still}>
        <CallaLilyArt leaf={leaf} />
      </Breeze>
    </AccentFrame>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Anemone — viewBox 0 0 120 200, bloom centre (60 58), base (60 200)
   ═══════════════════════════════════════════════════════════════════ */

const ANEMONE_PETAL = "M0 -4C-14 -8 -22 -24 -17 -36C-12 -46 12 -46 17 -36C22 -24 14 -8 0 -4Z";
const ANEMONE_SHEEN = "M-8 -34C-6 -41 6 -41 9 -35C4 -37 -2 -37 -8 -34Z";
const ANEMONE_STAMENS = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2;
  const r = i % 2 ? 11.5 : 13.5;
  return { id: i, x: r1(Math.cos(a) * r), y: r1(Math.sin(a) * r) };
});

export function AnemoneArt() {
  const p = usePrefix("anem");
  return (
    <g>
      <defs>
        <radialGradient id={`${p}-petal`} gradientUnits="userSpaceOnUse" cx="0" cy="0" r="46">
          <Stop at="0%" c="bruised-lavender" />
          <Stop at="30%" c="bruised-lavender" />
          <Stop at="72%" c="petal-lilac" />
          <Stop at="100%" c="petal-lilac" o={0.9} />
        </radialGradient>
        <radialGradient id={`${p}-eye`}>
          <Stop at="0%" c="twilight-indigo" />
          <Stop at="62%" c="velvet-plum" o={0.75} />
          <Stop at="100%" c="velvet-plum" o={0} />
        </radialGradient>
        <linearGradient id={`${p}-stem`} x1="0" y1="0" x2="1" y2="0">
          <Stop at="0%" c="alpine-sage" />
          <Stop at="100%" c="twilight-indigo" o={0.65} />
        </linearGradient>
        <linearGradient id={`${p}-leaf`} x1="0" y1="0" x2="0" y2="1">
          <Stop at="0%" c="alpine-sage" />
          <Stop at="100%" c="twilight-indigo" o={0.7} />
        </linearGradient>
      </defs>

      <path d="M57.5 200C56 160 62 110 58.6 66L61.6 66C65 110 59 160 62.5 200Z" fill={`url(#${p}-stem)`} />
      {/* The little ruff of cut leaves under the bloom */}
      <path d="M60 108C48 102 36 104 27 96C37 93 45 95 51 92C45 88 41 82 39 73C49 79 55 89 60 102Z" fill={`url(#${p}-leaf)`} />
      <path d="M60 110C72 104 84 106 93 98C83 95 75 97 69 94C75 90 79 84 81 75C71 81 65 91 60 104Z" fill={`url(#${p}-leaf)`} />

      <g transform="translate(60 58)">
        {[30, 150, 270].map((a) => (
          <g key={a} transform={`rotate(${a}) scale(0.94)`}>
            <path d={ANEMONE_PETAL} fill={`url(#${p}-petal)`} />
            <path d={ANEMONE_PETAL} fill="var(--color-velvet-plum)" fillOpacity={0.12} />
          </g>
        ))}
        {[90, 210, 330].map((a) => (
          <g key={a} transform={`rotate(${a})`}>
            <path d={ANEMONE_PETAL} fill={`url(#${p}-petal)`} />
            <path d={ANEMONE_SHEEN} fill="var(--color-orchid-white)" fillOpacity={0.4} />
          </g>
        ))}
        <circle r={16} fill={`url(#${p}-eye)`} />
        <circle r={8.5} fill="var(--color-twilight-indigo)" />
        {ANEMONE_STAMENS.map((s) => (
          <circle key={s.id} cx={s.x} cy={s.y} r={1.3} fill={s.id % 3 ? "var(--color-twilight-indigo)" : "var(--color-velvet-plum)"} />
        ))}
        <ellipse cx={-2.5} cy={-3} rx={3.5} ry={2.4} fill="var(--color-bruised-lavender)" fillOpacity={0.35} />
      </g>
    </g>
  );
}

export function Anemone({ delay, duration, still, ...frame }: Readonly<AccentProps>) {
  return (
    <AccentFrame viewBox="0 0 120 200" {...frame}>
      <Breeze delay={delay} duration={duration} still={still}>
        <AnemoneArt />
      </Breeze>
    </AccentFrame>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Wisteria — viewBox 0 0 160 260, hanging from a vine along the top
   ═══════════════════════════════════════════════════════════════════ */

type Floret = { id: string; cx: number; cy: number; r: number; tone: "lilac" | "lavender" | "plum" };

const WISTERIA_RACEMES = [
  { x: 34, len: 150 },
  { x: 84, len: 215 },
  { x: 132, len: 120 },
].map(({ x, len }) => {
  const n = Math.round(len / 7.5);
  const florets: Floret[] = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const side = i % 2 ? 1 : -1;
    return {
      id: `${x}-${i}`,
      cx: r1(x + side * (1 - t) * 7 + Math.sin(t * 4) * 2.5),
      cy: r1(18 + t * len),
      r: r1(8.5 - 5.5 * t),
      tone: t < 0.35 ? "lilac" : t < 0.72 ? "lavender" : "plum",
    };
  });
  return { x, len, florets };
});

const WISTERIA_LEAVES = [
  { x: 16, y: 10, a: 150 },
  { x: 56, y: 15, a: 30 },
  { x: 62, y: 12, a: 160 },
  { x: 108, y: 8, a: 20 },
  { x: 116, y: 6, a: 170 },
  { x: 150, y: 9, a: 35 },
];

const FLORET_FILL = {
  lilac: "var(--color-petal-lilac)",
  lavender: "var(--color-bruised-lavender)",
  plum: "var(--color-velvet-plum)",
} as const;

export function WisteriaArt() {
  const p = usePrefix("wist");
  return (
    <g>
      <defs>
        <linearGradient id={`${p}-leaf`} x1="0" y1="0" x2="0" y2="1">
          <Stop at="0%" c="alpine-sage" />
          <Stop at="100%" c="twilight-indigo" o={0.7} />
        </linearGradient>
        <radialGradient id={`${p}-haze`}>
          <Stop at="0%" c="petal-lilac" o={0.45} />
          <Stop at="100%" c="petal-lilac" o={0} />
        </radialGradient>
      </defs>

      {WISTERIA_RACEMES.map((rc) => (
        <g key={rc.x}>
          <ellipse cx={rc.x} cy={18 + rc.len * 0.4} rx={18} ry={rc.len * 0.45} fill={`url(#${p}-haze)`} />
          <path d={`M${rc.x} 10C${rc.x - 3} ${r1(10 + rc.len * 0.4)} ${rc.x + 3} ${r1(10 + rc.len * 0.7)} ${rc.x} ${18 + rc.len}`} fill="none" stroke="var(--color-alpine-sage)" strokeOpacity={0.7} strokeWidth={1.4} strokeLinecap="round" />
          {rc.florets.map((f) => (
            <g key={f.id}>
              <ellipse cx={f.cx} cy={f.cy} rx={f.r} ry={r1(f.r * 0.78)} fill={FLORET_FILL[f.tone]} fillOpacity={0.95} />
              <ellipse
                cx={f.cx}
                cy={r1(f.cy + f.r * 0.32)}
                rx={r1(f.r * 0.55)}
                ry={r1(f.r * 0.38)}
                fill={f.tone === "plum" ? "var(--color-bruised-lavender)" : "var(--color-orchid-white)"}
                fillOpacity={f.tone === "plum" ? 0.45 : 0.3}
              />
            </g>
          ))}
        </g>
      ))}

      {/* The woody vine and its leaflets, over the tops of the racemes */}
      <path d="M-6 12C30 4 60 18 90 10C120 2 146 12 166 6" fill="none" stroke="var(--color-chalet-cedar)" strokeWidth={3.4} strokeLinecap="round" />
      <path d="M-4 10.5C30 2.5 60 16.5 90 8.5C120 0.5 146 10.5 164 4.5" fill="none" stroke="var(--color-dusk-amber)" strokeOpacity={0.35} strokeWidth={1} strokeLinecap="round" />
      {WISTERIA_LEAVES.map((l) => (
        <ellipse key={`${l.x}-${l.a}`} cx={l.x} cy={l.y} rx={11} ry={3.6} transform={`rotate(${l.a} ${l.x} ${l.y}) translate(9 0)`} fill={`url(#${p}-leaf)`} />
      ))}
    </g>
  );
}

export function Wisteria({ delay, duration, still, ...frame }: Readonly<AccentProps>) {
  return (
    <AccentFrame viewBox="0 0 160 260" {...frame}>
      <Breeze delay={delay} duration={duration ?? 9} still={still} originY={0}>
        <WisteriaArt />
      </Breeze>
    </AccentFrame>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Lily of the valley — viewBox 0 0 140 180, base (44 180)
   ═══════════════════════════════════════════════════════════════════ */

const BELL = "M-5 0C-7 5 -7.5 9 -9 11.5Q-6.5 10.5 -4.5 12.5Q-2.2 10.8 0 12.8Q2.2 10.8 4.5 12.5Q6.5 10.5 9 11.5C7.5 9 7 5 5 0C3 -2.5 -3 -2.5 -5 0Z";
const BELLS = [
  { x: 56, y: 92, s: 1.15 },
  { x: 66, y: 70, s: 1.05 },
  { x: 80, y: 54, s: 0.95 },
  { x: 95, y: 44, s: 0.84 },
  { x: 109, y: 41, s: 0.72 },
  { x: 121, y: 45, s: 0.58 },
];

export function LilyOfTheValleyArt() {
  const p = usePrefix("lotv");
  return (
    <g>
      <defs>
        <linearGradient id={`${p}-leaf`} x1="0" y1="0" x2="1" y2="1">
          <Stop at="0%" c="alpine-sage" />
          <Stop at="100%" c="twilight-indigo" o={0.72} />
        </linearGradient>
        <linearGradient id={`${p}-bell`} x1="0" y1="0" x2="0" y2="1">
          <Stop at="0%" c="orchid-white" />
          <Stop at="70%" c="linen" />
          <Stop at="100%" c="linen-deep" />
        </linearGradient>
      </defs>

      <path d="M40 178C26 150 22 112 30 80C34 64 40 56 44 52C46 90 48 140 46 178Z" fill={`url(#${p}-leaf)`} />
      <path d="M42 178C52 146 62 116 74 96C80 86 86 82 90 80C82 112 66 148 48 178Z" fill={`url(#${p}-leaf)`} />
      <path d="M42 170C38 140 38 100 43 62" fill="none" stroke="var(--color-orchid-white)" strokeOpacity={0.2} strokeWidth={1} strokeLinecap="round" />

      <path d="M44 178C44 120 52 72 82 46C100 32 118 32 128 46" fill="none" stroke="var(--color-alpine-sage)" strokeWidth={2.6} strokeLinecap="round" />
      {BELLS.map((b) => (
        <g key={b.x}>
          <path d={`M${b.x - 6} ${b.y - 6}Q${b.x} ${b.y - 8} ${b.x + 3} ${b.y + 1}`} fill="none" stroke="var(--color-alpine-sage)" strokeWidth={1.2} strokeLinecap="round" />
          <g transform={`translate(${b.x + 3} ${b.y + 2}) scale(${b.s})`}>
            <path d={BELL} fill={`url(#${p}-bell)`} />
            <ellipse cy={11.4} rx={6} ry={1.4} fill="var(--color-petal-lilac)" fillOpacity={0.4} />
          </g>
        </g>
      ))}
      <circle cx={128} cy={49} r={2.6} fill="var(--color-orchid-white)" fillOpacity={0.85} />
      <circle cx={131} cy={55} r={1.8} fill="var(--color-alpine-sage)" fillOpacity={0.8} />
    </g>
  );
}

export function LilyOfTheValley({ delay, duration, still, ...frame }: Readonly<AccentProps>) {
  return (
    <AccentFrame viewBox="0 0 140 180" {...frame}>
      <Breeze delay={delay} duration={duration} still={still} originX={0.3}>
        <LilyOfTheValleyArt />
      </Breeze>
    </AccentFrame>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Magnolia sprig — viewBox 0 0 200 170, branch base at (6 168)
   ═══════════════════════════════════════════════════════════════════ */

const MAG_BACK = [
  "M0 0C-14 -6 -20 -22 -14 -38C-6 -34 -2 -20 0 0Z",
  "M0 0C14 -6 20 -22 14 -38C6 -34 2 -20 0 0Z",
  "M0 0C-8 -14 -8 -32 0 -42C8 -32 8 -14 0 0Z",
];
const MAG_FRONT = [
  "M0 2C-18 0 -24 -14 -19 -30C-14 -36 -6 -30 -2 -20C0 -12 1 -4 0 2Z",
  "M0 2C18 0 24 -14 19 -30C14 -36 6 -30 2 -20C0 -12 -1 -4 0 2Z",
  "M0 3C-10 -4 -12 -20 -6 -32C-3 -36 3 -36 6 -32C12 -20 10 -4 0 3Z",
];

function MagnoliaBloom({ x, y, rotate, scale, p }: Readonly<{ x: number; y: number; rotate: number; scale: number; p: string }>) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      {MAG_BACK.map((d) => (
        <path key={d} d={d} fill={`url(#${p}-back)`} />
      ))}
      {MAG_FRONT.map((d) => (
        <path key={d} d={d} fill={`url(#${p}-petal)`} />
      ))}
      <path d="M-4 -26C-2 -31 2 -31 4 -26C1 -28 -1 -28 -4 -26Z" fill="var(--color-orchid-white)" />
      <path d="M-6 4C-4 0 4 0 6 4C4 7 -4 7 -6 4Z" fill="var(--color-alpine-sage)" fillOpacity={0.85} />
    </g>
  );
}

export function MagnoliaSprigArt() {
  const p = usePrefix("mag");
  return (
    <g>
      <defs>
        <linearGradient id={`${p}-wood`} x1="0" y1="0" x2="0" y2="1">
          <Stop at="0%" c="chalet-cedar" />
          <Stop at="100%" c="ink" o={0.85} />
        </linearGradient>
        <linearGradient id={`${p}-petal`} x1="0" y1="0" x2="0" y2="1">
          <Stop at="0%" c="orchid-white" />
          <Stop at="60%" c="linen" />
          <Stop at="100%" c="petal-lilac" o={0.6} />
        </linearGradient>
        <linearGradient id={`${p}-back`} x1="0" y1="0" x2="0" y2="1">
          <Stop at="0%" c="linen" />
          <Stop at="100%" c="linen-deep" />
        </linearGradient>
        <linearGradient id={`${p}-leaf`} x1="0" y1="0" x2="1" y2="1">
          <Stop at="0%" c="alpine-sage" />
          <Stop at="100%" c="twilight-indigo" o={0.7} />
        </linearGradient>
      </defs>

      {/* Woody branch, a fork, and the warm light along its upper edge */}
      <path d="M4 168C40 140 76 120 112 96C136 80 160 60 182 34L186 37C166 64 142 86 118 102C82 126 46 148 10 172Z" fill={`url(#${p}-wood)`} />
      <path d="M100 106C112 112 128 114 146 110L146 114C126 118 110 116 98 110Z" fill={`url(#${p}-wood)`} />
      <path d="M8 166C42 139 78 119 112 96C136 80 158 60 182 34C160 62 138 82 114 99C80 122 44 144 8 168Z" fill="var(--color-dusk-amber)" fillOpacity={0.35} />
      <ellipse cx={64} cy={133} rx={3} ry={2} fill="var(--color-ink)" fillOpacity={0.35} />
      <ellipse cx={128} cy={84} rx={2.6} ry={1.8} fill="var(--color-ink)" fillOpacity={0.35} />

      {/* Young leaves */}
      <path d="M52 140C44 126 46 112 56 104C60 116 58 130 52 140Z" fill={`url(#${p}-leaf)`} />
      <path d="M132 90C140 98 152 100 160 96C154 88 142 86 132 90Z" fill={`url(#${p}-leaf)`} />

      {/* A closed bud at the tip: fuzzy sheath under linen petals */}
      <g transform="translate(184 34) rotate(36)">
        <path d="M0 0C-6 -6 -6 -18 0 -26C6 -18 6 -6 0 0Z" fill={`url(#${p}-petal)`} />
        <path d="M0 2C-6 -2 -7 -10 -4 -14C-1 -10 1 -10 4 -14C7 -10 6 -2 0 2Z" fill="var(--color-alpine-sage)" fillOpacity={0.85} />
      </g>

      <MagnoliaBloom p={p} x={148} y={110} rotate={18} scale={1} />
      <MagnoliaBloom p={p} x={96} y={104} rotate={-14} scale={0.82} />
    </g>
  );
}

export function MagnoliaSprig({ delay, duration, still, ...frame }: Readonly<AccentProps>) {
  return (
    <AccentFrame viewBox="0 0 200 170" {...frame}>
      <Breeze delay={delay} duration={duration} still={still} originX={0.03}>
        <MagnoliaSprigArt />
      </Breeze>
    </AccentFrame>
  );
}
