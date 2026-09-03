# BombStation Studio 💣

**BombStation Studio** is an all-in-one desktop developer suite and modding toolkit for **BombSquad** and the **Ballistica** game engine. Built natively as a desktop application using **React 19, TypeScript, Three.js, Monaco Editor, and Tauri v2 (Rust)**, coupled with an integrated Python Ballistica engine.

---

## 📁 Repository Structure

```text
bombstation/
├── src/                         # React 19 + TypeScript + Vite Frontend
│   ├── components/
│   │   ├── NavigationRail.tsx   # Minimalist navigation rail (Server, Config, Mods, Code, Scene, MCP)
│   │   ├── Header.tsx           # Global telemetry pill & server controls
│   │   ├── ServerOps.tsx        # Server launcher, paths, terminal stream & REPL
│   │   ├── ConfigStudio.tsx     # Visual form & raw TOML config editor with presets
│   │   ├── PluginsManager.tsx   # Plugin catalog & local mods directory installer
│   │   ├── CodeStudio.tsx       # Monaco Editor, AST validator, Build & Export
│   │   ├── SceneStudio.tsx      # Three.js 3D diorama with .bob/.cob binary parser
│   │   └── McpHub.tsx           # Ballistica MCP Hub status & tools
│   ├── services/
│   │   ├── api.ts               # Typed client for studio REST endpoints
│   │   └── bobCobParser.ts      # TypeScript .bob / .cob ArrayBuffer binary decoder
│   ├── App.tsx                  # Main layout & active tab state
│   ├── App.css                  # Sleek minimalist Obsidian/Zinc styling
│   └── main.tsx                 # React DOM bootstrapper
├── src-tauri/                   # Tauri v2 Rust Desktop Shell
│   ├── Cargo.toml               # Rust dependencies (tauri, tokio, etc.)
│   ├── tauri.conf.json          # Window configuration, metadata & permissions
│   └── src/
│       ├── main.rs              # Tauri runner
│       └── lib.rs               # App setup, Python backend lifecycle supervisor
├── studio/                      # Python backend engine (server, validator, process manager, assets)
│   ├── asset_parser.py          # .bob and .cob binary parser & OBJ exporter
│   ├── config_manager.py        # TOML config parser & generator
│   ├── process_manager.py       # Thread-safe server process supervisor & REPL
│   ├── server.py                # REST API endpoints & static server
│   └── validator.py             # Python AST syntax & API 9 validator
├── scripts/
│   └── build_export.py          # Mod build, validation, asset bundling & packaging pipeline
├── assets/models/               # Sample .bob and .cob 3D visual & collision meshes
├── plugins/                     # Verified BombSquad plugins
│   ├── unlock_max_players.py    # Unlocks lobby ceiling to 999 players
│   └── unlock_all_characters.py # Unlocks all characters
└── docs/                        # Complete architecture & MCP guides
```

---

## 🚀 Running the Desktop App

### 1. Development Mode (with Hot Reloading)
```bash
npm run tauri dev
```

### 2. Production Build (Native macOS `.app`)
```bash
npm run tauri build
```
The compiled native application bundle is generated at:
```text
src-tauri/target/release/bundle/macos/BombStation Studio.app
```

To launch the compiled desktop app directly:
```bash
open "src-tauri/target/release/bundle/macos/BombStation Studio.app"
```

---

## ⚡ Core Features

- 🖥️ **Native Desktop Window:** Real standalone window application powered by Tauri v2 and WebKit (no browser tabs).
- ⚡ **Server Console & Operations:** Start, Stop, and Restart dedicated Ballistica servers with real-time log streaming, severity filtering, and interactive stdin REPL.
- ⚙️ **Config Studio:** Full visual form and raw TOML editor for all 25+ `config.toml` settings with 1-click presets (Classic FFA, 999 Players, LAN Tourney).
- 🧩 **Plugin Manager:** 1-click install/uninstall for verified repository plugins and local custom mods directory scanning.
- 📝 **Code Studio (Monaco Editor):** Embedded VS Code Monaco Editor with Python syntax highlighting, AST syntax validation against Ballistica API 9 rules, and starter templates.
- 🪐 **3D Arena Studio:** Three.js diorama with drag-and-drop support for Ballistica `.bob` visual meshes and `.cob` collision hulls, node placement (Spawns, Flags, Powerups), and Python coordinate dictionary export.
- 📦 **Mod Build & Export Pipeline:** Automated CLI and in-app packaging of distribution ZIPs via `scripts/build_export.py`.
- 🤖 **Ballistica MCP Hub:** Integrated inspection for local AI coding assistant integration.
