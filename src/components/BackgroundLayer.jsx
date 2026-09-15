import React from 'react';

export default function BackgroundLayer({ images, currentIndex, filter, kenburns, noiseOpacity = 0.035, fadeDuration = 1.2 }) {
  return (
    <div className="background-layer">
      {images.map((src, i) => {
        const style = {};
        if (i === currentIndex && filter && filter !== 'none') style.filter = filter;
        style.transition = `opacity ${fadeDuration}s ease`;
        return (
          <div
            key={src + i}
            className={`bg-image${i === currentIndex ? ' active' : ''}${i === currentIndex && kenburns ? ' kenburns' : ''}`}
            style={style}
          >
            <img src={src} alt="" crossOrigin="anonymous" draggable={false} />
          </div>
        );
      })}
      <div className="bg-noise-overlay" style={{ opacity: noiseOpacity }} />
    </div>
  );
}
