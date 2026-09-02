#!/usr/bin/env python3
"""
test_plugins.py — Test Runner for BombStation Plugins.

Performs static AST/API linting, isolated mock testing, and live engine
runtime integration testing using the native Ballistica executable.

Usage:
    python3 scripts/test_plugins.py [--skip-engine] [--verbose]
"""

from __future__ import annotations

import argparse
import ast
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

# Color codes
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
PLUGINS_DIR = WORKSPACE_ROOT / "plugins"
BIN_DIR = WORKSPACE_ROOT / "bin" / "bombsquad"

PLUGINS = [
    "unlock_max_players.py",
    "unlock_all_characters.py",
]


class TestResult:
    def __init__(self, name: str):
        self.name = name
        self.passed = 0
        self.failed = 0
        self.errors: list[str] = []

    def assert_true(self, condition: bool, message: str) -> None:
        if condition:
            self.passed += 1
            print(f"   {GREEN}✓{RESET} {message}")
        else:
            self.failed += 1
            self.errors.append(message)
            print(f"   {RED}✗{RESET} {message}")

    def is_successful(self) -> bool:
        return self.failed == 0


def test_static_ast(plugin_file: Path) -> TestResult:
    """Validates plugin structure, metadata tags, and syntax."""
    result = TestResult(f"Static AST: {plugin_file.name}")
    print(f"\n{BOLD}{CYAN}▶ Checking Static AST & API 9 Metadata: {plugin_file.name}{RESET}")

    content = plugin_file.read_text(encoding="utf-8")
    
    # 1. Parse AST
    try:
        tree = ast.parse(content)
        result.assert_true(True, "Valid Python syntax")
    except SyntaxError as exc:
        result.assert_true(False, f"Syntax error: {exc}")
        return result

    # 2. Check API requirement tag
    lines = content.splitlines()
    has_api_req = any(line.strip() == "# ba_meta require api 9" for line in lines)
    result.assert_true(has_api_req, "Contains '# ba_meta require api 9'")

    # 3. Check export tag placement (must immediately precede class definition)
    export_valid = False
    for idx, line in enumerate(lines):
        if line.strip() == "# ba_meta export babase.Plugin":
            # Check next non-empty lines
            for next_line in lines[idx + 1:]:
                stripped = next_line.strip()
                if not stripped or stripped.startswith("#"):
                    continue
                if stripped.startswith("class "):
                    export_valid = True
                break
    result.assert_true(export_valid, "'# ba_meta export babase.Plugin' directly precedes class definition")

    # 4. Check plugman metadata
    has_plugman = any(
        isinstance(node, ast.Assign) and any(
            isinstance(t, ast.Name) and t.id == "plugman" for t in node.targets
        )
        for node in tree.body
    )
    result.assert_true(has_plugman, "Defines 'plugman' metadata dictionary for Plugin Manager")

    # 5. Check plugin class definition with on_app_running
    has_plugin_class = False
    has_on_app_running = False
    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            if "Plugin" in node.name:
                has_plugin_class = True
                for item in node.body:
                    if isinstance(item, ast.FunctionDef) and item.name == "on_app_running":
                        has_on_app_running = True
    result.assert_true(has_plugin_class, "Defines Plugin class")
    result.assert_true(has_on_app_running, "Implements 'on_app_running()' lifecycle hook")

    return result


