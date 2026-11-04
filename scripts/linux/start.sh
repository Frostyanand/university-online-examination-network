#!/usr/bin/env bash
# Start Script for University Online Examination Network Simulation System
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=========================================================="
echo "  STARTING UNIVERSITY EXAM NETWORK SIMULATION PLATFORM"
echo "=========================================================="

# Check/Start Backend
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "[INFO] Backend API is already running on port 8000."
else
    echo "[1/2] Starting FastAPI Simulation Engine on port 8000..."
    cd "$ROOT_DIR/backend/simulation-api"
    nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload > "$ROOT_DIR/backend.log" 2>&1 &
    sleep 2
fi

# Check/Start Frontend
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "[INFO] Next.js NOC Frontend is already running on port 3000."
else
    echo "[2/2] Starting Next.js NOC Operations UI on port 3000..."
    cd "$ROOT_DIR/apps/web"
    nohup npm run dev > "$ROOT_DIR/frontend.log" 2>&1 &
    sleep 3
fi

echo "=========================================================="
echo "  SYSTEM ACTIVE AND READY"
echo "=========================================================="
echo "  NOC Web Dashboard:   http://localhost:3000"
echo "  FastAPI Engine Docs: http://localhost:8000/docs"
echo "  Packet Tracer (.pkt): $ROOT_DIR/artifacts/cisco/university_online_examination_network.pkt"
echo "=========================================================="

