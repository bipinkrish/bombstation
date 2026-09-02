#!/usr/bin/env bash
# ==============================================================================
# run_gui.sh — Launch BombStation Server Studio GUI
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# Locate best Python 3 interpreter
if [ -f "$DIR/.venv/bin/python" ]; then
    PYTHON_BIN="$DIR/.venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="$(command -v python3)"
else
    echo "Error: python3 not found. Please install Python 3.11+."
    exit 1
fi

echo "======================================================="
echo "💣 Starting BombStation Server Studio..."
echo "   Interpreter: $PYTHON_BIN"
echo "   Directory:   $DIR"
echo "======================================================="

exec "$PYTHON_BIN" "$DIR/server_gui.py" "$@"