def test_mocked_unit() -> TestResult:
    """Tests plugin logic in isolation with mock engine objects."""
    result = TestResult("Mock Subsystem Unit Tests")
    print(f"\n{BOLD}{CYAN}▶ Running Mock Subsystem Unit Tests{RESET}")

    # Create mock environment
    class MockConfig(dict):
        def __init__(self):
            super().__init__()
            self.committed = False

        def apply_and_commit(self):
            self.committed = True

    class MockApp:
        def __init__(self):
            self.config = MockConfig()
            self.classic = MockClassic()

    class MockClassic:
        def __init__(self):
            self.spaz_appearances = {
                "Spaz": {},
                "Zoe": {},
                "Kronk": {},
                "Frosty": {},
                "Pixel": {},
            }
            self.store = MockStore()

    class MockStore:
        def get_store_items(self):
            return {
                "characters.frosty": {},
                "characters.pixel": {},
            }

    class MockBabase:
        def __init__(self):
            self.app = MockApp()
            self.messages = []

        def screenmessage(self, msg, color=None):
            self.messages.append((msg, color))

        class Plugin:
            pass

    # Inject mock into sys.modules
    mock_babase = MockBabase()
    sys.modules["babase"] = mock_babase

    # Test UnlockMaxPlayers
    try:
        # Import plugin dynamically
        sys.path.insert(0, str(PLUGINS_DIR))
        import unlock_max_players
        import unlock_all_characters

        # Test max players logic
        mp_plugin = unlock_max_players.UnlockMaxPlayersPlugin()
        mp_plugin.on_app_running()

        result.assert_true(
            mock_babase.app.config.get("Coop Game Max Players") == 999,
            "Mock Coop Game Max Players set to 999",
        )
        result.assert_true(
            mock_babase.app.config.get("Team Game Max Players") == 999,
            "Mock Team Game Max Players set to 999",
        )
        result.assert_true(
            mock_babase.app.config.get("Free-for-All Max Players") == 999,
            "Mock Free-for-All Game Max Players set to 999",
        )
        result.assert_true(
            mock_babase.app.config.committed,
            "Mock config.apply_and_commit() was called",
        )

        # Test unlock all characters discovery
        chars = unlock_all_characters.get_all_registered_appearances()
        result.assert_true(
            len(chars) == 5 and "Frosty" in chars,
            f"Discovered all {len(chars)} mock appearances",
        )

        # Test purchase keys discovery
        purchase_keys = unlock_all_characters.get_all_character_purchase_keys()
        result.assert_true(
            "characters.frosty" in purchase_keys and "characters.pixel" in purchase_keys,
            "Discovered store purchase keys for locked characters",
        )

    except Exception as exc:
        result.assert_true(False, f"Unit test exception: {exc}")

    return result


