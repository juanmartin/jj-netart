// Auto-discover all images in the foreground and background asset folders
// using Vite's import.meta.glob. Any image file placed in these directories
// will be picked up automatically — no manual listing needed.

const fgModules = import.meta.glob(
  '/public/assets/foreground/*.{jpg,jpeg,png,gif,svg,webp}',
  { eager: true, query: '?url', import: 'default' }
);

const bgModules = import.meta.glob(
  '/public/assets/background/*.{jpg,jpeg,png,gif,svg,webp}',
  { eager: true, query: '?url', import: 'default' }
);

// Extract resolved URLs from the glob results
export const DEFAULT_FOREGROUND_ASSETS = Object.values(fgModules);
export const DEFAULT_BACKGROUND_ASSETS = Object.values(bgModules);

// If glob found nothing (e.g. empty folders), provide minimal fallbacks
if (DEFAULT_FOREGROUND_ASSETS.length === 0) {
  DEFAULT_FOREGROUND_ASSETS.push(generateProceduralAsset(1, 'FOREGROUND'));
}
if (DEFAULT_BACKGROUND_ASSETS.length === 0) {
  DEFAULT_BACKGROUND_ASSETS.push(generateProceduralAsset(1, 'BACKGROUND'));
}

/**
 * Generates an SVG Data URL procedurally as a fallback
 */
export function generateProceduralAsset(id, text = 'NET ART') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
    <rect width="400" height="400" fill="#18181b"/>
    <circle cx="200" cy="200" r="160" fill="none" stroke="#e4e4e7" stroke-width="4" stroke-dasharray="12 6"/>
    <rect x="100" y="100" width="200" height="200" fill="#27272a" opacity="0.8"/>
    <text x="200" y="205" font-family="Space Mono, monospace" font-size="14" fill="#fafafa" text-anchor="middle">${text} #${id}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Creates image object from URL
 */
export function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn(`Failed to load asset at ${url}, using procedural fallback.`);
      const fallback = new Image();
      fallback.onload = () => resolve(fallback);
      fallback.src = generateProceduralAsset(Math.floor(Math.random() * 99), 'FALLBACK');
    };
    img.src = url;
  });
}
