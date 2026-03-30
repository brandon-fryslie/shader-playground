#!/usr/bin/env python3
"""HTTPS server for shader-playground. No-cache headers so Vision Pro always gets fresh files."""
import http.server
import ssl
import os
import sys

port = int(sys.argv[1]) if len(sys.argv) > 1 else 4443
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain('cert.pem', 'key.pem')

server = http.server.HTTPServer(('0.0.0.0', port), NoCacheHandler)
server.socket = context.wrap_socket(server.socket, server_side=True)

ip = os.popen("ipconfig getifaddr en0 2>/dev/null").read().strip() or "your-ip"
print(f"\nServing shader-playground over HTTPS (no-cache):")
print(f"  Local:   https://localhost:{port}/index.html")
print(f"  Network: https://{ip}:{port}/index.html")
print(f"Press Ctrl+C to stop.\n")

server.serve_forever()
