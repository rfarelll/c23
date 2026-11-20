import { animate, useReducedMotion } from "framer-motion";
import type { Transition, Variants } from "framer-motion";

/** Ease for page glides: quick to leave, long soft landing. */
export const EASE_GLIDE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const INTERRUPT_EVENTS = ["wheel", "touchstart", "keydown"] as const;
let stopActiveGlide: (() => void) | null = null;

/**
 * Glide the window to `targetY` with a Framer Motion tween. Any wheel, touch or key input
 * mid-glide hands control straight back to the reader. Starting a new glide cancels the
 * previous one. Reduced motion jumps instantly. Resolves when the glide ends or is interrupted.
 */
export function smoothScrollTo(targetY: number, duration = 1.15): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  stopActiveGlide?.();

  const maxY = document.documentElement.scrollHeight - window.innerHeight;
  const to = Math.max(0, Math.min(targetY, maxY));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduced || Math.abs(window.scrollY - to) < 2) {
    window.scrollTo(0, to);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const controls = animate(window.scrollY, to, {
      duration,
      ease: EASE_GLIDE,
      onUpdate: (value) => window.scrollTo(0, value),
      onComplete: () => finish(),
    });

    const interrupt = () => {
      controls.stop();
      finish();
    };

    function finish() {
      for (const type of INTERRUPT_EVENTS) window.removeEventListener(type, interrupt);
      if (stopActiveGlide === interrupt) stopActiveGlide = null;
      resolve();
    }

    for (const type of INTERRUPT_EVENTS) {
      window.addEventListener(type, interrupt, { once: true, passive: true });
    }
    stopActiveGlide = interrupt;
  });
}

/** Long, unhurried ease — everything arrives like dusk, never like a popup. */
export const EASE_DUSK: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Tactile spring presets — soft, physics-driven, never overly bouncy. */
export const SPRING_SOFT: Transition = {
  type: "spring",
  stiffness: 120,
  damping: 20,
  mass: 0.9,
};

export const SPRING_TACTILE: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 26,
  mass: 0.8,
};

export const SPRING_GENTLE: Transition = {
  type: "spring",
  stiffness: 60,
  damping: 18,
  mass: 1.1,
};

/** Spring config for cursor-reactive depth (useSpring). */
export const SPRING_TILT = { stiffness: 150, damping: 18, mass: 0.6 } as const;

/** Instant transition used when the user prefers reduced motion. */
export const NO_MOTION: Transition = { duration: 0 };

/** Returns `reduced` when the user prefers reduced motion, else `full`. */
export function pickTransition(
  prefersReduced: boolean | null,
  full: Transition,
  reduced: Transition = NO_MOTION,
): Transition {
  return prefersReduced ? reduced : full;
}

/** Hook: true when the user prefers reduced motion. */
export function usePrefersReducedMotion(): boolean {
  return useReducedMotion() ?? false;
}

/** Parent: holds the beat between children. */
export const stagger = (
  staggerChildren = 0.12,
  delayChildren = 0,
): Variants => ({
  hidden: {},
  shown: { transition: { staggerChildren, delayChildren } },
});

/** Child: fades up out of a soft blur. */
export const rise: Variants = {
  hidden: { opacity: 0, y: 26, filter: "blur(8px)" },
  shown: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 1.1, ease: EASE_DUSK },
  },
};

/** Child: for long lines of type that should settle rather than slide. */
export const settle: Variants = {
  hidden: { opacity: 0, y: 12 },
  shown: {
    opacity: 1,
    y: 0,
    transition: { duration: 1.4, ease: EASE_DUSK },
  },
};

/** Soft crossfade between scenes. */
export const crossfade: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.9, ease: EASE_DUSK } },
};
