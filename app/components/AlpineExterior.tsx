"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useRef, type CSSProperties, type ReactNode } from "react";
import { usePrefersReducedMotion } from "../lib/motion";

/* ───────────────────────────────────────────────────────────────
   Deterministic scenery. Everything random is seeded at module
   level so server and client paint the exact same dusk.
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

const fx = (n: number) => Number(n.toFixed(1));

const STARS = (() => {
  const rand = mulberry32(23);
  return Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: fx(rand() * 100),
    top: fx(rand() * 42),
    size: rand() > 0.82 ? 2 : 1,
    delay: fx(rand() * 4.8),
  }));
})();

const FIREFLIES = (() => {
  const rand = mulberry32(8);
  return Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: fx(4 + rand() * 92),
    top: fx(8 + rand() * 84),
    size: rand() > 0.6 ? 5 : 3,
    dx: fx((rand() - 0.5) * 70),
    dy: fx(-14 - rand() * 46),
    duration: fx(9 + rand() * 9),
    delay: fx(rand() * 6),
  }));
})();

/* Far ridge — jagged Alpine peaks with snow. viewBox 0 0 1440 420 */
const FAR_RIDGE =
  "M0 420 L0 250 L90 205 L170 230 L260 150 L330 190 L420 110 L520 175 L600 140 L700 60 L790 140 L880 120 L960 170 L1050 95 L1150 160 L1240 130 L1330 185 L1440 150 L1440 420Z";
const SNOWCAPS = [
  "M260 150 L238 170 L248 167 L258 175 L272 168 L295 170Z",
  "M420 110 L392 135 L404 131 L414 140 L428 132 L442 139 L458 135Z",
  "M700 60 L656 95 L672 90 L684 101 L698 92 L712 103 L726 93 L739 95Z",
  "M1050 95 L1018 122 L1030 118 L1041 127 L1055 119 L1068 126 L1092 122Z",
];

/* Mid ridge — rounder shoulders, closer and darker. */
const MID_CREST =
  "M0 290 C80 270 140 230 220 238 C300 246 340 190 420 200 C500 210 540 260 640 250 C740 240 790 180 880 175 C960 170 1010 230 1100 236 C1190 242 1240 205 1330 215 C1390 222 1420 240 1440 245";
const MID_RIDGE = `${MID_CREST} L1440 420 L0 420Z`;

/* Near pine slope — crest sampled from a gentle wave, pines planted along it. */
const crestY = (x: number) =>
  318 + 14 * Math.sin(x / 170) + 8 * Math.sin(x / 61 + 1.3);

const NEAR_SLOPE = (() => {
  const pts: string[] = [];
  for (let x = 0; x <= 1440; x += 30) pts.push(`${x} ${fx(crestY(x))}`);
  return `M0 420 L${pts.join(" L")} L1440 420Z`;
})();

function pinePath(x: number, base: number, h: number) {
  const w = h * 0.46;
  const p = (dx: number, dy: number) => `${fx(x + dx)} ${fx(base - dy)}`;
  return [
    `M${p(0, h)}`,
    `L${p(-w * 0.42, h * 0.58)}`,
    `L${p(-w * 0.22, h * 0.6)}`,
    `L${p(-w * 0.6, h * 0.24)}`,
    `L${p(-w * 0.3, h * 0.26)}`,
    `L${p(-w * 0.5, 0)}`,
    `L${p(w * 0.5, 0)}`,
    `L${p(w * 0.3, h * 0.26)}`,
    `L${p(w * 0.6, h * 0.24)}`,
    `L${p(w * 0.22, h * 0.6)}`,
    `L${p(w * 0.42, h * 0.58)}`,
    "Z",
  ].join(" ");
}

const PINES = (() => {
  const rand = mulberry32(1123);
  const back: string[] = [];
  const front: string[] = [];
  for (let x = 6; x < 1440; x += 16 + rand() * 18) {
    const row = rand() > 0.45 ? front : back;
    const sink = row === front ? 16 + rand() * 14 : 4 + rand() * 6;
    const h = row === front ? 34 + rand() * 22 : 24 + rand() * 14;
    row.push(pinePath(x, crestY(x) + sink, h));
  }
  return { back: back.join(" "), front: front.join(" ") };
})();

