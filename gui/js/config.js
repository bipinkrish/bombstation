/**
 * gui/js/config.js — Server config.toml Visual Editor & Raw Sync
 */

import { state } from './state.js';
import { showToast } from './main.js';

export async function loadConfigFile(customPath = null) {
  try {
    const targetPath = customPath || document.getElementById('input-config-path')?.value || '';
    const res = await fetch(`/api/config?path=${encodeURIComponent(targetPath)}`);
    if (!res.ok) return;

    const data = await res.json();
    state.config.path = data.path;
    state.config.raw = data.raw;
    state.config.parsed = data.config || {};

    const rawEditor = document.getElementById('raw-config-editor');
    if (rawEditor) {
      rawEditor.value = data.raw;
    }

    populateConfigForm(state.config.parsed);
  } catch (err) {
    console.error('Error loading config:', err);
  }
}

export function populateConfigForm(cfg) {
  const setVal = (id, val, def = '') => {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined && val !== null ? val : def;
  };

  setVal('cfg-party_name', cfg.party_name, 'BombSquad Server');
  setVal('cfg-party_is_public', cfg.party_is_public !== undefined ? String(cfg.party_is_public) : 'true');
  setVal('cfg-password', cfg.password, '');
  setVal('cfg-public_ipv4_address', cfg.public_ipv4_address, '');
  setVal('cfg-stats_url', cfg.stats_url, '');

  setVal('cfg-session_type', cfg.session_type, 'ffa');
  setVal('cfg-session_max_players_override', cfg.session_max_players_override, 8);
  setVal('cfg-playlist_code', cfg.playlist_code, '');
  setVal('cfg-playlist_shuffle', cfg.playlist_shuffle !== undefined ? String(cfg.playlist_shuffle) : 'true');
  setVal('cfg-teams_series_length', cfg.teams_series_length, 7);
  setVal('cfg-ffa_series_length', cfg.ffa_series_length, 24);
  setVal('cfg-auto_balance_teams', cfg.auto_balance_teams !== undefined ? String(cfg.auto_balance_teams) : 'true');
  setVal('cfg-allow_punch_grab', cfg.allow_punch_grab !== undefined ? String(cfg.allow_punch_grab) : 'true');
  setVal('cfg-coop_campaign', cfg.coop_campaign, 'Easy');
  setVal('cfg-coop_level', cfg.coop_level, 'Onslaught Training');

  setVal('cfg-port', cfg.port, 43210);
  setVal('cfg-max_party_size', cfg.max_party_size, 6);
  setVal('cfg-protocol_version', cfg.protocol_version, 38);
  setVal('cfg-authenticate_clients', cfg.authenticate_clients !== undefined ? String(cfg.authenticate_clients) : 'true');
  setVal('cfg-admins', Array.isArray(cfg.admins) ? cfg.admins.join(', ') : (cfg.admins || ''));
  setVal('cfg-enable_queue', cfg.enable_queue !== undefined ? String(cfg.enable_queue) : 'true');
  setVal('cfg-enable_default_kick_voting', cfg.enable_default_kick_voting !== undefined ? String(cfg.enable_default_kick_voting) : 'true');

  setVal('cfg-clean_exit_minutes', cfg.clean_exit_minutes, 60);
  setVal('cfg-idle_exit_minutes', cfg.idle_exit_minutes, 20);
  setVal('cfg-unclean_exit_minutes', cfg.unclean_exit_minutes, 90);
  setVal('cfg-dont_write_bytecode', cfg.dont_write_bytecode !== undefined ? String(cfg.dont_write_bytecode) : 'false');
}

