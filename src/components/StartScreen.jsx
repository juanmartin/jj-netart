import React, { useEffect, useRef } from 'react';

// Startup gate: any click (or Enter/Space on the focused overlay) is a real
// trusted gesture — it unlocks Web Audio (autoplay policy rejects simulated
// clicks) and preloads the sampler pack, then unmounts and lets the intro
// demo run. No text, just a pulsing mark inviting the click. Overrides the
// hidden cursor so visitors can find their pointer.
export default function StartScreen({ onStart }) {
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onStart();
    }
  };

  return (
    <div
      ref={ref}
      className="start-screen"
      onClick={onStart}
      onKeyDown={onKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Begin"
    >
      <span className="start-rings" aria-hidden="true" />
      <svg className="start-icon" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M27 22 L43 32 L27 42 Z" fill="currentColor" />
      </svg>
    </div>
  );
}
