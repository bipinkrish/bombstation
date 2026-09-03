/**
 * gui/js/plugins.js — Plugins & Mod Management
 */

import { state } from './state.js';
import { showToast, switchStudioTab } from './main.js';
import { loadStudioFileList, openScriptInStudio } from './code_studio.js';

export async function refreshPlugins() {
  const targetDir = state.targetModsFolder || document.getElementById('input-plugins-dir')?.value || '';
  try {
    const res = await fetch(`/api/plugins?target=${encodeURIComponent(targetDir)}`);
    const data = await res.json();
    state.plugins = data.plugins || [];
    renderPluginsUI(data);
  } catch (err) {
    console.error('Error fetching plugins:', err);
  }
}

export function renderPluginsUI(data) {
  const repoContainer = document.getElementById('repo-plugins-list');
  if (repoContainer) {
    repoContainer.innerHTML = '';
    (data.plugins || []).forEach(p => {
      const card = document.createElement('div');
      card.className = 'plugin-card';
      card.innerHTML = `
        <div class="plugin-info">
          <h4>${p.name}</h4>
          <p>${p.description}</p>
          <div class="plugin-meta">
            <span class="badge-subtle">API ${p.api_target}</span>
            <span class="badge-subtle">${p.filename}</span>
          </div>
        </div>
        <div class="plugin-action">
          ${p.is_installed
            ? `<button class="btn btn-secondary btn-sm" onclick="window.BS_Plugins.uninstallPlugin('${p.filename}')">Uninstall</button>`
            : `<button class="btn btn-primary btn-sm" onclick="window.BS_Plugins.installPlugin('${p.filename}')">Install</button>`
          }
        </div>
      `;
      repoContainer.appendChild(card);
    });
  }

  const installedContainer = document.getElementById('installed-plugins-list');
  if (installedContainer) {
    installedContainer.innerHTML = '';
    const customs = data.custom_plugins || [];
    const installedRepo = (data.plugins || []).filter(p => p.is_installed);

    if (customs.length === 0 && installedRepo.length === 0) {
      installedContainer.innerHTML = '<p class="dim" style="padding: 10px;">No mods detected in target directory.</p>';
      return;
    }

    installedRepo.forEach(p => {
      const card = document.createElement('div');
      card.className = 'plugin-card';
      card.innerHTML = `
        <div class="plugin-info">
          <h4>${p.name}</h4>
          <p>${p.filename} • Active in mods</p>
        </div>
        <div class="plugin-action">
          <button class="btn btn-secondary btn-xs" onclick="window.BS_CodeStudio.openScriptInStudio('${p.filename}')">Edit</button>
        </div>
      `;
      installedContainer.appendChild(card);
    });

    customs.forEach(c => {
      const card = document.createElement('div');
      card.className = 'plugin-card';
      card.innerHTML = `
        <div class="plugin-info">
          <h4>${c.name}</h4>
          <p>${(c.size / 1024).toFixed(1)} KB • Modified ${new Date(c.modified * 1000).toLocaleTimeString()}</p>
        </div>
        <div class="plugin-action">
          <button class="btn btn-secondary btn-xs" onclick="window.BS_CodeStudio.openScriptInStudio('${c.name}')">Edit</button>
          <button class="btn btn-ghost btn-xs" onclick="window.BS_Plugins.uninstallPlugin('${c.name}')">Delete</button>
        </div>
      `;
      installedContainer.appendChild(card);
    });
  }
}

export async function installPlugin(filename) {
  const targetDir = state.targetModsFolder || document.getElementById('input-plugins-dir').value;
  showToast(`Installing ${filename}...`);
  try {
    const res = await fetch('/api/plugins/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plugin: filename, target: targetDir }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Installed: ${filename}`);
      await refreshPlugins();
      await loadStudioFileList();
    } else {
      showToast(`Install failed: ${data.error}`);
    }
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

export async function uninstallPlugin(filename) {
  const targetDir = state.targetModsFolder || document.getElementById('input-plugins-dir').value;
  showToast(`Uninstalling ${filename}...`);
  try {
    const res = await fetch('/api/plugins/uninstall', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plugin: filename, target: targetDir }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Uninstalled: ${filename}`);
      await refreshPlugins();
      await loadStudioFileList();
    } else {
      showToast(`Uninstall failed: ${data.error}`);
    }
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

export async function installAllPlugins() {
  const targetDir = state.targetModsFolder || document.getElementById('input-plugins-dir').value;
  showToast('Installing all repository plugins...');
  try {
    const res = await fetch('/api/plugins/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true, target: targetDir }),
    });
    const data = await res.json();
    if (data.success) {
      showToast('All plugins installed.');
      await refreshPlugins();
      await loadStudioFileList();
    }
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

export async function openTargetFolder() {
  const targetDir = state.targetModsFolder || document.getElementById('input-plugins-dir').value;
  try {
    await fetch('/api/plugins/open-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: targetDir }),
    });
    showToast('Revealed mods folder in Finder');
  } catch (err) {
    showToast('Could not open folder');
  }
}
