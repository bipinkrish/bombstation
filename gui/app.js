/**
 * BombStation Server Studio — Reactive Frontend Controller
 */

// Application State
const state = {
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
};

// =============================================================================
// Initialization
// =============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  setupAutoScroll();
  await loadPresets();
  await refreshStatus();
  await loadConfigFile();
  await refreshPlugins();

  // Start polling loop for server status & real-time console
  state.pollInterval = setInterval(async () => {
    await pollStatusAndLogs();
  }, 1000);
});

// =============================================================================
// Tab Switching
// =============================================================================
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === tabId);
  });

  if (tabId === 'tab-console' && state.autoScroll) {
    scrollTerminalToBottom();
  }
}

// =============================================================================
// Preset & Path Setup
// =============================================================================
async function loadPresets() {
  try {
    const res = await fetch('/api/presets');
    const data = await res.json();

    // Populate Executable Presets
    const exeContainer = document.getElementById('exe-presets');
    exeContainer.innerHTML = '';
    data.executables.forEach(exe => {
      const chip = document.createElement('button');
      chip.className = 'preset-chip';
      chip.innerText = exe.name;
      chip.onclick = () => {
        document.getElementById('input-executable').value = exe.path;
        showToast(`Selected: ${exe.name}`, '⚡');
      };
      exeContainer.appendChild(chip);
    });

    if (data.executables.length > 0 && !document.getElementById('input-executable').value) {
      document.getElementById('input-executable').value = data.executables[0].path;
    }

    // Populate Plugin Dir Presets
    const pluginContainer = document.getElementById('plugin-dir-presets');
    pluginContainer.innerHTML = '';
    data.plugin_targets.forEach(pt => {
      const chip = document.createElement('button');
      chip.className = 'preset-chip';
      chip.innerText = pt.name;
      chip.onclick = () => {
        document.getElementById('input-plugins-dir').value = pt.path;
        refreshPlugins();
        showToast(`Target set to: ${pt.name}`, '📁');
      };
      pluginContainer.appendChild(chip);
    });

    if (data.plugin_targets.length > 0 && !document.getElementById('input-plugins-dir').value) {
      document.getElementById('input-plugins-dir').value = data.plugin_targets[0].path;
      state.targetModsFolder = data.plugin_targets[0].path;
    }

    // Default Config
    if (data.configs.length > 0 && !document.getElementById('input-config-path').value) {
      document.getElementById('input-config-path').value = data.configs[0].path;
    }
  } catch (err) {
    console.error('Failed to load presets:', err);
  }
}

async function browsePath(field, type, prompt) {
  showToast('Opening native Finder selector...', '🔍');
  try {
    const res = await fetch(`/api/browse?type=${encodeURIComponent(type)}&prompt=${encodeURIComponent(prompt)}`);
    const data = await res.json();
    if (data.path) {
      if (field === 'executable') {
        document.getElementById('input-executable').value = data.path;
        showToast('Updated executable path', '⚡');
      } else if (field === 'plugins-dir') {
        document.getElementById('input-plugins-dir').value = data.path;
        state.targetModsFolder = data.path;
        await refreshPlugins();
        showToast('Updated plugins directory', '📁');
      } else if (field === 'config-path') {
        document.getElementById('input-config-path').value = data.path;
        await loadConfigFile();
        showToast('Loaded configuration file', '⚙️');
      }
    }
  } catch (err) {
    showToast(`Browse error: ${err.message}`, '❌');
  }
}

// =============================================================================
// Server Lifecycle (Start / Stop / Restart / Command)
// =============================================================================
async function refreshStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    updateServerStatusUI(data);
  } catch (err) {
    console.error('Error refreshing status:', err);
  }
}

function updateServerStatusUI(status) {
  state.server = status;

  const card = document.getElementById('status-card');
  const label = document.getElementById('status-label');
  const pidSpan = document.getElementById('status-pid');
  const uptimeSpan = document.getElementById('status-uptime');
  const btnStart = document.getElementById('btn-start-server');
  const btnStop = document.getElementById('btn-stop-server');
  const btnRestart = document.getElementById('btn-restart-server');

  if (status.running) {
    card.classList.add('running');
    label.innerText = 'ONLINE';
    pidSpan.innerText = `(PID: ${status.pid})`;
    uptimeSpan.innerText = `Uptime: ${formatUptime(status.uptime_seconds)}`;

    btnStart.disabled = true;
    btnStop.disabled = false;
    btnRestart.disabled = false;
  } else {
    card.classList.remove('running');
    label.innerText = 'STOPPED';
    pidSpan.innerText = '';
    uptimeSpan.innerText = 'Uptime: 00:00:00';

    btnStart.disabled = false;
    btnStop.disabled = true;
    btnRestart.disabled = true;
  }
}

