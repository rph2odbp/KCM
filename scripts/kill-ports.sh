#!/usr/bin/env bash
set -euo pipefail

ports=(5173 9110 8088 9198 4050 9151 4501 5001)

for p in "${ports[@]}"; do
  echo "[kill-ports] Checking :$p"
  # Find PIDs listening on :port (tcp)
  PIDS=$(ss -ltnp 2>/dev/null | awk -v port=":$p" '$4 ~ port {print $NF}' | sed -E 's/.*pid=([0-9]+),.*/\1/' | sort -u)
  if [ -n "$PIDS" ]; then
    echo "[kill-ports] Killing PIDs for :$p -> $PIDS"
    for pid in $PIDS; do
      kill -TERM "$pid" 2>/dev/null || true
    done
    sleep 1
    # Force kill if still alive
    for pid in $PIDS; do
      kill -0 "$pid" 2>/dev/null && kill -KILL "$pid" 2>/dev/null || true
    done
  else
    echo "[kill-ports] No listeners on :$p"
  fi
done
