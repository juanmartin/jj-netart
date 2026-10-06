# jj-netart

Interactive net-art canvas — move your cursor to paint with image trails over dynamic atmospheric backdrops.

## Stack
- Vite 5 + React 18
- `html2canvas` for snapshots

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # -> dist/
npm run preview
```

## Assets
- Drop images into `public/assets/foreground/` or `public/assets/background/` — auto-discovered via `import.meta.glob` (no imports to update).
- Or drag & drop at runtime (global drop → foreground; Asset Manager modal → choose pool).
- Web-ready format: `.webp`, sRGB, stripped metadata — foreground max 800px q82, background max 1920px q80. No spaces or parens in filenames. HEIC/PDF won't load in browsers — convert first.

## Controls
- **Canvas:** move cursor to stamp (collage). One stamp per trigger, gated by spacing. Blend modes cycle in the bottom bar.
- **Bar:** `SETTINGS` (spacing, size, opacity, rotation, decay, cap, presets), `SND`, `BG`, `CLEAR`, `CAPTURA` (snapshot), `ASSETS`, `HIDE`
- **Keys:** `h` hide UI (+ hides cursor), `c` clear, `s` snapshot, `space` next background, `r` randomize blend, `o` capture button, `?` help
- UI starts hidden; the circle capture button (bottom-center) starts visible and snapshots even with the UI hidden.

## Presets
- Tweak `SETTINGS` → enter a name → `SAVE`. `APPLY` / `EXPORT` (downloads `name.json`) / `SET DEFAULT` / `DELETE` per preset; `IMPORT` loads a JSON file. `Auto Preset` (minutes, 0 = off) cycles all presets automatically.
- `src/presets/*.json` are shared repo presets (file name = preset name); `default.json` auto-applies on load unless a localStorage default is set. Personal presets live in the browser (`localStorage`) — `EXPORT` one and commit it under `src/presets/` to share it.
- Safe ranges (hang prevention): `maxStamps ≤ 250`, `decay ≤ 2500ms`, `stampSize ≤ 600px`. `Cap 0` + `decay 0` = unlimited pure-canvas mode.

## Sound
- Pad synth follows the mouse: X = pitch, Y = brightness. Optional delay effect (toggle, wet, time, feedback) plus `Rnd on BG` which randomizes sound params on every background change.

## Project structure
```
src/main.jsx -> App.jsx
src/components/ { NetArtCanvas, BackgroundLayer, ControlPanel, AssetManagerModal, HeaderNav, ShortcutsPanel }
src/hooks/useAudioSynth.js
src/utils/ { assetLoader, presetStorage }.js
src/presets/*.json (default, preset, dragon, otro, tercero)
src/index.css
public/assets/{foreground,background}/
```
