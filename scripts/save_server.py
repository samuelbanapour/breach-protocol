#!/usr/bin/env python3
"""Tiny localhost receiver: browser POSTs {name, data:dataURL} -> saved to assets/.
Used only to capture gameplay screenshots; stop it when done."""
from http.server import BaseHTTPRequestHandler, HTTPServer
import json, base64, os
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")
os.makedirs(OUT, exist_ok=True)

class H(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()
    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(n))
        name = os.path.basename(body["name"])
        data = body["data"].split(",", 1)[1]
        with open(os.path.join(OUT, name), "wb") as f:
            f.write(base64.b64decode(data))
        self.send_response(200); self._cors()
        self.send_header("Content-Type", "text/plain"); self.end_headers()
        self.wfile.write(b"ok")
    def log_message(self, *a):
        pass

print("save_server on 127.0.0.1:8799 ->", OUT)
HTTPServer(("127.0.0.1", 8799), H).serve_forever()
