"use client";

import { AnimatePresence, MotionConfig } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import AlpineExterior from "./components/AlpineExterior";
import ChrysanthemumGame from "./components/ChrysanthemumGame";
import PhotoCarousel from "./components/PhotoCarousel";
import ScrollOrchids from "./components/ScrollOrchids";
import VinylPlayer, { type VinylHandle } from "./components/VinylPlayer";
import WelcomeModal from "./components/WelcomeModal";

export default function Home() {
  const vinylRef = useRef<VinylHandle>(null);
  const [entered, setEntered] = useState(false);
  // Flipped by the living-room TV later so the record lifts while a video plays.
  const [tvPlaying] = useState(false);
  // Bumped by the living-room "Rewind & Replay" button to restore all 23 petals.
  const [resetKey] = useState(0);

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
      </main>
    </MotionConfig>
  );
}
