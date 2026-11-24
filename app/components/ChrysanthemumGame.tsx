"use client";

/* ═══════════════════════════════════════════════════════════════════
   BIRTHDAY_LETTER_TEXT — the letter revealed under the 23rd petal.

   Overwrite freely. Separate paragraphs with a blank line; a single
   line break inside a paragraph is kept as-is. The same text is used
   on screen and in the downloadable PDF.
   ═══════════════════════════════════════════════════════════════════ */
const BIRTHDAY_LETTER_TEXT = `Dear Marchi,

If you're reading this, you've plucked every last petal — twenty-three of them, one for each year you've been out here making the world a little softer.

I wanted this to feel like an evening at a chalet: the lights low, the music on, nowhere else to be. Because that's what being with you feels like. Calm in a way I didn't know I was missing until you walked in.

This year, I hope you get the slow mornings and the loud laughs. I hope the things you've been quietly working on finally bloom, and that you let yourself be proud of them out loud. I hope you're surrounded by people who see you the way I do.

And on the days that feel heavy, I hope you remember this little garden — and that somebody planted all of it, petal by petal, just for you.

Happy 23rd birthday, my favorite person.

With so much love,
Ayeeel`;


import type confettiType from "canvas-confetti";
import {
  AnimatePresence,
  animate,
  motion,
  useAnimationControls,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
  type Transition,
} from "framer-motion";
import { Download, Flower2, LoaderCircle, MailOpen, RotateCcw, Sun, X } from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  EASE_DUSK,
  SPRING_SOFT,
  SPRING_TACTILE,
  rise,
  smoothScrollTo,
  stagger,
  usePrefersReducedMotion,
} from "../lib/motion";
import { AnemoneArt, LilyOfTheValleyArt } from "./BotanicalAccents";

const PDF_FILENAME = "Happy-23rd-Birthday-Marchi.pdf";
const TOTAL_PETALS = 23;

/**
 * Hex mirrors of the @theme tokens, for the two places that can't read CSS
 * variables: canvas-confetti and jsPDF. Keep in sync with app/globals.css.
 */
const THEME_HEX = {
  velvetPlum: "#5B2A4E",
  bruisedLavender: "#9B8BB4",
  petalLilac: "#C8BBD9",
  duskAmber: "#D9A05B",
  emberGold: "#E8B878",
  orchidWhite: "#FFFDF9",
  ink: "#3A2335",
} as const;

const CONFETTI_COLORS = [
  THEME_HEX.velvetPlum,
  THEME_HEX.bruisedLavender,
  THEME_HEX.petalLilac,
  THEME_HEX.duskAmber,
  THEME_HEX.emberGold,
  THEME_HEX.orchidWhite,
];

const LETTER_PARAGRAPHS = BIRTHDAY_LETTER_TEXT.trim().split(/\n\s*\n/);

/* ───────────────────────────────────────────────────────────────
   Flower geometry — seeded so server and client agree.
   viewBox 0 0 400 580, head centred at (CX, CY).
   ─────────────────────────────────────────────────────────────── */

const CX = 200;
const CY = 210;

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

type Petal = {
  id: number;
  ring: "outer" | "inner";
  angle: number;
  length: number;
  d: string;
  veins: string;
  /** Centre of the petal blade, in viewBox units. */
  mid: { x: number; y: number };
};

/** A spoon-shaped chrysanthemum ray with a soft notch at the tip and a slight bend. */
function petalPath(L: number, w: number, bend: number) {
  const b = bend;
  return [
    "M0 0",
    `C${r1(-w + b * 0.4)} ${r1(-L * 0.32)} ${r1(-w * 1.08 + b)} ${r1(-L * 0.78)} ${r1(b - w * 0.32)} ${r1(-L)}`,
    `Q${r1(b)} ${r1(-L * 0.93)} ${r1(b + w * 0.32)} ${r1(-L)}`,
    `C${r1(w * 1.08 + b)} ${r1(-L * 0.78)} ${r1(w + b * 0.4)} ${r1(-L * 0.32)} 0 0Z`,
  ].join(" ");
}

function veinPath(L: number, w: number, bend: number) {
  return [
    `M0 -4 Q${r1(bend * 0.5)} ${r1(-L * 0.5)} ${r1(bend)} ${r1(-L * 0.88)}`,
    `M${r1(-w * 0.15)} ${r1(-L * 0.18)} Q${r1(-w * 0.5 + bend * 0.5)} ${r1(-L * 0.5)} ${r1(-w * 0.45 + bend)} ${r1(-L * 0.8)}`,
    `M${r1(w * 0.15)} ${r1(-L * 0.18)} Q${r1(w * 0.5 + bend * 0.5)} ${r1(-L * 0.5)} ${r1(w * 0.45 + bend)} ${r1(-L * 0.8)}`,
  ].join(" ");
}

const PETALS: Petal[] = (() => {
  const rand = mulberry32(2323);
  const make = (id: number, ring: Petal["ring"], baseAngle: number, L0: number, w0: number): Petal => {
    const angle = r1(baseAngle + (rand() - 0.5) * 7);
    const length = r1(L0 * (0.92 + rand() * 0.14));
    const w = r1(w0 * (0.9 + rand() * 0.2));
    const bend = r1((rand() - 0.5) * 10);
    const rad = (angle * Math.PI) / 180;
    return {
      id,
      ring,
      angle,
      length,
      d: petalPath(length, w, bend),
      veins: veinPath(length, w, bend),
      mid: {
        x: r1(CX + Math.sin(rad) * length * 0.55),
        y: r1(CY - Math.cos(rad) * length * 0.55),
      },
    };
  };
  const outer = Array.from({ length: 13 }, (_, i) => make(i, "outer", (i * 360) / 13, 128, 17));
  const inner = Array.from({ length: 10 }, (_, i) => make(13 + i, "inner", i * 36 + 14, 86, 14));
  return [...outer, ...inner];
})();

/** The button plucks in this order: steps of 10 around 23 visit every petal, mixing rings. */
const PLUCK_ORDER = Array.from({ length: TOTAL_PETALS }, (_, k) => (k * 10) % TOTAL_PETALS);

/** Phyllotaxis florets for the stamen disc. */
const FLORETS = Array.from({ length: 110 }, (_, i) => {
  const r = 3.05 * Math.sqrt(i + 0.5);
  const t = i * 2.39996;
  return {
    i,
    x: r1(CX + Math.cos(t) * r),
    y: r1(CY + Math.sin(t) * r),
    size: r1(1.25 + (r / 32) * 0.9),
    tone: r > 24 ? "outer" : r > 12 ? "mid" : "inner",
  };
});

const LEAF =
  "M0 0 C10 -14 28 -20 40 -16 C44 -25 56 -27 63 -20 C71 -25 83 -21 85 -12 C93 -10 97 -4 95 2 C85 8 71 10 59 8 C47 14 31 12 21 8 C12 8 4 4 0 0Z";
const LEAF_VEINS = "M2 0 C30 -4 60 -4 92 -2 M30 -3 L40 -14 M52 -3 L62 -18 M70 -3 L82 -12 M36 -2 L30 8 M58 -2 L58 8";

/* ───────────────────────────────────────────────────────────────
   PDF — real, selectable text via jsPDF, never a screenshot.
   ─────────────────────────────────────────────────────────────── */

/** jsPDF's built-in fonts speak Latin-1; fold typographic marks into it. */
function toLatin1(text: string) {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\u0000-ÿ]/g, "");
}

async function downloadLetterPdf() {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 22;
  const textWidth = W - M * 2;
  const bodySize = 11.5;
  const lineH = bodySize * 0.3528 * 1.6;

  doc.setProperties({ title: "Happy 23rd Birthday, Marchi", subject: "A letter for Marsha Syarina Putri" });

  // Plum header with a gold fillet.
  doc.setFillColor(THEME_HEX.velvetPlum);
  doc.rect(0, 0, W, 42, "F");
  doc.setFillColor(THEME_HEX.duskAmber);
  doc.rect(0, 42, W, 1.4, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setCharSpace(1.4);
  doc.setTextColor(THEME_HEX.emberGold);
  doc.text("FOR MARSHA SYARINA PUTRI  ·  TWENTY-THREE", M, 17);
  doc.setCharSpace(0);
  doc.setFont("times", "bolditalic");
  doc.setFontSize(25);
  doc.setTextColor(THEME_HEX.orchidWhite);
  doc.text("Happy 23rd Birthday, Marchi", M, 31);

  const continuationHeader = () => {
    doc.addPage();
    doc.setFillColor(THEME_HEX.velvetPlum);
    doc.rect(0, 0, W, 9, "F");
    doc.setFillColor(THEME_HEX.duskAmber);
    doc.rect(0, 9, W, 0.8, "F");
    return 26;
  };

  let y = 60;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(bodySize);
  doc.setTextColor(THEME_HEX.ink);

  for (const paragraph of LETTER_PARAGRAPHS) {
    const lines = doc.splitTextToSize(toLatin1(paragraph), textWidth) as string[];
    for (const line of lines) {
      if (y > H - M - 8) {
        y = continuationHeader();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(bodySize);
        doc.setTextColor(THEME_HEX.ink);
      }
      doc.text(line, M, y);
      y += lineH;
    }
    y += lineH * 0.65;
  }

  // Page numbers in gold.
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(THEME_HEX.duskAmber);
    doc.text(`${p} / ${pages}`, W / 2, H - 11, { align: "center" });
  }

  doc.save(PDF_FILENAME);
}

/* ───────────────────────────────────────────────────────────────
   Particles
   ─────────────────────────────────────────────────────────────── */

type Falling = { key: number; petal: Petal; side: number; spin: number };
/** Where a petal starts its fly-back: scattered below the flower, as if it had just landed. */
type Flight = { x: number; y: number; rotate: number; delay: number };

/** Rewind timing: ~25ms stagger, ~0.85s flight, ~1.4s overall. */
const REWIND_STAGGER = 0.025;
const REWIND_FLIGHT = 0.85;
const REWIND_TOTAL_MS = 1400;
type Spark = { dx: number; dy: number; r: number; gold: boolean; star: boolean; delay: number };
type Burst = { key: number; x: number; y: number; sparks: Spark[] };

