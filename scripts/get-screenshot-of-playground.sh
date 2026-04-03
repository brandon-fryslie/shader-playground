#!/usr/bin/env bash
set -euo pipefail

DEFAULT_OUTPUT_DIR="/tmp/shader-playground-screenshots"
APP_URL="${APP_URL:-}"
APP_PORT="${APP_PORT:-}"

if [[ -t 2 ]]; then
  RED=$'\033[31m' YELLOW=$'\033[33m' GREEN=$'\033[32m' CYAN=$'\033[36m' DIM=$'\033[2m' BOLD=$'\033[1m' RESET=$'\033[0m'
else
  RED='' YELLOW='' GREEN='' CYAN='' DIM='' BOLD='' RESET=''
fi

BURST_MODE=true
BURST_COUNT=3
BURST_SIZE=3
BURST_INTERVAL=100
BURST_GAP=1000
BURST_WAIT=0
HEADLESS=true
OUTPUT=""
PATH_SUFFIX="/"

show_help() {
  cat <<'HELP'
Usage: ./scripts/get-screenshot-of-playground.sh [options]

Captures a screenshot or burst montage of the local shader playground.

Options:
  --output <path>           Output file or directory
  --path <path>             URL path/query suffix (default: /)
  --url <url>               Full app URL override
  --port <port>             App port override
  --no-burst                Capture a single screenshot
  --burst-count N           Number of burst groups (default: 3)
  --burst-size N            Screenshots per burst (default: 3)
  --burst-interval N        ms between shots within a burst (default: 100)
  --burst-gap N             ms gap between burst groups (default: 1000)
  --burst-wait N            ms to wait before first capture (default: 0)
  --no-headless             Run Chrome visibly
  --help, -h                Show this help

Examples:
  ./scripts/get-screenshot-of-playground.sh
  ./scripts/get-screenshot-of-playground.sh --path '/?v=6'
  ./scripts/get-screenshot-of-playground.sh --no-burst --output ./evidence/
HELP
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h) show_help ;;
    --output) OUTPUT="${2:-}"; shift 2 ;;
    --path) PATH_SUFFIX="${2:-}"; shift 2 ;;
    --url) APP_URL="${2:-}"; shift 2 ;;
    --port) APP_PORT="${2:-}"; shift 2 ;;
    --no-burst) BURST_MODE=false; shift ;;
    --burst-count) BURST_COUNT="${2:-}"; shift 2 ;;
    --burst-size) BURST_SIZE="${2:-}"; shift 2 ;;
    --burst-interval) BURST_INTERVAL="${2:-}"; shift 2 ;;
    --burst-gap) BURST_GAP="${2:-}"; shift 2 ;;
    --burst-wait) BURST_WAIT="${2:-}"; shift 2 ;;
    --no-headless) HEADLESS=false; shift ;;
    *)
      echo "${RED}Error:${RESET} Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

reset_burst_defaults() {
  echo "${YELLOW}*** Reverting to default burst settings.${RESET}" >&2
  BURST_COUNT=3
  BURST_SIZE=3
  BURST_INTERVAL=100
  BURST_GAP=1000
  BURST_WAIT=0
}

if $BURST_MODE; then
  for var in BURST_COUNT BURST_SIZE BURST_INTERVAL BURST_GAP BURST_WAIT; do
    val="${!var}"
    if ! [[ "$val" =~ ^[0-9]+$ ]] || (( val <= 0 && var != "BURST_WAIT" )); then
      echo "${YELLOW}*** Invalid ${var}='${val}'.${RESET}" >&2
      reset_burst_defaults
      break
    fi
  done

  if (( BURST_INTERVAL < 35 )); then BURST_INTERVAL=35; fi
  if (( BURST_INTERVAL > 500 )); then BURST_INTERVAL=500; fi

  TOTAL_SHOTS=$((BURST_COUNT * BURST_SIZE))
  LAST_BURST_START=$((BURST_WAIT + (BURST_COUNT - 1) * ((BURST_SIZE - 1) * BURST_INTERVAL + BURST_GAP)))
  TOTAL_CAPTURE_MS=$((LAST_BURST_START + (BURST_SIZE - 1) * BURST_INTERVAL))

  if (( TOTAL_SHOTS > 15 || TOTAL_CAPTURE_MS > 10000 )); then
    echo "${YELLOW}*** Burst settings exceed supported limits.${RESET}" >&2
    reset_burst_defaults
  fi
