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
  useMotionValue,
} from "framer-motion";
import { Download, Flower2, LoaderCircle, MailOpen, RotateCcw, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  EASE_DUSK,
  SPRING_SOFT,
  SPRING_TACTILE,
  rise,
  stagger,
  usePrefersReducedMotion,
} from "../lib/motion";

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

function PetalShape({ petal }: Readonly<{ petal: Petal }>) {
  const outer = petal.ring === "outer";
  return (
    <>
      <path
        d={petal.d}
        fill={outer ? "var(--color-bruised-lavender)" : "var(--color-petal-lilac)"}
        stroke="var(--color-velvet-plum)"
        strokeOpacity={0.28}
        strokeWidth={0.7}
      />
      <path d={petal.d} fill={outer ? "url(#mum-shade-outer)" : "url(#mum-shade-inner)"} />
      <path d={petal.veins} fill="none" stroke="var(--color-velvet-plum)" strokeOpacity={0.2} strokeWidth={0.6} strokeLinecap="round" />
    </>
  );
}

function FallingPetal({ item, onDone }: Readonly<{ item: Falling; onDone: (key: number) => void }>) {
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
        <PetalShape petal={petal} />
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

/* ───────────────────────────────────────────────────────────────
   The garden
   ─────────────────────────────────────────────────────────────── */

const noopSubscribe = () => () => {};

function Garden() {
  const reduce = usePrefersReducedMotion();
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const svgRef = useRef<SVGSVGElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const seq = useRef(0);
  const finaleTimer = useRef<number | undefined>(undefined);
  const rewindTimer = useRef<number | undefined>(undefined);
  const pluckRef = useRef<HTMLButtonElement>(null);

  const [plucked, setPlucked] = useState<ReadonlySet<number>>(() => new Set());
  const [falling, setFalling] = useState<Falling[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [letter, setLetter] = useState<Origin | null>(null);
  /** Non-null while petals fly home; keyed by petal id. */
  const [rewind, setRewind] = useState<Readonly<Record<number, Flight>> | null>(null);
  const [tick, setTick] = useState(0);

  const sway = useMotionValue(0);
  const headScale = useMotionValue(1);

  const rewinding = rewind !== null;
  const count = plucked.size;
  // While rewinding, the counter (and the aura that follows it) ticks back down.
  const displayCount = rewinding ? tick : count;
  const progress = displayCount / TOTAL_PETALS;
  const done = count === TOTAL_PETALS;

  useEffect(
    () => () => {
      window.clearTimeout(finaleTimer.current);
      window.clearTimeout(rewindTimer.current);
    },
    [],
  );

  // Rapid countdown 23 → 0 across the flight.
  useEffect(() => {
    if (!rewind) return;
    let n = TOTAL_PETALS;
    const id = window.setInterval(() => {
      n -= 1;
      setTick(Math.max(n, 0));
      if (n <= 0) window.clearInterval(id);
    }, reduce ? 1 : (REWIND_TOTAL_MS - 150) / TOTAL_PETALS);
    return () => window.clearInterval(id);
  }, [rewind, reduce]);

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

    // The 23rd: no fall. It blooms into the letter instead.
    const rect = (element ?? svgRef.current?.querySelector(`[data-petal="${petal.id}"]`))?.getBoundingClientRect();
    const from: Origin = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    void finale(from);
    finaleTimer.current = window.setTimeout(() => setLetter(from), reduce ? 0 : 380);
  };

  const startRewind = () => {
    if (!done || rewinding) return;
    window.clearTimeout(finaleTimer.current);

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

    setFalling([]);
    setBursts([]);
    setTick(TOTAL_PETALS);
    setRewind(flights);
    setPlucked(new Set());
    // The Rewind pill unmounts with this render; keep focus on the button that replaces it.
    window.requestAnimationFrame(() => pluckRef.current?.focus({ preventScroll: true }));

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

  const pluckNext = () => {
    if (rewinding) return;
    const id = PLUCK_ORDER.find((i) => !plucked.has(i));
    if (id !== undefined) pluck(PETALS[id]);
  };

  const onPetalClick = (petal: Petal) => (e: ReactMouseEvent<SVGGElement>) => pluck(petal, e.currentTarget);

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

  let hint = "Tap any petal to pluck it — or let the button do it for you.";
  if (rewinding) hint = "Winding the evening back…";
  else if (done) hint = "All twenty-three, gathered. The letter is yours to keep.";
  else if (count === TOTAL_PETALS - 1) hint = "One left. Take your time.";
  else if (count >= 16) hint = "Nearly there — the centre is warming up.";
  else if (count >= 1) hint = "Keep going. Something is tucked under the last one.";

  return (
    <section
      id="garden"
      aria-labelledby="garden-heading"
      className="relative flex flex-col items-center overflow-hidden px-12 pt-16 pb-24 sm:px-20 sm:pt-20 lg:px-28"
    >
      {/* Backdrop: lavender bloom of light on linen */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute top-[18%] left-1/2 h-[42rem] w-[min(60rem,150vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-petal-lilac)_55%,transparent),transparent)] blur-2xl" />
        <div className="absolute bottom-0 left-1/2 h-72 w-[min(48rem,120vw)] -translate-x-1/2 translate-y-1/3 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-ember-gold)_30%,transparent),transparent)] blur-2xl" />
        <div className="paper-grain absolute inset-0 opacity-20 mix-blend-multiply" />
      </div>

      <motion.header
        variants={stagger(0.12)}
        initial="hidden"
        whileInView="shown"
        viewport={{ once: true, amount: 0.6 }}
        className="relative z-10 max-w-xl text-center"
      >
        <motion.p variants={rise} className="font-mono text-[0.66rem] tracking-[0.34em] text-dusk-amber uppercase">
          The garden of 23 petals
        </motion.p>
        <motion.h2
          id="garden-heading"
          variants={rise}
          className="mt-4 font-serif text-[clamp(2.1rem,6vw,3.6rem)] leading-[1.02] text-balance text-velvet-plum"
          style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 144' }}
        >
          One petal for <em className="italic">every year.</em>
        </motion.h2>
        <motion.p variants={rise} className="mx-auto mt-4 max-w-md text-[0.98rem] leading-relaxed text-ink/75">
          Twenty-three of them, light as lavender. Pluck them one by one — the last
          one is holding something for you.
        </motion.p>
      </motion.header>

      {/* ── The flower ─────────────────────────────────────────── */}
      <div className="relative z-10 mt-6 w-full max-w-[25rem]">
        <svg
          ref={svgRef}
          viewBox="0 0 400 580"
          className="h-auto w-full overflow-visible"
          aria-hidden
        >
          <defs>
            <linearGradient id="mum-shade-outer" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" style={{ stopColor: "var(--color-velvet-plum)", stopOpacity: 0.5 }} />
              <stop offset="45%" style={{ stopColor: "var(--color-velvet-plum)", stopOpacity: 0 }} />
              <stop offset="85%" style={{ stopColor: "var(--color-orchid-white)", stopOpacity: 0.12 }} />
              <stop offset="100%" style={{ stopColor: "var(--color-orchid-white)", stopOpacity: 0.32 }} />
            </linearGradient>
            <linearGradient id="mum-shade-inner" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" style={{ stopColor: "var(--color-dusk-amber)", stopOpacity: 0.45 }} />
              <stop offset="35%" style={{ stopColor: "var(--color-velvet-plum)", stopOpacity: 0 }} />
              <stop offset="100%" style={{ stopColor: "var(--color-orchid-white)", stopOpacity: 0.45 }} />
            </linearGradient>
            <radialGradient id="mum-aura">
              <stop offset="0%" style={{ stopColor: "var(--color-ember-gold)", stopOpacity: 0.95 }} />
              <stop offset="45%" style={{ stopColor: "var(--color-dusk-amber)", stopOpacity: 0.35 }} />
              <stop offset="100%" style={{ stopColor: "var(--color-ember-gold)", stopOpacity: 0 }} />
            </radialGradient>
            <radialGradient id="mum-core" cx="45%" cy="40%">
              <stop offset="0%" style={{ stopColor: "var(--color-ember-gold)" }} />
              <stop offset="60%" style={{ stopColor: "var(--color-dusk-amber)" }} />
              <stop offset="100%" style={{ stopColor: "var(--color-hearth-terracotta)" }} />
            </radialGradient>
            <linearGradient id="mum-leaf" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--color-alpine-sage)" }} />
              <stop offset="100%" style={{ stopColor: "var(--color-twilight-indigo)", stopOpacity: 0.8 }} />
            </linearGradient>
            <filter id="mum-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>

          {/* Whole plant sways from the stem base on each pluck */}
          <motion.g style={{ rotate: sway, originX: 0.5, originY: 1 }}>
            {/* Stem & leaves */}
            <path d="M200 236 C194 320 214 400 199 470 C190 512 197 548 195 578" fill="none" stroke="var(--color-alpine-sage)" strokeWidth={6} strokeLinecap="round" />
            <path d="M201 240 C196 320 215 398 201 468" fill="none" stroke="var(--color-orchid-white)" strokeOpacity={0.25} strokeWidth={1.2} strokeLinecap="round" />
            <g transform="translate(203 392) rotate(-158) scale(1 -1)">
              <path d={LEAF} fill="url(#mum-leaf)" />
              <path d={LEAF_VEINS} fill="none" stroke="var(--color-orchid-white)" strokeOpacity={0.3} strokeWidth={0.9} strokeLinecap="round" />
            </g>
            <g transform="translate(199 478) rotate(-24) scale(0.85)">
              <path d={LEAF} fill="url(#mum-leaf)" />
              <path d={LEAF_VEINS} fill="none" stroke="var(--color-orchid-white)" strokeOpacity={0.3} strokeWidth={0.9} strokeLinecap="round" />
            </g>

            {/* Golden aura, gathering as the petals go */}
            <motion.circle
              cx={CX}
              cy={CY}
              r={175}
              fill="url(#mum-aura)"
              initial={false}
              animate={{ opacity: 0.08 + Math.pow(progress, 1.3) * 0.85, scale: 0.62 + progress * 0.55 }}
              transition={SPRING_SOFT}
              style={{ originX: 0.5, originY: 0.5 }}
            />

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
                    className="cursor-pointer"
                    style={petal.ring === "inner" ? { filter: "drop-shadow(0 2px 2px color-mix(in oklab, var(--color-velvet-plum) 25%, transparent))" } : undefined}
                  >
                    <motion.g
                      whileHover={reduce ? undefined : { scale: 1.06 }}
                      whileTap={reduce ? undefined : { scale: 0.96 }}
                      transition={SPRING_TACTILE}
                      style={{ originX: 0.5, originY: 1 }}
                    >
                      <PetalShape petal={petal} />
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
                filter="url(#mum-blur)"
                initial={false}
                animate={{ opacity: 0.35 + progress * 0.6 }}
                transition={SPRING_SOFT}
              />
              <circle cx={CX} cy={CY} r={36} fill="url(#mum-core)" />
              {FLORETS.map((f) => (
                <circle
                  key={f.i}
                  cx={f.x}
                  cy={f.y}
                  r={f.size}
                  fill={
                    f.tone === "outer"
                      ? "var(--color-hearth-terracotta)"
                      : f.tone === "mid"
                        ? "var(--color-dusk-amber)"
                        : "var(--color-ember-gold)"
                  }
                  stroke="var(--color-orchid-white)"
                  strokeOpacity={0.35}
                  strokeWidth={0.4}
                />
              ))}
              <circle cx={CX - 9} cy={CY - 11} r={11} fill="var(--color-orchid-white)" opacity={0.18} />
            </motion.g>
          </motion.g>

          {/* Detached petals & sparkles ride above the plant */}
          {falling.map((item) => (
            <FallingPetal key={item.key} item={item} onDone={removeFalling} />
          ))}
          {bursts.map((b) => (
            <SparkBurst key={b.key} burst={b} onDone={removeBurst} />
          ))}
        </svg>
      </div>

      {/* ── Controls ───────────────────────────────────────────── */}
      <div className="relative z-10 -mt-2 flex flex-col items-center gap-4">
        <p className="font-mono text-sm tracking-[0.2em] text-velvet-plum tabular-nums" aria-hidden>
          <span className="text-2xl">{String(displayCount).padStart(2, "0")}</span>
          <span className="text-ink/45"> / {TOTAL_PETALS}</span>
        </p>
        <p className="sr-only" aria-live="polite">
          {rewinding ? "Rewinding all petals." : `${count} of ${TOTAL_PETALS} petals plucked.`}
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
            ref={pluckRef}
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
  /** Increment to restore all 23 petals and close the letter (the Rewind button). */
  resetKey?: number;
};

export default function ChrysanthemumGame({ resetKey = 0 }: Readonly<ChrysanthemumGameProps>) {
  // A new key remounts the garden into the same clean state a finished rewind leaves:
  // every petal back and pluckable, letter closed, particles and timers cleared.
  return <Garden key={resetKey} />;
}
