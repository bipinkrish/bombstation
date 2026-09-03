/**
 * gui/js/server.js — Server Process Lifecycle, Live Terminal, & REPL Prompt
 */

import { state } from './state.js';
import { showToast } from './main.js';
import { refreshPlugins } from './plugins.js';
import { loadStudioFileList } from './code_studio.js';
import { loadConfigFile } from './config.js';

export async function loadPresets() {
  try {
    const res = await fetch('/api/presets');
    const data = await res.json();

    const exeContainer = document.getElementById('exe-presets');
    if (exeContainer) {
      exeContainer.innerHTML = '';
      data.executables.forEach(exe => {
        const chip = document.createElement('button');
        chip.className = 'preset-chip';
        chip.innerText = exe.name;
        chip.onclick = () => {
          document.getElementById('input-executable').value = exe.path;
          showToast(`Selected executable: ${exe.name}`);
        };
        exeContainer.appendChild(chip);
      });

      if (data.executables.length > 0 && !document.getElementById('input-executable').value) {
        document.getElementById('input-executable').value = data.executables[0].path;
      }
    }

    const pluginContainer = document.getElementById('plugin-dir-presets');
    if (pluginContainer) {
      pluginContainer.innerHTML = '';
      data.plugin_targets.forEach(pt => {
        const chip = document.createElement('button');
        chip.className = 'preset-chip';
        chip.innerText = pt.name;
        chip.onclick = () => {
          document.getElementById('input-plugins-dir').value = pt.path;
          state.targetModsFolder = pt.path;
          refreshPlugins();
          loadStudioFileList();
          showToast(`Target mods set to: ${pt.name}`);
        };
        pluginContainer.appendChild(chip);
      });

      if (data.plugin_targets.length > 0 && !document.getElementById('input-plugins-dir').value) {
        const rec = data.plugin_targets.find(t => t.recommended) || data.plugin_targets[0];
        document.getElementById('input-plugins-dir').value = rec.path;
        state.targetModsFolder = rec.path;
      }
    }

    const configContainer = document.getElementById('config-presets');
    if (configContainer) {
      configContainer.innerHTML = '';
      data.configs.forEach(cfg => {
        const chip = document.createElement('button');
        chip.className = 'preset-chip';
        chip.innerText = cfg.name;
        chip.onclick = () => {
          document.getElementById('input-config-path').value = cfg.path;
          loadConfigFile(cfg.path);
          showToast(`Loaded config: ${cfg.name}`);
        };
        configContainer.appendChild(chip);
      });

      if (data.configs.length > 0 && !document.getElementById('input-config-path').value) {
        document.getElementById('input-config-path').value = data.configs[0].path;
      }
    }
  } catch (err) {
    console.error('Failed to load presets:', err);
  }
}

export async function browsePath(type) {
  try {
    let promptTitle = 'Select Server Executable';
    let browseType = 'file';

    if (type === 'plugins') {
      browseType = 'directory';
      promptTitle = 'Select Target Mods Directory';
    } else if (type === 'config') {
      browseType = 'file';
      promptTitle = 'Select Server config.toml File';
    }

    showToast('Opening Finder dialog...');
    const res = await fetch(`/api/browse?type=${browseType}&prompt=${encodeURIComponent(promptTitle)}`);
    const data = await res.json();

    if (data.path) {
      if (type === 'executable') {
        document.getElementById('input-executable').value = data.path;
        showToast('Executable path updated');
      } else if (type === 'plugins') {
        document.getElementById('input-plugins-dir').value = data.path;
        state.targetModsFolder = data.path;
        refreshPlugins();
        loadStudioFileList();
        showToast('Target mods directory updated');
      } else if (type === 'config') {
        document.getElementById('input-config-path').value = data.path;
        loadConfigFile(data.path);
        showToast('Config path updated');
      }
    }
  } catch (err) {
    showToast('Finder dialog was cancelled.');
  }
}

export async function refreshStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    updateServerStatusUI(data);
  } catch (err) {
    // Polling silence
  }
}

export function updateServerStatusUI(status) {
  state.server.running = status.running;
  state.server.pid = status.pid;
  state.server.uptime_seconds = status.uptime_seconds;

  const dot = document.getElementById('status-dot');
  const railDot = document.getElementById('rail-server-dot');
  const label = document.getElementById('status-label');
  const pidEl = document.getElementById('status-pid');
  const uptimeEl = document.getElementById('status-uptime');
  const btnStart = document.getElementById('btn-start-server');
  const btnStop = document.getElementById('btn-stop-server');
  const btnRestart = document.getElementById('btn-restart-server');

  if (status.running) {
    if (dot) dot.className = 'pill-dot running';
    if (railDot) railDot.className = 'status-indicator-dot online';
    if (label) label.textContent = 'RUNNING';
    if (pidEl) pidEl.textContent = `PID: ${status.pid}`;
    if (uptimeEl) uptimeEl.textContent = formatUptime(status.uptime_seconds);

    if (btnStart) btnStart.disabled = true;
    if (btnStop) btnStop.disabled = false;
    if (btnRestart) btnRestart.disabled = false;
  } else {
    if (dot) dot.className = 'pill-dot';
    if (railDot) railDot.className = 'status-indicator-dot';
    if (label) label.textContent = 'STOPPED';
    if (pidEl) pidEl.textContent = '';
    if (uptimeEl) uptimeEl.textContent = '00:00:00';

    if (btnStart) btnStart.disabled = false;
    if (btnStop) btnStop.disabled = true;
    if (btnRestart) btnRestart.disabled = true;
  }
}

