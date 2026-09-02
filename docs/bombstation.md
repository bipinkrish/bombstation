# BombSquad & Ballistica: Complete Developer & Modding Guide

> Comprehensive technical reference for BombSquad and the Ballistica engine — covering architecture, modding workflows, Dev Console, cloud workspaces, dedicated server hosting, asset pipelines, input topologies, performance tuning, and AI agent integration.

---

## Table of Contents

1. [Executive Overview & Game Architecture](#1-executive-overview--game-architecture)
2. [Platform Availability, Downloads & The iOS Reality Check](#2-platform-availability-downloads--the-ios-reality-check)
3. [Licensing: Open Source vs. Proprietary Breakdown](#3-licensing-open-source-vs-proprietary-breakdown)
4. [Modding Capabilities & Mod Taxonomy](#4-modding-capabilities--mod-taxonomy)
5. [Modding Workflows & Environment Setup](#5-modding-workflows--environment-setup)
6. [In-Game Dev Console & Instant Code Execution](#6-in-game-dev-console--instant-code-execution)
7. [Plugin Manager & Custom Plugin Distribution](#7-plugin-manager--custom-plugin-distribution)
8. [Headless / Dedicated Server Hosting](#8-headless--dedicated-server-hosting)
9. [Asset Pipeline & 3D Content Creation](#9-asset-pipeline--3d-content-creation)
10. [Character Unlocking Mechanics & Store Security](#10-character-unlocking-mechanics--store-security)
11. [Multiplayer Input, Player Limits & Network Optimization](#11-multiplayer-input-player-limits--network-optimization)
12. [All-in-One GUI Builder Feasibility ("BombSquad Studio")](#12-all-in-one-gui-builder-feasibility-bombsquad-studio)
13. [Ballistica MCP Server & AI Coding Agent Integration](#13-ballistica-mcp-server--ai-coding-agent-integration)
14. [Master Directory of Repositories & Resources](#14-master-directory-of-repositories--resources)

---

## 1. Executive Overview & Game Architecture

### About BombSquad & Ballistica
**BombSquad** is an 8-player physics-driven arcade party game created by solo developer **Eric Froemling** (ex-Pixar, Limbic), actively developed and maintained since 2011. It features chaotic mini-games characterized by advanced ragdoll physics, dynamic explosions, and rich character variety (pirates, ninjas, barbarians, chefs, cyborgs, and wizards).

The game is built on top of **Ballistica**, a custom-written C++ and Python engine designed specifically for physics-based multiplayer diorama environments.

### Core Gameplay Mechanics
- **Physics-Driven Combat:** Punch, grab, lift, and throw opponents; toss bombs, land mines, and TNT blocks; freeze opponents with ice bombs and shatter them; ring-out opponents by throwing them off cliff edges.
- **Bomb Arsenal:** Standard timed bombs, sticky bombs, ice bombs, land mines, impact bombs, and TNT barrels.
- **Game Modes:**
  - **Team Games:** Capture-the-Flag, Football, Assault, Hockey, Keep Away.
  - **Free-for-All (FFA):** Epic Slow-Motion Elimination, King-of-the-Hill, Target Practice.
  - **Co-op Campaigns (12+ missions):** Pro Onslaught, Rookie Onslaught, Infinite Runaround, Boss Battles, Football Challenge.

### Technical Architecture
- **Engine Core:** Custom high-performance C++ rendering and dynamics engine utilizing **OpenGL** and **Open Dynamics Engine (ODE)** / **Bullet Physics**.
- **Scripting Layer:** Embedded **Python 3** runs all high-level game logic, user interfaces, mini-game rules, character behaviors, and server administration scripts.
- **Networking Protocol:** Custom low-latency **UDP-based protocol** for local network and internet multiplayer. Because Ballistica synchronizes complex physics states between the host and clients, responsiveness is bandwidth- and latency-sensitive.
- **Ballistica V2 Account Architecture:** Introduced in BombSquad 1.7+, replacing legacy V1 accounts:
  - Globally unique account names (Ballistica ID).
  - Authentication via Google Play, Apple Game Center, or email/password.
  - Cloud-synced user preferences, statistics, and cloud workspaces.
  - Squads and community infrastructure.

---

## 2. Platform Availability, Downloads & The iOS Reality Check

### Platform Availability Matrix

| Platform | Official Status | Pricing / Model | Notes & Requirements |
| :--- | :--- | :--- | :--- |
| **macOS** | ✅ Official (Mac App Store) | ~$4.99 / In-app purchases | Full game client; native Apple Silicon & Intel support; full controller + Remote app support. |
| **iOS / iPadOS** | ❌ **No Game Client** | Free (Controller app only) | **Only BombSquad Remote exists.** The App Store listing explicitly states *"Only for Mac"*. |
| **Android** | ✅ Official (Google Play) | Free (with ads / IAPs) | Phones, tablets, and Android TV (requires physical gamepad on TV). BombSquad Remote also supported. |
| **Windows** | ✅ Official Desktop Build | Free official download | Standalone installer / portable zip. Requires Visual C++ Redistributable. |
| **Linux** | ✅ Official Desktop Build | Free official download | Standalone tarball / package builds; headless server mode supported natively. |
| **Steam** | ✅ Confirmed Release (2026) | Steam release | Full PC desktop multiplayer build. |
| **OUYA** | ⚠️ Legacy (Discontinued) | Original launch platform | Original 2011 launch target; playable today only on archived/rooted consoles. |

### The iOS Reality Check
A frequent point of confusion is whether BombSquad runs natively on iPhones or iPads:
1. **No Official iOS Game Client:** Eric Froemling developed BombSquad with a Mac-first, physical controller-centric philosophy (gamepads, keyboards, Wiimotes) rather than touchscreens.
2. **Third-Party Clones & Fake Apps:** Any iOS apps claiming to be the full BombSquad game (such as *"Bombsquad - Defuse the Bomb"* by Omnilabs LTD) are unrelated clones, adware, or fraudulent ports.
3. **BombSquad Remote (Free):** Apple devices are officially supported as **wireless network controllers** through the free *BombSquad Remote* app on the App Store (compatible with iOS 6.1+, iPadOS, and visionOS). It supports both on-screen joystick and accelerometer tilt modes.
4. **Why not compile the game to iOS yourself?**
   - While the engine C++ and Python scripts are open source, **proprietary assets** (character meshes, sounds, textures) cannot be bundled.
   - iOS development requires a Mac with Xcode (100GB+ toolchain), a paid Apple Developer Account ($99/year), and strict code-signing.
   - The native iOS game target is unmaintained in upstream Ballistica (only the Remote app is maintained).
   - *Viable path:* If you wish to deploy to iOS, fork Ballistica, create completely original models and audio, and build your own distinct title.

### Official & Community Download Links
- **Official PC / Linux Builds:** [files.ballistica.net/bombsquad/builds/](https://files.ballistica.net/bombsquad/builds/)
- **macOS App Store:** [apps.apple.com/app/bombsquad/id416482767](https://apps.apple.com/app/bombsquad/id416482767)
- **Android Google Play:** [play.google.com/store/apps/details?id=net.froemling.bombsquad](https://play.google.com/store/apps/details?id=net.froemling.bombsquad)
- **BombSquad Remote (iOS):** [apps.apple.com/app/bombsquad-remote/id416471850](https://apps.apple.com/app/bombsquad-remote/id416471850)
- **BombSquad Remote (Android):** [play.google.com/store/apps/details?id=net.froemling.bsremote](https://play.google.com/store/apps/details?id=net.froemling.bsremote)
- **Community Modded Client / Modpack:** [bombsquad-community.web.app/download](https://bombsquad-community.web.app/download)

---

## 3. Licensing: Open Source vs. Proprietary Breakdown

BombSquad operates under a **hybrid open-core licensing model**.

### Summary of What is Open vs. Proprietary

```
efroemling/ballistica Repository (MIT License)
├── src/                    -> C++ engine core, graphics, dynamics, networking
├── pconfig/ & ballisticakit* -> Complete Python game logic, mini-games, UI
├── tools/                  -> Asset converters, build scripts, linters
└── docs/ & wiki            -> API documentation and guides

Proprietary Assets (All Rights Reserved — Eric Froemling)
├── .bob files              -> 3D character models and skeletal animations
├── .cob files              -> 3D collision meshes
├── .ktx2 files             -> Compressed textures and UI art
├── Audio & Music           -> Sound effects, voice lines, soundtracks
└── files.ballistica.net    -> Official prebuilt executables and V2 backend
```

### Detailed Breakdown

| Category | Component | License | Location / Details |
| :--- | :--- | :--- | :--- |
| **Open Source** | C++ Engine Core | **MIT License** | `src/` in the Ballistica repository (graphics, physics bindings, networking, rendering). |
| **Open Source** | Python Game Scripts | **MIT License** | `pconfig/` and `ballisticakit-*` packages (all standard mini-games, UI classes, character logic). |
| **Open Source** | Pipeline Tools | **MIT License** | `tools/` directory (model exporters, texture encoders, string/locale managers). |
| **Open Source** | Build Infrastructure | **MIT License** | CMake, Makefiles, Docker configurations, Woodpecker CI pipelines. |
| **Proprietary** | Character Models | **Proprietary** | `.bob` binary meshes and vertex animations. |
| **Proprietary** | Collision Models | **Proprietary** | `.cob` collision hull data. |
| **Proprietary** | Audio & Textures | **Proprietary** | All sound effects, musical tracks, and `.ktx2` texture files. |
| **Proprietary** | Prebuilt Binaries | **Proprietary** | Official executable releases on `files.ballistica.net` and app stores. |
| **Proprietary** | Cloud Backend | **Proprietary** | Ballistica V2 authentication servers, cloud workspace backend, global account databases. |

### Legal Permissions & Boundaries
- **You CAN:**
  - Fork, modify, and redistribute the engine source code and Python game scripts.
  - Create and share plugins, custom maps, game modes, characters, and server tools.
  - Build and sell your own original game built on the Ballistica engine, provided you replace all proprietary assets with your own original content.
- **You CANNOT:**
  - Redistribute complete prebuilt copies of BombSquad (the game executable bundled with official proprietary assets) without explicit permission.
  - Extract, decompile, or repackage proprietary `.bob`, `.cob`, or `.ktx2` assets for standalone commercial or third-party use.
- **Contact for Licensing Queries:** `support@froemling.net`

---

## 4. Modding Capabilities & Mod Taxonomy

BombSquad provides an extensive Python API that allows developers to customize virtually every facet of the game without recompiling C++ binaries.

```
                    ┌─────────────────────────┐
                    │    BombSquad Modding    │
                    └────────────┬────────────┘
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
   Gameplay Logic           Visual & Assets         Administration
  - Custom Mini-Games     - Custom 3D Maps        - Server Scripts
  - Powerups & Weapons    - Custom Characters     - Admin Commands
  - UI / HUD Overrides    - Asset Converters      - Anti-Cheat & Stats
```

### Mod Types & Corresponding APIs

| Mod Type | What You Can Build | Key APIs & Base Classes |
| :--- | :--- | :--- |
| **Custom Mini-Games** | New game modes (e.g. Meteor Shower, Custom CTF, Paintball, Dodgeball, Boss Fights). | Subclass `bascenev1.Activity` / `bsGame.py`, implement `on_begin()`, `spawn_player()`, `handlemessage()`. |
| **Custom Maps** | New 3D battle arenas with custom spawn nodes, flag spots, and powerup drops. | Subclass `bascenev1.Map` / `bsMap.py`, export `.bob` and `.cob` meshes from Blender. |
| **Custom Characters** | New characters, skins, voice profiles, and combat statistics (health, movement speed, punch force). | Subclass `bsCharacter.py` / `spazappearance`, register in `classic.spaz_appearances`. |
| **Powerups & Weapons** | Custom bomb types (cluster, singularity, poison, nuke), shields, laser rays, jetpacks. | Subclass `bascenev1.Powerup` / `bsPowerup.py`, custom `Bomb` node definitions. |
| **Server Plugins** | Headless server admin suites, chat filters, auto-balancing, player statistics tracking, Discord bots. | Server event hooks, socket listeners, `server-scripts` framework. |
| **UI / UX Mods** | Custom game menus, scoreboard overlays, HUD indicators, party lobbies, sound boards. | Override `bauiv1` / `bsUI.py` widget hierarchies and window classes. |
| **Modded Clients** | Preconfigured community game distributions bundled with curated mods, loaders, and tweaks. | `bombsquad-community/modpack`, `plugin-manager`. |
| **Asset Tools** | Parsers and converters for proprietary binary formats. | `bombsquad02420/bombsquad-filespec`, Blender 2.80+ export scripts. |

---

## 5. Modding Workflows & Environment Setup

### Ballistica API Versions
BombSquad has evolved through distinct API versions. When developing or downloading plugins, ensure version compatibility:

- **API 9 (BombSquad 1.7.37+):** Current standard. Uses modular imports:
  ```python
  import babase       # Core engine, app state, config
  import bascenev1    # In-game physics, actors, activities, maps
  import bauiv1       # User interface widgets, windows, dialogs
  ```
- **API 8 (BombSquad 1.7.20 – 1.7.36):** Transitional modular release.
- **API 7 (BombSquad 1.7.0 – 1.7.19):** Transitional release introducing V2 accounts and initial modularization.
- **API 6 (BombSquad ≤ 1.6):** Legacy monolithic namespace (`import bs`). Use `baport` to modernize legacy API 6 plugins to API 9.

---

### Workflow 1: Ballistica Cloud Workspaces (Recommended for Mobile & PC)
Cloud Workspaces allow you to edit Python scripts in a web browser and have them automatically synchronized to your game client upon launch — eliminating manual file copying and ADB shell commands.

1. Navigate to [ballistica.net](https://ballistica.net/) on any browser (phone, tablet, or PC).
2. Sign in with your **Ballistica V2 Account** (same credentials used in-game).
3. Go to **Workspaces** → Click **"Create Workspace"**.
4. Create or edit your Python plugin scripts directly in the web code editor.
5. In your BombSquad client, your workspace automatically syncs and activates!

---

### Workflow 2: In-Game Dev Console
For rapid testing, debugging, and running one-off scripts directly inside a running game instance:
1. Open **Settings** → **Advanced** → Enable **"Show Dev Console Button"**.
2. Tap the newly visible **`>_`** button in the top-right corner.
3. Type or paste Python code and tap **Run**.

---

### Workflow 3: Mobile Modding Without a PC
You can develop, install, and manage mods entirely on Android without needing a computer:
1. **Web Workspace Editor:** Use [ballistica.net](https://ballistica.net/) in Chrome or Firefox on your phone to edit scripts.
2. **In-Game Dev Console:** Run code directly inside the Android game to write files to the internal mods folder.
3. **Mobile Code Editors:** Use apps like **Acode** (from Google Play or F-Droid) to edit `.py` scripts locally with syntax highlighting, saving them into the BombSquad mods folder (or using Android 11+ Document Provider / Shizuku).

---

### Workflow 4: PC Development Workflow (VS Code / PyCharm)
For full-scale plugin and game-mode development:
1. Clone the Ballistica repository or create a standalone plugin workspace:
   ```bash
   git clone https://github.com/efroemling/ballistica.git
   cd ballistica
   ```
2. Open the project in **VS Code** or **PyCharm**. Configure Python 3.10+ / 3.11 interpreter.
3. Run linting and formatting tools provided by the engine:
   ```bash
   make format      # Auto-formats Python and C++ code
   make preflight   # Full test suite, typing, and style validation
   ```
4. Place your active test plugins in the OS-specific local mods directory:

| Operating System | Default User Mods Directory |
| :--- | :--- |
| **macOS** | `~/Library/Application Support/BombSquad/mods/` |
| **Linux** | `~/.bombsquad/mods/` |
| **Windows** | `%LOCALAPPDATA%\BombSquad\mods\` |
| **Android** | `Android/data/net.froemling.bombsquad/files/mods/` *(or via Cloud Workspace)* |

---

## 6. In-Game Dev Console & Instant Code Execution

### How to Enable the Dev Console
1. Launch BombSquad.
2. Go to **Settings** → **Advanced**.
3. Toggle on **"Show Dev Console Button"**.
4. The console button (`>_`) will now appear in your settings and pause menus.

---

### Key Dev Console One-Liners

#### 1. Install Plugin Manager (Instant Setup)
Downloads the latest release of the community Plugin Manager directly into your user mods directory without requiring root, ADB, or file managers:

```python
import urllib.request;import _babase;import os;url="https://github.com/bombsquad-community/plugin-manager/releases/latest/download/plugin_manager.py";plugin_path=os.path.join(_babase.env()["python_directory_user"],"plugin_manager.py");file=urllib.request.urlretrieve(url)[0];fl=open(file,'r');f=open(plugin_path,'w+');f.write(fl.read());fl.close();f.close();print("SUCCESS")
```

#### 2. Remove 8-Player Limit (Unlock up to 999 Players)
The 8-player ceiling is a soft limit configured in game preferences. To lift it across all game modes:

**Modern API 9 (BombSquad 1.7.37+):**
```python
import babase; cfg = babase.app.config; cfg["Coop Game Max Players"] = 999; cfg["Team Game Max Players"] = 999; cfg["Free-for-All Max Players"] = 999; cfg.apply_and_commit(); print("MAX PLAYERS UNLOCKED TO 999")
```

**Legacy API 7 / 8:**
```python
import bascenev1 as bs; config = bs.get_config(); config['Coop Game Max Players'] = 999; config['Team Game Max Players'] = 999; config['Free-for-All Max Players'] = 999; bs.write_config(); print("MAX PLAYERS UNLOCKED")
```

#### 3. Unlock All Characters for Local / Custom Play
Unlocks all characters for local offline play and private testing:

```python
import bascenev1lib.actor.spazappearance as sa; sa.get_appearances = lambda include_locked=True, purchases=None: list(sa.bs.app.classic.spaz_appearances.keys()); import bascenev1 as bs; bs.getplayercharacters = sa.get_appearances; print("ALL CHARACTERS UNLOCKED FOR LOCAL PLAY")
```

---

## 7. Plugin Manager & Custom Plugin Distribution

### What is Plugin Manager?
The **BombSquad Community Plugin Manager** is an in-game graphical installer and manager that provides:
- One-click installation and removal of community mods.
- Automatic version checking and updates.
- In-game source code viewer before installing.
- Direct configuration of mod settings through UI menus.
- Support for adding third-party GitHub repositories as custom sources.

> [!NOTE]
> The Plugin Manager is an **installation and management tool**, not a visual drag-and-drop game builder.

---

### Three Ways to Install Plugin Manager
1. **Dev Console (Easiest):** Run the one-liner script shown in Section 6.
2. **Cloud Workspace:** Upload `plugin_manager.py` to your workspace at [ballistica.net](https://ballistica.net/).
3. **Manual File Placement:** Download `plugin_manager.py` from the official repository and place it in your local `mods/` directory.

---

### Structuring a Plugin for Plugin Manager (`plugman` Metadata)
To allow Plugin Manager to index, describe, and configure your plugin, include a `plugman` dictionary in your Python script:

```python
# ba_meta require api 9
"""My Custom Gamemode Plugin."""

# ba_meta export plugin
class MyCustomPlugin:
    """Plugin definition."""
    def __init__(self) -> None:
        pass

# Plugin Manager metadata block
plugman = {
    "name": "Super Explosives Mod",
    "version": "1.2.0",
    "api": 9,
    "author": "YourName",
    "description": "Increases explosion radius and adds cluster bombs.",
    "category": "Gameplay",
    "requirements": [],
}
```

---

### Distributing via Your Own Custom GitHub Catalog (No Upstream PR Needed!)
You do not need to wait for your pull request to be merged into the official repository to distribute plugins. The Plugin Manager supports **custom third-party GitHub sources**:

```
Your GitHub Repo (e.g. yourname/bombsquad-plugins)
├── plugins/
│   ├── super_bombs.py
│   └── custom_arena.py
└── index.json (optional release catalog)
```

1. Fork the template repository: [bombsquad-community/sample-plugin-source](https://github.com/bombsquad-community/sample-plugin-source).
2. Rename the repository (e.g., `username/my-bombsquad-mods`).
3. Add your Python plugins to the repository.
4. Instruct players to open **Plugin Manager** → **Settings** → **Add Source** → Enter `username/my-bombsquad-mods` (or specify a branch: `username/my-bombsquad-mods@main`).
5. Players can now browse, install, and update your mods directly inside their game client!

---

## 8. Headless / Dedicated Server Hosting

BombSquad includes native support for running lightweight headless servers on Linux (VPS, Ubuntu, Debian, or Raspberry Pi) to host persistent 24/7 custom matches.

```
                  ┌──────────────────────────────┐
                  │    Linux Server / VPS        │
                  │  (Headless Ballistica Engine)│
                  └──────────────┬───────────────┘
                                 │ UDP Port 43210
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
    PC Players            Android Players          Mac Players
(Gamepads / Keys)        (Touch / Remotes)      (Gamepads / Remotes)
```

### Server Setup Guide (Ubuntu / Debian)

#### 1. Install System Dependencies
```bash
sudo apt update
sudo apt install -y python3.10 python3-pip tmux git curl
```

#### 2. Clone the Modded Server Repository
```bash
git clone https://github.com/imayushsaini/Bombsquad-Ballistica-Modded-Server.git
cd Bombsquad-Ballistica-Modded-Server
```

#### 3. Configure `config.yaml`
Edit `config.yaml` using `nano` or `vim` to set server metadata:
```yaml
party_name: "My Custom BombSquad Arena"
port: 43210
max_party_size: 16
admin_accounts:
  - "pb-yourAccountIDHere"
playlist: "Default Teams"
auto_balance_teams: true
enable_stats: true
```

#### 4. Launch the Server
Make executables runnable and start the server:
```bash
chmod 777 bombsquad_server dist/bombsquad_headless
./bombsquad_server
```

*(Tip: Run inside a `tmux` or `screen` session to keep it running after disconnecting from SSH).*

#### 5. Connecting to the Server
Players join by opening BombSquad → **Gather** → **Manual** → **"Connect via IP"** → Enter `<Server-IP>:43210`.

---

## 9. Asset Pipeline & 3D Content Creation

BombSquad uses specialized binary formats for 3D meshes and collision hulls to ensure rapid streaming and evaluation on low-power mobile devices.

### File Format Overview
- **`.bob` (Ballistica Object Binary):** Proprietary 3D character and environmental models, bone skeletons, and vertex animation data.
- **`.cob` (Collision Object Binary):** Optimized convex and triangular collision hulls used by the ODE/Bullet physics engine.
- **`.ktx2` (Khronos Texture 2.0):** GPU-compressed texture containers offering low memory footprints and fast texture decompression.

---

### Blender Add-on (`bombsquad02420/blender-addon`)
The official community Blender integration allows you to author characters, arenas, and props in Blender (version 2.80 through 4.x) and export directly into BombSquad:

1. Download the add-on from [bombsquad02420/blender-addon](https://github.com/bombsquad02420/blender-addon).
2. In Blender: **Edit** → **Preferences** → **Add-ons** → **Install** → Select `.zip`.
3. Author your model:
   - Mark visual geometries for `.bob` export.
   - Design simplified collision geometries and assign them for `.cob` export.
   - Place locator empties for player spawns (`spawn1`, `spawn2`), flag locations (`flag1`), and powerup drop points.
4. Export `.bob` and `.cob` directly into your mod directory.

---

### Asset Parsing & Specification Tools
- **`bombsquad-filespec`:** Python and JavaScript libraries for unpacking, converting, inspecting, and repacking `.bob`, `.cob`, and `.ktx2` files: [github.com/bombsquad02420/bombsquad-filespec](https://github.com/bombsquad02420/bombsquad-filespec).
- **`bacloud.js`:** Node.js library for interacting programmatically with the Ballistica cloud workspace API: [github.com/bombsquad02420/bacloud.js](https://github.com/bombsquad02420/bacloud.js).

---

## 10. Character Unlocking Mechanics & Store Security

### Official Game Store Architecture
In the official game, characters and cosmetics are governed by account entitlements:
1. **Tickets:** Earned organically through co-op campaign victories, tournament placements, and daily login rewards.
2. **In-App Purchases:** Tickets purchased via official store backends (Google Play, Apple Mac App Store).
3. **Seasonal Releases:** Specific characters (e.g. *Easter Bunny*, *Santa Claus*, *Anniversary Mascot*) become available during targeted real-world holidays.

---

### Risks of Modded APKs
Third-party websites frequently advertise "Unlimited Tickets" or "All Characters Unlocked" APKs. Developers and players should be aware of the serious drawbacks:

> [!CAUTION]
> **Mod APK Hazards:**
> - **Account Bans:** Using modified binaries that tamper with network packets or store tickets will trigger permanent server-side bans on your Ballistica V2 account.
> - **Security Risks:** The vast majority of third-party APK sites bundle spyware, crypto-miners, or trojans.
> - **Multiplayer Desynchronization:** Modified binaries lag behind upstream releases, resulting in physics desyncs, missing assets, and disconnects on official servers.

### Legitimate Community Modding Approach
For custom game modes or private LAN games among friends, developers create custom character classes or override local appearance lists within their own private scripts without modifying game binaries or attempting store bypasses.

---

## 11. Multiplayer Input, Player Limits & Network Optimization

### Input Architecture & Mixed Input
BombSquad has one of the most flexible local input systems in gaming. On PC, Mac, and Linux, the engine supports **simultaneous mixed inputs in the exact same match**:
- Up to 8+ USB or Bluetooth gamepads (Xbox 360/One/Series, PS3/PS4/PS5, Nintendo Switch Pro, generic HID gamepads).
- Up to 2 players on a single keyboard (using split keybindings).
- Up to 8 mobile phones or tablets connected as wireless controllers via the free **BombSquad Remote** app.

---

### The 8-Player Soft Limit Explained
BombSquad sets an 8-player default cap for:
1. **UI & Screen Clutter:** Keeping name tags and scoreboard widgets readable on mobile screens.
2. **Controller Discovery:** Bluetooth stack saturation when pairing multiple physical controllers to a single phone.
3. **Physics Budget:** Ensuring 60 FPS physics calculation on low-end mobile CPUs.

The engine itself is capable of running far higher counts. Eric Froemling has demonstrated smooth testing sessions with **24 simultaneous physical gamepads** on a single desktop host. You can safely remove the limit using the config snippet in Section 6.

---

### Troubleshooting Mobile Hotspot & LAN Lag

```
❌ HIGH LAG TOPOLOGY (Peer-to-Peer over 2.4GHz Hotspot)
Phone (Host + Screen) <--- 2.4GHz Wi-Fi ---> Phones (Full Game Clients)
Result: Massive packet loss, CPU throttling, physics desyncs.

✅ ZERO LAG TOPOLOGY (PC Ethernet Host + BombSquad Remote)
[TV / Big Monitor]
       ▲
       │ HDMI
[PC / Mac Host] <=== Ethernet ===> [5GHz / 6GHz Wi-Fi Router]
                                            ▲
                          ┌─────────────────┴─────────────────┐
                   Physical Gamepads                  Phones via BombSquad Remote
                     (USB / 2.4G)                       (Controller-only traffic)
```

#### Why Mobile Hotspots Lag:
- BombSquad uses client-side physics prediction with server authority. Every bomb explosion, ragdoll punch, and character toss requires state synchronization.
- When phones connect as **full networked game clients** over a mobile hotspot, the hotspot phone must simultaneously handle CPU rendering, physics computation, cellular routing, and multi-client Wi-Fi packet distribution — creating severe jitter.

#### The Golden LAN Party Setup:
1. **Host on PC or Mac:** Run the full game on a laptop or desktop connected via Ethernet cable to the router.
2. **Use Phones as Remotes Only:** Have friends download **BombSquad Remote**, which only transmits lightweight input coordinates rather than full game physics.
3. **Use 5 GHz or 6 GHz Wi-Fi:** Avoid 2.4 GHz bands, guest Wi-Fi networks, and Wi-Fi extenders/repeaters.
4. **Close Heavy Background Traffic:** Disable cloud backups, VPNs, and video streaming on the local network.

---

### Code Optimization Guidelines for Custom Mods

When authoring custom mini-games or plugins intended for large groups (8–16+ players):

1. **Avoid Per-Frame Python Logic:** Never perform heavy calculations, distance checks, or list comprehensions inside per-frame callbacks. Use `babase.Timer` set to reasonable intervals (e.g. 0.1s or 0.25s).
2. **Pool Nodes & Explosives:** Avoid constantly spawning and destroying heavy node trees. Reuse existing nodes whenever feasible.
3. **Cap Entity Counts:** Enforce a hard ceiling on the maximum number of active bombs, projectiles, and particle emitters.
4. **Use Simplified Collision Meshes:** Ensure `.cob` collision meshes are low-poly convex hulls rather than high-density visual geometries.
5. **Never Load Assets Mid-Match:** Pre-load all textures, models, and sound buffers during `on_begin()` rather than during live combat.
6. **Event-Driven UI:** Update scoreboards and player statistics only upon state change events (kills, points) rather than polling on ticks.

---

## 12. All-in-One GUI Builder Feasibility ("BombSquad Studio")

### Clarification of Current Community Tools
There is a common misconception that an all-in-one visual IDE exists for BombSquad:
- **Plugin Manager** is an in-game mod installer/browser, not an IDE.
- **Blender + Add-on** is the visual level and character editor.
- **Cloud Workspaces** provide in-browser text editing and cloud deployment.
- **Dev Console** is an in-game Python evaluation terminal.

No single visual application currently combines code editing, 3D map building, live scene preview, and deployment into a unified GUI.

---

### Blueprint for an All-in-One "BombSquad Studio"

If building a unified visual suite, it would require the following architectural components:

| Module | Core Functionality | Implementation Tech |
| :--- | :--- | :--- |
| **Project Dashboard** | Template selection, API target (API 7/8/9), dependency management, versioning. | Electron, Tauri, or PySide6 / PyQt6. |
| **Code Editor** | Syntax highlighting, Ballistica API autocomplete, docstrings, metadata wizard. | Embedded Monaco Editor or VS Code Language Server Protocol (LSP). |
| **3D Scene Builder** | Visual placement of spawn points, flags, powerups, death zones, camera bounds. | Three.js / WebGL viewport or headless Blender bridge. |
| **Character Builder** | Skin preview, material inspector, stat tuner (punch power, health, run speed). | Real-time 3D model viewer with `.bob` parser. |
| **Asset Pipeline** | One-click `.bob`, `.cob`, and `.ktx2` conversion and validation. | Integrated `bombsquad-filespec` CLI bindings. |
| **Live Game Preview** | Embedded or side-by-side local Ballistica test runner with live reload and log streaming. | IPC socket / WebSocket companion plugin inside the game. |
| **Deploy Engine** | One-click deployment to local `mods/`, cloud workspace sync, and GitHub release creation. | Ballistica Cloud API / Git CLI integration. |

---

### Recommended Phased Development Roadmap
- **Phase 1 (Launcher & Manager):** Build a desktop application that manages local mods, displays logs, and provides project templates with API 9 validation.
- **Phase 2 (In-Game Companion Plugin):** Write a companion plugin for BombSquad that opens a local WebSocket to receive code reloads and stream console logs to external tools.
- **Phase 3 (Visual Map Placer):** Create a WebGL/Three.js tool to load `.bob` arena models and visually drag-and-drop spawn/flag coordinates, exporting the resulting Python dict.
- **Phase 4 (Unified IDE):** Integrate the components into a single desktop application (e.g. using Tauri or Electron).

---

## 13. Ballistica MCP Server & AI Coding Agent Integration

This workspace includes an implementation of the **Model Context Protocol (MCP)** designed to connect AI coding assistants (such as Cursor, Claude Desktop, Continue.dev, and Antigravity) directly to the Ballistica modding ecosystem.

```
┌────────────────────────────────────────────────────────┐
│               AI Coding Assistant                      │
│        (Cursor / Claude Desktop / Antigravity)         │
└──────────────────────────┬─────────────────────────────┘
                           │ MCP Stdio Protocol
┌──────────────────────────▼─────────────────────────────┐
│          ballistica_mcp_server.py                      │
│  - Cloud Workspace CRUD    - Python API Validation     │
│  - File Upload / Download  - Engine Build Metadata     │
└──────────────────────────┬─────────────────────────────┘
                           │ REST API
┌──────────────────────────▼─────────────────────────────┐
│            Ballistica Cloud Services                   │
│        (ballistica.net / V2 Account Backend)           │
└────────────────────────────────────────────────────────┘
```

### Installation & Environment Setup
```bash
# 1. Activate project environment
cd /path/to/bombstation
source .venv/bin/activate

# 2. Install dependencies
pip install mcp httpx python-dotenv

# 3. Configure API Key
cp .env.example .env
# Obtain your key from https://ballistica.net/apikeys and add to .env:
# BALLISTICA_API_KEY=your_key_here
```

### Connecting to Coding Agents

#### Cursor (`settings.json` or MCP Configuration)
```json
{
  "mcpServers": {
    "ballistica": {
      "command": "python3",
      "args": ["/absolute/path/to/bombstation/ballistica_mcp_server.py"],
      "env": {
        "BALLISTICA_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

#### Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "ballistica": {
      "command": "python3",
      "args": ["/absolute/path/to/bombstation/ballistica_mcp_server.py"],
      "env": {
        "BALLISTICA_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Available MCP Tools Reference

| Tool Name | Parameters | Purpose |
| :--- | :--- | :--- |
| `list_workspaces` | *(none)* | Fetches all cloud workspaces associated with the configured V2 account. |
| `create_workspace` | `name: str` | Creates a new cloud workspace on `ballistica.net`. |
| `upload_file` | `workspace: str, filename: str, content: str` | Uploads a Python plugin or resource directly to a cloud workspace. |
| `download_file` | `workspace: str, filename: str` | Retrieves a script or configuration from a cloud workspace. |
| `validate_python_code` | `code: str, target_api: int` | Validates Python code against Ballistica API guidelines (API 7, 8, or 9). |

With this setup, AI agents can create, validate, and deploy plugins directly to your live game without manual copy-pasting.

---

## 14. Master Directory of Repositories & Resources

### Official Resources (Eric Froemling / Ballistica)
- **Official Portal:** [ballistica.net](https://ballistica.net/)
- **API Documentation:** [ballistica.net/docs](https://ballistica.net/docs)
- **API Keys / V2 Auth:** [ballistica.net/apikeys](https://ballistica.net/apikeys)
- **Engine Source Repository:** [github.com/efroemling/ballistica](https://github.com/efroemling/ballistica)
- **Modding Guide Wiki:** [github.com/efroemling/ballistica/wiki/Modding-Guide](https://github.com/efroemling/ballistica/wiki/Modding-Guide)
- **Engine Roadmap:** [github.com/efroemling/ballistica/wiki/Roadmap](https://github.com/efroemling/ballistica/wiki/Roadmap)
- **Official Prebuilt Builds:** [files.ballistica.net/bombsquad/builds/](https://files.ballistica.net/bombsquad/builds/)
- **BombSquad Remote (iOS Source):** [github.com/efroemling/bombsquad-remote-ios](https://github.com/efroemling/bombsquad-remote-ios)
- **BombSquad Remote (Android Source):** [github.com/efroemling/bombsquad-remote-android](https://github.com/efroemling/bombsquad-remote-android)
- **Developer Website:** [froemling.net](https://www.froemling.net/)

---

### Community Tooling & Infrastructure (`bombsquad02420`)
- **Blender Add-on (Models & Maps):** [github.com/bombsquad02420/blender-addon](https://github.com/bombsquad02420/blender-addon)
- **File Format Specifications (`.bob`, `.cob`, `.ktx2`):** [github.com/bombsquad02420/bombsquad-filespec](https://github.com/bombsquad02420/bombsquad-filespec)
- **Bacloud Client (JS Workspace Client):** [github.com/bombsquad02420/bacloud.js](https://github.com/bombsquad02420/bacloud.js)
- **Plugin Templates:** [github.com/bombsquad02420/plugin-templates](https://github.com/bombsquad02420/plugin-templates)

---

### Community Hub & Mod Repositories (`bombsquad-community`)
- **Community Portal:** [bombsquad-community.web.app](https://bombsquad-community.web.app/)
- **Plugin Manager Repository:** [github.com/bombsquad-community/plugin-manager](https://github.com/bombsquad-community/plugin-manager)
- **Sample Plugin Source (Custom Catalogs):** [github.com/bombsquad-community/sample-plugin-source](https://github.com/bombsquad-community/sample-plugin-source)
- **Server Scripts Framework:** [github.com/bombsquad-community/server-scripts](https://github.com/bombsquad-community/server-scripts)
- **Community Modpack Client:** [github.com/bombsquad-community/modpack](https://github.com/bombsquad-community/modpack)
- **API 6 to API 9 Porter (`baport`):** [github.com/bombsquad-community/baport](https://github.com/bombsquad-community/baport)
- **Official Community Discord Server:** [discord.gg/KTZUgwaVtQ](https://discord.gg/KTZUgwaVtQ)

---

### Notable Community Modding Projects
- **Headless Modded Server:** [github.com/imayushsaini/Bombsquad-Ballistica-Modded-Server](https://github.com/imayushsaini/Bombsquad-Ballistica-Modded-Server)
- **Map Installer Tool:** [github.com/spdv123/BombSquad-Map-Installer](https://github.com/spdv123/BombSquad-Map-Installer)
- **Freaku's Mod Collection (API 9):** [github.com/Freaku17/BombSquad-Mods-byFreaku](https://github.com/Freaku17/BombSquad-Mods-byFreaku)
- **MythB Admin & Powerup Mods:** [github.com/MythB/BombSquad-Mods](https://github.com/MythB/BombSquad-Mods)
