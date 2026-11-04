#!/usr/bin/env bash
# Reset Script for University Online Examination Network Simulation System
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=========================================================="
echo "  RESETTING UNIVERSITY EXAM NETWORK SIMULATION PLATFORM"
echo "=========================================================="

"$SCRIPT_DIR/stop.sh"

echo "[Cleaning temporary state]..."
kathara lclean --silent 2>/dev/null || true
docker container prune -f 2>/dev/null || true

rm -f "$ROOT_DIR/backend/simulation-api/simulation.db"
rm -f "$ROOT_DIR/artifacts/pcaps/"*.pcap

echo "[Regenerating pristine configurations]..."
python3 "$ROOT_DIR/network/kathara/generate_lab.py"

echo "=========================================================="
echo "  RESET COMPLETE. Ready to start."
echo "=========================================================="

