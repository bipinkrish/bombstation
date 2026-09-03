"""
studio/asset_parser.py — Ballistica .bob and .cob Asset Pipeline

Provides binary decoding, validation, and serialization for:
- .bob (Ballistica Object Binary): Visual 3D models and skeletal meshes (Magic: 45623)
- .cob (Collision Object Binary): Physics collision hulls for Bullet/ODE (Magic: 13466)
"""

from __future__ import annotations

import struct
from typing import Any

# Magic signatures
BOB_MAGIC = 45623
COB_MAGIC = 13466


class AssetParseError(Exception):
    """Raised when parsing .bob or .cob binary fails."""
    pass


def parse_bob(data: bytes) -> dict[str, Any]:
    """
    Parses a Ballistica Object Binary (.bob) visual mesh.
    
    Binary Layout:
    - Magic (2 or 4 bytes): 45623
    - Format/Version (2 or 4 bytes)
    - Vertex Count (4 bytes uint)
    - Face Count (4 bytes uint)
    - Vertex Data: [x, y, z, nx, ny, nz, u, v] per vertex
    - Index Data: 3 indices per face (uint16)
    """
    if len(data) < 16:
        raise AssetParseError("File is too small to be a valid .bob asset.")

    offset = 0

    # Read magic (try 2-byte then 4-byte)
    magic_short = struct.unpack_from("<H", data, offset)[0]
    if magic_short == BOB_MAGIC:
        offset += 2
        mesh_format = struct.unpack_from("<H", data, offset)[0]
        offset += 2
    else:
        magic_int = struct.unpack_from("<I", data, offset)[0]
        if magic_int != BOB_MAGIC:
            raise AssetParseError(f"Invalid .bob magic number: {magic_int} (expected {BOB_MAGIC})")
        offset += 4
        mesh_format = struct.unpack_from("<I", data, offset)[0]
        offset += 4

    vertex_count, face_count = struct.unpack_from("<II", data, offset)
    offset += 8

    if vertex_count > 500000 or face_count > 500000:
        raise AssetParseError(f"Unreasonable mesh dimensions: {vertex_count} verts, {face_count} faces.")

    vertices: list[float] = []
    normals: list[float] = []
    uvs: list[float] = []

    # Vertex stride: (x, y, z: 3 floats) + (nx, ny, nz: 3 floats) + (u, v: 2 floats) = 32 bytes
    stride = 32
    available_vertex_bytes = len(data) - offset

    # If file format matches standard full vertex format:
    if available_vertex_bytes >= vertex_count * stride:
        for _ in range(vertex_count):
            vx, vy, vz, nx, ny, nz, u, v = struct.unpack_from("<8f", data, offset)
            vertices.extend([vx, vy, vz])
            normals.extend([nx, ny, nz])
            uvs.extend([u, v])
            offset += stride
    else:
        # Simplified position-only or compressed fallback (x, y, z: 3 floats = 12 bytes)
        simple_stride = 12
        for _ in range(vertex_count):
            if offset + simple_stride > len(data):
                break
            vx, vy, vz = struct.unpack_from("<3f", data, offset)
            vertices.extend([vx, vy, vz])
            offset += simple_stride

    # Face indices (triangle triplets, uint16)
    indices: list[int] = []
    expected_indices = face_count * 3
    if offset + expected_indices * 2 <= len(data):
        for _ in range(expected_indices):
            idx = struct.unpack_from("<H", data, offset)[0]
            indices.append(idx)
            offset += 2
    elif offset + expected_indices * 4 <= len(data):
        # 32-bit index fallback
        for _ in range(expected_indices):
            idx = struct.unpack_from("<I", data, offset)[0]
            indices.append(idx)
            offset += 4

    return {
        "type": "bob",
        "mesh_format": mesh_format,
        "vertex_count": vertex_count,
        "face_count": face_count,
        "positions": vertices,
        "normals": normals,
        "uvs": uvs,
        "indices": indices,
    }


def parse_cob(data: bytes) -> dict[str, Any]:
    """
    Parses a Ballistica Collision Object Binary (.cob) physics hull.
    
    Binary Layout:
    - Magic (4 bytes uint): 13466
    - Vertex Count (4 bytes uint)
    - Face Count (4 bytes uint)
    - Vertex Positions: [x, y, z] per vertex (3 floats = 12 bytes)
    - Face Indices: 3 indices per face (uint32 = 12 bytes per face)
    - Face Normals: [nx, ny, nz] per face (3 floats = 12 bytes per face)
    """
    if len(data) < 12:
        raise AssetParseError("File is too small to be a valid .cob asset.")

    offset = 0
    magic = struct.unpack_from("<I", data, offset)[0]
    offset += 4

    if magic != COB_MAGIC:
        raise AssetParseError(f"Invalid .cob magic number: {magic} (expected {COB_MAGIC})")

    vertex_count, face_count = struct.unpack_from("<II", data, offset)
    offset += 8

    if vertex_count > 200000 or face_count > 200000:
        raise AssetParseError(f"Unreasonable collision hull dimensions: {vertex_count} verts, {face_count} faces.")

    vertices: list[float] = []
    for _ in range(vertex_count):
        if offset + 12 > len(data):
            break
        vx, vy, vz = struct.unpack_from("<3f", data, offset)
        vertices.extend([vx, vy, vz])
        offset += 12

    indices: list[int] = []
    for _ in range(face_count * 3):
        if offset + 4 > len(data):
            break
        idx = struct.unpack_from("<I", data, offset)[0]
        indices.append(idx)
        offset += 4

    face_normals: list[float] = []
    for _ in range(face_count):
        if offset + 12 > len(data):
            break
        nx, ny, nz = struct.unpack_from("<3f", data, offset)
        face_normals.extend([nx, ny, nz])
        offset += 12

    return {
        "type": "cob",
        "vertex_count": vertex_count,
        "face_count": face_count,
        "positions": vertices,
        "indices": indices,
        "face_normals": face_normals,
    }


