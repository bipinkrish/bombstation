#!/usr/bin/env python3
"""
scripts/compile_executable.py — Standalone Executable Compiler for BombStation Studio

Compiles the entire BombStation Studio (Python runtime, studio modules, Three.js diorama,
Monaco Editor, and web GUI) into a single self-contained standalone executable file
using PyInstaller.

Supports:
- macOS (Mach-O 64-bit binary)
- Windows (bombstation_studio.exe)
- Linux (ELF 64-bit binary)
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST_DIR = ROOT / "dist"
BUILD_DIR = ROOT / "build"
ENTRYPOINT = ROOT / "bombstation_studio.py"
GUI_DIR = ROOT / "gui"
ASSETS_DIR = ROOT / "assets"


def ensure_pyinstaller() -> bool:
    """Checks if pyinstaller is installed; installs if missing."""
    try:
        import PyInstaller  # type: ignore
        return True
    except ImportError:
        print("⚠️  PyInstaller not detected in current environment.")
        install = input("Would you like to install PyInstaller now via pip? (y/N): ").strip().lower()
        if install == "y":
            print("📦 Installing pyinstaller...")
            subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"], check=True)
            return True
        else:
            print("Please run 'pip install pyinstaller' to compile to executable.")
            return False


def build_executable(onefile: bool = True, clean: bool = True) -> Path:
    """Runs PyInstaller to compile BombStation Studio to a single standalone binary."""
    if not ensure_pyinstaller():
        sys.exit(1)

    sep = ";" if sys.platform.startswith("win") else ":"
    gui_data = f"{GUI_DIR}{sep}gui"

    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--name=bombstation_studio",
        f"--add-data={gui_data}",
    ]

    if ASSETS_DIR.exists():
        assets_data = f"{ASSETS_DIR}{sep}assets"
        cmd.append(f"--add-data={assets_data}")

    if onefile:
        cmd.append("--onefile")

    if clean:
        cmd.append("--clean")

    # Add hidden imports for stdlib dynamic modules
    cmd.extend([
        "--hidden-import=tomllib",
        "--hidden-import=http.server",
        "--hidden-import=socketserver",
        "--hidden-import=urllib.request",
        "--hidden-import=urllib.parse",
    ])

    cmd.append(str(ENTRYPOINT))

    print("\n=======================================================")
    print("🔨 Compiling BombStation Studio to Standalone Executable")
    print(f"   Platform:   {sys.platform}")
    print(f"   Entrypoint: {ENTRYPOINT}")
    print(f"   Target:     {DIST_DIR}")
    print("=======================================================\n")

    subprocess.run(cmd, cwd=str(ROOT), check=True)

    exe_name = "bombstation_studio.exe" if sys.platform.startswith("win") else "bombstation_studio"
    binary_path = DIST_DIR / exe_name

    if binary_path.exists():
        size_mb = binary_path.stat().st_size / (1024 * 1024)
        print("\n✅ Compilation successful!")
        print(f"   Binary: {binary_path}")
        print(f"   Size:   {size_mb:.1f} MB")
        print("   Ready to distribute without requiring Python on the target machine.")
    return binary_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Compile BombStation Studio to single executable")
    parser.add_argument("--dir", action="store_true", help="Build directory bundle instead of single file")
    parser.add_argument("--no-clean", action="store_true", help="Do not clean build cache before compiling")
    args = parser.parse_args()

    build_executable(onefile=not args.dir, clean=not args.no_clean)


if __name__ == "__main__":
    main()
