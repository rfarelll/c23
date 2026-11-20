"use client";

import { AnimatePresence, MotionConfig } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import AlpineExterior from "./components/AlpineExterior";
import PhotoCarousel from "./components/PhotoCarousel";
import ScrollOrchids from "./components/ScrollOrchids";
import VinylPlayer, { type VinylHandle } from "./components/VinylPlayer";
import WelcomeModal from "./components/WelcomeModal";

export default function Home() {
  const vinylRef = useRef<VinylHandle>(null);
  const [entered, setEntered] = useState(false);
  // Flipped by the living-room TV later so the record lifts while a video plays.
  const [tvPlaying] = useState(false);

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

      {/* Fixed edge vines: above scene backdrops (z-auto), beneath section content (z-10). */}
      <ScrollOrchids revealed={entered} />

      <main className="flex min-h-dvh flex-1 flex-col" inert={!entered}>
        {/* Section 1 — Outside the chalet at dusk */}
        <AlpineExterior>
          <PhotoCarousel revealed={entered} />
        </AlpineExterior>
      </main>
    </MotionConfig>
  );
}
