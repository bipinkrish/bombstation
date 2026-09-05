import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  FolderOpen,
  Search,
  Trash2,
  Terminal,
  CornerDownLeft,
  Settings2,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { api, PresetsData, LogEntry } from '../services/api';

interface ServerOpsProps {
  executable: string;
  setExecutable: (val: string) => void;
  modsPath: string;
  setModsPath: (val: string) => void;
  configPath: string;
  setConfigPath: (val: string) => void;
  logs: LogEntry[];
  totalLogs: number;
  onClearLogs: () => void;
  showToast: (msg: string) => void;
}

export const ServerOps: React.FC<ServerOpsProps> = ({
  executable,
  setExecutable,
  modsPath,
  setModsPath,
  configPath,
  setConfigPath,
  logs,
  totalLogs,
  onClearLogs,
  showToast,
}) => {
  const [presets, setPresets] = useState<PresetsData>({
    executables: [],
    plugin_targets: [],
    configs: [],
  });
  const [filterText, setFilterText] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [commandInput, setCommandInput] = useState('');
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getPresets().then(setPresets).catch(console.error);
  }, []);

  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleBrowse = async (type: 'executable' | 'plugins' | 'config') => {
    const titles = {
      executable: 'Select Server Executable',
      plugins: 'Select Mods Directory',
      config: 'Select config.toml File',
    };
    const browseType = type === 'plugins' ? 'directory' : 'file';
    showToast('Opening native file picker...');
    const chosen = await api.browsePath(browseType, titles[type]);
    if (chosen) {
      if (type === 'executable') setExecutable(chosen);
      if (type === 'plugins') setModsPath(chosen);
      if (type === 'config') setConfigPath(chosen);
      showToast(`Updated ${type} path`);
    }
  };

  const handleOpenFinder = async () => {
    if (modsPath) {
      await api.openFolder(modsPath);
      showToast('Revealed mods folder in Finder');
    }
  };

  const handleSendCommand = async () => {
    const cmd = commandInput.trim();
    if (!cmd) return;
    setCommandInput('');
    try {
      const res = await api.sendCommand(cmd);
      if (res.success) {
        showToast(`Sent: ${cmd}`);
      } else {
        showToast(`Command error: ${res.message}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const filteredLogs = logs.filter(
    (l) => !filterText || l.text.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="server-ops-container">
      {/* Top Configuration & Paths Section */}
      <section className="macos-card paths-section">
        <div className="card-header-bar">
          <div className="card-title-group">
            <Settings2 size={15} className="card-icon" />
            <h3 className="card-title">Environment &amp; Executables</h3>
          </div>
          <span className="macos-badge success">
            <CheckCircle2 size={11} /> Configured
          </span>
        </div>

        <div className="paths-grid">
          {/* Server Executable */}
          <div className="path-block">
            <div className="path-label-row">
              <span className="path-label">Server Executable</span>
              <span className="path-sublabel">Ballistica Binary</span>
            </div>
            <div className="macos-input-group">
              <input
                type="text"
                className="macos-input mono-text"
                value={executable}
                onChange={(e) => setExecutable(e.target.value)}
                placeholder="/path/to/bombsquad_server"
                spellCheck={false}
              />
              <button
                className="macos-secondary-btn"
                onClick={() => handleBrowse('executable')}
                title="Browse local file system"
              >
                <Folder size={13} />
                <span>Browse</span>
              </button>
            </div>
            {presets.executables.length > 0 && (
              <div className="preset-pill-strip">
                {presets.executables.map((exe) => (
                  <button
                    key={exe.path}
                    className={`preset-pill ${executable === exe.path ? 'selected' : ''}`}
                    onClick={() => {
                      setExecutable(exe.path);
                      showToast(`Selected: ${exe.name}`);
                    }}
                  >
                    {exe.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active Mods Directory */}
          <div className="path-block">
            <div className="path-label-row">
              <span className="path-label">Active Mods Directory</span>
              <span className="path-sublabel">ba_root/mods</span>
            </div>
            <div className="macos-input-group">
              <input
                type="text"
                className="macos-input mono-text"
                value={modsPath}
                onChange={(e) => setModsPath(e.target.value)}
                placeholder="~/Library/Application Support/BombSquad/mods"
                spellCheck={false}
              />
              <button
                className="macos-secondary-btn"
                onClick={() => handleBrowse('plugins')}
                title="Choose folder"
              >
                <Folder size={13} />
                <span>Browse</span>
              </button>
              <button
                className="macos-icon-btn"
                onClick={handleOpenFinder}
                title="Reveal folder in Finder"
                aria-label="Reveal in Finder"
              >
                <FolderOpen size={14} />
              </button>
            </div>
            {presets.plugin_targets.length > 0 && (
              <div className="preset-pill-strip">
                {presets.plugin_targets.map((pt) => (
                  <button
                    key={pt.path}
                    className={`preset-pill ${modsPath === pt.path ? 'selected' : ''}`}
                    onClick={() => {
                      setModsPath(pt.path);
                      showToast(`Selected: ${pt.name}`);
                    }}
                  >
                    {pt.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Server config.toml */}
          <div className="path-block">
            <div className="path-label-row">
              <span className="path-label">Server Settings</span>
              <span className="path-sublabel">config.toml</span>
            </div>
            <div className="macos-input-group">
              <input
                type="text"
                className="macos-input mono-text"
                value={configPath}
                onChange={(e) => setConfigPath(e.target.value)}
                placeholder="/path/to/config.toml"
                spellCheck={false}
              />
              <button
                className="macos-secondary-btn"
                onClick={() => handleBrowse('config')}
                title="Browse TOML config file"
              >
                <Sliders size={13} />
                <span>Browse</span>
              </button>
            </div>
            {presets.configs.length > 0 && (
              <div className="preset-pill-strip">
                {presets.configs.map((cfg) => (
                  <button
                    key={cfg.path}
                    className={`preset-pill ${configPath === cfg.path ? 'selected' : ''}`}
                    onClick={() => {
                      setConfigPath(cfg.path);
                      showToast(`Selected: ${cfg.name}`);
                    }}
                  >
                    {cfg.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Terminal & Stdin Section (Ghostty / Warp inspired) */}
      <section className="macos-terminal-window">
        <div className="terminal-topbar">
          <div className="terminal-title-group">
            <Terminal size={14} className="term-icon" />
            <span className="term-window-title">Ballistica Console</span>
            <span className="term-event-badge">{totalLogs} events</span>
          </div>

          <div className="terminal-controls">
            <div className="terminal-search-wrapper">
              <Search size={13} className="search-icon" />
              <input
                type="text"
                className="terminal-search-input"
                placeholder="Filter logs..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>

            <label className="terminal-switch-label" title="Toggle automatic scrolling to latest log">
              <input
                type="checkbox"
                className="macos-switch"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
              <span>Auto-scroll</span>
            </label>

            <button
              className="terminal-action-btn"
              onClick={onClearLogs}
              title="Clear terminal buffer"
            >
              <Trash2 size={13} />
              <span>Clear</span>
            </button>
          </div>
        </div>

        <div className="terminal-viewport custom-scroll">
          {filteredLogs.length === 0 ? (
            <div className="terminal-empty-msg">
              <span className="empty-prompt">❯</span> BombStation ready. Configure executable above and click <strong>Start Server</strong>.
            </div>
          ) : (
            filteredLogs.map((item) => (
              <div key={item.id} className={`terminal-entry ${item.severity}`}>
                <span className="log-timestamp">[{item.timestamp}]</span>
                <span className="log-message">{item.text}</span>
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>

        <div className="terminal-repl-bar">
          <span className="repl-prompt-symbol">❯</span>
          <input
            type="text"
            className="repl-input"
            placeholder="Execute Ballistica Python REPL command..."
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendCommand()}
            spellCheck={false}
          />
          <button
            className="repl-send-btn"
            onClick={handleSendCommand}
            disabled={!commandInput.trim()}
          >
            <span>Run</span>
            <CornerDownLeft size={12} />
          </button>
        </div>
      </section>
    </div>
  );
};
