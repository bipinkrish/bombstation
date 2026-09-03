"""
studio/__main__.py — Cross-Platform Entry Point for `python -m studio`
"""

import sys
from pathlib import Path

# Ensure root directory is in sys.path
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import bombstation_studio

if __name__ == "__main__":
    bombstation_studio.main()
