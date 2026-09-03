import React, { useState, useEffect } from 'react';
import { api, PluginsResponse } from '../services/api';

interface PluginsManagerProps {
  modsPath: string;
  onEditPluginInCodeStudio: (filename: string) => void;
  showToast: (msg: string) => void;
}

export const PluginsManager: React.FC<PluginsManagerProps> = ({
  modsPath,
  onEditPluginInCodeStudio,
  showToast,
}) => {
  const [data, setData] = useState<PluginsResponse>({
    target_directory: modsPath,
    plugins: [],
    custom_plugins: [],
  });

  useEffect(() => {
    loadPlugins();
  }, [modsPath]);

  const loadPlugins = async () => {
    try {
      const res = await api.getPlugins(modsPath);
      setData(res);
    } catch (err) {
      console.error('Failed to load plugins:', err);
    }
  };

  const handleInstall = async (filename: string) => {
    showToast(`Installing ${filename}...`);
    try {
      const res = await api.installPlugin(filename, modsPath);
      if (res.success) {
        showToast(`Installed: ${filename}`);
        loadPlugins();
      } else {
        showToast(`Install failed: ${res.error}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleUninstall = async (filename: string) => {
    showToast(`Uninstalling ${filename}...`);
    try {
      const res = await api.uninstallPlugin(filename, modsPath);
      if (res.success) {
        showToast(`Uninstalled: ${filename}`);
        loadPlugins();
      } else {
        showToast(`Uninstall failed: ${res.error}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleInstallAll = async () => {
    showToast('Installing all repository plugins...');
    try {
      const res = await api.installPlugin('', modsPath, true);
      if (res.success) {
        showToast('All plugins installed.');
        loadPlugins();
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleOpenFolder = async () => {
    await api.openFolder(modsPath);
    showToast('Revealed mods folder in file manager');
  };

  return (
    <div className="plugins-layout">
      <div className="plugins-top-bar">
        <div>
          <h2>Plugins &amp; Mod Management</h2>
          <p className="section-desc">Manage verified repository plugins and user mods in target folder.</p>
        </div>
        <div className="plugins-top-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleOpenFolder}>
            Folder
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleInstallAll}>
            Install All
          </button>
        </div>
      </div>

      <div className="plugins-columns-grid">
        <div className="panel-card">
          <div className="panel-header">
            <h3>Repository Plugins</h3>
          </div>
          <div className="plugins-list">
            {data.plugins.map((p) => (
              <div key={p.filename} className="plugin-card">
                <div className="plugin-info">
                  <h4>{p.name}</h4>
                  <p>{p.description}</p>
                  <div className="plugin-meta">
                    <span className="badge-subtle">API {p.api_target}</span>
                    <span className="badge-subtle">{p.filename}</span>
                  </div>
                </div>
                <div className="plugin-action">
                  {p.is_installed ? (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleUninstall(p.filename)}
                    >
                      Uninstall
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleInstall(p.filename)}
                    >
                      Install
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-header">
            <h3>Installed Mods in Target Directory</h3>
            <button className="btn btn-xs btn-ghost" onClick={loadPlugins}>
              Refresh
            </button>
          </div>
          <div className="plugins-list">
            {data.plugins
              .filter((p) => p.is_installed)
              .map((p) => (
                <div key={p.filename} className="plugin-card">
                  <div className="plugin-info">
                    <h4>{p.name}</h4>
                    <p>{p.filename} • Active in mods</p>
                  </div>
                  <div className="plugin-action">
                    <button
                      className="btn btn-secondary btn-xs"
                      onClick={() => onEditPluginInCodeStudio(p.filename)}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}

            {data.custom_plugins.map((c) => (
              <div key={c.path} className="plugin-card">
                <div className="plugin-info">
                  <h4>{c.name}</h4>
                  <p>
                    {(c.size / 1024).toFixed(1)} KB • Modified{' '}
                    {new Date(c.modified * 1000).toLocaleTimeString()}
                  </p>
                </div>
                <div className="plugin-action">
                  <button
                    className="btn btn-secondary btn-xs"
                    onClick={() => onEditPluginInCodeStudio(c.name)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => handleUninstall(c.name)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {data.plugins.filter((p) => p.is_installed).length === 0 &&
              data.custom_plugins.length === 0 && (
                <p className="dim" style={{ padding: '10px' }}>
                  No mods detected in target directory.
                </p>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};
