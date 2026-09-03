import React from 'react';
import { ServerStatus } from '../services/api';

interface HeaderProps {
  activeTabTitle: string;
  serverStatus: ServerStatus;
  onStartServer: () => void;
  onStopServer: () => void;
  onRestartServer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTabTitle,
  serverStatus,
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
    <header className="studio-header">
      <div className="header-left">
        <div className="breadcrumb">
          <span className="crumb-brand">BombStation Studio</span>
          <span className="crumb-sep">/</span>
          <span className="crumb-view">{activeTabTitle}</span>
        </div>
      </div>

      <div className="header-center">
        <div className="global-telemetry-pill">
          <span className={`pill-dot ${serverStatus.running ? 'running' : ''}`} />
          <span className="pill-label">{serverStatus.running ? 'RUNNING' : 'STOPPED'}</span>
          <span className="pill-sep">•</span>
          <span className="pill-uptime">{formatUptime(serverStatus.uptime_seconds)}</span>
          <span className="pill-sep">•</span>
          <span className="pill-port">Port: 43210</span>
          {serverStatus.running && serverStatus.pid && (
            <>
              <span className="pill-sep">•</span>
              <span className="pill-pid">PID: {serverStatus.pid}</span>
            </>
          )}
        </div>
      </div>

      <div className="header-right">
        <div className="server-action-group">
          <button
            className="btn btn-primary"
            onClick={onStartServer}
            disabled={serverStatus.running}
          >
            Start Server
          </button>
          <button
            className="btn btn-secondary"
            onClick={onStopServer}
            disabled={!serverStatus.running}
          >
            Stop
          </button>
          <button
            className="btn btn-ghost"
            onClick={onRestartServer}
            disabled={!serverStatus.running}
          >
            Restart
          </button>
        </div>
      </div>
    </header>
  );
};
