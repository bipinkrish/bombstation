import React, { useState, useEffect } from 'react';
import { api, McpStatusResponse } from '../services/api';

export const McpHub: React.FC = () => {
  const [status, setStatus] = useState<McpStatusResponse | null>(null);

  useEffect(() => {
    api.getMcpStatus().then(setStatus).catch(console.error);
  }, []);

  return (
    <div className="mcp-hub-layout">
      <div>
        <h2>Ballistica Model Context Protocol (MCP) Hub</h2>
        <p className="section-desc">
          Connect AI coding assistants directly to Ballistica Cloud and local dev environments.
        </p>
      </div>

      <div className="mcp-cards-grid">
        <div className="panel-card">
          <div className="mcp-card-top">
            <span className={`mcp-badge ${status?.mcp_server_present ? '' : 'dim'}`}>
              {status?.mcp_server_present ? '✓ Active' : 'Missing'}
            </span>
            <h4>MCP Server</h4>
          </div>
          <p className="mcp-desc">Local Python stdio server bridging coding agents with Ballistica.</p>
          <div className="mcp-path mono">{status?.mcp_server_path || 'ballistica_mcp_server.py'}</div>
        </div>

        <div className="panel-card">
          <div className="mcp-card-top">
            <span className={`mcp-badge ${status?.has_api_key ? '' : 'dim'}`}>
              {status?.has_api_key ? '✓ Configured' : 'No Key'}
            </span>
            <h4>Cloud API Key</h4>
          </div>
          <p className="mcp-desc">Required for cloud workspace synchronization.</p>
          <div className="mcp-path mono">
            {status?.has_api_key
              ? '.env contains valid BALLISTICA_API_KEY'
              : 'BALLISTICA_API_KEY not set in .env (get key from ballistica.net/apikeys)'}
          </div>
        </div>
      </div>

      <div className="panel-card">
        <div className="panel-header">
          <h3>Registered MCP Tools</h3>
          <span className="badge-subtle">{status?.tools.length || 0} Tools Active</span>
        </div>
        <div className="mcp-tools-list">
          {status?.tools.map((t) => (
            <div key={t.name} className="mcp-tool-row">
              <div>
                <span className="mcp-tool-name">{t.name}</span>
                <p className="mcp-tool-desc">{t.description}</p>
              </div>
              <span className="badge-subtle">mcp</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