function makeBurst(key: number, x: number, y: number): Burst {
  const sparks = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2 + Math.random() * 0.45;
    const dist = 26 + Math.random() * 42;
    return {
      dx: Math.cos(a) * dist,
      dy: Math.sin(a) * dist,
      r: 1.4 + Math.random() * 2.2,
      gold: i % 2 === 0,
      star: i % 4 === 0,
      delay: Math.random() * 0.08,
    };
  });
  return { key, x, y, sparks };
}

const STAR = "M0 -5 L1.2 -1.2 L5 0 L1.2 1.2 L0 5 L-1.2 1.2 L-5 0 L-1.2 -1.2Z";

function SparkBurst({ burst, onDone }: Readonly<{ burst: Burst; onDone: (key: number) => void }>) {
  return (
    <g transform={`translate(${burst.x} ${burst.y})`} pointerEvents="none">
      {burst.sparks.map((s, i) => (
        <motion.g
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
          animate={{ x: s.dx, y: s.dy, opacity: [1, 1, 0], scale: [0, 1.25, 0.5] }}
          transition={{ duration: 0.95, delay: s.delay, ease: [0.16, 1, 0.3, 1] }}
          onAnimationComplete={i === 0 ? () => onDone(burst.key) : undefined}
        >
          {s.star ? (
            <path d={STAR} fill="var(--color-ember-gold)" transform={`scale(${(s.r / 3).toFixed(2)})`} />
          ) : (
            <circle r={s.r} fill={s.gold ? "var(--color-dusk-amber)" : "var(--color-petal-lilac)"} />
          )}
        </motion.g>
      ))}
    </g>
  );
}

/** One lineless ray: flat tone, a soft shading gradient, and faint grooves (no outline). */
function PetalShape({ petal, p }: Readonly<{ petal: Petal; p: string }>) {
  const outer = petal.ring === "outer";
  return (
    <>
      <path d={petal.d} fill={outer ? "var(--color-bruised-lavender)" : "var(--color-petal-lilac)"} />
      <path d={petal.d} fill={`url(#${p}-shade-${petal.ring})`} />
      <path d={petal.veins} fill="none" stroke="var(--color-velvet-plum)" strokeOpacity={0.14} strokeWidth={0.6} strokeLinecap="round" />
    </>
  );
}

function FallingPetal({ item, p, onDone }: Readonly<{ item: Falling; p: string; onDone: (key: number) => void }>) {
  const { petal, side, spin } = item;
  return (
    <motion.g
      pointerEvents="none"
      initial={{ x: 0, y: 0, rotate: 0, scaleX: 1, opacity: 1 }}
      animate={{
        // Gravity pulls steadily; air catches the blade and swings it side to side.
        y: [0, 26, 92, 190, 300],
        x: [0, side * 22, side * -8, side * 34, side * 18],
        rotate: [0, spin * 0.35, -spin * 0.15, spin * 0.7, spin],
        scaleX: [1, 0.45, 1, -0.6, 0.85],
        opacity: [1, 1, 1, 0.75, 0],
      }}
      transition={{ duration: 2.9, times: [0, 0.18, 0.45, 0.75, 1], ease: "easeInOut" }}
      onAnimationComplete={() => onDone(item.key)}
    >
      <g transform={`translate(${CX} ${CY}) rotate(${petal.angle})`}>
        <PetalShape petal={petal} p={p} />
      </g>
    </motion.g>
  );
}

/* ───────────────────────────────────────────────────────────────
   Letter modal
   ─────────────────────────────────────────────────────────────── */

type Origin = { x: number; y: number };

function LetterModal({
  origin,
  onClose,
}: Readonly<{ origin: Origin; onClose: () => void }>) {
  const reduce = usePrefersReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, []);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !dialogRef.current) return;
    const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const onDownload = async () => {
    setSaving(true);
    setSaveFailed(false);
    try {
      await downloadLetterPdf();
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  };

  // Start where the last petal was, relative to the viewport centre.
  const fromX = origin.x - (typeof window === "undefined" ? 0 : window.innerWidth / 2);
  const fromY = origin.y - (typeof window === "undefined" ? 0 : window.innerHeight / 2);

  return (
    <motion.div
      className="fixed inset-0 z-[55] grid place-items-center px-4 py-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: EASE_DUSK }}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close letter"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-twilight-indigo/45 backdrop-blur-md"
      />

      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="letter-title"
        onKeyDown={onKeyDown}
        className="relative flex h-[min(75vh,46rem)] max-h-[75vh] w-full max-w-xl flex-col overflow-hidden rounded-[1.75rem] border border-bruised-lavender/40 bg-linen/90 shadow-2xl shadow-twilight-indigo/40 backdrop-blur-xl"
        initial={
          reduce
            ? { opacity: 0 }
            : { opacity: 0.2, scale: 0.06, x: fromX, y: fromY, rotate: -18, borderRadius: "50% 50% 46% 46% / 70% 70% 30% 30%" }
        }
        animate={{ opacity: 1, scale: 1, x: 0, y: 0, rotate: 0, borderRadius: "28px 28px 28px 28px / 28px 28px 28px 28px" }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 24 }}
        transition={reduce ? { duration: 0.2 } : { ...SPRING_SOFT, opacity: { duration: 0.35 } }}
      >
        {/* The petal's colour, dissolving into linen as it opens */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-linear-to-b from-petal-lilac to-bruised-lavender"
          initial={{ opacity: reduce ? 0 : 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: EASE_DUSK }}
        />
        <div aria-hidden className="paper-grain pointer-events-none absolute inset-0 opacity-20 mix-blend-multiply" />

        {/* Header */}
        <div className="relative flex items-start justify-between gap-4 border-b border-bruised-lavender/25 px-6 pt-6 pb-4 sm:px-9 sm:pt-8">
          <div>
            <p className="font-mono text-[0.62rem] tracking-[0.3em] text-dusk-amber uppercase">
              Under the 23rd petal
            </p>
            <h3
              id="letter-title"
              className="mt-2 font-serif text-[1.7rem] leading-tight text-velvet-plum sm:text-3xl"
              style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 72' }}
            >
              Happy 23rd Birthday, <em className="italic">Marchi</em>
            </h3>
          </div>
          <motion.button
            ref={closeRef}
            type="button"
            onClick={onClose}
            whileTap={reduce ? undefined : { scale: 0.88 }}
            transition={SPRING_TACTILE}
            aria-label="Close letter"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-bruised-lavender/30 bg-linen-deep/80 text-velvet-plum transition-colors hover:bg-petal-lilac/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dusk-amber"
          >
            <X className="size-4" aria-hidden />
          </motion.button>
        </div>

        {/* Scrollable letter body */}
        <div
          tabIndex={0}
          aria-label="Letter text"
          className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6 [mask-image:linear-gradient(to_bottom,transparent,black_1.25rem,black_calc(100%-1.75rem),transparent)] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-dusk-amber/60 sm:px-9"
        >
          <div className="space-y-4 text-[0.98rem] leading-[1.75] whitespace-pre-line text-ink/90">
            {LETTER_PARAGRAPHS.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative flex flex-col items-center gap-2 border-t border-bruised-lavender/25 px-6 py-4 sm:flex-row sm:justify-between sm:px-9">
          <p className="font-mono text-[0.6rem] tracking-[0.22em] text-ink/50 uppercase">
            {saveFailed ? "Couldn’t save — try again" : "Keep a copy"}
          </p>
          <motion.button
            type="button"
            onClick={onDownload}
            disabled={saving}
            whileHover={reduce || saving ? undefined : { y: -2 }}
            whileTap={reduce || saving ? undefined : { scale: 0.96, y: 0 }}
            transition={SPRING_TACTILE}
            className="flex items-center gap-2 rounded-full bg-velvet-plum px-5 py-2.5 text-sm text-linen shadow-lg shadow-velvet-plum/30 transition-shadow hover:shadow-xl hover:shadow-dusk-amber/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dusk-amber disabled:opacity-70"
          >
            {saving ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            ) : (
              <Download className="size-4" aria-hidden />
            )}
            {saving ? "Preparing PDF…" : "Download Letter as PDF"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   The garden world.

   One 1600 × 1000 storybook scene, drawn as four stacked layers that
   share the same `xMidYMax slice` framing so they stay registered at
   any viewport shape: far hills → midground beds → the sunlit bloom →
   the foreground floor. A single camera transform pushes in on the
   sunlit bloom; depth of field is a filter on every layer but its own.
   ═══════════════════════════════════════════════════════════════════ */

const WORLD_W = 1600;
const WORLD_H = 1000;
const WORLD_BOX = `0 0 ${WORLD_W} ${WORLD_H}`;
const TAU = Math.PI * 2;

/** The sunlit bloom: head centre in world units, and its scale from flower-local units. */
const HERO = { x: 720, y: 600, k: 0.62 } as const;
/** Outer petal reach in flower-local units, hover lift included. */
const HEAD_REACH = 146;
const HERO_TRANSFORM = `translate(${r1(HERO.x - CX * HERO.k)} ${r1(HERO.y - CY * HERO.k)}) scale(${HERO.k})`;
/** The soil line in flower-local units, so the hero stem runs down below the grass. */
const HERO_ROOT = r1(CY + (WORLD_H + 24 - HERO.y) / HERO.k);

/* ── Camera ─────────────────────────────────────────────────────── */

type Camera = { x: number; y: number; scale: number };
const CAMERA_REST: Camera = { x: 0, y: 0, scale: 1 };

/** A slow dolly: eases off the mark, glides, and settles without overshoot. */
const CAMERA_IN: Transition = { duration: 1.7, ease: [0.65, 0, 0.2, 1] };
const CAMERA_OUT: Transition = { duration: 1.5, ease: [0.45, 0, 0.15, 1] };

/** Depth of field. Same filter structure in every state so Framer can interpolate it. */
const SHARP = "blur(0px) brightness(1) saturate(1)";
const DOF_FAR = "blur(5px) brightness(0.88) saturate(0.8)";
const DOF_MID = "blur(4px) brightness(0.9) saturate(0.85)";
const DOF_NEAR = "blur(3px) brightness(0.88) saturate(0.9)";

/**
 * Where the camera must sit to frame the sunlit bloom in macro: its 23 petals fill the
 * frame (clear of the orchid rails on either edge), head just above centre, so the stem
 * still runs down into the blurred foreground leaves.
 */
function cameraOnHero(w: number, h: number): Camera {
  if (w === 0 || h === 0) return CAMERA_REST;
  // Mirror `xMidYMax slice`: uniform cover scale, centred horizontally, pinned to the bottom.
  const s = Math.max(w / WORLD_W, h / WORLD_H);
  const px = (w - WORLD_W * s) / 2 + HERO.x * s;
  const py = h - WORLD_H * s + HERO.y * s;
  const rail = w < 640 ? 46 : w < 768 ? 66 : 80;
  const head = 2 * HEAD_REACH * HERO.k * s;
  const scale = Math.min(4.2, Math.max(1.5, Math.min(w - rail * 2, h * 0.64) / head));
  // Transform origin is the frame centre: p' = c + t + scale·(p − c).
  return {
    scale,
    x: -(px - w / 2) * scale,
    y: h * 0.46 - h / 2 - (py - h / 2) * scale,
  };
}

/* ── Shared SVG plumbing ────────────────────────────────────────── */

function Stop({ at, c, o = 1 }: Readonly<{ at: string; c: string; o?: number }>) {
  return <stop offset={at} style={{ stopColor: `var(--color-${c})`, stopOpacity: o }} />;
}

/** A gradient-id prefix unique per layer and safe inside `url(#…)`. */
function useSvgPrefix(name: string) {
  return `${name}-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
}

function floretFill(tone: string) {
  if (tone === "outer") return "var(--color-hearth-terracotta)";
  if (tone === "mid") return "var(--color-dusk-amber)";
  return "var(--color-ember-gold)";
}

/** The chrysanthemum's gradients, defined once per layer under prefix `p`. */
function MumDefs({ p }: Readonly<{ p: string }>) {
  return (
    <>
      <linearGradient id={`${p}-shade-outer`} x1="0" y1="1" x2="0" y2="0">
        <Stop at="0%" c="velvet-plum" o={0.5} />
        <Stop at="45%" c="velvet-plum" o={0} />
        <Stop at="85%" c="orchid-white" o={0.12} />
        <Stop at="100%" c="orchid-white" o={0.32} />
      </linearGradient>
      <linearGradient id={`${p}-shade-inner`} x1="0" y1="1" x2="0" y2="0">
        <Stop at="0%" c="dusk-amber" o={0.45} />
        <Stop at="35%" c="velvet-plum" o={0} />
        <Stop at="100%" c="orchid-white" o={0.45} />
      </linearGradient>
      <radialGradient id={`${p}-core`} cx="45%" cy="40%">
        <Stop at="0%" c="ember-gold" />
        <Stop at="60%" c="dusk-amber" />
        <Stop at="100%" c="hearth-terracotta" />
      </radialGradient>
      <radialGradient id={`${p}-glow`}>
        <Stop at="0%" c="ember-gold" o={0.8} />
        <Stop at="100%" c="ember-gold" o={0} />
      </radialGradient>
      <linearGradient id={`${p}-leaf`} x1="0" y1="0" x2="0" y2="1">
        <Stop at="0%" c="alpine-sage" />
        <Stop at="100%" c="twilight-indigo" o={0.8} />
      </linearGradient>
    </>
  );
}

/** Every other floret is plenty at background scale. Coordinates relative to the head centre. */
const BG_FLORETS = FLORETS.filter((f) => f.i % 2 === 0).map((f) => ({
  ...f,
  x: r1(f.x - CX),
  y: r1(f.y - CY),
}));

/** The signature 23-petal bloom, centred on (0 0), for `<use>` across a layer. Lives in <defs>. */
function BloomSymbol({ p }: Readonly<{ p: string }>) {
  return (
    <g id={`${p}-bloom`}>
      {PETALS.map((petal) => (
        <g key={petal.id} transform={`rotate(${petal.angle})`}>
          <path d={petal.d} fill={petal.ring === "outer" ? "var(--color-bruised-lavender)" : "var(--color-petal-lilac)"} />
          <path d={petal.d} fill={`url(#${p}-shade-${petal.ring})`} />
        </g>
      ))}
      <circle r={44} fill={`url(#${p}-glow)`} />
      <circle r={34} fill={`url(#${p}-core)`} />
      {BG_FLORETS.map((f) => (
        <circle key={f.i} cx={f.x} cy={f.y} r={f.size} fill={floretFill(f.tone)} />
      ))}
      <circle cx={-9} cy={-11} r={10} fill="var(--color-orchid-white)" opacity={0.16} />
    </g>
  );
}

