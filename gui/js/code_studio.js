/**
 * gui/js/code_studio.js — Ballistica Code Studio, Monaco Integration & Build/Export
 */

import { state } from './state.js';
import { showToast, switchStudioTab } from './main.js';
import { refreshPlugins } from './plugins.js';

let monacoEditor = null;

export function initMonacoEditor() {
  const container = document.getElementById('monaco-editor-container');
  const fallback = document.getElementById('fallback-code-editor');

  const defaultCode = `# ba_meta require api 9
"""
BombStation Studio: Ballistica Modding IDE
Ready to build custom mini-games, powerups, and character skins!
"""
from __future__ import annotations

import babase
import bascenev1

# Select a template from above or start typing code here...
`;

  if (window.require) {
    window.require.config({
      paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }
    });

    window.require(['vs/editor/editor.main'], function () {
      monacoEditor = window.monaco.editor.create(container, {
        value: defaultCode,
        language: 'python',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: true },
        fontSize: 13,
        fontFamily: "'JetBrains Mono', monospace",
        lineHeight: 20,
        padding: { top: 12, bottom: 12 },
      });
    });
  } else {
    if (container) container.style.display = 'none';
    if (fallback) {
      fallback.style.display = 'block';
      fallback.value = defaultCode;
    }
  }
}

export function layoutEditor() {
  if (monacoEditor) {
    monacoEditor.layout();
  }
}

export function getStudioCode() {
  if (monacoEditor) {
    return monacoEditor.getValue();
  }
  const fallback = document.getElementById('fallback-code-editor');
  return fallback ? fallback.value : '';
}

export function setStudioCode(code) {
  if (monacoEditor) {
    monacoEditor.setValue(code);
  } else {
    const fallback = document.getElementById('fallback-code-editor');
    if (fallback) fallback.value = code;
  }
}

export async function loadStudioTemplates() {
  try {
    const res = await fetch('/api/studio/templates');
    const data = await res.json();
    (data.templates || []).forEach(tpl => {
      state.codeStudio.templates[tpl.id] = tpl;
    });
  } catch (err) {
    console.error('Error loading templates:', err);
  }
}

export async function loadStudioFileList() {
  const targetDir = state.targetModsFolder || document.getElementById('input-plugins-dir')?.value || '';
  try {
    const res = await fetch(`/api/studio/files?dir=${encodeURIComponent(targetDir)}`);
    const data = await res.json();
    const select = document.getElementById('studio-file-select');
    if (!select) return;

    select.innerHTML = '<option value="">-- Open File from Mods --</option>';
    (data.files || []).forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.path;
      opt.textContent = `${f.name} ${f.api ? `(API ${f.api})` : ''}`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Error loading studio file list:', err);
  }
}

