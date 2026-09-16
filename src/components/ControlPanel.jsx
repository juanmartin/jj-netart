import React, { useState } from 'react';

const BLEND_MODES = ['normal', 'difference', 'multiply', 'screen', 'overlay', 'exclusion', 'luminosity', 'color-dodge'];

const PRESETS = {
  dense: { spacing: 10, stampSize: 80, rotation: 25, scaleJitter: 0.5, opacity: 0.85, decay: 0 },
  sparse: { spacing: 120, stampSize: 200, rotation: 5, scaleJitter: 0.1, opacity: 0.95, decay: 0 },
  chaos: { spacing: 5, stampSize: 60, rotation: 180, scaleJitter: 0.8, opacity: 0.7, decay: 3000 },
  ghost: { spacing: 30, stampSize: 150, rotation: 10, scaleJitter: 0.2, opacity: 0.3, decay: 1500 },
  film: { spacing: 50, stampSize: 140, rotation: 0, scaleJitter: 0, opacity: 1, decay: 0 },
  trail: { spacing: 1, stampSize: 90, rotation: 0, scaleJitter: 0, opacity: 1, decay: 0 },
};

const repoPresetModules = import.meta.glob('../presets/*.json', { eager: true, import: 'default' });
const REPO_PRESETS = Object.fromEntries(
  Object.entries(repoPresetModules).map(([p, m]) => [p.split('/').pop().replace(/\.json$/, ''), m])
);

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
  rotation,
  onRotationChange,
  scaleJitter,
  onScaleJitterChange,
  opacity,
  onOpacityChange,
  decay,
  onDecayChange,
  maxStamps,
  onMaxStampsChange,
  presetAutoInterval,
  onPresetAutoIntervalChange,
  onApplyPreset,
  customPresets = {},
  defaultPresetName,
  onSaveCustomPreset,
  onDeleteCustomPreset,
  onSetDefaultPreset,
  onExportPreset,
  onImportPreset,
  // Visual
  bgFilter,
  onBgFilterChange,
  bgKenburns,
  onBgKenburnsChange,
  bgAutoInterval,
  onBgAutoIntervalChange,
  bgFixed,
  onBgFixedChange,
  fgChangeOnClick,
  onFgChangeOnClickChange,
  bgFadeDuration,
  onBgFadeDurationChange,
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
  delayEnabled,
  onDelayEnabledChange,
  delayTime,
  onDelayTimeChange,
  delayFeedback,
  onDelayFeedbackChange,
  delayWet,
  onDelayWetChange,
  randomizeOnBgChange,
  onRandomizeOnBgChange,
  onPreviewSound,
  // Help
  helpOpen,
  onToggleHelp,
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

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
              label="Spacing"
              value={spacing}
              min={1} max={200} step={1}
              onChange={onSpacingChange}
              unit="px"
            />
            <Slider
              label="Size"
              value={stampSize}
              min={20} max={1000} step={5}
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
              value={rotation}
              min={-180} max={180} step={1}
              onChange={onRotationChange}
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
            <Slider
              label="Cap"
              value={maxStamps}
              min={0} max={500} step={50}
              onChange={onMaxStampsChange}
              unit={maxStamps === 0 ? ' ∞' : ''}
            />
          </div>

          <div className="settings-section-title">Foreground</div>
          <div className="settings-grid">
            <div className="setting-row settings-row-full">
              <div className="setting-label">
                <span>FG on Click</span>
                <span className="setting-value">{fgChangeOnClick ? 'ON' : 'OFF'}</span>
              </div>
              <button
                className={`toggle-btn${fgChangeOnClick ? ' active' : ''}`}
                onClick={() => onFgChangeOnClickChange(!fgChangeOnClick)}
              >
                {fgChangeOnClick ? 'FG CLICK ON' : 'FG CLICK OFF'}
              </button>
            </div>
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
              min={0} max={300} step={1}
              onChange={onBgAutoIntervalChange}
              unit={bgAutoInterval === 0 ? ' OFF' : 's'}
            />
            <div className="setting-row settings-row-full">
              <div className="setting-label">
                <span>BG Fixed</span>
                <span className="setting-value">{bgFixed ? 'ON' : 'OFF'}</span>
              </div>
              <button
                className={`toggle-btn${bgFixed ? ' active' : ''}`}
                onClick={() => onBgFixedChange(!bgFixed)}
              >
                {bgFixed ? 'FIXED ON' : 'FIXED OFF'}
              </button>
            </div>
            <Slider
              label="BG Fade"
              value={bgFadeDuration}
              min={0} max={30} step={0.1}
              onChange={onBgFadeDurationChange}
              unit="s"
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
              <div className="setting-label">
                <span>Sound</span>
                <span className="setting-value">{soundEnabled ? 'ON' : 'OFF'}</span>
              </div>
              <button
                className={`toggle-btn${soundEnabled ? ' active' : ''}`}
                onClick={onToggleSound}
              >
                {soundEnabled ? 'SOUND ON' : 'SOUND OFF'}
              </button>
            </div>
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
              min={0.01} max={0.2} step={0.01}
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
              <div className="setting-label">
                <span>Delay</span>
                <span className="setting-value">{delayEnabled ? 'ON' : 'OFF'}</span>
              </div>
              <button
                className={`toggle-btn${delayEnabled ? ' active' : ''}`}
                onClick={() => onDelayEnabledChange(!delayEnabled)}
              >
                {delayEnabled ? 'DELAY ON' : 'DELAY OFF'}
              </button>
            </div>
            <Slider
              label="Wet"
              value={delayWet}
              min={0} max={1} step={0.05}
              onChange={onDelayWetChange}
              unit=""
            />
            <Slider
              label="Time"
              value={delayTime}
              min={0.05} max={1.8} step={0.05}
              onChange={onDelayTimeChange}
              unit="s"
            />
            <Slider
              label="Feedback"
              value={delayFeedback}
              min={0} max={1} step={0.05}
              onChange={onDelayFeedbackChange}
              unit=""
            />
            <div className="setting-row settings-row-full">
              <div className="setting-label">
                <span>Rnd on BG</span>
                <span className="setting-value">{randomizeOnBgChange ? 'ON' : 'OFF'}</span>
              </div>
              <button
                className={`toggle-btn${randomizeOnBgChange ? ' active' : ''}`}
                onClick={() => onRandomizeOnBgChange(!randomizeOnBgChange)}
              >
                {randomizeOnBgChange ? 'RANDOMIZE ON BG ON' : 'RANDOMIZE ON BG OFF'}
              </button>
            </div>
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

          {Object.keys(REPO_PRESETS).length > 0 && (
            <>
              <div className="settings-section-title" style={{ marginTop: 8 }}>Repo Presets</div>
              <div className="settings-presets">
                {Object.keys(REPO_PRESETS).map((name) => (
                  <button
                    key={name}
                    className="preset-btn"
                    onClick={() => onApplyPreset(REPO_PRESETS[name])}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="settings-section-title" style={{ marginTop: 14 }}>Custom Presets</div>
          <div className="settings-grid">
            <div className="setting-row settings-row-full">
              <div className="setting-label"><span>Save current</span></div>
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  className="setting-select"
                  style={{ flex: 1 }}
                  placeholder="preset name"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                />
                <button
                  className="preset-btn"
                  onClick={() => {
                    if (!newPresetName.trim()) return;
                    onSaveCustomPreset && onSaveCustomPreset(newPresetName.trim());
                    setNewPresetName('');
                  }}
                >
                  SAVE
                </button>
              </div>
            </div>
            <div className="setting-row">
              <div className="setting-label"><span>Export current</span></div>
              <button className="preset-btn" onClick={() => {
                const n = newPresetName.trim();
                onExportPreset && onExportPreset(n || undefined);
              }}>
                EXPORT JSON
              </button>
            </div>
            <div className="setting-row">
              <div className="setting-label"><span>Import JSON</span></div>
              <label className="preset-btn" style={{ textAlign: 'center', cursor: 'pointer' }}>
                IMPORT
                <input
                  type="file"
                  accept=".json,application/json"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files && e.target.files[0];
                    if (f) onImportPreset && onImportPreset(f);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>
          {Object.keys(customPresets).length > 0 && (
            <div className="settings-grid" style={{ marginTop: 8 }}>
              {Object.keys(customPresets).map((name) => (
                <div key={name} className="setting-row settings-row-full" style={{ border: '1px solid var(--border-subtle)', padding: 6, borderRadius: 2 }}>
                  <div className="setting-label">
                    <span>{name}</span>
                    <span className="setting-value">{defaultPresetName === name ? '★ default' : ''}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                    <button className="preset-btn" onClick={() => onApplyPreset(customPresets[name])}>APPLY</button>
                    <button className="preset-btn" onClick={() => onExportPreset && onExportPreset(name)}>EXPORT</button>
                    <button className={`preset-btn${defaultPresetName === name ? ' active' : ''}`} onClick={() => onSetDefaultPreset && onSetDefaultPreset(name)}>{defaultPresetName === name ? 'DEFAULT ✓' : 'SET DEFAULT'}</button>
                    <button className="preset-btn" onClick={() => onDeleteCustomPreset && onDeleteCustomPreset(name)} style={{ color: '#f87171' }}>DELETE</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {defaultPresetName && (
            <div className="setting-row settings-row-full" style={{ marginTop: 8 }}>
              <button className="preset-btn" style={{ width: '100%', textAlign: 'center' }} onClick={() => onSetDefaultPreset && onSetDefaultPreset(null)}>
                CLEAR DEFAULT ({defaultPresetName})
              </button>
            </div>
          )}
          <div className="settings-section-title" style={{ marginTop: 8 }}>Preset Auto</div>
          <div className="settings-grid">
            <Slider
              label="Auto Preset"
              value={presetAutoInterval}
              min={0} max={60} step={1}
              onChange={onPresetAutoIntervalChange}
              unit={presetAutoInterval === 0 ? ' OFF' : 'm'}
            />
          </div>
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className={`control-panel${hidden ? ' hidden' : ''}`}>
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
