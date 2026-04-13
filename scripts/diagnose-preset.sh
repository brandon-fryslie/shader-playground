#!/usr/bin/env bash
set -euo pipefail

# ─── diagnose-preset.sh ─────────────────────────────────────────────────────
#
# Captures N-body simulation diagnostics for a preset.
# Starts its own dev server + Chrome, runs the simulation, captures numeric
# diagnostic readbacks at multiple time points, and outputs JSON to stdout.
#
# Requires: Chrome/Chromium, Node.js
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ─── Colors ──────────────────────────────────────────────────────────────────

if [[ -t 2 ]]; then
  RED=$'\033[31m' GREEN=$'\033[32m' CYAN=$'\033[36m' DIM=$'\033[2m' BOLD=$'\033[1m' RESET=$'\033[0m'
else
  RED='' GREEN='' CYAN='' DIM='' BOLD='' RESET=''
fi

# ─── Help ────────────────────────────────────────────────────────────────────

show_help() {
  cat <<'HELP'
Usage: ./scripts/diagnose-preset.sh <preset-name> [options]

Captures N-body simulation diagnostics for a given preset.
Starts a dev server and Chrome, runs the simulation, and outputs JSON.

Arguments:
  <preset-name>          Preset name (e.g., "Spiral Galaxy", "Default")

Options:
  --wait <seconds>       Total measurement window (default: 15)
  --measures <count>     Number of diagnostic snapshots (default: 3)
  --port <port>          Dev server port (default: 5789)
  --help, -h             Show this help

Examples:
  ./scripts/diagnose-preset.sh "Default"
  ./scripts/diagnose-preset.sh "Spiral Galaxy" --wait 30 --measures 5
  ./scripts/diagnose-preset.sh "Cosmic Web" --wait 20

Output: JSON to stdout with diagnostic snapshots and trend analysis.
HELP
  exit 0
}

# ─── Argument parsing ────────────────────────────────────────────────────────

PRESET=""
WAIT_SECS=15
MEASURE_COUNT=3
APP_PORT=5789

while [[ $# -gt 0 ]]; do
  case $1 in
    --help|-h)     show_help ;;
    --wait)        WAIT_SECS="${2:-15}"; shift 2 ;;
    --measures)    MEASURE_COUNT="${2:-3}"; shift 2 ;;
    --port)        APP_PORT="${2:-5789}"; shift 2 ;;
    -*)            echo "${RED}Error:${RESET} Unknown option: $1" >&2; exit 1 ;;
    *)
      if [[ -z "$PRESET" ]]; then PRESET="$1"; else echo "${RED}Error:${RESET} Unexpected: $1" >&2; exit 1; fi
      shift ;;
  esac
done

if [[ -z "$PRESET" ]]; then
  echo "${RED}Error:${RESET} Preset name is required." >&2
  echo "Usage: $0 <preset-name> [options]  (try --help)" >&2
  exit 1
fi

# ─── Find Chrome ─────────────────────────────────────────────────────────────

find_chrome() {
  if [[ -n "${CHROME_BIN:-}" ]]; then echo "$CHROME_BIN"; return; fi
  local candidates=(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    "/Applications/Chromium.app/Contents/MacOS/Chromium"
    "google-chrome" "google-chrome-stable" "chromium-browser" "chromium"
  )
  for c in "${candidates[@]}"; do
    if command -v "$c" >/dev/null 2>&1 || [[ -x "$c" ]]; then echo "$c"; return; fi
  done
  echo ""
}

CHROME="$(find_chrome)"
if [[ -z "$CHROME" ]]; then
  echo "${RED}Error:${RESET} Chrome/Chromium not found. Set CHROME_BIN." >&2
  exit 1
fi

# ─── Dev server ──────────────────────────────────────────────────────────────

DEV_SERVER_PID=""
start_dev_server() {
  cd "$PROJECT_ROOT"
  npm run dev -- --port "$APP_PORT" >/dev/null 2>&1 &
  DEV_SERVER_PID=$!
  cd - >/dev/null

  for i in $(seq 1 60); do
    if curl -kfsS --max-time 2 "https://127.0.0.1:${APP_PORT}/" >/dev/null 2>&1; then
      return 0
    fi
    if ! kill -0 "$DEV_SERVER_PID" 2>/dev/null; then
      echo "${RED}Error:${RESET} Dev server exited unexpectedly." >&2
      exit 1
    fi
    sleep 0.3
  done
  echo "${RED}Error:${RESET} Dev server didn't start within 18s." >&2
  exit 1
}

# ─── Launch Chrome ───────────────────────────────────────────────────────────

PROFILE_DIR=""
CHROME_PID=""
DEBUG_PORT=$((9300 + RANDOM % 500))

launch_chrome() {
  PROFILE_DIR="$(mktemp -d)"

  local gpu_flags=("--enable-unsafe-webgpu" "--ignore-certificate-errors")
  if [[ "$(uname -s)" == "Darwin" ]]; then
    gpu_flags+=("--use-angle=metal")
  fi

  "$CHROME" \
    --headless=new \
    "${gpu_flags[@]}" \
    --remote-debugging-port="$DEBUG_PORT" \
    --user-data-dir="$PROFILE_DIR" \
    --no-first-run \
    --no-default-browser-check \
    --disable-extensions \
    --disable-background-timer-throttling \
    --disable-renderer-backgrounding \
    --disable-backgrounding-occluded-windows \
    --window-size=800,600 \
    "about:blank" \
    >/dev/null 2>&1 &

  CHROME_PID=$!

  for i in $(seq 1 50); do
    if curl -s "http://127.0.0.1:${DEBUG_PORT}/json/version" >/dev/null 2>&1; then
      return 0
    fi
    if [[ $i -eq 50 ]]; then
      echo "${RED}Error:${RESET} Chrome didn't start within 10s." >&2
      exit 1
    fi
    sleep 0.2
  done
}

# ─── Cleanup ─────────────────────────────────────────────────────────────────

cleanup() {
  [[ -n "$CHROME_PID" ]] && kill "$CHROME_PID" 2>/dev/null && wait "$CHROME_PID" 2>/dev/null || true
  [[ -n "$DEV_SERVER_PID" ]] && kill "$DEV_SERVER_PID" 2>/dev/null && wait "$DEV_SERVER_PID" 2>/dev/null || true
  [[ -n "$PROFILE_DIR" ]] && rm -rf "$PROFILE_DIR" || true
}
trap cleanup EXIT

# ─── Run ─────────────────────────────────────────────────────────────────────

printf "${DIM}%-12s${RESET} %s\n" "Preset:" "${CYAN}${PRESET}${RESET}" >&2
printf "${DIM}%-12s${RESET} %s\n" "Wait:" "${WAIT_SECS}s" >&2
printf "${DIM}%-12s${RESET} %s\n" "Measures:" "${MEASURE_COUNT}" >&2

echo "${DIM}Starting dev server on port ${APP_PORT}...${RESET}" >&2
start_dev_server
echo "${DIM}Starting Chrome (debug port ${DEBUG_PORT})...${RESET}" >&2
launch_chrome

echo "${GREEN}Running diagnostics...${RESET}" >&2
node "${SCRIPT_DIR}/_diagnose-cdp.mjs" \
  "$APP_PORT" "$DEBUG_PORT" "$PRESET" "$WAIT_SECS" "$MEASURE_COUNT"
