#!/usr/bin/env python3
"""
get_bombsquad.py — Automated BombSquad / Ballistica Executable Downloader.

Detects the current host OS and CPU architecture, queries the official
Ballistica builds repository (https://files.ballistica.net/bombsquad/builds/),
downloads the suitable executable package, and extracts it for local testing or play.

Supported Platforms:
- macOS (Apple Silicon arm64 & Intel x86_64) — Supports both Headless Server & GUI Desktop App (.dmg)
- Linux (x86_64 & arm64) — Supports Headless Server & Client
- Windows (x86_64) — Supports Server & Client zips

Usage:
    python3 scripts/get_bombsquad.py [--target server|client|all] [--dest bin/bombsquad] [--install-mods]
"""

from __future__ import annotations

import argparse
import os
import platform
import re
import shutil
import stat
import subprocess
import sys
import tarfile
import urllib.request
import zipfile
from pathlib import Path
from typing import NamedTuple

BUILDS_URL = "https://files.ballistica.net/bombsquad/builds/"
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
PLUGINS_DIR = WORKSPACE_ROOT / "plugins"


class SystemInfo(NamedTuple):
    os_name: str  # "mac", "linux", "windows"
    arch: str     # "arm64", "x86_64"


def detect_system() -> SystemInfo:
    """Detects current operating system and architecture."""
    system = platform.system().lower()
    machine = platform.machine().lower()

    if system == "darwin":
        os_name = "mac"
    elif system == "linux":
        os_name = "linux"
    elif system == "windows":
        os_name = "windows"
    else:
        os_name = system

    if machine in ("arm64", "aarch64"):
        arch = "arm64"
    elif machine in ("x86_64", "amd64", "x64"):
        arch = "x86_64"
    else:
        arch = machine

    return SystemInfo(os_name=os_name, arch=arch)


def get_user_mods_dir(sys_info: SystemInfo) -> Path:
    """Returns the default system mods directory for the platform."""
    home = Path.home()
    if sys_info.os_name == "mac":
        return home / "Library" / "Application Support" / "BombSquad" / "mods"
    elif sys_info.os_name == "linux":
        return home / ".bombsquad" / "mods"
    elif sys_info.os_name == "windows":
        appdata = os.getenv("LOCALAPPDATA", str(home / "AppData" / "Local"))
        return Path(appdata) / "BombSquad" / "mods"
    return home / ".bombsquad" / "mods"


