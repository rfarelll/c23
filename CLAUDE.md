# Chaca 23 — Marsha Syarina Putri (Marchi)

A bespoke, interactive 23rd birthday web experience for Marsha Syarina Putri (Marchi / Chaca).
Spatial narrative:
1. Entry Greet Pop-Up (unlocks audio)
2. Section 1: Outside a Swiss Alpine chalet at dusk — top spinning mini vinyl player, 12-photo arched chalet carousel, and white orchids clinging to the screen edges that grow longer as you scroll
3. Section 2: Garden of 23 Petals — a lush storybook chrysanthemum garden where Marchi finds the one sunlit bloom; tapping it pushes the camera in to a macro close-up, and plucking all 23 petals pulls back out as a scrollable birthday letter opens (with a selectable-text PDF export button)
4. Section 3: Inside the Chalet Living Room — a two-stage sticky scroll camera: through a frosted chalet window, then a slow push in on a retro wooden CRT TV ("Channel 08: Eight Days to the 8th", 8 custom videos) with two chubby sleeping cats on top and a crackling stone hearth behind; followed by a closing note with a "Rewind the Whole Story" button

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
- **Retro TV Videos**: `public/video_greet/` — 8 birthday greeting videos mapped in `LivingRoomScene.tsx`'s top-level `TV_CHANNELS` to `/video_greet/video1.mp4` … `video8.mp4` (CH 01–08). `video1.mp4`–`video4.mp4` are in place; `video5.mp4`–`video8.mp4` are plug-and-play — drop them in with those exact names. Missing files show a vector test card.