function formatUptime(seconds) {
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

async function startServer() {
  const exe = document.getElementById('input-executable').value.trim();
  const cfg = document.getElementById('input-config-path').value.trim();
  const mods = document.getElementById('input-plugins-dir').value.trim();

  if (!exe) {
    showToast('Please specify an executable path first!', '⚠️');
    switchTab('tab-paths');
    return;
  }

  showToast('Starting Ballistica Server...', '🚀');
  try {
    const res = await fetch('/api/server/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        executable: exe,
        config: cfg,
        plugins_path: mods,
      }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, '✅');
      updateServerStatusUI(data.status);
      switchTab('tab-console');
    } else {
      showToast(`Start failed: ${data.message}`, '❌');
    }
  } catch (err) {
    showToast(`Error starting server: ${err.message}`, '❌');
  }
}

async function stopServer() {
  showToast('Stopping server...', '🛑');
  try {
    const res = await fetch('/api/server/stop', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Server stopped.', '🛑');
      updateServerStatusUI(data.status);
    } else {
      showToast(`Stop failed: ${data.message}`, '❌');
    }
  } catch (err) {
    showToast(`Error stopping server: ${err.message}`, '❌');
  }
}

async function restartServer() {
  const exe = document.getElementById('input-executable').value.trim();
  const cfg = document.getElementById('input-config-path').value.trim();
  const mods = document.getElementById('input-plugins-dir').value.trim();

  showToast('Restarting server...', '🔄');
  try {
    const res = await fetch('/api/server/restart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ executable: exe, config: cfg, plugins_path: mods }),
    });
    const data = await res.json();
    if (data.success) {
      showToast('Server restarted successfully.', '✅');
      updateServerStatusUI(data.status);
    } else {
      showToast(`Restart failed: ${data.message}`, '❌');
    }
  } catch (err) {
    showToast(`Error restarting server: ${err.message}`, '❌');
  }
}

// =============================================================================
// Console Output & REPL Commands
// =============================================================================
async function pollStatusAndLogs() {
  try {
    // 1. Fetch Logs
    const logRes = await fetch(`/api/server/logs?since=${state.lastLogId}`);
    const logData = await logRes.json();

    if (logData.logs && logData.logs.length > 0) {
      appendLogsToTerminal(logData.logs);
      state.lastLogId = logData.logs[logData.logs.length - 1].id;
    }

    // 2. Fetch Status
    const statusRes = await fetch('/api/status');
    const statusData = await statusRes.json();
    updateServerStatusUI(statusData);
  } catch (err) {
    // Silently ignore temporary network poll hiccups
  }
}

function appendLogsToTerminal(logs) {
  const terminal = document.getElementById('terminal-output');
  const counter = document.getElementById('terminal-counter');

  // Remove placeholder if present
  const placeholder = terminal.querySelector('.terminal-placeholder');
  if (placeholder) {
    terminal.innerHTML = '';
  }

  logs.forEach(log => {
    const line = document.createElement('div');
    line.className = `terminal-line ${log.stream || 'stdout'}`;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'terminal-time';
    timeSpan.innerText = log.time || '';

    const textSpan = document.createElement('span');
    textSpan.className = 'terminal-text';
    textSpan.innerText = log.text || '';

    line.appendChild(timeSpan);
    line.appendChild(textSpan);
    terminal.appendChild(line);
  });

  const totalLines = terminal.querySelectorAll('.terminal-line').length;
  counter.innerText = `${totalLines} lines`;

  if (state.autoScroll) {
    scrollTerminalToBottom();
  }
}

function scrollTerminalToBottom() {
  const terminal = document.getElementById('terminal-output');
  terminal.scrollTop = terminal.scrollHeight;
}

function setupAutoScroll() {
  const chk = document.getElementById('chk-autoscroll');
  chk.addEventListener('change', e => {
    state.autoScroll = e.target.checked;
    if (state.autoScroll) scrollTerminalToBottom();
  });
}

