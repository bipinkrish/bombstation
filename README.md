# BombStation 🚀

**BombStation** is an all-in-one developer toolkit and modding suite for **BombSquad** and the **Ballistica** game engine. It brings together an AI-powered Model Context Protocol (MCP) server, verified game plugins, and comprehensive engineering documentation into a unified workspace.

---

## 📁 Repository Overview

```text
bombstation/
├── bombstation_studio.py       # Main cross-platform Studio entrypoint
├── studio/                     # Modular backend package (server, config, process, validator, asset parser)
├── gui/                        # Sleek Minimalist Web GUI (Vanilla CSS & Modular ES6 JS)
│   ├── js/                     # Modular components (state, 3D scene, Monaco IDE, server, config, plugins)
│   └── style.css               # Restrained dark zinc & obsidian aesthetic
├── scripts/
│   └── build_export.py         # Mod build, validation, asset bundling & packaging pipeline
├── assets/models/              # Sample .bob and .cob 3D visual & collision meshes
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

### 🖥️ 1. BombStation Studio (Native Cross-Platform Ballistica Suite & Modding IDE)
A unified, sleek, minimalist desktop and web workspace integrating server operations with real-time modding and 3D visual arena design across **macOS, Windows, and Linux**:

- **Native Cross-Platform Launch:**
  ```bash
  python3 bombstation_studio.py
  # or as a module:
  python3 -m studio
  ```
- **Compile to Single Standalone Executable:**
  Compile the entire application into an 8 MB standalone binary that requires no Python installed on the user's computer:
  ```bash
  python3 scripts/compile_executable.py
  # Output binary: dist/bombstation_studio (or dist/bombstation_studio.exe on Windows)
  ```
- **Unified Modules:**
  - ⚡ **Server Console & Operations:** Cross-platform server executable detection, live status telemetry, Start/Stop/Restart, real-time log terminal with search/filter, and interactive REPL command prompt.
  - ⚙️ **Server Config Studio:** Complete visual forms and bidirectional raw TOML editor for all 25+ settings (party name, UDP port, 999 max players, session mode, passwords, playlist, auto-balance) with 1-click preset profiles.
  - 🧩 **Plugin Manager:** 1-click install/uninstall for repository mods (`unlock_max_players.py`, `unlock_all_characters.py`), native system mods folder scanner (macOS/Windows/Linux), and system file manager reveal.
  - 📝 **Ballistica Code Studio (Monaco Editor):** Embedded VS Code Monaco Editor with Python syntax highlighting, AST syntax validation against Ballistica API 9 standards, starter templates, and 1-click "Build & Export" packaging.
  - 🪐 **3D Arena & Scene Builder (.bob & .cob Support):** Interactive 3D viewport with Three.js orbit controls, visual placement for Spawns, Flags, and Powerups, native binary decoding and rendering for `.bob` (visual meshes) and `.cob` (collision hulls), and real-time export to Ballistica Map Python coordinate dictionaries (`bascenev1.Map`).
  - 🤖 **Ballistica AI & MCP Hub:** Status of the local MCP server, API Key configuration, and 5 registered tools (`list_workspaces`, `create_workspace`, `upload_file`, `download_file`, `validate_python_code`).

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
