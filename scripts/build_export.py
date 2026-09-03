#!/usr/bin/env python3
"""
scripts/build_export.py — BombStation Mod Build & Export Pipeline

Automates validating, packaging, and distributing BombSquad / Ballistica plugins:
- Verifies Ballistica API version compatibility (API 9 default)
- Parses and validates embedded or accompanying .bob/.cob 3D assets
- Injects or validates 'plugman' metadata headers
- Generates clean release ZIP packages in dist/
- Optionally deploys directly to target BombSquad user mods directory
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sys
import zipfile
from pathlib import Path
from typing import Any

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent

# Add workspace to path for studio imports
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

try:
    from studio.process_manager import get_default_mods_dir
    DEFAULT_MODS_DIR = get_default_mods_dir()
except ImportError:
    if sys.platform == "darwin":
        DEFAULT_MODS_DIR = Path.home() / "Library" / "Application Support" / "BombSquad" / "mods"
    elif sys.platform.startswith("win"):
        local_app_data = os.environ.get("LOCALAPPDATA")
        base = Path(local_app_data) if local_app_data else Path.home() / "AppData" / "Local"
        DEFAULT_MODS_DIR = base / "BombSquad" / "mods"
    else:
        DEFAULT_MODS_DIR = Path.home() / ".bombsquad" / "mods"

DIST_DIR = WORKSPACE_ROOT / "dist"

try:
    from studio.asset_parser import parse_bob, parse_cob
except ImportError:
    parse_bob = None
    parse_cob = None


def validate_plugin_script(script_path: Path, target_api: int = 9) -> dict[str, Any]:
    """Validates a Python plugin file for Ballistica API 9 conformance."""
    content = script_path.read_text(encoding="utf-8", errors="replace")
    report: dict[str, Any] = {
        "path": str(script_path),
        "filename": script_path.name,
        "valid": True,
        "api": None,
        "plugman": None,
        "errors": [],
        "warnings": [],
    }

    # Check API tag
    api_match = re.search(r"#\s*ba_meta\s+require\s+api\s+(\d+)", content)
    if api_match:
        report["api"] = int(api_match.group(1))
        if report["api"] != target_api:
            report["warnings"].append(f"Target API is {report['api']}, recommended is {target_api}.")
    else:
        report["valid"] = False
        report["errors"].append("Missing mandatory '# ba_meta require api 9' declaration.")

    # Check for legacy namespace
    if re.search(r"\bimport\s+bs\b|\bfrom\s+bs\s+import", content):
        report["warnings"].append("Uses deprecated legacy 'bs' module. Upgrade to 'babase'/'bascenev1'.")

    # Extract plugman metadata
    plugman_match = re.search(r"plugman\s*=\s*(\{.*?\})", content, re.DOTALL)
    if plugman_match:
        try:
            # Safe evaluation of dict literal
            import ast
            report["plugman"] = ast.literal_eval(plugman_match.group(1))
        except Exception:
            report["warnings"].append("Could not parse 'plugman' metadata dictionary.")
    else:
        report["warnings"].append("No 'plugman' dictionary found. Mod will not show rich info in Plugin Manager.")

    return report


def build_and_export(
    source_path: Path,
    output_dir: Path = DIST_DIR,
    deploy_to_mods: bool = False,
    target_mods_dir: Path = DEFAULT_MODS_DIR,
    target_api: int = 9,
) -> dict[str, Any]:
    """Builds, packages, and exports a BombStation mod project."""
    source_path = source_path.resolve()
    if not source_path.exists():
        raise FileNotFoundError(f"Source path does not exist: {source_path}")

    output_dir.mkdir(parents=True, exist_ok=True)

    files_to_pack: list[Path] = []
    assets_detected: list[dict[str, Any]] = []

    if source_path.is_file():
        if source_path.suffix != ".py":
            raise ValueError(f"Single file source must be a Python script (.py): {source_path}")
        files_to_pack.append(source_path)
        mod_name = source_path.stem
    else:
        # Directory project
        mod_name = source_path.name
        for p in source_path.rglob("*"):
            if p.is_file() and not p.name.startswith("."):
                files_to_pack.append(p)

    # Validate Python scripts
    py_files = [f for f in files_to_pack if f.suffix == ".py"]
    validation_reports = []
    for py_file in py_files:
        val = validate_plugin_script(py_file, target_api=target_api)
        validation_reports.append(val)

    # Validate 3D assets (.bob and .cob)
    for f in files_to_pack:
        if f.suffix in (".bob", ".cob") and parse_bob and parse_cob:
            raw = f.read_bytes()
            try:
                if f.suffix == ".bob":
                    parsed = parse_bob(raw)
                    assets_detected.append({
                        "name": f.name,
                        "type": "bob",
                        "vertices": parsed["vertex_count"],
                        "faces": parsed["face_count"],
                    })
                else:
                    parsed = parse_cob(raw)
                    assets_detected.append({
                        "name": f.name,
                        "type": "cob",
                        "vertices": parsed["vertex_count"],
                        "faces": parsed["face_count"],
                    })
            except Exception as exc:
                assets_detected.append({
                    "name": f.name,
                    "type": f.suffix[1:],
                    "error": str(exc),
                })

    # Determine Version from plugman if available
    version = "1.0.0"
    for r in validation_reports:
        if r.get("plugman") and isinstance(r["plugman"], dict) and r["plugman"].get("version"):
            version = str(r["plugman"]["version"])
            break

    # 1. Create Distribution ZIP
    zip_filename = f"{mod_name}-v{version}.zip"
    zip_dest = output_dir / zip_filename

    with zipfile.ZipFile(zip_dest, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in files_to_pack:
            rel = f.relative_to(source_path.parent if source_path.is_file() else source_path)
            zf.write(f, arcname=str(rel))

    # 2. Optionally deploy directly to active mods directory
    deployed_files: list[str] = []
    if deploy_to_mods:
        target_mods_dir.mkdir(parents=True, exist_ok=True)
        for f in files_to_pack:
            dest = target_mods_dir / f.name
            shutil.copy2(f, dest)
            deployed_files.append(str(dest))

    # 3. Create Manifest / Catalog entry
    manifest = {
        "mod_name": mod_name,
        "version": version,
        "target_api": target_api,
        "package_zip": str(zip_dest),
        "package_size_bytes": zip_dest.stat().st_size,
        "files_count": len(files_to_pack),
        "validations": validation_reports,
        "assets": assets_detected,
        "deployed_to_mods": deployed_files if deploy_to_mods else None,
    }

    manifest_dest = output_dir / f"{mod_name}-manifest.json"
    manifest_dest.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description="BombStation Mod Build & Export Utility")
    parser.add_argument("source", type=str, help="Path to Python plugin script or mod directory")
    parser.add_argument("--out", "-o", type=str, default=str(DIST_DIR), help="Output directory (default: dist/)")
    parser.add_argument("--api", type=int, default=9, help="Target Ballistica API version (default: 9)")
    parser.add_argument("--deploy", action="store_true", help="Deploy built files to BombSquad mods folder")
    parser.add_argument("--mods-dir", type=str, default=str(DEFAULT_MODS_DIR), help="Target mods folder")

    args = parser.parse_args()

    print(f"💣 BombStation Build & Export Pipeline")
    print(f"   Source: {args.source}")
    print(f"   Target API: {args.api}")

    try:
        manifest = build_and_export(
            source_path=Path(args.source),
            output_dir=Path(args.out),
            deploy_to_mods=args.deploy,
            target_mods_dir=Path(args.mods_dir),
            target_api=args.api,
        )
        print("\n✅ Build succeeded!")
        print(f"   Package: {manifest['package_zip']} ({manifest['package_size_bytes']} bytes)")
        if manifest['deployed_to_mods']:
            print(f"   Deployed to mods directory: {len(manifest['deployed_to_mods'])} files")
        print(f"   Assets detected: {len(manifest['assets'])}")
        for a in manifest['assets']:
            print(f"     • {a['name']} ({a['type'].upper()}): {a.get('vertices', 0)} verts")
    except Exception as exc:
        print(f"\n❌ Build failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
