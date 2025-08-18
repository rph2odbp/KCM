#!/usr/bin/env bash
set -euo pipefail

# Kill listeners on common Firebase emulator ports.
# Usage:
#   bash scripts/kill-ports.sh                # kills defaults
#   PORTS="4000 4400 4500 5001 9000 9099 8085" bash scripts/kill-ports.sh

PORTS=${PORTS:-"4000 4400 4500 5001 9000 9099 8080 8085 9150 9199 9299 9300 9499 9500"}

echo "Scanning and killing listeners on ports: $PORTS"

for port in $PORTS; do
  # Find PIDs listening on the port (TCP LISTEN)
  PIDS=$(lsof -nP -tiTCP:${port} -sTCP:LISTEN || true)
  if [[ -n "${PIDS}" ]]; then
    echo "Port ${port} in use by PIDs: ${PIDS}";
    # Try graceful kill, then force if needed
    kill ${PIDS} 2>/dev/null || true
    sleep 0.5
    # Check again
    STILL=$(lsof -nP -tiTCP:${port} -sTCP:LISTEN || true)
    if [[ -n "${STILL}" ]]; then
      echo "Force killing PIDs on port ${port}: ${STILL}"
      kill -9 ${STILL} 2>/dev/null || true
    fi
  else
    echo "Port ${port} is free"
  fi
done

echo "Done."
