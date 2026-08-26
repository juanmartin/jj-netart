import React, { useState, useRef, useCallback, useEffect } from 'react';

const MAX_STAMPS = 500;

export default function NetArtCanvas({
  images,
  mode = 'collage',
  stampSize = 120,
  spacing = 40,
  rotationJitter = 15,
  scaleJitter = 0.3,
  blendMode = 'normal',
  opacity = 0.9,
  decay = 0,
  stampsPerMove = 1,
  onStamp
}) {
  const [stamps, setStamps] = useState([]);
  const lastPosRef = useRef({ x: -999, y: -999 });
  const imgIndexRef = useRef(0);
  const stampIdRef = useRef(0);
  const followerRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(null);
  const containerRef = useRef(null);

  // Decay: schedule removal
  useEffect(() => {
    if (decay <= 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setStamps(prev => prev.filter(s => now - s.createdAt < decay));
    }, Math.max(decay / 4, 100));
    return () => clearInterval(interval);
  }, [decay]);

  // Follower mode: lerp animation
  useEffect(() => {
    if (mode !== 'follower') {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const animate = () => {
      followerRef.current.x += (targetRef.current.x - followerRef.current.x) * 0.12;
      followerRef.current.y += (targetRef.current.y - followerRef.current.y) * 0.12;

      if (images.length > 0) {
        const imgUrl = images[0];
        setStamps([{
          id: 'follower',
          x: followerRef.current.x,
          y: followerRef.current.y,
          imageUrl: imgUrl,
          rotation: 0,
          scale: 1,
          opacity: opacity,
          createdAt: Date.now()
        }]);
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mode, images, opacity]);

  const createStamp = useCallback((x, y) => {
    if (!images || images.length === 0) return;

    const imgUrl = images[imgIndexRef.current % images.length];
    imgIndexRef.current++;

    const rotation = (Math.random() * 2 - 1) * rotationJitter;
    const scale = 1 + (Math.random() * 2 - 1) * scaleJitter;
    const id = stampIdRef.current++;

    const newStamp = {
      id,
      x,
      y,
      imageUrl: imgUrl,
      rotation,
      scale,
      opacity,
      createdAt: Date.now()
    };

    setStamps(prev => {
      const next = [...prev, newStamp];
      if (next.length > MAX_STAMPS) {
        return next.slice(next.length - MAX_STAMPS);
      }
      return next;
    });

    if (onStamp) onStamp(id);
  }, [images, rotationJitter, scaleJitter, opacity, onStamp]);

  const handleMove = useCallback((clientX, clientY) => {
    if (mode === 'follower') {
      targetRef.current = { x: clientX, y: clientY };
      return;
    }

    const dx = clientX - lastPosRef.current.x;
    const dy = clientY - lastPosRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= spacing) {
      lastPosRef.current = { x: clientX, y: clientY };

      if (mode === 'scatter') {
        const count = Math.max(1, stampsPerMove);
        for (let i = 0; i < count; i++) {
          const offsetX = clientX + (Math.random() * 2 - 1) * spacing * 1.5;
          const offsetY = clientY + (Math.random() * 2 - 1) * spacing * 1.5;
          createStamp(offsetX, offsetY);
        }
        // scatter historically had 2-4 stamps; ensure at least that feel when density=1
        if (stampsPerMove === 1) {
          // add one extra to keep scatter distinct from collage
          const offsetX = clientX + (Math.random() * 2 - 1) * spacing * 1.5;
          const offsetY = clientY + (Math.random() * 2 - 1) * spacing * 1.5;
          createStamp(offsetX, offsetY);
        }
      } else {
        // collage
        if (stampsPerMove <= 1) {
          createStamp(clientX, clientY);
        } else {
          for (let i = 0; i < stampsPerMove; i++) {
            const jitter = spacing * 0.4;
            const offsetX = clientX + (Math.random() * 2 - 1) * jitter;
            const offsetY = clientY + (Math.random() * 2 - 1) * jitter;
            createStamp(offsetX, offsetY);
          }
        }
      }
    }
  }, [mode, spacing, stampsPerMove, createStamp]);

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
              mixBlendMode: blendMode,
              opacity: stamp.opacity,
              animationDelay: '0s',
              ...(decay > 0 ? {
                animation: `fadeInStamp 0.15s ease-out, stampDecay ${decay}ms ease-in forwards`,
                animationDelay: `0s, 0s`
              } : {})
            }}
          >
            <img
              src={stamp.imageUrl}
              alt=""
              style={{ width: stampSize, height: stampSize }}
              draggable={false}
            />
          </div>
        );
      })}
    </div>
  );
}
