import React, { useState, useEffect, useRef } from 'react';

// Lightweight perf overlay: measures its own rAF loop (fps/frame time) and
// snapshots counters that NetArtCanvas / useAudioSynth write into statsRef.
// Updates local state at 2Hz so the overlay itself never costs a re-render
// storm. Toggle with `d` or the Debug section in SETTINGS.
export default function DebugOverlay({ visible, statsRef, bgTotal, maxStamps }) {
  const [snap, setSnap] = useState(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!visible) {
      setSnap(null);
      return;
    }
    let last = performance.now();
    let frames = 0;
    let acc = 0;
    let worst = 0;
    const loop = (t) => {
      const dt = t - last;
      last = t;
      acc += dt;
      frames++;
      if (dt > worst) worst = dt;
      if (acc >= 500) {
        const s = (statsRef && statsRef.current) || {};
        const mem = (performance.memory && performance.memory.usedJSHeapSize) || null;
        let domNodes = null;
        try {
          domNodes = document.querySelectorAll('.stamp').length;
        } catch {}
        setSnap({
          fps: (frames * 1000) / acc,
          ms: acc / frames,
          worst,
          domStamps: s.domStamps ?? 0,
          domNodes,
          baked: s.bakedTotal ?? 0,
          voices: s.voices ?? 0,
          cache: s.cacheSize ?? 0,
          mem: mem != null ? mem / 1048576 : null,
        });
        acc = 0;
        frames = 0;
        worst = 0;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [visible, statsRef]);

  if (!visible || !snap) return null;

  const lowFps = snap.fps < 30;
  const row = (label, value, bad) => (
    <div className="dbg-row" key={label}>
      <span>{label}</span>
      <span className={bad ? 'dbg-bad' : ''}>{value}</span>
    </div>
  );

  return (
    <div className="debug-overlay" aria-hidden="true">
      {row('FPS', snap.fps.toFixed(0), lowFps)}
      {row('FRAME', snap.ms.toFixed(1) + 'ms', snap.ms > 33.4)}
      {row('WORST', snap.worst.toFixed(0) + 'ms', snap.worst > 50)}
      {row('STAMPS', `${snap.domStamps}/${maxStamps === 0 ? '∞' : maxStamps}`, snap.domStamps >= 400)}
      {row('DOM .stamp', snap.domNodes == null ? 'n/a' : snap.domNodes, snap.domNodes != null && snap.domNodes >= 400)}
      {row('BAKED', snap.baked, false)}
      {row('VOICES', snap.voices, snap.voices > 6)}
      {row('SMP CACHE', `${snap.cache}/25`, false)}
      {row('BG', `${Math.min(2, bgTotal)}/${bgTotal}`, false)}
      {row('HEAP', snap.mem == null ? 'n/a' : snap.mem.toFixed(0) + 'MB', snap.mem != null && snap.mem > 500)}
    </div>
  );
}
