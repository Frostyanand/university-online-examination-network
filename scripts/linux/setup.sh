#!/usr/bin/env bash
# Automated Setup Script for University Online Examination Network Simulation System
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=========================================================="
echo "  SETUP: UNIVERSITY EXAM NETWORK SIMULATION SYSTEM (LINUX)"
echo "=========================================================="

echo "[1/4] Installing Python Backend Dependencies..."
python3 -m pip install --upgrade pip
python3 -m pip install fastapi uvicorn pydantic pyyaml scapy docker kathara httpx requests aiofiles

echo "[2/4] Installing Next.js Frontend Dependencies..."
cd "$ROOT_DIR/apps/web"
npm install

echo "[3/4] Building Custom Container Images..."
cd "$ROOT_DIR"
docker build -t exam-net/frr-dsw -f "$ROOT_DIR/docker/dsw.Dockerfile" "$ROOT_DIR/docker"
docker build -t exam-net/web -f "$ROOT_DIR/docker/web.Dockerfile" "$ROOT_DIR/docker"

echo "[4/4] Generating Lab Files & Cisco Packet Tracer Artifacts..."
python3 "$ROOT_DIR/network/kathara/generate_lab.py"
python3 "$ROOT_DIR/packet-tracer/generator/generate_pkt.py"

echo "=========================================================="
echo "  SETUP COMPLETE! Run: ./scripts/linux/start.sh"
echo "=========================================================="

