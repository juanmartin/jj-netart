# AGENTS.md — jj-netart

## Stack & Entrypoints
- Vite 5 + React 18 (JSX, `type: module`). No TypeScript build, no tests, no lint/format, no CI.
- Entrypoint: `src/main.jsx` -> `src/App.jsx`. Single global stylesheet `src/index.css` (design tokens in `:root`).
- Components: `src/components/{NetArtCanvas,BackgroundLayer,ControlPanel,AssetManagerModal,HeaderNav,ShortcutsPanel}.jsx`
- Hooks: `src/hooks/useAudioSynth.js` (pad synth + vocal-chop sampler in parallel, one shared delay graph; `playStampSound` previews enabled voices).
- Utils: `src/utils/{assetLoader.js,sampleLoader.js,presetStorage.js}` (localStorage presets + JSON download). Repo presets: `src/presets/*.json` (bundled via `import.meta.glob`, file name = preset name; `default.json` auto-applies on load).

## Commands
- `npm run dev` — Vite dev server on `http://localhost:3000` (`host: true`, `allowedHosts: ['jm2.tail59251.ts.net']` — Tailscale). Always use this port/host.
- `npm run build` -> `dist/` | `npm run preview` — no test/lint/typecheck scripts exist.
- No `npm test` — verify changes with `npm run build` and manual browser check.

## Build Config (non-obvious)
- `vite.config.js` sets `build.copyPublicDir: false`. Assets under `public/assets/` are ALSO imported via `import.meta.glob` (hashed into `dist/assets/`), so copying `public/` would duplicate every image (~2x dist). Do not re-enable without moving assets out of the glob.

## Asset System (non-obvious)
- Foreground/background images auto-discovered via `import.meta.glob` in `src/utils/assetLoader.js`:
  - `public/assets/foreground/*.{jpg,jpeg,png,gif,svg,webp}`
  - `public/assets/background/*.{jpg,jpeg,png,gif,svg,webp}`
- Adding a file to those dirs is enough — no manual import. Empty dirs fall back to `generateProceduralAsset()`.
- Vocal-chop sample packs auto-discovered via `import.meta.glob` in `src/utils/sampleLoader.js`: each folder directly under `public/assets/samples/` is one pack (folder name = language label, e.g. `CHINO`, `SPANISH`), `*.{wav,mp3,ogg,aif,aiff}` inside. Same `?url` hashing into `dist/assets/` applies (this is why `copyPublicDir: false` is safe for samples too). Known exception to the no-spaces rule: the ttsmaker wavs keep upstream names with spaces and bundle fine — rename to dash-names only if a static host ever chokes on the hashed URLs.
- Web-ready convention (see optimization history): all `.webp` — foreground max 800px q82, background max 1920px q80, sRGB, stripped metadata (`magick SRC -auto-orient -colorspace sRGB -strip -resize "800x800>" -quality 82 ...`). HEIC/PDF are NOT web-readable — convert before adding.
- Filenames: no spaces or parens (breaks Vite hashed URLs on static hosts) — e.g. `IMG_8788 2.HEIC` -> `IMG_8788-2.webp`.
- Runtime additions via drag-and-drop: global `window` drop in `src/App.jsx` adds to foreground; modal drop respects `targetPool` toggle.

