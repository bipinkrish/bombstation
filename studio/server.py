"""
studio/server.py — BombStation Studio HTTP API Server

Dispatches REST API endpoints for server control, config management, mod templates,
AST validation, 3D asset inspection (.bob/.cob), and mod packaging.
"""

from __future__ import annotations

import base64
import http.server
import json
import os
import re
import shutil
import signal
import socketserver
import subprocess
import sys
import threading
import time
import urllib.parse
import urllib.request
import webbrowser
from pathlib import Path
from typing import Any

from studio.asset_parser import (
    parse_bob,
    parse_cob,
    create_sample_bob,
    create_sample_cob,
    export_to_obj,
)
from studio.config_manager import (
    DEFAULT_SETTINGS,
    parse_toml_file,
    generate_toml,
)
from studio.process_manager import (
    ServerProcessManager,
    DEFAULT_BIN_SERVER,
    DEFAULT_CONFIG,
    DEFAULT_MODS_DIR,
)
IS_WIN = sys.platform.startswith("win")
IS_MAC = sys.platform == "darwin"

if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
    BUNDLE_ROOT = Path(sys._MEIPASS)
    WORKSPACE_ROOT = Path.cwd()
else:
    BUNDLE_ROOT = Path(__file__).resolve().parent.parent
    WORKSPACE_ROOT = BUNDLE_ROOT

GUI_DIR = BUNDLE_ROOT / "gui"
PLUGINS_DIR = WORKSPACE_ROOT / "plugins"

DEFAULT_BIN_HEADLESS = WORKSPACE_ROOT / "bin" / "bombsquad" / ("bombsquad_headless.exe" if IS_WIN else "bombsquad_headless")
DEFAULT_BIN_APP = WORKSPACE_ROOT / "bin" / "bombsquad" / ("BombSquad.exe" if IS_WIN else "BombSquad.app")
DEFAULT_BA_ROOT_MODS = WORKSPACE_ROOT / "bin" / "bombsquad" / "dist" / "ba_root" / "mods"

PORT = 8080
HOST = "127.0.0.1"

manager = ServerProcessManager()


def browse_path_native(browse_type: str, title: str) -> str | None:
    """Prompts a native file or folder picker dialog cross-platform (macOS / Windows / Linux)."""
    if IS_MAC:
        try:
            if browse_type == "directory":
                script = f'POSIX path of (choose folder with prompt "{title}")'
            else:
                script = f'POSIX path of (choose file with prompt "{title}")'
            proc = subprocess.run(["osascript", "-e", script], capture_output=True, text=True, timeout=30)
            if proc.returncode == 0 and proc.stdout.strip():
                return proc.stdout.strip()
        except Exception:
            pass

    # Fallback / Windows / Linux using Tkinter if available
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        if browse_type == "directory":
            chosen = filedialog.askdirectory(title=title)
        else:
            chosen = filedialog.askopenfilename(title=title)
        root.destroy()
        return chosen if chosen else None
    except Exception:
        pass

    return None


def reveal_folder_in_os(target_dir: Path) -> None:
    """Reveals a folder in the host operating system's native file manager."""
    target_dir.mkdir(parents=True, exist_ok=True)
    if IS_WIN:
        if hasattr(os, "startfile"):
            os.startfile(str(target_dir))
        else:
            subprocess.run(["explorer", str(target_dir)], check=True)
    elif IS_MAC:
        subprocess.run(["open", str(target_dir)], check=True)
    else:
        # Linux / Unix
        subprocess.run(["xdg-open", str(target_dir)], check=True)


