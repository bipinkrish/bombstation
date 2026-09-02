# BombStation Plugins 🧩

Welcome to the **BombStation Plugins** collection for **BombSquad** and the **Ballistica** engine (API 9 / BombSquad 1.7.37+, with backwards-compatibility safeguards).

---

## 📦 Included Plugins

| Plugin | File | Description | Target API |
| :--- | :--- | :--- | :--- |
| **Unlock Max Players** | [`unlock_max_players.py`](unlock_max_players.py) | Lifts the default 8-player ceiling to 999 for Coop, Teams, and Free-for-All. | API 7, 8, 9 |
| **Unlock All Characters** | [`unlock_all_characters.py`](unlock_all_characters.py) | Unlocks all 30+ characters and appearances for custom/local games, profile creation, and lobby selection. | API 7, 8, 9 |

---

## 🚀 How to Install Plugins

There are two primary ways to install these plugins into your BombSquad game: directly through the in-game **Plugin Manager** (recommended), or by placing files into your system's **mods directory**.

### Option 1: In-Game via Community Plugin Manager (Recommended)

The **Plugin Manager** is an in-game graphical installer. Once installed, you can browse, install, toggle, and auto-update plugins without touching filesystem directories.

#### 1. Install Plugin Manager (One-Time Setup)
If you do not already have Plugin Manager installed:
1. In BombSquad, open **Settings** → **Advanced** → enable **"Show Dev Console Button"**.
2. Tap the **Dev Console (`>_`)** button in the corner of your screen.
3. Paste this one-liner and press enter:
   ```python
   import urllib.request;import _babase;import os;url="https://github.com/bombsquad-community/plugin-manager/releases/latest/download/plugin_manager.py";plugin_path=os.path.join(_babase.env()["python_directory_user"],"plugin_manager.py");file=urllib.request.urlretrieve(url)[0];fl=open(file,'r');f=open(plugin_path,'w+');f.write(fl.read());fl.close();f.close();print("SUCCESS")
   ```
4. Restart BombSquad. A new **Plugin Manager** menu entry will appear.

#### 2. Install from Custom GitHub Repositories (Custom Sources)
Plugin Manager allows adding custom GitHub sources directly in the UI:
1. Open BombSquad → **Plugin Manager**.
2. Go to **Settings** (or **Sources**) inside the Plugin Manager UI.
3. Select **Add Source**.
4. Enter this repository path:
   ```text
   bipinkrish/bombstation
   ```
   *(or specify a branch: `bipinkrish/bombstation@main`)*
5. The plugins from this repository (`unlock_max_players`, `unlock_all_characters`) will now appear in your in-game catalog with description, version, and a one-click **Install** button!

#### 3. Toggle and Manage Installed Plugins
- Open **Settings** → **Plugins** in BombSquad.
- Check the box next to any installed plugin to enable or disable it.
- Changes take effect immediately or upon game restart.

---

### Option 2: Manual Mods Directory Placement

You only need to know your system's mod directory path once for all plugins:

| Platform | Directory Location |
| :--- | :--- |
| **macOS** | `~/Library/Application Support/BombSquad/mods/` |
| **Linux** | `~/.bombsquad/mods/` |
| **Windows** | `%LOCALAPPDATA%\BombSquad\mods\` |
| **Android** | Android storage path or synced via [Ballistica Cloud Workspace](https://ballistica.net/) |

Simply copy any `.py` plugin file (e.g. [`unlock_all_characters.py`](unlock_all_characters.py) or [`unlock_max_players.py`](unlock_max_players.py)) into that folder and restart BombSquad.

---

### Option 3: Instant Dev Console Injection (Temporary / Testing)

If you want to apply the effect immediately without saving a file:

- **Unlock Max Players (999):**
  ```python
  import babase; cfg = babase.app.config; cfg["Coop Game Max Players"] = 999; cfg["Team Game Max Players"] = 999; cfg["Free-for-All Max Players"] = 999; cfg.apply_and_commit(); print("MAX PLAYERS UNLOCKED")
  ```

- **Unlock All Characters:**
  ```python
  import bascenev1lib.actor.spazappearance as sa; sa.get_appearances = lambda include_locked=True, purchases=None: list(sa.bs.app.classic.spaz_appearances.keys()); import bascenev1 as bs; bs.getplayercharacters = sa.get_appearances; print("ALL CHARACTERS UNLOCKED")
  ```

---

## ❓ FAQ: "If the one-liner worked, why is the actual plugin file so big?"

This is a common question: **The Dev Console one-liner is only 1 line, while `unlock_all_characters.py` is over 250 lines and 8 KB! Why?**

Here is why the real plugin requires significantly more code:

### 1. Persistence & Autoload Lifecycle (`babase.Plugin`)
- **The One-Liner:** Runs once in memory while the game is running. The moment you close or restart BombSquad, the memory patch is gone forever. You would have to re-open the Dev Console and paste it every single session.
- **The Plugin File:** Hooks into the Ballistica lifecycle via `# ba_meta export babase.Plugin` and `on_app_running()`. It automatically loads and executes silently every time BombSquad boots up.

### 2. Multi-Layer Engine Coverage
The one-liner only patches a single function (`bascenev1lib.actor.spazappearance.get_appearances`). In practice, BombSquad queries characters in multiple distinct subsystems:
- **Character Picker UI (`bauiv1lib.characterpicker`):** The dropdown where you choose your skin in settings.
- **Lobby Chooser (`bascenev1._lobby`):** Where players press punch/bomb to select skins before a match starts.
- **Player Spawning (`bascenev1.getplayercharacters`):** Used during active match instantiation.
- **Store Purchase Registry (`classic.purchases`):** Entitlement checks that verify whether an item was "bought".

