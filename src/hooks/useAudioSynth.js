import { useRef, useCallback, useState } from 'react';

export function useAudioSynth(config = {}) {
  const {
    waveform = 'sine',
    volume = 0.08,
    duration = 0.08,
    pitchShift = 0,
  } = config;

  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioCtxRef = useRef(null);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  const playStampSound = useCallback((index = 0) => {
    if (!soundEnabled) return;
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const frequencies = [220, 277.18, 329.63, 440, 554.37, 659.25];
      const baseFreq = frequencies[index % frequencies.length] || 300;
      const freq = baseFreq * Math.pow(2, pitchShift / 12);

      osc.type = waveform;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + duration);

      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (err) {
      // Audio playback quiet fallback
    }
  }, [soundEnabled, initAudio, waveform, volume, duration, pitchShift]);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev);
  }, []);

  return { soundEnabled, toggleSound, playStampSound, initAudio };
}
