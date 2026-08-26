import React from 'react';

export default function BackgroundLayer({ images, currentIndex, filter, kenburns, noiseOpacity = 0.035 }) {
  return (
    <div className="background-layer">
      {images.map((src, i) => (
        <div
          key={src + i}
          className={`bg-image${i === currentIndex ? ' active' : ''}${i === currentIndex && kenburns ? ' kenburns' : ''}`}
          style={i === currentIndex && filter && filter !== 'none' ? { filter } : undefined}
        >
          <img src={src} alt="" crossOrigin="anonymous" draggable={false} />
        </div>
      ))}
      <div className="bg-noise-overlay" style={{ opacity: noiseOpacity }} />
    </div>
  );
}
