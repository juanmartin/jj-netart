import { useRef, useCallback, useState, useEffect } from 'react';

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
  } = config;

  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioCtxRef = useRef(null);
  const delayNodeRef = useRef(null);
  const feedbackGainRef = useRef(null);
  const wetGainRef = useRef(null);
  const dryGainRef = useRef(null);
  const inputGainRef = useRef(null);

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

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (err) {
      // Audio playback quiet fallback
    }
  }, [soundEnabled, initAudio, ensureDelayGraph, waveform, volume, duration, pitchShift]);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev);
  }, []);

  return { soundEnabled, toggleSound, playStampSound, initAudio };
}
