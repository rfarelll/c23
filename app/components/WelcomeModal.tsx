"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Headphones } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  EASE_DUSK,
  SPRING_SOFT,
  SPRING_TACTILE,
  pickTransition,
  rise,
  stagger,
} from "../lib/motion";

type WelcomeModalProps = {
  onEnter: () => void;
};

/** A single white orchid bloom: amber throat, plum lip, lilac veins. */
function OrchidCrest() {
  return (
    <svg viewBox="0 0 96 96" className="size-20" aria-hidden>
      {/* Arching stem */}
      <path
        d="M14 88 C26 70 30 56 44 48"
        fill="none"
        stroke="var(--color-alpine-sage)"
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      <path
        d="M22 76 C14 74 10 68 11 62 C17 64 21 69 22 76Z"
        fill="var(--color-alpine-sage)"
        fillOpacity={0.55}
      />
      {/* Bud */}
      <ellipse cx="20" cy="79" rx="3" ry="4.2" transform="rotate(-30 20 79)" fill="var(--color-orchid-white)" stroke="var(--color-petal-lilac)" strokeWidth={0.6} />

      <g transform="translate(54 40)">
        {/* Sepals */}
        {[-90, 30, 150].map((deg) => (
          <path
            key={deg}
            d="M0 0 C-5 -10 -4 -22 0 -26 C4 -22 5 -10 0 0Z"
            transform={`rotate(${deg + 90})`}
            fill="var(--color-orchid-white)"
            stroke="var(--color-velvet-plum)"
            strokeOpacity={0.35}
            strokeWidth={0.6}
          />
        ))}
        {/* Petals */}
        {[-35, 35].map((deg) => (
          <g key={deg} transform={`rotate(${deg})`}>
            <path
              d="M0 0 C-11 -6 -14 -20 -6 -24 C2 -26 8 -14 0 0Z"
              fill="var(--color-orchid-white)"
              stroke="var(--color-velvet-plum)"
              strokeOpacity={0.4}
              strokeWidth={0.6}
            />
            <path
              d="M-1 -3 C-4 -10 -6 -16 -5 -21"
              fill="none"
              stroke="var(--color-petal-lilac)"
              strokeWidth={0.5}
            />
          </g>
        ))}
        {/* Lip & throat */}
        <path
          d="M-6 4 C-8 12 -3 17 0 17 C3 17 8 12 6 4 C3 7 -3 7 -6 4Z"
          fill="var(--color-velvet-plum)"
          fillOpacity={0.85}
        />
        <ellipse cx="0" cy="3" rx="3.4" ry="2.6" fill="var(--color-dusk-amber)" />
        <circle cx="0" cy="2" r="1" fill="var(--color-orchid-white)" />
      </g>
    </svg>
  );
}

export default function WelcomeModal({ onEnter }: Readonly<WelcomeModalProps>) {
  const reduceMotion = useReducedMotion();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    buttonRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <motion.div
      key="welcome"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      aria-describedby="welcome-body"
      className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto px-4 py-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.9, ease: EASE_DUSK }}
    >
      {/* Dusk backdrop, softly out of focus */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-twilight-indigo via-bruised-lavender to-dusk-amber/80"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_at_50%_100%,var(--color-ember-gold),transparent_65%)] opacity-50 blur-2xl"
      />
      <div aria-hidden className="absolute inset-0 bg-linen/10 backdrop-blur-md" />

      <motion.section
        className="relative w-full max-w-md rounded-[2rem] border border-orchid-white/60 bg-linen/90 px-7 pt-9 pb-8 text-center shadow-2xl shadow-twilight-indigo/40 backdrop-blur-xl sm:px-10"
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 1.03, filter: "blur(6px)" }}
        transition={pickTransition(reduceMotion, SPRING_SOFT)}
      >
        <motion.div
          variants={stagger(0.14, 0.25)}
          initial="hidden"
          animate="shown"
          className="flex flex-col items-center"
        >
          <motion.div variants={rise} className="relative mb-3">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 scale-125 rounded-full bg-dusk-amber/20 blur-xl"
            />
            <OrchidCrest />
          </motion.div>

          <motion.p
            variants={rise}
            className="font-mono text-[0.68rem] tracking-[0.32em] text-dusk-amber uppercase"
          >
            Twenty-three
          </motion.p>

          <motion.h1
            id="welcome-title"
            variants={rise}
            className="mt-3 font-serif text-[2.1rem] leading-[1.05] text-velvet-plum sm:text-[2.5rem]"
            style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 96' }}
          >
            Happy birthday,
            <br />
            <em className="italic">Marchi.</em>
          </motion.h1>

          <motion.div
            id="welcome-body"
            variants={rise}
            className="mt-5 space-y-3 text-[0.95rem] leading-relaxed text-ink/80"
          >
            <p>
              Hewwooo mi bebeee !! please enjoy yaaa this website XIXIXI. Sit
              back and relax, enjoy the show
            </p>
          </motion.div>

          <motion.p
            variants={rise}
            className="mt-6 flex items-center gap-2 rounded-full border border-bruised-lavender/30 bg-linen-deep/70 px-3.5 py-1.5 text-xs text-ink/70"
          >
            <Headphones className="size-3.5 text-velvet-plum" aria-hidden />
            Turn the volume up too !
          </motion.p>

          <motion.button
            ref={buttonRef}
            type="button"
            variants={rise}
            onClick={onEnter}
            whileHover={reduceMotion ? undefined : { y: -2 }}
            whileTap={reduceMotion ? undefined : { scale: 0.96, y: 0 }}
            transition={SPRING_TACTILE}
            className="mt-7 rounded-full bg-velvet-plum px-7 py-3.5 font-serif text-base text-linen shadow-lg shadow-velvet-plum/30 transition-shadow hover:shadow-xl hover:shadow-dusk-amber/30 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-dusk-amber"
            style={{ fontVariationSettings: '"SOFT" 100, "opsz" 24' }}
          >
            Begin
          </motion.button>
        </motion.div>
      </motion.section>
    </motion.div>
  );
}
