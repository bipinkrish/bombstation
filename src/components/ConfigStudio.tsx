import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface ConfigStudioProps {
  configPath: string;
  showToast: (msg: string) => void;
}

export const ConfigStudio: React.FC<ConfigStudioProps> = ({ configPath, showToast }) => {
  const [viewMode, setViewMode] = useState<'form' | 'raw'>('form');
  const [configData, setConfigData] = useState<any>({});
  const [rawText, setRawText] = useState('');

  useEffect(() => {
    loadConfig();
  }, [configPath]);

  const loadConfig = async () => {
    try {
      const res = await api.getConfig(configPath);
      setConfigData(res.config || {});
      setRawText(res.raw || '');
    } catch (err: any) {
      console.error('Failed to load config:', err);
    }
  };

  const updateField = (key: string, val: any) => {
    setConfigData((prev: any) => ({ ...prev, [key]: val }));
  };

  const applyPreset = (preset: 'default_ffa' | 'max_players' | 'tourney') => {
    if (preset === 'default_ffa') {
      updateField('party_name', 'BombSquad Classic FFA');
      updateField('session_type', 'ffa');
      updateField('session_max_players_override', 8);
      updateField('port', 43210);
      showToast('Applied Classic FFA preset');
    } else if (preset === 'max_players') {
      updateField('party_name', '999 Mega Brawl Arena');
      updateField('session_max_players_override', 999);
      updateField('max_party_size', 32);
      showToast('Applied 999 High-Capacity preset');
    } else if (preset === 'tourney') {
      updateField('party_name', 'Tournament Match');
      updateField('party_is_public', false);
      updateField('session_type', 'teams');
      updateField('teams_series_length', 9);
      updateField('allow_punch_grab', true);
      showToast('Applied LAN Tournament preset');
    }
  };

  const handleSave = async () => {
    showToast('Saving server config.toml...');
    try {
      const payload = viewMode === 'raw' ? { path: configPath, raw: rawText } : { path: configPath, config: configData };
      const res = await api.saveConfig(payload);
      if (res.success) {
        showToast('Config saved successfully.');
        loadConfig();
      } else {
        showToast(`Save failed: ${res.error}`);
      }
    } catch (err: any) {
      showToast(`Error saving config: ${err.message}`);
    }
  };

  return (
    <div className="config-layout">
      <div className="config-top-bar">
        <div className="config-title-group">
          <h2>Server Configuration</h2>
          <span className="badge-subtle">config.toml</span>
        </div>
        <div className="config-controls">
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'form' ? 'active' : ''}`}
              onClick={() => setViewMode('form')}
            >
              Visual Form
            </button>
            <button
              className={`toggle-btn ${viewMode === 'raw' ? 'active' : ''}`}
              onClick={() => setViewMode('raw')}
            >
              Raw TOML
            </button>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => applyPreset('default_ffa')}>
            Default FFA
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => applyPreset('max_players')}>
            999 Players
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => applyPreset('tourney')}>
            LAN Tourney
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSave}>
            Save Config
          </button>
        </div>
      </div>

      {viewMode === 'form' ? (
        <div className="config-form-container">
          <div className="cfg-card">
            <div className="cfg-card-header">
              <h4>General Identity</h4>
            </div>
            <div className="cfg-fields-grid">
              <div className="cfg-field">
                <label>Party Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={configData.party_name || ''}
                  onChange={(e) => updateField('party_name', e.target.value)}
                />
              </div>
              <div className="cfg-field">
                <label>Public Visibility</label>
                <select
                  className="form-control"
                  value={String(configData.party_is_public ?? true)}
                  onChange={(e) => updateField('party_is_public', e.target.value === 'true')}
                >
                  <option value="true">Public</option>
                  <option value="false">Private / LAN</option>
                </select>
              </div>
              <div className="cfg-field">
                <label>Join Password</label>
                <input
                  type="text"
                  className="form-control"
                  value={configData.password || ''}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="Leave blank for public"
                />
              </div>
              <div className="cfg-field">
                <label>Public IPv4 Address</label>
                <input
                  type="text"
                  className="form-control mono"
                  value={configData.public_ipv4_address || ''}
                  onChange={(e) => updateField('public_ipv4_address', e.target.value)}
                  placeholder="Auto-detect"
                />
              </div>
              <div className="cfg-field full-width">
                <label>Stats URL</label>
                <input
                  type="text"
                  className="form-control"
                  value={configData.stats_url || ''}
                  onChange={(e) => updateField('stats_url', e.target.value)}
                  placeholder="https://stats.mysite.com"
                />
              </div>
            </div>
          </div>

          <div className="cfg-card">
            <div className="cfg-card-header">
              <h4>Rules &amp; Gameplay</h4>
            </div>
            <div className="cfg-fields-grid">
              <div className="cfg-field">
                <label>Session Type</label>
                <select
                  className="form-control"
                  value={configData.session_type || 'ffa'}
                  onChange={(e) => updateField('session_type', e.target.value)}
                >
                  <option value="ffa">Free-For-All</option>
                  <option value="teams">Teams</option>
                  <option value="coop">Co-op</option>
                </select>
              </div>
              <div className="cfg-field">
                <label>Player Limit Override</label>
                <input
                  type="number"
                  className="form-control"
                  value={configData.session_max_players_override ?? 8}
                  onChange={(e) => updateField('session_max_players_override', Number(e.target.value))}
                />
              </div>
              <div className="cfg-field">
                <label>Teams Series Length</label>
                <input
                  type="number"
                  className="form-control"
                  value={configData.teams_series_length ?? 7}
                  onChange={(e) => updateField('teams_series_length', Number(e.target.value))}
                />
              </div>
              <div className="cfg-field">
                <label>FFA Series Length</label>
                <input
                  type="number"
                  className="form-control"
                  value={configData.ffa_series_length ?? 24}
                  onChange={(e) => updateField('ffa_series_length', Number(e.target.value))}
                />
              </div>
              <div className="cfg-field">
                <label>Auto-Balance Teams</label>
                <select
                  className="form-control"
                  value={String(configData.auto_balance_teams ?? true)}
                  onChange={(e) => updateField('auto_balance_teams', e.target.value === 'true')}
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
              <div className="cfg-field">
                <label>Allow Punch / Grab</label>
                <select
                  className="form-control"
                  value={String(configData.allow_punch_grab ?? true)}
                  onChange={(e) => updateField('allow_punch_grab', e.target.value === 'true')}
                >
                  <option value="true">Allowed</option>
                  <option value="false">Disallowed</option>
                </select>
              </div>
            </div>
          </div>

          <div className="cfg-card">
            <div className="cfg-card-header">
              <h4>Network &amp; Limits</h4>
            </div>
            <div className="cfg-fields-grid">
              <div className="cfg-field">
                <label>UDP Port</label>
                <input
                  type="number"
                  className="form-control mono"
                  value={configData.port ?? 43210}
                  onChange={(e) => updateField('port', Number(e.target.value))}
                />
              </div>
              <div className="cfg-field">
                <label>Max Party Size</label>
                <input
                  type="number"
                  className="form-control"
                  value={configData.max_party_size ?? 6}
                  onChange={(e) => updateField('max_party_size', Number(e.target.value))}
                />
              </div>
              <div className="cfg-field">
                <label>Protocol Version</label>
                <input
                  type="number"
                  className="form-control"
                  value={configData.protocol_version ?? 38}
                  onChange={(e) => updateField('protocol_version', Number(e.target.value))}
                />
              </div>
              <div className="cfg-field">
                <label>Authenticate Clients</label>
                <select
                  className="form-control"
                  value={String(configData.authenticate_clients ?? true)}
                  onChange={(e) => updateField('authenticate_clients', e.target.value === 'true')}
                >
                  <option value="true">Require Accounts</option>
                  <option value="false">Allow Anonymous</option>
                </select>
              </div>
            </div>
          </div>

          <div className="cfg-card">
            <div className="cfg-card-header">
              <h4>Process Lifetime</h4>
            </div>
            <div className="cfg-fields-grid">
              <div className="cfg-field">
                <label>Clean Exit Minutes</label>
                <input
                  type="number"
                  className="form-control"
                  value={configData.clean_exit_minutes ?? 60}
                  onChange={(e) => updateField('clean_exit_minutes', Number(e.target.value))}
                />
              </div>
              <div className="cfg-field">
                <label>Idle Exit Minutes</label>
                <input
                  type="number"
                  className="form-control"
                  value={configData.idle_exit_minutes ?? 20}
                  onChange={(e) => updateField('idle_exit_minutes', Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '0 4px' }}>
          <textarea
            className="raw-toml-input mono"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            spellCheck={false}
          />
        </div>
      )}
    </div>
  );
};
