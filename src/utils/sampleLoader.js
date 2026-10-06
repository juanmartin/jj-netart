// Auto-discover vocal-chop sample packs.
// Each folder directly under public/assets/samples/ is one pack —
// the folder name is the language label (e.g. CHINO, ESPANOL...).
// Adding a new folder of .wav/.mp3/.ogg files is enough, no manual listing.
// Files are imported with `?url` so Vite hashes them into dist/assets
// (build.copyPublicDir is false, so plain public/ files would NOT ship).

const sampleModules = import.meta.glob(
  '/public/assets/samples/*/*.{wav,mp3,ogg,aif,aiff}',
  { eager: true, query: '?url', import: 'default' }
);

// Group resolved URLs by pack (folder) name, sorted for stable sequence order.
export const SAMPLE_PACKS = {};
Object.entries(sampleModules).forEach(([path, url]) => {
  const parts = path.split('/');
  const idx = parts.lastIndexOf('samples');
  const pack = idx >= 0 && parts[idx + 1] ? parts[idx + 1] : 'DEFAULT';
  if (!SAMPLE_PACKS[pack]) SAMPLE_PACKS[pack] = [];
  SAMPLE_PACKS[pack].push(url);
});
Object.keys(SAMPLE_PACKS).forEach((pack) => {
  SAMPLE_PACKS[pack].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );
});

export const SAMPLE_PACK_NAMES = Object.keys(SAMPLE_PACKS).sort((a, b) =>
  a.localeCompare(b, undefined, { sensitivity: 'base' })
);