If you only patch one function with a one-liner, opening the profile editor or lobby can still show locked icons or throw errors. The full plugin hooks **all** of these subsystems simultaneously.

### 3. API Version Compatibility & Crash Protection (API 7, 8, and 9)
- **The One-Liner:** Assumes a specific internal layout (e.g. API 9 `bascenev1lib`). If run on an API 7 or 8 build (BombSquad 1.7.0–1.7.36), it crashes with `ModuleNotFoundError: No module named 'bascenev1lib'`.
- **The Plugin File:** Uses structured `try...except` safety wrappers, dynamic feature detection, and compatibility branches for modern API 9 (`babase`, `bascenev1`, `bauiv1`) and legacy API 7/8 (`bastd`, `bs`). If an internal engine function changes, the plugin fails gracefully rather than crashing your game.

### 4. Dynamic Discovery & Entitlement Synthesis
Characters and skins can be added by mods or game updates at any time:
- **The One-Liner:** If `spaz_appearances` is not yet populated during boot, the one-liner can return an empty list or crash when reading keys.
- **The Plugin File:** Dynamically probes the engine appearance registers (`classic.spaz_appearances` across API 7, 8, and 9), generates synthetic store purchase keys (`characters.<name>`), and includes fallback handling so both official characters and custom modded characters unlock reliably.

### 5. Plugin Manager Indexing (`plugman` Metadata)
To allow the in-game **Plugin Manager** to display a plugin card, title, author, version, description, and update checks, the file must define structured metadata:
```python
plugman = {
    "plugin_name": "unlock_all_characters",
    "description": "Unlocks all characters for local/custom games and profile creation.",
    "external_url": "https://github.com/efroemling/ballistica",
    "authors": [{"name": "BombStation", "email": "", "discord": ""}],
    "version": "1.0.0",
}
```
The one-liner contains no metadata and cannot be managed, toggled, or updated by Plugin Manager.

### Summary Comparison

| Feature | Dev Console One-Liner | Full Plugin File (`.py`) |
| :--- | :--- | :--- |
| **Size** | ~1 line (~180 bytes) | ~70–260 lines (~2.7–8.2 KB) |
| **Persistent across restarts** | ❌ No (lost on quit) | ✅ Yes (autoloads on boot) |
| **Plugin Manager UI support** | ❌ No | ✅ Yes (`plugman` metadata) |
| **Can toggle on/off in Settings** | ❌ No | ✅ Yes |
| **API 7 / 8 / 9 Compatibility** | ❌ Crashes on mismatched API | ✅ Safe across engine versions |
| **Subsystem coverage** | ⚠️ Only 1 function | ✅ Spaz, Lobby, UI Picker, Store Keys |
| **Offline fallback support** | ❌ May return empty list | ✅ Guaranteed fallback character manifest |

---

## 🛠️ Creating Your Own Plugin

To create a new plugin compatible with Plugin Manager and BombSquad API 9:

```python
# ba_meta require api 9
"""My Custom BombSquad Plugin."""
from __future__ import annotations
import babase

plugman = {
    "plugin_name": "my_custom_plugin",
    "description": "Short description of what the plugin does.",
    "authors": [{"name": "YourName", "email": "", "discord": ""}],
    "version": "1.0.0",
}

# ba_meta export babase.Plugin
class MyPlugin(babase.Plugin):
    def on_app_running(self) -> None:
        babase.screenmessage("My Plugin has loaded successfully!", color=(0, 1, 0))
```

> [!TIP]
> **Ballistica Metascan Rule:** The `# ba_meta export babase.Plugin` declaration **must immediately precede** the `class` definition (with no docstrings or statements between them), while `# ba_meta require api 9` belongs at the top of the file.

---

## 🧪 Testing Plugins & Executable Setup

BombStation includes automated scripts to obtain the suitable game/server binary for your OS and run comprehensive validation tests.

### 1. Download Suitable Ballistica Executable (`scripts/get_bombsquad.py`)

This script detects your operating system (`macOS`, `Linux`, `Windows`) and CPU architecture (`arm64`, `x86_64`), queries the official Ballistica repository ([files.ballistica.net/bombsquad/builds/](https://files.ballistica.net/bombsquad/builds/)), and extracts the latest executable locally into `bin/bombsquad/`.

```bash
# Download and extract the headless engine server (ideal for CLI testing):
python3 scripts/get_bombsquad.py --target server

# Or download the macOS GUI desktop client (.dmg):
python3 scripts/get_bombsquad.py --target client

# Check available matching builds without downloading:
python3 scripts/get_bombsquad.py --check
```

### 2. Run Plugin Test Suite (`scripts/test_plugins.py`)

Run static AST checks, mock subsystem tests, and real-time live engine integration tests with a single command:

```bash
python3 scripts/test_plugins.py
```

The test runner validates:
1. **Static AST & Syntax:** Verifies Python AST, API 9 requirement tags, metascan export positioning, and `plugman` dictionary structure.
2. **Mock Subsystem Tests:** Emulates `babase` and `bascenev1` configurations to test 999-player limit commits and appearance discovery logic in isolation.
3. **Live Ballistica Engine Integration:** Boots the native `bombsquad_headless` binary with `plugins/` mounted as the active mods directory (`-m`), verifying engine meta-scanner discovery, `babase.Plugin` export registration, and runtime execution of `on_app_running()`.