def get_studio_templates() -> list[dict[str, Any]]:
    """Curated Ballistica API 9 starter templates."""
    return [
        {
            "id": "minigame",
            "name": "Custom Mini-Game (Activity)",
            "description": "Full API 9 game mode with player spawning, score tracking, and round lifecycle.",
            "filename": "custom_minigame.py",
            "code": '''# ba_meta require api 9
"""
BombStation Studio: Custom Mini-Game Template
Target: BombSquad API 9 (v1.7.37+)
"""
from __future__ import annotations

from typing import TYPE_CHECKING
import babase
import bascenev1

if TYPE_CHECKING:
    from typing import Any, Sequence


class Player(bascenev1.Player['Team']):
    """Custom player state."""


class Team(bascenev1.Team[Player]):
    """Custom team state."""


# ba_meta export bascenev1.GameActivity
class CustomArenaGame(bascenev1.TeamGameActivity[Player, Team]):
    """A custom mini-game created with BombStation Studio."""

    name = 'Custom Arena Battle'
    description = 'Defeat your opponents with custom explosives!'
    available_settings = [
        bascenev1.IntSetting('Epic Mode', default=0, min_value=0, max_value=1),
        bascenev1.IntChoiceSetting(
            'Time Limit',
            choices=[('None', 0), ('1 Minute', 60), ('2 Minutes', 120), ('5 Minutes', 300)],
            default=0,
        ),
    ]
    score_info = bascenev1.ScoreInfo(label='Score', scoretype=bascenev1.ScoreType.POINTS)
    default_music = bascenev1.MusicType.FIGHT_1

    @classmethod
    def supports_session_type(cls, sessiontype: type[bascenev1.Session]) -> bool:
        return issubclass(sessiontype, (bascenev1.DualTeamSession, bascenev1.FreeForAllSession))

    @classmethod
    def get_supported_maps(cls, sessiontype: type[bascenev1.Session]) -> list[str]:
        return ['Doom Shroom', 'Rampage', 'Courtyard', 'Crag Castle']

    def on_begin(self) -> None:
        super().on_begin()
        self._spawn_powerups()
        bascenev1.timer(10.0, self._spawn_powerups, repeat=True)

    def _spawn_powerups(self) -> None:
        import bascenev1lib.actor.powerupbox as pb
        for point in self.map.powerup_spawn_points:
            pb.PowerupBox(position=point, poweruptype='shield').autoretain()

    def spawn_player(self, player: Player) -> bascenev1.Actor:
        return self.spawn_player_spaz(player)

    def handlemessage(self, msg: Any) -> Any:
        if isinstance(msg, bascenev1.PlayerDiedMessage):
            super().handlemessage(msg)
            killer = msg.get_killer_player(Player)
            if killer and killer != msg.spaz.player:
                killer.team.score += 1
            self.respawn_player(msg.spaz.player, 2.0)
            return None
        return super().handlemessage(msg)
'''
        },
        {
            "id": "powerup",
            "name": "Custom Powerup Plugin",
            "description": "API 9 plugin adding custom powerup distributions and explosive behavior.",
            "filename": "custom_powerups.py",
            "code": '''# ba_meta require api 9
"""
BombStation Studio: Custom Powerup Plugin
Adds cluster explosives and custom effects.
"""
from __future__ import annotations

import babase
import bascenev1

plugman = {
    "plugin_name": "custom_powerups",
    "description": "Custom explosives and powerup behavior.",
    "authors": [{"name": "BombStation Developer"}],
    "version": "1.0.0",
}


# ba_meta export babase.Plugin
class CustomPowerupPlugin(babase.Plugin):
    """Enhances bomb physics and powerup behaviors."""

    def on_app_running(self) -> None:
        babase.screenmessage("Custom Powerups Plugin Active!", color=(0.2, 1.0, 0.4))
'''
        },
        {
            "id": "spaz_appearance",
            "name": "Custom Character Appearance",
            "description": "Registers a new character skin with custom models, sounds, and combat stats.",
            "filename": "custom_character.py",
            "code": '''# ba_meta require api 9
"""
BombStation Studio: Custom Character Appearance Template
Registers a custom Spaz appearance with meshes, textures, and voice profiles.
"""
from __future__ import annotations

import babase

plugman = {
    "plugin_name": "custom_character",
    "description": "Adds a custom playable character skin.",
    "authors": [{"name": "BombStation Developer"}],
    "version": "1.0.0",
}


# ba_meta export babase.Plugin
class CustomCharacterPlugin(babase.Plugin):
    """Registers custom character appearances on startup."""

    def on_app_running(self) -> None:
        try:
            import bascenev1lib.actor.spazappearance as sa
            char_name = "CyberNinja"
            t = sa.Appearance(char_name)
            t.color_texture = "ninjaColor"
            t.color_mask_texture = "ninjaColorMask"
            t.head_mesh = "ninjaHead"
            t.torso_mesh = "ninjaTorso"
            t.pelvis_mesh = "ninjaPelvis"
            t.upper_arm_mesh = "ninjaUpperArm"
            t.forearm_mesh = "ninjaForeArm"
            t.hand_mesh = "ninjaHand"
            t.upper_leg_mesh = "ninjaUpperLeg"
            t.lower_leg_mesh = "ninjaLowerLeg"
            t.toes_mesh = "ninjaToes"
            t.attack_sounds = ["ninjaAttack01", "ninjaAttack02"]
            t.hit_sounds = ["ninjaHit01", "ninjaHit02"]
            t.death_sounds = ["ninjaDeath01"]
            t.icon_texture = "ninjaIcon"
            t.icon_mask_texture = "ninjaIconColorMask"
            babase.app.classic.spaz_appearances[char_name] = t
            babase.screenmessage(f"Character '{char_name}' registered!", color=(0.3, 0.8, 1.0))
        except Exception as exc:
            print(f"Failed to register custom character: {exc}")
'''
        }
    ]


class StudioRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP Request Handler dispatching REST API calls and serving static assets."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(GUI_DIR), **kwargs)

    def log_message(self, format: str, *args: Any) -> None:
        pass

    def send_json(self, status_code: int, data: Any) -> None:
        body = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.end_headers()
        self.wfile.write(body)

    def read_json_body(self) -> dict[str, Any]:
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length <= 0:
            return {}
        raw = self.rfile.read(content_length).decode("utf-8")
        return json.loads(raw) if raw else {}

    def do_OPTIONS(self) -> None:
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)

        if path == "/api/status":
            self.send_json(200, manager.get_status())
            return

        if path == "/api/mcp/status":
            env_file = WORKSPACE_ROOT / ".env"
            has_api_key = False
            if env_file.exists():
                try:
                    with open(env_file, "r", encoding="utf-8") as f:
                        for line in f:
                            if line.strip().startswith("BALLISTICA_API_KEY=") and len(line.strip().split("=", 1)[1].strip()) > 5:
                                has_api_key = True
                                break
                except Exception:
                    pass
            mcp_script = WORKSPACE_ROOT / "ballistica_mcp_server.py"
            self.send_json(200, {
                "mcp_server_present": mcp_script.exists(),
                "mcp_server_path": str(mcp_script),
                "has_api_key": has_api_key,
                "env_file_exists": env_file.exists(),
                "tools": [
                    {"name": "list_workspaces", "description": "Fetches all cloud workspaces from ballistica.net"},
                    {"name": "create_workspace", "description": "Creates a new cloud workspace on ballistica.net"},
                    {"name": "upload_file", "description": "Uploads a Python plugin directly to a cloud workspace"},
                    {"name": "download_file", "description": "Retrieves a script or config from a cloud workspace"},
                    {"name": "validate_python_code", "description": "Validates Python code against Ballistica API 7, 8, or 9 guidelines"}
                ]
            })
            return

        if path == "/api/studio/templates":
            self.send_json(200, {"templates": get_studio_templates()})
            return

        if path == "/api/studio/files":
            target_dir_str = query.get("dir", [manager.plugins_path])[0]
            target_dir = Path(target_dir_str).expanduser().resolve()
            files_list = []
            if target_dir.exists() and target_dir.is_dir():
                for f in sorted(target_dir.glob("*.py")):
                    try:
                        content_sample = f.read_text(encoding="utf-8", errors="ignore")[:500]
                        api_match = re.search(r"#\s*ba_meta\s+require\s+api\s+(\d+)", content_sample)
                        api_ver = int(api_match.group(1)) if api_match else None
                        files_list.append({
                            "name": f.name,
                            "path": str(f),
                            "size": f.stat().st_size,
                            "modified": f.stat().st_mtime,
                            "api": api_ver,
                        })
                    except Exception:
                        pass
            self.send_json(200, {"directory": str(target_dir), "files": files_list})
            return

        if path == "/api/studio/sample-asset":
            asset_type = query.get("type", ["bob"])[0]
            if asset_type == "cob":
                raw_bytes = create_sample_cob()
                parsed = parse_cob(raw_bytes)
            else:
                raw_bytes = create_sample_bob()
                parsed = parse_bob(raw_bytes)
            self.send_json(200, parsed)
            return

        if path == "/api/presets":
            executables = []
            if DEFAULT_BIN_SERVER.exists():
                executables.append({"name": "BombSquad Server Manager", "path": str(DEFAULT_BIN_SERVER)})
            if DEFAULT_BIN_HEADLESS.exists():
                executables.append({"name": "BombSquad Headless Engine", "path": str(DEFAULT_BIN_HEADLESS)})
            if DEFAULT_BIN_APP.exists():
                executables.append({"name": f"BombSquad App ({'Windows' if IS_WIN else 'macOS'})", "path": str(DEFAULT_BIN_APP)})

            os_label = "Windows" if IS_WIN else ("macOS" if IS_MAC else "Linux")
            plugin_targets = [
                {"name": f"System Mods Folder ({os_label})", "path": str(DEFAULT_MODS_DIR), "exists": DEFAULT_MODS_DIR.exists(), "recommended": True},
                {"name": "Server ba_root Mods", "path": str(DEFAULT_BA_ROOT_MODS), "exists": DEFAULT_BA_ROOT_MODS.exists(), "recommended": False},
                {"name": "Workspace Plugins", "path": str(PLUGINS_DIR), "exists": PLUGINS_DIR.exists(), "recommended": False},
            ]

            configs = []
            if DEFAULT_CONFIG.exists():
                configs.append({"name": "Default Server config.toml", "path": str(DEFAULT_CONFIG)})

            self.send_json(200, {"executables": executables, "plugin_targets": plugin_targets, "configs": configs})
            return

        if path == "/api/browse":
            target_type = query.get("type", ["file"])[0]
            title = query.get("prompt", ["Select Path"])[0]
            chosen = browse_path_native(target_type, title)
            self.send_json(200, {"path": chosen})
            return

        if path == "/api/config":
            target_file = query.get("path", [str(DEFAULT_CONFIG)])[0]
            cfg_path = Path(target_file).expanduser().resolve()
            if not cfg_path.exists():
                self.send_json(404, {"error": f"Config not found at: {cfg_path}"})
                return
            try:
                cfg_data, raw_text = parse_toml_file(cfg_path)
                self.send_json(200, {"path": str(cfg_path), "raw": raw_text, "config": cfg_data})
            except Exception as exc:
                self.send_json(500, {"error": f"Failed to parse config: {exc}"})
            return

        if path == "/api/plugins":
            target_dir_str = query.get("target", [manager.plugins_path])[0]
            target_dir = Path(target_dir_str).expanduser().resolve()

            plugins_list = []
            if PLUGINS_DIR.exists():
                for p in sorted(PLUGINS_DIR.glob("*.py")):
                    content = p.read_text(encoding="utf-8", errors="ignore")
                    is_installed = (target_dir / p.name).exists()
                    plugins_list.append({
                        "filename": p.name,
                        "name": p.stem.replace("_", " ").title(),
                        "description": "BombStation Verified Plugin",
                        "api_target": 9,
                        "is_installed": is_installed,
                    })

            custom_installed = []
            if target_dir.exists():
                repo_names = {p["filename"] for p in plugins_list}
                for f in sorted(target_dir.glob("*.py")):
                    if f.name not in repo_names:
                        custom_installed.append({
                            "name": f.name,
                            "path": str(f),
                            "size": f.stat().st_size,
                            "modified": f.stat().st_mtime,
                        })

            self.send_json(200, {
                "target_directory": str(target_dir),
                "plugins": plugins_list,
                "custom_plugins": custom_installed,
            })
            return

        if path == "/api/server/logs":
            since_id = int(query.get("since", ["0"])[0])
            self.send_json(200, {
                "logs": manager.get_logs(since_id),
                "total": manager.log_counter,
                "running": manager.is_running(),
            })
            return

        super().do_GET()

    def do_POST(self) -> None:
        path = urllib.parse.urlparse(self.path).path

        if path == "/api/server/start":
            body = self.read_json_body()
            exe = body.get("executable", str(DEFAULT_BIN_SERVER))
            cfg = body.get("config", str(DEFAULT_CONFIG))
            mods = body.get("plugins_path", str(DEFAULT_MACOS_MODS))
            success, msg = manager.start(exe, cfg, mods)
            self.send_json(200 if success else 400, {"success": success, "message": msg, "status": manager.get_status()})
            return

        if path == "/api/server/stop":
            success, msg = manager.stop()
            self.send_json(200 if success else 400, {"success": success, "message": msg, "status": manager.get_status()})
            return

        if path == "/api/server/restart":
            body = self.read_json_body()
            exe = body.get("executable", manager.executable_path)
            cfg = body.get("config", manager.config_path)
            mods = body.get("plugins_path", manager.plugins_path)
            manager.stop()
            time.sleep(1.0)
            success, msg = manager.start(exe, cfg, mods)
            self.send_json(200 if success else 400, {"success": success, "message": msg, "status": manager.get_status()})
            return

        if path == "/api/server/command":
            body = self.read_json_body()
            cmd = body.get("command", "").strip()
            if not cmd:
                self.send_json(400, {"error": "No command provided."})
                return
            success, msg = manager.send_command(cmd)
            self.send_json(200 if success else 400, {"success": success, "message": msg})
            return

        if path == "/api/config":
            body = self.read_json_body()
            target_file = Path(body.get("path", str(DEFAULT_CONFIG))).expanduser().resolve()
            try:
                if "raw" in body:
                    target_file.write_text(body["raw"], encoding="utf-8")
                elif "config" in body:
                    toml_str = generate_toml(body["config"])
                    target_file.write_text(toml_str, encoding="utf-8")
                self.send_json(200, {"success": True, "path": str(target_file)})
            except Exception as exc:
                self.send_json(500, {"error": str(exc)})
            return

        if path == "/api/studio/load":
            body = self.read_json_body()
            target_path = Path(body.get("path", "")).expanduser().resolve()
            if not target_path.exists() or not target_path.is_file():
                self.send_json(404, {"error": "File not found."})
                return
            try:
                code = target_path.read_text(encoding="utf-8", errors="replace")
                self.send_json(200, {"filename": target_path.name, "path": str(target_path), "content": code})
            except Exception as exc:
                self.send_json(500, {"error": str(exc)})
            return

        if path == "/api/studio/save":
            body = self.read_json_body()
            target_dir = Path(body.get("path", str(DEFAULT_MACOS_MODS))).expanduser().resolve()
            filename = body.get("filename", "custom_mod.py")
            content = body.get("content", "")
            target_file = target_dir / filename
            try:
                target_file.parent.mkdir(parents=True, exist_ok=True)
                target_file.write_text(content, encoding="utf-8")
                self.send_json(200, {"success": True, "filename": target_file.name, "path": str(target_file)})
            except Exception as exc:
                self.send_json(500, {"error": str(exc)})
            return

        if path == "/api/studio/validate":
            body = self.read_json_body()
            self.send_json(200, validate_ballistica_code(body.get("code", "")))
            return

        if path == "/api/studio/parse-asset":
            body = self.read_json_body()
            b64_data = body.get("data", "")
            filename = body.get("filename", "")
            try:
                raw_bytes = base64.b64decode(b64_data)
                if filename.endswith(".cob") or body.get("type") == "cob":
                    parsed = parse_cob(raw_bytes)
                else:
                    parsed = parse_bob(raw_bytes)
                self.send_json(200, {"success": True, "asset": parsed})
            except Exception as exc:
                self.send_json(400, {"success": False, "error": str(exc)})
            return

        if path == "/api/studio/export":
            body = self.read_json_body()
            source = body.get("source") or str(PLUGINS_DIR / "unlock_max_players.py")
            deploy = body.get("deploy", False)
            try:
                from scripts.build_export import build_and_export
                manifest = build_and_export(
                    source_path=Path(source),
                    deploy_to_mods=deploy,
                    target_mods_dir=Path(manager.plugins_path),
                )
                self.send_json(200, {"success": True, "manifest": manifest})
            except Exception as exc:
                self.send_json(500, {"success": False, "error": str(exc)})
            return

        if path == "/api/plugins/install":
            body = self.read_json_body()
            target_dir = Path(body.get("target", str(DEFAULT_MACOS_MODS))).expanduser().resolve()
            plugin_id = body.get("plugin")
            target_dir.mkdir(parents=True, exist_ok=True)

            try:
                if body.get("all"):
                    for p in PLUGINS_DIR.glob("*.py"):
                        shutil.copy2(p, target_dir / p.name)
                elif plugin_id:
                    shutil.copy2(PLUGINS_DIR / plugin_id, target_dir / plugin_id)
                self.send_json(200, {"success": True})
            except Exception as exc:
                self.send_json(500, {"error": str(exc)})
            return

        if path == "/api/plugins/uninstall":
            body = self.read_json_body()
            target_dir = Path(body.get("target", str(DEFAULT_MACOS_MODS))).expanduser().resolve()
            plugin_id = body.get("plugin")
            try:
                target_file = target_dir / plugin_id
                if target_file.exists():
                    target_file.unlink()
                self.send_json(200, {"success": True})
            except Exception as exc:
                self.send_json(500, {"error": str(exc)})
            return

        if path == "/api/plugins/open-folder":
            body = self.read_json_body()
            target_dir = Path(body.get("path", str(DEFAULT_MODS_DIR))).expanduser().resolve()
            try:
                reveal_folder_in_os(target_dir)
                self.send_json(200, {"success": True})
            except Exception as exc:
                self.send_json(500, {"error": str(exc)})
            return

        self.send_json(404, {"error": "Endpoint not found."})


