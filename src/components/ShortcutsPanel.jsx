import React, { useCallback } from 'react';

const SHORTCUTS = [
  { key: 'H', desc: 'Hide / Show UI' },
  { key: 'C', desc: 'Clear canvas' },
  { key: 'S', desc: 'Save snapshot' },
  { key: 'Space', desc: 'Next background' },
  { key: 'R', desc: 'Randomize mode & blend' },
  { key: '?', desc: 'Toggle this panel' },
  { key: 'Esc', desc: 'Close panels' },
];

export default function ShortcutsPanel({ visible, onClose }) {
  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  return (
    <div
      className={`asset-modal-overlay${visible ? ' visible' : ''}`}
      onClick={handleOverlayClick}
    >
      <div className="asset-modal shortcuts-modal">
        <div className="asset-modal-header">
          <span className="modal-title">Keyboard Shortcuts</span>
          <button className="modal-close-btn" onClick={onClose}>CLOSE</button>
        </div>
        <div className="shortcuts-grid">
          {SHORTCUTS.map(({ key, desc }) => (
            <div className="shortcut-row" key={key}>
              <span className="shortcut-key">{key}</span>
              <span className="shortcut-desc">{desc}</span>
            </div>
          ))}
        </div>
        <div className="shortcuts-hint">
          Drag &amp; drop images onto the canvas to add them to the foreground pool.
        </div>
      </div>
    </div>
  );
}
