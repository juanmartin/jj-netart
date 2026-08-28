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
  const [clearKey, setClearKey] = useState(0);
  // SETTINGS — wired to ControlPanel drawer + NetArtCanvas
  const [spacing, setSpacing] = useState(40);
  const [stampSize, setStampSize] = useState(120);
  const [stampsPerMove, setStampsPerMove] = useState(1);
  const [rotationJitter, setRotationJitter] = useState(15);
  const [scaleJitter, setScaleJitter] = useState(0.3);
  const [opacity, setOpacity] = useState(0.9);
  const [decay, setDecay] = useState(0);
  // VISUAL — background
  const [noiseOpacity, setNoiseOpacity] = useState(0.035);
  // SOUND — synth
  const [soundWaveform, setSoundWaveform] = useState('sine');
  const [soundVolume, setSoundVolume] = useState(0.08);
  const [soundDuration, setSoundDuration] = useState(0.08);
  const [soundPitchShift, setSoundPitchShift] = useState(0);

  const containerRef = useRef(null);
  const { soundEnabled, toggleSound, playStampSound, initAudio } = useAudioSynth({
    waveform: soundWaveform,
    volume: soundVolume,
    duration: soundDuration,
    pitchShift: soundPitchShift,
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
    setBgIndex(prev => (prev + 1) % backgroundImages.length);
  }, [backgroundImages.length]);

  // Auto-rotate background every bgAutoInterval seconds (0 = off)
  useEffect(() => {
    if (bgAutoInterval <= 0 || backgroundImages.length <= 1) return;
    const id = setInterval(handleSwitchBackground, bgAutoInterval * 1000);
    return () => clearInterval(id);
  }, [bgAutoInterval, backgroundImages.length, handleSwitchBackground]);

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
  }, []);

  const handlePreviewSound = useCallback(() => {
    playStampSound(Math.floor(Math.random() * 6));
  }, [playStampSound]);

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

  return (
    <div className="app-container" ref={containerRef}>
      <BackgroundLayer
        images={backgroundImages}
        currentIndex={bgIndex}
        filter={bgFilter}
        kenburns={bgKenburns}
        noiseOpacity={noiseOpacity}
      />
      <NetArtCanvas
        key={clearKey}
        images={foregroundImages}
        mode={mode}
        blendMode={blendMode}
        spacing={spacing}
        stampSize={stampSize}
        stampsPerMove={stampsPerMove}
        rotationJitter={rotationJitter}
        scaleJitter={scaleJitter}
        opacity={opacity}
        decay={decay}
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
        onApplyPreset={handleApplyPreset}
        bgFilter={bgFilter}
        onBgFilterChange={setBgFilter}
        bgKenburns={bgKenburns}
        onBgKenburnsChange={setBgKenburns}
        bgAutoInterval={bgAutoInterval}
        onBgAutoIntervalChange={setBgAutoInterval}
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