export function gatherConfigFromForm() {
  const getVal = id => document.getElementById(id)?.value?.trim() || '';
  const getNum = id => {
    const v = getVal(id);
    return v !== '' ? Number(v) : undefined;
  };
  const getBool = id => getVal(id) === 'true';

  const cfg = { ...state.config.parsed };

  cfg.party_name = getVal('cfg-party_name');
  cfg.party_is_public = getBool('cfg-party_is_public');
  cfg.password = getVal('cfg-password');
  cfg.public_ipv4_address = getVal('cfg-public_ipv4_address') || null;
  cfg.stats_url = getVal('cfg-stats_url') || null;

  cfg.session_type = getVal('cfg-session_type');
  cfg.session_max_players_override = getNum('cfg-session_max_players_override');
  cfg.playlist_code = getNum('cfg-playlist_code');
  cfg.playlist_shuffle = getBool('cfg-playlist_shuffle');
  cfg.teams_series_length = getNum('cfg-teams_series_length') || 7;
  cfg.ffa_series_length = getNum('cfg-ffa_series_length') || 24;
  cfg.auto_balance_teams = getBool('cfg-auto_balance_teams');
  cfg.allow_punch_grab = getBool('cfg-allow_punch_grab');
  cfg.coop_campaign = getVal('cfg-coop_campaign');
  cfg.coop_level = getVal('cfg-coop_level');

  cfg.port = getNum('cfg-port') || 43210;
  cfg.max_party_size = getNum('cfg-max_party_size') || 6;
  cfg.protocol_version = getNum('cfg-protocol_version') || 38;
  cfg.authenticate_clients = getBool('cfg-authenticate_clients');
  const adminsRaw = getVal('cfg-admins');
  cfg.admins = adminsRaw ? adminsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
  cfg.enable_queue = getBool('cfg-enable_queue');
  cfg.enable_default_kick_voting = getBool('cfg-enable_default_kick_voting');

  cfg.clean_exit_minutes = getNum('cfg-clean_exit_minutes') || 60;
  cfg.idle_exit_minutes = getNum('cfg-idle_exit_minutes') || 20;
  cfg.unclean_exit_minutes = getNum('cfg-unclean_exit_minutes') || 90;
  cfg.dont_write_bytecode = getBool('cfg-dont_write_bytecode');

  return cfg;
}

export function setConfigViewMode(mode) {
  state.viewMode = mode;
  const btnForm = document.getElementById('btn-mode-form');
  const btnRaw = document.getElementById('btn-mode-raw');
  const viewForm = document.getElementById('config-form-view');
  const viewRaw = document.getElementById('config-raw-view');

  if (mode === 'form') {
    btnForm.classList.add('active');
    btnRaw.classList.remove('active');
    viewForm.style.display = 'grid';
    viewRaw.style.display = 'none';
  } else {
    btnRaw.classList.add('active');
    btnForm.classList.remove('active');
    viewForm.style.display = 'none';
    viewRaw.style.display = 'block';

    const currentCfg = gatherConfigFromForm();
    syncFormToRawEditor(currentCfg);
  }
}

export function syncFormToRawEditor(cfg) {
  const rawEditor = document.getElementById('raw-config-editor');
  if (!rawEditor) return;

  const lines = [
    '# BombStation Studio — config.toml',
    '',
    `party_name = "${cfg.party_name || 'BombSquad Server'}"`,
    `party_is_public = ${Boolean(cfg.party_is_public)}`,
    `port = ${cfg.port || 43210}`,
    `max_party_size = ${cfg.max_party_size || 6}`,
    `session_type = "${cfg.session_type || 'ffa'}"`,
    `session_max_players_override = ${cfg.session_max_players_override || 8}`,
    `auto_balance_teams = ${Boolean(cfg.auto_balance_teams)}`,
    `teams_series_length = ${cfg.teams_series_length || 7}`,
    `ffa_series_length = ${cfg.ffa_series_length || 24}`,
    `authenticate_clients = ${Boolean(cfg.authenticate_clients)}`,
    `admins = ${JSON.stringify(cfg.admins || [])}`,
  ];
  rawEditor.value = lines.join('\n');
}

export function applyConfigPreset(preset) {
  if (preset === 'default_ffa') {
    document.getElementById('cfg-party_name').value = 'BombSquad Classic FFA';
    document.getElementById('cfg-session_type').value = 'ffa';
    document.getElementById('cfg-session_max_players_override').value = 8;
    document.getElementById('cfg-port').value = 43210;
    showToast('Applied Classic FFA preset');
  } else if (preset === 'max_players') {
    document.getElementById('cfg-party_name').value = '999 Mega Brawl Arena';
    document.getElementById('cfg-session_max_players_override').value = 999;
    document.getElementById('cfg-max_party_size').value = 32;
    showToast('Applied 999 High-Capacity preset');
  } else if (preset === 'tourney') {
    document.getElementById('cfg-party_name').value = 'Tournament Match';
    document.getElementById('cfg-party_is_public').value = 'false';
    document.getElementById('cfg-session_type').value = 'teams';
    document.getElementById('cfg-teams_series_length').value = 9;
    document.getElementById('cfg-allow_punch_grab').value = 'true';
    showToast('Applied LAN Tournament preset');
  }
}

export async function saveConfigFile() {
  const targetPath = state.config.path || document.getElementById('input-config-path').value.trim();
  let payload = {};

  if (state.viewMode === 'raw') {
    const rawContent = document.getElementById('raw-config-editor').value;
    payload = { path: targetPath, raw: rawContent };
  } else {
    const cfg = gatherConfigFromForm();
    payload = { path: targetPath, config: cfg };
  }

  showToast('Saving server config.toml...');
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      showToast('Config saved and applied.');
      await loadConfigFile(targetPath);
    } else {
      showToast(`Save failed: ${data.error}`);
    }
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}
