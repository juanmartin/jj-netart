import React from 'react';

export default function BackgroundLayer({ images, currentIndex, filter, kenburns, noiseOpacity = 0.035, fadeDuration = 1.2 }) {
  // Only mount current + previous (cross-fade needs 2) — mounting all
  // 47 decoded bitmaps was the main memory hog.
  const prevIndex = (currentIndex - 1 + images.length) % Math.max(1, images.length);
  const toRender = images.length <= 2
    ? images.map((src, i) => ({ src, i }))
    : [{ src: images[prevIndex], i: prevIndex }, { src: images[currentIndex], i: currentIndex }];
  return (
    <div className="background-layer">
      {toRender.map(({ src, i }) => {
        const style = {};
        if (i === currentIndex && filter && filter !== 'none') style.filter = filter;
        style.transition = `opacity ${fadeDuration}s ease`;
        return (
          <div
            key={src + i}
            className={`bg-image${i === currentIndex ? ' active' : ''}${i === currentIndex && kenburns ? ' kenburns' : ''}`}
            style={style}
          >
            <img src={src} alt="" crossOrigin="anonymous" draggable={false} loading="lazy" decoding="async" />
          </div>
        );
      })}
      <div className="bg-noise-overlay" style={{ opacity: noiseOpacity }} />
    </div>
  );
}
