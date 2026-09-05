import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sliders,
  Save,
  Trophy,
  Users,
  Swords,
  Network,
  Clock,
  Shield,
} from 'lucide-react';
import { api } from '../services/api';

interface ConfigStudioProps {
  configPath: string;
  showToast: (msg: string) => void;
}

export const ConfigStudio: React.FC<ConfigStudioProps> = ({ configPath, showToast }) => {
  const [viewMode, setViewMode] = useState<'form' | 'raw'>('form');
  const [configData, setConfigData] = useState<any>({});
  const [rawText, setRawText] = useState('');
  const [activePreset, setActivePreset] = useState<string | null>(null);

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
    setActivePreset(preset);
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
      const payload =
        viewMode === 'raw'
          ? { path: configPath, raw: rawText }
          : { path: configPath, config: configData };
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
    <div className="config-studio-container">
      {/* Top Controls Bar */}
      <div className="macos-card config-top-bar">
        <div className="config-headline-wrap">
          <div className="segmented-control">
            <button
              className={`segmented-tab ${viewMode === 'form' ? 'active' : ''}`}
              onClick={() => setViewMode('form')}
            >
              <Sliders size={13} />
              <span>Visual Editor</span>
            </button>
            <button
              className={`segmented-tab ${viewMode === 'raw' ? 'active' : ''}`}
              onClick={() => setViewMode('raw')}
            >
              <FileText size={13} />
              <span>Raw TOML</span>
            </button>
          </div>
          <span className="file-target-tag">{configPath.split('/').pop() || 'config.toml'}</span>
        </div>

        <div className="config-actions-bar">
          <div className="preset-quick-group">
            <button
              className={`preset-btn ${activePreset === 'default_ffa' ? 'active' : ''}`}
              onClick={() => applyPreset('default_ffa')}
            >
              <Users size={12} />
              <span>Classic FFA</span>
            </button>
            <button
              className={`preset-btn ${activePreset === 'max_players' ? 'active' : ''}`}
              onClick={() => applyPreset('max_players')}
            >
              <Trophy size={12} />
              <span>999 Brawl</span>
            </button>
            <button
              className={`preset-btn ${activePreset === 'tourney' ? 'active' : ''}`}
              onClick={() => applyPreset('tourney')}
            >
              <Shield size={12} />
              <span>LAN Tourney</span>
            </button>
          </div>

          <button className="macos-btn macos-btn-primary" onClick={handleSave}>
            <Save size={13} />
            <span>Save Config</span>
          </button>
        </div>
      </div>

      {viewMode === 'form' ? (
        <div className="config-grid-layout">
          {/* Card 1: Identity */}
          <div className="macos-card cfg-card">
            <div className="card-header-bar">
              <div className="card-title-group">
                <Users size={14} className="card-icon" />
                <h4 className="card-title">Server Identity</h4>
              </div>
            </div>
            <div className="cfg-inputs-grid">
              <div className="macos-form-field">
                <label>Party Display Name</label>
                <input
                  type="text"
                  className="macos-input"
                  value={configData.party_name || ''}
                  onChange={(e) => updateField('party_name', e.target.value)}
                  placeholder="BombSquad Server"
                />
              </div>
              <div className="macos-form-field">
                <label>Visibility</label>
                <select
                  className="macos-select"
                  value={String(configData.party_is_public ?? true)}
                  onChange={(e) => updateField('party_is_public', e.target.value === 'true')}
                >
                  <option value="true">Public (Server List)</option>
                  <option value="false">Private (LAN / Direct IP)</option>
                </select>
              </div>
              <div className="macos-form-field">
                <label>Join Password</label>
                <input
                  type="text"
                  className="macos-input"
                  value={configData.password || ''}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="Optional password"
                />
              </div>
              <div className="macos-form-field">
                <label>Public IPv4 Override</label>
                <input
                  type="text"
                  className="macos-input mono-text"
                  value={configData.public_ipv4_address || ''}
                  onChange={(e) => updateField('public_ipv4_address', e.target.value)}
                  placeholder="Auto-detect"
                />
              </div>
              <div className="macos-form-field full-width">
                <label>Stats URL</label>
                <input
                  type="text"
                  className="macos-input"
                  value={configData.stats_url || ''}
                  onChange={(e) => updateField('stats_url', e.target.value)}
                  placeholder="https://stats.mysite.com"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Gameplay Rules */}
          <div className="macos-card cfg-card">
            <div className="card-header-bar">
              <div className="card-title-group">
                <Swords size={14} className="card-icon" />
                <h4 className="card-title">Match &amp; Gameplay Rules</h4>
              </div>
            </div>
            <div className="cfg-inputs-grid">
              <div className="macos-form-field">
                <label>Session Type</label>
                <select
                  className="macos-select"
                  value={configData.session_type || 'ffa'}
                  onChange={(e) => updateField('session_type', e.target.value)}
                >
                  <option value="ffa">Free-For-All (FFA)</option>
                  <option value="teams">Teams Brawl</option>
                  <option value="coop">Co-op Survival</option>
                </select>
              </div>
              <div className="macos-form-field">
                <label>Max Players Override</label>
                <input
                  type="number"
                  className="macos-input mono-text"
                  value={configData.session_max_players_override ?? 8}
                  onChange={(e) =>
                    updateField('session_max_players_override', Number(e.target.value))
                  }
                />
              </div>
              <div className="macos-form-field">
                <label>Teams Series Target</label>
                <input
                  type="number"
                  className="macos-input mono-text"
                  value={configData.teams_series_length ?? 7}
                  onChange={(e) => updateField('teams_series_length', Number(e.target.value))}
                />
              </div>
              <div className="macos-form-field">
                <label>FFA Series Target</label>
                <input
                  type="number"
                  className="macos-input mono-text"
                  value={configData.ffa_series_length ?? 24}
                  onChange={(e) => updateField('ffa_series_length', Number(e.target.value))}
                />
              </div>
              <div className="macos-form-field">
                <label>Auto-Balance Teams</label>
                <select
                  className="macos-select"
                  value={String(configData.auto_balance_teams ?? true)}
                  onChange={(e) => updateField('auto_balance_teams', e.target.value === 'true')}
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
              <div className="macos-form-field">
                <label>Combat Mechanics</label>
                <select
                  className="macos-select"
                  value={String(configData.allow_punch_grab ?? true)}
                  onChange={(e) => updateField('allow_punch_grab', e.target.value === 'true')}
                >
                  <option value="true">Punch &amp; Grab Allowed</option>
                  <option value="false">Bombs Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 3: Network & Security */}
          <div className="macos-card cfg-card">
            <div className="card-header-bar">
              <div className="card-title-group">
                <Network size={14} className="card-icon" />
                <h4 className="card-title">Network &amp; Security</h4>
              </div>
            </div>
            <div className="cfg-inputs-grid">
              <div className="macos-form-field">
                <label>UDP Port</label>
                <input
                  type="number"
                  className="macos-input mono-text"
                  value={configData.port ?? 43210}
                  onChange={(e) => updateField('port', Number(e.target.value))}
                />
              </div>
              <div className="macos-form-field">
                <label>Max Party Size</label>
                <input
                  type="number"
                  className="macos-input mono-text"
                  value={configData.max_party_size ?? 6}
                  onChange={(e) => updateField('max_party_size', Number(e.target.value))}
                />
              </div>
              <div className="macos-form-field">
                <label>Protocol Version</label>
                <input
                  type="number"
                  className="macos-input mono-text"
                  value={configData.protocol_version ?? 38}
                  onChange={(e) => updateField('protocol_version', Number(e.target.value))}
                />
              </div>
              <div className="macos-form-field">
                <label>Client Authentication</label>
                <select
                  className="macos-select"
                  value={String(configData.authenticate_clients ?? true)}
                  onChange={(e) => updateField('authenticate_clients', e.target.value === 'true')}
                >
                  <option value="true">Require Verified Accounts</option>
                  <option value="false">Allow Guest Accounts</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 4: Process Lifespan */}
          <div className="macos-card cfg-card">
            <div className="card-header-bar">
              <div className="card-title-group">
                <Clock size={14} className="card-icon" />
                <h4 className="card-title">Process Lifespan &amp; Idle Limits</h4>
              </div>
            </div>
            <div className="cfg-inputs-grid">
              <div className="macos-form-field">
                <label>Clean Exit (Minutes)</label>
                <input
                  type="number"
                  className="macos-input mono-text"
                  value={configData.clean_exit_minutes ?? 60}
                  onChange={(e) => updateField('clean_exit_minutes', Number(e.target.value))}
                />
              </div>
              <div className="macos-form-field">
                <label>Idle Exit (Minutes)</label>
                <input
                  type="number"
                  className="macos-input mono-text"
                  value={configData.idle_exit_minutes ?? 20}
                  onChange={(e) => updateField('idle_exit_minutes', Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="macos-card raw-editor-card">
          <textarea
            className="raw-toml-textarea mono-text custom-scroll"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="# config.toml content..."
            spellCheck={false}
          />
        </div>
      )}
    </div>
  );
};
