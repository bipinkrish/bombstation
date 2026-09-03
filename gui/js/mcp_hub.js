/**
 * gui/js/mcp_hub.js — Ballistica MCP & AI Hub
 */

export async function loadMcpStatus() {
  try {
    const res = await fetch('/api/mcp/status');
    const data = await res.json();

    const serverBadge = document.getElementById('mcp-server-status-badge');
    const keyBadge = document.getElementById('mcp-key-status-badge');
    const serverPath = document.getElementById('mcp-server-path');
    const keyStatus = document.getElementById('mcp-key-status');
    const toolsContainer = document.getElementById('mcp-tools-container');

    if (serverBadge) {
      serverBadge.textContent = data.mcp_server_present ? '✓ Active' : 'Missing';
      serverBadge.className = data.mcp_server_present ? 'mcp-badge' : 'mcp-badge dim';
    }
    if (serverPath) {
      serverPath.textContent = data.mcp_server_path || 'ballistica_mcp_server.py';
    }

    if (keyBadge) {
      keyBadge.textContent = data.has_api_key ? '✓ Configured' : 'No Key';
      keyBadge.className = data.has_api_key ? 'mcp-badge' : 'mcp-badge dim';
    }
    if (keyStatus) {
      keyStatus.textContent = data.has_api_key
        ? '.env contains valid BALLISTICA_API_KEY'
        : 'BALLISTICA_API_KEY not set in .env (get key from ballistica.net/apikeys)';
    }

    if (toolsContainer && data.tools) {
      toolsContainer.innerHTML = '';
      data.tools.forEach(t => {
        const row = document.createElement('div');
        row.className = 'mcp-tool-row';
        row.innerHTML = `
          <div>
            <span class="mcp-tool-name">${t.name}</span>
            <p class="mcp-tool-desc">${t.description}</p>
          </div>
          <span class="badge-subtle">mcp</span>
        `;
        toolsContainer.appendChild(row);
      });
    }
  } catch (err) {
    console.error('Error loading MCP status:', err);
  }
}