## State & Wiring
- All app state lives in `src/App.jsx`, grouped:
  - Canvas: `foregroundImages`, `fgIndex` (+`fgChangeOnClick`), `bgIndex`, `backgroundImages`, `blendMode`, `clearKey` (`NetArtCanvas` is keyed by `clearKey` for reset).
  - Stamps: `spacing`, `stampSize`, `rotation` (cumulative, bipolar -180..180), `scaleJitter`, `opacity`, `decay`, `maxStamps`.
  - Background: `bgFilter`, `bgKenburns` (disabled when `bgFixed`), `bgAutoInterval` (s, 0=off), `bgFixed`, `bgFadeDuration` (s), `noiseOpacity`.
  - Sound: `soundEnabled` (master, owned by App, passed into hook) + parallel voice toggles `synthEnabled`/`samplerEnabled`; synth `soundWaveform/Volume/Duration/PitchShift`, sampler `samplerPack/Volume/Tune/PitchXLo/PitchXHi/Cutoff/Resonance/Attack/Release/Cooldown/Voices/PlayMode`; shared `delayEnabled/Time/Feedback/Wet`, `randomizeOnBgChange` (synth params only).
  - Presets: `customPresets` (localStorage), `defaultPresetName`, `presetAutoInterval` (minutes, global — NOT part of preset data, default 1). Each auto-switch also advances `bgIndex` to a random image unless the incoming preset has `bgFixed` (decision reads `next.bgFixed`, never the stale state guard). Bg switches consume a pre-rolled warmed index (`upcomingBgRef` + `advanceBgIndex`): the next image is always decode-warmed via `new Image()` before mount, capped at 12 warmed URLs.
  - UI: `uiVisible` (default false), `assetsOpen`, `helpOpen`, `captureButtonVisible` (default true).
- Settings drawer (`ControlPanel.jsx`) is fully wired — sliders/toggles flow through setters + `handleApplyPreset` in `App.jsx`.
- Collage only (follower/scatter/mode removed — see history); one stamp per trigger gated by `spacing`. Legacy preset keys (`mode`, `stampsPerMove`, `rotationJitter`, `soundEngine`, `samplerPitchFromX`) are accepted on load and ignored/migrated, never saved.
- `fgChangeOnClick` shows a single fixed image (`foregroundImages[fgIndex]`) that advances to a RANDOM different image per canvas click (UI clicks excluded).

## Preset System
- JSON shape: 25 fields — `spacing, stampSize, rotation, scaleJitter, opacity, decay, maxStamps, bgFilter, bgKenburns, bgAutoInterval, bgFixed, fgChangeOnClick, bgFadeDuration, noiseOpacity, soundEnabled, soundWaveform, soundVolume, soundDuration, soundPitchShift, delayEnabled, delayTime, delayFeedback, delayWet, randomizeOnBgChange, blendMode` plus 14 sampler fields — `synthEnabled, samplerEnabled, samplerPack, samplerVolume, samplerTune, samplerPitchXLo, samplerPitchXHi, samplerCutoff, samplerResonance, samplerAttack, samplerRelease, samplerCooldown, samplerVoices, samplerPlayMode` (39 total). Built via `getCurrentPresetData()` — add new settings there AND in `handleApplyPreset` AND in `src/presets/default.json` or they won't persist.
- Repo presets (`src/presets/*.json`, committed): `default.json` auto-applies when no localStorage default is set; all files appear as buttons via glob. Personal/quick presets live in localStorage (`SAVE` + `SET DEFAULT`); `EXPORT` downloads `name.json` — commit it under `src/presets/` to share.
- Safe rails (hang prevention): `maxStamps <= 250`, `decay <= 2500`, `stampSize <= 600`. Enforced in repo presets AND by the load-time migration in `App.jsx`, which clamps localStorage customs (`maxStamps 0` with `decay>0` -> 250; pure-canvas `0` only stays when `decay==0`). Keep these rails when adding presets.
- Engine rule: never `synthEnabled` + `samplerEnabled` both true — one or the other (delay pairs with either). Repo presets carry an explicit per-preset choice; the load-time migration uses delay only as tiebreak for ambiguous customs, and pins `delayWet 0.2` / `delayFeedback 0.15` on all customs.

## Rendering & Perf Guardrails (do not regress)
- `BackgroundLayer.jsx` mounts only current + previous image (cross-fade needs 2) — never all 47 decoded bitmaps (~400MB+). Keep it that way. All bg sources are landscape; in portrait viewports the frame becomes a rotated landscape box (`.background-layer.portrait .bg-image`) so `cover` barely crops — tracked via `isPortraitView` + resize listener in `App.jsx`.
- DOM stamps hard-capped at 400 (`HARD_CAP` in `NetArtCanvas.jsx`); `Cap` slider is `0-500`. `Cap 0` + `decay 0` = pure canvas (zero DOM, unlimited); overflow with `decay 0` bakes to canvas via cached `Image` objects (`imageCacheRef`); overflow while fading is dropped.
- No `will-change` on stamps, no `fadeInStamp` grow animation (removed intentionally — stamps appear instantly at full size; `decay>0` uses `stampDecay` opacity fade only).
- `rotation` is cumulative per stamp (`rotation * 0.08` added to a ref, `% 360`): positive = clockwise trail, negative = anticlockwise, 0 = straight. `scale` is exactly 1 when `scaleJitter` is 0.

