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

## Controls
- **Canvas:** move cursor to stamp. Modes: `collage` / `follower` / `scatter` ; blend modes cycle in the bottom bar.
- **Bar:** `SETTINGS` (density, spacing, size, opacity, rotation, decay, presets), `SND`, `BG`, `CLEAR`, `CAPTURA` (snapshot), `ASSETS`, `HIDE`
- **Keys:** `h` hide UI, `c` clear, `s` snapshot, `space` next background, `r` randomize

## Project structure
```
src/main.jsx -> App.jsx
src/components/ { NetArtCanvas, BackgroundLayer, ControlPanel, AssetManagerModal, HeaderNav }
src/hooks/useAudioSynth.js
src/utils/assetLoader.js
src/index.css
public/assets/{foreground,background}/
```
