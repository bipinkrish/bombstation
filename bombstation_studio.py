#!/usr/bin/env python3
"""
bombstation_studio.py — BombStation Studio Entry Point

All-in-One Ballistica & BombSquad Developer Studio:
- Server Operations & Terminal
- Server Config Studio (config.toml)
- Plugin & Mod Catalog
- Ballistica Code Studio (Monaco Editor & AST Validator)
- 3D Arena & Scene Builder (.bob & .cob Asset Support)
- Ballistica MCP & AI Hub
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Ensure workspace root is in python path
ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from studio.server import run_server, run_desktop_app, PORT, HOST


def main() -> None:
    parser = argparse.ArgumentParser(description="BombStation Studio — All-in-One Ballistica Suite")
    parser.add_argument("--port", type=int, default=PORT, help=f"Port to bind Studio (default: {PORT})")
    parser.add_argument("--host", type=str, default=HOST, help=f"Host to bind Studio (default: {HOST})")
    parser.add_argument("--browser", action="store_true", help="Launch in default system web browser instead of native desktop window")
    parser.add_argument("--no-open", action="store_true", help="Run background server only (do not open native window or browser)")
    args = parser.parse_args()

    # Determine window mode
    has_webview = False
    try:
        import webview
        has_webview = True
    except ImportError:
        pass

    if args.no_open:
        run_server(port=args.port, host=args.host, auto_open=False)
    elif args.browser or not has_webview:
        run_server(port=args.port, host=args.host, auto_open=True)
    else:
        run_desktop_app(port=args.port, host=args.host)


if __name__ == "__main__":
    main()
