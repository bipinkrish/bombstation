#!/usr/bin/env python3
"""
server_gui.py — BombStation Server Studio Backend

A zero-dependency HTTP server providing REST APIs and static file serving
for the BombStation Server Management GUI.

Features:
- Native macOS file/directory dialog integration via osascript
- BombSquad server process supervision (Start, Stop, Restart, Stdin REPL)
- Real-time log capture and streaming buffer
- Comprehensive config.toml visual parsing, generation, and validation
- Plugin detection, installation, and uninstallation
"""

from __future__ import annotations

import http.server
import json
import os
import queue
import re
import shutil
import signal
import socketserver
import subprocess
import sys
import threading
import time
import tomllib
import urllib.parse
import urllib.request
import webbrowser
from pathlib import Path
from typing import Any

WORKSPACE_ROOT = Path(__file__).resolve().parent
GUI_DIR = WORKSPACE_ROOT / "gui"
PLUGINS_DIR = WORKSPACE_ROOT / "plugins"
DEFAULT_BIN_SERVER = WORKSPACE_ROOT / "bin" / "bombsquad" / "bombsquad_server"
DEFAULT_BIN_HEADLESS = WORKSPACE_ROOT / "bin" / "bombsquad" / "dist" / "bombsquad_headless"
DEFAULT_BIN_APP = WORKSPACE_ROOT / "bin" / "bombsquad" / "BombSquad.app"
DEFAULT_CONFIG = WORKSPACE_ROOT / "bin" / "bombsquad" / "config.toml"
DEFAULT_MACOS_MODS = Path.home() / "Library" / "Application Support" / "BombSquad" / "mods"
DEFAULT_BA_ROOT_MODS = WORKSPACE_ROOT / "bin" / "bombsquad" / "dist" / "ba_root" / "mods"

PORT = 8080
HOST = "127.0.0.1"


