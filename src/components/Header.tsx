import React from 'react';
import { Play, Square, RotateCw, PanelLeft } from 'lucide-react';
import { ServerStatus } from '../services/api';

interface HeaderProps {
  activeTabTitle: string;
  serverStatus: ServerStatus;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onStartServer: () => void;
  onStopServer: () => void;
  onRestartServer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTabTitle,
  serverStatus,
  sidebarCollapsed,
  onToggleSidebar,
  onStartServer,
  onStopServer,
  onRestartServer,
}) => {
  const formatUptime = (secs: number) => {
    const s = Math.floor(secs || 0);
    const hrs = Math.floor(s / 3600).toString().padStart(2, '0');
    const mins = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const seconds = (s % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${seconds}`;
  };

  return (
    <header className="macos-header" data-tauri-drag-region>
      <div className="header-left" data-tauri-drag-region>
        {sidebarCollapsed && (
          <button
            className="header-sidebar-toggle"
            onClick={onToggleSidebar}
            title="Expand Sidebar (⌘B)"
            aria-label="Expand sidebar"
          >
            <PanelLeft size={16} />
          </button>
        )}

        <div className="header-title-badge">
          <span className="active-view-name">{activeTabTitle}</span>
        </div>
      </div>

      <div className="header-center" data-tauri-drag-region>
        <div className={`macos-telemetry-capsule ${serverStatus.running ? 'live' : 'idle'}`}>
          <div className="capsule-status-dot">
            <span className={`status-dot-core ${serverStatus.running ? 'online' : ''}`} />
            {serverStatus.running && <span className="status-dot-pulse" />}
          </div>
          <span className="capsule-status-label">
            {serverStatus.running ? 'ONLINE' : 'OFFLINE'}
          </span>
          <span className="capsule-divider" />
          <span className="capsule-clock">{formatUptime(serverStatus.uptime_seconds)}</span>
          <span className="capsule-divider" />
          <span className="capsule-detail">Port 43210</span>
          {serverStatus.running && serverStatus.pid && (
            <>
              <span className="capsule-divider" />
              <span className="capsule-detail pid">PID {serverStatus.pid}</span>
            </>
          )}
        </div>
      </div>

      <div className="header-right">
        <div className="macos-server-controls">
          {!serverStatus.running ? (
            <button
              className="macos-btn macos-btn-primary"
              onClick={onStartServer}
              title="Launch Ballistica Dedicated Server"
            >
              <Play size={13} fill="currentColor" />
              <span>Start Server</span>
            </button>
          ) : (
            <button
              className="macos-btn macos-btn-danger"
              onClick={onStopServer}
              title="Terminate running server process"
            >
              <Square size={13} fill="currentColor" />
              <span>Stop Server</span>
            </button>
          )}

          <button
            className="macos-btn macos-btn-icon"
            onClick={onRestartServer}
            disabled={!serverStatus.running}
            title={serverStatus.running ? 'Restart Ballistica Server' : 'Server is not running'}
            aria-label="Restart Server"
          >
            <RotateCw size={14} />
          </button>
        </div>
      </div>
    </header>
  );
};
