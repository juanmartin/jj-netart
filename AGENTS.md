# AGENTS.md — jj-netart

## Stack & Entrypoints
- Vite 5 + React 18 (JSX, `type: module`). No TypeScript build, no tests, no lint/format, no CI.
- Entrypoint: `src/main.jsx` -> `src/App.jsx`. Single global stylesheet `src/index.css` (design tokens in `:root`).
- Components: `src/components/{NetArtCanvas,BackgroundLayer,ControlPanel,AssetManagerModal,HeaderNav}.jsx`
- Hooks: `src/hooks/useAudioSynth.js` (Web Audio API, sine osc). Utils: `src/utils/assetLoader.js`.

## Commands
- `npm run dev` — Vite dev server on `http://localhost:3000` (`host: true`, `allowedHosts: ['jm2.tail59251.ts.net']` — Tailscale). Always use this port/host.
- `npm run build` -> `dist/` | `npm run preview` — no test/lint/typecheck scripts exist.
- No `npm test` — verify changes with `npm run build` and manual browser check.

## Asset System (non-obvious)
- Foreground/background images auto-discovered via `import.meta.glob` in `src/utils/assetLoader.js:5-13`:
  - `public/assets/foreground/*.{jpg,jpeg,png,gif,svg,webp}`
  - `public/assets/background/*.{jpg,jpeg,png,gif,svg,webp}`
- Adding a file to those dirs is enough — no manual import. Empty dirs fall back to `generateProceduralAsset()`.
- Runtime additions via drag-and-drop: global `window` drop in `src/App.jsx:117-144` adds to foreground; modal drop respects `targetPool` toggle.

## State & Wiring Gotchas
- All app state lives in `src/App.jsx` (foreground/background arrays, `bgIndex`, `mode`/`blendMode`, `clearKey`). `NetArtCanvas` is keyed by `clearKey` for reset.
- `ControlPanel.jsx` defines tuneable props (`spacing`, `stampSize`, `scaleJitter`, `decay`, etc.) and `PRESETS` but `App.jsx` does not yet wire them — passing them through is required to enable the Settings drawer sliders.
- `NetArtCanvas.jsx:3` caps at `MAX_STAMPS = 500`; follower mode uses single stamped element + `requestAnimationFrame` lerp.

## Key Behaviors to Preserve
- Keyboard shortcuts in `src/App.jsx:78-114`: `h` toggle UI, `c` clear, `s` snapshot, `space` next background, `r` randomize mode/blend.
- Snapshot: `html2canvas` at `scale: 2`, `backgroundColor: '#09090b'`, `useCORS: true` — see `src/App.jsx:44-60`.
- Audio: `useAudioSynth` requires user gesture (`initAudio` on first click in `App.jsx:30-34`); `playStampSound` is no-op when `soundEnabled` is false.

## Repo Layout Quirk
- Git root is `REPROPIOS/` (parent), not this folder. `netart-test-1/.gitignore` does not exist — `dist/` and `node_modules/` are untracked but present. Do not commit them.
