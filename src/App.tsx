import { useState, useEffect } from 'react';
import { Sidebar, TabId } from './components/Sidebar';
import { Header } from './components/Header';
import { ServerOps } from './components/ServerOps';
import { ConfigStudio } from './components/ConfigStudio';
import { PluginsManager } from './components/PluginsManager';
import { CodeStudio } from './components/CodeStudio';
import { SceneStudio } from './components/SceneStudio';
import { McpHub } from './components/McpHub';
import { api, ServerStatus, LogEntry } from './services/api';
import './App.css';

interface Toast {
  id: number;
  message: string;
}

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('server');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [serverStatus, setServerStatus] = useState<ServerStatus>({
    running: false,
    pid: null,
    uptime_seconds: 0,
    executable_path: '',
    config_path: '',
    plugins_path: '',
    total_logs: 0,
  });

  const [executable, setExecutable] = useState('');
  const [modsPath, setModsPath] = useState('');
  const [configPath, setConfigPath] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastLogId, setLastLogId] = useState(0);
  const [totalLogs, setTotalLogs] = useState(0);
  const [codeStudioInitialFile, setCodeStudioInitialFile] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  };

  // Keyboard shortcut listener for sidebar toggle (Cmd+B / Ctrl+B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initial load
  useEffect(() => {
    api.getStatus().then((st) => {
      setServerStatus(st);
      if (st.executable_path) setExecutable(st.executable_path);
      if (st.config_path) setConfigPath(st.config_path);
      if (st.plugins_path) setModsPath(st.plugins_path);
    }).catch(console.error);

    api.getPresets().then((res) => {
      if (!executable && res.executables.length > 0) setExecutable(res.executables[0].path);
      if (!configPath && res.configs.length > 0) setConfigPath(res.configs[0].path);
      if (!modsPath && res.plugin_targets.length > 0) {
        const rec = res.plugin_targets.find((t) => t.recommended) || res.plugin_targets[0];
        setModsPath(rec.path);
      }
    }).catch(console.error);
  }, []);

  // Polling loop for status and logs
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const logData = await api.getLogs(lastLogId);
        if (logData.logs && logData.logs.length > 0) {
          setLogs((prev) => [...prev, ...logData.logs].slice(-500));
          setLastLogId(logData.logs[logData.logs.length - 1].id);
        }
        setTotalLogs(logData.total || 0);

        const st = await api.getStatus();
        setServerStatus(st);
      } catch (err) {
        // Backend connecting
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lastLogId]);

  const handleStartServer = async () => {
    if (!executable) {
      showToast('Please select a server executable path first.');
      return;
    }
    showToast('Starting dedicated Ballistica server...');
    try {
      const res = await api.startServer(executable, configPath, modsPath);
      if (res.success) {
        showToast(`Server started (PID: ${res.status.pid})`);
        setServerStatus(res.status);
      } else {
        showToast(`Failed: ${res.message}`);
      }
    } catch (err: any) {
      showToast(`Error starting server: ${err.message}`);
    }
  };

  const handleStopServer = async () => {
    showToast('Stopping BombSquad server...');
    try {
      const res = await api.stopServer();
      showToast(res.message || 'Server stopped.');
      setServerStatus(res.status);
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleRestartServer = async () => {
    showToast('Restarting BombSquad server...');
    try {
      const res = await api.restartServer(executable, configPath, modsPath);
      if (res.success) {
        showToast(`Server restarted (PID: ${res.status.pid})`);
        setServerStatus(res.status);
      } else {
        showToast(`Restart failed: ${res.message}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const tabTitles: { [k in TabId]: string } = {
    server: 'Server Operations',
    config: 'Server Configuration',
    plugins: 'Plugins & Mods Manager',
    code: 'Ballistica Code Studio',
    scene: '3D Arena & Assets',
    mcp: 'AI & MCP Hub',
  };

  return (
    <div className="macos-app-container">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        serverRunning={serverStatus.running}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      <div className="macos-main-area">
        <Header
          activeTabTitle={tabTitles[activeTab]}
          serverStatus={serverStatus}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
          onStartServer={handleStartServer}
          onStopServer={handleStopServer}
          onRestartServer={handleRestartServer}
        />

        <main className="macos-content-viewport">
          {activeTab === 'server' && (
            <ServerOps
              executable={executable}
              setExecutable={setExecutable}
              modsPath={modsPath}
              setModsPath={setModsPath}
              configPath={configPath}
              setConfigPath={setConfigPath}
              logs={logs}
              totalLogs={totalLogs}
              onClearLogs={() => setLogs([])}
              showToast={showToast}
            />
          )}

          {activeTab === 'config' && (
            <ConfigStudio configPath={configPath} showToast={showToast} />
          )}

          {activeTab === 'plugins' && (
            <PluginsManager
              modsPath={modsPath}
              onEditPluginInCodeStudio={(filename) => {
                setCodeStudioInitialFile(filename);
                setActiveTab('code');
              }}
              showToast={showToast}
            />
          )}

          {activeTab === 'code' && (
            <CodeStudio
              modsPath={modsPath}
              initialFile={codeStudioInitialFile}
              showToast={showToast}
            />
          )}

          {activeTab === 'scene' && (
            <SceneStudio
              onSendToCodeStudio={(_coordsSnippet) => {
                setActiveTab('code');
                showToast('Coordinates sent to Code Studio');
              }}
              showToast={showToast}
            />
          )}

          {activeTab === 'mcp' && <McpHub />}
        </main>
      </div>

      <div className="macos-toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className="macos-toast-item">
            <span className="toast-dot" />
            <span className="toast-msg">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
