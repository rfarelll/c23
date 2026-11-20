"use client";

import {
  animate,
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect } from "react";
import { EASE_DUSK, usePrefersReducedMotion } from "../lib/motion";

/* ───────────────────────────────────────────────────────────────
   Vine geometry. Each rail is a 100 × 1000 field where x = 0 is the
   screen edge. Cubic segments are measured once so blossoms open
   exactly as the drawn stem reaches them.
   ─────────────────────────────────────────────────────────────── */

type Pt = readonly [number, number];
type Seg = readonly [Pt, Pt, Pt];
type VineSpec = { start: Pt; segs: readonly Seg[] };
type Anchor = { x: number; y: number; f: number };

function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
  ];
}

const STEPS = 32;

function measureVine(spec: VineSpec) {
  const d = [
    `M${spec.start[0]} ${spec.start[1]}`,
    ...spec.segs.map(([c1, c2, e]) => `C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${e[0]} ${e[1]}`),
  ].join(" ");

  // Cumulative arc length per segment, sampled.
  const samples: { len: number; pt: Pt }[][] = [];
  let total = 0;
  let from = spec.start;
  for (const [c1, c2, e] of spec.segs) {
    const p0 = from;
    const row: { len: number; pt: Pt }[] = [{ len: total, pt: p0 }];
    let prev = p0;
    for (let i = 1; i <= STEPS; i++) {
      const pt = cubic(p0, c1, c2, e, i / STEPS);
      total += Math.hypot(pt[0] - prev[0], pt[1] - prev[1]);
      row.push({ len: total, pt });
      prev = pt;
    }
    samples.push(row);
    from = e;
  }

  const at = (seg: number, t: number): Anchor => {
    const row = samples[seg];
    const i = Math.round(t * STEPS);
    const { len, pt } = row[i];
    return {
      x: Number(pt[0].toFixed(2)),
      y: Number(pt[1].toFixed(2)),
      f: Number((len / total).toFixed(4)),
    };
  };

  return { d, at };
}

type BlossomSpec = { seg: number; t: number; size: "lg" | "md" | "sm"; tilt: number; bud?: boolean };
type LeafSpec = { seg: number; t: number; angle: number };
type TendrilSpec = { seg: number; t: number; flip?: boolean };

type RailSpec = {
  main: VineSpec;
  strand: VineSpec;
  blossoms: readonly BlossomSpec[];
  leaves: readonly LeafSpec[];
  tendrils: readonly TendrilSpec[];
};

/** Left: climbs up from the floor of the screen. */
const LEFT: RailSpec = {
  main: {
    start: [18, 1010],
    segs: [
      [[40, 930], [8, 870], [26, 800]],
      [[44, 730], [12, 660], [30, 590]],
      [[48, 520], [14, 450], [32, 380]],
      [[50, 310], [16, 240], [34, 170]],
      [[46, 120], [28, 80], [40, 30]],
    ],
  },
  strand: {
    start: [8, 1010],
    segs: [
      [[26, 950], [32, 880], [14, 820]],
      [[0, 760], [30, 700], [20, 630]],
      [[10, 570], [36, 520], [22, 460]],
    ],
  },
  blossoms: [
    { seg: 0, t: 1, size: "md", tilt: 8 },
    { seg: 1, t: 0.5, size: "sm", tilt: -10, bud: true },
    { seg: 1, t: 1, size: "lg", tilt: -6 },
    { seg: 2, t: 1, size: "md", tilt: 12 },
    { seg: 3, t: 0.55, size: "lg", tilt: -4 },
    { seg: 4, t: 0.4, size: "md", tilt: 10 },
    { seg: 4, t: 0.94, size: "sm", tilt: -14, bud: true },
  ],
  leaves: [
    { seg: 0, t: 0.45, angle: -32 },
    { seg: 1, t: 0.2, angle: -48 },
    { seg: 2, t: 0.35, angle: -26 },
    { seg: 2, t: 0.7, angle: -54 },
    { seg: 3, t: 0.2, angle: -38 },
    { seg: 4, t: 0.72, angle: -30 },
  ],
  tendrils: [
    { seg: 0, t: 0.75 },
    { seg: 2, t: 0.15, flip: true },
    { seg: 3, t: 0.85 },
  ],
};

