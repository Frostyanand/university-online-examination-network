#!/usr/bin/env bash
# Pre-Flight System Prerequisites Audit (Linux)
set -euo pipefail

echo "=========================================================="
echo "  PRE-FLIGHT SYSTEM PREREQUISITES AUDIT (LINUX)"
echo "=========================================================="

ALL_PASSED=1

# 1. Check Python 3
if command -v python3 >/dev/null 2>&1; then
    PY_VER=$(python3 --version)
    echo "[PASS] Python is installed: $PY_VER"
else
    echo "[FAIL] python3 command not found."
    ALL_PASSED=0
fi

# 2. Check Node.js
if command -v node >/dev/null 2>&1; then
    NODE_VER=$(node --version)
    echo "[PASS] Node.js is installed: $NODE_VER"
else
    echo "[FAIL] node command not found."
    ALL_PASSED=0
fi

# 3. Check Docker
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    echo "[PASS] Docker Engine is running."
else
    echo "[FAIL] Docker daemon is not active or user lacks docker permissions."
    ALL_PASSED=0
fi

# 4. Check Ports
for PORT in 8000 3000; do
    if ss -tuln 2>/dev/null | grep -q ":$PORT "; then
        echo "[WARN] Port $PORT is already in use."
    else
        echo "[PASS] Port $PORT is available."
    fi
done

echo "----------------------------------------------------------"
if [ "$ALL_PASSED" -eq 1 ]; then
    echo "[SUCCESS] All prerequisites satisfied."
else
    echo "[FAIL] Please fix missing dependencies."
    exit 1
fi

