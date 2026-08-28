import React, { useState } from 'react';

const MODES = ['collage', 'follower', 'scatter'];
const BLEND_MODES = ['normal', 'difference', 'multiply', 'screen', 'overlay', 'exclusion', 'luminosity', 'color-dodge'];

const PRESETS = {
  dense: { spacing: 10, stampSize: 80, stampsPerMove: 4, rotationJitter: 25, scaleJitter: 0.5, opacity: 0.85, decay: 0 },
  sparse: { spacing: 120, stampSize: 200, stampsPerMove: 1, rotationJitter: 5, scaleJitter: 0.1, opacity: 0.95, decay: 0 },
  chaos: { spacing: 5, stampSize: 60, stampsPerMove: 6, rotationJitter: 180, scaleJitter: 0.8, opacity: 0.7, decay: 3000 },
  ghost: { spacing: 30, stampSize: 150, stampsPerMove: 1, rotationJitter: 10, scaleJitter: 0.2, opacity: 0.3, decay: 1500 },
  film: { spacing: 50, stampSize: 140, stampsPerMove: 1, rotationJitter: 0, scaleJitter: 0, opacity: 1, decay: 0 },
};

const FILTER_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'grayscale(100%)', label: 'Mono' },
  { value: 'sepia(70%)', label: 'Sepia' },
  { value: 'invert(100%)', label: 'Invert' },
  { value: 'hue-rotate(90deg)', label: 'Hue 90°' },
  { value: 'hue-rotate(180deg)', label: 'Hue 180°' },
  { value: 'saturate(2.2)', label: 'Saturate' },
  { value: 'contrast(1.8) brightness(1.1)', label: 'Punch' },
  { value: 'blur(2px)', label: 'Blur' },
  { value: 'sepia(50%) contrast(1.15) saturate(1.3) hue-rotate(-10deg)', label: 'Vintage' },
];

const WAVEFORMS = ['sine', 'square', 'sawtooth', 'triangle'];