## Audio (`useAudioSynth.js`)
- `soundEnabled` is controlled by App state (hook holds no toggle state; it takes it as config).
- Pad synth drives sound from mouse position, not per stamp: `updatePad(x, y)` (throttled via rAF) maps X -> frequency (110-610Hz + pitchShift), Y -> lowpass cutoff; 0.35s idle -> 0.6s release. `onStamp` in App is a no-op; `playStampSound` is only for the preview button.
- Sampler runs in PARALLEL with the synth (independent `synthEnabled`/`samplerEnabled` toggles): mousemove fires vocal chops throttled by `samplerCooldown` (default 450ms), X -> pitch (`tune + lo..hi` range) + pan, Y -> lowpass brightness (500Hz..`cutoff`); attack/release envelope per chop, `samplerVoices` polyphony with oldest-voice choke, `random`/`sequence` play order; packs from `sampleLoader.js`, lazy-decoded + cached, background-preloaded once audio unlocks. Disabling a voice stops it (`stopPad` / choke-all); they share the ONE delay graph below.
- Delay uses ONE persistent graph (`DelayNode` + feedback/wet/dry, created once) — never per-stamp nodes. Feedback clamped to 0.99; `delayTime` max 1.8s needs `createDelay(2.0)`.
- Sampler cache is LRU-capped at 25 buffers with in-flight dedup (concurrent decodes of the same URL share one promise). Pack preload covers the head 10 only — never the whole pack per chop. Pad release/stop inner timers are tracked in refs and cleared on stop/unmount.
- Requires user gesture: `initAudio` on first window click in `App.jsx`; nodes disconnect on `osc.onended`.

## Key Behaviors to Preserve
- Keyboard shortcuts: `h` toggle UI (also hides cursor via `.hide-cursor`), `c` clear, `s` snapshot, `space` next background, `r` randomize blend, `o` capture FAB, `?` toggle help, `Esc` close modals. Help panel is `ShortcutsPanel.jsx`.
- Capture FAB (`.capture-fab` in `index.css`, 64px circle bottom-center): mirrors `CAPTURA`, stays visible when UI is hidden. If it "disappears", check the CSS block survived — it once landed in the same commit as a rollback.
- Snapshot: `html2canvas` at `scale: 1`, `backgroundColor: '#09090b'`, `useCORS: true` — see `handleSnapshot` in `src/App.jsx`.
- `bgFixed` ON stops everything background: auto-rotate, manual BG/space, AND Ken Burns (`kenburns && !bgFixed`). `randomizeOnBgChange` only randomizes sound params when `bgIndex` changes (skips initial mount).
## Pitfalls (learned the hard way)
- Never `Math.random`-name a local the same as a prop in one scope — a `const rotation` inside `createStamp` shadowed the prop and threw TDZ `ReferenceError` on every stamp (build still passed; only sound worked because `onPadMove` runs first).
- Never render all background `<img>`s or uncap DOM stamps — the app hangs after minutes, not seconds. Keep the 2-image bg render and `HARD_CAP`.
- `rotationJitter` is dead — the param is `rotation`. Old JSON/localStorage keys are migrated, not reintroduced.
- No spaces/parens in asset filenames; keep `.webp` + the size/quality recipe above.

## Repo Layout Quirk
- `jj-netart/` is a standalone git repo at `REPROPIOS/jj-netart/.git` nested inside the `REPROPIOS` parent repo (which still lists it as untracked `jj-netart/`). Always run `git` / `gh` with `workdir` = `REPROPIOS/jj-netart`. `dist/` and `node_modules/` are gitignored; do not commit them.

## Workflow Preferences
- Do not commit or push after changes — leave for user review. Only commit/push when explicitly requested.