/** Right: trails down from the top, mirrored onto the right edge. */
const RIGHT: RailSpec = {
  main: {
    start: [20, -10],
    segs: [
      [[42, 60], [10, 130], [28, 210]],
      [[46, 290], [14, 360], [32, 440]],
      [[50, 520], [18, 590], [36, 670]],
      [[52, 740], [22, 800], [36, 870]],
    ],
  },
  strand: {
    start: [6, -10],
    segs: [
      [[24, 50], [30, 110], [12, 170]],
      [[0, 230], [28, 290], [18, 350]],
    ],
  },
  blossoms: [
    { seg: 0, t: 0.55, size: "sm", tilt: 14, bud: true },
    { seg: 0, t: 1, size: "lg", tilt: 6 },
    { seg: 1, t: 1, size: "md", tilt: -8 },
    { seg: 2, t: 0.6, size: "lg", tilt: 10 },
    { seg: 3, t: 0.55, size: "md", tilt: -6 },
    { seg: 3, t: 0.95, size: "sm", tilt: 12, bud: true },
  ],
  leaves: [
    { seg: 0, t: 0.3, angle: 34 },
    { seg: 1, t: 0.4, angle: 46 },
    { seg: 1, t: 0.75, angle: 24 },
    { seg: 2, t: 0.25, angle: 40 },
    { seg: 3, t: 0.25, angle: 30 },
  ],
  tendrils: [
    { seg: 0, t: 0.25, flip: true },
    { seg: 1, t: 0.6 },
    { seg: 2, t: 0.9, flip: true },
  ],
};

type RailGeometry = {
  main: ReturnType<typeof measureVine>;
  strand: ReturnType<typeof measureVine>;
};

const LEFT_GEOMETRY: RailGeometry = { main: measureVine(LEFT.main), strand: measureVine(LEFT.strand) };
const RIGHT_GEOMETRY: RailGeometry = { main: measureVine(RIGHT.main), strand: measureVine(RIGHT.strand) };

/** Fraction of the page by which the vines are fully grown — roughly, arriving at the garden. */
const FULL_BLOOM_AT = 0.4;
/** How much vine is already showing before she scrolls at all. */
const RESTING_GROWTH = 0.16;

const BLOSSOM_SIZE = {
  lg: "size-12 sm:size-16 lg:size-24",
  md: "size-10 sm:size-14 lg:size-20",
  sm: "size-8 sm:size-11 lg:size-16",
} as const;

/* ── Shared gradients (one copy for every bloom) ─────────────── */
function OrchidDefs() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <defs>
        <radialGradient id="orchid-petal" cx="50%" cy="100%" r="100%">
          <stop offset="0%" style={{ stopColor: "var(--color-petal-lilac)", stopOpacity: 0.85 }} />
          <stop offset="45%" style={{ stopColor: "var(--color-orchid-white)" }} />
          <stop offset="100%" style={{ stopColor: "var(--color-orchid-white)" }} />
        </radialGradient>
        <linearGradient id="orchid-lip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--color-dusk-amber)" }} />
          <stop offset="35%" style={{ stopColor: "var(--color-petal-lilac)" }} />
          <stop offset="100%" style={{ stopColor: "var(--color-bruised-lavender)" }} />
        </linearGradient>
        <linearGradient id="orchid-leaf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--color-alpine-sage)" }} />
          <stop offset="100%" style={{ stopColor: "var(--color-twilight-indigo)", stopOpacity: 0.85 }} />
        </linearGradient>
      </defs>
    </svg>
  );
}

const SEPAL = "M0 0 C-9 -6 -11 -26 0 -36 C11 -26 9 -6 0 0Z";
const LATERAL_SEPAL = "M0 0 C-8 -6 -10 -24 0 -33 C10 -24 8 -6 0 0Z";
const PETAL = "M0 0 C-17 -6 -22 -30 0 -38 C22 -30 17 -6 0 0Z";

