#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PYTHON="$ROOT_DIR/backend/venv/bin/python"
FRONTEND_DIR="$ROOT_DIR/frontend"

port_is_open() {
  local port="$1"

  python3 - "$port" <<'PY'
import socket
import sys

sock = socket.socket()
sock.settimeout(0.5)

try:
    result = sock.connect_ex(("127.0.0.1", int(sys.argv[1])))
finally:
    sock.close()

raise SystemExit(0 if result == 0 else 1)
PY
}

if [[ ! -x "$BACKEND_PYTHON" ]]; then
  echo "Backend virtualenv not found at backend/venv/bin/python." >&2
  echo "Create it first, then install backend dependencies." >&2
  exit 1
fi

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "Frontend dependencies are missing in frontend/node_modules." >&2
  echo "Run npm install in frontend/ before starting the live server." >&2
  exit 1
fi

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi

  if [[ -n "${FRONTEND_PID:-}" ]]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

PIDS=()

if port_is_open 8000; then
  echo "Using existing backend server on http://127.0.0.1:8000"
else
  cd "$ROOT_DIR/backend"
  "$BACKEND_PYTHON" manage.py runserver 127.0.0.1:8000 &
  BACKEND_PID=$!
  PIDS+=("$BACKEND_PID")
fi

if port_is_open 5173; then
  echo "Using existing Vite live server on http://127.0.0.1:5173"
else
  cd "$FRONTEND_DIR"
  npm run dev -- --host 127.0.0.1 &
  FRONTEND_PID=$!
  PIDS+=("$FRONTEND_PID")
fi

if [[ ${#PIDS[@]} -eq 0 ]]; then
  echo "Live servers are already running."
  exit 0
fi

wait -n "${PIDS[@]}"