def create_sample_bob() -> bytes:
    """Generates a valid binary .bob file (a smooth hexagonal diorama platform)."""
    vertices: list[tuple[float, float, float, float, float, float, float, float]] = [
        # x, y, z, nx, ny, nz, u, v
        (0.0, 1.5, 0.0, 0.0, 1.0, 0.0, 0.5, 0.5),
        (-3.0, 1.5, -5.2, 0.0, 1.0, 0.0, 0.2, 0.1),
        (3.0, 1.5, -5.2, 0.0, 1.0, 0.0, 0.8, 0.1),
        (6.0, 1.5, 0.0, 0.0, 1.0, 0.0, 1.0, 0.5),
        (3.0, 1.5, 5.2, 0.0, 1.0, 0.0, 0.8, 0.9),
        (-3.0, 1.5, 5.2, 0.0, 1.0, 0.0, 0.2, 0.9),
        (-6.0, 1.5, 0.0, 0.0, 1.0, 0.0, 0.0, 0.5),
    ]

    faces = [
        (0, 1, 2),
        (0, 2, 3),
        (0, 3, 4),
        (0, 4, 5),
        (0, 5, 6),
        (0, 6, 1),
    ]

    header = struct.pack("<HHII", BOB_MAGIC, 1, len(vertices), len(faces))
    v_bytes = bytearray()
    for v in vertices:
        v_bytes.extend(struct.pack("<8f", *v))

    i_bytes = bytearray()
    for f in faces:
        i_bytes.extend(struct.pack("<3H", *f))

    return bytes(header + v_bytes + i_bytes)


def create_sample_cob() -> bytes:
    """Generates a valid binary .cob collision file (a low-poly collision hull)."""
    vertices = [
        (-4.0, 0.0, -4.0),
        (4.0, 0.0, -4.0),
        (4.0, 0.0, 4.0),
        (-4.0, 0.0, 4.0),
        (-4.0, 2.0, -4.0),
        (4.0, 2.0, -4.0),
        (4.0, 2.0, 4.0),
        (-4.0, 2.0, 4.0),
    ]
    faces = [
        (4, 5, 6), (4, 6, 7),  # Top
        (0, 3, 2), (0, 2, 1),  # Bottom
        (0, 1, 5), (0, 5, 4),  # Front
        (2, 3, 7), (2, 7, 6),  # Back
        (0, 4, 7), (0, 7, 3),  # Left
        (1, 2, 6), (1, 6, 5),  # Right
    ]

    header = struct.pack("<III", COB_MAGIC, len(vertices), len(faces))
    v_bytes = bytearray()
    for v in vertices:
        v_bytes.extend(struct.pack("<3f", *v))

    i_bytes = bytearray()
    for f in faces:
        i_bytes.extend(struct.pack("<3I", *f))

    n_bytes = bytearray()
    for _ in faces:
        n_bytes.extend(struct.pack("<3f", 0.0, 1.0, 0.0))

    return bytes(header + v_bytes + i_bytes + n_bytes)


def export_to_obj(mesh_data: dict[str, Any]) -> str:
    """Converts a parsed .bob or .cob mesh into standard Wavefront OBJ format."""
    lines = ["# BombStation Studio Exported Mesh", "o BallisticaMesh"]
    positions = mesh_data.get("positions", [])
    for i in range(0, len(positions), 3):
        lines.append(f"v {positions[i]:.4f} {positions[i+1]:.4f} {positions[i+2]:.4f}")

    uvs = mesh_data.get("uvs", [])
    for i in range(0, len(uvs), 2):
        lines.append(f"vt {uvs[i]:.4f} {uvs[i+1]:.4f}")

    indices = mesh_data.get("indices", [])
    has_uv = len(uvs) > 0
    for i in range(0, len(indices), 3):
        i1 = indices[i] + 1
        i2 = indices[i+1] + 1
        i3 = indices[i+2] + 1
        if has_uv:
            lines.append(f"f {i1}/{i1} {i2}/{i2} {i3}/{i3}")
        else:
            lines.append(f"f {i1} {i2} {i3}")

    return "\n".join(lines) + "\n"