## Architecture & Components
- `app/layout.tsx` — Server Component; configures fonts and metadata.
- `app/globals.css` — Tailwind v4 `@import "tailwindcss";` and `@theme` token definitions.
- `app/lib/motion.ts` — Shared Framer Motion spring presets, `EASE_DUSK`, and reduced-motion helpers so every component moves at a unified tempo.
- `app/page.tsx` — Orchestrates global state (modal dismissed / audio unlocked, `tvPlaying` → vinyl `externalPause`, `resetKey` for the full rewind) across all 3 sections, and renders the closing note with the "Rewind the Whole Story" button (petal fly-back, letter closed, garden back to its unzoomed Stage 1, TV to `CH 01`, `smoothScrollTo(0, 1.4)`).
- `app/components/WelcomeModal.tsx` — Frosted-linen greeting pop-up; clicking its close/enter button dismisses the modal and calls `audio.play()` on the vinyl player so browser autoplay succeeds cleanly.
- `app/components/VinylPlayer.tsx` — Top docked frosted-linen pill featuring a spinning mini vinyl record, pivoting brass tonearm, and HTML5 `<audio>` streaming from `/background_music/...` in a seamless loop with play/pause and progress bar. Accepts `externalPause` to pause automatically when a TV video plays.
- `app/components/AlpineExterior.tsx` — Multi-layered Swiss Alpine chalet at dusk backdrop (parallax mountains via `useScroll`, wooden chalet with glowing `ember-gold` windows, paper grain, drifting golden fireflies).
- `app/components/PhotoCarousel.tsx` — 3D cursor-tilting arched chalet-window carousel showcasing `/chaca_photos/chaca1.jpg` through `chaca12.jpg`, paired with Fraunces birthday typography.
- `app/components/ScrollOrchids.tsx` — Fixed `orchid-white` orchids with `petal-lilac` and `dusk-amber` throats on `alpine-sage` vines clinging to the left and right viewport edges (`pointer-events-none`) whose vine `pathLength` and blossoms grow longer via `useScroll`.
- `app/components/ChrysanthemumGame.tsx` — A full-width Chrysanthemum Garden: one 1600×1000 world drawn as four stacked `xMidYMax slice` SVG layers (far ridges/sky → midground foliage beds with far & mid rows of `<use>`-instanced blooms and low `AnemoneArt`/`LilyOfTheValleyArt` accents → the hero bloom → foreground grass, broad leaves and near blooms), 15 two-tone (`bruised-lavender` & `petal-lilac`) 23-petal chrysanthemums in all, every stem rooted in foliage, swaying off one shared `useAnimationFrame` clock with spring-driven amplitudes. Stage 1: only the off-centre `HERO` bloom (diagonal `ember-gold` sunbeam, halo, drifting motes, livelier sway, hover lift; keyboard-focusable) can be chosen; tapping a background bloom wiggles it and flares the sunbeam, under a glass `Tap the sunlit bloom in the garden…` pill. Stage 2: `cameraOnHero()` computes a `scale`/`x`/`y` push-in on the camera `motion.div` that frames the 23 petals in macro, while the other layers take a `blur(4px)`-style depth-of-field and dim, and the pill crossfades into the `00 / 23` counter, `Pluck a Petal` button and hint. Stage 3: 23 individually pluckable petals (clickable directly or via button), sparkle bursts and gravity flutter on pluck; the 23rd pulls the camera back out (blur cleared) as it morphs into a fixed-size scrollable letter card (`overflow-y-auto`, driven by a top-level `BIRTHDAY_LETTER_TEXT` constant) with a `jsPDF` selectable-text PDF download button (`Happy-23rd-Birthday-Marchi.pdf`).
- `app/components/LivingRoomScene.tsx` — Lineless storybook-vector chalet interior in a `h-[300vh]` sticky track: 0–38% the exterior window's sashes swing open and the wall scales 1 → 2.6 and fades; 38–85% the camera pushes 0.72 → 1.55 into a bulbous fisheye CRT (85–100% hold). `--tv` is sized so the close-up (cat ear-tips to the nameplate, curled tail to the cabinet edge) fits the viewport less the orchid rails and the vinyl pill. Stone hearth with layered flames and log niches, a `hearth-terracotta` stoneware vase of calla lilies and magnolia on the mantel, striped armchairs, lamp halos, woven rug, dust motes; two lineless, painterly cats built from seeded fur-lock paths (`furTufts`/`lock`), Catmull-Rom tail tubes (`spline`/`tube`) and multi-stop gradients with firelit rims: left, a ~5.5 kg long-haired cream Persian (heavy chest ruff, grumpy half-lidded amber eyes, fluffy foreleg over the bezel, plume tail draped round the top-left corner clear of the OSD); right, a broader ~6.5 kg white-and-tabby tom (dark cedar/indigo crown split by a white blaze, narrowed pale green-hazel slit-pupil eyes under low brows, freckled golden whisker pads, tabby saddle and hip patches, ringed tail over the top-right corner clear of the controls). Independent breathing, ear and whisker (`animate-whisker`) twitches, and a tail-tip sway pivoting at each tail joint. Barrel-bent scanlines, glare, a 0.25s static burst, an on-screen display (`CH 01 / 08`, title) in the glass's top-left, a control-hint nameplate beneath the bezel, `CH ▲`/`CH ▼` buttons (and ←/→ keys) cycling 1–8, and `onVideoPlay`/`onVideoPause`/`onVideoEnded` callbacks. `resetKey` remounts the TV on `CH 01`.
- `app/components/BotanicalAccents.tsx` — Five lineless, soft-gradient flowers (`CallaLily`, `Anemone`, `Wisteria`, `LilyOfTheValley`, `MagnoliaSprig`) as positionable decorative SVGs with a gentle `rotate: [-1.5, 1.5, -1.5]` breeze (`still` for pressed flowers; reduced motion holds still), plus raw `*Art` groups and `Breeze` for composing inside other SVGs. Placed at the gallery frame corners (wisteria), foothills and dedication card (lily of the valley), low in the chrysanthemum garden's foliage (anemone + lily `*Art` groups), mantel vase (calla + magnolia), and the closing card (pressed calla, anemone, lily).

## Tech Rules
- Next.js 16 App Router (`app/`), strict TypeScript, Tailwind CSS v4 (no `tailwind.config.ts`).
- Dependencies: `framer-motion`, `lucide-react`, `canvas-confetti`, `jspdf`.
- Mark interactive components using hooks/browser APIs with `"use client"`; keep static wrappers as Server Components.
- **Zero-warning Vercel builds**: `npm run build` and `npm run lint` must pass with no errors or warnings (no unused vars/imports, no `any`, valid hook deps).
- Before using unfamiliar Next.js 16 APIs, check `node_modules/next/dist/docs/` (per `AGENTS.md`).
- Responsive and accessible: mobile-first, zero horizontal overflow, alt text, and `prefers-reduced-motion` support.