/* Meadow hills. viewBox 0 0 1440 300, sliced so flowers stay round. */
const BACK_HILL_CREST =
  "M0 110 C180 70 360 60 560 84 C760 108 900 58 1100 52 C1260 48 1360 70 1440 86";
const BACK_HILL = `${BACK_HILL_CREST} L1440 300 L0 300Z`;
const FRONT_HILL_CREST =
  "M0 192 C200 162 420 150 640 170 C860 188 1040 152 1240 142 C1340 138 1400 148 1440 154";
const FRONT_HILL = `${FRONT_HILL_CREST} L1440 300 L0 300Z`;

const WILDFLOWERS = (() => {
  const rand = mulberry32(2311);
  return Array.from({ length: 70 }, (_, i) => {
    const front = i % 3 === 0;
    return {
      id: i,
      cx: fx(rand() * 1440),
      cy: fx(front ? 196 + rand() * 90 : 118 + rand() * 60),
      r: fx(front ? 2.2 + rand() * 1.8 : 1.2 + rand() * 1.2),
      lilac: rand() > 0.45,
    };
  });
})();

/* ───────────────────────────────────────────────────────────────
   The chalet — a front-gabled Swiss house, lit from within.
   viewBox 0 0 360 260
   ─────────────────────────────────────────────────────────────── */

type WindowProps = {
  x: number;
  y: number;
  w: number;
  h: number;
  delay: number;
  shutters?: boolean;
  box?: boolean;
};

function LitWindow({ x, y, w, h, delay, shutters, box }: WindowProps) {
  return (
    <g>
      {shutters && (
        <>
          <rect x={x - 9} y={y} width={8} height={h} rx={1} fill="var(--color-velvet-plum)" />
          <rect x={x + w + 1} y={y} width={8} height={h} rx={1} fill="var(--color-velvet-plum)" />
          <path
            d={`M${x - 7} ${y + 4} h4 M${x - 7} ${y + 9} h4 M${x - 7} ${y + 14} h4 M${x - 7} ${y + 19} h4 M${x + w + 3} ${y + 4} h4 M${x + w + 3} ${y + 9} h4 M${x + w + 3} ${y + 14} h4 M${x + w + 3} ${y + 19} h4`}
            stroke="var(--color-ink)"
            strokeOpacity={0.35}
            strokeWidth={0.8}
          />
        </>
      )}
      <g className="animate-flicker" style={{ animationDelay: `-${delay}s` }}>
        <rect
          x={x - 4}
          y={y - 4}
          width={w + 8}
          height={h + 8}
          fill="var(--color-ember-gold)"
          opacity={0.55}
          filter="url(#chalet-glow)"
        />
        <rect x={x} y={y} width={w} height={h} fill="url(#chalet-pane)" />
      </g>
      <path
        d={`M${x + w / 2} ${y} V${y + h} M${x} ${y + h * 0.45} H${x + w}`}
        stroke="var(--color-chalet-cedar)"
        strokeWidth={1.6}
      />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="none"
        stroke="var(--color-ink)"
        strokeOpacity={0.55}
        strokeWidth={1.4}
      />
      {box && (
        <g>
          <rect x={x - 3} y={y + h + 1} width={w + 6} height={6} rx={1} fill="var(--color-hearth-terracotta)" />
          {Array.from({ length: Math.round(w / 4) }, (_, i) => (
            <circle
              key={i}
              cx={x - 1 + i * 4.2}
              cy={y + h - 0.5 + (i % 2) * 1.6}
              r={1.9}
              fill={i % 3 === 1 ? "var(--color-orchid-white)" : "var(--color-petal-lilac)"}
            />
          ))}
        </g>
      )}
    </g>
  );
}

