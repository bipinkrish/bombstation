"""
studio/config_manager.py — BombSquad Server TOML Configuration Manager

Parses, validates, presets, and serializes config.toml files.
"""

from __future__ import annotations

import json
import re
import tomllib
from pathlib import Path
from typing import Any

DEFAULT_SETTINGS: dict[str, Any] = {
    "party_name": "BombSquad Server",
    "party_is_public": True,
    "authenticate_clients": True,
    "admins": [],
    "port": 43210,
    "max_party_size": 6,
    "session_type": "ffa",
    "session_max_players_override": None,
    "playlist_code": None,
    "playlist_shuffle": True,
    "auto_balance_teams": True,
    "teams_series_length": 7,
    "ffa_series_length": 24,
    "coop_campaign": "Easy",
    "coop_level": "Onslaught Training",
    "clean_exit_minutes": 60,
    "unclean_exit_minutes": 90,
    "idle_exit_minutes": 20,
    "stats_url": None,
    "protocol_version": 38,
    "allow_punch_grab": True,
    "enable_queue": True,
    "enable_default_kick_voting": True,
    "dont_write_bytecode": False,
    "public_ipv4_address": None,
    "password": "",
}


def parse_toml_file(path: Path) -> tuple[dict[str, Any], str]:
    """Reads and parses a config.toml file."""
    if not path.exists():
        raise FileNotFoundError(f"Config file not found: {path}")

    raw_text = path.read_text(encoding="utf-8")
    try:
        parsed = tomllib.loads(raw_text)
    except Exception as exc:
        raise ValueError(f"Invalid TOML format: {exc}")

    # Merge with defaults
    merged = {**DEFAULT_SETTINGS, **parsed}
    return merged, raw_text


def format_toml_value(val: Any) -> str:
    """Formats a Python primitive to a clean TOML string representation."""
    if isinstance(val, bool):
        return "true" if val else "false"
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, str):
        escaped = val.replace("\\", "\\\\").replace('"', '\\"')
        return f'"{escaped}"'
    if isinstance(val, (list, tuple)):
        items = [format_toml_value(x) for x in val]
        return f"[{', '.join(items)}]"
    if val is None:
        return ""
    return str(val)


def generate_toml(data: dict[str, Any]) -> str:
    """Generates a well-commented, beautifully grouped config.toml string."""
    sections = [
        "# ==============================================================================",
        "# BombStation Studio — BombSquad Server Configuration (config.toml)",
        "# ==============================================================================",
        "",
    ]

    field_groups = [
        ("General Server Settings", [
            ("party_name", "Display name in gather party list"),
            ("party_is_public", "Make publicly visible in global gather master server"),
            ("password", "Join password (leave empty for public)"),
            ("public_ipv4_address", "Static public IP override if auto-detect fails"),
            ("stats_url", "URL to fetch/report live stats"),
        ]),
        ("Game Mode & Playlists", [
            ("session_type", "'ffa', 'teams', or 'coop'"),
            ("session_max_players_override", "Custom max players in game session (e.g. 999)"),
            ("playlist_code", "Custom playlist numeric code"),
            ("playlist_shuffle", "Randomize playlist order"),
            ("teams_series_length", "Matches required to win Teams mode series"),
            ("ffa_series_length", "Matches required to win FFA series"),
            ("auto_balance_teams", "Automatically keep teams equal"),
            ("allow_punch_grab", "Enable/disable punching and grabbing"),
            ("coop_campaign", "Co-op campaign name"),
            ("coop_level", "Co-op mission name"),
        ]),
        ("Network & Player Limits", [
            ("port", "UDP listening port (default: 43210)"),
            ("max_party_size", "Maximum connected clients"),
            ("protocol_version", "Network protocol version (API 9: 38)"),
            ("authenticate_clients", "Require Ballistica V2 accounts"),
            ("admins", "List of admin Ballistica account IDs (e.g. 'pb-xyz')"),
            ("enable_queue", "Queue incoming players when party is full"),
            ("enable_default_kick_voting", "Allow players to vote-kick"),
        ]),
        ("Process Lifetime & Maintenance", [
            ("clean_exit_minutes", "Restart cleanly after match idle"),
            ("idle_exit_minutes", "Exit if server is empty for N minutes"),
            ("unclean_exit_minutes", "Hard shutdown after N minutes"),
            ("dont_write_bytecode", "Disable Python .pyc cache compilation"),
        ]),
    ]

    written_keys = set()

    for group_title, fields in field_groups:
        sections.append(f"# --- {group_title} ---")
        for key, comment in fields:
            written_keys.add(key)
            if key in data and data[key] is not None:
                val = data[key]
                if key == "password" and not val:
                    sections.append(f'password = ""  # {comment}')
                else:
                    sections.append(f"{key} = {format_toml_value(val)}  # {comment}")
            elif key == "password":
                sections.append('password = ""')
        sections.append("")

    return "\n".join(sections).strip() + "\n"
