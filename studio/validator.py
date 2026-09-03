"""
studio/validator.py — Ballistica Python Code Validator

Uses Python AST and regex to validate plugins against API 9 rules, checking
for deprecated namespaces, missing metadata, and syntax errors.
"""

from __future__ import annotations

import ast
import re
from typing import Any


def validate_ballistica_code(code: str) -> dict[str, Any]:
    """Validates Python code against Ballistica API 9 modding guidelines using AST."""
    result: dict[str, Any] = {
        "valid": True,
        "syntax_error": None,
        "api_target": None,
        "warnings": [],
        "info": [],
        "classes": [],
    }

    # 1. Check Python syntax via AST
    try:
        tree = ast.parse(code)
    except SyntaxError as err:
        result["valid"] = False
        result["syntax_error"] = {
            "line": err.lineno,
            "column": err.offset,
            "message": err.msg,
            "text": err.text.strip() if err.text else "",
        }
        return result

    # 2. Check for ba_meta require api declaration
    api_match = re.search(r"#\s*ba_meta\s+require\s+api\s+(\d+)", code)
    if api_match:
        ver = int(api_match.group(1))
        result["api_target"] = ver
        if ver < 9:
            result["warnings"].append(
                f"API {ver} detected. BombSquad 1.7.37+ standard is API 9. Legacy API versions may experience deprecation warnings."
            )
        else:
            result["info"].append(f"Targeting modern Ballistica API {ver}.")
    else:
        result["warnings"].append(
            "Missing '# ba_meta require api 9' header. Ballistica requires this declaration to load your mod."
        )

    # 3. Check for deprecated API 6/7 imports
    if re.search(r"\bimport\s+bs\b|\bfrom\s+bs\s+import", code):
        result["warnings"].append(
            "Legacy 'bs' namespace detected. In API 9, replace 'import bs' with modular imports: 'babase', 'bascenev1', and 'bauiv1'."
        )

    # 4. Check for ba_meta export tags
    if not re.search(r"#\s*ba_meta\s+export", code):
        result["warnings"].append(
            "No '# ba_meta export' tag found. Ballistica expects classes to be exported (e.g. '# ba_meta export babase.Plugin' or '# ba_meta export bascenev1.GameActivity')."
        )

    # 5. Extract class names from AST
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            base_names = [b.id if isinstance(b, ast.Name) else getattr(b, "attr", "Base") for b in node.bases]
            result["classes"].append({
                "name": node.name,
                "line": node.lineno,
                "bases": base_names,
            })

    if not result["warnings"]:
        result["info"].append("Code conforms cleanly to Ballistica API 9 structure.")

    return result
