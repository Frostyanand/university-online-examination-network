#!/usr/bin/env bash
# Stop Script for University Online Examination Network Simulation System
echo "=========================================================="
echo "  STOPPING UNIVERSITY EXAM NETWORK SIMULATION PLATFORM"
echo "=========================================================="

echo "[1/3] Cleaning Kathará containers..."
kathara lclean --silent 2>/dev/null || true

echo "[2/3] Stopping backend API..."
fuser -k 8000/tcp 2>/dev/null || true

echo "[3/3] Stopping frontend..."
fuser -k 3000/tcp 2>/dev/null || true

echo "=========================================================="
echo "  SIMULATION SYSTEM STOPPED SUCCESSFULLY"
echo "=========================================================="