/* ── Breeze ─────────────────────────────────────────────────────── */

type BreezeClock = { clock: MotionValue<number>; amp: MotionValue<number> };

/**
 * A sine sway driven by one shared clock. `amp` is a spring, so a sway can calm down or
 * liven up mid-swing without ever jumping.
 */
function Sway({
  clock,
  amp,
  deg,
  period,
  phase,
  originX = 0.5,
  originY = 1,
  children,
}: Readonly<BreezeClock & { deg: number; period: number; phase: number; originX?: number; originY?: number; children: ReactNode }>) {
  const rotate = useTransform(() => deg * amp.get() * Math.sin((clock.get() / period) * TAU + phase));
  return <motion.g style={{ rotate, originX, originY }}>{children}</motion.g>;
}

/* ── Garden geometry (seeded, so server and client agree) ────────── */

/** A scalloped bed of foliage: soft lobes along `baseY`, filled down past the world's floor. */
function foliageBed(seed: number, baseY: number, amp: number, step: number) {
  const rand = mulberry32(seed);
  let x = -60;
  let y = baseY;
  let d = `M${x} ${WORLD_H + 30}L${x} ${y}`;
  while (x < WORLD_W + 60) {
    const w = step * (0.7 + rand() * 0.6);
    const apex = baseY - amp * (0.7 + rand() * 0.6);
    const nx = x + w;
    const ny = baseY + (rand() - 0.5) * amp * 0.35;
    // Control point chosen so the lobe's crown lands exactly on `apex`.
    d += `Q${r1(x + w / 2)} ${r1(apex * 2 - (y + ny) / 2)} ${r1(nx)} ${r1(ny)}`;
    x = nx;
    y = ny;
  }
  return `${d}L${r1(x)} ${WORLD_H + 30}Z`;
}

const BED_BACK = foliageBed(11, 702, 50, 74);
const BED_FRONT = foliageBed(23, 806, 58, 92);

const RIDGE_FAR =
  "M-40 520C120 450 260 430 420 478C560 520 680 440 860 452C1040 464 1160 392 1330 430C1450 456 1540 448 1640 436L1640 1040L-40 1040Z";
const RIDGE_HAZE =
  "M-40 585C140 540 330 560 500 548C700 534 820 590 1010 572C1200 554 1340 520 1640 560L1640 1040L-40 1040Z";
const MEADOW =
  "M-40 640C200 610 380 636 600 622C820 608 1000 646 1220 630C1400 618 1520 628 1640 620L1640 1040L-40 1040Z";
const GROUND =
  "M-40 1040L-40 925C220 896 470 930 720 912C980 894 1240 924 1640 900L1640 1040Z";

/** Distant pines and round shrubs along the meadow's far edge. */
const TREELINE = (() => {
  const rand = mulberry32(919);
  return Array.from({ length: 34 }, (_, i) => {
    const x = r1(-20 + i * 50 + rand() * 30);
    const y = r1(604 + rand() * 10);
    const rx = r1(12 + rand() * 12);
    const ry = r1(22 + rand() * 24);
    const pine = i % 3 !== 1;
    return {
      id: i,
      pine,
      d: pine ? `M${r1(x - rx)} ${r1(y + ry)}Q${x} ${r1(y - ry * 1.7)} ${r1(x + rx)} ${r1(y + ry)}Z` : "",
      x,
      y,
      rx,
      ry,
    };
  });
})();

/** Loose chrysanthemum leaves on the crown of the front bed. */
const BED_LEAVES = (() => {
  const rand = mulberry32(5150);
  return Array.from({ length: 18 }, (_, i) => {
    const x = r1(20 + i * 90 + rand() * 40);
    const y = r1(792 + rand() * 26);
    const right = rand() > 0.5;
    const sc = r1(0.8 + rand() * 0.45);
    const a = Math.round(right ? -20 - rand() * 25 : -160 + rand() * 25);
    return { id: i, t: `translate(${x} ${y}) rotate(${a}) scale(${sc} ${right ? sc : -sc})` };
  });
})();

type Blade = { id: number; d: string; tone: "shade" | "sage" | "lit" };

function bladePath(x: number, base: number, h: number, lean: number, w: number) {
  return [
    `M${r1(x - w)} ${base}`,
    `Q${r1(x - w * 0.15 + lean * 0.35)} ${r1(base - h * 0.55)} ${r1(x + lean)} ${r1(base - h)}`,
    `Q${r1(x + w * 0.55 + lean * 0.4)} ${r1(base - h * 0.5)} ${r1(x + w)} ${base}Z`,
  ].join("");
}

/** Tapered grass, taller round the sunlit bloom's stem so it stands rooted in it. */
const GRASS: Blade[] = (() => {
  const rand = mulberry32(4242);
  const n = 150;
  return Array.from({ length: n }, (_, i) => {
    const x = -30 + (i + rand()) * ((WORLD_W + 60) / n);
    const nearHero = Math.max(0, 1 - Math.abs(x - HERO.x) / 170);
    const h = 60 + rand() * 120 + nearHero * 135;
    const lean = (rand() - 0.5) * 70;
    const w = 5 + rand() * 6;
    const roll = rand();
    return {
      id: i,
      d: bladePath(x, WORLD_H + 14, h, lean, w),
      tone: roll < 0.34 ? "shade" : roll < 0.74 ? "sage" : "lit",
    };
  });
})();
const GRASS_BACK = GRASS.filter((b) => b.tone === "shade");
const GRASS_FRONT = GRASS.filter((b) => b.tone !== "shade");