def test_live_engine() -> TestResult:
    """Runs plugins directly inside the downloaded Ballistica engine executable."""
    result = TestResult("Live Ballistica Engine Execution")
    print(f"\n{BOLD}{CYAN}▶ Running Live Ballistica Engine Integration Tests{RESET}")

    # Check for executable
    dist_dir = BIN_DIR / "dist"
    headless_bin = dist_dir / "bombsquad_headless"

    if not headless_bin.exists():
        result.assert_true(
            False,
            f"Headless binary not found at {headless_bin}. Run scripts/get_bombsquad.py first.",
        )
        return result

    result.assert_true(True, f"Found engine executable: {headless_bin.name}")

    # Build the in-engine Python test script
    engine_test_code = """
import babase, _babase
import bascenev1 as bs
import bascenev1lib.actor.spazappearance as sa
import unlock_max_players
import unlock_all_characters

# 1. Verify plugin discovery
meta = babase.app.meta
assert meta.scanresults is not None, 'Scan results empty'
plugins = meta.scanresults.exports.get('babase.Plugin', [])
assert 'unlock_max_players.UnlockMaxPlayersPlugin' in plugins, 'unlock_max_players not in exports'
assert 'unlock_all_characters.UnlockAllCharactersPlugin' in plugins, 'unlock_all_characters not in exports'
print('ENGINE_TEST: Plugin exports verified in Ballistica meta-registry.')

# 2. Test UnlockMaxPlayersPlugin execution
plugin_mp = unlock_max_players.UnlockMaxPlayersPlugin()
plugin_mp.on_app_running()
cfg = babase.app.config
assert cfg['Coop Game Max Players'] == 999
assert cfg['Team Game Max Players'] == 999
assert cfg['Free-for-All Max Players'] == 999
print('ENGINE_TEST: Max players verified at 999 across all modes.')

# 3. Test UnlockAllCharactersPlugin execution
plugin_chars = unlock_all_characters.UnlockAllCharactersPlugin()
plugin_chars.on_app_running()
appearances = sa.get_appearances(include_locked=False)
assert len(appearances) >= 20, f'Expected >=20 characters, got {len(appearances)}'
player_chars = bs.getplayercharacters()
assert len(player_chars) >= 20, f'Expected >=20 player characters, got {len(player_chars)}'
print(f'ENGINE_TEST: Successfully unlocked {len(appearances)} characters in live engine.')

print('ALL_ENGINE_TESTS_PASSED')
_babase.quit()
"""

    cmd = [
        str(headless_bin),
        "-m",
        str(PLUGINS_DIR),
        "-e",
        engine_test_code,
    ]

    try:
        proc = subprocess.run(
            cmd,
            cwd=str(dist_dir),
            capture_output=True,
            text=True,
            timeout=15,
        )

        output = proc.stdout + "\n" + proc.stderr
        passed = "ALL_ENGINE_TESTS_PASSED" in output and proc.returncode == 0

        result.assert_true(
            "ENGINE_TEST: Plugin exports verified" in output,
            "Ballistica meta-scanner scanned and exported both plugins",
        )
        result.assert_true(
            "ENGINE_TEST: Max players verified at 999" in output,
            "Max players plugin applied 999 player limit into engine config",
        )
        result.assert_true(
            "ENGINE_TEST: Successfully unlocked" in output,
            "All characters plugin patched spazappearance & getplayercharacters",
        )
        result.assert_true(
            passed,
            "Engine booted, executed assertions, and shut down cleanly (exit code 0)",
        )

    except subprocess.TimeoutExpired:
        result.assert_true(False, "Engine test timed out after 15s")
    except Exception as exc:
        result.assert_true(False, f"Engine execution failed: {exc}")

    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Test runner for BombStation plugins.")
    parser.add_argument(
        "--skip-engine",
        action="store_true",
        help="Skip live Ballistica engine test (run static & unit tests only).",
    )
    args = parser.parse_args()

    print(f"\n{BOLD}═══════════════════════════════════════════════════════════════{RESET}")
    print(f"{BOLD}           BOMBSTATION PLUGIN TEST SUITE                       {RESET}")
    print(f"{BOLD}═══════════════════════════════════════════════════════════════{RESET}")

    results: list[TestResult] = []

    # 1. Static AST checks
    for plugin_name in PLUGINS:
        plugin_path = PLUGINS_DIR / plugin_name
        results.append(test_static_ast(plugin_path))

    # 2. Mock Unit Tests
    results.append(test_mocked_unit())

    # 3. Live Engine Integration Tests
    if not args.skip_engine:
        results.append(test_live_engine())

    # Summary
    print(f"\n{BOLD}═══════════════════════════════════════════════════════════════{RESET}")
    print(f"{BOLD}                     TEST RESULTS SUMMARY                      {RESET}")
    print(f"{BOLD}═══════════════════════════════════════════════════════════════{RESET}")

    total_passed = sum(r.passed for r in results)
    total_failed = sum(r.failed for r in results)

    for r in results:
        status = f"{GREEN}PASSED{RESET}" if r.is_successful() else f"{RED}FAILED{RESET}"
        print(f"  [{status}] {r.name} ({r.passed} passed, {r.failed} failed)")

    print(f"\nTotal Assertions: {GREEN}{total_passed} passed{RESET}, {RED if total_failed else GREEN}{total_failed} failed{RESET}")

    if total_failed > 0:
        print(f"\n{RED}❌ Some tests failed!{RESET}")
        return 1

    print(f"\n{GREEN}{BOLD}🎉 ALL TESTS PASSED SUCCESSFULLY!{RESET}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