class ServerProcessManager:
    """Manages the lifecycle of the BombSquad server subprocess."""

    def __init__(self) -> None:
        self.process: subprocess.Popen[str] | None = None
        self.executable_path: str = str(DEFAULT_BIN_SERVER)
        self.config_path: str = str(DEFAULT_CONFIG)
        self.plugins_path: str = str(DEFAULT_MACOS_MODS)
        self.start_time: float | None = None
        self.log_buffer: list[dict[str, Any]] = []
        self.log_counter: int = 0
        self.lock = threading.RLock()
        self._reader_thread: threading.Thread | None = None

    def get_status(self) -> dict[str, Any]:
        with self.lock:
            running = self.is_running()
            uptime = round(time.time() - self.start_time, 1) if (running and self.start_time) else 0
            pid = self.process.pid if (running and self.process) else None
            return {
                "running": running,
                "pid": pid,
                "uptime_seconds": uptime,
                "executable_path": self.executable_path,
                "config_path": self.config_path,
                "plugins_path": self.plugins_path,
                "total_logs": self.log_counter,
            }

    def is_running(self) -> bool:
        if self.process is None:
            return False
        ret = self.process.poll()
        return ret is None

    def append_log(self, text: str, stream: str = "stdout") -> None:
        with self.lock:
            self.log_counter += 1
            entry = {
                "id": self.log_counter,
                "time": time.strftime("%H:%M:%S"),
                "text": text,
                "stream": stream,
            }
            self.log_buffer.append(entry)
            if len(self.log_buffer) > 3000:
                self.log_buffer = self.log_buffer[-2000:]

    def get_logs(self, since_id: int = 0) -> list[dict[str, Any]]:
        with self.lock:
            if since_id <= 0:
                return self.log_buffer[-300:]
            return [log for log in self.log_buffer if log["id"] > since_id]

    def clear_logs(self) -> None:
        with self.lock:
            self.log_buffer.clear()
            self.append_log("--- Console logs cleared ---", stream="system")

    def start(self, executable: str, config: str, plugins_path: str) -> tuple[bool, str]:
        with self.lock:
            if self.is_running():
                return False, f"Server is already running (PID {self.process.pid})."

            exe_path = Path(executable).expanduser().resolve()
            cfg_path = Path(config).expanduser().resolve()
            mods_path = Path(plugins_path).expanduser().resolve()

            if not exe_path.exists():
                return False, f"Server executable does not exist: {exe_path}"

            self.executable_path = str(exe_path)
            self.config_path = str(cfg_path)
            self.plugins_path = str(mods_path)

            # Ensure mods folder exists
            mods_path.mkdir(parents=True, exist_ok=True)

            cmd: list[str] = []
            working_dir = exe_path.parent

            # Determine execution strategy based on executable type
            if exe_path.name == "bombsquad_server" or exe_path.suffix == ".py":
                # Official Python server manager
                cmd = [
                    sys.executable,
                    str(exe_path),
                    "--config",
                    str(cfg_path),
                    "--noninteractive",
                ]
            elif exe_path.name == "bombsquad_headless" or exe_path.is_file():
                # Direct headless engine
                cmd = [
                    str(exe_path),
                    "-m",
                    str(mods_path),
                ]
            elif exe_path.is_dir() and exe_path.name.endswith(".app"):
                # macOS .app bundle
                macos_bin = exe_path / "Contents" / "MacOS" / exe_path.stem
                if macos_bin.exists():
                    cmd = [str(macos_bin), "-m", str(mods_path)]
                else:
                    cmd = ["open", "-a", str(exe_path)]
            else:
                cmd = [str(exe_path)]

            # Setup environment
            env = os.environ.copy()
            env["PYTHONUNBUFFERED"] = "1"
            if mods_path.exists():
                env["BALLISTICA_MODS_DIR"] = str(mods_path)

            try:
                self.append_log(f"Starting server: {' '.join(cmd)}", stream="system")
                self.append_log(f"Working Directory: {working_dir}", stream="system")
                self.append_log(f"Config File: {cfg_path}", stream="system")
                self.append_log(f"Plugins Directory: {mods_path}", stream="system")

                self.process = subprocess.Popen(
                    cmd,
                    cwd=str(working_dir),
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=1,
                    env=env,
                )
                self.start_time = time.time()

                self._reader_thread = threading.Thread(
                    target=self._stream_output, args=(self.process,), daemon=True
                )
                self._reader_thread.start()

                return True, f"Server started successfully (PID {self.process.pid})"
            except Exception as exc:
                self.append_log(f"Failed to start server: {exc}", stream="stderr")
                return False, f"Failed to start server: {exc}"

    def _stream_output(self, proc: subprocess.Popen[str]) -> None:
        try:
            if proc.stdout:
                for line in iter(proc.stdout.readline, ""):
                    if line:
                        self.append_log(line.rstrip("\r\n"), stream="stdout")
        except Exception as exc:
            self.append_log(f"Stream reader error: {exc}", stream="stderr")
        finally:
            exit_code = proc.poll()
            self.append_log(
                f"--- Server process exited with code {exit_code} ---", stream="system"
            )

    def send_command(self, command: str) -> tuple[bool, str]:
        with self.lock:
            if not self.is_running() or not self.process or not self.process.stdin:
                return False, "Server is not running or stdin is unavailable."
            try:
                self.append_log(f"> {command}", stream="stdin")
                self.process.stdin.write(f"{command}\n")
                self.process.stdin.flush()
                return True, "Command sent."
            except Exception as exc:
                return False, f"Error sending command: {exc}"

    def stop(self, timeout: float = 4.0) -> tuple[bool, str]:
        with self.lock:
            if not self.is_running() or not self.process:
                return False, "Server is not running."

            pid = self.process.pid
            self.append_log(f"Stopping server process (PID {pid})...", stream="system")

            try:
                # First try sending graceful exit via stdin if available
                if self.process.stdin and not self.process.stdin.closed:
                    try:
                        self.process.stdin.write("quit()\n")
                        self.process.stdin.flush()
                    except Exception:
                        pass

                self.process.send_signal(signal.SIGINT)
            except Exception:
                try:
                    self.process.terminate()
                except Exception:
                    pass

        # Wait outside lock
        deadline = time.time() + timeout
        while time.time() < deadline:
            if not self.is_running():
                break
            time.sleep(0.2)

        with self.lock:
            if self.is_running() and self.process:
                self.append_log(f"Force killing server process (PID {self.process.pid})...", stream="system")
                try:
                    self.process.kill()
                    self.process.wait(timeout=2.0)
                except Exception as exc:
                    return False, f"Failed to force kill process: {exc}"

            self.process = None
            self.start_time = None
            self.append_log("Server stopped successfully.", stream="system")
            return True, "Server stopped successfully."


