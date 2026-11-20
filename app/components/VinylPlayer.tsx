"use client";

import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import { Pause, Play, VolumeX } from "lucide-react";
import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type Ref,
} from "react";
import { EASE_DUSK, SPRING_SOFT, pickTransition } from "../lib/motion";

export const VINYL_SRC = "/background_music/congratulations.mp3";

/** 33⅓ rpm expressed in degrees per millisecond. */
const SPIN_DEG_PER_MS = (100 / 3) * 360 / 60_000;
/** How quickly the platter reaches speed / coasts to a halt (per ms). */
const SPIN_EASE_UP = 0.0026;
const SPIN_EASE_DOWN = 0.0014;

const GROOVES = [19.5, 18, 16.5, 15, 13.5, 12, 10.5];

export type VinylHandle = {
  /** Must be called from inside a user gesture so autoplay is permitted. */
  play: () => void;
};

type VinylPlayerProps = {
  ref?: Ref<VinylHandle>;
  /** When true, the record lifts off; when it flips back, play resumes if it was playing. */
  externalPause?: boolean;
  /** Slides the pill into view once the guest has stepped inside. */
  revealed?: boolean;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VinylPlayer({
  ref,
  externalPause = false,
  revealed = true,
}: Readonly<VinylPlayerProps>) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const resumeAfterExternal = useRef(false);
  const velocity = useRef(0);
  const rotation = useMotionValue(0);
  const reduceMotion = useReducedMotion();

  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  const requestPlay = () => {
    const audio = audioRef.current;
    if (!audio || failed) return;
    audio.volume = 0.72;
    audio.play().catch((err: unknown) => {
      // Autoplay refusal is recoverable via the play button; anything else is a dead file.
      if (!(err instanceof DOMException && err.name === "NotAllowedError")) {
        setFailed(true);
      }
    });
  };

  useImperativeHandle(ref, () => ({ play: requestPlay }));

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) requestPlay();
    else audio.pause();
  };

  // Pause for the TV (or anything else) and pick the needle back up afterwards.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (externalPause) {
      resumeAfterExternal.current = !audio.paused;
      audio.pause();
    } else if (resumeAfterExternal.current) {
      resumeAfterExternal.current = false;
      audio.play().catch(() => undefined);
    }
  }, [externalPause]);

  // Platter physics: velocity eases toward 33⅓ rpm, then coasts down on pause.
  useAnimationFrame((_, delta) => {
    if (reduceMotion) return;
    const target = playing ? SPIN_DEG_PER_MS : 0;
    const ease = playing ? SPIN_EASE_UP : SPIN_EASE_DOWN;
    const step = Math.min(delta, 64);
    velocity.current += (target - velocity.current) * (1 - Math.exp(-ease * step));
    if (Math.abs(velocity.current) < 0.00005 && !playing) {
      velocity.current = 0;
      return;
    }
    rotation.set((rotation.get() + velocity.current * step) % 360);
  });

  const onSeek = (e: ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Number(e.target.value);
    audio.currentTime = next;
    setCurrent(next);
  };

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <motion.div
      initial={false}
      animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: -24 }}
      transition={pickTransition(reduceMotion, SPRING_SOFT)}
      className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4 sm:top-5"
      inert={!revealed}
    >
      <div className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-full border border-bruised-lavender/30 bg-linen/75 py-2 pr-3 pl-2 shadow-[0_10px_40px_-12px] shadow-velvet-plum/25 backdrop-blur-xl">
        {/* ── Turntable ─────────────────────────────────────────── */}
        <div className="relative size-12 shrink-0">
          <div className="absolute inset-0 rounded-full bg-linen-deep shadow-inner shadow-ink/20" />

          <motion.svg
            viewBox="0 0 44 44"
            className="absolute inset-0.5 size-11"
            style={{ rotate: rotation }}
            aria-hidden
          >
            <circle cx="22" cy="22" r="21" fill="var(--color-ink)" />
            {GROOVES.map((r) => (
              <circle
                key={r}
                cx="22"
                cy="22"
                r={r}
                fill="none"
                stroke="var(--color-orchid-white)"
                strokeOpacity={0.09}
                strokeWidth={0.45}
              />
            ))}
            <circle cx="22" cy="22" r="8" fill="var(--color-velvet-plum)" />
            <circle
              cx="22"
              cy="22"
              r="7.2"
              fill="none"
              stroke="var(--color-dusk-amber)"
              strokeOpacity={0.6}
              strokeWidth={0.4}
            />
            {/* A tiny off-centre mark on the label so the spin reads. */}
            <path
              d="M22 16.4 a5.6 5.6 0 0 1 4.8 2.8"
              fill="none"
              stroke="var(--color-orchid-white)"
              strokeOpacity={0.55}
              strokeWidth={0.6}
              strokeLinecap="round"
            />
            <circle cx="22" cy="22" r="1" fill="var(--color-linen)" />
          </motion.svg>

          {/* Fixed sheen: the light stays put while the record turns beneath it. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0.5 rounded-full bg-[conic-gradient(from_200deg,transparent_0deg,var(--color-orchid-white)_28deg,transparent_62deg,transparent_180deg,var(--color-petal-lilac)_212deg,transparent_246deg)] opacity-25 mix-blend-screen"
          />

          {/* Brass tonearm, pivoting from the top-right corner. */}
          <motion.svg
            viewBox="0 0 24 30"
            className="absolute -top-1 -right-2.5 h-[30px] w-6 overflow-visible"
            style={{ originX: "19px", originY: "5px" }}
            initial={false}
            animate={{ rotate: playing ? 0 : -30 }}
            transition={pickTransition(reduceMotion, {
              type: "spring",
              stiffness: 90,
              damping: 16,
              mass: 0.7,
            })}
            aria-hidden
          >
            <circle cx="19" cy="5" r="3.4" fill="var(--color-linen-deep)" stroke="var(--color-chalet-cedar)" strokeOpacity={0.35} strokeWidth={0.6} />
            <path
              d="M19 5 L16 20 Q15.2 24 12 25.5"
              fill="none"
              stroke="var(--color-dusk-amber)"
              strokeWidth={1.4}
              strokeLinecap="round"
            />
            <rect x="9.6" y="24" width="3.6" height="2.4" rx="0.6" transform="rotate(-24 11.4 25.2)" fill="var(--color-dusk-amber)" />
            <circle cx="19" cy="5" r="1.3" fill="var(--color-dusk-amber)" />
          </motion.svg>
        </div>

        {/* ── Track info & progress ─────────────────────────────── */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-[0.95rem] leading-tight text-velvet-plum" style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 24' }}>
            Congratulations{" "}
            <span className="font-sans text-xs text-ink/55">— Mac Miller</span>
          </p>

          {failed ? (
            <p className="mt-1 flex items-center gap-1 text-[0.7rem] text-ink/55">
              <VolumeX className="size-3" aria-hidden /> The record&rsquo;s resting tonight
            </p>
          ) : (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="font-mono text-[0.62rem] tabular-nums text-ink/50">
                {formatTime(current)}
              </span>
              <div className="group relative h-3 flex-1">
                <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-bruised-lavender/25">
                  <div
                    className="h-full rounded-full bg-dusk-amber transition-[width] duration-200 ease-linear"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div
                  aria-hidden
                  className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-dusk-amber shadow-sm shadow-velvet-plum/30 transition-transform duration-200 group-hover:scale-100 group-focus-within:scale-100"
                  style={{ left: `${progress}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={current}
                  onChange={onSeek}
                  disabled={!duration}
                  aria-label="Seek within Congratulations"
                  aria-valuetext={`${formatTime(current)} of ${formatTime(duration)}`}
                  className="absolute inset-0 w-full cursor-pointer opacity-0 disabled:cursor-default"
                />
              </div>
              <span className="font-mono text-[0.62rem] tabular-nums text-ink/50">
                {formatTime(duration)}
              </span>
            </div>
          )}
        </div>

        {/* ── Play / pause ──────────────────────────────────────── */}
        <motion.button
          type="button"
          onClick={toggle}
          disabled={failed}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.25, ease: EASE_DUSK }}
          aria-label={playing ? "Pause music" : "Play music"}
          aria-pressed={playing}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-velvet-plum text-linen shadow-md shadow-velvet-plum/30 transition-colors hover:bg-velvet-plum/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dusk-amber disabled:bg-bruised-lavender/50"
        >
          {playing ? (
            <Pause className="size-3.5 fill-current" aria-hidden />
          ) : (
            <Play className="ml-0.5 size-3.5 fill-current" aria-hidden />
          )}
        </motion.button>

        <audio
          ref={audioRef}
          src={VINYL_SRC}
          loop
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onDurationChange={(e) => setDuration(e.currentTarget.duration)}
          onError={() => {
            setFailed(true);
            setPlaying(false);
          }}
        />
      </div>
    </motion.div>
  );
}