fi

# [LAW:single-enforcer] App identity validation is centralized here so every detected port uses one acceptance rule.
validate_playground_url() {
  local candidate_url="$1"
  local root_html
  if ! root_html="$(curl -ksfS --max-time 3 "${candidate_url}" 2>/dev/null)"; then
    echo "unreachable"
    return 1
  fi
  if [[ "$root_html" != *"WebGPU Compute Shader Playground"* ]]; then
    echo "mismatch"
    return 1
  fi
  echo "ok"
}

if [[ -z "$APP_URL" ]]; then
  declare -a URL_CANDIDATES=()
  if [[ -n "$APP_PORT" ]]; then
    URL_CANDIDATES=("https://127.0.0.1:${APP_PORT}${PATH_SUFFIX}" "http://127.0.0.1:${APP_PORT}${PATH_SUFFIX}")
  else
    URL_CANDIDATES=(
      "https://127.0.0.1:4443${PATH_SUFFIX}"
      "http://127.0.0.1:4443${PATH_SUFFIX}"
      "http://127.0.0.1:4174${PATH_SUFFIX}"
      "http://127.0.0.1:4173${PATH_SUFFIX}"
      "http://127.0.0.1:5173${PATH_SUFFIX}"
    )
  fi

  APP_URL=""
  for candidate in "${URL_CANDIDATES[@]}"; do
    if validate_playground_url "$candidate" >/dev/null; then
      APP_URL="$candidate"
      break
    fi
  done
fi

if [[ -z "$APP_URL" ]]; then
  echo "${RED}Error:${RESET} No matching shader playground server found." >&2
  echo "Start one with ${BOLD}npm run dev${RESET} or ${BOLD}npm run preview${RESET}, or pass --url." >&2
  exit 1
fi

find_chrome() {
  if [[ -n "${CHROME_BIN:-}" ]]; then
    echo "$CHROME_BIN"
    return
  fi
  local candidates=(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    "/Applications/Chromium.app/Contents/MacOS/Chromium"
    "google-chrome"
    "google-chrome-stable"
    "chromium-browser"
    "chromium"
  )
  for candidate in "${candidates[@]}"; do
    if command -v "$candidate" >/dev/null 2>&1 || [[ -x "$candidate" ]]; then
      echo "$candidate"
      return
    fi
  done
}

CHROME="$(find_chrome)"
if [[ -z "$CHROME" ]]; then
  echo "${RED}Error:${RESET} Chrome/Chromium not found. Set CHROME_BIN." >&2
  exit 1
fi

MONTAGE_CMD=""
if $BURST_MODE; then
  if command -v montage >/dev/null 2>&1; then
    MONTAGE_CMD="montage"
  elif command -v magick >/dev/null 2>&1; then
    MONTAGE_CMD="magick montage"
  else
    echo "${RED}Error:${RESET} ImageMagick is required for burst montage mode." >&2
    exit 1
  fi
fi

if $BURST_MODE; then
  read -r FRAME_WIDTH FRAME_HEIGHT <<< "$(awk -v bs="$BURST_SIZE" -v bc="$BURST_COUNT" 'BEGIN {
    maxDim = (bs > bc) ? bs : bc
    size = int(1280 / maxDim)
    if (size > 960) size = 960
    size = int(size / 2) * 2
    if (size < 180) size = 180
    printf "%d %d\n", size, size
  }')"
else
  FRAME_WIDTH=960
  FRAME_HEIGHT=960
fi

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
if $BURST_MODE; then
  AUTO_FILENAME="playground_burst_${BURST_COUNT}x${BURST_SIZE}_${BURST_INTERVAL}ms_${TIMESTAMP}.png"
else
  AUTO_FILENAME="playground_${TIMESTAMP}.png"
fi

if [[ -z "$OUTPUT" ]]; then
  mkdir -p "$DEFAULT_OUTPUT_DIR"
  SCREENSHOT_PATH="${DEFAULT_OUTPUT_DIR}/${AUTO_FILENAME}"
elif [[ -d "$OUTPUT" ]]; then
  SCREENSHOT_PATH="${OUTPUT%/}/${AUTO_FILENAME}"
