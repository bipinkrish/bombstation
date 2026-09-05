import React, { useState, useEffect } from 'react';
import {
  Puzzle,
  FolderOpen,
  Download,
  Check,
  Trash2,
  Code2,
  RefreshCw,
  Search,
  Box,
  FileCode2,
} from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'installed' | 'available'>('all');

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
    showToast('Revealed mods folder in Finder');
  };

  const filteredPlugins = data.plugins.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.filename.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterMode === 'installed') return p.is_installed;
    if (filterMode === 'available') return !p.is_installed;
    return true;
  });

  const installedCount = data.plugins.filter((p) => p.is_installed).length;

  return (
    <div className="plugins-studio-container">
      {/* Top Header Card */}
      <div className="macos-card plugins-header-card">
        <div className="plugins-intro">
          <div className="plugins-badge-row">
            <span className="macos-badge purple">
              <Puzzle size={11} /> Mod Catalog
            </span>
            <span className="target-folder-badge" title={modsPath}>
              {modsPath.split('/').slice(-2).join('/') || 'mods'}
            </span>
          </div>
          <h2 className="plugins-title">Plugins &amp; Mod Management</h2>
          <p className="plugins-desc">
            Install curated Ballistica API 9 plugins or inspect custom mods active in your BombSquad directory.
          </p>
        </div>

        <div className="plugins-actions-row">
          <div className="plugins-search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              className="plugins-search-input"
              placeholder="Search plugins, mods, APIs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="segmented-control mini">
            <button
              className={`segmented-tab ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              All ({data.plugins.length})
            </button>
            <button
              className={`segmented-tab ${filterMode === 'installed' ? 'active' : ''}`}
              onClick={() => setFilterMode('installed')}
            >
              Installed ({installedCount})
            </button>
          </div>

          <button
            className="macos-secondary-btn"
            onClick={handleOpenFolder}
            title="Reveal in Finder"
          >
            <FolderOpen size={13} />
            <span>Finder</span>
          </button>

          <button
            className="macos-btn macos-btn-primary"
            onClick={handleInstallAll}
            title="Install all repository mods"
          >
            <Download size={13} />
            <span>Install All</span>
          </button>
        </div>
      </div>

      {/* Grid: Curated Catalog & Active Mods */}
      <div className="plugins-columns-layout">
        {/* Curated Plugins */}
        <div className="macos-card plugins-section-card">
          <div className="card-header-bar">
            <div className="card-title-group">
              <Puzzle size={15} className="card-icon" />
              <h3 className="card-title">Curated Plugins</h3>
            </div>
            <span className="card-counter-pill">{filteredPlugins.length} available</span>
          </div>

          <div className="plugin-cards-list custom-scroll">
            {filteredPlugins.map((p) => (
              <div key={p.filename} className="macos-plugin-item">
                <div className="plugin-icon-avatar">
                  <Box size={18} />
                </div>
                <div className="plugin-meta-info">
                  <div className="plugin-headline">
                    <h4 className="plugin-name">{p.name}</h4>
                    <span className="api-chip">API {p.api_target}</span>
                  </div>
                  <p className="plugin-description">{p.description}</p>
                  <span className="plugin-filename-tag mono-text">{p.filename}</span>
                </div>

                <div className="plugin-item-actions">
                  {p.is_installed ? (
                    <>
                      <span className="installed-indicator">
                        <Check size={12} /> Active
                      </span>
                      <button
                        className="macos-action-chip danger"
                        onClick={() => handleUninstall(p.filename)}
                        title="Uninstall from active mods"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  ) : (
                    <button
                      className="macos-btn macos-btn-primary mini-btn"
                      onClick={() => handleInstall(p.filename)}
                      title="Install into mods folder"
                    >
                      <Download size={12} />
                      <span>Install</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Target Directory Active Mods */}
        <div className="macos-card plugins-section-card">
          <div className="card-header-bar">
            <div className="card-title-group">
              <FileCode2 size={15} className="card-icon" />
              <h3 className="card-title">Target Directory Mods</h3>
            </div>
            <button
              className="macos-icon-btn"
              onClick={loadPlugins}
              title="Refresh directory scan"
              aria-label="Refresh"
            >
              <RefreshCw size={13} />
            </button>
          </div>

          <div className="plugin-cards-list custom-scroll">
            {/* Installed repository plugins */}
            {data.plugins
              .filter((p) => p.is_installed)
              .map((p) => (
                <div key={p.filename} className="macos-plugin-item installed-row">
                  <div className="plugin-icon-avatar active">
                    <Check size={16} />
                  </div>
                  <div className="plugin-meta-info">
                    <h4 className="plugin-name">{p.name}</h4>
                    <p className="plugin-description mono-text">{p.filename}</p>
                  </div>
                  <div className="plugin-item-actions">
                    <button
                      className="macos-action-chip"
                      onClick={() => onEditPluginInCodeStudio(p.filename)}
                      title="Open and edit in Code Studio"
                    >
                      <Code2 size={12} />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              ))}

            {/* Custom mods created by user */}
            {data.custom_plugins.map((c) => (
              <div key={c.path} className="macos-plugin-item custom-mod-row">
                <div className="plugin-icon-avatar custom">
                  <FileCode2 size={16} />
                </div>
                <div className="plugin-meta-info">
                  <h4 className="plugin-name">{c.name}</h4>
                  <p className="plugin-description">
                    {(c.size / 1024).toFixed(1)} KB • Modified{' '}
                    {new Date(c.modified * 1000).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="plugin-item-actions">
                  <button
                    className="macos-action-chip"
                    onClick={() => onEditPluginInCodeStudio(c.name)}
                    title="Open in Code Studio"
                  >
                    <Code2 size={12} />
                    <span>Edit</span>
                  </button>
                  <button
                    className="macos-action-chip danger"
                    onClick={() => handleUninstall(c.name)}
                    title="Delete custom mod"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}

            {data.plugins.filter((p) => p.is_installed).length === 0 &&
              data.custom_plugins.length === 0 && (
                <div className="empty-plugins-state">
                  <Puzzle size={28} className="empty-icon" />
                  <p>No mods detected in target directory.</p>
                  <span>Install curated plugins or add custom Python scripts to your mods folder.</span>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};
