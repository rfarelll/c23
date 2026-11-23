"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import AlpineExterior from "./components/AlpineExterior";
import { Anemone, CallaLily, LilyOfTheValley } from "./components/BotanicalAccents";
import ChrysanthemumGame from "./components/ChrysanthemumGame";
import LivingRoomScene from "./components/LivingRoomScene";
import PhotoCarousel from "./components/PhotoCarousel";
import ScrollOrchids from "./components/ScrollOrchids";
import VinylPlayer, { type VinylHandle } from "./components/VinylPlayer";
import WelcomeModal from "./components/WelcomeModal";
import { SPRING_TACTILE, rise, smoothScrollTo, stagger, usePrefersReducedMotion } from "./lib/motion";

/** How long the glide back to the porch takes, in seconds. */
const REWIND_GLIDE = 1.4;

/** Pressed between pages: laid flat, a little faded, a soft shadow on the card. */
const PRESSED =
  "absolute opacity-85 drop-shadow-[0_2px_3px_color-mix(in_oklab,var(--color-chalet-cedar)_22%,transparent)]";

function ClosingNote({ onRewind }: Readonly<{ onRewind: () => void }>) {
  const reduce = usePrefersReducedMotion();
  const [turns, setTurns] = useState(0);

  const rewind = () => {
    setTurns((t) => t + 1);
    onRewind();
  };

  return (
    <section id="closing-note" aria-labelledby="closing-heading" className="relative overflow-hidden">
      {/* Linen tooth across the whole note, dusk band included, so no seam shows */}
      <div aria-hidden className="paper-grain pointer-events-none absolute inset-0 opacity-20 mix-blend-multiply" />

      {/* The room's dusk floor melting back into linen */}
      <div aria-hidden className="h-[24svh] bg-linear-to-b from-twilight-indigo via-velvet-plum/35 to-linen" />

      <div className="relative flex flex-col items-center px-16 pt-6 pb-28 text-center sm:px-24 sm:pb-32">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/2 h-[30rem] w-[min(52rem,140vw)] -translate-x-1/2 -translate-y-1/4 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-ember-gold)_32%,transparent),transparent)] blur-2xl" />
        </div>

        <motion.div
          variants={stagger(0.12)}
          initial="hidden"
          whileInView="shown"
          viewport={{ once: true, amount: 0.5 }}
          className="relative w-full max-w-lg"
        >
          {/* The note itself, framed by pressed sprigs laid at its corners */}
          <motion.div
            variants={rise}
            className="relative rounded-[1.75rem] border border-bruised-lavender/25 bg-linen/75 px-6 py-8 shadow-xl shadow-velvet-plum/10 backdrop-blur-md sm:px-10 sm:py-10"
          >
            <p className="font-mono text-[0.66rem] tracking-[0.34em] text-dusk-amber uppercase">Before you go</p>
            <h2
              id="closing-heading"
              className="mt-4 font-serif text-[clamp(2.1rem,6vw,3.4rem)] leading-[1.04] text-balance text-velvet-plum"
              style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 144' }}
            >
              Happy 23rd, <em className="italic">Marchi</em>
            </h2>
            <p className="mx-auto mt-5 max-w-md text-[0.98rem] leading-relaxed text-pretty text-ink/75">
              The fire&rsquo;s banked low, the cats have claimed the warm spot, and the record will keep
              turning for as long as you&rsquo;d like it to. Stay a while, or wind the whole evening back
              and walk through it again.
            </p>

            <CallaLily
              still
              leaf={false}
              className={`-top-12 -left-6 w-12 -rotate-[26deg] sm:-top-16 sm:-left-12 sm:w-16 ${PRESSED}`}
            />
            <Anemone still className={`-top-7 -right-5 w-12 rotate-[16deg] sm:-top-9 sm:-right-9 sm:w-14 ${PRESSED}`} />
            <LilyOfTheValley
              still
              flip
              className={`-right-5 -bottom-6 w-14 -rotate-[6deg] sm:-right-10 sm:-bottom-8 sm:w-[4.5rem] ${PRESSED}`}
            />
          </motion.div>

          <motion.div variants={rise} className="mt-9 flex flex-col items-center gap-3">
            <motion.button
              type="button"
              onClick={rewind}
              whileHover={reduce ? undefined : { y: -2 }}
              whileTap={reduce ? undefined : { scale: 0.95, y: 0 }}
              transition={SPRING_TACTILE}
              className="flex items-center gap-2.5 rounded-full bg-velvet-plum px-7 py-3.5 font-serif text-base text-linen shadow-lg shadow-velvet-plum/30 transition-shadow hover:shadow-xl hover:shadow-dusk-amber/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-dusk-amber"
              style={{ fontVariationSettings: '"SOFT" 100, "opsz" 24' }}
            >
              {/* One full counter-clockwise turn per rewind, unwinding with the glide */}
              <motion.span
                aria-hidden
                initial={false}
                animate={{ rotate: -360 * turns }}
                transition={reduce ? { duration: 0 } : { duration: REWIND_GLIDE, ease: [0.22, 1, 0.36, 1] }}
                className="grid"
              >
                <RotateCcw className="size-4" />
              </motion.span>
              Rewind the Whole Story
            </motion.button>
            <p className="max-w-xs text-xs leading-relaxed text-balance text-ink/55">
              Back to the porch light: petals, channels and all.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default function Home() {
  const vinylRef = useRef<VinylHandle>(null);
  const [entered, setEntered] = useState(false);
  // True while a TV tape plays: the record lifts, and drops back when the tape stops.
  const [tvPlaying, setTvPlaying] = useState(false);
  // Bumped by "Rewind the Whole Story": petals fly home, the letter closes, the TV returns to CH 01.
  const [resetKey, setResetKey] = useState(0);

  // Hold the page still until she steps outside.
  useEffect(() => {
    const root = document.documentElement;
    root.style.overflow = entered ? "" : "hidden";
    return () => {
      root.style.overflow = "";
    };
  }, [entered]);

  const handleEnter = () => {
    // Called inside the click gesture, so the browser allows playback.
    vinylRef.current?.play();
    setEntered(true);
  };

  const rewindStory = async () => {
    setResetKey((k) => k + 1);
    // The TV remounts on CH 01 with its tape stopped, so hand the music back now.
    setTvPlaying(false);
    await smoothScrollTo(0, REWIND_GLIDE);
    // Keyboard and screen-reader users arrive at the top too, unless she took the wheel mid-glide.
    const heading = document.getElementById("chalet-heading");
    if (heading && window.scrollY < 4) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <VinylPlayer ref={vinylRef} externalPause={tvPlaying} revealed={entered} />

      <AnimatePresence>
        {!entered && <WelcomeModal onEnter={handleEnter} />}
      </AnimatePresence>

      {/* Fixed edge vines for the whole page: z-30 sits over section content (z-10) but under
          the vinyl pill (z-50) and the modals. Growth tracks window scroll, top to bottom. */}
      <ScrollOrchids revealed={entered} />

      <main className="flex min-h-dvh flex-1 flex-col" inert={!entered}>
        {/* Section 1 — Outside the chalet at dusk */}
        <AlpineExterior>
          <PhotoCarousel revealed={entered} />
        </AlpineExterior>

        {/* Section 2 — The garden of 23 petals */}
        <ChrysanthemumGame resetKey={resetKey} />

        {/* Section 3 — Through the window, into the living room */}
        <LivingRoomScene
          resetKey={resetKey}
          onVideoPlay={() => setTvPlaying(true)}
          onVideoPause={() => setTvPlaying(false)}
          onVideoEnded={() => setTvPlaying(false)}
        />

        <ClosingNote onRewind={() => void rewindStory()} />
      </main>
    </MotionConfig>
  );
}
