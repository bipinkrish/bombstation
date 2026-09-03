/**
 * gui/js/state.js — Centralized Reactive State Store
 */

export const state = {
  activeTab: 'tab-server',
  server: {
    running: false,
    pid: null,
    uptime_seconds: 0,
    executable_path: '',
    config_path: '',
    plugins_path: '',
    total_logs: 0,
  },
  config: {
    path: '',
    raw: '',
    parsed: {},
  },
  plugins: [],
  targetModsFolder: '',
  lastLogId: 0,
  autoScroll: true,
  viewMode: 'form', // 'form' | 'raw'
  pollInterval: null,

  codeStudio: {
    activeFilePath: null,
    activeFileName: 'custom_minigame.py',
    templates: {},
  },

  scene3d: {
    renderer: null,
    scene: null,
    camera: null,
    controls: null,
    arenaMesh: null,
    importedMesh: null,
    nodes: [],
    nodeCounter: { spawn: 0, flag: 0, powerup: 0, ffa: 0 },
    currentPreset: 'diorama',
    animationId: null,
  }
};
