# -*- mode: python ; coding: utf-8 -*-
"""
bombstation_studio.spec — PyInstaller Specification File
Builds a single-file standalone distribution of BombStation Studio.
"""

import sys
from pathlib import Path

block_cipher = None
ROOT = Path.cwd()
IS_WIN = sys.platform.startswith('win')

datas = [
    ('gui', 'gui'),
]
if (ROOT / 'assets').exists():
    datas.append(('assets', 'assets'))

a = Analysis(
    ['bombstation_studio.py'],
    pathex=[str(ROOT)],
    binaries=[],
    datas=datas,
    hiddenimports=[
        'tomllib',
        'http.server',
        'socketserver',
        'urllib.request',
        'urllib.parse',
        'json',
        'ast',
        'shutil',
        'webview',
        'bottle',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter.test'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='bombstation_studio',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
