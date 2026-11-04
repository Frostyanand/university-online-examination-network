#!/usr/bin/env bash
# Diagnostic Script for University Online Examination Network Simulation System
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=========================================================="
echo "  DIAGNOSTICS & SYSTEM HEALTH AUDIT (LINUX)"
echo "=========================================================="

echo "--- DOCKER CONTAINERS ---"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}" || echo "[WARN] Docker not running."

echo -e "\n--- BACKEND SIMULATION API ---"
if curl -s http://127.0.0.1:8000/api/simulation/state >/dev/null 2>&1; then
    echo "[PASS] Simulation Engine is responding at http://127.0.0.1:8000"
else
    echo "[INFO] Simulation Engine is currently idle."
fi

echo -e "\n--- FRONTEND NOC WORKBENCH ---"
if curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo "[PASS] NOC Frontend is responding at http://localhost:3000"
else
    echo "[INFO] NOC Frontend is currently idle."
fi

echo -e "\n--- CISCO PACKET TRACER ARTIFACT ---"
PKT_FILE="$ROOT_DIR/artifacts/cisco/university_online_examination_network.pkt"
if [ -f "$PKT_FILE" ]; then
    echo "[PASS] Packet Tracer file exists: $PKT_FILE ($(stat -c%s "$PKT_FILE") bytes)"
else
    echo "[FAIL] Packet Tracer file missing."
fi

echo "=========================================================="
echo "  DIAGNOSTICS COMPLETE"
echo "=========================================================="

