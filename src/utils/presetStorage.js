// Simple localStorage wrapper for custom presets
const LS_KEY = 'jj-netart:presets';
const LS_DEFAULT = 'jj-netart:defaultPreset';

export function loadCustomPresets() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCustomPresets(presets) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(presets));
  } catch {}
}

export function getDefaultPresetName() {
  try {
    return localStorage.getItem(LS_DEFAULT) || null;
  } catch {
    return null;
  }
}

export function setDefaultPresetName(name) {
  try {
    if (name) localStorage.setItem(LS_DEFAULT, name);
    else localStorage.removeItem(LS_DEFAULT);
  } catch {}
}

export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.json') ? filename : filename + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
