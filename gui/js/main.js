/**
 * gui/js/main.js — Main Bootstrapper & Global Action Dispatcher
 */

import { state } from './state.js';
import * as ServerModule from './server.js';
import * as ConfigModule from './config.js';
import * as PluginsModule from './plugins.js';
import * as CodeStudioModule from './code_studio.js';
import * as SceneStudioModule from './scene_studio.js';
import * as McpModule from './mcp_hub.js';

// Expose modules globally for clean HTML onclick callbacks
window.BS_Server = ServerModule;
window.BS_Config = ConfigModule;
window.BS_Plugins = PluginsModule;
window.BS_CodeStudio = CodeStudioModule;
window.BS_SceneStudio = SceneStudioModule;
window.BS_Main = { switchStudioTab, showToast };

export function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  }, 2800);
}

export function switchStudioTab(tabId) {
  state.activeTab = tabId;

  document.querySelectorAll('.rail-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });

  document.querySelectorAll('.studio-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === tabId);
  });

  const tabTitles = {
    'tab-server': 'Server Operations',
    'tab-config': 'Server Config',
    'tab-plugins': 'Plugins & Mods',
    'tab-code': 'Code Studio',
    'tab-scene': '3D Scene & Assets',
    'tab-mcp': 'AI & MCP Hub',
  };

  const titleEl = document.getElementById('active-view-name');
  if (titleEl) {
    titleEl.textContent = tabTitles[tabId] || 'Studio';
  }

  if (tabId === 'tab-code') {
    setTimeout(() => CodeStudioModule.layoutEditor(), 60);
  } else if (tabId === 'tab-scene') {
    setTimeout(() => SceneStudioModule.resizeSceneCanvas(), 60);
  } else if (tabId === 'tab-server' && state.autoScroll) {
    ServerModule.scrollTerminalToBottom();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  ServerModule.setupAutoScroll();
  await ServerModule.loadPresets();
  await ServerModule.refreshStatus();
  await ConfigModule.loadConfigFile();
  await PluginsModule.refreshPlugins();
  await CodeStudioModule.loadStudioTemplates();
  await CodeStudioModule.loadStudioFileList();
  await McpModule.loadMcpStatus();

  CodeStudioModule.initMonacoEditor();
  SceneStudioModule.initScene3D();

  // Polling loop
  state.pollInterval = setInterval(async () => {
    await ServerModule.pollStatusAndLogs();
  }, 1000);
});
