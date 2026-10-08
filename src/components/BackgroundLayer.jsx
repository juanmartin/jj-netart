import React, { useState, useEffect } from 'react';

export default function BackgroundLayer({ images, currentIndex, filter, kenburns, noiseOpacity = 0.035, fadeDuration = 1.2, viewportPortrait = false }) {
  const n = images.length;
  const safeCurrent = n ? currentIndex % n : 0;

  // shownIndex lags one frame behind currentIndex: the incoming image mounts
  // WITHOUT `active` (opacity 0) and only receives it on the next frame, so
  // its opacity transition actually runs 0 -> 1. Mounting it already-active
  // would pop it to opacity 1 instantly = hard cut, no crossfade.
  const [shownIndex, setShownIndex] = useState(safeCurrent);
  // fadingIndex keeps the outgoing image mounted until its fade-out
  // completes. Dropping it when shownIndex catches up (2 frames in) would
  // yank it mid-fade and drop to the black base = "black then fade in".
  const [fadingIndex, setFadingIndex] = useState(null);
  useEffect(() => {
    if (shownIndex === safeCurrent) return;
    setFadingIndex(shownIndex);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setShownIndex(safeCurrent));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [safeCurrent, shownIndex]);

  // Release the fading layer once its fade-out has had time to complete
  useEffect(() => {
    if (fadingIndex == null) return;
    const id = setTimeout(() => setFadingIndex(null), fadeDuration * 1000 + 150);
    return () => clearTimeout(id);
  }, [fadingIndex, fadeDuration]);

  // Outgoing = last fully-shown image (NOT index-1: bg order is random, so
  // index-1 would unmount the visible image instantly AND decode a random
  // unrelated one for nothing). It keeps its key so its opacity transition
  // runs 1 -> 0 beneath the incoming image.
  const items = [];
  if (fadingIndex != null && fadingIndex !== safeCurrent && fadingIndex < n) {
    items.push({ src: images[fadingIndex], i: fadingIndex, active: false });
  }
  if (n > 0) {
    items.push({ src: images[safeCurrent], i: safeCurrent, active: safeCurrent === shownIndex });
  }

  return (
    <div className={`background-layer${viewportPortrait ? ' portrait' : ''}`}>
      {items.map(({ src, i, active }) => {
        const style = {};
        // Filter/kenburns stay on the outgoing layer too so it doesn't snap mid-fade
        if (filter && filter !== 'none') style.filter = filter;
        style.transition = `opacity ${fadeDuration}s ease`;
        return (
          <div
            key={src + i}
            className={`bg-image${active ? ' active' : ''}${kenburns ? ' kenburns' : ''}`}
            style={style}
          >
            <img src={src} alt="" crossOrigin="anonymous" draggable={false} loading="lazy" decoding="async" width="1920" height="1280" />
          </div>
        );
      })}
      <div className="bg-noise-overlay" style={{ opacity: noiseOpacity }} />
    </div>
  );
}