manager = ServerProcessManager()


def run_osascript(apple_script: str) -> str | None:
    """Executes AppleScript on macOS, returning trimmed stdout or None on cancel/error."""
    try:
        proc = subprocess.run(
            ["osascript", "-e", apple_script],
            capture_output=True,
            text=True,
            timeout=60,
        )
        if proc.returncode == 0:
            val = proc.stdout.strip()
            return val if val else None
        return None
    except Exception:
        return None


def toml_to_dict(toml_str: str) -> dict[str, Any]:
    try:
        return tomllib.loads(toml_str)
    except Exception as exc:
        raise ValueError(f"Invalid TOML: {exc}") from exc


def format_toml_value(val: Any) -> str:
    if isinstance(val, bool):
        return "true" if val else "false"
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, str):
        escaped = val.replace("\\", "\\\\").replace('"', '\\"')
        return f'"{escaped}"'
    if isinstance(val, list):
        items = [format_toml_value(v) for v in val]
        return f"[{', '.join(items)}]"
    if isinstance(val, dict):
        # Inline dict
        pairs = [f'{format_toml_value(k)} = {format_toml_value(v)}' for k, v in val.items()]
        return f"{{{', '.join(pairs)}}}"
    return f'"{str(val)}"'


def dict_to_toml(data: dict[str, Any]) -> str:
    """Serializes a dictionary to beautifully commented BombSquad config.toml."""
    sections: list[str] = [
        "# ===================================================================",
        "# BombSquad / Ballistica Server Configuration",
        f"# Generated by BombStation Server Studio — {time.strftime('%Y-%m-%d %H:%M:%S')}",
        "# ===================================================================\n",
    ]

    # Categories for clean grouping
    identity_keys = [
        ("party_name", "Name of your server in the public parties list"),
        ("party_is_public", "If true, shows in the global public party list"),
        ("password", "Client join password (leave empty for none)"),
        ("stats_url", "Custom stats webpage URL for server browser"),
        ("public_ipv4_address", "Explicit public IPv4 address"),
        ("public_ipv6_address", "Explicit public IPv6 address"),
    ]

    gameplay_keys = [
        ("session_type", "Session mode: 'ffa', 'teams', or 'coop'"),
        ("session_max_players_override", "Max active players in session (set to 999 for unlimited)"),
        ("playlist_code", "Custom playlist code shared from BombSquad"),
        ("playlist_shuffle", "Whether to shuffle games in playlist"),
        ("auto_balance_teams", "Keep team sizes equal (teams mode only)"),
        ("teams_series_length", "Points/wins required for teams series (e.g. 7 = Best of 7)"),
        ("ffa_series_length", "Points to win in free-for-all mode"),
        ("coop_campaign", "Campaign name for co-op mode (e.g. 'Easy')"),
        ("coop_level", "Level within campaign (e.g. 'Onslaught Training')"),
        ("allow_punch_grab", "Enable classic pre-1.8 punch-grab technique"),
        ("show_tutorial", "Show tutorial at start of games"),
        ("team_names", "Custom team names in teams mode"),
        ("team_colors", "Custom team colors (RGB triplets 0.0-1.0)"),
    ]

    network_keys = [
        ("port", "UDP port to host on (43210 is default and LAN discoverable)"),
        ("max_party_size", "Max client devices allowed in party"),
        ("protocol_version", "Ballistica protocol version (38 recommended)"),
        ("enable_queue", "Enable waiting queue for connecting players"),
        ("authenticate_clients", "Verify accounts via Ballistica master server"),
        ("admins", "Account IDs of server administrators"),
        ("player_rejoin_cooldown", "Seconds before rejoining game (anti-exploit)"),
        ("enable_default_kick_voting", "Allow players to initiate kick votes"),
    ]

    lifecycle_keys = [
        ("clean_exit_minutes", "Graceful exit time in minutes to clear leaks"),
        ("unclean_exit_minutes", "Hard shutdown fallback time in minutes"),
        ("idle_exit_minutes", "Shutdown if server remains empty for minutes"),
        ("dont_write_bytecode", "Disable generation of .pyc cache files"),
    ]

    written_keys = set()

    def write_group(title: str, keys: list[tuple[str, str]]) -> None:
        sections.append(f"# --- {title} ---")
        for key, comment in keys:
            if key in data:
                val = data[key]
                written_keys.add(key)
                if val is not None:
                    sections.append(f"# {comment}")
                    sections.append(f"{key} = {format_toml_value(val)}\n")
        sections.append("")

    write_group("Server Identity & Network Visibility", identity_keys)
    write_group("Gameplay & Session Rules", gameplay_keys)
    write_group("Network & Security Settings", network_keys)
    write_group("Server Process Lifecycle", lifecycle_keys)

    # Any extra top-level keys
    remaining = [k for k in data if k not in written_keys and k != "log_levels"]
    if remaining:
        sections.append("# --- Additional Options ---")
        for k in sorted(remaining):
            val = data[k]
            if val is not None:
                sections.append(f"{k} = {format_toml_value(val)}")
        sections.append("")

    # Log levels table
    log_levels = data.get("log_levels")
    if isinstance(log_levels, dict) and log_levels:
        sections.append("# --- Logger Overrides ---")
        sections.append("[log_levels]")
        for lk, lv in log_levels.items():
            sections.append(f'"{lk}" = "{lv}"')
        sections.append("")

    return "\n".join(sections).strip() + "\n"


class StudioRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP Request Handler dispatching REST API calls and serving frontend assets."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(GUI_DIR), **kwargs)

    def log_message(self, format: str, *args: Any) -> None:
        # Suppress noisy HTTP request polling logs from terminal
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

        if path == "/api/presets":
            # Return detected executables, plugin folders, and config paths
            executables = []
            if DEFAULT_BIN_SERVER.exists():
                executables.append({
                    "name": "BombSquad Server Manager (Recommended)",
                    "path": str(DEFAULT_BIN_SERVER),
                    "type": "server_manager",
                })
            if DEFAULT_BIN_HEADLESS.exists():
                executables.append({
                    "name": "BombSquad Headless Engine",
                    "path": str(DEFAULT_BIN_HEADLESS),
                    "type": "headless",
                })
            if DEFAULT_BIN_APP.exists():
                executables.append({
                    "name": "BombSquad macOS App",
                    "path": str(DEFAULT_BIN_APP),
                    "type": "app",
                })

            plugin_targets = [
                {
                    "name": "macOS System Mods Folder",
                    "path": str(DEFAULT_MACOS_MODS),
                    "exists": DEFAULT_MACOS_MODS.exists(),
                    "recommended": True,
                },
                {
                    "name": "Server ba_root Mods Folder",
                    "path": str(DEFAULT_BA_ROOT_MODS),
                    "exists": DEFAULT_BA_ROOT_MODS.exists(),
                    "recommended": False,
                },
                {
                    "name": "Workspace Plugins Folder",
                    "path": str(PLUGINS_DIR),
                    "exists": PLUGINS_DIR.exists(),
                    "recommended": False,
                },
            ]

            configs = []
            if DEFAULT_CONFIG.exists():
                configs.append({
                    "name": "Default Server config.toml",
                    "path": str(DEFAULT_CONFIG),
                })

            self.send_json(200, {
                "executables": executables,
                "plugin_targets": plugin_targets,
                "configs": configs,
            })
            return

        if path == "/api/browse":
            target_type = query.get("type", ["file"])[0]
            title = query.get("prompt", ["Select Path"])[0]
            if target_type == "directory":
                script = f'POSIX path of (choose folder with prompt "{title}")'
            else:
                script = f'POSIX path of (choose file with prompt "{title}")'
            chosen = run_osascript(script)
            self.send_json(200, {"path": chosen})
            return

        if path == "/api/config":
            target_file = query.get("path", [str(DEFAULT_CONFIG)])[0]
            cfg_path = Path(target_file).expanduser().resolve()
            if not cfg_path.exists():
                self.send_json(404, {"error": f"Config file not found at: {cfg_path}"})
                return
            try:
                raw_text = cfg_path.read_text(encoding="utf-8")
                parsed = tomllib.loads(raw_text)
                self.send_json(200, {
                    "path": str(cfg_path),
                    "raw": raw_text,
                    "parsed": parsed,
                })
            except Exception as exc:
                self.send_json(400, {"error": f"Failed to read/parse TOML: {exc}"})
            return

        if path == "/api/plugins":
            target_dir_str = query.get("target", [str(DEFAULT_MACOS_MODS)])[0]
            target_dir = Path(target_dir_str).expanduser().resolve()

            # Metadata for catalog plugins
            catalog_info = {
                "unlock_max_players.py": {
                    "title": "Unlock Max Players (999)",
                    "description": "Lifts the default 8-player ceiling to 999 for Coop, Teams, and FFA.",
                    "target_api": "API 7, 8, 9",
                    "author": "BombStation",
                },
                "unlock_all_characters.py": {
                    "title": "Unlock All Characters & Skins",
                    "description": "Unlocks all 30+ characters and appearances for custom/local games & lobbies.",
                    "target_api": "API 7, 8, 9",
                    "author": "BombStation",
                },
            }

            plugins_list = []
            for item_name, meta in catalog_info.items():
                repo_file = PLUGINS_DIR / item_name
                installed_file = target_dir / item_name
                installed = installed_file.exists()
                size_installed = installed_file.stat().st_size if installed else 0
                repo_size = repo_file.stat().st_size if repo_file.exists() else 0

                plugins_list.append({
                    "id": item_name,
                    "filename": item_name,
                    "title": meta["title"],
                    "description": meta["description"],
                    "target_api": meta["target_api"],
                    "author": meta["author"],
                    "installed": installed,
                    "installed_size": size_installed,
                    "repo_size": repo_size,
                    "target_path": str(installed_file),
                })

            # Check for Community Plugin Manager
            pm_file = target_dir / "plugin_manager.py"
            plugins_list.append({
                "id": "plugin_manager.py",
                "filename": "plugin_manager.py",
                "title": "Community Plugin Manager",
                "description": "In-game mod browser & updater. Adds a graphical catalog inside BombSquad.",
                "target_api": "API 9",
                "author": "bombsquad-community",
                "installed": pm_file.exists(),
                "installed_size": pm_file.stat().st_size if pm_file.exists() else 0,
                "repo_size": 0,
                "target_path": str(pm_file),
                "is_community_tool": True,
            })

            # Other custom plugins installed in folder
            other_installed = []
            if target_dir.exists() and target_dir.is_dir():
                known_names = set(catalog_info.keys()) | {"plugin_manager.py"}
                for p in target_dir.glob("*.py"):
                    if p.name not in known_names:
                        other_installed.append({
                            "id": p.name,
                            "filename": p.name,
                            "title": p.stem.replace("_", " ").title(),
                            "description": "Custom user mod installed in target directory.",
                            "target_api": "Unknown",
                            "author": "Custom",
                            "installed": True,
                            "installed_size": p.stat().st_size,
                            "repo_size": 0,
                            "target_path": str(p),
                            "is_custom": True,
                        })

            self.send_json(200, {
                "target_directory": str(target_dir),
                "target_exists": target_dir.exists(),
                "plugins": plugins_list,
                "custom_plugins": other_installed,
            })
            return

        if path == "/api/server/logs":
            since_id = int(query.get("since", ["0"])[0])
            logs = manager.get_logs(since_id)
            self.send_json(200, {
                "logs": logs,
                "total": manager.log_counter,
                "running": manager.is_running(),
            })
            return

        # Fallback to static files in gui/
        super().do_GET()

    def do_POST(self) -> None:
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        if path == "/api/server/start":
            body = self.read_json_body()
            exe = body.get("executable", str(DEFAULT_BIN_SERVER))
            cfg = body.get("config", str(DEFAULT_CONFIG))
            mods = body.get("plugins_path", str(DEFAULT_MACOS_MODS))
            success, msg = manager.start(exe, cfg, mods)
            status_code = 200 if success else 400
            self.send_json(status_code, {"success": success, "message": msg, "status": manager.get_status()})
            return

        if path == "/api/server/stop":
            success, msg = manager.stop()
            status_code = 200 if success else 400
            self.send_json(status_code, {"success": success, "message": msg, "status": manager.get_status()})
            return

        if path == "/api/server/restart":
            body = self.read_json_body()
            exe = body.get("executable", manager.executable_path)
            cfg = body.get("config", manager.config_path)
            mods = body.get("plugins_path", manager.plugins_path)
            manager.stop()
            time.sleep(1.0)
            success, msg = manager.start(exe, cfg, mods)
            status_code = 200 if success else 400
            self.send_json(status_code, {"success": success, "message": msg, "status": manager.get_status()})
            return

        if path == "/api/server/command":
            body = self.read_json_body()
            cmd = body.get("command", "").strip()
            if not cmd:
                self.send_json(400, {"success": False, "error": "No command provided."})
                return
            success, msg = manager.send_command(cmd)
            status_code = 200 if success else 400
            self.send_json(status_code, {"success": success, "message": msg})
            return

        if path == "/api/server/clear-logs":
            manager.clear_logs()
            self.send_json(200, {"success": True})
            return

        if path == "/api/config":
            body = self.read_json_body()
            cfg_path_str = body.get("path", str(DEFAULT_CONFIG))
            cfg_path = Path(cfg_path_str).expanduser().resolve()

            try:
                if "raw" in body:
                    raw_toml = body["raw"]
                    # Validate TOML syntax
                    parsed = tomllib.loads(raw_toml)
                elif "settings" in body:
                    parsed = body["settings"]
                    raw_toml = dict_to_toml(parsed)
                else:
                    self.send_json(400, {"error": "Expected 'raw' or 'settings' in request body."})
                    return

                cfg_path.parent.mkdir(parents=True, exist_ok=True)
                cfg_path.write_text(raw_toml, encoding="utf-8")

                self.send_json(200, {
                    "success": True,
                    "message": f"Saved config to {cfg_path.name}",
                    "path": str(cfg_path),
                    "parsed": parsed,
                    "raw": raw_toml,
                })
            except Exception as exc:
                self.send_json(400, {"success": False, "error": f"Failed to save configuration: {exc}"})
            return

        if path == "/api/plugins/install":
            body = self.read_json_body()
            target_dir_str = body.get("target", str(DEFAULT_MACOS_MODS))
            target_dir = Path(target_dir_str).expanduser().resolve()
            plugin_id = body.get("plugin")
            install_all = body.get("all", False)

            target_dir.mkdir(parents=True, exist_ok=True)
            installed_items = []

            try:
                if install_all:
                    # Install all repo plugins
                    for p in PLUGINS_DIR.glob("*.py"):
                        shutil.copy2(p, target_dir / p.name)
                        installed_items.append(p.name)
                elif plugin_id == "plugin_manager.py":
                    # Download community plugin manager
                    url = "https://github.com/bombsquad-community/plugin-manager/releases/latest/download/plugin_manager.py"
                    dest = target_dir / "plugin_manager.py"
                    urllib.request.urlretrieve(url, dest)
                    installed_items.append("plugin_manager.py")
                elif plugin_id:
                    source_file = PLUGINS_DIR / plugin_id
                    if not source_file.exists():
                        self.send_json(404, {"error": f"Plugin {plugin_id} not found in repository."})
                        return
                    dest = target_dir / plugin_id
                    shutil.copy2(source_file, dest)
                    installed_items.append(plugin_id)
                else:
                    self.send_json(400, {"error": "Missing 'plugin' or 'all' in request."})
                    return

                self.send_json(200, {
                    "success": True,
                    "message": f"Installed: {', '.join(installed_items)}",
                    "installed": installed_items,
                    "target_directory": str(target_dir),
                })
            except Exception as exc:
                self.send_json(500, {"error": f"Failed to install plugin: {exc}"})
            return

        if path == "/api/plugins/uninstall":
            body = self.read_json_body()
            target_dir_str = body.get("target", str(DEFAULT_MACOS_MODS))
            target_dir = Path(target_dir_str).expanduser().resolve()
            plugin_id = body.get("plugin")

            if not plugin_id:
                self.send_json(400, {"error": "Missing 'plugin' to uninstall."})
                return

            target_file = target_dir / plugin_id
            if not target_file.exists():
                self.send_json(404, {"error": f"Plugin file {plugin_id} does not exist in target."})
                return

            try:
                target_file.unlink()
                self.send_json(200, {
                    "success": True,
                    "message": f"Uninstalled {plugin_id}",
                    "removed": plugin_id,
                })
            except Exception as exc:
                self.send_json(500, {"error": f"Failed to uninstall plugin: {exc}"})
            return

        if path == "/api/plugins/open-folder":
            body = self.read_json_body()
            target_dir_str = body.get("path", str(DEFAULT_MACOS_MODS))
            target_dir = Path(target_dir_str).expanduser().resolve()
            target_dir.mkdir(parents=True, exist_ok=True)

            try:
                subprocess.run(["open", str(target_dir)], check=True)
                self.send_json(200, {"success": True, "message": f"Opened {target_dir} in Finder"})
            except Exception as exc:
                self.send_json(500, {"error": f"Could not open directory: {exc}"})
            return

        self.send_json(404, {"error": "Endpoint not found."})


