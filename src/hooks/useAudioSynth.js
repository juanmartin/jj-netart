import { useRef, useCallback, useEffect } from 'react';

export function useAudioSynth(config = {}) {
  const {
    waveform = 'sine',
    volume = 0.08,
    duration = 0.08,
    pitchShift = 0,
    delayEnabled = false,
    delayTime = 0.3,
    delayFeedback = 0.35,
    delayWet = 0.4,
    soundEnabled = true,
  } = config;

  const audioCtxRef = useRef(null);
  const delayNodeRef = useRef(null);
  const feedbackGainRef = useRef(null);
  const wetGainRef = useRef(null);
  const dryGainRef = useRef(null);
  const inputGainRef = useRef(null);

  // Pad refs
  const padOscRef = useRef(null);
  const padGainRef = useRef(null);
  const padFilterRef = useRef(null);
  const padTimeoutRef = useRef(null);
  const padActiveRef = useRef(false);

  const ensureDelayGraph = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (delayNodeRef.current) return;
    const delay = ctx.createDelay(2.0);
    const feedback = ctx.createGain();
    const wetGain = ctx.createGain();
    const dryGain = ctx.createGain();
    const inputGain = ctx.createGain();

    delay.delayTime.value = delayTime;
    feedback.gain.value = delayEnabled ? Math.min(delayFeedback, 0.99) : 0;
    wetGain.gain.value = delayEnabled ? delayWet : 0;
    dryGain.gain.value = delayEnabled ? 1 - delayWet : 1;

    // feedback loop
    delay.connect(feedback);
    feedback.connect(delay);
    // wet/dry to destination
    wetGain.connect(ctx.destination);
    dryGain.connect(ctx.destination);
    // input splits to dry and delay
    inputGain.connect(dryGain);
    inputGain.connect(delay);
    delay.connect(wetGain);

    delayNodeRef.current = delay;
    feedbackGainRef.current = feedback;
    wetGainRef.current = wetGain;
    dryGainRef.current = dryGain;
    inputGainRef.current = inputGain;
  }, [delayTime, delayFeedback, delayWet, delayEnabled]);

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
    ensureDelayGraph();
  }, [ensureDelayGraph]);

  // Keep persistent delay graph in sync when params change
  useEffect(() => {
    const ctx = audioCtxRef.current;
    if (!ctx || !delayNodeRef.current) return;
    const t = ctx.currentTime;
    delayNodeRef.current.delayTime.setValueAtTime(delayTime, t);
    feedbackGainRef.current.gain.setValueAtTime(delayEnabled ? Math.min(delayFeedback, 0.99) : 0, t);
    wetGainRef.current.gain.setValueAtTime(delayEnabled ? delayWet : 0, t);
    dryGainRef.current.gain.setValueAtTime(delayEnabled ? 1 - delayWet : 1, t);
  }, [delayTime, delayFeedback, delayWet, delayEnabled]);

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

      ensureDelayGraph();
      if (inputGainRef.current) {
        gain.connect(inputGainRef.current);
      } else {
        gain.connect(ctx.destination);
      }

      osc.onended = () => {
        try { osc.disconnect(); } catch {}
        try { gain.disconnect(); } catch {}
      };
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (err) {
      // Audio playback quiet fallback
    }
  }, [soundEnabled, initAudio, ensureDelayGraph, waveform, volume, duration, pitchShift]);

  const ensurePad = useCallback(() => {
    if (!soundEnabled) return null;
    const ctx = audioCtxRef.current;
    if (!ctx) return null;
    if (padOscRef.current && padActiveRef.current) return { osc: padOscRef.current, gain: padGainRef.current, filter: padFilterRef.current };
    // create pad chain: osc -> filter -> gain -> inputGain/destination
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;
    filter.Q.value = 1;
    osc.type = waveform;
    // start with low gain for attack
    gain.gain.value = 0;
    osc.connect(filter);
    filter.connect(gain);
    ensureDelayGraph();
    if (inputGainRef.current) {
      gain.connect(inputGainRef.current);
    } else {
      gain.connect(ctx.destination);
    }
    osc.start();
    padOscRef.current = osc;
    padGainRef.current = gain;
    padFilterRef.current = filter;
    padActiveRef.current = true;
    // attack
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(Math.min(volume * 1.2, 0.3), ctx.currentTime + 0.15);
    return { osc, gain, filter };
  }, [soundEnabled, waveform, volume, ensureDelayGraph]);

  const pendingPadRef = useRef(null);
  const padRafRef = useRef(null);

  const doPadUpdate = useCallback((x, y) => {
    const ctx = audioCtxRef.current;
    const pad = ensurePad();
    if (!ctx || !pad) return;
    const { osc, gain, filter } = pad;
    const t = ctx.currentTime;
    const w = window.innerWidth || 1200;
    const h = window.innerHeight || 800;
    const normX = Math.max(0, Math.min(1, x / w));
    const normY = Math.max(0, Math.min(1, y / h));
    const baseFreq = 110 + normX * 500;
    const freq = baseFreq * Math.pow(2, pitchShift / 12);
    osc.frequency.setTargetAtTime(freq, t, 0.03);
    const cutoff = 400 + (1 - normY) * 3000;
    filter.frequency.setTargetAtTime(cutoff, t, 0.04);
    gain.gain.setTargetAtTime(Math.min(volume * 1.1, 0.28), t, 0.02);
  }, [ensurePad, pitchShift, volume]);

  const updatePad = useCallback((x, y) => {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtxRef.current) return;
    // throttle via rAF
    pendingPadRef.current = { x, y };
    if (padRafRef.current) return;
    padRafRef.current = requestAnimationFrame(() => {
      padRafRef.current = null;
      const p = pendingPadRef.current;
      if (!p) return;
      doPadUpdate(p.x, p.y);
      // reset release timeout
      if (padTimeoutRef.current) clearTimeout(padTimeoutRef.current);
      padTimeoutRef.current = setTimeout(() => {
        const ctx = audioCtxRef.current;
        if (!ctx || !padGainRef.current || !padOscRef.current) return;
        const ct = ctx.currentTime;
        try {
          padGainRef.current.gain.cancelScheduledValues(ct);
          padGainRef.current.gain.setValueAtTime(padGainRef.current.gain.value, ct);
          padGainRef.current.gain.linearRampToValueAtTime(0.001, ct + 0.6);
          setTimeout(() => {
            try { padOscRef.current && padOscRef.current.stop(); } catch {}
            padOscRef.current && padOscRef.current.disconnect();
            padGainRef.current && padGainRef.current.disconnect();
            padFilterRef.current && padFilterRef.current.disconnect();
            padOscRef.current = null;
            padGainRef.current = null;
            padFilterRef.current = null;
            padActiveRef.current = false;
          }, 700);
        } catch {}
      }, 350);
    });
  }, [soundEnabled, initAudio, doPadUpdate]);

  const stopPad = useCallback(() => {
    if (padTimeoutRef.current) clearTimeout(padTimeoutRef.current);
    const ctx = audioCtxRef.current;
    if (!ctx || !padGainRef.current || !padOscRef.current) return;
    try {
      const t = ctx.currentTime;
      padGainRef.current.gain.cancelScheduledValues(t);
      padGainRef.current.gain.setValueAtTime(padGainRef.current.gain.value, t);
      padGainRef.current.gain.linearRampToValueAtTime(0.001, t + 0.4);
      setTimeout(() => {
        try { padOscRef.current && padOscRef.current.stop(); } catch {}
        padOscRef.current && padOscRef.current.disconnect();
        padGainRef.current && padGainRef.current.disconnect();
        padFilterRef.current && padFilterRef.current.disconnect();
        padOscRef.current = null;
        padGainRef.current = null;
        padFilterRef.current = null;
        padActiveRef.current = false;
      }, 500);
    } catch {}
  }, []);

  useEffect(() => {
    if (!soundEnabled) stopPad();
  }, [soundEnabled, stopPad]);

  useEffect(() => {
    return () => {
      if (padTimeoutRef.current) clearTimeout(padTimeoutRef.current);
      if (padRafRef.current) cancelAnimationFrame(padRafRef.current);
      try { padOscRef.current && padOscRef.current.stop(); } catch {}
      padOscRef.current && padOscRef.current.disconnect();
      padGainRef.current && padGainRef.current.disconnect();
      padFilterRef.current && padFilterRef.current.disconnect();
    };
  }, []);

  return { playStampSound, initAudio, updatePad, stopPad };
}