export async function onStudioFileSelected(filePath) {
  if (!filePath) return;
  showToast(`Loading ${filePath.split('/').pop()}...`);
  try {
    const res = await fetch('/api/studio/load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath }),
    });
    const data = await res.json();
    if (data.content !== undefined) {
      setStudioCode(data.content);
      state.codeStudio.activeFilePath = data.path;
      state.codeStudio.activeFileName = data.filename;
      showToast(`Loaded: ${data.filename}`);
      validateStudioCode();
    } else {
      showToast(`Failed to load file: ${data.error}`);
    }
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

export function onStudioTemplateSelected(templateId) {
  if (!templateId) return;
  const tpl = state.codeStudio.templates[templateId];
  if (tpl) {
    setStudioCode(tpl.code);
    state.codeStudio.activeFilePath = null;
    state.codeStudio.activeFileName = tpl.filename;
    showToast(`Template loaded: ${tpl.name}`);
    validateStudioCode();
  }
}

export function newStudioScript() {
  const newCode = `# ba_meta require api 9
"""
BombStation Studio: New Ballistica Plugin
"""
from __future__ import annotations

import babase
import bascenev1

# Write custom mod logic here...
`;
  setStudioCode(newCode);
  state.codeStudio.activeFilePath = null;
  state.codeStudio.activeFileName = 'custom_mod.py';
  showToast('Created new script workspace');
}

export function openScriptInStudio(filename) {
  switchStudioTab('tab-code');
  const targetDir = state.targetModsFolder || document.getElementById('input-plugins-dir').value;
  const fullPath = `${targetDir}/${filename}`;
  onStudioFileSelected(fullPath);
}

export async function validateStudioCode() {
  const code = getStudioCode();
  const summaryEl = document.getElementById('diag-summary');
  const pillEl = document.getElementById('diag-pill');
  const detailsEl = document.getElementById('diag-details');

  try {
    const res = await fetch('/api/studio/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const report = await res.json();

    detailsEl.innerHTML = '';

    if (!report.valid) {
      pillEl.className = 'diag-status-pill error';
      pillEl.textContent = '✗ Syntax Error';
      summaryEl.textContent = `Line ${report.syntax_error.line}: ${report.syntax_error.message}`;

      const errDiv = document.createElement('div');
      errDiv.className = 'diag-item error';
      errDiv.textContent = `Line ${report.syntax_error.line}: ${report.syntax_error.message} → "${report.syntax_error.text}"`;
      detailsEl.appendChild(errDiv);
      openDiagnosticTray();
    } else if (report.warnings && report.warnings.length > 0) {
      pillEl.className = 'diag-status-pill warn';
      pillEl.textContent = '⚠ Notice';
      summaryEl.textContent = `${report.warnings.length} Ballistica API notice(s)`;

      report.warnings.forEach(w => {
        const wDiv = document.createElement('div');
        wDiv.className = 'diag-item warn';
        wDiv.textContent = `• ${w}`;
        detailsEl.appendChild(wDiv);
      });
      openDiagnosticTray();
    } else {
      pillEl.className = 'diag-status-pill success';
      pillEl.textContent = '✓ Valid API 9';
      summaryEl.textContent = `Cleanly targets Ballistica API ${report.api_target || 9}.`;

      const infoDiv = document.createElement('div');
      infoDiv.className = 'diag-item info';
      infoDiv.textContent = `Classes detected: ${report.classes.map(c => c.name).join(', ') || 'None'}`;
      detailsEl.appendChild(infoDiv);
    }
  } catch (err) {
    summaryEl.textContent = 'Validation error: ' + err.message;
  }
}

export function toggleDiagnosticTray() {
  const tray = document.getElementById('studio-diagnostic-tray');
  if (tray) tray.classList.toggle('open');
}

export function openDiagnosticTray() {
  const tray = document.getElementById('studio-diagnostic-tray');
  if (tray) tray.classList.add('open');
}

export async function saveAndDeployScript() {
  const code = getStudioCode();
  let filename = state.codeStudio.activeFileName;

  if (!state.codeStudio.activeFilePath && !filename) {
    filename = prompt('Enter filename for mod:', 'custom_arena_mod.py');
    if (!filename) return;
    if (!filename.endsWith('.py')) filename += '.py';
  }

  const targetDir = state.targetModsFolder || document.getElementById('input-plugins-dir').value;
  showToast(`Deploying ${filename} to mods...`);

  try {
    const res = await fetch('/api/studio/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: targetDir,
        filename: filename,
        content: code,
      }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Deployed: ${data.filename} to mods folder.`);
      state.codeStudio.activeFilePath = data.path;
      state.codeStudio.activeFileName = data.filename;
      await refreshPlugins();
      await loadStudioFileList();
    } else {
      showToast(`Deploy failed: ${data.error}`);
    }
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

export async function exportModPackage() {
  let source = state.codeStudio.activeFilePath;
  if (!source) {
    showToast('Please save or select a script to export.');
    return;
  }

  showToast('Building distribution package via build_export pipeline...');
  try {
    const res = await fetch('/api/studio/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, deploy: false }),
    });
    const data = await res.json();
    if (data.success) {
      const manifest = data.manifest;
      showToast(`Exported: ${manifest.package_zip.split('/').pop()} (${manifest.package_size_bytes} bytes)`);
    } else {
      showToast(`Export failed: ${data.error}`);
    }
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}