def run_server(port: int = PORT, host: str = HOST, auto_open: bool = True) -> None:
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    with http.server.ThreadingHTTPServer((host, port), StudioRequestHandler) as httpd:
        httpd.daemon_threads = True
        url = f"http://{host}:{port}"
        print(f"\n=======================================================")
        print(f"🚀 BombStation Server Studio is live at: {url}")
        print(f"   Press Ctrl+C to stop the GUI server.")
        print(f"=======================================================\n", flush=True)

        if auto_open:
            threading.Timer(0.8, lambda: webbrowser.open(url)).start()

        def handle_shutdown(sig: int, frame: Any) -> None:
            print("\nShutting down BombStation Server Studio...", flush=True)
            if manager.is_running():
                print("Stopping active BombSquad server subprocess...", flush=True)
                manager.stop(timeout=2.0)
            httpd.shutdown()
            sys.exit(0)

        signal.signal(signal.SIGINT, handle_shutdown)
        signal.signal(signal.SIGTERM, handle_shutdown)

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            handle_shutdown(signal.SIGINT, None)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="BombStation Server Studio GUI")
    parser.add_argument("--port", type=int, default=PORT, help=f"Port to bind GUI (default: {PORT})")
    parser.add_argument("--host", type=str, default=HOST, help=f"Host to bind GUI (default: {HOST})")
    parser.add_argument("--no-open", action="store_true", help="Do not auto-open browser on launch")
    args = parser.parse_args()

    run_server(port=args.port, host=args.host, auto_open=not args.no_open)