/** Broad foreground leaves cupping the sunlit bloom's stem. */
const HERO_LEAVES = [
  "translate(690 842) rotate(-150) scale(1.7 -1.7)",
  "translate(745 850) rotate(-32) scale(1.65)",
  "translate(735 910) rotate(-104) scale(1.9 -1.9)",
  "translate(706 905) rotate(-80) scale(2.1)",
  // A second rank rising to just under the head: soft bokeh foliage at the foot of the macro frame.
  "translate(580 872) rotate(-56) scale(1.8)",
  "translate(862 872) rotate(-124) scale(1.8 -1.8)",
  "translate(650 884) rotate(-66) scale(1.9)",
  "translate(792 900) rotate(-116) scale(1.9 -1.9)",
];

type BloomSpec = {
  id: string;
  x: number;
  y: number;
  /** Head scale, flower-local → world. */
  s: number;
  lean: number;
  ground: number;
  deg: number;
  period: number;
  phase: number;
  leaf: 1 | -1;
  opacity?: number;
};

/** Far row: small, hazy, half-lost in the back bed. */
const FAR_BLOOMS: BloomSpec[] = [
  { id: "f1", x: 170, y: 585, s: 0.3, lean: -10, ground: 730, deg: 1.6, period: 6.4, phase: 0.2, leaf: 1, opacity: 0.82 },
  { id: "f2", x: 455, y: 560, s: 0.27, lean: 8, ground: 730, deg: 1.8, period: 7.1, phase: 2.1, leaf: -1, opacity: 0.8 },
  { id: "f3", x: 905, y: 548, s: 0.25, lean: -6, ground: 730, deg: 1.5, period: 6.8, phase: 4.0, leaf: 1, opacity: 0.78 },
  { id: "f4", x: 1045, y: 590, s: 0.3, lean: 10, ground: 730, deg: 1.7, period: 7.6, phase: 1.3, leaf: -1, opacity: 0.84 },
  { id: "f5", x: 1255, y: 565, s: 0.28, lean: -8, ground: 730, deg: 1.6, period: 6.1, phase: 3.2, leaf: 1, opacity: 0.8 },
  { id: "f6", x: 1470, y: 580, s: 0.31, lean: 6, ground: 730, deg: 1.8, period: 7.3, phase: 5.1, leaf: -1, opacity: 0.82 },
];

/** Mid row: rooted in the front bed. */
const MID_BLOOMS: BloomSpec[] = [
  { id: "m1", x: 330, y: 690, s: 0.44, lean: 14, ground: 870, deg: 1.5, period: 6.9, phase: 0.9, leaf: -1 },
  { id: "m2", x: 545, y: 655, s: 0.4, lean: -12, ground: 870, deg: 1.7, period: 5.8, phase: 2.7, leaf: 1 },
  { id: "m3", x: 950, y: 680, s: 0.46, lean: 16, ground: 870, deg: 1.4, period: 7.4, phase: 4.6, leaf: -1 },
  { id: "m4", x: 1150, y: 650, s: 0.4, lean: -10, ground: 870, deg: 1.6, period: 6.3, phase: 1.8, leaf: 1 },
  { id: "m5", x: 1370, y: 700, s: 0.47, lean: 12, ground: 870, deg: 1.5, period: 8.1, phase: 3.9, leaf: -1 },
];

/** Near row: big, close, framing the bed from the foreground grass. */
const NEAR_BLOOMS: BloomSpec[] = [
  { id: "n1", x: 150, y: 700, s: 0.78, lean: 26, ground: 1030, deg: 1.2, period: 7.8, phase: 0.4, leaf: 1 },
  { id: "n2", x: 1465, y: 655, s: 0.72, lean: -24, ground: 1030, deg: 1.3, period: 8.4, phase: 2.4, leaf: -1 },
  { id: "n3", x: 1100, y: 790, s: 0.5, lean: -14, ground: 1030, deg: 1.4, period: 6.6, phase: 5.4, leaf: 1 },
];

/** Gold motes drifting up round the sunlit head, flower-local units. */
const SPARKLES = (() => {
  const rand = mulberry32(77);
  return Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * TAU + rand() * 0.5;
    const r = 118 + rand() * 80;
    return {
      id: i,
      x: r1(CX + Math.cos(a) * r),
      y: r1(CY + Math.sin(a) * r * 0.8),
      size: r1(0.9 + rand() * 1.1),
      star: i % 3 === 0,
      dur: r1(3.2 + rand() * 2.2),
      delay: r1(rand() * 3),
      rest: r1(0.4 + rand() * 1.4),
      drift: Math.round(30 + rand() * 40),
    };
  });
})();

/** The sunbeam, in a frame rotated so "up" points at the sun (upper left). */
const BEAM_WIDE = "M-44 -1000L44 -1000L178 80L-178 80Z";
const BEAM_CORE = "M-14 -1000L14 -1000L74 30L-74 30Z";

/* ── One background chrysanthemum ───────────────────────────────── */

function GardenBloom({ spec, p, clock, amp, onTap }: Readonly<BreezeClock & { spec: BloomSpec; p: string; onTap: () => void }>) {
  const reduce = usePrefersReducedMotion();
  const stem = useAnimationControls();
  const head = useAnimationControls();
  const { x, y, s, lean, ground } = spec;

  // Not this one: a playful shake of the head, a little shrug from the stem.
  const tap = () => {
    onTap();
    if (reduce) return;
    void stem.start({ rotate: [0, -3.2, 2.6, -1.4, 0.5, 0], transition: { duration: 1.15, ease: "easeInOut" } });
    void head.start({
      rotate: [0, -14, 10, -6, 2, 0],
      scale: [1, 0.92, 1.06, 0.99, 1],
      transition: { duration: 1.05, ease: "easeInOut" },
    });
  };

  const cx = x + lean * 0.3;
  const cy = (y + ground) / 2;
  const t = 0.55;
  const lx = r1((1 - t) ** 2 * x + 2 * (1 - t) * t * cx + t * t * (x + lean));
  const ly = r1((1 - t) ** 2 * y + 2 * (1 - t) * t * cy + t * t * ground);
  const ls = r1(s * 0.95);
  const leaf =
    spec.leaf > 0
      ? `translate(${lx} ${ly}) rotate(-30) scale(${ls})`
      : `translate(${lx} ${ly}) rotate(-150) scale(${ls} ${-ls})`;

  return (
    <g opacity={spec.opacity}>
      <Sway clock={clock} amp={amp} deg={spec.deg} period={spec.period} phase={spec.phase}>
        <motion.g animate={stem} style={{ originX: 0.5, originY: 1 }} onClick={tap} className="pointer-events-auto">
          <path
            d={`M${x} ${y}Q${r1(cx)} ${r1(cy)} ${x + lean} ${ground}`}
            fill="none"
            stroke="var(--color-alpine-sage)"
            strokeWidth={r1(Math.max(2.4, 10 * s))}
            strokeLinecap="round"
          />
          <path d={LEAF} transform={leaf} fill={`url(#${p}-leaf)`} />
          <motion.g animate={head} style={{ originX: 0.5, originY: 0.5 }}>
            <use href={`#${p}-bloom`} transform={`translate(${x} ${y}) scale(${s})`} />
          </motion.g>
        </motion.g>
      </Sway>
    </g>
  );
}

/* ── Layers ─────────────────────────────────────────────────────── */

const SLICE = "xMidYMax slice";

/** Layer 1: sky, the sun's glow, and soft rolling ridges. Static, so memoised. */
const FarLayer = memo(function FarLayer() {
  const p = useSvgPrefix("far");
  return (
    <svg aria-hidden focusable="false" viewBox={WORLD_BOX} preserveAspectRatio={SLICE} className="absolute inset-0 size-full">
      <defs>
        <linearGradient id={`${p}-sky`} x1="0" y1="0" x2="0" y2="1">
          <Stop at="0%" c="linen" />
          <Stop at="34%" c="petal-lilac" o={0.38} />
          <Stop at="56%" c="ember-gold" o={0.34} />
          <Stop at="100%" c="linen-deep" />
        </linearGradient>
        <radialGradient id={`${p}-sun`} gradientUnits="userSpaceOnUse" cx="470" cy="40" r="640">
          <Stop at="0%" c="ember-gold" o={0.8} />
          <Stop at="30%" c="ember-gold" o={0.35} />
          <Stop at="100%" c="ember-gold" o={0} />
        </radialGradient>
        <linearGradient id={`${p}-far`} x1="0" y1="0" x2="0" y2="1">
          <Stop at="0%" c="bruised-lavender" o={0.5} />
          <Stop at="100%" c="petal-lilac" o={0.3} />
        </linearGradient>
        <linearGradient id={`${p}-haze`} x1="0" y1="0" x2="0" y2="1">
          <Stop at="0%" c="twilight-indigo" o={0.3} />
          <Stop at="100%" c="bruised-lavender" o={0.25} />
        </linearGradient>
        <linearGradient id={`${p}-meadow`} x1="0" y1="0" x2="0" y2="1">
          <Stop at="0%" c="alpine-sage" o={0.75} />
          <Stop at="40%" c="alpine-sage" />
          <Stop at="100%" c="twilight-indigo" o={0.55} />
        </linearGradient>
      </defs>

      <rect x={-40} y={-40} width={WORLD_W + 80} height={WORLD_H + 80} fill={`url(#${p}-sky)`} />
      <rect x={-40} y={-40} width={WORLD_W + 80} height={WORLD_H + 80} fill={`url(#${p}-sun)`} />
      <path d={RIDGE_FAR} fill={`url(#${p}-far)`} />
      <path d={RIDGE_HAZE} fill={`url(#${p}-haze)`} />
      {TREELINE.map((t) =>
        t.pine ? (
          <path key={t.id} d={t.d} fill="var(--color-twilight-indigo)" fillOpacity={0.26} />
        ) : (
          <ellipse key={t.id} cx={t.x} cy={t.y} rx={t.rx * 1.3} ry={t.ry * 0.8} fill="var(--color-alpine-sage)" fillOpacity={0.55} />
        ),
      )}
      {/* Sun catching the meadow's crest: a warm rim, no outline */}
      <path d={MEADOW} transform="translate(0 -5)" fill="var(--color-ember-gold)" fillOpacity={0.35} />
      <path d={MEADOW} fill={`url(#${p}-meadow)`} />
    </svg>
  );
});

