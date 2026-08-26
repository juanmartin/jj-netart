import React, { useState, useCallback, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import NetArtCanvas from './components/NetArtCanvas.jsx';
import BackgroundLayer from './components/BackgroundLayer.jsx';
import ControlPanel from './components/ControlPanel.jsx';
import AssetManagerModal from './components/AssetManagerModal.jsx';
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
  const [bgFilter, setBgFilter] = useState('none');
  const [bgKenburns, setBgKenburns] = useState(true);
  const [clearKey, setClearKey] = useState(0);

  const containerRef = useRef(null);
  const { soundEnabled, toggleSound, playStampSound, initAudio } = useAudioSynth();

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

  const handleAddForeground = useCallback((urls) => {
    setForegroundImages(prev => [...prev, ...urls]);
  }, []);

  const handleAddBackground = useCallback((urls) => {
    setBackgroundImages(prev => [...prev, ...urls]);
  }, []);

  const handleToggleUI = useCallback(() => {
    setUiVisible(prev => !prev);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      // Don't capture when modal is open or typing in input
      if (assetsOpen) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

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
  }, [assetsOpen, handleToggleUI, handleClear, handleSnapshot, handleSwitchBackground]);

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
      />
      <NetArtCanvas
        key={clearKey}
        images={foregroundImages}
        mode={mode}
        blendMode={blendMode}
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
      />
      <AssetManagerModal
        visible={assetsOpen}
        onClose={() => setAssetsOpen(false)}
        foregroundImages={foregroundImages}
        backgroundImages={backgroundImages}
        onAddForeground={handleAddForeground}
        onAddBackground={handleAddBackground}
      />
    </div>
  );
}
