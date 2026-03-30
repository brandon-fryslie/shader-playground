#!/bin/bash
# Serves the playground on all interfaces so Vision Pro can access it.
# Usage: ./serve.sh [port]
# Then open http://<your-mac-ip>:8080 on Vision Pro.

PORT="${1:-8080}"
IP=$(ipconfig getifaddr en0 2>/dev/null || echo "0.0.0.0")

echo "Serving shader-playground at:"
echo "  Local:   http://localhost:${PORT}"
echo "  Network: http://${IP}:${PORT}"
echo ""
echo "Press Ctrl+C to stop."

cd "$(dirname "$0")"
python3 -m http.server "$PORT" --bind 0.0.0.0
