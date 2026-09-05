import React from 'react';
import {
  Terminal,
  Sliders,
  Puzzle,
  Code2,
  Box,
  Cpu,
  PanelLeftClose,
  PanelLeft,
  Activity,
  Zap,
} from 'lucide-react';

export type TabId = 'server' | 'config' | 'plugins' | 'code' | 'scene' | 'mcp';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  serverRunning: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavSection {
  title: string;
  items: {
    id: TabId;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    description: string;
    badge?: string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  serverRunning,
  collapsed,
  onToggleCollapse,
}) => {
  const sections: NavSection[] = [
    {
      title: 'Workspace',
      items: [
        {
          id: 'server',
          label: 'Server Console',
          icon: Terminal,
          description: 'Process control & logs',
          badge: serverRunning ? 'LIVE' : undefined,
        },
        {
          id: 'config',
          label: 'Configuration',
          icon: Sliders,
          description: 'config.toml presets',
        },
        {
          id: 'plugins',
          label: 'Plugins & Mods',
          icon: Puzzle,
          description: 'Manager & catalog',
        },
      ],
    },
    {
      title: 'Studio',
      items: [
        {
          id: 'code',
          label: 'Code Studio',
          icon: Code2,
          description: 'Monaco & AST validator',
        },
        {
          id: 'scene',
          label: '3D Arena',
          icon: Box,
          description: '.bob/.cob scene diorama',
        },
      ],
    },
    {
      title: 'Intelligence',
      items: [
        {
          id: 'mcp',
          label: 'AI & MCP Hub',
          icon: Cpu,
          description: 'Ballistica protocol bridge',
        },
      ],
    },
  ];

  return (
    <aside className={`macos-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Top Window / Traffic-lights area */}
      <div className="sidebar-window-header" data-tauri-drag-region>
        <div className="traffic-lights-spacer" />
        <div className="sidebar-brand">
          <div className="brand-logo-mark" title="BombStation Studio">
            <span className="brand-emoji">💣</span>
          </div>
          {!collapsed && (
            <div className="brand-text">
              <span className="brand-name">BombStation</span>
              <span className="brand-tag">STUDIO</span>
            </div>
          )}
        </div>

        <button
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar (⌘B)' : 'Collapse sidebar (⌘B)'}
          aria-label="Toggle sidebar"
        >
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="sidebar-nav">
        {sections.map((sec, secIdx) => (
          <div key={secIdx} className="nav-section-group">
            {!collapsed && <div className="nav-section-title">{sec.title}</div>}
            <div className="nav-items-list">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => onTabChange(item.id)}
                    title={collapsed ? `${item.label} — ${item.description}` : undefined}
                  >
                    <div className="nav-item-icon-wrapper">
                      <Icon size={17} className="nav-icon" />
                      {item.id === 'server' && serverRunning && (
                        <span className="server-dot-ping" />
                      )}
                    </div>
                    {!collapsed && (
                      <div className="nav-item-content">
                        <span className="nav-item-label">{item.label}</span>
                        {item.badge && (
                          <span className={`nav-item-badge ${item.badge === 'LIVE' ? 'live' : ''}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Engine Telemetry Card */}
      <div className="sidebar-footer">
        {!collapsed ? (
          <div className="engine-card">
            <div className="engine-card-header">
              <div className="engine-status-left">
                <span className={`status-orb ${serverRunning ? 'online' : ''}`} />
                <span className="engine-status-text">
                  {serverRunning ? 'Ballistica Active' : 'Ballistica Offline'}
                </span>
              </div>
              <span className="api-badge">API 9</span>
            </div>
            <div className="engine-card-details">
              <span className="engine-detail-item">
                <Activity size={11} /> 43210
              </span>
              <span className="engine-detail-sep">•</span>
              <span className="engine-detail-item">
                <Zap size={11} /> v1.7.37+
              </span>
            </div>
          </div>
        ) : (
          <div className="collapsed-footer-indicator" title={serverRunning ? 'Server Active (Port 43210)' : 'Server Idle'}>
            <span className={`status-orb ${serverRunning ? 'online' : ''}`} />
            <span className="api-badge-compact">9</span>
          </div>
        )}
      </div>
    </aside>
  );
};
