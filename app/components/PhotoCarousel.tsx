"use client";

import {
  AnimatePresence,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  EASE_DUSK,
  SPRING_SOFT,
  SPRING_TACTILE,
  SPRING_TILT,
  rise,
  stagger,
  usePrefersReducedMotion,
} from "../lib/motion";

const PHOTO_COUNT = 12;
const AUTO_MS = 6200;
const SIZES = "(min-width: 1024px) 480px, (min-width: 640px) 70vw, 76vw";

const PHOTOS = Array.from({ length: PHOTO_COUNT }, (_, i) => ({
  src: `/chaca_photos/chaca${i + 1}.jpg`,
  alt: `Marchi — a kept memory, photograph ${i + 1} of ${PHOTO_COUNT}`,
}));

const pad = (n: number) => String(n).padStart(2, "0");

/* ── A pressed sprig for any frame whose photo couldn't make it ── */
function BotanicalFallback({ index }: Readonly<{ index: number }>) {
  const flip = index % 2 === 0 ? 1 : -1;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-linen-deep px-8 text-center">
      <svg viewBox="0 0 120 160" className="h-2/5 w-auto" aria-hidden style={{ transform: `scaleX(${flip})` }}>
        <path d="M60 156 C58 120 66 90 56 52" fill="none" stroke="var(--color-alpine-sage)" strokeWidth={1.6} strokeLinecap="round" />
        <path d="M58 118 C42 112 34 98 36 86 C48 92 56 104 58 118Z" fill="var(--color-alpine-sage)" fillOpacity={0.55} />
        <path d="M61 96 C76 92 84 80 84 68 C72 72 64 82 61 96Z" fill="var(--color-alpine-sage)" fillOpacity={0.45} />
        <g transform="translate(56 44)">
          {[0, 72, 144, 216, 288].map((deg) => (
            <path
              key={deg}
              d="M0 0 C-7 -6 -8 -18 0 -24 C8 -18 7 -6 0 0Z"
              transform={`rotate(${deg})`}
              fill="var(--color-orchid-white)"
              stroke="var(--color-petal-lilac)"
              strokeWidth={0.8}
            />
          ))}
          <circle r={4} fill="var(--color-dusk-amber)" />
        </g>
      </svg>
      <p className="font-serif text-lg text-velvet-plum italic" style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 36' }}>
        Still blooming
      </p>
      <p className="font-mono text-[0.62rem] tracking-[0.24em] text-ink/50 uppercase">
        Memory {pad(index + 1)}
      </p>
    </div>
  );
}

/* ── Swiss cedar frame: crossed beams with pinned corner joints ── */
const GRAIN_ALONG =
  "bg-[repeating-linear-gradient(0deg,transparent_0_3px,color-mix(in_oklab,var(--color-ink)_14%,transparent)_3px_4px,transparent_4px_9px)]";
const GRAIN_DOWN =
  "bg-[repeating-linear-gradient(90deg,transparent_0_3px,color-mix(in_oklab,var(--color-ink)_14%,transparent)_3px_4px,transparent_4px_9px)]";

/** One cedar beam. Rails run horizontally, stiles vertically; each shows its own grain. */
function Beam({ kind, className }: Readonly<{ kind: "rail" | "stile"; className: string }>) {
  const isRail = kind === "rail";
  return (
    <div aria-hidden className={`absolute bg-chalet-cedar shadow-sm shadow-ink/40 ${className}`}>
      <div className={`absolute inset-0 opacity-80 ${isRail ? GRAIN_ALONG : GRAIN_DOWN}`} />
      <div
        className={`absolute inset-0 ${
          isRail
            ? "bg-linear-to-b from-dusk-amber/25 via-transparent to-ink/30"
            : "bg-linear-to-r from-dusk-amber/20 via-transparent to-ink/30"
        }`}
      />
      {/* Darkened end grain on the protruding horns */}
      <div className={isRail ? "absolute inset-y-0 left-0 w-1 bg-ink/30" : "absolute inset-x-0 top-0 h-1 bg-ink/30"} />
      <div className={isRail ? "absolute inset-y-0 right-0 w-1 bg-ink/30" : "absolute inset-x-0 bottom-0 h-1 bg-ink/30"} />
    </div>
  );
}