else
  mkdir -p "$(dirname "$OUTPUT")"
  SCREENSHOT_PATH="$OUTPUT"
fi

PROFILE_DIR="$(mktemp -d)"
FRAME_DIR="$(mktemp -d)"
DEBUG_PORT=$((9222 + RANDOM % 1000))

HEADLESS_FLAGS=()
if $HEADLESS; then
  HEADLESS_FLAGS+=("--headless=new")
fi

GPU_FLAGS=(
  "--enable-unsafe-webgpu"
  "--enable-webgpu-developer-features"
)
if [[ "$(uname -s)" == "Darwin" ]]; then
  GPU_FLAGS+=("--use-angle=metal")
fi

"$CHROME" \
  "${HEADLESS_FLAGS[@]}" \
  "${GPU_FLAGS[@]}" \
  --remote-debugging-port="$DEBUG_PORT" \
  --user-data-dir="$PROFILE_DIR" \
  --no-first-run \
  --no-default-browser-check \
  --disable-extensions \
  --disable-popup-blocking \
  --disable-translate \
  --disable-background-timer-throttling \
  --disable-renderer-backgrounding \
  --disable-backgrounding-occluded-windows \
  --window-size=${FRAME_WIDTH},${FRAME_HEIGHT} \
  "about:blank" \
  >/dev/null 2>&1 &

CHROME_PID=$!

cleanup() {
  kill "$CHROME_PID" 2>/dev/null || true
  wait "$CHROME_PID" 2>/dev/null || true
  rm -rf "$PROFILE_DIR" "$FRAME_DIR"
}
trap cleanup EXIT

for i in $(seq 1 50); do
  if curl -s "http://127.0.0.1:${DEBUG_PORT}/json/version" >/dev/null 2>&1; then
    break
  fi
  if [[ $i -eq 50 ]]; then
    echo "${RED}Error:${RESET} Chrome did not start within 10 seconds." >&2
    exit 1
  fi
  sleep 0.2
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if $BURST_MODE; then
  BURST_JSON="{\"wait\":${BURST_WAIT},\"count\":${BURST_COUNT},\"size\":${BURST_SIZE},\"interval\":${BURST_INTERVAL},\"gap\":${BURST_GAP}}"
else
  BURST_JSON="{\"wait\":0,\"count\":1,\"size\":1,\"interval\":0,\"gap\":0}"
fi

MANIFEST="$(mktemp)"
node "${SCRIPT_DIR}/_get-screenshot-cdp.mjs" \
  "$DEBUG_PORT" "$APP_URL" "$FRAME_DIR" "$FRAME_WIDTH" "$FRAME_HEIGHT" "$BURST_JSON" \
  > "$MANIFEST"

FRAME_COUNT=$(wc -l < "$MANIFEST" | tr -d ' ')
if (( FRAME_COUNT == 0 )); then
  echo "${RED}Error:${RESET} No frames captured." >&2
  rm -f "$MANIFEST"
  exit 1
fi

if $BURST_MODE && (( FRAME_COUNT > 1 )); then
  PAD=$(awk -v w="$FRAME_WIDTH" 'BEGIN { v=int(w/100); if(v<2)v=2; if(v>8)v=8; print v }')
  FRAME_PATHS=()
  while IFS=$'\t' read -r frame_path _delta_ms; do
    FRAME_PATHS+=("$frame_path")
  done < "$MANIFEST"

  $MONTAGE_CMD \
    "${FRAME_PATHS[@]}" \
    -tile "${BURST_SIZE}x${BURST_COUNT}" \
    -geometry "${FRAME_WIDTH}x${FRAME_HEIGHT}+${PAD}+${PAD}" \
    -background '#06070b' \
    "$SCREENSHOT_PATH" 2> >(grep -v -e "delegate library support not built-in 'none' (Freetype)" -e 'geometry does not contain image' >&2)
else
  SINGLE_PATH="$(head -1 "$MANIFEST" | cut -f1)"
  mv "$SINGLE_PATH" "$SCREENSHOT_PATH"
fi

rm -f "$MANIFEST"
echo "${GREEN}Screenshot path:${RESET}" >&2
echo "$SCREENSHOT_PATH"
