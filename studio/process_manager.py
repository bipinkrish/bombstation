"""
studio/process_manager.py — BombSquad Subprocess Supervisor

Provides thread-safe lifecycle control (start, stop, restart), real-time stdout/stderr log
streaming buffer, and interactive REPL stdin command dispatching.
"""

from __future__ import annotations

import os
import queue
import re
import signal
import sys
import threading
import time
from pathlib import Path
from typing import Any

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_BIN_SERVER = WORKSPACE_ROOT / "bin" / "bombsquad" / ("bombsquad_server.exe" if sys.platform.startswith("win") else "bombsquad_server")
DEFAULT_CONFIG = WORKSPACE_ROOT / "bin" / "bombsquad" / "config.toml"


def get_default_mods_dir() -> Path:
    """Returns the default user mods directory based on the host operating system."""
    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / "BombSquad" / "mods"
    elif sys.platform.startswith("win"):
        local_app_data = os.environ.get("LOCALAPPDATA")
        base = Path(local_app_data) if local_app_data else Path.home() / "AppData" / "Local"
        return base / "BombSquad" / "mods"
    else:
        # Linux / BSD / Unix
        return Path.home() / ".bombsquad" / "mods"


DEFAULT_MODS_DIR = get_default_mods_dir()


class ServerProcessManager:
    """Manages the lifecycle of the BombSquad server subprocess."""

    def __init__(self) -> None:
        self.process: subprocess.Popen[str] | None = None
        self.executable_path: str = str(DEFAULT_BIN_SERVER)
        self.config_path: str = str(DEFAULT_CONFIG)
        self.plugins_path: str = str(DEFAULT_MODS_DIR)
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
        return self.process.poll() is None

    def start(self, executable: str, config_path: str, plugins_path: str) -> tuple[bool, str]:
        with self.lock:
            if self.is_running():
                return False, "Server is already running."

            exe = Path(executable).expanduser().resolve()
            if not exe.exists():
                return False, f"Executable not found: {exe}"

            # Make executable if needed on macOS/Linux
            if not os.access(exe, os.X_OK):
                try:
                    os.chmod(exe, 0o755)
                except Exception as exc:
                    return False, f"Could not set execute permissions: {exc}"

            self.executable_path = str(exe)
            self.config_path = str(Path(config_path).expanduser().resolve())
            self.plugins_path = str(Path(plugins_path).expanduser().resolve())

            # Prepare working directory and environment
            run_dir = exe.parent
            env = os.environ.copy()
            env["PYTHONUNBUFFERED"] = "1"

            cmd = [str(exe)]
            if exe.name == "bombsquad_server" or "server" in exe.name:
                cfg_p = Path(self.config_path)
                if cfg_p.exists():
                    cmd.extend(["-c", str(cfg_p)])

            self.add_log("system", f"Starting server process: {' '.join(cmd)}")
            self.add_log("system", f"Working directory: {run_dir}")

            try:
                self.process = subprocess.Popen(
                    cmd,
                    cwd=str(run_dir),
                    env=env,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=1,
                    universal_newlines=True,
                )
                self.start_time = time.time()
                self._reader_thread = threading.Thread(target=self._stream_output, daemon=True)
                self._reader_thread.start()
                return True, f"Server started with PID: {self.process.pid}"
            except Exception as exc:
                self.add_log("error", f"Failed to start server: {exc}")
                return False, str(exc)

    def stop(self, timeout: float = 3.0) -> tuple[bool, str]:
        with self.lock:
            if not self.is_running() or self.process is None:
                return True, "Server is not running."

            pid = self.process.pid
            self.add_log("system", f"Sending SIGTERM to PID {pid}...")
            try:
                self.process.terminate()
            except Exception:
                pass

        # Wait outside lock
        t0 = time.time()
        while time.time() - t0 < timeout:
            if self.process.poll() is not None:
                break
            time.sleep(0.1)

        with self.lock:
            if self.process and self.process.poll() is None:
                self.add_log("warn", f"Server did not terminate; sending SIGKILL to PID {pid}")
                try:
                    self.process.kill()
                except Exception:
                    pass

            self.start_time = None
            self.process = None
            self.add_log("system", "Server process terminated.")
            return True, f"Server (PID {pid}) stopped."

    def send_command(self, command: str) -> tuple[bool, str]:
        with self.lock:
            if not self.is_running() or self.process is None or self.process.stdin is None:
                return False, "Server is not running."

            try:
                self.add_log("stdin", f"> {command}")
                self.process.stdin.write(command + "\n")
                self.process.stdin.flush()
                return True, "Command written to server stdin."
            except Exception as exc:
                self.add_log("error", f"Failed to write to stdin: {exc}")
                return False, str(exc)

    def _stream_output(self) -> None:
        proc = self.process
        if proc is None or proc.stdout is None:
            return

        for raw_line in iter(proc.stdout.readline, ""):
            line = raw_line.rstrip()
            if not line:
                continue

            # Classify severity
            severity = "info"
            lower = line.lower()
            if "error" in lower or "fatal" in lower or "exception" in lower:
                severity = "error"
            elif "warning" in lower or "deprecated" in lower:
                severity = "warn"
            elif "listening on" in lower or "ready" in lower or "success" in lower:
                severity = "success"

            self.add_log(severity, line)

        proc.stdout.close()
        exit_code = proc.wait()
        self.add_log("system", f"Server process exited with code: {exit_code}")
        with self.lock:
            self.start_time = None

    def add_log(self, severity: str, text: str) -> None:
        with self.lock:
            self.log_counter += 1
            entry = {
                "id": self.log_counter,
                "timestamp": time.strftime("%H:%M:%S"),
                "severity": severity,
                "text": text,
            }
            self.log_buffer.append(entry)
            if len(self.log_buffer) > 2000:
                self.log_buffer = self.log_buffer[-1000:]

    def get_logs(self, since_id: int = 0) -> list[dict[str, Any]]:
        with self.lock:
            if since_id <= 0:
                return self.log_buffer[-300:]
            return [l for l in self.log_buffer if l["id"] > since_id]
