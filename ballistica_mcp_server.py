#!/usr/bin/env python3
"""
Ballistica MCP Server - Exposes Ballistica / BombSquad APIs and tools to LLM agents.

Requirements: pip install -r requirements.txt
Usage: python ballistica_mcp_server.py
Env: BALLISTICA_API_KEY=your_key (or set in .env)
"""

import ast
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv(Path(__file__).parent / ".env")

try:
    from mcp.server.mcpserver import MCPServer
    USE_MCP_V2 = True
except ImportError:
    from mcp.server import Server
    from mcp.server.stdio import stdio_server
    from mcp.types import Tool, TextContent
    USE_MCP_V2 = False

BALLISTICA_API_BASE = os.getenv("BALLISTICA_API_BASE", "https://ballistica.net/api")


@dataclass
class BallisticaClient:
    api_key: str
    base_url: str = BALLISTICA_API_BASE
    timeout: float = 30.0

    async def _request(
        self,
        method: str,
        endpoint: str,
        json_data: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if not self.api_key:
            raise ValueError("BALLISTICA_API_KEY is not configured in .env or environment")
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.request(
                method,
                f"{self.base_url}{endpoint}",
                headers=headers,
                json=json_data,
                params=params,
            )
            response.raise_for_status()
            return response.json()

    async def list_workspaces(self) -> list[dict[str, Any]] | dict[str, Any]:
        return await self._request("GET", "/workspaces")

    async def create_workspace(self, name: str, description: str = "") -> dict[str, Any]:
        return await self._request("POST", "/workspaces", json_data={"name": name, "description": description})

    async def upload_file(self, workspace_id: str, path: str, content: str) -> dict[str, Any]:
        return await self._request(
            "POST",
            f"/workspaces/{workspace_id}/files",
            json_data={"path": path, "content": content},
        )

    async def download_file(self, workspace_id: str, path: str) -> dict[str, Any]:
        return await self._request(
            "GET",
            f"/workspaces/{workspace_id}/files",
            params={"path": path},
        )


def validate_ballistica_code(code: str, api_version: str = "9") -> dict[str, Any]:
    """Validates Python code against syntax and Ballistica API standards."""
    errors: list[str] = []
    warnings: list[str] = []
    metadata: dict[str, Any] = {}

    try:
        parsed = ast.parse(code)
    except SyntaxError as e:
        errors.append(f"Syntax error at line {e.lineno}, col {e.offset}: {e.msg}")
        return {
            "valid": False,
            "errors": errors,
            "warnings": warnings,
            "api_version": api_version,
            "metadata": metadata,
        }

    # Inspect comments and AST for API conventions
    lines = code.splitlines()
    has_meta_api = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("# ba_meta require api"):
            has_meta_api = True
            req_ver = stripped.split()[-1]
            metadata["required_api"] = req_ver
        if stripped.startswith("# ba_meta export"):
            metadata["export"] = stripped.replace("# ba_meta export", "").strip()

    if not has_meta_api:
        warnings.append("Missing '# ba_meta require api <version>' tag at the top of plugin script.")

    # Check imports
    for node in ast.walk(parsed):
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name == "ba" and api_version >= "8":
                    warnings.append(
                        "Legacy 'import ba' detected. For Ballistica API 8+, use 'babase', 'bascenev1', and 'bauiv1'."
                    )
        elif isinstance(node, ast.ImportFrom):
            if node.module == "ba" and api_version >= "8":
                warnings.append(
                    "Legacy 'from ba import ...' detected. Use 'babase', 'bascenev1', and 'bauiv1' on API 8+."
                )

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "api_version": api_version,
        "metadata": metadata,
    }


def create_mcp_server():
    """Initializes and configures the MCP server."""
    if USE_MCP_V2:
        server = MCPServer("ballistica")

        @server.tool(description="List all Ballistica cloud workspaces for the authenticated account.")
        async def list_workspaces() -> dict[str, Any]:
            api_key = os.getenv("BALLISTICA_API_KEY", "")
            client = BallisticaClient(api_key=api_key)
            try:
                result = await client.list_workspaces()
                return {"success": True, "workspaces": result}
            except Exception as e:
                return {"success": False, "error": f"{type(e).__name__}: {e}"}

        @server.tool(description="Create a new Ballistica cloud workspace.")
        async def create_workspace(name: str, description: str = "") -> dict[str, Any]:
            api_key = os.getenv("BALLISTICA_API_KEY", "")
            client = BallisticaClient(api_key=api_key)
            try:
                result = await client.create_workspace(name=name, description=description)
                return {"success": True, "workspace": result}
            except Exception as e:
                return {"success": False, "error": f"{type(e).__name__}: {e}"}

        @server.tool(description="Upload or sync a Python mod script to a Ballistica cloud workspace.")
        async def upload_file(workspace_id: str, path: str, content: str) -> dict[str, Any]:
            api_key = os.getenv("BALLISTICA_API_KEY", "")
            client = BallisticaClient(api_key=api_key)
            try:
                result = await client.upload_file(workspace_id=workspace_id, path=path, content=content)
                return {"success": True, "result": result}
            except Exception as e:
                return {"success": False, "error": f"{type(e).__name__}: {e}"}

        @server.tool(description="Download a mod script from a Ballistica cloud workspace.")
        async def download_file(workspace_id: str, path: str) -> dict[str, Any]:
            api_key = os.getenv("BALLISTICA_API_KEY", "")
            client = BallisticaClient(api_key=api_key)
            try:
                result = await client.download_file(workspace_id=workspace_id, path=path)
                return {"success": True, "file": result}
            except Exception as e:
                return {"success": False, "error": f"{type(e).__name__}: {e}"}

        @server.tool(description="Validate Python mod script code against Ballistica API rules and syntax.")
        def validate_python_code(code: str, api_version: str = "9") -> dict[str, Any]:
            return validate_ballistica_code(code, api_version=api_version)

        return server

    else:
        # MCP v1 compatibility
        server = Server("ballistica")
        # Tool list and dispatch for v1
        return server


if __name__ == "__main__":
    server = create_mcp_server()
    if USE_MCP_V2:
        server.run("stdio")
    else:
        import asyncio
        async def main_v1():
            async with stdio_server() as (read_stream, write_stream):
                await server.run(read_stream, write_stream, server.create_initialization_options())
        asyncio.run(main_v1())
