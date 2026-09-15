import React, { useState, useCallback, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import NetArtCanvas from './components/NetArtCanvas.jsx';
import BackgroundLayer from './components/BackgroundLayer.jsx';
import ControlPanel from './components/ControlPanel.jsx';
import AssetManagerModal from './components/AssetManagerModal.jsx';
import ShortcutsPanel from './components/ShortcutsPanel.jsx';
import HeaderNav from './components/HeaderNav.jsx';
import { useAudioSynth } from './hooks/useAudioSynth.js';
import { DEFAULT_FOREGROUND_ASSETS, DEFAULT_BACKGROUND_ASSETS } from './utils/assetLoader.js';
import { loadCustomPresets, saveCustomPresets, getDefaultPresetName, setDefaultPresetName, downloadJson } from './utils/presetStorage.js';
import defaultRepoPreset from './presets/default.json';

const MODES = ['collage', 'follower', 'scatter'];
const BLEND_MODES = ['normal', 'difference', 'multiply', 'screen', 'overlay'];

export default function App() {
  const [foregroundImages, setForegroundImages] = useState(DEFAULT_FOREGROUND_ASSETS);
  const [backgroundImages, setBackgroundImages] = useState(DEFAULT_BACKGROUND_ASSETS);
  const [bgIndex, setBgIndex] = useState(0);
  const [mode, setMode] = useState('collage');
  const [blendMode, setBlendMode] = useState('normal');
  const [uiVisible, setUiVisible] = useState(true);
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [bgFilter, setBgFilter] = useState('none');
  const [bgKenburns, setBgKenburns] = useState(true);
  const [bgAutoInterval, setBgAutoInterval] = useState(10);
  const [bgFixed, setBgFixed] = useState(false);
  const [fgChangeOnClick, setFgChangeOnClick] = useState(false);
  const [fgIndex, setFgIndex] = useState(0);
  const [bgFadeDuration, setBgFadeDuration] = useState(1.2);
  const [clearKey, setClearKey] = useState(0);
  // SETTINGS — wired to ControlPanel drawer + NetArtCanvas
  const [spacing, setSpacing] = useState(40);
  const [stampSize, setStampSize] = useState(120);
  const [stampsPerMove, setStampsPerMove] = useState(1);
  const [rotationJitter, setRotationJitter] = useState(15);
  const [scaleJitter, setScaleJitter] = useState(0.3);
  const [opacity, setOpacity] = useState(0.9);
  const [decay, setDecay] = useState(0);
  const [maxStamps, setMaxStamps] = useState(180);
  const [customPresets, setCustomPresets] = useState({});
  const [defaultPresetName, setDefaultPresetNameState] = useState(null);
  // VISUAL — background
  const [noiseOpacity, setNoiseOpacity] = useState(0.035);
  // SOUND — synth
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundWaveform, setSoundWaveform] = useState('sine');
  const [soundVolume, setSoundVolume] = useState(0.08);
  const [soundDuration, setSoundDuration] = useState(0.08);
  const [soundPitchShift, setSoundPitchShift] = useState(0);
  const [delayEnabled, setDelayEnabled] = useState(false);
  const [delayTime, setDelayTime] = useState(0.3);
  const [delayFeedback, setDelayFeedback] = useState(0.35);
  const [delayWet, setDelayWet] = useState(0.4);
  const [randomizeOnBgChange, setRandomizeOnBgChange] = useState(true);

  const containerRef = useRef(null);
  const toggleSound = useCallback(() => setSoundEnabled(prev => !prev), []);
  const { playStampSound, initAudio } = useAudioSynth({
    waveform: soundWaveform,
    volume: soundVolume,
    duration: soundDuration,
    pitchShift: soundPitchShift,
    delayEnabled,
    delayTime,
    delayFeedback,
    delayWet,
    soundEnabled,
  });

  // Initialize audio on first interaction
  useEffect(() => {
    const handler = () => { initAudio(); window.removeEventListener('click', handler); };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [initAudio]);

  const handleStamp = useCallback((stampId) => {
    playStampSound(stampId);
  }, [playStampSound]);

  const handleClear = useCallback(() => {
    setClearKey(prev => prev + 1);
  }, []);

  const handleSnapshot = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#09090b',
        useCORS: true,
        scale: 2,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `netart-captura-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Snapshot failed:', err);
    }
  }, []);

  const handleSwitchBackground = useCallback(() => {
    if (bgFixed) return;
    setBgIndex(prev => (prev + 1) % backgroundImages.length);
  }, [backgroundImages.length, bgFixed]);

  // Auto-rotate background every bgAutoInterval seconds (0 = off, disabled when fixed)
  useEffect(() => {
    if (bgFixed || bgAutoInterval <= 0 || backgroundImages.length <= 1) return;
    const id = setInterval(handleSwitchBackground, bgAutoInterval * 1000);
    return () => clearInterval(id);
  }, [bgFixed, bgAutoInterval, backgroundImages.length, handleSwitchBackground]);

  const handleForegroundClick = useCallback((e) => {
    if (!fgChangeOnClick) return;
    // ignore clicks on UI
    if (e.target.closest('.control-panel') || e.target.closest('.settings-drawer') || e.target.closest('.asset-modal-overlay') || e.target.closest('.shortcuts-modal') || e.target.closest('.header-nav')) return;
    setFgIndex(prev => (prev + 1) % Math.max(1, foregroundImages.length));
  }, [fgChangeOnClick, foregroundImages.length]);

  const handleAddForeground = useCallback((urls) => {
    setForegroundImages(prev => [...prev, ...urls]);
  }, []);

  const handleAddBackground = useCallback((urls) => {
    setBackgroundImages(prev => [...prev, ...urls]);
  }, []);

  const handleToggleUI = useCallback(() => {
    setUiVisible(prev => !prev);
  }, []);

  const handleToggleHelp = useCallback(() => {
    setHelpOpen(prev => !prev);
  }, []);

  const handleApplyPreset = useCallback((preset) => {
    if (preset.spacing !== undefined) setSpacing(preset.spacing);
    if (preset.stampSize !== undefined) setStampSize(preset.stampSize);
    if (preset.stampsPerMove !== undefined) setStampsPerMove(preset.stampsPerMove);
    if (preset.rotationJitter !== undefined) setRotationJitter(preset.rotationJitter);
    if (preset.scaleJitter !== undefined) setScaleJitter(preset.scaleJitter);
    if (preset.opacity !== undefined) setOpacity(preset.opacity);
    if (preset.decay !== undefined) setDecay(preset.decay);
    if (preset.maxStamps !== undefined) setMaxStamps(preset.maxStamps);
    if (preset.bgFilter !== undefined) setBgFilter(preset.bgFilter);
    if (preset.bgKenburns !== undefined) setBgKenburns(preset.bgKenburns);
    if (preset.bgAutoInterval !== undefined) setBgAutoInterval(preset.bgAutoInterval);
    if (preset.bgFixed !== undefined) setBgFixed(preset.bgFixed);
    if (preset.fgChangeOnClick !== undefined) setFgChangeOnClick(preset.fgChangeOnClick);
    if (preset.bgFadeDuration !== undefined) setBgFadeDuration(preset.bgFadeDuration);
    if (preset.noiseOpacity !== undefined) setNoiseOpacity(preset.noiseOpacity);
    if (preset.soundEnabled !== undefined) setSoundEnabled(preset.soundEnabled);
    if (preset.soundWaveform !== undefined) setSoundWaveform(preset.soundWaveform);
    if (preset.soundVolume !== undefined) setSoundVolume(preset.soundVolume);
    if (preset.soundDuration !== undefined) setSoundDuration(preset.soundDuration);
    if (preset.soundPitchShift !== undefined) setSoundPitchShift(preset.soundPitchShift);
    if (preset.delayEnabled !== undefined) setDelayEnabled(preset.delayEnabled);
    if (preset.delayTime !== undefined) setDelayTime(preset.delayTime);
    if (preset.delayFeedback !== undefined) setDelayFeedback(preset.delayFeedback);
    if (preset.delayWet !== undefined) setDelayWet(preset.delayWet);
    if (preset.randomizeOnBgChange !== undefined) setRandomizeOnBgChange(preset.randomizeOnBgChange);
    if (preset.blendMode !== undefined) setBlendMode(preset.blendMode);
    if (preset.mode !== undefined) setMode(preset.mode);
  }, []);

  const getCurrentPresetData = useCallback(() => ({
    spacing, stampSize, stampsPerMove, rotationJitter, scaleJitter, opacity, decay, maxStamps,
    bgFilter, bgKenburns, bgAutoInterval, bgFixed, fgChangeOnClick, bgFadeDuration, noiseOpacity,
    soundEnabled, soundWaveform, soundVolume, soundDuration, soundPitchShift,
    delayEnabled, delayTime, delayFeedback, delayWet, randomizeOnBgChange,
    blendMode, mode,
  }), [spacing, stampSize, stampsPerMove, rotationJitter, scaleJitter, opacity, decay, maxStamps, bgFilter, bgKenburns, bgAutoInterval, bgFixed, fgChangeOnClick, bgFadeDuration, noiseOpacity, soundEnabled, soundWaveform, soundVolume, soundDuration, soundPitchShift, delayEnabled, delayTime, delayFeedback, delayWet, randomizeOnBgChange, blendMode, mode]);

  const handleSaveCustomPreset = useCallback((name) => {
    if (!name) return;
    const data = getCurrentPresetData();
    const updated = { ...customPresets, [name]: data };
    setCustomPresets(updated);
    saveCustomPresets(updated);
  }, [customPresets, getCurrentPresetData]);

  const handleDeleteCustomPreset = useCallback((name) => {
    const updated = { ...customPresets };
    delete updated[name];
    setCustomPresets(updated);
    saveCustomPresets(updated);
    if (defaultPresetName === name) {
      setDefaultPresetName(null);
      setDefaultPresetNameState(null);
    }
  }, [customPresets, defaultPresetName]);

  const handleSetDefaultPreset = useCallback((name) => {
    setDefaultPresetName(name);
    setDefaultPresetNameState(name);
  }, []);

  const handleExportPreset = useCallback((name) => {
    let data;
    let filename;
    if (name && customPresets[name]) {
      data = customPresets[name];
      filename = name;
    } else if (name) {
      data = getCurrentPresetData();
      filename = name;
    } else {
      data = getCurrentPresetData();
      filename = 'preset';
    }
    downloadJson(data, filename);
  }, [customPresets, getCurrentPresetData]);

  const handleImportPreset = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        // If file contains a single preset object, prompt for name or use filename
        const presetName = file.name.replace(/\.json$/i, '') || 'imported';
        const updated = { ...loadCustomPresets(), [presetName]: data };
        setCustomPresets(updated);
        saveCustomPresets(updated);
        handleApplyPreset(data);
      } catch (err) {
        console.error('Failed to import preset', err);
      }
    };
    reader.readAsText(file);
  }, [handleApplyPreset]);

  // Load custom presets and default on mount
  useEffect(() => {
    const stored = loadCustomPresets();
    setCustomPresets(stored);
    const defName = getDefaultPresetName();
    setDefaultPresetNameState(defName);
    if (defName && stored[defName]) {
      handleApplyPreset(stored[defName]);
    } else if (defaultRepoPreset) {
      handleApplyPreset(defaultRepoPreset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePreviewSound = useCallback(() => {
    playStampSound(Math.floor(Math.random() * 6));
  }, [playStampSound]);

  const randomizeSoundParams = useCallback(() => {
    const waveforms = ['sine', 'square', 'sawtooth', 'triangle'];
    setSoundWaveform(waveforms[Math.floor(Math.random() * waveforms.length)]);
    setSoundVolume(parseFloat((Math.random() * 0.25 + 0.03).toFixed(2)));
    setSoundDuration(parseFloat((Math.random() * 0.35 + 0.05).toFixed(2)));
    setSoundPitchShift(Math.floor(Math.random() * 25) - 12);
    setDelayTime(parseFloat((Math.random() * 1.7 + 0.1).toFixed(2)));
    setDelayFeedback(parseFloat((Math.random() * 1).toFixed(2)));
    setDelayWet(parseFloat((Math.random() * 0.7 + 0.1).toFixed(2)));
  }, []);

  const bgRandomizedRef = useRef(false);
  useEffect(() => {
    if (!bgRandomizedRef.current) {
      bgRandomizedRef.current = true;
      return;
    }
    if (!randomizeOnBgChange) return;
    randomizeSoundParams();
  }, [bgIndex, randomizeOnBgChange, randomizeSoundParams]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // Global: Esc closes any overlay
      if (e.key === 'Escape') {
        if (assetsOpen || helpOpen) {
          e.preventDefault();
          setAssetsOpen(false);
          setHelpOpen(false);
          return;
        }
      }

      // '?' always toggles help (even when a modal is open)
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setHelpOpen(prev => !prev);
        return;
      }

      // Don't capture other shortcuts when a modal is open
      if (assetsOpen || helpOpen) return;

      switch (e.key.toLowerCase()) {
        case 'h':
          e.preventDefault();
          handleToggleUI();
          break;
        case 'c':
          e.preventDefault();
          handleClear();
          break;
        case 's':
          e.preventDefault();
          handleSnapshot();
          break;
        case ' ':
          e.preventDefault();
          handleSwitchBackground();
          break;
        case 'r':
          e.preventDefault();
          setMode(MODES[Math.floor(Math.random() * MODES.length)]);
          setBlendMode(BLEND_MODES[Math.floor(Math.random() * BLEND_MODES.length)]);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [assetsOpen, helpOpen, handleToggleUI, handleClear, handleSnapshot, handleSwitchBackground]);

  // Global drag-and-drop on the canvas (adds to foreground by default)
  useEffect(() => {
    const handleGlobalDragOver = (e) => {
      e.preventDefault();
    };
    const handleGlobalDrop = (e) => {
      if (assetsOpen) return; // let the modal handle it
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      if (files.length === 0) return;

      const promises = files.map(file => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.readAsDataURL(file);
      }));

      Promise.all(promises).then(dataUrls => {
        handleAddForeground(dataUrls);
      });
    };

    window.addEventListener('dragover', handleGlobalDragOver);
    window.addEventListener('drop', handleGlobalDrop);
    return () => {
      window.removeEventListener('dragover', handleGlobalDragOver);
      window.removeEventListener('drop', handleGlobalDrop);
    };
  }, [assetsOpen, handleAddForeground]);

  const displayForegroundImages = fgChangeOnClick && foregroundImages.length > 0
    ? [foregroundImages[fgIndex % foregroundImages.length]]
    : foregroundImages;

  return (
    <div className={`app-container${!uiVisible ? ' hide-cursor' : ''}`} ref={containerRef} onClick={handleForegroundClick}>
      <BackgroundLayer
        images={backgroundImages}
        currentIndex={bgIndex}
        filter={bgFilter}
        kenburns={bgKenburns && !bgFixed}
        noiseOpacity={noiseOpacity}
        fadeDuration={bgFadeDuration}
      />
      <NetArtCanvas
        key={clearKey}
        images={displayForegroundImages}
        mode={mode}
        blendMode={blendMode}
        spacing={spacing}
        stampSize={stampSize}
        stampsPerMove={stampsPerMove}
        rotationJitter={rotationJitter}
        scaleJitter={scaleJitter}
        opacity={opacity}
        decay={decay}
        maxStamps={maxStamps}
        onStamp={handleStamp}
      />
      <HeaderNav uiVisible={uiVisible} />
      <ControlPanel
        mode={mode}
        onModeChange={setMode}
        blendMode={blendMode}
        onBlendModeChange={setBlendMode}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onClear={handleClear}
        onSnapshot={handleSnapshot}
        onToggleUI={handleToggleUI}
        onOpenAssets={() => setAssetsOpen(true)}
        onSwitchBackground={handleSwitchBackground}
        hidden={!uiVisible}
        spacing={spacing}
        onSpacingChange={setSpacing}
        stampSize={stampSize}
        onStampSizeChange={setStampSize}
        stampsPerMove={stampsPerMove}
        onStampsPerMoveChange={setStampsPerMove}
        rotationJitter={rotationJitter}
        onRotationJitterChange={setRotationJitter}
        scaleJitter={scaleJitter}
        onScaleJitterChange={setScaleJitter}
        opacity={opacity}
        onOpacityChange={setOpacity}
        decay={decay}
        onDecayChange={setDecay}
        maxStamps={maxStamps}
        onMaxStampsChange={setMaxStamps}
        onApplyPreset={handleApplyPreset}
        customPresets={customPresets}
        defaultPresetName={defaultPresetName}
        onSaveCustomPreset={handleSaveCustomPreset}
        onDeleteCustomPreset={handleDeleteCustomPreset}
        onSetDefaultPreset={handleSetDefaultPreset}
        onExportPreset={handleExportPreset}
        onImportPreset={handleImportPreset}
        bgFilter={bgFilter}
        onBgFilterChange={setBgFilter}
        bgKenburns={bgKenburns}
        onBgKenburnsChange={setBgKenburns}
        bgAutoInterval={bgAutoInterval}
        onBgAutoIntervalChange={setBgAutoInterval}
        bgFixed={bgFixed}
        onBgFixedChange={setBgFixed}
        fgChangeOnClick={fgChangeOnClick}
        onFgChangeOnClickChange={setFgChangeOnClick}
        bgFadeDuration={bgFadeDuration}
        onBgFadeDurationChange={setBgFadeDuration}
        noiseOpacity={noiseOpacity}
        onNoiseOpacityChange={setNoiseOpacity}
        soundWaveform={soundWaveform}
        onSoundWaveformChange={setSoundWaveform}
        soundVolume={soundVolume}
        onSoundVolumeChange={setSoundVolume}
        soundDuration={soundDuration}
        onSoundDurationChange={setSoundDuration}
        soundPitchShift={soundPitchShift}
        onSoundPitchShiftChange={setSoundPitchShift}
        delayEnabled={delayEnabled}
        onDelayEnabledChange={setDelayEnabled}
        delayTime={delayTime}
        onDelayTimeChange={setDelayTime}
        delayFeedback={delayFeedback}
        onDelayFeedbackChange={setDelayFeedback}
        delayWet={delayWet}
        onDelayWetChange={setDelayWet}
        randomizeOnBgChange={randomizeOnBgChange}
        onRandomizeOnBgChange={setRandomizeOnBgChange}
        onPreviewSound={handlePreviewSound}
        helpOpen={helpOpen}
        onToggleHelp={handleToggleHelp}
      />
      <AssetManagerModal
        visible={assetsOpen}
        onClose={() => setAssetsOpen(false)}
        foregroundImages={foregroundImages}
        backgroundImages={backgroundImages}
        onAddForeground={handleAddForeground}
        onAddBackground={handleAddBackground}
      />
      <ShortcutsPanel
        visible={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </div>
  );
}
