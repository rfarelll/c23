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

/**
 * Both vines hang from the top edge and reach the bottom edge (y = 0 → 1000 of the
 * viewBox), so at full growth they span the whole viewport. Blossoms are placed by
 * height; their bloom band is derived from where they sit (see BLOOM_BANDS).
 */
const LEFT: RailSpec = {
  main: {
    start: [16, -10],
    segs: [
      [[40, 60], [8, 110], [26, 170]],
      [[44, 230], [10, 280], [30, 340]],
      [[48, 400], [12, 450], [32, 510]],
      [[50, 570], [14, 620], [34, 680]],
      [[46, 740], [12, 790], [30, 850]],
      [[46, 910], [20, 960], [36, 1010]],
    ],
  },
  strand: {
    start: [6, -10],
    segs: [
      [[24, 50], [30, 130], [12, 230]],
      [[0, 300], [30, 380], [18, 450]],
      [[8, 520], [34, 580], [20, 680]],
      [[10, 740], [30, 820], [16, 900]],
    ],
  },
  blossoms: [
    // top
    { seg: 0, t: 0.7, size: "md", tilt: 8 },
    { seg: 0, t: 1, size: "lg", tilt: -6 },
    // upper-mid
    { seg: 1, t: 0.5, size: "sm", tilt: -10, bud: true },
    { seg: 1, t: 1, size: "md", tilt: 12 },
    { seg: 2, t: 0.45, size: "lg", tilt: -4 },
    // lower-mid
    { seg: 2, t: 1, size: "md", tilt: 10 },
    { seg: 3, t: 0.6, size: "lg", tilt: -12 },
    // bottom
    { seg: 4, t: 0.45, size: "md", tilt: 6 },
    { seg: 4, t: 1, size: "lg", tilt: -8 },
    { seg: 5, t: 0.6, size: "sm", tilt: 14, bud: true },
  ],
  leaves: [
    { seg: 0, t: 0.4, angle: 36 },
    { seg: 1, t: 0.25, angle: 48 },
    { seg: 1, t: 0.75, angle: 28 },
    { seg: 2, t: 0.7, angle: 42 },
    { seg: 3, t: 0.25, angle: 34 },
    { seg: 3, t: 0.85, angle: 50 },
    { seg: 4, t: 0.7, angle: 30 },
    { seg: 5, t: 0.35, angle: 44 },
  ],
  tendrils: [
    { seg: 0, t: 0.85 },
    { seg: 1, t: 0.15, flip: true },
    { seg: 2, t: 0.8 },
    { seg: 3, t: 0.15, flip: true },
    { seg: 4, t: 0.85 },
  ],
};

const RIGHT: RailSpec = {
  main: {
    start: [22, -10],
    segs: [
      [[44, 50], [8, 130], [24, 190]],
      [[42, 250], [10, 310], [30, 370]],
      [[50, 430], [14, 490], [34, 550]],
      [[52, 610], [16, 670], [32, 730]],
      [[44, 780], [12, 830], [28, 890]],
      [[40, 940], [22, 980], [38, 1010]],
    ],
  },
  strand: {
    start: [8, -10],
    segs: [
      [[26, 60], [28, 150], [10, 250]],
      [[0, 320], [32, 400], [20, 490]],
      [[8, 560], [32, 640], [18, 730]],
      [[6, 790], [30, 860], [14, 920]],
    ],
  },
  blossoms: [
    // top
    { seg: 0, t: 0.55, size: "sm", tilt: 14, bud: true },
    { seg: 0, t: 1, size: "lg", tilt: 6 },
    // upper-mid
    { seg: 1, t: 0.5, size: "md", tilt: -8 },
    { seg: 1, t: 1, size: "lg", tilt: 10 },
    // lower-mid
    { seg: 2, t: 1, size: "md", tilt: -6 },
    { seg: 3, t: 0.5, size: "lg", tilt: 12 },
    // bottom
    { seg: 3, t: 1, size: "md", tilt: -10 },
    { seg: 4, t: 0.55, size: "lg", tilt: 8 },
    { seg: 4, t: 1, size: "md", tilt: -12 },
    { seg: 5, t: 0.55, size: "sm", tilt: 12, bud: true },
  ],
  leaves: [
    { seg: 0, t: 0.3, angle: 32 },
    { seg: 1, t: 0.2, angle: 46 },
    { seg: 1, t: 0.7, angle: 26 },
    { seg: 2, t: 0.35, angle: 40 },
    { seg: 3, t: 0.2, angle: 30 },
    { seg: 3, t: 0.8, angle: 48 },
    { seg: 4, t: 0.25, angle: 34 },
    { seg: 5, t: 0.3, angle: 42 },
  ],
  tendrils: [
    { seg: 0, t: 0.25, flip: true },
    { seg: 1, t: 0.85 },
    { seg: 2, t: 0.2, flip: true },
    { seg: 3, t: 0.9 },
    { seg: 4, t: 0.2, flip: true },
  ],
};

type RailGeometry = {
  main: ReturnType<typeof measureVine>;
  strand: ReturnType<typeof measureVine>;
};

const LEFT_GEOMETRY: RailGeometry = { main: measureVine(LEFT.main), strand: measureVine(LEFT.strand) };
const RIGHT_GEOMETRY: RailGeometry = { main: measureVine(RIGHT.main), strand: measureVine(RIGHT.strand) };

/** Vine already showing at scroll 0, so the tips peek in at the top. */
const HEAD_START = 0.08;

/**
 * Bloom bands, in growth (vine-length) terms: top, upper-mid, lower-mid, bottom.
 * A blossom opens inside the band its height falls in, but never before the
 * growing vine tip has actually reached it.
 */
const BLOOM_BANDS: readonly (readonly [number, number])[] = [
  [0.05, 0.25],
  [0.25, 0.5],
  [0.5, 0.75],
  [0.72, 0.98],
];

function bandFor(f: number): readonly [number, number] {
  let band = BLOOM_BANDS[0];
  for (const candidate of BLOOM_BANDS) if (f >= candidate[0]) band = candidate;
  return band;
}

const BLOSSOM_SIZE = {
  lg: "size-10 sm:size-14 md:size-[4.5rem]",
  md: "size-9 sm:size-12 md:size-16",
  sm: "size-7 sm:size-10 md:size-12",
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
  const [bandStart, bandEnd] = bandFor(f);
  // Wait for the vine tip, then unfurl across the rest of the band (at least a short beat).
  const openStart = Math.max(bandStart, f);
  const openEnd = Math.min(Math.max(bandEnd, openStart + 0.06), 1);
  const open = useTransform(growth, [openStart, openEnd], [0, 1]);
  const appear = useTransform(growth, [f - 0.04, f], [0, 1]);
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
      className="absolute h-2.5 w-6 -translate-y-1/2 sm:h-3.5 sm:w-9 md:h-5 md:w-12"
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
  const strandLength = useTransform(growth, [HEAD_START, 1], [0, 1]);

  return (
    <div
      className={`absolute inset-y-0 w-14 sm:w-20 md:w-24 ${
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

  // Window scroll, no target: 0 at the top of the document, 1 at its very bottom.
  const target = useTransform(scrollYProgress, [0, 1], [HEAD_START, 1]);
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

  const growth = useTransform<number, number>([intro, reduce ? target : smooth], ([i, g]) => i * g);

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-30 print:hidden"
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