function Chalet({ reduce }: { reduce: boolean }) {
  return (
    <svg viewBox="0 0 360 260" className="h-auto w-full overflow-visible" aria-hidden>
      <defs>
        <filter id="chalet-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <linearGradient id="chalet-pane" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--color-ember-gold)" }} />
          <stop offset="100%" style={{ stopColor: "var(--color-dusk-amber)" }} />
        </linearGradient>
        <linearGradient id="chalet-wall" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" style={{ stopColor: "var(--color-chalet-cedar)" }} />
          <stop offset="70%" style={{ stopColor: "var(--color-chalet-cedar)" }} />
          <stop offset="100%" style={{ stopColor: "var(--color-twilight-indigo)" }} />
        </linearGradient>
        <pattern id="chalet-boards" width="8" height="7" patternUnits="userSpaceOnUse">
          <path d="M0 6.5 H8" stroke="var(--color-ink)" strokeOpacity={0.2} strokeWidth={0.7} />
        </pattern>
      </defs>

      {/* Chimney & smoke */}
      <rect x={250} y={34} width={16} height={44} fill="var(--color-twilight-indigo)" />
      <rect x={246} y={29} width={24} height={6} rx={1} fill="var(--color-ink)" />
      {[0, 1, 2].map((i) => (
        <motion.path
          key={i}
          d="M258 26 C252 16 264 10 258 0 C254 -8 262 -14 258 -22"
          fill="none"
          stroke="var(--color-linen)"
          strokeWidth={5 - i}
          strokeLinecap="round"
          initial={false}
          animate={
            reduce
              ? { opacity: 0.18 }
              : { opacity: [0, 0.32, 0], y: [0, -26], x: [0, 6 + i * 4] }
          }
          transition={
            reduce
              ? { duration: 0 }
              : { duration: 6.5, repeat: Infinity, delay: i * 2.1, ease: "easeOut" }
          }
        />
      ))}

      {/* Gable wall */}
      <path d="M44 124 L180 58 L316 124Z" fill="url(#chalet-wall)" />
      <path d="M44 124 L180 58 L316 124Z" fill="url(#chalet-boards)" />
      {/* Arched gable window — the same arch as the photo frame. */}
      <g className="animate-flicker" style={{ animationDelay: "-1.7s" }}>
        <path d="M161 112 V94 A19 19 0 0 1 199 94 V112Z" fill="var(--color-ember-gold)" opacity={0.6} filter="url(#chalet-glow)" />
        <path d="M165 110 V94 A15 15 0 0 1 195 94 V110Z" fill="url(#chalet-pane)" />
      </g>
      <path
        d="M165 110 V94 A15 15 0 0 1 195 94 V110Z M180 79 V110 M165 98 H195"
        fill="none"
        stroke="var(--color-chalet-cedar)"
        strokeWidth={1.6}
      />

      {/* Upper storey */}
      <rect x={48} y={124} width={264} height={50} fill="url(#chalet-wall)" />
      <rect x={48} y={124} width={264} height={50} fill="url(#chalet-boards)" />
      <LitWindow x={72} y={130} w={26} h={30} delay={0.4} />
      <LitWindow x={118} y={130} w={26} h={30} delay={2.6} />
      <LitWindow x={216} y={130} w={26} h={30} delay={1.1} />
      <LitWindow x={262} y={130} w={26} h={30} delay={3.4} />
      <LitWindow x={165} y={128} w={30} h={40} delay={0.9} />

      {/* Roof — deep overhang, sunset catching the bargeboards */}
      <path d="M6 120 L180 38 L354 120 L354 130 L180 50 L6 130Z" fill="var(--color-ink)" />
      <path d="M6 120 L180 38 L354 120" fill="none" stroke="var(--color-dusk-amber)" strokeOpacity={0.55} strokeWidth={1.4} strokeLinejoin="round" />
      <path d="M22 128 L180 54 L338 128" fill="none" stroke="var(--color-chalet-cedar)" strokeWidth={2.2} />
      <rect x={30} y={121} width={300} height={5} fill="var(--color-ink)" fillOpacity={0.75} />

      {/* Balcony with carved railing */}
      <rect x={38} y={146} width={284} height={3} rx={1} fill="var(--color-chalet-cedar)" />
      <rect x={40} y={149} width={280} height={18} fill="var(--color-chalet-cedar)" />
      <rect x={40} y={149} width={280} height={18} fill="var(--color-orchid-white)" fillOpacity={0.06} />
      {Array.from({ length: 23 }, (_, i) => (
        <path
          key={i}
          d={`M${48 + i * 12} 153 c-2.4 0 -2.6 3 -1.2 5 l1.2 4 l1.2 -4 c1.4 -2 1.2 -5 -1.2 -5Z`}
          fill="var(--color-ink)"
          fillOpacity={0.6}
        />
      ))}
      <rect x={34} y={167} width={292} height={5} fill="var(--color-ink)" fillOpacity={0.85} />

      {/* Ground floor */}
      <rect x={52} y={172} width={256} height={58} fill="url(#chalet-wall)" />
      <rect x={52} y={172} width={256} height={58} fill="url(#chalet-boards)" />
      <rect x={52} y={172} width={256} height={58} fill="var(--color-ink)" fillOpacity={0.14} />
      <LitWindow x={74} y={184} w={24} h={26} delay={2.1} shutters box />
      <LitWindow x={122} y={184} w={24} h={26} delay={0.2} shutters box />
      <LitWindow x={214} y={184} w={24} h={26} delay={3.0} shutters box />
      <LitWindow x={262} y={184} w={24} h={26} delay={1.5} shutters box />

      {/* Door, with a lit fanlight */}
      <rect x={164} y={184} width={32} height={46} rx={1.5} fill="var(--color-chalet-cedar)" />
      <rect x={164} y={184} width={32} height={46} rx={1.5} fill="var(--color-ink)" fillOpacity={0.3} />
      <g className="animate-flicker" style={{ animationDelay: "-2.9s" }}>
        <path d="M168 194 A12 9 0 0 1 192 194Z" fill="url(#chalet-pane)" />
      </g>
      <path d="M180 196 V228" stroke="var(--color-ink)" strokeOpacity={0.4} strokeWidth={1} />
      <circle cx={190} cy={210} r={1.4} fill="var(--color-dusk-amber)" />

      {/* Corner posts & stone footing */}
      <rect x={48} y={124} width={5} height={106} fill="var(--color-ink)" fillOpacity={0.4} />
      <rect x={307} y={124} width={5} height={106} fill="var(--color-ink)" fillOpacity={0.5} />
      <rect x={44} y={229} width={272} height={20} fill="var(--color-twilight-indigo)" />
      <path
        d="M44 236 H316 M44 243 H316 M70 229 V236 M110 229 V236 M150 229 V236 M210 229 V236 M250 229 V236 M290 229 V236 M90 236 V243 M130 236 V243 M230 236 V243 M270 236 V243"
        stroke="var(--color-ink)"
        strokeOpacity={0.45}
        strokeWidth={0.8}
      />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────── */

