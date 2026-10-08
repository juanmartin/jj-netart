import { useRef, useCallback, useEffect } from 'react';
import { SAMPLE_PACKS } from '../utils/sampleLoader.js';

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
    // Parallel voices: synth drone and sampler chops can run together
    synthEnabled = true,
    samplerEnabled = true,
    samplerPack = 'CHINO',
    samplerVolume = 0.4,
    samplerTune = 0,
    samplerPitchXLo = -3,
    samplerPitchXHi = 3,
    samplerCutoff = 7500,
    samplerResonance = 0.8,
    samplerAttack = 0.008,
    samplerRelease = 0.35,
    samplerCooldown = 450,
    samplerVoices = 3,
    samplerPlayMode = 'random',
    statsRef = null,
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

  // Report live voice/cache counts for the debug overlay (ref write, no re-render)
  const reportAudioStats = useCallback(() => {
    if (!statsRef) return;
    statsRef.current.voices = activeVoicesRef.current.length;
    statsRef.current.cacheSize = sampleCacheRef.current.size;
  }, [statsRef]);

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

  // ---- Sampler: vocal-chop playback through the same delay graph ----
  const MAX_CACHED_SAMPLES = 25;
  const sampleCacheRef = useRef(new Map()); // url -> AudioBuffer (LRU: re-set on hit)
  const sampleInflightRef = useRef(new Map()); // url -> Promise<AudioBuffer|null>
  const activeVoicesRef = useRef([]); // { source, gain }
  const lastChopRef = useRef(0);
  const seqIndexRef = useRef(0);

  const ensureSampleBuffer = useCallback((url) => {
    const cache = sampleCacheRef.current;
    if (cache.has(url)) {
      // LRU touch: re-insert to mark as most-recently-used
      const buf = cache.get(url);
      cache.delete(url);
      cache.set(url, buf);
      return Promise.resolve(buf);
    }
    const inflight = sampleInflightRef.current;
    if (inflight.has(url)) return inflight.get(url);
    const ctx = audioCtxRef.current;
    if (!ctx) return Promise.resolve(null);
    const p = (async () => {
      try {
        const res = await fetch(url);
        const arr = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(arr);
        cache.set(url, buf);
        while (cache.size > MAX_CACHED_SAMPLES) {
          cache.delete(cache.keys().next().value);
        }
        reportAudioStats();
        return buf;
      } catch {
        return null;
      } finally {
        sampleInflightRef.current.delete(url);
      }
    })();
    inflight.set(url, p);
    return p;
  }, []);

  // Preload the head of the active pack once audio is unlocked (keeps first
  // chops snappy, covers sequence mode from the start). The rest decodes
  // on demand into the LRU cache — never the whole pack at once.
  const preloadPack = useCallback((pack) => {
    if (!audioCtxRef.current) return;
    const urls = SAMPLE_PACKS[pack] || [];
    urls.slice(0, 10).forEach((u) => {
      ensureSampleBuffer(u);
    });
  }, [ensureSampleBuffer]);

  useEffect(() => {
    preloadPack(samplerPack);
  }, [samplerPack, preloadPack]);

  const pickSampleUrl = useCallback(() => {
    const urls = SAMPLE_PACKS[samplerPack] || [];
    if (urls.length === 0) return null;
    if (samplerPlayMode === 'sequence') {
      const u = urls[seqIndexRef.current % urls.length];
      seqIndexRef.current = (seqIndexRef.current + 1) % urls.length;
      return u;
    }
    return urls[Math.floor(Math.random() * urls.length)];
  }, [samplerPack, samplerPlayMode]);

  const stopAllVoices = useCallback(() => {
    const voices = activeVoicesRef.current.splice(0);
    voices.forEach(({ source, gain }) => {
      try { source.stop(); } catch {}
      try { source.disconnect(); } catch {}
      try { gain.disconnect(); } catch {}
    });
    reportAudioStats();
  }, [reportAudioStats]);

  const triggerChop = useCallback(async (x, y, bypassCooldown = false) => {
    if (!soundEnabled) return;
    const now = performance.now();
    if (!bypassCooldown && now - lastChopRef.current < samplerCooldown) return;
    lastChopRef.current = now;
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      ensureDelayGraph();
      const url = pickSampleUrl();
      if (!url) return;
      const buf = await ensureSampleBuffer(url);
      if (!buf) return;
      // Voice choke: stop oldest when at max polyphony
      while (activeVoicesRef.current.length >= Math.max(1, samplerVoices)) {
        const old = activeVoicesRef.current.shift();
        if (!old) break;
        try { old.source.stop(); } catch {}
        try { old.source.disconnect(); } catch {}
        try { old.gain.disconnect(); } catch {}
      }
      const w = window.innerWidth || 1200;
      const h = window.innerHeight || 800;
      const normX = Math.max(0, Math.min(1, x / w));
      const normY = Math.max(0, Math.min(1, y / h));
      // X -> pitch (left edge = tune+lo, right edge = tune+hi; lo>hi reverses),
      // Y -> brightness
      const semi = samplerTune + (samplerPitchXLo + normX * (samplerPitchXHi - samplerPitchXLo));
      const rate = Math.max(0.25, Math.min(4, Math.pow(2, semi / 12)));
      const cutoffEff = Math.max(120, Math.min(16000,
        500 + (1 - normY) * Math.max(100, samplerCutoff - 500)));
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = rate;
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = cutoffEff;
      filt.Q.value = samplerResonance;
      const g = ctx.createGain();
      const t = ctx.currentTime;
      const dur = buf.duration / rate;
      const atk = Math.max(0.003, Math.min(0.5, samplerAttack));
      const rel = Math.max(0.05, Math.min(1.5, samplerRelease));
      const peak = Math.max(0.001, samplerVolume);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + Math.min(atk, dur * 0.5));
      const relStart = Math.max(t + atk, t + dur - rel);
      g.gain.setValueAtTime(peak, relStart);
      g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.05);
      let pan = null;
      try {
        pan = ctx.createStereoPanner();
        pan.pan.value = Math.max(-0.8, Math.min(0.8, (normX - 0.5) * 1.2));
      } catch {}
      src.connect(filt);
      filt.connect(g);
      const dest = inputGainRef.current || ctx.destination;
      if (pan) { g.connect(pan); pan.connect(dest); }
      else { g.connect(dest); }
      const voice = { source: src, gain: g };
      activeVoicesRef.current.push(voice);
      reportAudioStats();
      src.onended = () => {
        try { src.disconnect(); } catch {}
        try { filt.disconnect(); } catch {}
        try { g.disconnect(); } catch {}
        try { pan && pan.disconnect(); } catch {}
        const i = activeVoicesRef.current.indexOf(voice);
        if (i >= 0) activeVoicesRef.current.splice(i, 1);
        reportAudioStats();
      };
      src.start(t, 0, dur + 0.1);
    } catch {
      // Audio playback quiet fallback
    }
  }, [soundEnabled, samplerCooldown, samplerTune, samplerPitchXLo, samplerPitchXHi, samplerCutoff,
    samplerResonance, samplerAttack, samplerRelease, samplerVolume, samplerVoices,
    initAudio, ensureDelayGraph, ensureSampleBuffer, pickSampleUrl]);

  const playStampSound = useCallback((index = 0) => {
    if (!soundEnabled) return;
    if (samplerEnabled) {
      // Preview: one chop from screen center, ignoring the cooldown
      triggerChop((window.innerWidth || 1200) / 2, (window.innerHeight || 800) / 2, true);
    }
    if (!synthEnabled) return;
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
  }, [soundEnabled, initAudio, ensureDelayGraph, waveform, volume, duration, pitchShift,
    synthEnabled, samplerEnabled, triggerChop]);

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
  const padReleaseInnerRef = useRef(null);
  const stopPadInnerRef = useRef(null);

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
    if (samplerEnabled) {
      // Sampler: discrete vocal chops throttled by the cooldown, not a drone
      triggerChop(x, y);
    }
    if (!synthEnabled) return;
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
          if (padReleaseInnerRef.current) clearTimeout(padReleaseInnerRef.current);
          padReleaseInnerRef.current = setTimeout(() => {
            padReleaseInnerRef.current = null;
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
  }, [soundEnabled, initAudio, doPadUpdate, synthEnabled, samplerEnabled, triggerChop]);

  const stopPad = useCallback(() => {
    if (padTimeoutRef.current) clearTimeout(padTimeoutRef.current);
    if (padReleaseInnerRef.current) {
      clearTimeout(padReleaseInnerRef.current);
      padReleaseInnerRef.current = null;
    }
    if (stopPadInnerRef.current) {
      clearTimeout(stopPadInnerRef.current);
      stopPadInnerRef.current = null;
    }
    const ctx = audioCtxRef.current;
    if (!ctx || !padGainRef.current || !padOscRef.current) return;
    try {
      const t = ctx.currentTime;
      padGainRef.current.gain.cancelScheduledValues(t);
      padGainRef.current.gain.setValueAtTime(padGainRef.current.gain.value, t);
      padGainRef.current.gain.linearRampToValueAtTime(0.001, t + 0.4);
      stopPadInnerRef.current = setTimeout(() => {
        stopPadInnerRef.current = null;
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
    if (!soundEnabled || !synthEnabled) stopPad();
    if (!soundEnabled || !samplerEnabled) stopAllVoices();
  }, [soundEnabled, synthEnabled, samplerEnabled, stopPad, stopAllVoices]);

  useEffect(() => {
    return () => {
      if (padTimeoutRef.current) clearTimeout(padTimeoutRef.current);
      if (padReleaseInnerRef.current) clearTimeout(padReleaseInnerRef.current);
      if (stopPadInnerRef.current) clearTimeout(stopPadInnerRef.current);
      if (padRafRef.current) cancelAnimationFrame(padRafRef.current);
      try { padOscRef.current && padOscRef.current.stop(); } catch {}
      padOscRef.current && padOscRef.current.disconnect();
      padGainRef.current && padGainRef.current.disconnect();
      padFilterRef.current && padFilterRef.current.disconnect();
    };
  }, []);

  return { playStampSound, initAudio, updatePad, stopPad, triggerChop };
}