async function sendServerCommand() {
  const input = document.getElementById('terminal-cmd-input');
  const cmd = input.value.trim();
  if (!cmd) return;

  try {
    const res = await fetch('/api/server/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: cmd }),
    });
    const data = await res.json();
    if (data.success) {
      input.value = '';
      showToast(`Sent: ${cmd}`, '💬');
    } else {
      showToast(`Command error: ${data.message}`, '⚠️');
    }
  } catch (err) {
    showToast(`Failed to send command: ${err.message}`, '❌');
  }
}

function handleCommandKey(event) {
  if (event.key === 'Enter') {
    sendServerCommand();
  }
}

function injectCommand(cmd) {
  const input = document.getElementById('terminal-cmd-input');
  input.value = cmd;
  input.focus();
}

async function clearConsoleLogs() {
  try {
    await fetch('/api/server/clear-logs', { method: 'POST' });
    document.getElementById('terminal-output').innerHTML = '';
    state.lastLogId = 0;
    document.getElementById('terminal-counter').innerText = '0 lines';
    showToast('Logs cleared', '🧹');
  } catch (err) {
    showToast('Failed to clear logs', '❌');
  }
}

function copyConsoleLogs() {
  const terminal = document.getElementById('terminal-output');
  const lines = Array.from(terminal.querySelectorAll('.terminal-text')).map(el => el.innerText);
  navigator.clipboard.writeText(lines.join('\n'));
  showToast('Copied all console logs to clipboard!', '📋');
}

// =============================================================================
// Plugins & Modding Manager
// =============================================================================
async function refreshPlugins() {
  const targetDir = document.getElementById('input-plugins-dir').value.trim();
  try {
    const res = await fetch(`/api/plugins?target=${encodeURIComponent(targetDir)}`);
    const data = await res.json();

    state.plugins = data.plugins || [];
    state.targetModsFolder = data.target_directory;

    document.getElementById('plugins-active-folder').innerText = data.target_directory;
    const badge = document.getElementById('folder-status-badge');
    if (data.target_exists) {
      badge.innerText = 'Folder Ready';
      badge.className = 'folder-exists-badge';
    } else {
      badge.innerText = 'Will Be Created on Install';
      badge.className = 'folder-exists-badge not-created';
    }

    renderPluginsGrid(data.plugins, data.custom_plugins);
  } catch (err) {
    console.error('Failed to load plugins:', err);
  }
}

function renderPluginsGrid(plugins, customPlugins = []) {
  const container = document.getElementById('plugins-container');
  container.innerHTML = '';

  const allItems = [...plugins, ...customPlugins];
  let installedCount = 0;

  allItems.forEach(plugin => {
    if (plugin.installed) installedCount++;

    const card = document.createElement('div');
    card.className = 'plugin-card';

    const icon = plugin.id.includes('character') ? '🎭' : (plugin.id.includes('player') ? '⚡' : '🧩');

    card.innerHTML = `
      <div class="plugin-top">
        <div class="plugin-icon-wrap">${icon}</div>
        <div class="plugin-info">
          <h4 class="plugin-title">${plugin.title}</h4>
          <span class="plugin-filename">${plugin.filename}</span>
        </div>
        <span class="plugin-state-badge ${plugin.installed ? 'installed' : 'not-installed'}">
          ${plugin.installed ? 'Installed' : 'Not Installed'}
        </span>
      </div>

      <p class="plugin-desc">${plugin.description}</p>

      <div class="plugin-meta-row">
        <span>Target: <strong>${plugin.target_api || 'API 9'}</strong></span>
        <span>Author: <strong>${plugin.author || 'BombStation'}</strong></span>
        ${plugin.installed ? `<span>Size: <strong>${(plugin.installed_size / 1024).toFixed(1)} KB</strong></span>` : ''}
      </div>

      <div class="plugin-actions">
        ${plugin.installed ? `
          <button class="btn btn-outline btn-sm" onclick="installPlugin('${plugin.filename}', true)">
            <span>Reinstall</span>
          </button>
          <button class="btn btn-danger btn-sm" onclick="uninstallPlugin('${plugin.filename}')">
            <span>Uninstall</span>
          </button>
        ` : `
          <button class="btn btn-primary btn-sm" onclick="installPlugin('${plugin.filename}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            <span>Install Plugin</span>
          </button>
        `}
      </div>
    `;

    container.appendChild(card);
  });

  const countBadge = document.getElementById('plugins-count-badge');
  countBadge.innerText = `${installedCount} / ${allItems.length} Installed`;
}

