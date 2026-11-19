# Chaca 23 — Marsha Syarina Putri (Marchi)

A bespoke, interactive 23rd birthday web experience for Marsha Syarina Putri (Marchi / Chaca).
Spatial narrative:
1. Entry Greet Pop-Up (unlocks audio)
2. Section 1: Outside a Swiss Alpine chalet at dusk — top spinning mini vinyl player, 12-photo arched chalet carousel, and white orchids clinging to the screen edges that grow longer as you scroll
3. Section 2: Garden of 23 Petals — a light-violet Chrysanthemum where plucking all 23 petals zooms into a scrollable birthday letter with a selectable-text PDF export button
4. Section 3: Inside the Chalet Living Room — seamless transition indoors to a crackling stone fireplace, cute animated sleeping cats, a retro wooden CRT TV playing "Channel 08: Eight Days to the 8th" (8 custom videos), and a full Rewind button at the bottom

## Tone & Creative Direction
- Warm, intimate, mature, and slightly whimsical — never corny, theatrical, or generic.
- Think NIKI (honey / amber glow) meets Olivia Rodrigo (velvet plum / lavender), laid on raw linen.
- Motion is tactile, fluid, and physics-driven (Apple-tier springs, soft crossfades, cursor-reactive depth), never jarring or overly bouncy.

## Color Palette (Tailwind v4 tokens in `app/globals.css` via `@theme`)
| Token | Hex | Use |
|---|---|---|
| `linen` | #FAF7F2 | Primary page background & frosted glass surfaces |
| `linen-deep` | #F1EAE0 | Recessed surfaces, photo mounts, letter parchment |
| `orchid-white` | #FFFDF9 | White edge-clinging orchids, delicate highlights, card sheen |
| `velvet-plum` | #5B2A4E | Headings, vinyl disc, deep accents, primary buttons |
| `bruised-lavender` | #9B8BB4 | Outer chrysanthemum petals, dusk sky, 1px borders |
| `petal-lilac` | #C8BBD9 | Inner chrysanthemum petals, orchid throat shading, soft hover states |
| `twilight-indigo` | #3E314A | Distant Alpine mountain ridges, dark CRT screen glass |
| `dusk-amber` | #D9A05B | Honey glow, active sliders, warm golden-hour accents |
| `ember-gold` | #E8B878 | Fireplace core glow, chalet window light, drifting fireflies |
| `hearth-terracotta` | #B86B4B | Fireplace brick tones, flame midtones, warm blush accents |
| `chalet-cedar` | #6E4B3A | Swiss timber paneling, wooden CRT TV casing, chalet beams |
| `alpine-sage` | #7D8C7A | Desaturated orchid vines/stems, distant Alpine pine slopes |
| `ink` | #3A2335 | Body text (warm plum-charcoal, never pure black) |

Use as `bg-linen`, `text-velvet-plum`, `border-bruised-lavender/40`, `bg-chalet-cedar`, etc. Do not introduce stray hex codes; rely on these tokens and their opacity variants.

## Typography
- `font-serif`: **Fraunces** (editorial display, variable `SOFT`/`WONK`/`opsz` axes — set accents with `fontVariationSettings`).
- `font-sans`: **Geist** (clean reading, UI controls, and scrollable letter body).
- `font-mono`: **Geist Mono** (vinyl timestamps, `0 / 23` petal counter, TV channel numbers `CH 01–08`).

## Public Assets & Paths (Inside `public/`)
- **Background Vinyl Audio**: `public/background_music/` — Mac Miller *Congratulations* instrumental — exact file: `public/background_music/congratulations.mp3` (served at `/background_music/congratulations.mp3`).
- **Carousel Photos**: `public/chaca_photos/chaca1.jpg` through `public/chaca_photos/chaca12.jpg` (12 photos; include graceful botanical fallbacks if any file is missing).
- **Retro TV Videos**: `public/video_greet/` — 8 birthday greeting videos — **folder is currently empty**; the 8 video filenames must be added here once the files are dropped into `public/video_greet/`.

## Architecture & Components
- `app/layout.tsx` — Server Component; configures fonts and metadata.
- `app/globals.css` — Tailwind v4 `@import "tailwindcss";` and `@theme` token definitions.
- `app/lib/motion.ts` — Shared Framer Motion spring presets, `EASE_DUSK`, and reduced-motion helpers so every component moves at a unified tempo.
- `app/page.tsx` — Orchestrates global state (modal dismissed / audio unlocked, external vinyl pause when TV plays, full rewind reset) across all 3 sections.
- `app/components/WelcomeModal.tsx` — Frosted-linen greeting pop-up; clicking its close/enter button dismisses the modal and calls `audio.play()` on the vinyl player so browser autoplay succeeds cleanly.
- `app/components/VinylPlayer.tsx` — Top docked frosted-linen pill featuring a spinning mini vinyl record, pivoting brass tonearm, and HTML5 `<audio>` streaming from `/background_music/...` in a seamless loop with play/pause and progress bar. Accepts `externalPause` to pause automatically when a TV video plays.
- `app/components/AlpineExterior.tsx` — Multi-layered Swiss Alpine chalet at dusk backdrop (parallax mountains via `useScroll`, wooden chalet with glowing `ember-gold` windows, paper grain, drifting golden fireflies).
- `app/components/PhotoCarousel.tsx` — 3D cursor-tilting arched chalet-window carousel showcasing `/chaca_photos/chaca1.jpg` through `chaca12.jpg`, paired with Fraunces birthday typography.
- `app/components/ScrollOrchids.tsx` — Fixed `orchid-white` orchids with `petal-lilac` and `dusk-amber` throats on `alpine-sage` vines clinging to the left and right viewport edges (`pointer-events-none`) whose vine `pathLength` and blossoms grow longer via `useScroll`.
- `app/components/ChrysanthemumGame.tsx` — Two-tone (`bruised-lavender` & `petal-lilac`) Chrysanthemum with 23 individually pluckable petals (clickable directly or via button), sparkle bursts and gravity flutter on pluck, and a 23rd-petal zoom morph into a fixed-size scrollable letter card (`overflow-y-auto`, driven by a top-level `BIRTHDAY_LETTER_TEXT` constant) with a `jsPDF` selectable-text PDF download button (`Happy-23rd-Birthday-Marchi.pdf`).
- `app/components/LivingRoomScene.tsx` — Indoor chalet living room transition with `chalet-cedar` timber walls, `hearth-terracotta` and `ember-gold` flickering fireplace, cute animated sleeping cats curled by the hearth, a retro wooden CRT TV ("Channel 08: Eight Days to the 8th") with `CH 01`–`CH 08` buttons playing the 8 videos from `/video_greet/`, plus a bottom "Rewind & Replay" button that resets all 23 petals, TV state, and scrolls smoothly to the top.

## Tech Rules
- Next.js 16 App Router (`app/`), strict TypeScript, Tailwind CSS v4 (no `tailwind.config.ts`).
- Dependencies: `framer-motion`, `lucide-react`, `canvas-confetti`, `jspdf`.
- Mark interactive components using hooks/browser APIs with `"use client"`; keep static wrappers as Server Components.
- **Zero-warning Vercel builds**: `npm run build` and `npm run lint` must pass with no errors or warnings (no unused vars/imports, no `any`, valid hook deps).
- Before using unfamiliar Next.js 16 APIs, check `node_modules/next/dist/docs/` (per `AGENTS.md`).
- Responsive and accessible: mobile-first, zero horizontal overflow, alt text, and `prefers-reduced-motion` support.