# BombStation 🚀

**BombStation** is an all-in-one developer toolkit and modding suite for **BombSquad** and the **Ballistica** game engine. It brings together an AI-powered Model Context Protocol (MCP) server, verified game plugins, and comprehensive engineering documentation into a unified workspace.

---

## 📁 Repository Overview

```text
bombstation/
├── server_gui.py               # Zero-dependency Server Studio backend (Start/Stop/Logs/Config)
├── run_gui.sh                  # One-click launcher script for Server Studio GUI
├── gui/                        # Premium Dark Theme Web GUI (Vanilla CSS & JS)
├── ballistica_mcp_server.py    # MCP server for AI-assisted Ballistica modding
├── plugins/                    # Ready-to-use BombSquad plugins & catalog
│   ├── unlock_max_players.py   # Unlocks 8-player lobby ceiling to 999
│   ├── unlock_all_characters.py# Unlocks all 30+ characters for custom/local play
│   └── README.md               # Full plugin installation guide & architecture FAQ
├── docs/
│   ├── ballistica_mcp_README.md# MCP server configuration & client guides
│   └── bombSquad_complete_guide.md # Comprehensive 14-section BombSquad dev handbook
└── AGENTS.md                   # Coding conventions & engine architecture reference
```

---

## ⚡ Core Components

### 🖥️ 1. BombStation Server Studio (GUI)
A graphical dashboard to manage BombSquad servers, select executables, install plugins, edit `config.toml`, and control server execution with real-time logs.

- **Quick Launch:**
  ```bash
  ./run_gui.sh
  # or directly:
  python3 server_gui.py
  ```
- **Features:**
  - ⚡ **Selectable Server Executable:** Native macOS Finder picker (`osascript`) + presets for `bombsquad_server`, `bombsquad_headless`, and `BombSquad.app`.
  - 🧩 **Selectable Plugins Directory & Installer:** Select any target mods folder (e.g. `~/Library/Application Support/BombSquad/mods/` or `ba_root/mods`), with 1-click install/uninstall for repository plugins.
  - ⚙️ **Complete `config.toml` Editor:** Visual forms and raw TOML editor for all 25+ settings (party name, port, 999 max players, session mode, passwords, playlist, auto-balance) + instant preset profiles.
  - 🔴/🟢 **Server Controls & Terminal:** Start, Stop, and Restart server subprocess with live streaming stdout/stderr and interactive REPL command input.

---

### 🤖 2. Ballistica MCP Server
Connects AI coding assistants (Cursor, Claude Desktop, Continue.dev) to the Ballistica Cloud API to automate workspace sync, mod uploads, and syntax validation.

- **Quick Start:**
  ```bash
  pip install -r requirements.txt
  cp .env.example .env  # Add your BALLISTICA_API_KEY from ballistica.net/apikeys
  python3 ballistica_mcp_server.py
  ```
- **Included Tools:** `list_workspaces`, `create_workspace`, `upload_file`, `download_file`, `validate_python_code`.
- 📖 **Client Configuration & Setup:** [docs/ballistica_mcp_README.md](docs/ballistica_mcp_README.md)

---

### 🧩 3. Ready-to-Use Plugins
Drop-in plugins compatible with **BombSquad API 9 (1.7.37+)** and legacy API 7/8 with full crash protection:

| Plugin | Description | Target API |
| :--- | :--- | :--- |
| [`plugins/unlock_max_players.py`](plugins/unlock_max_players.py) | Removes the 8-player ceiling and supports up to 999 players in Coop, Teams, and FFA. | API 7, 8, 9 |
| [`plugins/unlock_all_characters.py`](plugins/unlock_all_characters.py) | Unlocks all 30+ characters and skins for local/custom matches, lobby selection, and profile creation. | API 7, 8, 9 |

#### In-Game Installation via Plugin Manager
1. Enable the Dev Console in BombSquad (**Settings** → **Advanced** → **Show Dev Console Button**), tap `>_`, and run:
   ```python
   import urllib.request;import _babase;import os;url="https://github.com/bombsquad-community/plugin-manager/releases/latest/download/plugin_manager.py";plugin_path=os.path.join(_babase.env()["python_directory_user"],"plugin_manager.py");file=urllib.request.urlretrieve(url)[0];fl=open(file,'r');f=open(plugin_path,'w+');f.write(fl.read());fl.close();f.close();print("SUCCESS")
   ```
2. Restart BombSquad, open **Plugin Manager** → **Settings** → **Add Source**, and add `bipinkrish/bombstation` to install and update mods with one click.

📖 **Full Plugin Guide, Manual Mod Paths, & Architecture FAQ:** [plugins/README.md](plugins/README.md)

---

## 📚 Documentation & References

- [docs/bombSquad_complete_guide.md](docs/bombSquad_complete_guide.md) — Comprehensive handbook covering engine internals, headless dedicated servers, multiplayer setup, and 3D asset pipelines (`.bob`/`.cob`).
- [docs/ballistica_mcp_README.md](docs/ballistica_mcp_README.md) — MCP client setup (Cursor, Claude Desktop) and tool usage.
- [plugins/README.md](plugins/README.md) — Plugin catalog, installation options, and one-liner vs. plugin architecture comparison.
- [AGENTS.md](AGENTS.md) — Agent coding conventions, compatibility targets, and upstream links.
- [Official Ballistica Documentation](https://ballistica.net/docs) & [Engine Repository](https://github.com/efroemling/ballistica)
- [BombSquad Community Hub](https://bombsquad-community.web.app/)
