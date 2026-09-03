/**
 * src/services/api.ts — Typed REST Client for BombStation Studio Backend
 */

const API_BASE = 'http://127.0.0.1:8080';

export interface ServerStatus {
  running: boolean;
  pid: number | null;
  uptime_seconds: number;
  executable_path: string;
  config_path: string;
  plugins_path: string;
  total_logs: number;
}

export interface PresetsData {
  executables: { name: string; path: string }[];
  plugin_targets: { name: string; path: string; exists: boolean; recommended: boolean }[];
  configs: { name: string; path: string }[];
}

export interface LogEntry {
  id: number;
  timestamp: string;
  severity: 'info' | 'warn' | 'error' | 'success' | 'system' | 'stdin';
  text: string;
}

export interface PluginItem {
  filename: string;
  name: string;
  description: string;
  api_target: number;
  is_installed: boolean;
}

export interface CustomPluginItem {
  name: string;
  path: string;
  size: number;
  modified: number;
}

export interface PluginsResponse {
  target_directory: string;
  plugins: PluginItem[];
  custom_plugins: CustomPluginItem[];
}

export interface StudioTemplate {
  id: string;
  name: string;
  description: string;
  filename: string;
  code: string;
}

export interface ValidationReport {
  valid: boolean;
  syntax_error?: {
    line: number;
    column: number;
    message: string;
    text: string;
  };
  api_target?: number;
  warnings: string[];
  info: string[];
  classes: { name: string; line: number; bases: string[] }[];
}

export interface McpStatusResponse {
  mcp_server_present: boolean;
  mcp_server_path: string;
  has_api_key: boolean;
  env_file_exists: boolean;
  tools: { name: string; description: string }[];
}

export const api = {
  async getStatus(): Promise<ServerStatus> {
    const res = await fetch(`${API_BASE}/api/status`);
    return res.json();
  },

  async getPresets(): Promise<PresetsData> {
    const res = await fetch(`${API_BASE}/api/presets`);
    return res.json();
  },

  async browsePath(type: 'file' | 'directory', prompt: string): Promise<string | null> {
    const res = await fetch(`${API_BASE}/api/browse?type=${type}&prompt=${encodeURIComponent(prompt)}`);
    const data = await res.json();
    return data.path;
  },

  async getConfig(path?: string): Promise<{ path: string; raw: string; config: any }> {
    const query = path ? `?path=${encodeURIComponent(path)}` : '';
    const res = await fetch(`${API_BASE}/api/config${query}`);
    return res.json();
  },

  async saveConfig(payload: { path: string; raw?: string; config?: any }): Promise<any> {
    const res = await fetch(`${API_BASE}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async getPlugins(target?: string): Promise<PluginsResponse> {
    const query = target ? `?target=${encodeURIComponent(target)}` : '';
    const res = await fetch(`${API_BASE}/api/plugins${query}`);
    return res.json();
  },

  async installPlugin(plugin: string, target: string, all: boolean = false): Promise<any> {
    const res = await fetch(`${API_BASE}/api/plugins/install`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plugin, target, all }),
    });
    return res.json();
  },

  async uninstallPlugin(plugin: string, target: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/plugins/uninstall`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plugin, target }),
    });
    return res.json();
  },

  async openFolder(path: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/plugins/open-folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    return res.json();
  },

  async startServer(executable: string, config: string, plugins_path: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/server/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ executable, config, plugins_path }),
    });
    return res.json();
  },

  async stopServer(): Promise<any> {
    const res = await fetch(`${API_BASE}/api/server/stop`, { method: 'POST' });
    return res.json();
  },

  async restartServer(executable: string, config: string, plugins_path: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/server/restart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ executable, config, plugins_path }),
    });
    return res.json();
  },

  async getLogs(sinceId: number = 0): Promise<{ logs: LogEntry[]; total: number; running: boolean }> {
    const res = await fetch(`${API_BASE}/api/server/logs?since=${sinceId}`);
    return res.json();
  },

  async sendCommand(command: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/server/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });
    return res.json();
  },

  async getTemplates(): Promise<{ templates: StudioTemplate[] }> {
    const res = await fetch(`${API_BASE}/api/studio/templates`);
    return res.json();
  },

  async getStudioFiles(dir?: string): Promise<{ directory: string; files: any[] }> {
    const query = dir ? `?dir=${encodeURIComponent(dir)}` : '';
    const res = await fetch(`${API_BASE}/api/studio/files${query}`);
    return res.json();
  },

  async loadStudioFile(path: string): Promise<{ filename: string; path: string; content: string }> {
    const res = await fetch(`${API_BASE}/api/studio/load`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    return res.json();
  },

  async saveStudioFile(path: string, filename: string, content: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/studio/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, filename, content }),
    });
    return res.json();
  },

  async validateCode(code: string): Promise<ValidationReport> {
    const res = await fetch(`${API_BASE}/api/studio/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    return res.json();
  },

  async exportMod(source: string, deploy: boolean = false): Promise<any> {
    const res = await fetch(`${API_BASE}/api/studio/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, deploy }),
    });
    return res.json();
  },

  async getSampleAsset(type: 'bob' | 'cob'): Promise<any> {
    const res = await fetch(`${API_BASE}/api/studio/sample-asset?type=${type}`);
    return res.json();
  },

  async getMcpStatus(): Promise<McpStatusResponse> {
    const res = await fetch(`${API_BASE}/api/mcp/status`);
    return res.json();
  }
};
