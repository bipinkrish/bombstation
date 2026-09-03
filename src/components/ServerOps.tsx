import React, { useState, useEffect, useRef } from 'react';
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
  const [presets, setPresets] = useState<PresetsData>({ executables: [], plugin_targets: [], configs: [] });
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
      showToast('Revealed mods folder in file manager');
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
    <div className="server-layout">
      <div className="panel-card server-paths-card">
        <div className="panel-header">
          <h3>Launch Executables &amp; Paths</h3>
          <span className="badge-subtle">Ready</span>
        </div>
        <div className="paths-grid">
          <div className="path-field">
            <label>Server Executable</label>
            <div className="input-browse-group">
              <input
                type="text"
                className="form-input mono"
                value={executable}
                onChange={(e) => setExecutable(e.target.value)}
                placeholder="/path/to/bombsquad_server"
              />
              <button className="btn btn-secondary" onClick={() => handleBrowse('executable')}>
                Browse
              </button>
            </div>
            <div className="preset-chips-strip">
              {presets.executables.map((exe) => (
                <button
                  key={exe.path}
                  className="preset-chip"
                  onClick={() => {
                    setExecutable(exe.path);
                    showToast(`Selected: ${exe.name}`);
                  }}
                >
                  {exe.name}
                </button>
              ))}
            </div>
          </div>

          <div className="path-field">
            <label>Active Mods Folder</label>
            <div className="input-browse-group">
              <input
                type="text"
                className="form-input mono"
                value={modsPath}
                onChange={(e) => setModsPath(e.target.value)}
                placeholder="~/Library/Application Support/BombSquad/mods"
              />
              <button className="btn btn-secondary" onClick={() => handleBrowse('plugins')}>
                Browse
              </button>
              <button className="btn btn-ghost" onClick={handleOpenFinder}>
                Folder
              </button>
            </div>
            <div className="preset-chips-strip">
              {presets.plugin_targets.map((pt) => (
                <button
                  key={pt.path}
                  className="preset-chip"
                  onClick={() => {
                    setModsPath(pt.path);
                    showToast(`Selected: ${pt.name}`);
                  }}
                >
                  {pt.name}
                </button>
              ))}
            </div>
          </div>

          <div className="path-field">
            <label>Server config.toml</label>
            <div className="input-browse-group">
              <input
                type="text"
                className="form-input mono"
                value={configPath}
                onChange={(e) => setConfigPath(e.target.value)}
                placeholder="/path/to/config.toml"
              />
              <button className="btn btn-secondary" onClick={() => handleBrowse('config')}>
                Browse
              </button>
            </div>
            <div className="preset-chips-strip">
              {presets.configs.map((cfg) => (
                <button
                  key={cfg.path}
                  className="preset-chip"
                  onClick={() => {
                    setConfigPath(cfg.path);
                    showToast(`Selected: ${cfg.name}`);
                  }}
                >
                  {cfg.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Terminal & REPL */}
      <div className="panel-card terminal-card">
        <div className="terminal-header">
          <div className="term-title-wrap">
            <span className="term-dot live" />
            <span className="term-title">Console Output</span>
            <span className="term-counter">{totalLogs} events</span>
          </div>
          <div className="term-actions">
            <input
              type="text"
              className="term-search"
              placeholder="Filter..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
            <label className="term-toggle">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
              <span>Auto-scroll</span>
            </label>
            <button className="btn btn-xs btn-ghost" onClick={onClearLogs}>
              Clear
            </button>
          </div>
        </div>

        <div className="terminal-body">
          {filteredLogs.length === 0 ? (
            <div className="term-line dim">
              BombStation Studio console ready. Select executable and click Start Server.
            </div>
          ) : (
            filteredLogs.map((item) => (
              <div key={item.id} className={`term-line ${item.severity}`}>
                [{item.timestamp}] {item.text}
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>

        <div className="terminal-stdin">
          <span className="stdin-prompt">&gt;</span>
          <input
            type="text"
            className="stdin-input"
            placeholder="Execute Python / Ballistica REPL command — Press Enter"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendCommand()}
          />
          <button className="btn btn-secondary btn-sm" onClick={handleSendCommand}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
