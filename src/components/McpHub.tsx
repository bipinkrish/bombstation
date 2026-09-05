import React, { useState, useEffect } from 'react';
import { Cpu, Key, Check, Copy, Terminal, Wrench } from 'lucide-react';
import { api, McpStatusResponse } from '../services/api';

export const McpHub: React.FC = () => {
  const [status, setStatus] = useState<McpStatusResponse | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  useEffect(() => {
    api.getMcpStatus().then(setStatus).catch(console.error);
  }, []);

  const mcpConfigSnippet = JSON.stringify(
    {
      mcpServers: {
        ballistica: {
          command: 'python3',
          args: [status?.mcp_server_path || 'ballistica_mcp_server.py'],
        },
      },
    },
    null,
    2
  );

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(mcpConfigSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2400);
  };

  return (
    <div className="mcp-hub-container">
      {/* Intro Header */}
      <div className="macos-card mcp-header-card">
        <div className="mcp-intro">
          <div className="mcp-badge-row">
            <span className="macos-badge purple">
              <Cpu size={11} /> Model Context Protocol
            </span>
            <span className="mcp-active-tag">
              {status?.tools.length || 0} Tools Registered
            </span>
          </div>
          <h2 className="mcp-title">Ballistica AI &amp; MCP Integration Hub</h2>
          <p className="mcp-desc">
            Bridge coding agents (Claude Desktop, Cursor, Antigravity) directly into your local Ballistica environment, server execution, and asset pipeline.
          </p>
        </div>
      </div>

      {/* Status Cards */}
      <div className="mcp-cards-grid">
        <div className="macos-card mcp-status-card">
          <div className="card-header-bar">
            <div className="card-title-group">
              <Terminal size={14} className="card-icon" />
              <h4 className="card-title">Local MCP Server</h4>
            </div>
            <span
              className={`macos-badge ${
                status?.mcp_server_present ? 'success' : 'neutral'
              }`}
            >
              {status?.mcp_server_present ? 'Active' : 'Missing'}
            </span>
          </div>
          <p className="mcp-card-detail">
            Standard Python stdio server running Ballistica tools for coding assistants.
          </p>
          <div className="mcp-code-chip mono-text">
            {status?.mcp_server_path || 'ballistica_mcp_server.py'}
          </div>
        </div>

        <div className="macos-card mcp-status-card">
          <div className="card-header-bar">
            <div className="card-title-group">
              <Key size={14} className="card-icon" />
              <h4 className="card-title">Cloud Ballistica API Key</h4>
            </div>
            <span
              className={`macos-badge ${
                status?.has_api_key ? 'success' : 'neutral'
              }`}
            >
              {status?.has_api_key ? 'Configured' : 'Not Set'}
            </span>
          </div>
          <p className="mcp-card-detail">
            Required for Ballistica Cloud synchronization and account verification.
          </p>
          <div className="mcp-code-chip mono-text">
            {status?.has_api_key
              ? '.env contains BALLISTICA_API_KEY'
              : 'Add BALLISTICA_API_KEY to .env (from ballistica.net/apikeys)'}
          </div>
        </div>
      </div>

      {/* Quick Config Snippet Card */}
      <div className="macos-card mcp-snippet-card">
        <div className="card-header-bar">
          <div className="card-title-group">
            <Cpu size={14} className="card-icon" />
            <h4 className="card-title">Claude Desktop / Antigravity MCP Config</h4>
          </div>
          <button className="macos-secondary-btn mini-btn" onClick={handleCopySnippet}>
            {copiedSnippet ? <Check size={12} /> : <Copy size={12} />}
            <span>{copiedSnippet ? 'Copied' : 'Copy Config'}</span>
          </button>
        </div>
        <p className="snippet-hint">
          Paste this block into <code>~/Library/Application Support/Claude/claude_desktop_config.json</code>:
        </p>
        <pre className="mcp-config-box mono-text">{mcpConfigSnippet}</pre>
      </div>

      {/* Registered Tools List */}
      <div className="macos-card mcp-tools-card">
        <div className="card-header-bar">
          <div className="card-title-group">
            <Wrench size={14} className="card-icon" />
            <h3 className="card-title">Active MCP Tool Capabilities</h3>
          </div>
          <span className="card-counter-pill">{status?.tools.length || 0} tools ready</span>
        </div>

        <div className="mcp-tools-container custom-scroll">
          {status?.tools.map((t) => (
            <div key={t.name} className="mcp-tool-card">
              <div className="tool-card-left">
                <span className="tool-endpoint-name mono-text">{t.name}</span>
                <p className="tool-endpoint-desc">{t.description}</p>
              </div>
              <span className="tool-protocol-pill">stdio</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