function Slider({ label, value, min, max, step, onChange, unit = '' }) {
  return (
    <div className="setting-row">
      <div className="setting-label">
        <span>{label}</span>
        <span className="setting-value">{typeof value === 'number' ? (step < 1 ? value.toFixed(2) : value) : value}{unit}</span>
      </div>
      <input
        className="setting-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

export default function ControlPanel({
  mode,
  onModeChange,
  blendMode,
  onBlendModeChange,
  soundEnabled,
  onToggleSound,
  onClear,
  onSnapshot,
  onToggleUI,
  onOpenAssets,
  onSwitchBackground,
  hidden,
  // Stamp
  spacing,
  onSpacingChange,
  stampSize,
  onStampSizeChange,
  stampsPerMove,
  onStampsPerMoveChange,
  rotationJitter,
  onRotationJitterChange,
  scaleJitter,
  onScaleJitterChange,
  opacity,
  onOpacityChange,
  decay,
  onDecayChange,
  onApplyPreset,
  // Visual
  bgFilter,
  onBgFilterChange,
  bgKenburns,
  onBgKenburnsChange,
  bgAutoInterval,
  onBgAutoIntervalChange,
  noiseOpacity,
  onNoiseOpacityChange,
  // Sound synth
  soundWaveform,
  onSoundWaveformChange,
  soundVolume,
  onSoundVolumeChange,
  soundDuration,
  onSoundDurationChange,
  soundPitchShift,
  onSoundPitchShiftChange,
  onPreviewSound,
  // Help
  helpOpen,
  onToggleHelp,
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const cycleMode = () => {
    const idx = MODES.indexOf(mode);
    onModeChange(MODES[(idx + 1) % MODES.length]);
  };

  const cycleBlend = () => {
    const idx = BLEND_MODES.indexOf(blendMode);
    onBlendModeChange(BLEND_MODES[(idx + 1) % BLEND_MODES.length]);
  };

  return (
    <>
      {/* Settings Drawer */}
      <div className={`settings-drawer${settingsOpen && !hidden ? ' open' : ''}`}>
        <div className="settings-drawer-inner">
          <div className="settings-section-title">Stamp Controls</div>
          <div className="settings-grid">
            <Slider
              label="Density"
              value={stampsPerMove}
              min={1} max={12} step={1}
              onChange={onStampsPerMoveChange}
              unit="×"
            />
            <Slider
              label="Spacing"
              value={spacing}
              min={2} max={200} step={2}
              onChange={onSpacingChange}
              unit="px"
            />
            <Slider
              label="Size"
              value={stampSize}
              min={20} max={400} step={5}
              onChange={onStampSizeChange}
              unit="px"
            />
            <Slider
              label="Opacity"
              value={opacity}
              min={0.05} max={1} step={0.05}
              onChange={onOpacityChange}
            />
          </div>

          <div className="settings-section-title">Transform</div>
          <div className="settings-grid">
            <Slider
              label="Rotation"
              value={rotationJitter}
              min={0} max={180} step={1}
              onChange={onRotationJitterChange}
              unit="°"
            />
            <Slider
              label="Scale Jitter"
              value={scaleJitter}
              min={0} max={1} step={0.05}
              onChange={onScaleJitterChange}
            />
          </div>

          <div className="settings-section-title">Lifetime</div>
          <div className="settings-grid">
            <Slider
              label="Decay"
              value={decay}
              min={0} max={10000} step={100}
              onChange={onDecayChange}
              unit={decay === 0 ? ' ∞' : 'ms'}
            />
          </div>

          <div className="settings-section-title">Visual — Background &amp; Effects</div>
          <div className="settings-grid">
            <div className="setting-row">
              <div className="setting-label"><span>BG Filter</span></div>
              <select
                className="setting-select"
                value={bgFilter}
                onChange={(e) => onBgFilterChange(e.target.value)}
              >
                {FILTER_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="setting-row">
              <div className="setting-label">
                <span>Motion</span>
                <span className="setting-value">{bgKenburns ? 'ON' : 'OFF'}</span>
              </div>
              <button
                className={`toggle-btn${bgKenburns ? ' active' : ''}`}
                onClick={() => onBgKenburnsChange(!bgKenburns)}
              >
                {bgKenburns ? 'KEN BURNS ON' : 'KEN BURNS OFF'}
              </button>
            </div>
            <Slider
              label="Noise"
              value={noiseOpacity}
              min={0} max={0.12} step={0.01}
              onChange={onNoiseOpacityChange}
              unit=""
            />
            <Slider
              label="BG Auto"
              value={bgAutoInterval}
              min={0} max={60} step={1}
              onChange={onBgAutoIntervalChange}
              unit={bgAutoInterval === 0 ? ' OFF' : 's'}
            />
            <div className="setting-row">
              <div className="setting-label"><span>Blend Mode</span></div>
              <select
                className="setting-select"
                value={blendMode}
                onChange={(e) => onBlendModeChange(e.target.value)}
              >
                {BLEND_MODES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="settings-section-title">Sound Synth</div>
          <div className="settings-grid">
            <div className="setting-row settings-row-full">
              <div className="setting-label"><span>Waveform</span><span className="setting-value">{soundWaveform}</span></div>
              <div className="waveform-grid">
                {WAVEFORMS.map(w => (
                  <button
                    key={w}
                    className={`preset-btn${soundWaveform === w ? ' active' : ''}`}
                    onClick={() => onSoundWaveformChange(w)}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
            <Slider
              label="Volume"
              value={soundVolume}
              min={0.01} max={0.3} step={0.01}
              onChange={onSoundVolumeChange}
              unit=""
            />
            <Slider
              label="Duration"
              value={soundDuration}
              min={0.03} max={0.5} step={0.01}
              onChange={onSoundDurationChange}
              unit="s"
            />
            <Slider
              label="Pitch"
              value={soundPitchShift}
              min={-12} max={12} step={1}
              onChange={onSoundPitchShiftChange}
              unit=" st"
            />
            <div className="setting-row settings-row-full">
              <button className="preset-btn" onClick={onPreviewSound} style={{ width: '100%', textAlign: 'center' }}>
                ▶ PREVIEW SOUND
              </button>
            </div>
          </div>

          <div className="settings-section-title">Presets</div>
          <div className="settings-presets">
            {Object.keys(PRESETS).map((name) => (
              <button
                key={name}
                className="preset-btn"
                onClick={() => onApplyPreset(PRESETS[name])}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className={`control-panel${hidden ? ' hidden' : ''}`}>
        <button className="control-btn active" onClick={cycleMode}>
          {mode.toUpperCase()}
        </button>
        <div className="control-separator" />
        <button className="control-btn" onClick={cycleBlend}>
          {blendMode.toUpperCase()}
        </button>
        <div className="control-separator" />
        <button
          className={`control-btn${settingsOpen ? ' active' : ''}`}
          onClick={() => setSettingsOpen(prev => !prev)}
        >
          SETTINGS
        </button>
        <div className="control-separator" />
        <button
          className={`control-btn${soundEnabled ? ' active' : ''}`}
          onClick={onToggleSound}
        >
          SND {soundEnabled ? 'ON' : 'OFF'}
        </button>
        <div className="control-separator" />
        <button className="control-btn" onClick={onSwitchBackground}>
          BG
        </button>
        <div className="control-separator" />
        <button className="control-btn" onClick={onClear}>
          CLEAR
        </button>
        <button className="control-btn" onClick={onSnapshot}>
          CAPTURA
        </button>
        <div className="control-separator" />
        <button className="control-btn" onClick={onOpenAssets}>
          ASSETS
        </button>
        <div className="control-separator" />
        <button className="control-btn" onClick={onToggleUI}>
          HIDE
        </button>
        <div className="control-separator" />
        <button
          className={`control-btn${helpOpen ? ' active' : ''}`}
          onClick={onToggleHelp}
          title="Keyboard shortcuts (?)"
          aria-label="Keyboard shortcuts"
        >
          ?
        </button>
      </div>
    </>
  );
}
