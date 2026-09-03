import React from 'react';
import { Terminal, Sliders, Puzzle, Code2, Box, Cpu } from 'lucide-react';

export type TabId = 'server' | 'config' | 'plugins' | 'code' | 'scene' | 'mcp';

interface NavigationRailProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  serverRunning: boolean;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  activeTab,
  onTabChange,
  serverRunning,
}) => {
  const tabs = [
    { id: 'server' as TabId, label: 'Server', icon: Terminal, title: 'Server Operations' },
    { id: 'config' as TabId, label: 'Config', icon: Sliders, title: 'Server Config (config.toml)' },
    { id: 'plugins' as TabId, label: 'Mods', icon: Puzzle, title: 'Plugins & Mods' },
    { id: 'code' as TabId, label: 'Code', icon: Code2, title: 'Code Studio (Monaco Editor)' },
    { id: 'scene' as TabId, label: '3D Scene', icon: Box, title: '3D Arena & Assets (.bob/.cob)' },
    { id: 'mcp' as TabId, label: 'AI Hub', icon: Cpu, title: 'Ballistica MCP Hub' },
  ];

  return (
    <aside className="app-rail">
      <div className="rail-top">
        <div className="studio-logo" title="BombStation Studio">
          <span className="logo-emoji">💣</span>
        </div>
      </div>

      <nav className="rail-nav">
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <React.Fragment key={tab.id}>
              {idx === 3 && <div className="rail-divider" />}
              <button
                className={`rail-btn ${isActive ? 'active' : ''}`}
                onClick={() => onTabChange(tab.id)}
                title={tab.title}
              >
                <Icon size={18} />
                <span className="rail-label">{tab.label}</span>
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      <div className="rail-bottom">
        <div
          className={`status-indicator-dot ${serverRunning ? 'online' : ''}`}
          title={serverRunning ? 'Server Running' : 'Server Offline'}
        />
        <span className="api-tag">API 9</span>
      </div>
    </aside>
  );
};
