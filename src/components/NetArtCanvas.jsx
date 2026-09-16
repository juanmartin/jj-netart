import React, { useState, useRef, useCallback, useEffect } from 'react';

// Hard ceiling for DOM stamps regardless of the Cap setting —
// anything above is baked to canvas (or dropped when fading).
const HARD_CAP = 400;

export default function NetArtCanvas({
  images,
  stampSize = 120,
  spacing = 40,
  rotation = 15,
  scaleJitter = 0.3,
  blendMode = 'normal',
  opacity = 0.9,
  decay = 0,
  maxStamps = 180,
  onStamp,
  onPadMove
}) {
  const [stamps, setStamps] = useState([]);
  const lastPosRef = useRef({ x: -999, y: -999 });
  const imgIndexRef = useRef(0);
  const stampIdRef = useRef(0);
  const containerRef = useRef(null);
  const cumulativeRotationRef = useRef(0);
  const bakeCanvasRef = useRef(null);
  const bakeCtxRef = useRef(null);
  const imageCacheRef = useRef(new Map());

  // Setup bake canvas (persistent low-weight layer for unlimited draw)
  useEffect(() => {
    const canvas = bakeCanvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    // Use viewport size if container not yet measured
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bakeCtxRef.current = ctx;

    const handleResize = () => {
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      const ndpr = window.devicePixelRatio || 1;
      // Preserve existing bitmap by copying to temp
      const temp = document.createElement('canvas');
      temp.width = canvas.width;
      temp.height = canvas.height;
      const tCtx = temp.getContext('2d');
      tCtx.drawImage(canvas, 0, 0);
      canvas.width = nw * ndpr;
      canvas.height = nh * ndpr;
      canvas.style.width = nw + 'px';
      canvas.style.height = nh + 'px';
      ctx.setTransform(ndpr, 0, 0, ndpr, 0, 0);
      // Redraw old content scaled (best effort)
      ctx.drawImage(temp, 0, 0, temp.width / (window.devicePixelRatio || 1), temp.height / (window.devicePixelRatio || 1));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getCachedImage = useCallback((url) => {
    const cache = imageCacheRef.current;
    if (cache.has(url)) return cache.get(url);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    cache.set(url, img);
    return img;
  }, []);

  const bakeStamps = useCallback((stampsToBake) => {
    const ctx = bakeCtxRef.current;
    const canvas = bakeCanvasRef.current;
    if (!ctx || !canvas || stampsToBake.length === 0) return;
    stampsToBake.forEach((stamp) => {
      const img = getCachedImage(stamp.imageUrl);
      const draw = () => {
        if (!img.naturalWidth) return;
        ctx.save();
        ctx.globalAlpha = stamp.opacity;
        // Map blendMode to canvas composite
        const compositeMap = {
          normal: 'source-over',
          multiply: 'multiply',
          screen: 'screen',
          overlay: 'overlay',
          difference: 'difference',
          exclusion: 'exclusion',
          luminosity: 'luminosity',
          'color-dodge': 'color-dodge',
        };
        ctx.globalCompositeOperation = compositeMap[stamp.blendMode] || 'source-over';
        ctx.translate(stamp.x, stamp.y);
        ctx.rotate((stamp.rotation * Math.PI) / 180);
        ctx.scale(stamp.scale, stamp.scale);
        const size = stamp.size ?? stampSize;
        // Draw centered
        const drawW = size;
        const drawH = size;
        // Keep aspect ratio: draw with contain logic - use image natural ratio
        // We draw as square contain (object-fit: contain) so compute scaled size
        const iw = img.naturalWidth || drawW;
        const ih = img.naturalHeight || drawH;
        const scale = Math.min(drawW / iw, drawH / ih);
        const w = iw * scale;
        const h = ih * scale;
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
      };
      if (img.complete && img.naturalWidth) {
        draw();
      } else {
        img.onload = draw;
        img.onerror = () => {};
      }
    });
  }, [stampSize, getCachedImage]);

  // Decay: schedule removal (does not bake, just removes)
  useEffect(() => {
    if (decay <= 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setStamps(prev => prev.filter(s => now - s.createdAt < decay));
    }, Math.max(decay / 4, 100));
    return () => clearInterval(interval);
  }, [decay]);

  // Collage only — no follower/scatter modes.

  const createStamp = useCallback((x, y) => {
    if (!images || images.length === 0) return;

    let idx;
    if (images.length === 1) idx = 0;
    else {
      do {
        idx = Math.floor(Math.random() * images.length);
      } while (idx === imgIndexRef.current && images.length > 1);
      imgIndexRef.current = idx;
    }
    const imgUrl = images[idx];

    const step = rotation * 0.08;
    cumulativeRotationRef.current = (cumulativeRotationRef.current + step) % 360;
    const stampRotation = cumulativeRotationRef.current;
    const scale = scaleJitter === 0 ? 1 : 1 + (Math.random() * 2 - 1) * scaleJitter;
    const id = stampIdRef.current++;

    const newStamp = {
      id,
      x,
      y,
      imageUrl: imgUrl,
      rotation: stampRotation,
      scale,
      opacity,
      blendMode,
      size: stampSize,
      createdAt: Date.now()
    };

    // Cap 0 = unlimited: pure canvas (no DOM) when decay is off for glitch-free dense trails
    if (maxStamps === 0 && decay <= 0) {
      bakeStamps([newStamp]);
      if (onStamp) onStamp(id);
      return;
    }

    setStamps(prev => {
      const next = [...prev, newStamp];
      const cap = maxStamps > 0 ? Math.min(maxStamps, HARD_CAP) : HARD_CAP;
      if (next.length > cap) {
        const excess = next.length - cap;
        const toBake = next.slice(0, excess);
        if (decay <= 0) {
          bakeStamps(toBake);
        }
        return next.slice(excess);
      }
      return next;
    });

    if (onStamp) onStamp(id);
  }, [images, rotation, scaleJitter, opacity, blendMode, stampSize, onStamp, decay, maxStamps, bakeStamps]);

  const handleMove = useCallback((clientX, clientY) => {
    if (onPadMove) onPadMove(clientX, clientY);

    const dx = clientX - lastPosRef.current.x;
    const dy = clientY - lastPosRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= spacing) {
      lastPosRef.current = { x: clientX, y: clientY };
      createStamp(clientX, clientY);
    }
  }, [spacing, createStamp, onPadMove]);

  const onMouseMove = useCallback((e) => {
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const onTouchMove = useCallback((e) => {
    if (e.touches.length > 0) {
      e.preventDefault();
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [handleMove]);

  return (
    <div
      ref={containerRef}
      className="canvas-layer"
      onMouseMove={onMouseMove}
      onTouchMove={onTouchMove}
    >
      <canvas
        ref={bakeCanvasRef}
        className="bake-canvas"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
      {stamps.map((stamp) => {
        const transformValue = `translate(-50%, -50%) rotate(${stamp.rotation}deg) scale(${stamp.scale})`;
        return (
          <div
            key={stamp.id}
            className="stamp"
            style={{
              left: stamp.x,
              top: stamp.y,
              '--stamp-transform': `translate(-50%, -50%) rotate(${stamp.rotation}deg)`,
              '--stamp-opacity': stamp.opacity,
              transform: transformValue,
              mixBlendMode: stamp.blendMode || blendMode,
              opacity: stamp.opacity,
              animationDelay: '0s',
              ...(decay > 0 ? {
                animation: `stampDecay ${decay}ms ease-in forwards`,
                animationDelay: `0s`
              } : {})
            }}
          >
            <img
              src={stamp.imageUrl}
              alt=""
              style={{ width: stamp.size ?? stampSize, height: stamp.size ?? stampSize }}
              draggable={false}
            />
          </div>
        );
      })}
    </div>
  );
}