def run_server(port: int = PORT, host: str = HOST, auto_open: bool = True) -> None:
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    with http.server.ThreadingHTTPServer((host, port), StudioRequestHandler) as httpd:
        httpd.daemon_threads = True
        url = f"http://{host}:{port}"
        print(f"\n=======================================================")
        print(f"💣 BombStation Studio is live at: {url}")
        print(f"   Modules: Server Operations, Config, Monaco IDE, 3D Arena Studio, MCP")
        print(f"   Press Ctrl+C to exit.")
        print(f"=======================================================\n", flush=True)

        if auto_open:
            threading.Timer(0.8, lambda: webbrowser.open(url)).start()

        def handle_shutdown(sig: int, frame: Any) -> None:
            print("\nShutting down BombStation Studio...", flush=True)
            if manager.is_running():
                manager.stop(timeout=2.0)
            httpd.shutdown()
            sys.exit(0)

        signal.signal(signal.SIGINT, handle_shutdown)
        signal.signal(signal.SIGTERM, handle_shutdown)

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            handle_shutdown(signal.SIGINT, None)


def run_desktop_app(port: int = PORT, host: str = HOST, width: int = 1280, height: int = 820) -> None:
    """Launches BombStation Studio in a native desktop window (WebKit on macOS / WebView2 on Windows)."""
    server_ready = threading.Event()
    http_server_holder: list[Any] = []

    def server_worker() -> None:
        http.server.ThreadingHTTPServer.allow_reuse_address = True
        try:
            with http.server.ThreadingHTTPServer((host, port), StudioRequestHandler) as httpd:
                httpd.daemon_threads = True
                http_server_holder.append(httpd)
                server_ready.set()
                httpd.serve_forever()
        except Exception as exc:
            print(f"Server error: {exc}")
            server_ready.set()

    t = threading.Thread(target=server_worker, daemon=True)
    t.start()
    server_ready.wait(timeout=3.0)

    url = f"http://{host}:{port}"
    print(f"\n=======================================================")
    print(f"💣 BombStation Studio Desktop App")
    print(f"   Native Window Engine: Apple WebKit (macOS) / WebView2 (Windows)")
    print(f"   Local Server:         {url}")
    print(f"=======================================================\n", flush=True)

    try:
        import webview
        window = webview.create_window(
            title="BombStation Studio",
            url=url,
            width=width,
            height=height,
            min_size=(960, 640),
            background_color="#08090c",
        )
        webview.start()
    except Exception as exc:
        print(f"Native desktop window failed ({exc}). Opening in system browser instead.")
        webbrowser.open(url)
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
    finally:
        if manager.is_running():
            manager.stop(timeout=2.0)
        if http_server_holder:
            http_server_holder[0].shutdown()