export function formatUptime(totalSecs) {
  const s = Math.floor(totalSecs || 0);
  const hrs = Math.floor(s / 3600).toString().padStart(2, '0');
  const mins = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const secs = (s % 60).toString().padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
}

export async function startServer() {
  const exe = document.getElementById('input-executable').value.trim();
  const cfg = document.getElementById('input-config-path').value.trim();
  const mods = document.getElementById('input-plugins-dir').value.trim();

  if (!exe) {
    showToast('Please select a valid server executable first.');
    return;
  }

  showToast('Starting dedicated Ballistica server...');
  try {
    const res = await fetch('/api/server/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ executable: exe, config: cfg, plugins_path: mods }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Server started (PID: ${data.status.pid})`);
      updateServerStatusUI(data.status);
    } else {
      showToast(`Start failed: ${data.message}`);
    }
  } catch (err) {
    showToast(`Error starting server: ${err.message}`);
  }
}

export async function stopServer() {
  showToast('Stopping BombSquad server...');
  try {
    const res = await fetch('/api/server/stop', { method: 'POST' });
    const data = await res.json();
    showToast(data.message || 'Server stopped.');
    updateServerStatusUI(data.status);
  } catch (err) {
    showToast(`Failed to stop server: ${err.message}`);
  }
}

export async function restartServer() {
  showToast('Restarting BombSquad server...');
  try {
    const exe = document.getElementById('input-executable').value.trim();
    const cfg = document.getElementById('input-config-path').value.trim();
    const mods = document.getElementById('input-plugins-dir').value.trim();

    const res = await fetch('/api/server/restart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ executable: exe, config: cfg, plugins_path: mods }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Server restarted (PID: ${data.status.pid})`);
      updateServerStatusUI(data.status);
    } else {
      showToast(`Restart failed: ${data.message}`);
    }
  } catch (err) {
    showToast(`Error restarting server: ${err.message}`);
  }
}

export async function pollStatusAndLogs() {
  try {
    const res = await fetch(`/api/server/logs?since=${state.lastLogId}`);
    const data = await res.json();

    if (data.logs && data.logs.length > 0) {
      appendLogsToTerminal(data.logs);
      state.lastLogId = data.logs[data.logs.length - 1].id;
    }

    const counterEl = document.getElementById('term-log-counter');
    if (counterEl) {
      counterEl.textContent = `${data.total || 0} events`;
    }

    await refreshStatus();
  } catch (err) {
    // Network silence
  }
}

export function appendLogsToTerminal(logs) {
  const terminal = document.getElementById('terminal-output');
  if (!terminal) return;

  const filter = (document.getElementById('terminal-search')?.value || '').toLowerCase();

  logs.forEach(item => {
    const line = document.createElement('div');
    line.className = `term-line ${item.severity || 'info'}`;
    line.dataset.text = item.text.toLowerCase();

    if (filter && !line.dataset.text.includes(filter)) {
      line.style.display = 'none';
    }

    line.textContent = `[${item.timestamp}] ${item.text}`;
    terminal.appendChild(line);
  });

  if (state.autoScroll) {
    scrollTerminalToBottom();
  }
}

export function filterLogs() {
  const filter = (document.getElementById('terminal-search')?.value || '').toLowerCase();
  document.querySelectorAll('#terminal-output .term-line').forEach(el => {
    if (!el.dataset.text) return;
    el.style.display = el.dataset.text.includes(filter) ? 'block' : 'none';
  });
}

export function toggleAutoScroll(enabled) {
  state.autoScroll = enabled;
  if (enabled) scrollTerminalToBottom();
}

export function scrollTerminalToBottom() {
  const terminal = document.getElementById('terminal-output');
  if (terminal) {
    terminal.scrollTop = terminal.scrollHeight;
  }
}

export function setupAutoScroll() {
  const terminal = document.getElementById('terminal-output');
  if (!terminal) return;
  terminal.addEventListener('scroll', () => {
    const isAtBottom = terminal.scrollHeight - terminal.scrollTop <= terminal.clientHeight + 40;
    const checkbox = document.getElementById('terminal-auto-scroll');
    if (checkbox && checkbox.checked !== isAtBottom) {
      checkbox.checked = isAtBottom;
      state.autoScroll = isAtBottom;
    }
  });
}

export function clearTerminal() {
  const terminal = document.getElementById('terminal-output');
  if (terminal) {
    terminal.innerHTML = '<div class="term-line dim">Terminal buffer cleared.</div>';
  }
}

export function handleCommandKey(event) {
  if (event.key === 'Enter') {
    sendCommand();
  }
}

export async function sendCommand() {
  const input = document.getElementById('input-command');
  const cmd = input.value.trim();
  if (!cmd) return;

  try {
    input.value = '';
    const res = await fetch('/api/server/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: cmd }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Executed: ${cmd}`);
    } else {
      showToast(`Command error: ${data.message || data.error}`);
    }
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}
