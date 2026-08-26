import React, { useState, useCallback } from 'react';

export default function AssetManagerModal({
  visible,
  onClose,
  foregroundImages,
  backgroundImages,
  onAddForeground,
  onAddBackground
}) {
  const [dragOver, setDragOver] = useState(false);
  const [targetPool, setTargetPool] = useState('foreground');

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;

    const promises = files.map(file => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target.result);
      reader.readAsDataURL(file);
    }));

    Promise.all(promises).then(dataUrls => {
      if (targetPool === 'foreground') {
        onAddForeground(dataUrls);
      } else {
        onAddBackground(dataUrls);
      }
    });
  }, [targetPool, onAddForeground, onAddBackground]);

  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  return (
    <div
      className={`asset-modal-overlay${visible ? ' visible' : ''}`}
      onClick={handleOverlayClick}
    >
      <div className="asset-modal">
        <div className="asset-modal-header">
          <span className="modal-title">Asset Manager</span>
          <button className="modal-close-btn" onClick={onClose}>CLOSE</button>
        </div>

        <div className="pool-toggle">
          <button
            className={`control-btn${targetPool === 'foreground' ? ' active' : ''}`}
            onClick={() => setTargetPool('foreground')}
          >
            FOREGROUND
          </button>
          <button
            className={`control-btn${targetPool === 'background' ? ' active' : ''}`}
            onClick={() => setTargetPool('background')}
          >
            BACKGROUND
          </button>
        </div>

        <div
          className={`drop-zone${dragOver ? ' drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <span className="drop-zone-text">
            {dragOver ? 'RELEASE TO ADD' : 'DROP IMAGES HERE'}
          </span>
        </div>

        <div className="asset-section-title">
          FOREGROUND ({foregroundImages.length})
        </div>
        <div className="asset-grid">
          {foregroundImages.map((src, i) => (
            <div className="asset-thumb" key={`fg-${i}`}>
              <img src={src} alt="" />
            </div>
          ))}
        </div>

        <div className="asset-section-title">
          BACKGROUND ({backgroundImages.length})
        </div>
        <div className="asset-grid">
          {backgroundImages.map((src, i) => (
            <div className="asset-thumb" key={`bg-${i}`}>
              <img src={src} alt="" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