type LayerProps = BreezeClock & { onTap: () => void };

/** Layer 2: the far and mid rows of chrysanthemums, tucked into two foliage beds. */
const MidLayer = memo(function MidLayer({ clock, amp, onTap }: Readonly<LayerProps>) {
  const p = useSvgPrefix("mid");
  return (
    <svg aria-hidden focusable="false" viewBox={WORLD_BOX} preserveAspectRatio={SLICE} className="pointer-events-none absolute inset-0 size-full">
      <defs>
        <MumDefs p={p} />
        <BloomSymbol p={p} />
        <linearGradient id={`${p}-bed-back`} gradientUnits="userSpaceOnUse" x1="0" y1="630" x2="0" y2="880">
          <Stop at="0%" c="alpine-sage" o={0.9} />
          <Stop at="100%" c="twilight-indigo" o={0.55} />
        </linearGradient>
        <linearGradient id={`${p}-bed-front`} gradientUnits="userSpaceOnUse" x1="0" y1="730" x2="0" y2="1000">
          <Stop at="0%" c="alpine-sage" />
          <Stop at="100%" c="twilight-indigo" o={0.85} />
        </linearGradient>
        <linearGradient id={`${p}-mist`} x1="0" y1="0" x2="0" y2="1">
          <Stop at="0%" c="linen" o={0} />
          <Stop at="55%" c="linen" o={0.4} />
          <Stop at="100%" c="linen" o={0} />
        </linearGradient>
      </defs>

      {FAR_BLOOMS.map((b) => (
        <GardenBloom key={b.id} spec={b} p={p} clock={clock} amp={amp} onTap={onTap} />
      ))}
      {/* Atmospheric haze over the far row */}
      <rect x={-40} y={520} width={WORLD_W + 80} height={200} fill={`url(#${p}-mist)`} />

      <path d={BED_BACK} transform="translate(0 -5)" fill="var(--color-ember-gold)" fillOpacity={0.3} />
      <path d={BED_BACK} fill={`url(#${p}-bed-back)`} />

      {MID_BLOOMS.map((b) => (
        <GardenBloom key={b.id} spec={b} p={p} clock={clock} amp={amp} onTap={onTap} />
      ))}

      <path d={BED_FRONT} transform="translate(0 -5)" fill="var(--color-ember-gold)" fillOpacity={0.28} />
      <path d={BED_FRONT} fill={`url(#${p}-bed-front)`} />
      {BED_LEAVES.map((l) => (
        <path key={l.id} d={LEAF} transform={l.t} fill={`url(#${p}-leaf)`} />
      ))}

      {/* Secondary accents, low and quiet in the foliage corners so the chrysanthemums lead */}
      <g opacity={0.55}>
        <g transform="translate(392 742) scale(0.85)">
          <Sway clock={clock} amp={amp} deg={1.4} period={7.2} phase={1.1} originX={0.3}>
            <LilyOfTheValleyArt />
          </Sway>
        </g>
        <g transform="translate(1168 790) scale(0.6)">
          <Sway clock={clock} amp={amp} deg={1.6} period={6.4} phase={3.4}>
            <AnemoneArt />
          </Sway>
        </g>
        <g transform="translate(30 770) scale(0.72)">
          <Sway clock={clock} amp={amp} deg={1.5} period={6.9} phase={0.3}>
            <AnemoneArt />
          </Sway>
        </g>
        <g transform="translate(1590 752) scale(-0.9 0.9)">
          <Sway clock={clock} amp={amp} deg={1.4} period={7.7} phase={2.2} originX={0.3}>
            <LilyOfTheValleyArt />
          </Sway>
        </g>
      </g>
    </svg>
  );
});

/** Layer 4: the garden floor — near blooms, broad leaves round the hero's stem, ground and grass. */
const NearLayer = memo(function NearLayer({ clock, amp, onTap }: Readonly<LayerProps>) {
  const p = useSvgPrefix("near");
  return (
    <svg aria-hidden focusable="false" viewBox={WORLD_BOX} preserveAspectRatio={SLICE} className="pointer-events-none absolute inset-0 size-full">
      <defs>
        <MumDefs p={p} />
        <BloomSymbol p={p} />
        <linearGradient id={`${p}-g-shade`} x1="0" y1="0" x2="0" y2="1">
          <Stop at="0%" c="alpine-sage" o={0.75} />
          <Stop at="100%" c="twilight-indigo" o={0.9} />
        </linearGradient>
        <linearGradient id={`${p}-g-sage`} x1="0" y1="0" x2="0" y2="1">
          <Stop at="0%" c="alpine-sage" />
          <Stop at="100%" c="twilight-indigo" o={0.7} />
        </linearGradient>
        <linearGradient id={`${p}-g-lit`} x1="0" y1="0" x2="0" y2="1">
          <Stop at="0%" c="linen-deep" o={0.85} />
          <Stop at="30%" c="alpine-sage" />
          <Stop at="100%" c="twilight-indigo" o={0.6} />
        </linearGradient>
        <linearGradient id={`${p}-ground`} x1="0" y1="0" x2="0" y2="1">
          <Stop at="0%" c="alpine-sage" />
          <Stop at="100%" c="twilight-indigo" o={0.85} />
        </linearGradient>
        <linearGradient id={`${p}-broad`} x1="0" y1="0" x2="0.4" y2="1">
          <Stop at="0%" c="alpine-sage" />
          <Stop at="65%" c="alpine-sage" />
          <Stop at="100%" c="twilight-indigo" o={0.6} />
        </linearGradient>
      </defs>

      {NEAR_BLOOMS.map((b) => (
        <GardenBloom key={b.id} spec={b} p={p} clock={clock} amp={amp} onTap={onTap} />
      ))}
      {GRASS_BACK.map((b) => (
        <path key={b.id} d={b.d} fill={`url(#${p}-g-shade)`} />
      ))}
      {HERO_LEAVES.map((t) => (
        <g key={t} transform={t}>
          <path d={LEAF} fill={`url(#${p}-broad)`} />
          <path d={LEAF_VEINS} fill="none" stroke="var(--color-orchid-white)" strokeOpacity={0.22} strokeWidth={0.9} strokeLinecap="round" />
        </g>
      ))}
      <path d={GROUND} fill={`url(#${p}-ground)`} />
      {GRASS_FRONT.map((b) => (
        <path key={b.id} d={b.d} fill={`url(#${p}-g-${b.tone})`} />
      ))}
    </svg>
  );
});

/* ───────────────────────────────────────────────────────────────
   The garden
   ─────────────────────────────────────────────────────────────── */

const noopSubscribe = () => () => {};

/** Room the controls need under the garden when framing it on screen. */
const PANEL_HEIGHT = 176;

/** How strongly the sunlit bloom sways in each stage, in degrees. */
const HERO_SWAY = { discover: 2.6, focus: 0.3, bloomed: 1.1 } as const;
const AMP_SPRING = { stiffness: 28, damping: 14, mass: 1 } as const;

function useElementSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((prev) => (prev.w === width && prev.h === height ? prev : { w: width, h: height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

function Garden({ resetKey }: Readonly<{ resetKey: number }>) {
  const reduce = usePrefersReducedMotion();
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const p = useSvgPrefix("hero");

  const viewportRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const pluckRef = useRef<HTMLButtonElement | null>(null);
  const seq = useRef(0);
  const finaleTimer = useRef<number | undefined>(undefined);
  const rewindTimer = useRef<number | undefined>(undefined);
  /** Set when the bloom is chosen from the keyboard: focus follows to the Pluck button. */
  const focusPluck = useRef(false);

  /** Stage 1 → 2: has she found the sunlit bloom? */
  const [chosen, setChosen] = useState(false);
  /** Bumped when a non-chosen bloom is tapped: the sunbeam flares to point the way. */
  const [beckon, setBeckon] = useState(0);
  const [ringVisible, setRingVisible] = useState(false);
  const [plucked, setPlucked] = useState<ReadonlySet<number>>(() => new Set());
  const [falling, setFalling] = useState<Falling[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [letter, setLetter] = useState<Origin | null>(null);
  /** Non-null while petals fly home; keyed by petal id. */
  const [rewind, setRewind] = useState<Readonly<Record<number, Flight>> | null>(null);
  const [tick, setTick] = useState(0);

  const sway = useMotionValue(0);
  const headScale = useMotionValue(1);
  const beckonCtl = useAnimationControls();

  const rewinding = rewind !== null;
  const count = plucked.size;
  // While rewinding, the counter (and the aura that follows it) ticks back down.
  const displayCount = rewinding ? tick : count;
  const progress = displayCount / TOTAL_PETALS;
  const done = count === TOTAL_PETALS;

  /* ── Camera & depth of field ───────────────────────────────── */
  const size = useElementSize(viewportRef);
  // Stage 2 pushes in; the 23rd petal (Stage 3) pulls back out to reveal the whole garden.
  const zoomed = chosen && !done;
  const camera = zoomed ? cameraOnHero(size.w, size.h) : CAMERA_REST;
  const cameraT: Transition = reduce ? { duration: 0 } : zoomed ? CAMERA_IN : CAMERA_OUT;
  const dofT: Transition = reduce ? { duration: 0.3 } : cameraT;

  /* ── Breeze: one clock for the whole garden ─────────────────── */
  const clock = useMotionValue(0);
  const bgAmp = useSpring(1, AMP_SPRING);
  const heroAmp = useSpring(HERO_SWAY.discover, AMP_SPRING);
  const inView = useInView(viewportRef, { margin: "160px 0px" });
  useAnimationFrame((t) => {
    if (inView) clock.set(t / 1000);
  });

  const heroSway = !chosen ? HERO_SWAY.discover : done ? HERO_SWAY.bloomed : HERO_SWAY.focus;
  useEffect(() => {
    if (reduce) {
      bgAmp.jump(0);
      heroAmp.jump(0);
      return;
    }
    // The background holds its breath under the blur; the chosen bloom steadies for plucking.
    bgAmp.set(zoomed ? 0 : 1);
    heroAmp.set(heroSway);
  }, [reduce, zoomed, heroSway, bgAmp, heroAmp]);

  useEffect(
    () => () => {
      window.clearTimeout(finaleTimer.current);
      window.clearTimeout(rewindTimer.current);
    },
    [],
  );

  // Rapid countdown (23 → 0, or from however many were plucked) across the flight.
  useEffect(() => {
    if (!rewind) return;
    let n = Object.keys(rewind).length;
    const id = window.setInterval(() => {
      n -= 1;
      setTick(Math.max(n, 0));
      if (n <= 0) window.clearInterval(id);
    }, reduce ? 1 : (REWIND_TOTAL_MS - 150) / TOTAL_PETALS);
    return () => window.clearInterval(id);
  }, [rewind, reduce]);

  /* ── Stage 1: finding the sunlit bloom ─────────────────────── */

  /** Bring the garden and its controls fully on screen for the push-in. */
  const frameGarden = () => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const block = rect.height + PANEL_HEIGHT;
    if (rect.top >= 0 && rect.top + block <= vh) return;
    const top = Math.max(8, (vh - block) / 2);
    void smoothScrollTo(window.scrollY + rect.top - top, 1.2);
  };

  const choose = (viaKeyboard: boolean) => {
    if (chosen) return;
    focusPluck.current = viaKeyboard;
    setRingVisible(false);
    setChosen(true);
    frameGarden();
  };

  const onHeroClick = () => {
    if (!chosen) choose(false);
  };

  const onHeroKey = (e: ReactKeyboardEvent<SVGGElement>) => {
    if (chosen || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    choose(true);
  };

  // A background bloom was tapped first: it wiggles (in GardenBloom), and the sunbeam
  // flares while the chosen bloom gives a small "over here" lift.
  const onDecoy = useCallback(() => {
    if (chosen) return;
    setBeckon((b) => b + 1);
    if (!reduce) {
      void beckonCtl.start({
        scale: [1, 1.07, 0.985, 1],
        transition: { duration: 1.1, delay: 0.12, ease: "easeInOut" },
      });
    }
  }, [chosen, reduce, beckonCtl]);

  /* ── Stage 3: plucking ─────────────────────────────────────── */

  const recoil = (petal: Petal) => {
    if (reduce) return;
    const dir = Math.sin((petal.angle * Math.PI) / 180);
    animate(sway, 0, { type: "spring", velocity: dir * 46, stiffness: 170, damping: 8 });
    animate(headScale, 1, { type: "spring", velocity: -0.85, stiffness: 300, damping: 13 });
  };

  const finale = async (from: Origin) => {
    const confetti: typeof confettiType = (await import("canvas-confetti")).default;
    const base = {
      colors: CONFETTI_COLORS,
      zIndex: 70,
      disableForReducedMotion: true,
      ticks: 260,
      scalar: 1.05,
    } satisfies confettiType.Options;
    const ox = from.x / window.innerWidth;
    const oy = from.y / window.innerHeight;
    void confetti({ ...base, particleCount: 140, spread: 100, startVelocity: 42, origin: { x: ox, y: oy } });
    void confetti({ ...base, particleCount: 70, angle: 60, spread: 70, startVelocity: 55, origin: { x: 0, y: 0.75 } });
    void confetti({ ...base, particleCount: 70, angle: 120, spread: 70, startVelocity: 55, origin: { x: 1, y: 0.75 } });
  };

  const pluck = (petal: Petal, element?: Element | null) => {
    if (plucked.has(petal.id)) return;
    const nextCount = plucked.size + 1;
    setPlucked((prev) => new Set(prev).add(petal.id));
    recoil(petal);

    const key = ++seq.current;
    if (!reduce) setBursts((b) => [...b, makeBurst(key, petal.mid.x, petal.mid.y)]);

    if (nextCount < TOTAL_PETALS) {
      const side = petal.mid.x >= CX ? 1 : -1;
      setFalling((f) => [...f, { key, petal, side, spin: side * (160 + Math.random() * 140) }]);
      return;
    }

    // The 23rd: no fall. It blooms into the letter instead, while the camera pulls back.
    const rect = (element ?? svgRef.current?.querySelector(`[data-petal="${petal.id}"]`))?.getBoundingClientRect();
    const from: Origin = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    void finale(from);
    finaleTimer.current = window.setTimeout(() => setLetter(from), reduce ? 0 : 380);
  };

  /** Fly every plucked petal home and fold the letter away. `refocus` keeps keyboard users in the garden. */
  const runRewind = (refocus: boolean) => {
    if (rewinding) return;
    window.clearTimeout(finaleTimer.current);
    setLetter(null);
    setFalling([]);
    setBursts([]);
    if (plucked.size === 0) return;

    // Last plucked flies home first.
    const order = [...plucked].reverse();
    const flights: Record<number, Flight> = {};
    order.forEach((id, rank) => {
      const petal = PETALS[id];
      const side = petal.mid.x >= CX ? 1 : -1;
      flights[id] = {
        x: Math.round(side * (40 + Math.random() * 70) + (petal.mid.x - CX) * 0.5),
        y: Math.round(180 + Math.random() * 80),
        rotate: Math.round(side * (200 + Math.random() * 160)),
        delay: rank * REWIND_STAGGER,
      };
    });

    setTick(order.length);
    setRewind(flights);
    setPlucked(new Set());
    // The Rewind pill unmounts with this render; keep focus on the button that replaces it.
    if (refocus) window.requestAnimationFrame(() => pluckRef.current?.focus({ preventScroll: true }));

    rewindTimer.current = window.setTimeout(
      () => {
        setRewind(null);
        if (!reduce) {
          // The last petal clicks in: a soft bloom pulse and a lilac-gold shimmer at the core.
          animate(headScale, 1, { type: "spring", velocity: 1.1, stiffness: 260, damping: 12 });
          animate(sway, 0, { type: "spring", velocity: 18, stiffness: 170, damping: 10 });
          const key = ++seq.current;
          setBursts((b) => [...b, makeBurst(key, CX, CY)]);
        }
      },
      reduce ? 0 : REWIND_TOTAL_MS,
    );
  };

  // "Rewind Petals" replays the bloom in place: petals fly home and the camera pushes back in.
  const startRewind = () => {
    if (done) runRewind(true);
  };

  // The story-wide "Rewind the Whole Story" bumps resetKey: the same fly-back plays for
  // however many petals are off, the letter folds away, and the garden returns to Stage 1,
  // unzoomed, waiting for her to find the sunlit bloom again.
  const handledReset = useRef(resetKey);
  const onStoryRewind = useEffectEvent(() => {
    setChosen(false);
    setRingVisible(false);
    runRewind(false);
  });
  useEffect(() => {
    if (handledReset.current === resetKey) return;
    handledReset.current = resetKey;
    onStoryRewind();
  }, [resetKey]);

  const pluckNext = () => {
    if (rewinding) return;
    const id = PLUCK_ORDER.find((i) => !plucked.has(i));
    if (id !== undefined) pluck(PETALS[id]);
  };

  // Before she has chosen the bloom, a tap on a petal bubbles up and chooses it instead.
  const onPetalClick = (petal: Petal) => (e: ReactMouseEvent<SVGGElement>) => {
    if (chosen) pluck(petal, e.currentTarget);
  };

  const openLetterAgain = () => {
    const rect = pillRef.current?.getBoundingClientRect();
    setLetter(
      rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    );
  };

  const closeLetter = () => setLetter(null);
  // Once the letter has fully folded away, hand focus back to the pill that reopens it.
  const onLetterGone = () => pillRef.current?.focus({ preventScroll: true });

  const removeFalling = (key: number) => setFalling((f) => f.filter((x) => x.key !== key));
  const removeBurst = (key: number) => setBursts((b) => b.filter((x) => x.key !== key));

  let hint = "Bebe can tap the petal or tap the button, either way works!";
  if (rewinding) hint = "Winding the evening back…";
  else if (done) hint = "All twenty-three, gathered. The letter is yours to keep.";
  else if (count === TOTAL_PETALS - 1) hint = "One left. Take your time.";
  else if (count >= 16) hint = "Nearly there — the centre is warming up.";
  else if (count >= 1) hint = "Keep going. Something is tucked under the last one.";

  let live = "";
  if (chosen && rewinding) live = "Rewinding all petals.";
  else if (chosen && count === 0) live = `The sunlit chrysanthemum is in focus. 0 of ${TOTAL_PETALS} petals plucked.`;
  else if (chosen) live = `${count} of ${TOTAL_PETALS} petals plucked.`;

  const beamOpacity = !chosen ? 1 : done ? 0.85 : 0.5;
  const haloOpacity = !chosen ? 0.9 : done ? 0.75 : 0.45;

  return (
    <section
      id="garden"
      aria-labelledby="garden-heading"
      className="relative flex flex-col items-center overflow-hidden pt-16 pb-20 sm:pt-20 sm:pb-24"
    >
      {/* Backdrop: a lavender bloom of light on linen behind the heading */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 h-[34rem] w-[min(60rem,150vw)] -translate-x-1/2 -translate-y-1/4 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-petal-lilac)_50%,transparent),transparent)] blur-2xl" />
        <div className="paper-grain absolute inset-0 opacity-20 mix-blend-multiply" />
      </div>

      <motion.header
        variants={stagger(0.12)}
        initial="hidden"
        whileInView="shown"
        viewport={{ once: true, amount: 0.6 }}
        className="relative z-10 max-w-xl px-12 text-center sm:px-20 md:px-0"
      >
        <motion.p variants={rise} className="font-mono text-[0.66rem] tracking-[0.34em] text-dusk-amber uppercase">
          Petals Picking by You
        </motion.p>
        <motion.h2
          id="garden-heading"
          variants={rise}
          className="mt-4 font-serif text-[clamp(2.1rem,6vw,3.6rem)] leading-[1.02] text-balance text-velvet-plum"
          style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 144' }}
        >
          23 Petals <em className="italic">Hiding Something</em> Just for You
        </motion.h2>
        <motion.p variants={rise} className="mx-auto mt-4 max-w-md text-[0.98rem] leading-relaxed text-ink/75">
          Pluck each one bebeee and you get something at the end !
        </motion.p>
      </motion.header>

      {/* ── The garden viewport: a camera over four depth layers ───── */}
      <div
        ref={viewportRef}
        className="relative mt-4 h-[min(30rem,64svh)] w-full overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_88%,transparent)] sm:h-[clamp(28rem,min(52vw,74svh),52rem)]"
      >
        <motion.div className="absolute inset-0" initial={false} animate={camera} transition={cameraT}>
          {/* 1 · Far hills */}
          <motion.div className="pointer-events-none absolute inset-0" initial={false} animate={{ filter: zoomed ? DOF_FAR : SHARP }} transition={dofT}>
            <FarLayer />
          </motion.div>

          {/* 2 · Midground beds and the background blooms */}
          <motion.div className="pointer-events-none absolute inset-0" initial={false} animate={{ filter: zoomed ? DOF_MID : SHARP }} transition={dofT}>
            <MidLayer clock={clock} amp={bgAmp} onTap={onDecoy} />
          </motion.div>

          {/* 3 · The sunlit bloom: always tack-sharp */}
          <svg ref={svgRef} viewBox={WORLD_BOX} preserveAspectRatio={SLICE} className="pointer-events-none absolute inset-0 size-full">
            <defs>
              <MumDefs p={p} />
              <radialGradient id={`${p}-aura`}>
                <Stop at="0%" c="ember-gold" o={0.95} />
                <Stop at="45%" c="dusk-amber" o={0.35} />
                <Stop at="100%" c="ember-gold" o={0} />
              </radialGradient>
              <radialGradient id={`${p}-halo`}>
                <Stop at="0%" c="ember-gold" o={0.75} />
                <Stop at="55%" c="dusk-amber" o={0.28} />
                <Stop at="100%" c="dusk-amber" o={0} />
              </radialGradient>
              <linearGradient id={`${p}-beam`} gradientUnits="userSpaceOnUse" x1="0" y1="-1000" x2="0" y2="80">
                <Stop at="0%" c="ember-gold" o={0} />
                <Stop at="30%" c="ember-gold" o={0.22} />
                <Stop at="80%" c="dusk-amber" o={0.42} />
                <Stop at="100%" c="dusk-amber" o={0} />
              </linearGradient>
              <linearGradient id={`${p}-beam-core`} gradientUnits="userSpaceOnUse" x1="0" y1="-1000" x2="0" y2="80">
                <Stop at="0%" c="ember-gold" o={0} />
                <Stop at="35%" c="orchid-white" o={0.32} />
                <Stop at="85%" c="ember-gold" o={0.58} />
                <Stop at="100%" c="ember-gold" o={0} />
              </linearGradient>
              <filter id={`${p}-blur`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
              <filter id={`${p}-soft`} x="-60%" y="-10%" width="220%" height="120%">
                <feGaussianBlur stdDeviation="14" />
              </filter>
            </defs>

            {/* Diagonal sunbeam falling on the chosen bloom */}
            <g aria-hidden transform={`translate(${HERO.x} ${HERO.y}) rotate(-24)`}>
              <motion.g initial={false} animate={{ opacity: beamOpacity }} transition={{ duration: 1.2, ease: EASE_DUSK }}>
                <motion.g
                  initial={false}
                  animate={reduce ? { opacity: 1 } : { opacity: [0.78, 1, 0.78] }}
                  transition={reduce ? { duration: 0 } : { duration: 6, repeat: Infinity, ease: "easeInOut" }}
                >
                  <path d={BEAM_WIDE} fill={`url(#${p}-beam)`} filter={`url(#${p}-soft)`} />
                  <path d={BEAM_CORE} fill={`url(#${p}-beam-core)`} filter={`url(#${p}-soft)`} />
                </motion.g>
                {beckon > 0 && (
                  <motion.path
                    key={beckon}
                    d={BEAM_WIDE}
                    fill={`url(#${p}-beam-core)`}
                    filter={`url(#${p}-soft)`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1.8, times: [0, 0.25, 1], ease: "easeInOut" }}
                  />
                )}
              </motion.g>
            </g>

            {/* Warm halo behind the head */}
            <motion.g aria-hidden initial={false} animate={{ opacity: haloOpacity }} transition={{ duration: 1.2, ease: EASE_DUSK }}>
              <motion.circle
                cx={HERO.x}
                cy={HERO.y}
                r={230}
                fill={`url(#${p}-halo)`}
                initial={false}
                animate={reduce ? { scale: 1 } : { scale: [1, 1.07, 1] }}
                transition={reduce ? { duration: 0 } : { duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
                style={{ originX: 0.5, originY: 0.5 }}
              />
              {beckon > 0 && (
                <motion.circle
                  key={beckon}
                  cx={HERO.x}
                  cy={HERO.y}
                  r={200}
                  fill={`url(#${p}-halo)`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1.8, times: [0, 0.25, 1], ease: "easeInOut" }}
                />
              )}
            </motion.g>

            <g transform={HERO_TRANSFORM}>
              {/* A livelier breeze than its neighbours until chosen, then it steadies for plucking */}
              <Sway clock={clock} amp={heroAmp} deg={1} period={4.6} phase={0}>
                {/* Whole plant sways from the stem base on each pluck */}
                <motion.g style={{ rotate: sway, originX: 0.5, originY: 1 }}>
                  <g
                    role={chosen ? undefined : "button"}
                    tabIndex={chosen ? -1 : 0}
                    aria-label={chosen ? undefined : "The sunlit chrysanthemum. Choose it to begin plucking its petals."}
                    onClick={onHeroClick}
                    onKeyDown={onHeroKey}
                    onFocus={(e) => setRingVisible(!chosen && e.currentTarget.matches(":focus-visible"))}
                    onBlur={() => setRingVisible(false)}
                    className={`outline-none ${chosen ? "" : "cursor-pointer"}`}
                    style={{ pointerEvents: "auto" }}
                  >
                    {/* Stem & leaves, running down into the foreground grass */}
                    <path
                      d={`M200 236 C194 330 213 420 200 520 C190 610 199 720 196 ${HERO_ROOT}`}
                      fill="none"
                      stroke="var(--color-alpine-sage)"
                      strokeWidth={7}
                      strokeLinecap="round"
                    />
                    <path d="M201 240 C196 320 215 410 202 510" fill="none" stroke="var(--color-orchid-white)" strokeOpacity={0.25} strokeWidth={1.2} strokeLinecap="round" />
                    <g transform="translate(203 392) rotate(-158) scale(1 -1)">
                      <path d={LEAF} fill={`url(#${p}-leaf)`} />
                      <path d={LEAF_VEINS} fill="none" stroke="var(--color-orchid-white)" strokeOpacity={0.3} strokeWidth={0.9} strokeLinecap="round" />
                    </g>
                    <g transform="translate(199 478) rotate(-24) scale(0.85)">
                      <path d={LEAF} fill={`url(#${p}-leaf)`} />
                      <path d={LEAF_VEINS} fill="none" stroke="var(--color-orchid-white)" strokeOpacity={0.3} strokeWidth={0.9} strokeLinecap="round" />
                    </g>
                    <g transform="translate(197 590) rotate(-150) scale(0.95 -0.95)">
                      <path d={LEAF} fill={`url(#${p}-leaf)`} />
                    </g>

                    {/* Golden aura, gathering as the petals go */}
                    <motion.circle
                      cx={CX}
                      cy={CY}
                      r={175}
                      fill={`url(#${p}-aura)`}
                      pointerEvents="none"
                      initial={false}
                      animate={{ opacity: 0.08 + Math.pow(progress, 1.3) * 0.85, scale: 0.62 + progress * 0.55 }}
                      transition={SPRING_SOFT}
                      style={{ originX: 0.5, originY: 0.5 }}
                    />

                    {/* "Over here": a small lift when she taps one of its neighbours */}
                    <motion.g animate={beckonCtl} style={{ originX: 0.5, originY: 0.5 }}>
                      <motion.g
                        whileHover={reduce ? undefined : { scale: chosen ? 1 : 1.05 }}
                        whileTap={reduce ? undefined : { scale: chosen ? 1 : 0.97 }}
                        transition={SPRING_SOFT}
                        style={{ originX: 0.5, originY: 0.5 }}
                      >
                        {/* Generous tap target while it waits to be found */}
                        <circle cx={CX} cy={CY} r={150} fill="var(--color-orchid-white)" fillOpacity={0} pointerEvents={chosen ? "none" : undefined} />
                        {ringVisible && (
                          <circle
                            cx={CX}
                            cy={CY}
                            r={156}
                            fill="none"
                            stroke="var(--color-dusk-amber)"
                            strokeOpacity={0.9}
                            strokeWidth={3.5}
                            strokeDasharray="2 10"
                            strokeLinecap="round"
                          />
                        )}

                        <motion.g
                          style={{ scale: headScale, originX: 0.5, originY: 0.5 }}
                          className={rewinding ? "pointer-events-none" : undefined}
                        >
                          {/* Petals: outer ring first, inner ring over it */}
                          {PETALS.map((petal) => {
                            if (plucked.has(petal.id)) return null;
                            const flight = rewind?.[petal.id];
                            return (
                              <motion.g
                                key={petal.id}
                                // Time reversal: start where it landed, arc up and spin back into the ring.
                                initial={flight ? { x: flight.x, y: flight.y, rotate: flight.rotate, scale: 0.65, opacity: 0 } : false}
                                animate={{ x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }}
                                transition={
                                  flight
                                    ? {
                                        // Lateral drift settles early, the lift arrives late: a curved arc.
                                        x: { duration: REWIND_FLIGHT * 0.8, delay: flight.delay, ease: [0.3, 0.7, 0.4, 1] },
                                        y: { duration: REWIND_FLIGHT, delay: flight.delay, ease: [0.55, 0, 0.25, 1] },
                                        rotate: { duration: REWIND_FLIGHT, delay: flight.delay, ease: [0.2, 0.7, 0.3, 1] },
                                        scale: { duration: REWIND_FLIGHT, delay: flight.delay, ease: EASE_DUSK },
                                        opacity: { duration: 0.3, delay: flight.delay, ease: "easeOut" },
                                      }
                                    : undefined
                                }
                                style={{ originX: 0.5, originY: 0.5 }}
                              >
                                <g
                                  data-petal={petal.id}
                                  transform={`translate(${CX} ${CY}) rotate(${petal.angle})`}
                                  onClick={onPetalClick(petal)}
                                  className={chosen ? "cursor-pointer" : undefined}
                                  style={petal.ring === "inner" ? { filter: "drop-shadow(0 2px 2px color-mix(in oklab, var(--color-velvet-plum) 25%, transparent))" } : undefined}
                                >
                                  <motion.g
                                    whileHover={reduce ? undefined : { scale: chosen ? 1.06 : 1 }}
                                    whileTap={reduce ? undefined : { scale: chosen ? 0.96 : 1 }}
                                    transition={SPRING_TACTILE}
                                    style={{ originX: 0.5, originY: 1 }}
                                  >
                                    <PetalShape petal={petal} p={p} />
                                  </motion.g>
                                </g>
                              </motion.g>
                            );
                          })}

                          {/* Stamen core */}
                          <motion.circle
                            cx={CX}
                            cy={CY}
                            r={44}
                            fill="var(--color-ember-gold)"
                            filter={`url(#${p}-blur)`}
                            initial={false}
                            animate={{ opacity: 0.35 + progress * 0.6 }}
                            transition={SPRING_SOFT}
                          />
                          <circle cx={CX} cy={CY} r={36} fill={`url(#${p}-core)`} />
                          {FLORETS.map((f) => (
                            <circle key={f.i} cx={f.x} cy={f.y} r={f.size} fill={floretFill(f.tone)} />
                          ))}
                          <circle cx={CX - 9} cy={CY - 11} r={11} fill="var(--color-orchid-white)" opacity={0.18} />
                        </motion.g>
                      </motion.g>
                    </motion.g>
                  </g>
                </motion.g>
              </Sway>

              {/* Gold motes drifting up through the sunbeam */}
              {!reduce && !done && (
                <g aria-hidden pointerEvents="none">
                  {SPARKLES.map((s) => (
                    <motion.g
                      key={s.id}
                      initial={{ opacity: 0, y: 0, scale: 0.6 }}
                      animate={{ opacity: [0, 1, 0], y: [0, -s.drift], scale: [0.6, 1, 0.6] }}
                      transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, repeatDelay: s.rest, ease: "easeInOut" }}
                    >
                      <g transform={`translate(${s.x} ${s.y})`}>
                        {s.star ? (
                          <path d={STAR} transform={`scale(${s.size})`} fill="var(--color-ember-gold)" />
                        ) : (
                          <circle r={r1(s.size * 2.2)} fill={s.id % 2 ? "var(--color-orchid-white)" : "var(--color-dusk-amber)"} />
                        )}
                      </g>
                    </motion.g>
                  ))}
                </g>
              )}

              {/* Detached petals & sparkles ride above the plant, and drift down behind the grass */}
              <g aria-hidden>
                {falling.map((item) => (
                  <FallingPetal key={item.key} item={item} p={p} onDone={removeFalling} />
                ))}
                {bursts.map((b) => (
                  <SparkBurst key={b.key} burst={b} onDone={removeBurst} />
                ))}
              </g>
            </g>
          </svg>

          {/* 4 · Foreground garden floor */}
          <motion.div className="pointer-events-none absolute inset-0" initial={false} animate={{ filter: zoomed ? DOF_NEAR : SHARP }} transition={dofT}>
            <NearLayer clock={clock} amp={bgAmp} onTap={onDecoy} />
          </motion.div>
        </motion.div>

        {/* Linen tooth over the whole frame; it stays put while the camera moves */}
        <div aria-hidden className="paper-grain pointer-events-none absolute inset-0 opacity-15 mix-blend-multiply" />
      </div>

      {/* ── Controls: the hint pill crossfades into the plucking game ─ */}
      <div className="relative z-10 -mt-2 flex min-h-[10.5rem] w-full flex-col items-center px-6 sm:px-20">
        <AnimatePresence mode="wait" initial={false}>
          {chosen ? (
            <motion.div
              key="game"
              initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -6, filter: "blur(6px)" }}
              transition={{ duration: 0.6, ease: EASE_DUSK }}
              className="flex flex-col items-center gap-4"
            >
              <p className="font-mono text-sm tracking-[0.2em] text-velvet-plum tabular-nums" aria-hidden>
                <span className="text-2xl">{String(displayCount).padStart(2, "0")}</span>
                <span className="text-ink/45"> / {TOTAL_PETALS}</span>
              </p>

              {/* Distinct keys: the same element type in both branches would otherwise be reused, and the ref never attach. */}
              {done ? (
                <div key="done" className="flex flex-wrap items-center justify-center gap-3">
                  <motion.button
                    ref={pillRef}
                    type="button"
                    onClick={openLetterAgain}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={reduce ? undefined : { y: -2 }}
                    whileTap={reduce ? undefined : { scale: 0.96 }}
                    transition={SPRING_TACTILE}
                    className="flex items-center gap-2 rounded-full border border-bruised-lavender/40 bg-linen/85 px-5 py-2.5 text-sm text-velvet-plum shadow-md shadow-velvet-plum/15 backdrop-blur-lg transition-colors hover:bg-petal-lilac/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dusk-amber"
                  >
                    <MailOpen className="size-4" aria-hidden />
                    Read Letter Again
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={startRewind}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={reduce ? undefined : { y: -2 }}
                    whileTap={reduce ? undefined : { scale: 0.96 }}
                    transition={{ ...SPRING_TACTILE, delay: 0.06 }}
                    className="flex items-center gap-2 rounded-full border border-bruised-lavender/40 bg-linen/85 px-5 py-2.5 text-sm text-velvet-plum shadow-md shadow-velvet-plum/15 backdrop-blur-lg transition-[background-color,box-shadow] hover:bg-petal-lilac/30 hover:shadow-lg hover:shadow-dusk-amber/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dusk-amber"
                  >
                    <RotateCcw className="size-4" aria-hidden />
                    Rewind Petals
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  key="pluck"
                  ref={(el: HTMLButtonElement | null) => {
                    pluckRef.current = el;
                    // Chosen from the keyboard: carry focus straight on to the game.
                    if (el && focusPluck.current) {
                      focusPluck.current = false;
                      el.focus({ preventScroll: true });
                    }
                  }}
                  type="button"
                  onClick={pluckNext}
                  aria-disabled={rewinding || undefined}
                  whileHover={reduce ? undefined : { y: -2 }}
                  whileTap={reduce ? undefined : { scale: 0.95, y: 0 }}
                  transition={SPRING_TACTILE}
                  aria-label={`Pluck a petal, ${count} of ${TOTAL_PETALS} plucked`}
                  className="flex items-center gap-2 rounded-full bg-velvet-plum px-6 py-3 font-serif text-base text-linen shadow-lg shadow-velvet-plum/30 transition-[box-shadow,opacity] hover:shadow-xl hover:shadow-dusk-amber/35 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-dusk-amber aria-disabled:opacity-60"
                  style={{ fontVariationSettings: '"SOFT" 100, "opsz" 24' }}
                >
                  <Flower2 className="size-4" aria-hidden />
                  Pluck a Petal
                </motion.button>
              )}

              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={hint}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.4, ease: EASE_DUSK }}
                  className="max-w-xs text-center text-xs leading-relaxed text-balance text-ink/55"
                >
                  {hint}
                </motion.p>
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="prompt"
              initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -6, filter: "blur(6px)" }}
              transition={{ duration: 0.45, ease: EASE_DUSK }}
              className="pt-3"
            >
              <div className="flex items-center gap-2.5 rounded-full border border-bruised-lavender/35 bg-linen/65 py-2 pr-5 pl-2.5 shadow-lg shadow-velvet-plum/10 backdrop-blur-xl">
                <motion.span
                  key={beckon}
                  aria-hidden
                  initial={false}
                  animate={beckon > 0 ? { scale: [1, 1.3, 1], rotate: [0, 45, 0] } : undefined}
                  transition={{ duration: 0.9, ease: "easeInOut" }}
                  className="grid size-7 place-items-center rounded-full bg-ember-gold/35 text-dusk-amber"
                >
                  <Sun className="size-4" />
                </motion.span>
                <p
                  className="font-serif text-[0.9rem] whitespace-nowrap text-velvet-plum italic sm:text-[0.98rem]"
                  style={{ fontVariationSettings: '"SOFT" 100, "opsz" 24' }}
                >
                  Tap the sunlit bloom in the garden…
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <p className="sr-only" aria-live="polite">
          {live}
        </p>
      </div>

      {isClient &&
        createPortal(
          <AnimatePresence onExitComplete={onLetterGone}>
            {letter && <LetterModal key="letter" origin={letter} onClose={closeLetter} />}
          </AnimatePresence>,
          document.body,
        )}
    </section>
  );
}

type ChrysanthemumGameProps = {
  /** Increment to fly every plucked petal home, close the letter, and return the garden to Stage 1 (the story-wide Rewind). */
  resetKey?: number;
};

export default function ChrysanthemumGame({ resetKey = 0 }: Readonly<ChrysanthemumGameProps>) {
  return <Garden resetKey={resetKey} />;
}
