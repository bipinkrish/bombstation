# Ballistica MCP Server

## What This Enables

- Manage V2 accounts and workspaces
- Upload/download mod scripts
- Validate Python code against API
- Full mod lifecycle via agent commands

## Installation

```bash
pip install mcp httpx python-dotenv
export BALLISTICA_API_KEY="your_key"
python ballistica_mcp_server.py
```

## Get API Key

1. https://ballistica.net/apikeys
2. Sign in with V2 account
3. Click "New API Key"

## Usage with MCP Clients

### Cursor/Continue.dev

```json
{
  "mcpServers": {
    "ballistica": {
      "command": "python",
      "args": ["ballistica_mcp_server.py"],
      "env": {"BALLISTICA_API_KEY": "your_key"}
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `list_workspaces` | List cloud workspaces |
| `create_workspace` | Create new workspace |
| `upload_file` | Upload mod file |
| `download_file` | Download file |
| `validate_python_code` | Validate mod code |

## References

- API Docs: https://ballistica.net/docs
- Plugin Manager: https://github.com/bombsquad-community/plugin-manager
- MCP Spec: https://modelcontextprotocol.io