type AlpineExteriorProps = {
  children?: ReactNode;
};

export default function AlpineExterior({ children }: Readonly<AlpineExteriorProps>) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduce = usePrefersReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Farther things travel less: they lag behind the page as she walks on.
  const starsY = useTransform(scrollYProgress, [0, 1], [0, 220]);
  const glowY = useTransform(scrollYProgress, [0, 1], [0, 170]);
  const farY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const midY = useTransform(scrollYProgress, [0, 1], [0, 95]);
  const nearY = useTransform(scrollYProgress, [0, 1], [0, 50]);
  const chaletY = useTransform(scrollYProgress, [0, 1], [0, 18]);

  const parallax = (y: typeof farY) => (reduce ? undefined : { y });

  return (
    <section
      ref={sectionRef}
      id="chalet-exterior"
      aria-labelledby="chalet-heading"
      className="relative flex flex-col overflow-hidden"
      style={{ "--meadow": "clamp(17rem, 46vw, 30rem)" } as CSSProperties}
    >
      {/* ── Backdrop ───────────────────────────────────────────── */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* Sky: night settling in from above, honey at the horizon */}
        <div className="absolute inset-x-0 top-0 bottom-[calc(var(--meadow)*0.5)] bg-linear-to-b from-twilight-indigo from-0% via-velvet-plum/85 via-35% to-bruised-lavender to-70%" />
        <div className="absolute inset-x-0 bottom-[calc(var(--meadow)*0.5)] h-[42%] bg-linear-to-b from-transparent via-dusk-amber/45 to-ember-gold/80" />

        <motion.div style={parallax(starsY)} className="absolute inset-x-0 top-0 h-[60%]">
          {STARS.map((s) => (
            <span
              key={s.id}
              className="absolute animate-twinkle rounded-full bg-orchid-white"
              style={{
                left: `${s.left}%`,
                top: `${s.top}%`,
                width: s.size,
                height: s.size,
                animationDelay: `-${s.delay}s`,
              }}
            />
          ))}
        </motion.div>

        {/* Low sun, already behind the peaks */}
        <motion.div
          style={parallax(glowY)}
          className="absolute bottom-[calc(var(--meadow)*0.7)] left-1/2 h-[min(36rem,70vw)] w-[min(60rem,140vw)] -translate-x-1/2 translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,var(--color-ember-gold),transparent)] opacity-70 blur-2xl"
        />

        {/* Far ridge */}
        <motion.div
          style={parallax(farY)}
          className="absolute bottom-[calc(var(--meadow)*0.62)] left-1/2 w-[max(100%,56rem)] -translate-x-1/2"
        >
          <svg viewBox="0 0 1440 420" className="block h-auto w-full">
            <path d={FAR_RIDGE} fill="var(--color-twilight-indigo)" fillOpacity={0.5} />
            {SNOWCAPS.map((d) => (
              <path key={d} d={d} fill="var(--color-orchid-white)" fillOpacity={0.55} />
            ))}
          </svg>
        </motion.div>

        {/* Mid ridge */}
        <motion.div
          style={parallax(midY)}
          className="absolute bottom-[calc(var(--meadow)*0.5)] left-1/2 w-[max(100%,56rem)] -translate-x-1/2"
        >
          <svg viewBox="0 0 1440 420" className="block h-auto w-full">
            <defs>
              <linearGradient id="alp-mid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: "var(--color-twilight-indigo)", stopOpacity: 0.82 }} />
                <stop offset="100%" style={{ stopColor: "var(--color-twilight-indigo)" }} />
              </linearGradient>
            </defs>
            <path d={MID_RIDGE} fill="url(#alp-mid)" />
            <path d={MID_CREST} fill="none" stroke="var(--color-ember-gold)" strokeOpacity={0.3} strokeWidth={1.5} />
          </svg>
        </motion.div>

        {/* Near pine slope */}
        <motion.div
          style={parallax(nearY)}
          className="absolute bottom-[calc(var(--meadow)*0.4)] left-1/2 w-[max(100%,56rem)] -translate-x-1/2"
        >
          <svg viewBox="0 0 1440 420" className="block h-auto w-full">
            <defs>
              <linearGradient id="alp-near" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: "var(--color-alpine-sage)" }} />
                <stop offset="100%" style={{ stopColor: "var(--color-twilight-indigo)" }} />
              </linearGradient>
            </defs>
            <path d={PINES.back} fill="var(--color-alpine-sage)" fillOpacity={0.75} />
            <path d={NEAR_SLOPE} fill="url(#alp-near)" />
            <path d={PINES.front} fill="var(--color-twilight-indigo)" fillOpacity={0.7} />
          </svg>
        </motion.div>

        {/* Golden motes over the meadow */}
        <div className="absolute inset-x-0 bottom-0 h-[70%]">
          {FIREFLIES.map((f) => (
            <motion.span
              key={f.id}
              className="absolute rounded-full bg-ember-gold shadow-[0_0_12px_3px] shadow-ember-gold/70"
              style={{ left: `${f.left}%`, top: `${f.top}%`, width: f.size, height: f.size }}
              initial={false}
              animate={
                reduce
                  ? { opacity: 0.6 }
                  : {
                      x: [0, f.dx * 0.4, f.dx, f.dx * 0.6, 0],
                      y: [0, f.dy * 0.6, f.dy, f.dy * 0.3, 0],
                      opacity: [0, 0.95, 0.35, 0.9, 0],
                    }
              }
              transition={
                reduce
                  ? { duration: 0 }
                  : {
                      duration: f.duration,
                      delay: f.delay,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }
              }
            />
          ))}
        </div>
      </div>

      {/* ── Foreground content (carousel & words) ───────────────── */}
      <div className="relative z-10 flex-1">{children}</div>

      {/* ── Meadow & chalet ─────────────────────────────────────── */}
      <div aria-hidden className="pointer-events-none relative h-(--meadow) shrink-0">
        <svg
          viewBox="0 0 1440 300"
          preserveAspectRatio="xMidYMax slice"
          className="absolute inset-0 size-full"
        >
          <defs>
            <linearGradient id="alp-back-hill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--color-alpine-sage)" }} />
              <stop offset="100%" style={{ stopColor: "var(--color-twilight-indigo)", stopOpacity: 0.9 }} />
            </linearGradient>
          </defs>
          <path d={BACK_HILL} fill="url(#alp-back-hill)" />
          <path d={BACK_HILL_CREST} fill="none" stroke="var(--color-ember-gold)" strokeOpacity={0.45} strokeWidth={1.4} />
          {WILDFLOWERS.filter((w) => w.cy < 190).map((w) => (
            <circle
              key={w.id}
              cx={w.cx}
              cy={w.cy}
              r={w.r}
              fill={w.lilac ? "var(--color-petal-lilac)" : "var(--color-orchid-white)"}
              fillOpacity={0.7}
            />
          ))}
        </svg>

        {/* Light spilling from the windows onto the grass */}
        <div className="absolute bottom-[24%] left-1/2 h-[30%] w-[min(34rem,90vw)] -translate-x-[40%] rounded-[50%] bg-ember-gold/45 blur-2xl lg:left-[66%]" />

        <motion.div
          style={parallax(chaletY)}
          className="absolute bottom-[38%] left-1/2 w-[clamp(13rem,36vw,23rem)] -translate-x-[40%] lg:left-[66%]"
        >
          <Chalet reduce={reduce} />
        </motion.div>

        <svg
          viewBox="0 0 1440 300"
          preserveAspectRatio="xMidYMax slice"
          className="absolute inset-0 size-full"
        >
          <defs>
            <linearGradient id="alp-front-hill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--color-alpine-sage)" }} />
              <stop offset="55%" style={{ stopColor: "var(--color-alpine-sage)", stopOpacity: 0.85 }} />
              <stop offset="100%" style={{ stopColor: "var(--color-linen)" }} />
            </linearGradient>
          </defs>
          <path d={FRONT_HILL} fill="url(#alp-front-hill)" />
          <path d={FRONT_HILL_CREST} fill="none" stroke="var(--color-ember-gold)" strokeOpacity={0.35} strokeWidth={1.2} />
          {WILDFLOWERS.filter((w) => w.cy >= 190).map((w) => (
            <circle
              key={w.id}
              cx={w.cx}
              cy={w.cy}
              r={w.r}
              fill={w.lilac ? "var(--color-petal-lilac)" : "var(--color-orchid-white)"}
              fillOpacity={0.85}
            />
          ))}
        </svg>

        {/* Melt into the linen of the garden below */}
        <div className="absolute inset-x-0 bottom-0 h-[38%] bg-linear-to-b from-transparent to-linen" />
      </div>

      {/* Linen paper tooth over the whole scene */}
      <div aria-hidden className="paper-grain pointer-events-none absolute inset-0 opacity-25 mix-blend-multiply" />

      {/* Scroll cue */}
      <a
        href="#garden"
        className="group absolute inset-x-0 bottom-5 z-10 mx-auto flex w-fit flex-col items-center gap-1 rounded-full px-4 py-2 font-mono text-[0.65rem] tracking-[0.28em] text-ink/60 uppercase transition-colors hover:text-velvet-plum focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dusk-amber"
      >
        Down to the garden
        <motion.span
          aria-hidden
          animate={reduce ? undefined : { y: [0, 4, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="size-4" />
        </motion.span>
      </a>
    </section>
  );
}