/** Where rail and stile interlock: a notched tenon face with two brass pins. */
function Joint({ className }: Readonly<{ className: string }>) {
  return (
    <div aria-hidden className={`absolute bg-chalet-cedar ${className}`}>
      <div className="absolute inset-0 bg-[repeating-radial-gradient(circle_at_28%_72%,transparent_0_2px,color-mix(in_oklab,var(--color-ink)_20%,transparent)_2px_3px)]" />
      <div className="absolute inset-[3px] shadow-[inset_1px_1px_0_color-mix(in_oklab,var(--color-ink)_45%,transparent),inset_-1px_-1px_0_color-mix(in_oklab,var(--color-dusk-amber)_35%,transparent)]" />
      <div className="absolute inset-0 grid grid-cols-2 place-items-center p-[22%]">
        <span className="size-1.5 self-start rounded-full bg-dusk-amber shadow-[inset_-1px_-1px_0_color-mix(in_oklab,var(--color-ink)_45%,transparent)] ring-1 ring-ink/30" />
        <span className="size-1.5 self-end rounded-full bg-dusk-amber shadow-[inset_-1px_-1px_0_color-mix(in_oklab,var(--color-ink)_45%,transparent)] ring-1 ring-ink/30" />
      </div>
    </div>
  );
}

/** One pass of the carving; drawn twice (lit lip, then dark groove) for depth. */
function EtchingStrokes({ stroke, opacity, dy }: Readonly<{ stroke: string; opacity: number; dy: number }>) {
  return (
    <g
      transform={`translate(0 ${dy})`}
      fill="none"
      stroke={stroke}
      strokeOpacity={opacity}
      strokeWidth={0.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 15 C40 15 60 9 92 12 M148 12 C180 9 200 15 232 15" />
      <path d="M44 13 C50 6 58 6 62 9 C56 12 50 13 44 13Z M196 13 C190 6 182 6 178 9 C184 12 190 13 196 13Z" />
      <path d="M28 15 C24 11 24 8 27 6 M212 15 C216 11 216 8 213 6" />
      <g transform="translate(120 12)">
        <path d="M0 -1 C-3 -5 -2 -10 0 -11 C2 -10 3 -5 0 -1Z" />
        <path d="M-1 0 C-6 -2 -11 -1 -12 2 C-10 4 -5 3 -1 0Z M1 0 C6 -2 11 -1 12 2 C10 4 5 3 1 0Z" />
        <path d="M-1 1 C-5 4 -7 8 -5 10 M1 1 C5 4 7 8 5 10" />
        <path d="M-2 2 C-3 6 -1 9 0 9 C1 9 3 6 2 2Z" />
      </g>
      <circle cx={100} cy={11} r={1.6} />
      <circle cx={140} cy={11} r={1.6} />
    </g>
  );
}

/** A minimalist orchid sprig carved into the bottom rail. */
function OrchidEtching() {
  return (
    <svg viewBox="0 0 240 24" className="h-full w-auto max-w-[62%]" aria-hidden>
      <EtchingStrokes stroke="var(--color-dusk-amber)" opacity={0.45} dy={0.7} />
      <EtchingStrokes stroke="var(--color-ink)" opacity={0.6} dy={0} />
    </svg>
  );
}

function TimberFrame({ children, counter }: Readonly<{ children: ReactNode; counter: string }>) {
  return (
    <div
      className="relative px-(--t) pt-(--t) pb-(--tb) shadow-[0_34px_70px_-24px] shadow-twilight-indigo/80"
      style={{ "--t": "clamp(14px, 3.4vw, 22px)", "--tb": "clamp(30px, 7vw, 44px)" } as CSSProperties}
    >
      {/* Rails run long past the stiles and stiles past the rails: the crossed Alpine corner. */}
      <Beam kind="rail" className="-inset-x-[calc(var(--t)*0.4)] top-0 h-(--t)" />
      <Beam kind="rail" className="-inset-x-[calc(var(--t)*0.4)] bottom-0 h-(--tb)" />
      <Beam kind="stile" className="-inset-y-[calc(var(--t)*0.4)] left-0 w-(--t)" />
      <Beam kind="stile" className="-inset-y-[calc(var(--t)*0.4)] right-0 w-(--t)" />

      <Joint className="top-0 left-0 size-(--t)" />
      <Joint className="top-0 right-0 size-(--t)" />
      <Joint className="bottom-0 left-0 h-(--tb) w-(--t)" />
      <Joint className="right-0 bottom-0 h-(--tb) w-(--t)" />

      {/* Carving and brass counter plate on the bottom rail */}
      <div className="absolute inset-x-(--t) bottom-0 flex h-(--tb) items-center justify-center py-[clamp(6px,1.6vw,10px)]">
        <OrchidEtching />
        <p
          aria-hidden
          className="absolute right-2 rounded-[2px] bg-dusk-amber px-1.5 py-px font-mono text-[0.55rem] tracking-[0.16em] text-ink tabular-nums shadow-sm shadow-ink/50 sm:right-3 sm:text-[0.6rem]"
        >
          {counter}
        </p>
      </div>

      <div className="relative shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-ink)_45%,transparent)]">
        {children}
      </div>
    </div>
  );
}

type PhotoCarouselProps = {
  /** Holds the entrance (and the slideshow) until she has stepped inside. */
  revealed?: boolean;
};

export default function PhotoCarousel({ revealed = true }: Readonly<PhotoCarouselProps>) {
  const reduce = usePrefersReducedMotion();
  const regionRef = useRef<HTMLElement>(null);
  const inView = useInView(regionRef, { amount: 0.35 });

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [autoChoice, setAutoChoice] = useState<boolean | null>(null);
  const [hovering, setHovering] = useState(false);
  const [failed, setFailed] = useState<ReadonlySet<number>>(() => new Set());

  // Unless she chooses otherwise, the slideshow runs — but not for reduced motion.
  const autoPlay = autoChoice ?? !reduce;
  const running = revealed && inView && autoPlay && !hovering;

  const go = (delta: number) => {
    setDirection(delta >= 0 ? 1 : -1);
    setIndex((i) => (i + delta + PHOTO_COUNT) % PHOTO_COUNT);
  };

  const goTo = (target: number) => {
    if (target === index) return;
    setDirection(target > index ? 1 : -1);
    setIndex(target);
  };

  // Re-armed on every change, so manual navigation always earns a full beat.
  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => {
      setDirection(1);
      setIndex((i) => (i + 1) % PHOTO_COUNT);
    }, AUTO_MS);
    return () => window.clearTimeout(t);
  }, [running, index]);

  const markFailed = (i: number) =>
    setFailed((prev) => (prev.has(i) ? prev : new Set(prev).add(i)));

  /* ── Cursor-reactive depth ─────────────────────────────────── */
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, SPRING_TILT);
  const sy = useSpring(py, SPRING_TILT);
  const rotateY = useTransform(sx, [-0.5, 0.5], [-9, 9]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [7, -7]);
  const photoX = useTransform(sx, [-0.5, 0.5], [9, -9]);
  const photoY = useTransform(sy, [-0.5, 0.5], [7, -7]);
  const glareX = useTransform(sx, [-0.5, 0.5], [18, 82]);
  const glareY = useTransform(sy, [-0.5, 0.5], [12, 70]);
  const glare = useMotionTemplate`radial-gradient(90% 70% at ${glareX}% ${glareY}%, color-mix(in oklab, var(--color-orchid-white) 34%, transparent), transparent 60%)`;

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };

  const onPointerEnter = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse") setHovering(true);
  };

  const onPointerLeave = () => {
    px.set(0);
    py.set(0);
    setHovering(false);
  };

  const onPanEnd = (_: unknown, info: PanInfo) => {
    const { x, y } = info.offset;
    if (Math.abs(x) > 48 && Math.abs(x) > Math.abs(y) * 1.2) go(x < 0 ? 1 : -1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    }
  };

  const next = (index + 1) % PHOTO_COUNT;
  const photo = PHOTOS[index];

  return (
    <motion.div
      variants={stagger(0.14, 0.35)}
      initial="hidden"
      animate={revealed ? "shown" : "hidden"}
      className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-x-8 gap-y-10 px-12 pt-28 pb-16 sm:px-20 sm:pt-32 lg:grid-cols-12 lg:px-28 lg:pt-36 xl:gap-x-10"
    >
      {/* ── Editorial headline ─────────────────────────────────── */}
      <header className="text-center lg:col-span-5 lg:col-start-1 lg:row-start-1 lg:self-end lg:text-left">
        <motion.h1
          id="chalet-heading"
          variants={rise}
          className="font-serif text-[clamp(2.5rem,8.5vw,5.4rem)] lg:text-[clamp(3rem,4vw,4.6rem)] leading-[0.92] tracking-[-0.015em] text-orchid-white [text-shadow:0_2px_24px_color-mix(in_oklab,var(--color-twilight-indigo)_70%,transparent)]"
          style={{ fontVariationSettings: '"SOFT" 100, "WONK" 0, "opsz" 144' }}
        >
          <span className="block font-light italic" style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 144' }}>
            Happiest
          </span>
          <span className="block">
            23<span className="align-[0.62em] text-[0.4em] tracking-normal">rd</span> Birthday,
          </span>
          <span
            className="block text-ember-gold italic"
            style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 144' }}
          >
            Marchi.
          </span>
        </motion.h1>
      </header>

      {/* ── The Swiss timber gallery frame ─────────────────────── */}
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 40, scale: 0.96 },
          shown: { opacity: 1, y: 0, scale: 1, transition: SPRING_SOFT },
        }}
        className="mx-auto w-full max-w-[540px] lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1"
      >
        <section
          ref={regionRef}
          aria-roledescription="carousel"
          aria-label="Twelve photographs of Marchi"
          onKeyDown={onKeyDown}
          className="flex flex-col items-center"
        >
          <div className="w-full [perspective:1300px]">
            <motion.div
              onPointerMove={onPointerMove}
              onPointerEnter={onPointerEnter}
              onPointerLeave={onPointerLeave}
              style={reduce ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}
              className="relative"
            >
              {/* Ember backlight against the dusk sky */}
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-10 rounded-[40%] bg-[radial-gradient(closest-side,var(--color-ember-gold),transparent)] opacity-55 blur-2xl"
              />

              <TimberFrame counter={`${pad(index + 1)} / ${PHOTO_COUNT}`}>
                {/* Recessed linen matboard */}
                <div className="bg-linen-deep p-3 shadow-[inset_0_2px_10px_color-mix(in_oklab,var(--color-ink)_32%,transparent)] sm:p-4">
                  {/* The photograph, ringed by a gold fillet */}
                  <motion.div
                    onPanEnd={onPanEnd}
                    style={{ touchAction: "pan-y" }}
                    className="relative aspect-[4/5] overflow-hidden rounded-sm bg-linen ring-1 ring-dusk-amber/60 ring-offset-[3px] ring-offset-linen-deep"
                  >
                    <div
                      role="group"
                      aria-roledescription="slide"
                      aria-label={`${index + 1} of ${PHOTO_COUNT}`}
                      aria-live={running ? "off" : "polite"}
                      className="absolute inset-0"
                    >
                      <AnimatePresence initial={false}>
                        <motion.div
                          key={index}
                          className="absolute inset-0"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: reduce ? 0.2 : 1.2, ease: EASE_DUSK }}
                        >
                          <motion.div
                            className="absolute -inset-2"
                            style={reduce ? undefined : { x: photoX, y: photoY }}
                          >
                            {failed.has(index) ? (
                              <BotanicalFallback index={index} />
                            ) : (
                              <motion.div
                                className="absolute inset-0"
                                initial={{ scale: 1.01, x: 0, y: 0 }}
                                animate={
                                  reduce
                                    ? undefined
                                    : {
                                        scale: 1.07,
                                        x: `${direction * (index % 2 ? 1 : -1)}%`,
                                        y: index % 3 === 0 ? "-1%" : "1%",
                                      }
                                }
                                transition={{ duration: AUTO_MS / 1000 + 3, ease: "linear" }}
                              >
                                <Image
                                  src={photo.src}
                                  alt={photo.alt}
                                  fill
                                  sizes={SIZES}
                                  loading={index === 0 ? "eager" : undefined}
                                  fetchPriority={index === 0 ? "high" : undefined}
                                  className="object-cover"
                                  onError={() => markFailed(index)}
                                />
                              </motion.div>
                            )}
                          </motion.div>
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Warm the next frame so the crossfade never reveals an empty pane. */}
                    {!failed.has(next) && (
                      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-0">
                        <Image
                          src={PHOTOS[next].src}
                          alt=""
                          fill
                          sizes={SIZES}
                          loading="eager"
                          className="object-cover"
                          onError={() => markFailed(next)}
                        />
                      </div>
                    )}

                    {/* Glass: honey wash and a cursor-following sheen */}
                    <div aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-t from-dusk-amber/15 via-transparent to-petal-lilac/10 mix-blend-soft-light" />
                    <motion.div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 mix-blend-soft-light"
                      style={{ backgroundImage: glare }}
                    />
                  </motion.div>
                </div>
              </TimberFrame>
            </motion.div>
          </div>

          {/* ── Controls ────────────────────────────────────────── */}
          <div className="mt-5 flex items-center gap-1 rounded-full border border-bruised-lavender/30 bg-linen/80 p-1 shadow-lg shadow-twilight-indigo/25 backdrop-blur-xl">
            <motion.button
              type="button"
              onClick={() => go(-1)}
              whileTap={reduce ? undefined : { scale: 0.88 }}
              transition={SPRING_TACTILE}
              aria-label="Previous photo"
              className="grid size-9 place-items-center rounded-full text-velvet-plum transition-colors hover:bg-petal-lilac/45 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-dusk-amber"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </motion.button>

            <div className="flex items-center" role="group" aria-label="Choose a photo">
              {PHOTOS.map((p, i) => {
                const active = i === index;
                return (
                  <button
                    key={p.src}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Show photo ${i + 1} of ${PHOTO_COUNT}`}
                    aria-current={active ? "true" : undefined}
                    className="group grid h-6 w-4 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-dusk-amber sm:w-5"
                  >
                    <span
                      className={`relative block h-1.5 overflow-hidden rounded-full transition-[width,background-color] duration-500 ${
                        active
                          ? "w-3.5 bg-bruised-lavender/35 sm:w-4"
                          : "w-1.5 bg-bruised-lavender/55 group-hover:bg-velvet-plum/60"
                      }`}
                    >
                      {active && (
                        <motion.span
                          key={`${index}-${running}`}
                          className="absolute inset-0 origin-left rounded-full bg-velvet-plum"
                          initial={{ scaleX: running ? 0 : 1 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: running ? AUTO_MS / 1000 : 0, ease: "linear" }}
                        />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <motion.button
              type="button"
              onClick={() => go(1)}
              whileTap={reduce ? undefined : { scale: 0.88 }}
              transition={SPRING_TACTILE}
              aria-label="Next photo"
              className="grid size-9 place-items-center rounded-full text-velvet-plum transition-colors hover:bg-petal-lilac/45 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-dusk-amber"
            >
              <ChevronRight className="size-4" aria-hidden />
            </motion.button>
          </div>

          <button
            type="button"
            onClick={() => setAutoChoice(!autoPlay)}
            className="mt-3 flex min-h-8 items-center gap-1.5 rounded-full border border-bruised-lavender/25 bg-linen/70 px-3.5 py-1.5 font-mono text-[0.62rem] tracking-[0.22em] text-ink/75 uppercase shadow-md shadow-twilight-indigo/20 backdrop-blur-lg transition-colors hover:text-velvet-plum focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-dusk-amber"
          >
            {autoPlay ? (
              <Pause className="size-3 fill-current" aria-hidden />
            ) : (
              <Play className="size-3 fill-current" aria-hidden />
            )}
            {autoPlay ? "Pause slideshow" : "Play slideshow"}
          </button>
        </section>
      </motion.div>

      {/* ── Dedication ─────────────────────────────────────────── */}
      <motion.article
        variants={rise}
        className="mx-auto w-full max-w-xl rounded-[1.75rem] border border-orchid-white/50 bg-linen/80 px-6 py-7 text-center shadow-xl shadow-twilight-indigo/25 backdrop-blur-xl sm:px-9 lg:col-span-5 lg:col-start-1 lg:row-start-2 lg:mx-0 lg:max-w-none lg:self-start lg:text-left"
      >
        <p className="font-mono text-[0.62rem] tracking-[0.3em] text-dusk-amber uppercase">
          For Marsha Syarina Putri
        </p>
        <div className="mt-4 space-y-3.5 text-[0.98rem] leading-relaxed text-ink/85">
          <p>
            Hello again ! To my favorite person turning 23, my life literally
            turned around when you entered in. Ya sebenernya sunshine and
            rainbows juga but this time it&rsquo;s heaven and peace. It&rsquo;s a
            pure bliss to see you bloom on this birthday ! 23 times you&rsquo;ve
            revolved around the Sun and lucky me i got to see it revolved at the
            same number as LEBROOON !. Anyways i hope you like this short
            website.
          </p>
        </div>
        <p
          className="mt-5 font-serif text-lg text-velvet-plum italic"
          style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 36' }}
        >
          — With so much love, Ayeeel !
        </p>
      </motion.article>
    </motion.div>
  );
}