async function installPlugin(filename, isReinstall = false) {
  const targetDir = document.getElementById('input-plugins-dir').value.trim();
  showToast(`Installing ${filename}...`, '🧩');
  try {
    const res = await fetch('/api/plugins/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: targetDir, plugin: filename }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(isReinstall ? `Reinstalled ${filename}` : `Installed ${filename}!`, '✅');
      await refreshPlugins();
    } else {
      showToast(`Install error: ${data.error}`, '❌');
    }
  } catch (err) {
    showToast(`Install failed: ${err.message}`, '❌');
  }
}

async function installAllPlugins() {
  const targetDir = document.getElementById('input-plugins-dir').value.trim();
  showToast('Installing all repository plugins...', '📦');
  try {
    const res = await fetch('/api/plugins/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: targetDir, all: true }),
    });
    const data = await res.json();
    if (data.success) {
      showToast('All plugins installed successfully!', '✅');
      await refreshPlugins();
    } else {
      showToast(`Error: ${data.error}`, '❌');
    }
  } catch (err) {
    showToast(`Install all failed: ${err.message}`, '❌');
  }
}

async function uninstallPlugin(filename) {
  const targetDir = document.getElementById('input-plugins-dir').value.trim();
  if (!confirm(`Are you sure you want to uninstall ${filename} from your mods folder?`)) return;

  try {
    const res = await fetch('/api/plugins/uninstall', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: targetDir, plugin: filename }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Uninstalled ${filename}`, '🗑️');
      await refreshPlugins();
    } else {
      showToast(`Uninstall error: ${data.error}`, '❌');
    }
  } catch (err) {
    showToast(`Uninstall failed: ${err.message}`, '❌');
  }
}

async function openTargetFolderInFinder() {
  const targetDir = document.getElementById('input-plugins-dir').value.trim();
  try {
    const res = await fetch('/api/plugins/open-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: targetDir }),
    });
    const data = await res.json();
    if (data.success) {
      showToast('Revealed mods folder in Finder', '📂');
    } else {
      showToast(`Could not open: ${data.error}`, '❌');
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, '❌');
  }
}

// =============================================================================
// Server Configuration (config.toml)
// =============================================================================
async function loadConfigFile() {
  const cfgPath = document.getElementById('input-config-path').value.trim();
  try {
    const res = await fetch(`/api/config?path=${encodeURIComponent(cfgPath)}`);
    const data = await res.json();

    if (data.error) {
      showToast(`Config load warning: ${data.error}`, '⚠️');
      return;
    }

    state.config.path = data.path;
    state.config.raw = data.raw;
    state.config.parsed = data.parsed;

    populateFormFields(data.parsed);
    document.getElementById('raw-toml-editor').value = data.raw;

    // Update port badge in header
    if (data.parsed.port) {
      document.getElementById('status-port-display').innerText = `Port: ${data.parsed.port}`;
    }

    document.getElementById('save-bar-status').innerText = `Config loaded from ${data.path.split('/').pop()}`;
  } catch (err) {
    console.error('Config load failed:', err);
  }
}

function populateFormFields(cfg) {
  const fields = [
    'party_name', 'party_is_public', 'password', 'public_ipv4_address', 'stats_url',
    'session_type', 'session_max_players_override', 'playlist_code', 'playlist_shuffle',
    'teams_series_length', 'ffa_series_length', 'auto_balance_teams', 'allow_punch_grab',
    'coop_campaign', 'coop_level', 'port', 'max_party_size', 'protocol_version',
    'authenticate_clients', 'enable_queue', 'enable_default_kick_voting',
    'clean_exit_minutes', 'idle_exit_minutes', 'unclean_exit_minutes', 'dont_write_bytecode'
  ];

  fields.forEach(field => {
    const el = document.getElementById(`cfg-${field}`);
    if (!el) return;

    if (field in cfg && cfg[field] !== null && cfg[field] !== undefined) {
      if (el.tagName === 'SELECT') {
        el.value = String(cfg[field]);
      } else {
        el.value = cfg[field];
      }
    } else {
      el.value = '';
    }
  });

  // Admins list
  const adminsEl = document.getElementById('cfg-admins');
  if (adminsEl && Array.isArray(cfg.admins)) {
    adminsEl.value = cfg.admins.join(', ');
  }
}

function collectFormData() {
  const data = {};

  const stringFields = ['party_name', 'password', 'public_ipv4_address', 'stats_url', 'session_type', 'coop_campaign', 'coop_level'];
  const numberFields = ['session_max_players_override', 'playlist_code', 'teams_series_length', 'ffa_series_length', 'port', 'max_party_size', 'protocol_version', 'clean_exit_minutes', 'idle_exit_minutes', 'unclean_exit_minutes'];
  const boolFields = ['party_is_public', 'playlist_shuffle', 'auto_balance_teams', 'allow_punch_grab', 'authenticate_clients', 'enable_queue', 'enable_default_kick_voting', 'dont_write_bytecode'];

  stringFields.forEach(f => {
    const el = document.getElementById(`cfg-${f}`);
    if (el && el.value.trim() !== '') data[f] = el.value.trim();
  });

  numberFields.forEach(f => {
    const el = document.getElementById(`cfg-${f}`);
    if (el && el.value.trim() !== '') {
      const num = Number(el.value.trim());
      if (!isNaN(num)) data[f] = num;
    }
  });

  boolFields.forEach(f => {
    const el = document.getElementById(`cfg-${f}`);
    if (el) data[f] = el.value === 'true';
  });

  const adminsEl = document.getElementById('cfg-admins');
  if (adminsEl && adminsEl.value.trim() !== '') {
    data.admins = adminsEl.value.split(',').map(s => s.trim()).filter(Boolean);
  }

  return data;
}

function setConfigViewMode(mode) {
  state.viewMode = mode;
  const formWrap = document.getElementById('config-form-container');
  const rawWrap = document.getElementById('config-raw-container');
  const btnForm = document.getElementById('btn-mode-form');
  const btnRaw = document.getElementById('btn-mode-raw');

  if (mode === 'form') {
    formWrap.style.display = 'flex';
    rawWrap.style.display = 'none';
    btnForm.classList.add('active');
    btnRaw.classList.remove('active');
  } else {
    // Sync form values to raw before switching
    const currentSettings = collectFormData();
    formWrap.style.display = 'none';
    rawWrap.style.display = 'flex';
    btnForm.classList.remove('active');
    btnRaw.classList.add('active');
  }
}

async function saveConfiguration() {
  const cfgPath = document.getElementById('input-config-path').value.trim();
  let payload = { path: cfgPath };

  if (state.viewMode === 'raw') {
    payload.raw = document.getElementById('raw-toml-editor').value;
  } else {
    payload.settings = collectFormData();
  }

  showToast('Saving server config...', '💾');
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      showToast('Configuration saved successfully!', '✅');
      document.getElementById('save-bar-status').innerText = `Saved at ${new Date().toLocaleTimeString()}`;
      state.config.raw = data.raw;
      state.config.parsed = data.parsed;
      document.getElementById('raw-toml-editor').value = data.raw;

      if (data.parsed.port) {
        document.getElementById('status-port-display').innerText = `Port: ${data.parsed.port}`;
      }
    } else {
      showToast(`Save error: ${data.error}`, '❌');
    }
  } catch (err) {
    showToast(`Failed to save config: ${err.message}`, '❌');
  }
}

// Preset Profiles
function applyPresetProfile(profileKey) {
  const presets = {
    mega999: {
      party_name: "BombStation 999 Players Mega Party",
      session_type: "ffa",
      session_max_players_override: 999,
      max_party_size: 999,
      party_is_public: true,
      playlist_shuffle: true,
      allow_punch_grab: true,
      port: 43210,
    },
    ffa_standard: {
      party_name: "Standard FFA 8P",
      session_type: "ffa",
      session_max_players_override: 8,
      max_party_size: 8,
      party_is_public: true,
      playlist_shuffle: true,
      ffa_series_length: 24,
      port: 43210,
    },
    teams_best7: {
      party_name: "Competitive Teams (Best of 7)",
      session_type: "teams",
      session_max_players_override: 8,
      auto_balance_teams: true,
      teams_series_length: 7,
      party_is_public: true,
      port: 43210,
    },
    coop: {
      party_name: "Co-op Campaign Host",
      session_type: "coop",
      coop_campaign: "Easy",
      coop_level: "Onslaught Training",
      party_is_public: true,
      port: 43210,
    },
    lan_private: {
      party_name: "Private LAN Squad",
      party_is_public: false,
      authenticate_clients: false,
      port: 43210,
    }
  };

  const preset = presets[profileKey];
  if (!preset) return;

  populateFormFields(preset);
  showToast(`Applied preset profile: ${profileKey}`, '⚡');
}

// =============================================================================
// Toast System
// =============================================================================
let toastTimeout = null;
function showToast(message, icon = 'ℹ️') {
  const toast = document.getElementById('toast');
  document.getElementById('toast-icon').innerText = icon;
  document.getElementById('toast-message').innerText = message;

  toast.classList.add('show');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}