/* ── One phalaenopsis bloom, opening from a bud ──────────────── */
function Blossom({
  anchor,
  spec,
  growth,
}: {
  anchor: Anchor;
  spec: BlossomSpec;
  growth: MotionValue<number>;
}) {
  const { f } = anchor;
  const openEnd = Math.min(f + 0.09, 1);
  const open = useTransform(growth, [f - 0.02, openEnd], [0, 1]);
  const appear = useTransform(growth, [f - 0.07, f - 0.02], [0, 1]);
  const scale = useTransform(open, [0, 1], [0.38, 1]);
  const rotate = useTransform(open, [0, 1], [spec.tilt - 26, spec.tilt]);
  const petalScale = useTransform(open, [0.12, 1], [0.3, 1]);
  const budOpacity = useTransform(open, [0, 0.45], [1, 0]);
  const flowerOpacity = useTransform(open, [0.05, 0.42], [0, 1]);

  const petalStyle = {
    scale: petalScale,
    originX: 0.5,
    originY: 1,
    transformBox: "fill-box" as const,
  };

  return (
    <motion.div
      className={`absolute -translate-x-[10%] -translate-y-[76%] ${BLOSSOM_SIZE[spec.size]}`}
      style={{
        left: `${anchor.x}%`,
        top: `${anchor.y / 10}%`,
        originX: 0.1,
        originY: 0.76,
        scale: spec.bud ? appear : scale,
        rotate: spec.bud ? spec.tilt : rotate,
        opacity: appear,
      }}
    >
      <svg viewBox="-50 -50 100 100" className="size-full overflow-visible drop-shadow-[0_3px_6px_color-mix(in_oklab,var(--color-twilight-indigo)_35%,transparent)]">
        {/* Pedicel back to the vine */}
        <path d="M-4 6 C-12 16 -24 22 -40 26" fill="none" stroke="var(--color-alpine-sage)" strokeWidth={2} strokeLinecap="round" />

        {/* Closed bud */}
        <motion.g style={{ opacity: spec.bud ? 1 : budOpacity }}>
          <path d="M0 -14 C-9 -10 -10 6 -2 12 C6 8 10 -8 0 -14Z" fill="var(--color-orchid-white)" stroke="var(--color-petal-lilac)" strokeWidth={1} />
          <path d="M-1 -10 C-4 -4 -4 4 -2 10" fill="none" stroke="var(--color-petal-lilac)" strokeWidth={1.4} strokeOpacity={0.8} />
          <path d="M-2 12 C-6 16 -8 18 -12 20" fill="none" stroke="var(--color-alpine-sage)" strokeWidth={1.6} />
        </motion.g>

        {!spec.bud && (
          <motion.g style={{ opacity: flowerOpacity }}>
            {/* Sepals */}
            {[0, 128, -128].map((deg) => (
              <g key={deg} transform={`rotate(${deg})`}>
                <motion.path
                  d={deg === 0 ? SEPAL : LATERAL_SEPAL}
                  fill="url(#orchid-petal)"
                  stroke="var(--color-velvet-plum)"
                  strokeOpacity={0.2}
                  strokeWidth={0.6}
                  style={petalStyle}
                />
                <path d="M0 -3 V-29" stroke="var(--color-petal-lilac)" strokeWidth={0.6} strokeOpacity={0.9} />
              </g>
            ))}
            {/* Broad petals with lilac veining */}
            {[-64, 64].map((deg) => (
              <g key={deg} transform={`rotate(${deg})`}>
                <motion.g style={petalStyle}>
                  <path d={PETAL} fill="url(#orchid-petal)" stroke="var(--color-velvet-plum)" strokeOpacity={0.22} strokeWidth={0.6} />
                  <path
                    d="M0 -3 V-33 M0 -5 C-5 -12 -9 -22 -7 -31 M0 -5 C5 -12 9 -22 7 -31 M0 -8 C-9 -14 -14 -22 -14 -27 M0 -8 C9 -14 14 -22 14 -27"
                    fill="none"
                    stroke="var(--color-petal-lilac)"
                    strokeWidth={0.55}
                    strokeOpacity={0.85}
                  />
                </motion.g>
              </g>
            ))}
            {/* Lip: lilac lobes, plum striations, amber throat */}
            <path d="M-4 2 C-14 0 -16 10 -9 13 C-6 14 -4 10 -3 6Z" fill="var(--color-petal-lilac)" />
            <path d="M4 2 C14 0 16 10 9 13 C6 14 4 10 3 6Z" fill="var(--color-petal-lilac)" />
            <path d="M-5 6 C-9 14 -7 22 0 23 C7 22 9 14 5 6 C2 8 -2 8 -5 6Z" fill="url(#orchid-lip)" />
            <path d="M-2 9 L-3 19 M0 9 V21 M2 9 L3 19" stroke="var(--color-velvet-plum)" strokeOpacity={0.4} strokeWidth={0.6} />
            <path d="M-2 22 C-5 26 -9 25 -10 22 M2 22 C5 26 9 25 10 22" fill="none" stroke="var(--color-petal-lilac)" strokeWidth={0.8} strokeLinecap="round" />
            <ellipse cx={0} cy={4} rx={4.4} ry={3.2} fill="var(--color-dusk-amber)" />
            <circle cx={-1.6} cy={4.4} r={0.7} fill="var(--color-hearth-terracotta)" fillOpacity={0.7} />
            <circle cx={1.6} cy={4.4} r={0.7} fill="var(--color-hearth-terracotta)" fillOpacity={0.7} />
            {/* Column */}
            <path d="M-2.4 -1 C-2.8 -7 2.8 -7 2.4 -1 C1 1 -1 1 -2.4 -1Z" fill="var(--color-orchid-white)" stroke="var(--color-petal-lilac)" strokeWidth={0.5} />
            <circle cx={0} cy={-5} r={0.9} fill="var(--color-dusk-amber)" />
          </motion.g>
        )}
      </svg>
    </motion.div>
  );
}

