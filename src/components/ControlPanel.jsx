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
  // Tunable params
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