def fetch_build_index() -> list[str]:
    """Fetches list of available build artifacts from the builds server."""
    req = urllib.request.Request(
        BUILDS_URL,
        headers={"User-Agent": "BombStation-Downloader/1.0"},
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        html = resp.read().decode("utf-8", errors="ignore")

    filenames = re.findall(r'href=["\'](BombSquad_[^"\']+)["\']', html)
    return sorted(list(set(filenames)))


def find_matching_packages(
    filenames: list[str],
    sys_info: SystemInfo,
    target: str = "server",
) -> list[str]:
    """
    Finds the most suitable build artifacts for the host system.
    Target can be 'server' (headless binary with Python engine),
    'client' (desktop app / DMG), or 'all'.
    """
    matches: list[str] = []

    for fn in filenames:
        fn_lower = fn.lower()

        # Filter by target type
        is_server = "server" in fn_lower
        if target == "server" and not is_server:
            continue
        if target == "client" and is_server:
            continue

        # Filter by OS
        if sys_info.os_name == "mac":
            if "mac" not in fn_lower:
                continue
            # For Server on Mac, check architecture
            if is_server:
                if sys_info.arch == "arm64" and "arm64" not in fn_lower:
                    continue
                if sys_info.arch == "x86_64" and "x86_64" not in fn_lower:
                    continue
            matches.append(fn)

        elif sys_info.os_name == "linux":
            if "linux" not in fn_lower:
                continue
            if sys_info.arch == "arm64" and "arm64" not in fn_lower:
                continue
            if sys_info.arch == "x86_64" and "x86_64" not in fn_lower:
                continue
            matches.append(fn)

        elif sys_info.os_name == "windows":
            if "windows" not in fn_lower:
                continue
            matches.append(fn)

    # Sort matching packages so the latest alpha/release is at the end
    def sort_key(name: str):
        m = re.search(r"(\d+)\.(\d+)\.(\d+)(?:a(\d+))?", name)
        if m:
            major, minor, patch, alpha = m.groups()
            return (int(major), int(minor), int(patch), int(alpha or 0))
        return (0, 0, 0, 0)

    matches.sort(key=sort_key)
    return matches


def download_file(url: str, dest_path: Path) -> Path:
    """Downloads a file with progress reporting."""
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = dest_path.with_suffix(dest_path.suffix + ".part")

    print(f"📥 Downloading: {url}")
    print(f"📁 Destination: {dest_path}")

    def report_hook(block_num: int, block_size: int, total_size: int):
        downloaded = block_num * block_size
        if total_size > 0:
            percent = min(100.0, downloaded * 100.0 / total_size)
            mb_done = downloaded / (1024 * 1024)
            mb_total = total_size / (1024 * 1024)
            sys.stdout.write(f"\r   [{percent:5.1f}%] {mb_done:.1f} MB / {mb_total:.1f} MB")
        else:
            mb_done = downloaded / (1024 * 1024)
            sys.stdout.write(f"\r   Downloaded: {mb_done:.1f} MB")
        sys.stdout.flush()

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "BombStation-Downloader/1.0"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp, open(temp_path, "wb") as out_file:
        total_size = int(resp.headers.get("content-length", 0))
        block_size = 1024 * 64
        block_num = 0
        while True:
            chunk = resp.read(block_size)
            if not chunk:
                break
            out_file.write(chunk)
            block_num += 1
            report_hook(block_num, block_size, total_size)

    sys.stdout.write("\n")
    sys.stdout.flush()

    if temp_path.exists():
        temp_path.replace(dest_path)
    return dest_path


def extract_archive(archive_path: Path, extract_dir: Path) -> Path:
    """Extracts tar.gz, zip, or mounts and copies .dmg bundles."""
    extract_dir.mkdir(parents=True, exist_ok=True)
    print(f"📦 Extracting {archive_path.name} into {extract_dir}...")

    if archive_path.name.endswith((".tar.gz", ".tgz")):
        with tarfile.open(archive_path, "r:gz") as tar:
            members = tar.getmembers()
            root_names = {m.name.split("/")[0] for m in members if m.name}
            
            if hasattr(tarfile, "data_filter"):
                tar.extractall(extract_dir, filter="data")
            else:
                tar.extractall(extract_dir)

            if len(root_names) == 1:
                single_root = extract_dir / list(root_names)[0]
                if single_root.is_dir():
                    for item in single_root.iterdir():
                        dest = extract_dir / item.name
                        if dest.exists():
                            if dest.is_dir():
                                shutil.rmtree(dest)
                            else:
                                dest.unlink()
                        shutil.move(str(item), str(extract_dir))
                    shutil.rmtree(single_root)

    elif archive_path.name.endswith(".zip"):
        with zipfile.ZipFile(archive_path, "r") as zf:
            zf.extractall(extract_dir)

    elif archive_path.name.endswith(".dmg"):
        if sys.platform == "darwin":
            print(f"💿 Attaching disk image: {archive_path.name}...")
            mount_cmd = ["hdiutil", "attach", "-nobrowse", "-readonly", str(archive_path)]
            try:
                proc = subprocess.run(mount_cmd, capture_output=True, text=True, check=True)
                mount_point = None
                for line in proc.stdout.splitlines():
                    if "/Volumes/" in line:
                        part = line.split("/Volumes/")[-1].strip()
                        mount_point = Path("/Volumes") / part
                        break

                if mount_point and mount_point.exists():
                    print(f"📂 Mounted at {mount_point}. Extracting application...")
                    apps = list(mount_point.glob("*.app"))
                    for app in apps:
                        dest_app = extract_dir / "BombSquad.app"
                        if dest_app.exists():
                            shutil.rmtree(dest_app)
                        print(f"📦 Copying {app.name} -> {dest_app} (via ditto to preserve bundle signatures)...")
                        subprocess.run(["ditto", str(app), str(dest_app)], check=True)
                        print(f"✅ Extracted game client to {dest_app}")

                        # Remove Gatekeeper quarantine attribute
                        subprocess.run(["xattr", "-cr", str(dest_app)], check=False)

                    # Unmount DMG
                    subprocess.run(["hdiutil", "detach", str(mount_point)], check=False)
                    print(f"⏏️ Unmounted {mount_point}")
                else:
                    print(f"⚠️ Could not detect mount point in hdiutil output: {proc.stdout}")
            except Exception as e:
                print(f"⚠️ Error mounting DMG: {e}")
                print(f"   You can mount it manually: hdiutil attach \"{archive_path}\"")
        else:
            print("ℹ️ Note: .dmg is a macOS Disk Image.")
            return archive_path

    # Ensure executable permissions on extracted server binaries and shell scripts
    for binary_name in ("bombsquad_headless", "bombsquad_server"):
        for binary in extract_dir.rglob(binary_name):
            if binary.is_file():
                try:
                    current_mode = binary.stat().st_mode
                    binary.chmod(current_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
                    print(f"   ✓ Marked executable: {binary.relative_to(extract_dir)}")
                except Exception:
                    pass

    print(f"✅ Setup completed successfully at {extract_dir}")
    return extract_dir


def install_plugins_to_user_mods(sys_info: SystemInfo) -> None:
    """Installs project plugins into the active user mods directory."""
    mods_dir = get_user_mods_dir(sys_info)
    mods_dir.mkdir(parents=True, exist_ok=True)
    print(f"\n🔌 Installing plugins into user mods directory: {mods_dir}")

    installed_count = 0
    for plugin_path in PLUGINS_DIR.glob("*.py"):
        if plugin_path.name.startswith("__"):
            continue
        dest = mods_dir / plugin_path.name
        shutil.copy2(plugin_path, dest)
        print(f"   ✓ Installed: {plugin_path.name}")
        installed_count += 1

    print(f"✅ {installed_count} plugins installed to game mods directory.")


def process_package(latest_pkg: str, dest_dir: Path) -> None:
    downloads_dir = Path("bin/downloads")
    downloads_dir.mkdir(parents=True, exist_ok=True)
    archive_path = downloads_dir / latest_pkg

    url = BUILDS_URL + latest_pkg

    if not archive_path.exists():
        download_file(url, archive_path)
    else:
        print(f"📦 Archive already cached at {archive_path}")

    extract_archive(archive_path, dest_dir)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Download and extract the suitable BombSquad/Ballistica executable for your OS."
    )
    parser.add_argument(
        "--target",
        choices=["server", "client", "all"],
        default="all",
        help="Type of executable: 'server' (headless engine CLI), 'client' (GUI desktop app), or 'all' (both, default).",
    )
    parser.add_argument(
        "--dest",
        type=Path,
        default=Path("bin/bombsquad"),
        help="Destination directory for extraction (default: bin/bombsquad).",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Check matching builds without downloading.",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Remove destination directory before extracting.",
    )
    parser.add_argument(
        "--install-mods",
        action="store_true",
        default=True,
        help="Automatically copy workspace plugins into the OS user mods folder (default: enabled).",
    )

    args = parser.parse_args()

    sys_info = detect_system()
    print(f"🖥️ Detected System: OS={sys_info.os_name.upper()}, ARCH={sys_info.arch}")
    print(f"🔍 Querying builds from {BUILDS_URL}...")

    try:
        filenames = fetch_build_index()
    except Exception as e:
        print(f"❌ Failed to query build index: {e}", file=sys.stderr)
        return 1

    targets_to_fetch = ["server", "client"] if args.target == "all" else [args.target]

    dest_dir = args.dest.resolve()
    if args.clean and dest_dir.exists():
        print(f"🧹 Cleaning destination directory: {dest_dir}")
        shutil.rmtree(dest_dir)

    for t in targets_to_fetch:
        print(f"\n─────────────────────────────────────────────────────────────")
        print(f"🎯 Target: {t.upper()}")
        matches = find_matching_packages(filenames, sys_info, target=t)
        if not matches:
            print(f"⚠️ No matching packages found for target={t} on {sys_info.os_name} ({sys_info.arch})")
            continue

        latest_pkg = matches[-1]
        print(f"📦 Selected package: {latest_pkg}")

        if args.check:
            continue

        process_package(latest_pkg, dest_dir)

    if args.install_mods and not args.check:
        install_plugins_to_user_mods(sys_info)

    if not args.check:
        print("\n═════════════════════════════════════════════════════════════")
        print("🎉 Setup Complete!")
        print("═════════════════════════════════════════════════════════════")
        print(f"📁 Installation Directory: {dest_dir}")

        app_bundle = dest_dir / "BombSquad.app"
        if app_bundle.exists():
            print(f"\n🎮 GUI Game Client:")
            print(f"   Launch with:  open \"{app_bundle}\"")
            print(f"   Install globally: cp -R \"{app_bundle}\" /Applications/")

        headless_bin = dest_dir / "dist" / "bombsquad_headless"
        if headless_bin.exists():
            print(f"\n⚙️ CLI Headless Server:")
            print(f"   Run with:    cd \"{dest_dir}\" && ./bombsquad_server")
            print(f"   Direct CLI:  \"{headless_bin}\"")

    return 0


if __name__ == "__main__":
    sys.exit(main())