function Leaf({ anchor, angle, growth }: { anchor: Anchor; angle: number; growth: MotionValue<number> }) {
  const { f } = anchor;
  const scale = useTransform(growth, [f - 0.01, f + 0.05], [0, 1]);
  return (
    <motion.div
      className="absolute h-3 w-7 -translate-y-1/2 sm:h-4 sm:w-10 lg:h-6 lg:w-14"
      style={{ left: `${anchor.x}%`, top: `${anchor.y / 10}%`, originX: 0, originY: 0.5, rotate: angle, scale }}
    >
      <svg viewBox="0 0 60 24" className="size-full overflow-visible">
        <path d="M0 12 C14 0 40 -2 60 12 C40 26 14 24 0 12Z" fill="url(#orchid-leaf)" />
        <path d="M2 12 C20 10 40 10 57 12" fill="none" stroke="var(--color-orchid-white)" strokeOpacity={0.3} strokeWidth={0.8} />
      </svg>
    </motion.div>
  );
}

function Tendril({ anchor, flip, growth }: { anchor: Anchor; flip?: boolean; growth: MotionValue<number> }) {
  const { x, y, f } = anchor;
  const pathLength = useTransform(growth, [f, f + 0.06], [0, 1]);
  const s = flip ? -1 : 1;
  return (
    <motion.path
      d={`M${x} ${y} c${8 * s} -10 ${18 * s} -6 ${14 * s} 4 c${-3 * s} 7 ${-10 * s} 4 ${-7 * s} -1`}
      fill="none"
      stroke="var(--color-alpine-sage)"
      strokeWidth={1.1}
      strokeLinecap="round"
      style={{ pathLength }}
    />
  );
}

function VineRail({
  spec,
  geometry,
  growth,
  side,
}: {
  spec: RailSpec;
  geometry: RailGeometry;
  growth: MotionValue<number>;
  side: "left" | "right";
}) {
  const { main, strand } = geometry;
  // The thinner strand trails the main stem a little.
  const strandLength = useTransform(growth, [0.05, 0.75], [0, 1]);

  return (
    <div
      className={`absolute inset-y-0 w-11 sm:w-16 lg:w-24 ${
        side === "left" ? "left-0" : "right-0 -scale-x-100"
      }`}
    >
      <svg viewBox="0 0 100 1000" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
        <motion.path
          d={strand.d}
          fill="none"
          stroke="var(--color-alpine-sage)"
          strokeOpacity={0.65}
          strokeWidth={1.4}
          strokeLinecap="round"
          style={{ pathLength: strandLength }}
        />
        <motion.path
          d={main.d}
          fill="none"
          stroke="var(--color-alpine-sage)"
          strokeWidth={2.6}
          strokeLinecap="round"
          style={{ pathLength: growth }}
        />
        {spec.tendrils.map((t) => (
          <Tendril key={`${t.seg}-${t.t}`} anchor={main.at(t.seg, t.t)} flip={t.flip} growth={growth} />
        ))}
      </svg>

      {spec.leaves.map((l) => (
        <Leaf key={`${l.seg}-${l.t}`} anchor={main.at(l.seg, l.t)} angle={l.angle} growth={growth} />
      ))}
      {spec.blossoms.map((b) => (
        <Blossom key={`${b.seg}-${b.t}`} anchor={main.at(b.seg, b.t)} spec={b} growth={growth} />
      ))}
    </div>
  );
}

type ScrollOrchidsProps = {
  /** Vines sprout in once she has stepped inside. */
  revealed?: boolean;
};

export default function ScrollOrchids({ revealed = true }: Readonly<ScrollOrchidsProps>) {
  const reduce = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll();

  const target = useTransform(scrollYProgress, [0, FULL_BLOOM_AT], [RESTING_GROWTH, 1]);
  const smooth = useSpring(target, { stiffness: 70, damping: 22, mass: 0.7 });
  const intro = useMotionValue(0);

  // The first sprout plays once on entry; after that, growth belongs to her scroll.
  useEffect(() => {
    if (!revealed) return;
    if (reduce) {
      intro.set(1);
      return;
    }
    const controls = animate(intro, 1, { duration: 2.6, ease: EASE_DUSK, delay: 0.4 });
    return () => controls.stop();
  }, [revealed, reduce, intro]);

  const growth = useTransform<number, number>([intro, smooth], ([i, g]) => i * g);

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[5] print:hidden"
      initial={false}
      animate={{ opacity: revealed ? 1 : 0 }}
      transition={{ duration: 1.2, ease: EASE_DUSK }}
    >
      <OrchidDefs />
      <VineRail spec={LEFT} geometry={LEFT_GEOMETRY} growth={growth} side="left" />
      <VineRail spec={RIGHT} geometry={RIGHT_GEOMETRY} growth={growth} side="right" />
    </motion.div>
  );
}
